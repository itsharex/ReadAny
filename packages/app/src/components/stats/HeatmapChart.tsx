import type { StatsChartDatum } from "@readany/core/stats";
import { cn } from "@readany/core/utils";
import { useMemo, useState } from "react";
import { formatCompactMinutes } from "./stats-utils";

interface HeatmapChartProps {
  data: StatsChartDatum[];
  emptyMessage?: string;
  isZh?: boolean;
  lowLabel: string;
  highLabel: string;
  activeDaysLabel: (count: number) => string;
}

type HeatmapCell = {
  day: number;
  dateKey: string;
  value: number;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthDayLabel(dateKey: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function getIntensityLevel(value: number, maxValue: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || maxValue <= 0) return 0;
  const ratio = value / maxValue;
  if (ratio < 0.2) return 1;
  if (ratio < 0.4) return 2;
  if (ratio < 0.6) return 3;
  return 4;
}

function getIntensityClass(level: 0 | 1 | 2 | 3 | 4) {
  const palette = [
    "border-border/15 bg-muted/25 text-muted-foreground/35",
    "border-primary/10 bg-primary/[0.10] text-foreground/72",
    "border-primary/12 bg-primary/[0.18] text-foreground/78",
    "border-primary/16 bg-primary/[0.30] text-foreground/84",
    "border-primary/20 bg-primary/[0.44] text-foreground/90",
  ] as const;

  return palette[level];
}

export function HeatmapChart({
  data,
  emptyMessage,
  isZh = false,
  lowLabel,
  highLabel,
  activeDaysLabel,
}: HeatmapChartProps) {
  const locale = isZh ? "zh-CN" : "en-US";

  const valueMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data) map.set(item.key, item.value);
    return map;
  }, [data]);

  const maxValue = useMemo(() => Math.max(...data.map((item) => item.value), 1), [data]);

  const firstDateKey = data[0]?.key;
  const year = firstDateKey ? Number(firstDateKey.slice(0, 4)) : new Date().getFullYear();
  const month = firstDateKey ? Number(firstDateKey.slice(5, 7)) - 1 : new Date().getMonth();

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    const startDow = (firstDay.getDay() + 6) % 7;

    const rows: HeatmapCell[][] = [];
    let currentRow: HeatmapCell[] = [];

    for (let index = 0; index < startDow; index += 1) {
      currentRow.push({ day: 0, dateKey: "", value: -1 });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      const dateKey = `${year}-${mm}-${dd}`;
      currentRow.push({
        day,
        dateKey,
        value: valueMap.get(dateKey) ?? 0,
      });

      if (currentRow.length === 7) {
        rows.push(currentRow);
        currentRow = [];
      }
    }

    if (currentRow.length > 0) {
      while (currentRow.length < 7) {
        currentRow.push({ day: 0, dateKey: "", value: -1 });
      }
      rows.push(currentRow);
    }

    return rows;
  }, [month, valueMap, year]);

  const weekdayLabels = useMemo(() => {
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
    });
  }, [locale]);

  const activeDays = useMemo(() => data.filter((item) => item.value > 0).length, [data]);

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const selectedCell = useMemo(() => {
    if (!selectedDateKey) return null;
    for (const week of weeks) {
      const found = week.find((cell) => cell.dateKey === selectedDateKey);
      if (found) return found;
    }
    return null;
  }, [selectedDateKey, weeks]);

  if (data.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-border/20 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent px-4 py-4 sm:px-5">
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="text-center text-[11px] font-medium tracking-[0.04em] text-muted-foreground/45"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="space-y-2 sm:space-y-3">
            {weeks.map((week, weekIndex) => (
              <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-2 sm:gap-3">
                {week.map((cell, cellIndex) => {
                  if (cell.day === 0) {
                    return <div key={`empty-${weekIndex}-${cellIndex}`} className="aspect-square" />;
                  }

                  const intensity = getIntensityLevel(cell.value, maxValue);
                  const isToday = cell.dateKey === todayKey;
                  const isSelected = cell.dateKey === selectedDateKey;

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onMouseEnter={() => setSelectedDateKey(cell.dateKey)}
                      onFocus={() => setSelectedDateKey(cell.dateKey)}
                      onClick={() =>
                        setSelectedDateKey((current) =>
                          current === cell.dateKey ? null : cell.dateKey,
                        )
                      }
                      className={cn(
                        "aspect-square rounded-[10px] border text-[12px] font-semibold tabular-nums transition-all duration-150",
                        "hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
                        getIntensityClass(intensity),
                        isToday && "ring-1 ring-primary/35 ring-offset-0",
                        isSelected && "shadow-[0_8px_20px_rgba(0,0,0,0.08)]",
                      )}
                      title={`${toMonthDayLabel(cell.dateKey, locale)} · ${formatCompactMinutes(
                        cell.value,
                        isZh,
                      )}`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground/65">
          <span>{lowLabel}</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className={cn(
                  "h-3 w-3 rounded-[4px] border",
                  getIntensityClass(level as 0 | 1 | 2 | 3 | 4),
                )}
              />
            ))}
          </div>
          <span>{highLabel}</span>
        </div>

        <div className="text-xs text-muted-foreground/65">
          {selectedCell
            ? `${toMonthDayLabel(selectedCell.dateKey, locale)} · ${formatCompactMinutes(
                selectedCell.value,
                isZh,
              )}`
            : activeDaysLabel(activeDays)}
        </div>
      </div>
    </div>
  );
}
