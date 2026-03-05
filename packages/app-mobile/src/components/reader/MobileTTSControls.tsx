/**
 * MobileTTSControls — floating TTS playback bar + expandable engine/voice settings.
 * Matches desktop FooterBar TTS capabilities.
 */
import { useTTSStore } from "@readany/core/stores/tts-store";
import { DASHSCOPE_VOICES, EDGE_TTS_VOICES } from "@readany/core/tts";
import type { TTSEngine, EdgeTTSVoice } from "@readany/core/tts";
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Pause,
  Play,
  Plus,
  Square,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface MobileTTSControlsProps {
  onClose: () => void;
}

export function MobileTTSControls({ onClose }: MobileTTSControlsProps) {
  const { t } = useTranslation();
  const playState = useTTSStore((s) => s.playState);
  const config = useTTSStore((s) => s.config);
  const pause = useTTSStore((s) => s.pause);
  const resume = useTTSStore((s) => s.resume);
  const stop = useTTSStore((s) => s.stop);
  const updateConfig = useTTSStore((s) => s.updateConfig);

  const [expanded, setExpanded] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load browser voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices?.() || [];
      setBrowserVoices(voices);
    };
    loadVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", loadVoices);
  }, []);

  const handleStop = () => {
    stop();
    onClose();
  };

  const adjustRate = (delta: number) => {
    const newRate = Math.round(Math.max(0.5, Math.min(2.0, config.rate + delta)) * 10) / 10;
    updateConfig({ rate: newRate });
  };

  const stateLabel =
    playState === "loading"
      ? t("tts.loading", "加载中...")
      : playState === "playing"
        ? t("tts.playing", "播放中")
        : playState === "paused"
          ? t("tts.paused", "已暂停")
          : t("tts.stopped", "已停止");

  // Get edge voices — group by lang for display
  const currentEdgeLang = config.edgeVoice?.split("-").slice(0, 2).join("-") || "zh-CN";
  const edgeLangs = [...new Set(EDGE_TTS_VOICES.map((v: EdgeTTSVoice) => v.lang))].sort();
  const edgeVoicesForLang = EDGE_TTS_VOICES.filter((v: EdgeTTSVoice) => v.lang === currentEdgeLang);

  const engines: { id: TTSEngine; label: string }[] = [
    { id: "edge", label: "Edge TTS" },
    { id: "browser", label: t("tts.browser", "系统语音") },
    { id: "dashscope", label: "DashScope" },
  ];

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[60] border-t border-border bg-background/98 shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom-2 duration-200"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Expanded settings panel */}
      {expanded && (
        <div className="border-b border-border px-4 py-3 space-y-3 max-h-[50vh] overflow-y-auto">
          {/* Engine selection */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              {t("tts.engine", "引擎")}
            </label>
            <div className="flex gap-1.5">
              {engines.map((eng) => (
                <button
                  key={eng.id}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    config.engine === eng.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground active:bg-muted/80"
                  }`}
                  onClick={() => updateConfig({ engine: eng.id })}
                >
                  {eng.label}
                </button>
              ))}
            </div>
          </div>

          {/* Engine-specific voice settings */}
          {config.engine === "edge" && (
            <div className="space-y-2">
              {/* Language selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {t("tts.language", "语言")}
                </label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={currentEdgeLang}
                  onChange={(e) => {
                    const lang = e.target.value;
                    const first = EDGE_TTS_VOICES.find((v: EdgeTTSVoice) => v.lang === lang);
                    if (first) {
                      updateConfig({ edgeVoice: first.id });
                    }
                  }}
                >
                  {edgeLangs.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
              {/* Voice selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {t("tts.voice", "声音")}
                </label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={config.edgeVoice}
                  onChange={(e) => updateConfig({ edgeVoice: e.target.value })}
                >
                  {edgeVoicesForLang.map((v: EdgeTTSVoice) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.lang})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {config.engine === "browser" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t("tts.voice", "声音")}
              </label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={config.voiceName}
                onChange={(e) => updateConfig({ voiceName: e.target.value })}
              >
                <option value="">({t("tts.defaultVoice", "默认")})</option>
                {browserVoices.map((v) => (
                  <option key={v.voiceURI} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {config.engine === "dashscope" && (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {t("tts.voice", "声音")}
                </label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={config.dashscopeVoice}
                  onChange={(e) => updateConfig({ dashscopeVoice: e.target.value })}
                >
                  {DASHSCOPE_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  API Key
                </label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="sk-..."
                  value={config.dashscopeApiKey}
                  onChange={(e) => updateConfig({ dashscopeApiKey: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Pitch control */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("tts.pitch", "音调")}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground active:bg-muted/80"
                onClick={() => {
                  const p = Math.round(Math.max(0.5, config.pitch - 0.1) * 10) / 10;
                  updateConfig({ pitch: p });
                }}
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center text-xs tabular-nums">{config.pitch.toFixed(1)}</span>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground active:bg-muted/80"
                onClick={() => {
                  const p = Math.round(Math.min(2.0, config.pitch + 0.1) * 10) / 10;
                  updateConfig({ pitch: p });
                }}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main control bar */}
      <div className="flex h-12 items-center justify-between px-4">
        {/* Left: icon + state */}
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">{stateLabel}</span>
        </div>

        {/* Center: controls */}
        <div className="flex items-center gap-1">
          {/* Rate - */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground active:bg-muted"
            onClick={() => adjustRate(-0.1)}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <span className="w-9 text-center text-xs tabular-nums text-muted-foreground">
            {config.rate.toFixed(1)}x
          </span>

          {/* Rate + */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground active:bg-muted"
            onClick={() => adjustRate(0.1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          <div className="mx-1 h-4 w-px bg-border" />

          {/* Play/Pause */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95 transition-transform disabled:opacity-40"
            onClick={() => {
              if (playState === "playing") pause();
              else if (playState === "paused") resume();
            }}
            disabled={playState === "loading" || playState === "stopped"}
          >
            {playState === "playing" ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </button>

          {/* Stop */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground active:bg-muted"
            onClick={handleStop}
          >
            <Square className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right: expand/collapse settings */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
