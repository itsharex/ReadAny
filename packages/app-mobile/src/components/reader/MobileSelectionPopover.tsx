/**
 * MobileSelectionPopover — floating menu when text is selected in the reader.
 * Supports: highlight (6 colors + underline), note, copy, translate, ask AI, TTS, edit/delete.
 */
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Copy,
  Highlighter,
  Languages,
  NotebookPen,
  Sparkles,
  Trash2,
  Volume2,
} from "lucide-react";

export interface BookSelection {
  text: string;
  cfi: string;
  range?: Range;
  /** True when user tapped an existing annotation */
  annotated?: boolean;
  annotationId?: string;
  color?: string;
  position: { x: number; y: number; selectionTop: number; selectionBottom: number; direction?: "forward" | "backward" };
}

interface MobileSelectionPopoverProps {
  selection: BookSelection;
  isPdf?: boolean;
  onHighlight: (color: string) => void;
  onNote: () => void;
  onCopy: () => void;
  onTranslate: () => void;
  onAskAI: () => void;
  onSpeak: () => void;
  onRemoveHighlight: () => void;
  onDismiss: () => void;
}

const HIGHLIGHT_COLORS = [
  { id: "yellow", bg: "bg-yellow-400" },
  { id: "red", bg: "bg-red-400" },
  { id: "green", bg: "bg-green-400" },
  { id: "blue", bg: "bg-blue-400" },
  { id: "violet", bg: "bg-violet-400" },
  { id: "pink", bg: "bg-pink-400" },
];

export function MobileSelectionPopover({
  selection,
  isPdf,
  onHighlight,
  onNote,
  onCopy,
  onTranslate,
  onAskAI,
  onSpeak,
  onRemoveHighlight,
  onDismiss,
}: MobileSelectionPopoverProps) {
  const { t } = useTranslation();
  const [showColors, setShowColors] = useState(!!selection.annotated);

  const handleHighlightClick = useCallback(() => {
    if (isPdf) return;
    if (showColors) {
      setShowColors(false);
    } else {
      setShowColors(true);
    }
  }, [isPdf, showColors]);

  // Position: smart above/below placement like desktop
  const popoverWidth = 220;
  const popoverH = 44; // single row height
  const colorRowH = 40; // color picker row height
  const gap = 8;
  const padding = 8;
  const totalH = showColors ? popoverH + colorRowH + 6 : popoverH; // 6 for mb-1.5

  // Read safe-area-inset-top for top boundary clamping
  const safeAreaTop = useMemo(() => {
    const el = document.documentElement;
    const val = getComputedStyle(el).getPropertyValue("--safe-area-top")?.trim();
    if (val) return parseInt(val, 10) || 0;
    // Fallback: read env(safe-area-inset-top) via a temp element
    const tmp = document.createElement("div");
    tmp.style.position = "fixed";
    tmp.style.top = "env(safe-area-inset-top, 0px)";
    tmp.style.visibility = "hidden";
    document.body.appendChild(tmp);
    const top = tmp.getBoundingClientRect().top;
    document.body.removeChild(tmp);
    return top;
  }, []);

  const topPadding = padding + safeAreaTop;
  const { selectionTop, selectionBottom, direction } = selection.position;

  // X: centered on selection, clamped to viewport
  const x = Math.max(padding, Math.min(
    selection.position.x - popoverWidth / 2,
    window.innerWidth - popoverWidth - padding,
  ));

  // Y positioning: direction-aware with viewport clamp
  const yAbove = selectionTop - totalH - gap;
  const yBelow = selectionBottom + gap;
  const aboveValid = yAbove >= topPadding;
  const belowValid = yBelow + totalH + padding <= window.innerHeight;

  let y: number;
  if (direction === "backward") {
    // User selected upward — prefer placing above the selection top
    if (aboveValid) {
      y = yAbove;
    } else {
      // Can't fit above — place at the top of the visible area
      y = topPadding;
    }
  } else {
    // User selected downward (or unknown) — prefer placing below the selection bottom
    if (belowValid) {
      y = yBelow;
    } else {
      // Can't fit below — place at the bottom of the visible area
      y = window.innerHeight - totalH - padding;
    }
  }

  // Final clamp: always keep fully visible within the safe viewport
  y = Math.max(topPadding, Math.min(y, window.innerHeight - totalH - padding));

  const style: React.CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    zIndex: 9999,
  };

  return (
    <>
      {/* No backdrop — a full-screen overlay would intercept touch events
          on the iframe and prevent the user from dragging selection handles
          to expand the selection. Dismissal is handled by the iframe's
          own click/tap handler which clears the selection. */}

      <div style={style} className="animate-in fade-in zoom-in-95 duration-150">
        {/* Color picker row */}
        {showColors && (
          <div className="mb-1.5 flex items-center gap-1.5 rounded-xl bg-popover p-2 shadow-lg border">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`h-7 w-7 rounded-full ${c.bg} ring-offset-background transition-all active:scale-90 ${
                  selection.color === c.id ? "ring-2 ring-primary ring-offset-2" : ""
                }`}
                onClick={() => onHighlight(c.id)}
              />
            ))}
            {/* Wavy underline option */}
            <button
              type="button"
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold transition-all active:scale-90 ${
                selection.color === "underline" ? "ring-2 ring-primary ring-offset-2" : ""
              }`}
              onClick={() => onHighlight("underline")}
            >
              <span className="underline decoration-wavy">U</span>
            </button>
          </div>
        )}

        {/* Action buttons row — icon-only compact */}
        <div className="flex items-center gap-0.5 rounded-xl bg-popover p-1 shadow-lg border">
          {/* Highlight */}
          {!isPdf && (
            <IconButton
              icon={<Highlighter className="h-[18px] w-[18px]" />}
              tooltip={t("reader.highlight")}
              onClick={handleHighlightClick}
              active={showColors}
            />
          )}

          {/* Note */}
          <IconButton
            icon={<NotebookPen className="h-[18px] w-[18px]" />}
            tooltip={t("reader.note")}
            onClick={onNote}
          />

          {/* Copy */}
          <IconButton
            icon={<Copy className="h-[18px] w-[18px]" />}
            tooltip={t("common.copy")}
            onClick={onCopy}
          />

          {/* Translate */}
          <IconButton
            icon={<Languages className="h-[18px] w-[18px]" />}
            tooltip={t("reader.translate")}
            onClick={onTranslate}
          />

          {/* Ask AI */}
          <IconButton
            icon={<Sparkles className="h-[18px] w-[18px]" />}
            tooltip={t("reader.askAI")}
            onClick={onAskAI}
          />

          {/* TTS */}
          <IconButton
            icon={<Volume2 className="h-[18px] w-[18px]" />}
            tooltip={t("tts.speakSelection")}
            onClick={onSpeak}
          />

          {/* Delete — only for existing annotations */}
          {selection.annotated && (
            <IconButton
              icon={<Trash2 className="h-[18px] w-[18px]" />}
              tooltip={t("common.remove")}
              onClick={onRemoveHighlight}
              destructive
            />
          )}
        </div>
      </div>
    </>
  );
}

function IconButton({
  icon,
  tooltip,
  onClick,
  active,
  destructive,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  active?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      title={tooltip}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors active:bg-muted ${
        active ? "bg-muted" : ""
      } ${destructive ? "text-destructive" : "text-foreground"}`}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
