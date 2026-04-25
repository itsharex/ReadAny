import type { ITTSPlayer, TTSConfig } from "@readany/core/tts";
import { fetchEdgeTTSAudio, splitIntoChunks } from "@readany/core/tts";
import { File, Paths } from "expo-file-system";
import { Image } from "react-native";
import TrackPlayer, { Event, State } from "react-native-track-player";

const CHUNK_MAX_CHARS = 500;
const DEFAULT_ARTWORK = Image.resolveAssetSource(require("../../../assets/icon.png")).uri;

export class TrackPlayerEdgeTTSPlayer implements ITTSPlayer {
  private static readonly INITIAL_BUFFER_CHUNKS = 3;
  private static readonly MAX_RETRIES = 3;
  private static readonly MAX_CHUNK_FETCH_RETRIES = 2;

  onStateChange?: (state: "playing" | "paused" | "stopped") => void;
  onChunkChange?: (index: number, total: number) => void;
  onEnd?: () => void;

  private _stopped = false;
  private _paused = false;
  private _chunks: string[] = [];
  private _currentIndex = 0;
  private _config: TTSConfig | null = null;
  private _tempFiles: string[] = [];
  private _speakGen = 0;
  private _unsubscribers: (() => void)[] = [];
  private _downloadComplete = false;
  private _nextChunkToAdd = 0;
  private _queueStarved = false;
  private _playStarted = false;
  private _getArtwork: (() => string | undefined) | null = null;
  private _retryCount = 0;

  setArtworkGetter(getter: () => string | undefined): void {
    this._getArtwork = getter;
  }

  async speak(text: string | string[], config: TTSConfig): Promise<void> {
    const gen = ++this._speakGen;
    await this._cleanup();
    if (gen !== this._speakGen) return;

    this._stopped = false;
    this._paused = false;
    this._config = config;
    this._downloadComplete = false;
    this._retryCount = 0;
    this._chunks = Array.isArray(text)
      ? text.filter(Boolean)
      : splitIntoChunks(text, CHUNK_MAX_CHARS);
    this._currentIndex = 0;
    this._tempFiles = [];
    this._nextChunkToAdd = 0;
    this._queueStarved = false;
    this._playStarted = false;

    if (this._chunks.length === 0) {
      this.onStateChange?.("stopped");
      this.onEnd?.();
      return;
    }

    await TrackPlayer.reset();

    this._subscribeToEvents(gen);

    this._downloadAndPlay(gen);
  }

