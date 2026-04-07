import { buildNarrationPreview, getTTSVoiceLabel, type TTSConfig, type TTSPlayState } from "@readany/core/tts";
import {
  Bot,
  ChevronLeft,
  Headphones,
  Minus,
  Pause,
  Play,
  RotateCcw,
  ScrollText,
  Settings2,
  Square,
  Waves,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface TTSPageProps {
  visible: boolean;
  bookTitle: string;
  chapterTitle: string;
  coverSrc?: string;
  playState: TTSPlayState;
  currentText: string;
  config: TTSConfig;
  readingProgress: number;
  currentPage: number;
  totalPages: number;
  sourceLabel: string;
  continuousEnabled: boolean;
  onClose: () => void;
  onReplay: () => void | Promise<void>;
  onPlayPause: () => void | Promise<void>;
  onStop: () => void;
  onAdjustRate: (delta: number) => void;
  onAdjustPitch: (delta: number) => void;
  onToggleContinuous: () => void;
}

function clampProgress(progress: number) {
  return Math.max(0, Math.min(100, Math.round(progress * 100)));
}

export function TTSPage({
  visible,
  bookTitle,
  chapterTitle,
  coverSrc,
  playState,
  currentText,
  config,
  readingProgress,
  currentPage,
  totalPages,
  sourceLabel,
  continuousEnabled,
  onClose,
  onReplay,
  onPlayPause,
  onStop,
  onAdjustRate,
  onAdjustPitch,
  onToggleContinuous,
}: TTSPageProps) {
  const { t } = useTranslation();

  const { currentExcerpt, nextExcerpt, supportingExcerpt } = useMemo(
    () => buildNarrationPreview(currentText),
    [currentText],
  );

  const progressPct = clampProgress(readingProgress);
  const voiceLabel = getTTSVoiceLabel(config);
  const statusLabel =
    playState === "loading"
      ? t("tts.loading")
      : playState === "playing"
        ? t("tts.playing")
        : playState === "paused"
          ? t("tts.paused")
          : t("tts.stopped");

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-[65] bg-background/96 backdrop-blur-md">
      <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col px-8 py-7">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border/70 bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            onClick={onClose}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("tts.returnToReading")}
          </button>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <Headphones className="h-4 w-4" />
            {statusLabel}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_320px] gap-6">
          <aside className="flex min-h-0 flex-col rounded-[32px] border border-border/60 bg-card/90 p-5">
            <div className="mb-5 aspect-[3/4] overflow-hidden rounded-[26px] bg-muted">
              {coverSrc ? (
                <img src={coverSrc} alt={bookTitle} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-end bg-gradient-to-br from-primary/10 via-background to-primary/5 p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
                      ReadAny TTS
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold leading-tight text-foreground">
                      {bookTitle || t("reader.untitled")}
                    </h2>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {sourceLabel}
                </p>
                <h1 className="mt-2 text-2xl font-semibold leading-tight text-foreground">
                  {bookTitle || t("reader.untitled")}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {chapterTitle || t("tts.fromCurrentPage")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                  {config.engine === "edge"
                    ? "Edge"
                    : config.engine === "dashscope"
                      ? "DashScope"
                      : t("tts.browser")}
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                  {voiceLabel}
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                  {t("tts.rateCompact", { rate: config.rate.toFixed(1) })}
                </span>
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 flex-col gap-6">
            <section className="rounded-[34px] border border-border/60 bg-card/95 p-7 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {t("tts.currentlyReading")}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold leading-tight text-foreground">
                    {currentExcerpt || t("tts.waitingText")}
                  </h2>
                </div>
                <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                  {currentPage > 0 && totalPages > 0
                    ? t("tts.pageProgress", { current: currentPage, total: totalPages })
                    : t("tts.readingProgress", { progress: progressPct })}
                </div>
              </div>

              <p className="max-w-3xl text-base leading-8 text-muted-foreground">
                {supportingExcerpt || t("tts.keepInSync")}
              </p>

              <div className="mt-8">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{t("tts.readingProgress", { progress: progressPct })}</span>
                  <span>{progressPct}%</span>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  onClick={onReplay}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("tts.restartFromHere")}
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background text-foreground transition-colors hover:bg-muted"
                    onClick={onStop}
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_18px_38px_rgba(35,99,255,0.22)] transition-transform hover:scale-[1.02]"
                    onClick={onPlayPause}
                  >
                    {playState === "playing" ? (
                      <Pause className="h-6 w-6 fill-current" />
                    ) : (
                      <Play className="ml-0.5 h-6 w-6 fill-current" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    onClick={onToggleContinuous}
                  >
                    <Bot className="h-4 w-4" />
                    {continuousEnabled ? t("tts.autoContinuePage") : t("tts.keepPageAligned")}
                  </button>
                </div>
              </div>
            </section>

            <section className="grid min-h-0 flex-1 grid-cols-[1.25fr_0.95fr] gap-6">
              <div className="rounded-[30px] border border-border/60 bg-card/90 p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {t("tts.narrationContext")}
                </p>
                <div className="mt-5 grid gap-4">
                  <div className="rounded-[24px] bg-muted/60 p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {t("tts.justRead")}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {supportingExcerpt || t("tts.keepInSync")}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-primary/15 bg-primary/[0.06] p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary/70">
                      {t("tts.currentSentence")}
                    </p>
                    <p className="mt-3 text-lg font-medium leading-8 text-foreground">
                      {currentExcerpt || t("tts.waitingText")}
                    </p>
                  </div>

                  <div className="rounded-[24px] bg-muted/60 p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {t("tts.upcomingSentence")}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {nextExcerpt || t("tts.currentPageOnly")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <section className="rounded-[30px] border border-border/60 bg-card/90 p-6">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <Settings2 className="h-4 w-4" />
                    {t("tts.quickSettings")}
                  </div>
                  <div className="mt-5 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{t("tts.rate")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("tts.rateCompact", { rate: config.rate.toFixed(1) })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-foreground transition-colors hover:bg-muted"
                          onClick={() => onAdjustRate(-0.1)}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[56px] text-center text-sm font-medium text-foreground">
                          {config.rate.toFixed(1)}x
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-foreground transition-colors hover:bg-muted"
                          onClick={() => onAdjustRate(0.1)}
                        >
                          <Play className="h-3.5 w-3.5 rotate-90 fill-current" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{t("tts.pitch")}</p>
                        <p className="text-xs text-muted-foreground">{config.pitch.toFixed(1)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-foreground transition-colors hover:bg-muted"
                          onClick={() => onAdjustPitch(-0.1)}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[56px] text-center text-sm font-medium text-foreground">
                          {config.pitch.toFixed(1)}
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 text-foreground transition-colors hover:bg-muted"
                          onClick={() => onAdjustPitch(0.1)}
                        >
                          <Play className="h-3.5 w-3.5 rotate-90 fill-current" />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="flex-1 rounded-[30px] border border-border/60 bg-card/90 p-6">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <Waves className="h-4 w-4" />
                    {t("tts.upNext")}
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-[22px] bg-muted/60 p-4">
                      <p className="text-sm font-medium text-foreground">{nextExcerpt || t("tts.currentPageOnly")}</p>
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">
                        {sourceLabel}
                      </p>
                    </div>

                    <div className="rounded-[22px] border border-dashed border-border/70 p-4 text-sm leading-7 text-muted-foreground">
                      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        <ScrollText className="h-4 w-4" />
                        {t("tts.followHighlight")}
                      </div>
                      {supportingExcerpt || t("tts.keepInSync")}
                    </div>
                  </div>
                </section>
              </div>
            </section>
          </main>

          <aside className="flex min-h-0 flex-col gap-6">
            <section className="rounded-[30px] border border-border/60 bg-card/90 p-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Headphones className="h-4 w-4" />
                {t("tts.listenSpace")}
              </div>
              <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
                <p>{t("tts.keepInSync")}</p>
                <p>{t("tts.autoContinuePage")}</p>
              </div>
            </section>

            <section className="flex-1 rounded-[30px] border border-border/60 bg-card/90 p-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <ScrollText className="h-4 w-4" />
                {t("tts.upNext")}
              </div>
              <div className="mt-5 space-y-3">
                {[currentExcerpt, nextExcerpt, supportingExcerpt].filter(Boolean).map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-[20px] bg-muted/60 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {index === 0
                        ? t("tts.currentSentence")
                        : index === 1
                          ? t("tts.upcomingSentence")
                          : t("tts.justRead")}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
