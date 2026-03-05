/**
 * MobileReaderToolbar — top bar with back, title, TOC, settings.
 * Slides in/out based on visibility.
 */
import { ArrowLeft, List, MessageSquare, NotebookPen, Search, Settings, Volume2 } from "lucide-react";

interface MobileReaderToolbarProps {
  visible: boolean;
  title: string;
  chapterTitle: string;
  ttsActive?: boolean;
  chatActive?: boolean;
  onBack: () => void;
  onToggleToc: () => void;
  onToggleSettings: () => void;
  onToggleSearch: () => void;
  onToggleNotebook: () => void;
  onToggleTTS?: () => void;
  onToggleChat?: () => void;
}

export function MobileReaderToolbar({
  visible,
  title,
  chapterTitle,
  ttsActive,
  chatActive,
  onBack,
  onToggleToc,
  onToggleSettings,
  onToggleSearch,
  onToggleNotebook,
  onToggleTTS,
  onToggleChat,
}: MobileReaderToolbarProps) {
  return (
    <header
      className={`absolute top-0 left-0 right-0 z-30 transition-transform duration-200 ease-out ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {/* Gradient bg for readability */}
      <div className="bg-gradient-to-b from-black/60 to-transparent pb-6 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 px-4 py-2">
          {/* Back */}
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white active:bg-white/20"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Title */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{title}</p>
            {chapterTitle && (
              <p className="truncate text-xs text-white/70">{chapterTitle}</p>
            )}
          </div>

          {/* Notebook */}
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white active:bg-white/20"
            onClick={onToggleNotebook}
          >
            <NotebookPen className="h-5 w-5" />
          </button>

          {/* AI Chat */}
          {onToggleChat && (
            <button
              type="button"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:bg-white/20 ${
                chatActive ? "text-primary bg-white/20" : "text-white"
              }`}
              onClick={onToggleChat}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          )}

          {/* TTS */}
          {onToggleTTS && (
            <button
              type="button"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:bg-white/20 ${
                ttsActive ? "text-primary bg-white/20" : "text-white"
              }`}
              onClick={onToggleTTS}
            >
              <Volume2 className="h-5 w-5" />
            </button>
          )}

          {/* TOC */}
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white active:bg-white/20"
            onClick={onToggleToc}
          >
            <List className="h-5 w-5" />
          </button>

          {/* Search */}
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white active:bg-white/20"
            onClick={onToggleSearch}
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Settings */}
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white active:bg-white/20"
            onClick={onToggleSettings}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
