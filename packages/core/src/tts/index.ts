// Types & constants
export type { TTSEngine, TTSConfig, TTSPlayState, ITTSPlayer } from "./types";
export { DEFAULT_TTS_CONFIG, DASHSCOPE_VOICES } from "./types";

// Text utilities
export { cleanText, countChars, splitIntoChunks } from "./text-utils";
export { buildNarrationPreview, getTTSVoiceLabel, splitNarrationText } from "./display";

// Edge TTS
export { fetchEdgeTTSAudio, EDGE_TTS_VOICES } from "./edge-tts";
export type { EdgeTTSVoice, EdgeTTSPayload } from "./edge-tts";

// Players
export { BrowserTTSPlayer, DashScopeTTSPlayer, EdgeTTSPlayer } from "./tts-players";