  private _subscribeToEvents(gen: number): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];

    const unsubTrackChange = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      (event) => {
        if (gen !== this._speakGen || this._stopped) return;
        if (event.index != null && event.index >= 0) {
          this._currentIndex = event.index;
          this.onChunkChange?.(event.index, this._chunks.length);
        }
      },
    );

    const unsubStateChange = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      if (gen !== this._speakGen || this._stopped) return;
      if (event.state === State.Playing) {
        this.onStateChange?.("playing");
      } else if (event.state === State.Paused) {
        // When the generated queue is temporarily empty, RNTP may report Paused.
        // That is buffering/starvation, not a user pause. Keep UI in playing mode
        // and resume as soon as the producer adds the next chunk.
        if (this._paused || this._downloadComplete) {
          this.onStateChange?.("paused");
        }
      } else if (event.state === State.Error) {
        if (this._retryCount < TrackPlayerEdgeTTSPlayer.MAX_RETRIES) {
          this._retryCount++;
          console.warn(
            `[TrackPlayerEdgeTTSPlayer] playback error, retry ${this._retryCount}/${TrackPlayerEdgeTTSPlayer.MAX_RETRIES}`,
          );
          TrackPlayer.retry().catch(() => {});
        } else {
          console.error("[TrackPlayerEdgeTTSPlayer] playback error, max retries reached");
          this._stopped = true;
          this.onStateChange?.("stopped");
        }
      }
    });

    const unsubQueueEnded = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (event) => {
      if (gen !== this._speakGen || this._stopped) return;
      if (!this._downloadComplete) {
        this._queueStarved = true;
        if (typeof event.track === "number") {
          this._currentIndex = Math.max(this._currentIndex, event.track);
        }
        console.warn("[TrackPlayerEdgeTTSPlayer] queue starved, waiting for next generated chunk", {
          track: event.track,
          nextChunkToAdd: this._nextChunkToAdd,
          total: this._chunks.length,
        });
        return;
      }
      this._stopped = true;
      this.onStateChange?.("stopped");
      this.onEnd?.();
    });

    const unsubSeek = TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
      if (gen !== this._speakGen || this._stopped) return;
      TrackPlayer.seekTo(event.position);
    });

    this._unsubscribers.push(
      unsubTrackChange.remove,
      unsubStateChange.remove,
      unsubQueueEnded.remove,
      unsubSeek.remove,
    );
  }

  private async _downloadAndPlay(gen: number): Promise<void> {
    try {
      const artwork = this._getArtwork?.() || DEFAULT_ARTWORK;
      const initialBufferCount = Math.min(
        TrackPlayerEdgeTTSPlayer.INITIAL_BUFFER_CHUNKS,
        this._chunks.length,
      );

      while (this._nextChunkToAdd < initialBufferCount) {
        await this._fetchAndAddChunk(this._nextChunkToAdd, gen, artwork);
      }

      if (gen !== this._speakGen || this._stopped) return;

      const queue = await TrackPlayer.getQueue();
      if (queue.length === 0) {
        this._stopped = true;
        this.onStateChange?.("stopped");
        this.onEnd?.();
        return;
      }

      await TrackPlayer.play();
      this._playStarted = true;
      this.onStateChange?.("playing");

      while (this._nextChunkToAdd < this._chunks.length) {
        await this._fetchAndAddChunk(this._nextChunkToAdd, gen, artwork);
      }

      if (gen !== this._speakGen || this._stopped) return;
      this._downloadComplete = true;
      if (this._queueStarved) {
        await this._resumeStarvedQueue(gen);
      }
    } catch (err) {
      if (!this._stopped && (err as Error)?.message !== "aborted") {
        console.error("[TrackPlayerEdgeTTSPlayer] download error:", err);
        this._stopped = true;
        this.onStateChange?.("stopped");
      }
    }
  }

  private async _fetchAndAddChunk(index: number, gen: number, artwork: string): Promise<void> {
    if (gen !== this._speakGen || this._stopped) throw new Error("aborted");

    const audioUri = await this._fetchChunkFileWithRetry(index, gen);
    if (gen !== this._speakGen || this._stopped) throw new Error("aborted");

    await TrackPlayer.add({
      id: `tts-chunk-${index}`,
      url: audioUri,
      title: `Segment ${index + 1}`,
      artwork,
    });

    this._nextChunkToAdd = Math.max(this._nextChunkToAdd, index + 1);
    if (this._nextChunkToAdd >= this._chunks.length) {
      this._downloadComplete = true;
    }

    if (this._queueStarved && this._playStarted) {
      await this._resumeStarvedQueue(gen);
    }
  }

  private async _resumeStarvedQueue(gen: number): Promise<void> {
    if (gen !== this._speakGen || this._stopped || this._paused) return;

    try {
      const queue = await TrackPlayer.getQueue();
      if (queue.length === 0) return;

      const targetIndex = Math.min(Math.max(this._currentIndex + 1, 0), queue.length - 1);
      this._queueStarved = false;
      await TrackPlayer.skip(targetIndex).catch(() => {});
      await TrackPlayer.play();
      this.onStateChange?.("playing");
      console.log("[TrackPlayerEdgeTTSPlayer] resumed after queue starvation", {
        targetIndex,
        queueLength: queue.length,
      });
    } catch (error) {
      console.warn("[TrackPlayerEdgeTTSPlayer] failed to resume starved queue", error);
    }
  }

  private async _fetchChunkFileWithRetry(index: number, gen: number): Promise<string> {
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= TrackPlayerEdgeTTSPlayer.MAX_CHUNK_FETCH_RETRIES; attempt++) {
      try {
        return await this._fetchChunkFile(index, gen);
      } catch (error) {
        if ((error as Error)?.message === "aborted" || gen !== this._speakGen || this._stopped) {
          throw error;
        }
        lastError = error;
        console.warn("[TrackPlayerEdgeTTSPlayer] chunk fetch failed", {
          index,
          attempt: attempt + 1,
          maxAttempts: TrackPlayerEdgeTTSPlayer.MAX_CHUNK_FETCH_RETRIES + 1,
          error,
        });
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Edge TTS chunk fetch failed");
  }

  private async _fetchChunkFile(index: number, gen: number): Promise<string> {
    if (this._stopped || gen !== this._speakGen || !this._config) throw new Error("aborted");

    const config = this._config;
    const voice = config.edgeVoice || "zh-CN-XiaoxiaoNeural";
    const lang = voice.split("-").slice(0, 2).join("-");

    const mp3Data = await fetchEdgeTTSAudio({
      text: this._chunks[index],
      voice,
      lang,
      rate: config.rate,
      pitch: config.pitch,
    });

    if (this._stopped || gen !== this._speakGen) throw new Error("aborted");

    const tmpName = `tts_track_${index}_${Date.now()}.mp3`;
    const tmpFile = new File(Paths.cache, tmpName);
    const audioUri = tmpFile.uri;
    this._tempFiles.push(audioUri);
    tmpFile.write(new Uint8Array(mp3Data));
    return audioUri;
  }

  pause(): void {
    if (this._stopped || this._paused) return;
    this._paused = true;
    TrackPlayer.pause();
    this.onStateChange?.("paused");
  }

  resume(): void {
    if (this._stopped || !this._paused) return;
    this._paused = false;
    TrackPlayer.play();
    this.onStateChange?.("playing");
  }

  stop(): void {
    this._stopped = true;
    this._paused = false;
    this._downloadComplete = false;
    this._queueStarved = false;
    this._playStarted = false;
    TrackPlayer.stop();
    TrackPlayer.reset();
    this._cleanupEvents();
    this._cleanupTempFiles();
    this.onStateChange?.("stopped");
  }

  private async _cleanup(): Promise<void> {
    this._stopped = true;
    this._downloadComplete = false;
    this._queueStarved = false;
    this._playStarted = false;
    this._cleanupEvents();
    try {
      await TrackPlayer.stop();
      await TrackPlayer.reset();
    } catch {}
    this._cleanupTempFiles();
  }

  private _cleanupEvents(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
  }

  private _cleanupTempFiles(): void {
    for (const f of this._tempFiles) {
      try {
        const file = new File(f);
        if (file.exists) file.delete();
      } catch {}
    }
    this._tempFiles = [];
  }
}
