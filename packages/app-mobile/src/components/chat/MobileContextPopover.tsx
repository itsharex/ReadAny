/**
 * MobileContextPopover — book context selector for standalone chat page.
 * Allows selecting multiple books as AI context.
 */
import { useChatReaderStore } from "@readany/core/stores";
import { useLibraryStore } from "@/stores/library-store";
import { BookOpen, Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function MobileContextPopover() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const books = useLibraryStore((s) => s.books);
  const { selectedBooks, addSelectedBook, removeSelectedBook } = useChatReaderStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: TouchEvent | MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("touchstart", handler);
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground active:bg-muted transition-colors"
      >
        <BookOpen className="size-3.5" />
        <span>
          {selectedBooks.length > 0
            ? t("chat.booksCount", { count: selectedBooks.length })
            : t("chat.context")}
        </span>
        {selectedBooks.length > 0 && (
          <button
            type="button"
            className="ml-0.5 rounded-full p-0.5 active:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              for (const id of selectedBooks) removeSelectedBook(id);
            }}
          >
            <X className="size-2.5" />
          </button>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border bg-background p-1.5 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="mb-1 px-2 py-1 text-xs font-medium text-muted-foreground">
            {t("chat.selectBooksForContext")}
          </p>
          <div className="max-h-60 overflow-y-auto">
            {books.map((book) => {
              const isSelected = selectedBooks.includes(book.id);
              return (
                <button
                  key={book.id}
                  type="button"
                  onClick={() =>
                    isSelected
                      ? removeSelectedBook(book.id)
                      : addSelectedBook(book.id)
                  }
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors active:bg-muted"
                >
                  <div
                    className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-neutral-300"
                    }`}
                  >
                    {isSelected && <Check className="size-3" />}
                  </div>
                  <span className="truncate text-foreground">{book.meta.title}</span>
                </button>
              );
            })}
          </div>
          {books.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {t("chat.noBooksInLibrary")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
