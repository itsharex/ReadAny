/**
 * NotesPage — mobile notes management center
 * Shows notebooks grouped by book, with notes and highlights tabs
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  StickyNote,
  Highlighter,
  BookOpen,
  Trash2,
  Search,
  Edit3,
  Check,
  X,
  ChevronLeft,
  FileText,
  Download,
  MessageSquareText,
} from "lucide-react";
import { cn } from "@readany/core/utils";
import { useAnnotationStore } from "@readany/core/stores/annotation-store";
import { useLibraryStore } from "@/stores/library-store";
import type { HighlightWithBook } from "@readany/core/db/database";
import type { Highlight } from "@readany/core/types";
import { HIGHLIGHT_COLOR_HEX } from "@readany/core/types";
import { annotationExporter, type ExportFormat } from "@readany/core/export";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type DetailTab = "notes" | "highlights";

export function NotesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    highlightsWithBooks,
    loadAllHighlightsWithBooks,
    removeHighlight,
    updateHighlight,
    stats,
    loadStats,
  } = useAnnotationStore();
  const books = useLibraryStore((s) => s.books);

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [detailTab, setDetailTab] = useState<DetailTab>("notes");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      loadAllHighlightsWithBooks(500),
      loadStats(),
    ]).finally(() => setIsLoading(false));
  }, [loadAllHighlightsWithBooks, loadStats]);

  const bookNotebooks = useMemo(() => {
    const grouped = new Map<string, {
      bookId: string;
      title: string;
      author: string;
      coverUrl: string | null;
      highlights: HighlightWithBook[];
      notesCount: number;
      highlightsOnlyCount: number;
      latestAt: number;
    }>();

    for (const h of highlightsWithBooks) {
      const existing = grouped.get(h.bookId);
      if (existing) {
        existing.highlights.push(h);
        if (h.note) existing.notesCount++;
        else existing.highlightsOnlyCount++;
        if (h.createdAt > existing.latestAt) existing.latestAt = h.createdAt;
      } else {
        grouped.set(h.bookId, {
          bookId: h.bookId,
          title: h.bookTitle || t("notes.unknownBook"),
          author: h.bookAuthor || t("notes.unknownAuthor"),
          coverUrl: h.bookCoverUrl || null,
          highlights: [h],
          notesCount: h.note ? 1 : 0,
          highlightsOnlyCount: h.note ? 0 : 1,
          latestAt: h.createdAt,
        });
      }
    }

    return Array.from(grouped.values()).sort((a, b) => b.latestAt - a.latestAt);
  }, [highlightsWithBooks, t]);

  const selectedBook = useMemo(() => {
    if (!selectedBookId) return null;
    return bookNotebooks.find((b) => b.bookId === selectedBookId) || null;
  }, [selectedBookId, bookNotebooks]);

  const { notes, highlightsOnly } = useMemo(() => {
    if (!selectedBook) return { notes: [], highlightsOnly: [] };
    let all = selectedBook.highlights;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      all = all.filter(
        (h) => h.text.toLowerCase().includes(q) ||
          h.note?.toLowerCase().includes(q) ||
          h.chapterTitle?.toLowerCase().includes(q),
      );
    }
    const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
    return {
      notes: sorted.filter((h) => h.note),
      highlightsOnly: sorted.filter((h) => !h.note),
    };
  }, [selectedBook, searchQuery]);

  const currentList = detailTab === "notes" ? notes : highlightsOnly;

  const itemsByChapter = useMemo(() => {
    const chapters = new Map<string, HighlightWithBook[]>();
    for (const h of currentList) {
      const chapter = h.chapterTitle || t("notes.unknownChapter");
      const arr = chapters.get(chapter) || [];
      arr.push(h);
      chapters.set(chapter, arr);
    }
    return chapters;
  }, [currentList, t]);

  const handleOpenBook = useCallback((bookId: string, cfi?: string) => {
    navigate(`/reader/${bookId}${cfi ? `?cfi=${encodeURIComponent(cfi)}` : ""}`);
  }, [navigate]);

  const handleDeleteNote = useCallback((highlight: HighlightWithBook) => {
    updateHighlight(highlight.id, { note: undefined });
    loadStats();
  }, [updateHighlight, loadStats]);

  const handleDeleteHighlight = useCallback((highlight: HighlightWithBook) => {
    removeHighlight(highlight.id);
    loadStats();
  }, [removeHighlight, loadStats]);

  const startEditNote = useCallback((highlight: HighlightWithBook) => {
    setEditingId(highlight.id);
    setEditNote(highlight.note || "");
  }, []);

  const saveNote = useCallback((id: string) => {
    updateHighlight(id, { note: editNote || undefined });
    setEditingId(null);
    setEditNote("");
  }, [updateHighlight, editNote]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditNote("");
  }, []);

  const handleExport = useCallback((format: ExportFormat) => {
    if (!selectedBook) return;
    const book = books.find((b) => b.id === selectedBook.bookId);
    if (!book) return;
    const content = annotationExporter.export(
      selectedBook.highlights as Highlight[],
      [],
      book,
      { format },
    );
    if (format === "notion") {
      annotationExporter.copyToClipboard(content);
    } else {
      const ext = format === "json" ? "json" : "md";
      annotationExporter.downloadAsFile(content, `${book.meta.title}-${format}.${ext}`, format);
    }
    setShowExportMenu(false);
  }, [selectedBook, books]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (bookNotebooks.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <header className="shrink-0 px-4 pb-3 pt-3 border-b border-border bg-background">
          <h1 className="text-2xl font-bold">{t("notes.title")}</h1>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <StickyNote className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">{t("notes.empty")}</h2>
          <p className="text-sm text-muted-foreground max-w-[260px]">
            {t("notes.emptyHint")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border bg-background">
        {selectedBookId ? (
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-full p-1.5 active:bg-muted"
                onClick={() => {
                  setSelectedBookId(null);
                  setSearchQuery("");
                  setEditingId(null);
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {selectedBook?.coverUrl ? (
                <img
                  src={selectedBook.coverUrl}
                  alt=""
                  className="h-10 w-7 shrink-0 rounded object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-10 w-7 shrink-0 items-center justify-center rounded bg-muted">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold truncate">{selectedBook?.title}</h2>
                <p className="text-xs text-muted-foreground">{selectedBook?.author}</p>
              </div>

              <div className="relative">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full active:bg-muted"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  <Download className="h-4 w-4" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-10 z-10 min-w-[140px] rounded-lg border border-border bg-popover p-1 shadow-lg">
                    {(["markdown", "json", "obsidian", "notion"] as ExportFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm active:bg-muted"
                        onClick={() => handleExport(fmt)}
                      >
                        {t(`notes.export${fmt.charAt(0).toUpperCase() + fmt.slice(1)}`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex rounded-lg border border-border/60 p-0.5">
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    detailTab === "notes"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                  onClick={() => setDetailTab("notes")}
                >
                  <MessageSquareText className="h-3 w-3" />
                  {t("notebook.notesSection")} ({selectedBook?.notesCount || 0})
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    detailTab === "highlights"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                  onClick={() => setDetailTab("highlights")}
                >
                  <Highlighter className="h-3 w-3" />
                  {t("notebook.highlightsSection")} ({selectedBook?.highlightsOnlyCount || 0})
                </button>
              </div>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("notes.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3">
            <h1 className="text-2xl font-bold">{t("notes.title")}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("notes.stats", {
                highlights: stats?.totalHighlights || 0,
                notes: stats?.highlightsWithNotes || 0,
                books: stats?.totalBooks || 0,
              })}
            </p>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {selectedBookId ? (
          currentList.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? t("notes.noSearchResults") : (detailTab === "notes" ? t("notes.noNotes") : t("highlights.noHighlights"))}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {Array.from(itemsByChapter.entries()).map(([chapter, items]) => (
                <div key={chapter}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="shrink-0 text-xs font-medium text-muted-foreground px-2">{chapter}</span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>

                  <div className="space-y-2">
                    {items.map((item) => (
                      detailTab === "notes" ? (
                        <NoteDetailCard
                          key={item.id}
                          highlight={item}
                          isEditing={editingId === item.id}
                          editNote={editNote}
                          setEditNote={setEditNote}
                          onStartEdit={() => startEditNote(item)}
                          onSaveNote={() => saveNote(item.id)}
                          onCancelEdit={cancelEdit}
                          onDeleteNote={() => handleDeleteNote(item)}
                          onNavigate={() => handleOpenBook(selectedBook!.bookId, item.cfi)}
                        />
                      ) : (
                        <HighlightDetailCard
                          key={item.id}
                          highlight={item}
                          onDelete={() => handleDeleteHighlight(item)}
                          onNavigate={() => handleOpenBook(selectedBook!.bookId, item.cfi)}
                        />
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="p-4 space-y-3">
            {bookNotebooks.map((book) => (
              <NotebookCard
                key={book.bookId}
                book={book}
                onClick={() => {
                  setSelectedBookId(book.bookId);
                  setSearchQuery("");
                  setEditingId(null);
                  setDetailTab("notes");
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface NotebookCardProps {
  book: {
    bookId: string;
    title: string;
    author: string;
    coverUrl: string | null;
    highlights: HighlightWithBook[];
    notesCount: number;
    highlightsOnlyCount: number;
  };
  onClick: () => void;
}

function NotebookCard({ book, onClick }: NotebookCardProps) {
  return (
    <button
      type="button"
      className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left active:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      {book.coverUrl ? (
        <img
          src={book.coverUrl}
          alt=""
          className="h-16 w-11 shrink-0 rounded object-cover shadow-sm"
        />
      ) : (
        <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded bg-muted">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{book.title}</p>
        <p className="text-xs text-muted-foreground truncate">{book.author}</p>

        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <MessageSquareText className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{book.notesCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Highlighter className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{book.highlightsOnlyCount}</span>
          </div>
        </div>
      </div>

      <div className="shrink-0 rounded-full bg-muted px-2 py-0.5">
        <span className="text-xs text-muted-foreground">{book.highlights.length}</span>
      </div>
    </button>
  );
}

interface NoteDetailCardProps {
  highlight: HighlightWithBook;
  isEditing: boolean;
  editNote: string;
  setEditNote: (note: string) => void;
  onStartEdit: () => void;
  onSaveNote: () => void;
  onCancelEdit: () => void;
  onDeleteNote: () => void;
  onNavigate: () => void;
}

function NoteDetailCard({
  highlight,
  isEditing,
  editNote,
  setEditNote,
  onStartEdit,
  onSaveNote,
  onCancelEdit,
  onDeleteNote,
  onNavigate,
}: NoteDetailCardProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div
        className="flex items-start gap-2 cursor-pointer"
        onClick={onNavigate}
      >
        <div
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: HIGHLIGHT_COLOR_HEX[highlight.color] }}
        />
        <p className="text-sm text-foreground line-clamp-2 flex-1">
          "{highlight.text}"
        </p>
      </div>

      {isEditing ? (
        <div className="mt-2">
          <textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={t("notebook.addNote")}
            autoFocus
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground active:bg-muted"
              onClick={onCancelEdit}
            >
              <X className="h-3 w-3" />
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
              onClick={onSaveNote}
            >
              <Check className="h-3 w-3" />
              {t("common.save")}
            </button>
          </div>
        </div>
      ) : (
        <>
          {highlight.note && (
            <div
              className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 prose prose-xs dark:prose-invert max-w-none break-words overflow-hidden [overflow-wrap:anywhere]"
              onClick={onNavigate}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {highlight.note}
              </ReactMarkdown>
            </div>
          )}

          <div className="mt-2 flex justify-end gap-1">
            <button
              type="button"
              className="rounded p-1.5 text-muted-foreground active:bg-muted active:text-primary"
              onClick={onStartEdit}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="rounded p-1.5 text-muted-foreground active:bg-muted active:text-destructive"
              onClick={onDeleteNote}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface HighlightDetailCardProps {
  highlight: HighlightWithBook;
  onDelete: () => void;
  onNavigate: () => void;
}

function HighlightDetailCard({
  highlight,
  onDelete,
  onNavigate,
}: HighlightDetailCardProps) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
      <div
        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full cursor-pointer"
        style={{ backgroundColor: HIGHLIGHT_COLOR_HEX[highlight.color] }}
        onClick={onNavigate}
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-sm text-foreground line-clamp-2 cursor-pointer"
          onClick={onNavigate}
        >
          "{highlight.text}"
        </p>
        {highlight.chapterTitle && (
          <p className="mt-1 text-xs text-muted-foreground/70">
            {highlight.chapterTitle}
          </p>
        )}
      </div>
      <button
        type="button"
        className="shrink-0 rounded p-1.5 text-muted-foreground active:bg-muted active:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
