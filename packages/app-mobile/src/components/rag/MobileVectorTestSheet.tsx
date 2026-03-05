/**
 * MobileVectorTestSheet — mobile full-screen sheet for testing vectorization quality.
 * Tabs: Chunks, Vector Search, BM25 Search, Hybrid Search
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Search } from "lucide-react";
import { cn } from "@readany/core/utils";

type TestTab = "chunks" | "vector" | "bm25" | "hybrid";

interface MobileVectorTestSheetProps {
  bookId: string;
  open: boolean;
  onClose: () => void;
}

const TAB_IDS: TestTab[] = ["chunks", "vector", "bm25", "hybrid"];
const TAB_KEYS: Record<TestTab, string> = {
  chunks: "vectorize.chunks",
  vector: "vectorize.vector",
  bm25: "vectorize.bm25",
  hybrid: "vectorize.hybrid",
};

export function MobileVectorTestSheet({ bookId: _bookId, open, onClose }: MobileVectorTestSheetProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TestTab>("chunks");
  const [query, setQuery] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <header
        className="shrink-0 px-4 pb-3 border-b border-border"
        style={{ paddingTop: "calc(var(--safe-area-top) + 12px)" }}
      >
        <div className="flex items-center gap-3">
          <button type="button" className="p-1 -ml-1" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">{t("vectorize.title")}</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            className={cn(
              "flex-1 py-2.5 text-center text-xs font-medium transition-colors",
              activeTab === id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground active:text-foreground",
            )}
            onClick={() => setActiveTab(id)}
          >
            {t(TAB_KEYS[id])}
          </button>
        ))}
      </div>

      {/* Search bar (for non-chunks tabs) */}
      {activeTab !== "chunks" && (
        <div className="flex gap-2 border-b border-border p-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder={t("vectorize.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-1.5 text-sm text-primary-foreground"
          >
            {t("vectorize.search")}
          </button>
        </div>
      )}

      {/* Results area */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-muted-foreground text-center py-8">
          {activeTab === "chunks"
            ? t("vectorize.showingChunks")
            : t("vectorize.searchResults", { tab: activeTab })}
        </p>
      </div>
    </div>
  );
}
