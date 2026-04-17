/**
 * CalendarSection.tsx — Month calendar grid with day cells.
 */
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MonthReport, StatsCalendarCell } from "@readany/core/stats";
import { cn } from "@readany/core/utils";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getStatsCopy } from "./stats-copy";
import {
  formatCompactMinutes,
  formatDateLabel,
  formatMinutes,
  intensityClass,
} from "./stats-utils";
import { CoverThumb } from "./StatsShared";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Month Calendar
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function MonthCalendarSection({
  calendar,
  isZh,
}: {
  calendar: NonNullable<MonthReport["readingCalendar"]>;
  isZh: boolean;
}) {
  const locale = isZh ? "zh-CN" : "en-US";
  const weekLabels = useMemo(() => {
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
    });
  }, [locale]);

  return (
    <div className="space-y-3">
      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-2">
        {weekLabels.map((label) => (
          <div
            key={label}
            className="px-1 text-center text-[11px] font-medium text-muted-foreground/35"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="space-y-2">
        {calendar.weeks.map((week, index) => (
          <div key={`${calendar.monthKey}-${index}`} className="grid grid-cols-7 gap-2">
            {week.map((cell) => (
              <CalendarDayCell key={cell.date} cell={cell} isZh={isZh} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarDayCell({ cell, isZh }: { cell: StatsCalendarCell; isZh: boolean }) {
  const { t } = useTranslation();
  const copy = useMemo(() => getStatsCopy(t), [t]);

  const tooltipText =
    cell.totalTime > 0
      ? `${formatDateLabel(cell.date, isZh)} · ${formatMinutes(cell.totalTime, isZh)} · ${cell.sessionsCount.toLocaleString()} ${copy.sessionsSuffix}`
      : `${formatDateLabel(cell.date, isZh)} · ${t("stats.noReading")}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex min-h-[80px] min-w-0 flex-col justify-between rounded-[14px] border p-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_3px_10px_rgba(0,0,0,0.03)] sm:min-h-[92px] sm:rounded-2xl sm:p-2.5",
            intensityClass(cell.intensity, cell.inCurrentMonth),
            cell.isToday && "ring-1.5 ring-primary/20 ring-offset-1 ring-offset-background",
          )}
        >
          {/* Top row: day number + time badge */}
          <div className="flex items-start justify-between gap-0.5">
            <div
              className={cn(
                "text-[13px] font-semibold tabular-nums leading-none",
                cell.inCurrentMonth ? "text-foreground/75" : "text-muted-foreground/25",
                cell.isToday && "text-primary/70",
              )}
            >
              {cell.dayOfMonth}
            </div>
            {cell.totalTime > 0 && (
              <div className="shrink-0 whitespace-nowrap rounded-md bg-background/70 px-1 py-0.5 text-[9px] font-medium tabular-nums leading-none text-foreground/60 shadow-xs backdrop-blur-sm">
                {formatCompactMinutes(cell.totalTime, isZh)}
              </div>
            )}
          </div>

          {/* Book covers — flush to bottom via flex justify-between */}
          {cell.covers.length > 0 ? (
            <div className="flex items-end">
              {cell.covers.slice(0, 3).map((cover, index) => (
                <div
                  key={`${cover.bookId}-${index}`}
                  className={cn("relative", index > 0 && "-ml-2")}
                  style={{ zIndex: 10 - index }}
                >
                  <CoverThumb
                    title={cover.title}
                    coverUrl={cover.coverUrl}
                    className="h-9 w-7 rounded-[4px] border-[1.5px] border-background/80 shadow-sm sm:h-10 sm:w-8"
                    fallbackClassName="text-[8px] font-bold"
                  />
                </div>
              ))}
              {cell.covers.length > 3 && (
                <div
                  className="relative -ml-1 flex h-9 w-7 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-background/80 bg-muted/80 text-[10px] font-bold tabular-nums text-muted-foreground/70 shadow-sm backdrop-blur-sm sm:h-10 sm:w-8"
                  style={{ zIndex: 7 }}
                >
                  +{cell.covers.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[220px] rounded-lg border border-border/40 bg-popover px-3 py-2 text-popover-foreground shadow-md"
      >
        <div className="space-y-1">
          <div className="text-[12px] font-medium">{tooltipText}</div>
          {cell.covers.length > 0 && (
            <div className="text-[11px] text-muted-foreground/50">
              {cell.covers.map((cover) => cover.title).join(" · ")}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
