/**
 * MobileTOCPanel — bottom sheet TOC with tree structure.
 * Auto-scrolls to current chapter on open.
 */
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MobileTOCItem } from "./MobileFoliateViewer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface MobileTOCPanelProps {
  tocItems: MobileTOCItem[];
  currentChapter: string;
  onGoToChapter: (href: string) => void;
  onClose: () => void;
}

export function MobileTOCPanel({ tocItems, currentChapter, onGoToChapter, onClose }: MobileTOCPanelProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentItemRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to current chapter on mount
  useEffect(() => {
    if (currentItemRef.current && scrollContainerRef.current) {
      // Small delay to ensure sheet animation is done
      const timer = setTimeout(() => {
        currentItemRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base">{t("reader.toc")}</SheetTitle>
        </SheetHeader>
        <div ref={scrollContainerRef} className="overflow-y-auto pb-8" style={{ maxHeight: "calc(70vh - 80px)" }}>
          {tocItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("reader.noToc")}</p>
          ) : (
            <div className="space-y-0.5">
              {tocItems.map((item) => (
                <TOCTreeItem
                  key={item.id}
                  item={item}
                  currentChapter={currentChapter}
                  onSelect={onGoToChapter}
                  currentItemRef={currentItemRef}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TOCTreeItem({
  item,
  currentChapter,
  onSelect,
  currentItemRef,
}: {
  item: MobileTOCItem;
  currentChapter: string;
  onSelect: (href: string) => void;
  currentItemRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const hasChildren = item.subitems && item.subitems.length > 0;
  const isCurrent = item.title === currentChapter;

  // Auto-expand parent if a child is current
  const hasCurrentChild = useCallback(
    (items: MobileTOCItem[]): boolean => {
      for (const child of items) {
        if (child.title === currentChapter) return true;
        if (child.subitems && hasCurrentChild(child.subitems)) return true;
      }
      return false;
    },
    [currentChapter],
  );

  const shouldExpand = hasChildren && hasCurrentChild(item.subitems!);
  const [expanded, setExpanded] = useState(shouldExpand);

  return (
    <div>
      <button
        ref={isCurrent ? currentItemRef : undefined}
        type="button"
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors active:bg-muted ${
          isCurrent ? "bg-primary/10 font-medium text-primary" : "text-foreground"
        }`}
        style={{ paddingLeft: `${12 + item.level * 16}px` }}
        onClick={() => {
          if (item.href) onSelect(item.href);
        }}
      >
        {hasChildren && (
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
        {!hasChildren && <span className="w-5 shrink-0" />}
        <span className="truncate">{item.title}</span>
      </button>

      {expanded && hasChildren && (
        <div>
          {item.subitems!.map((child) => (
            <TOCTreeItem
              key={child.id}
              item={child}
              currentChapter={currentChapter}
              onSelect={onSelect}
              currentItemRef={currentItemRef}
            />
          ))}
        </div>
      )}
    </div>
  );
}
