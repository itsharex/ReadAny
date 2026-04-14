import { evictBlobCache } from "@/components/reader/ReaderView";
/**
 * TabBar — draggable tab bar with custom window controls
 * Tauri: shows traffic lights on left, draggable region for window move
 */
import { type Tab, useAppStore } from "@/stores/app-store";
import { useLibraryStore } from "@/stores/library-store";
import { useReaderStore } from "@/stores/reader-store";
import { BookOpen, Home, MessageSquare, NotebookPen, X } from "lucide-react";
import { useEffect, useState } from "react";

function useIsTauri() {
  const [v, setV] = useState(false);
  useEffect(() => { setV("__TAURI_INTERNALS__" in window); }, []);
  return v;
}

function TrafficLights() {
  if (!useIsTauri()) return null;

  return (
    <div className="flex h-full shrink-0 items-center gap-1.5 pl-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
      <button type="button" className="h-3 w-3 rounded-full bg-[#ff5f57] hover:opacity-80" onClick={() => import("@tauri-apps/api/window").then(m => m.getCurrentWindow().close()).catch(() => {})} />
      <button type="button" className="h-3 w-3 rounded-full bg-[#febc2e] hover:opacity-80" onClick={() => import("@tauri-apps/api/window").then(m => m.getCurrentWindow().minimize()).catch(() => {})} />
      <button type="button" className="h-3 w-3 rounded-full bg-[#28c840] hover:opacity-80" onClick={async () => { try { const { getCurrentWindow } = await import("@tauri-apps/api/window"); const w = getCurrentWindow(); (await w.isMaximized()) ? await w.unmaximize() : await w.maximize(); } catch {} }} />
    </div>
  );
}

const TAB_ICONS: Record<string, React.ElementType> = {
  home: Home,
  reader: BookOpen,
  chat: MessageSquare,
  notes: NotebookPen,
};

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, removeTab } = useAppStore();
  const removeReaderTab = useReaderStore((s) => s.removeTab);
  const books = useLibraryStore((s) => s.books);

  const readerTabs = tabs.filter((t) => t.type !== "home");

  const handleTabClose = (tabId: string) => {
    const closingTab = tabs.find((t) => t.id === tabId);
    if (closingTab?.bookId) {
      const book = books.find((b) => b.id === closingTab.bookId);
      if (book?.filePath) evictBlobCache(book.filePath);
    }
    removeTab(tabId);
    removeReaderTab(tabId);
    const remainingNonHome = tabs.filter((t) => t.type !== "home" && t.id !== tabId);
    if (remainingNonHome.length === 0) setActiveTab("home");
  };

  return (
    <div
      className="flex h-8 shrink-0 select-none items-center border-neutral-200 bg-muted"
      data-tauri-drag-region
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Traffic lights — leftmost */}
      <TrafficLights />

      {/* Home icon */}
      <div className="flex h-full shrink-0 items-center pl-1">
        <button
          type="button"
          className="flex items-center justify-center rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-800"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          onClick={() => setActiveTab("home")}
        >
          <Home className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex h-full flex-1 items-center gap-0.5 overflow-x-auto px-1"
        data-tauri-drag-region
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        {readerTabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onActivate={() => setActiveTab(tab.id)}
            onClose={() => handleTabClose(tab.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TabItem({
  tab,
  isActive,
  onActivate,
  onClose,
}: {
  tab: Tab;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}) {
  const Icon = TAB_ICONS[tab.type] ?? BookOpen;

  return (
    <div
      className={`group flex h-7 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs transition-all ${
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      onClick={onActivate}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="max-w-[120px] truncate">{tab.title}</span>
      <button
        type="button"
        className="ml-0.5 hidden h-4 w-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-neutral-200/80 hover:text-foreground group-hover:flex"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}