/**
 * StatsSections.tsx — Section components for the mobile Stats screen.
 * Each section is a self-contained visual block with no business logic.
 *
 * Feature-parity with desktop StatsSections.tsx:
 *  - ChartSurface (heatmap / bar)
 *  - DaySummaryPanel (day dimension)
 *  - TopBooksSection (expand/collapse)
 *  - InsightsSection
 *  - MonthCalendarSection (month dimension)
 *  - RhythmProfileSection (year/lifetime)
 *  - YearlySnapshotsSection (lifetime)
 *  - JourneySummaryPanel (lifetime)
 *  - SectionCard, MetricTile, EmptyState
 */
import { useColors, withOpacity } from "@/styles/theme";
import type {
  DailyReadingFact,
  MonthReport,
  StatsCalendarCell,
  StatsChartBlock,
  StatsInsight,
  StatsReport,
  TopBookEntry,
} from "@readany/core/stats";
import { ChevronDownIcon, ChevronUpIcon, ClockIcon } from "@/components/ui/Icon";
import { useMemo, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { BarChart } from "./BarChart";
import { makeStyles } from "./stats-styles";
import {
  formatClock,
  formatCompactMinutes,
  formatDateLabel,
  formatTimeLocalized,
  localizeSemanticLabel,
} from "./stats-utils";

/* ─── Types ─── */

export type StatsCopy = {
  heatmapLegendLow: string;
  heatmapLegendHigh: string;
  activeDaysSummary: (count: number) => string;
  noDataDesc: string;
  noDataTitle: string;
  chartPeakLabel: (label: string, value: string) => string;
  topBookLead: string;
  noTopBooks: string;
  unknownAuthor: string;
  pagesReadSuffix: string;
  sessionsSuffix: string;
  noInsights: string;
  // Day summary
  firstSession: string;
  lastSession: string;
  peakHour: string;
  longestRead: string;
  topFocus: string;
  noDayTopBook: string;
  noTimeline: string;
  activeNow: string;
  // Calendar
  readingCalendar: string;
  readingCalendarDesc: string;
  // Rhythm profile
  timeOfDay: string;
  timeOfDayDesc: string;
  categoryDistribution: string;
  categoryDistributionDesc: string;
  uncategorized: string;
  timeOfDayLabels: Record<string, string>;
  // Yearly snapshots
  books: string;
  activeDays: string;
  // Journey
  daysSuffix: string;
  startedOn: string;
  activeReadingDays: string;
  inactiveReadingDays: string;
  journeyNarrative: (days: number) => string;
  // Milestones
  milestones: string;
  milestonesDesc: string;
  // Day summary
  daySummary: string;
  daySummaryDesc: string;
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Chart Surface
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function ChartSurface({
  chart,
  isZh,
  copy,
}: {
  chart: StatsChartBlock;
  isZh: boolean;
  copy: StatsCopy;
}) {
  const colors = useColors();
  const s = makeStyles(colors);

  if (chart.type === "heatmap") {
    return <MonthHeatmap chart={chart} isZh={isZh} copy={copy} />;
  }

  if (chart.data.length <= 1) {
    const point = chart.data[0];
    if (!point) {
      return (
        <View style={s.barChartEmpty}>
          <Text style={s.barChartEmptyText}>{copy.noDataDesc}</Text>
        </View>
      );
    }
    return (
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 32, fontWeight: "700", color: colors.foreground, letterSpacing: -1 }}>
          {formatTimeLocalized(point.value, isZh)}
        </Text>
        <Text style={{ fontSize: 13, color: withOpacity(colors.mutedForeground, 0.5) }}>
          {point.label}
        </Text>
      </View>
    );
  }

  const barData = chart.data.map((item) => ({ label: item.label, value: item.value }));
  return <BarChart data={barData} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Month Heatmap — calendar-grid for a single month
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function MonthHeatmap({
  chart,
  isZh,
  copy,
}: {
  chart: StatsChartBlock;
  isZh: boolean;
  copy: StatsCopy;
}) {
  const colors = useColors();
  const s = makeStyles(colors);

  // Build a date→value map
  const valueMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of chart.data) m.set(d.key, d.value);
    return m;
  }, [chart.data]);

  const maxVal = useMemo(
    () => Math.max(...chart.data.map((d) => d.value), 1),
    [chart.data],
  );

  // Derive month/year from first data point
  const firstDate = chart.data[0]?.key;
  const year = firstDate ? Number(firstDate.slice(0, 4)) : new Date().getFullYear();
  const month = firstDate ? Number(firstDate.slice(5, 7)) - 1 : new Date().getMonth();

  // Build weeks grid (Mon = 0)
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Monday-based: Mon=0 .. Sun=6
    const startDow = (firstDay.getDay() + 6) % 7;

    const rows: { day: number; dateKey: string; value: number }[][] = [];
    let currentRow: { day: number; dateKey: string; value: number }[] = [];

    // Pad leading empty cells
    for (let i = 0; i < startDow; i++) {
      currentRow.push({ day: 0, dateKey: "", value: -1 });
    }

    for (let d = 1; d <= totalDays; d++) {
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      const key = `${year}-${mm}-${dd}`;
      currentRow.push({ day: d, dateKey: key, value: valueMap.get(key) ?? 0 });

      if (currentRow.length === 7) {
        rows.push(currentRow);
        currentRow = [];
      }
    }

    // Pad trailing empty cells
    if (currentRow.length > 0) {
      while (currentRow.length < 7) {
        currentRow.push({ day: 0, dateKey: "", value: -1 });
      }
      rows.push(currentRow);
    }

    return rows;
  }, [year, month, valueMap]);

  // Weekday labels
  const locale = isZh ? "zh-CN" : "en-US";
  const weekLabels = useMemo(() => {
    const monday = new Date(2024, 0, 1); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(d);
    });
  }, [locale]);

  const getColor = (value: number): string => {
    if (value <= 0) return withOpacity(colors.muted, 0.3);
    const ratio = value / maxVal;
    if (ratio < 0.2) return withOpacity(colors.emerald, 0.25);
    if (ratio < 0.4) return withOpacity(colors.emerald, 0.4);
    if (ratio < 0.6) return withOpacity(colors.emerald, 0.55);
    if (ratio < 0.8) return withOpacity(colors.emerald, 0.7);
    return withOpacity(colors.emerald, 0.9);
  };

  const todayKey = (() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${mm}-${dd}`;
  })();

  const [selected, setSelected] = useState<{ day: number; value: number } | null>(null);

  return (
    <View style={{ gap: 6 }}>
      {/* Weekday header */}
      <View style={{ flexDirection: "row" }}>
        {weekLabels.map((label, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 10, color: withOpacity(colors.mutedForeground, 0.4) }}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: "row", gap: 3 }}>
          {week.map((cell, ci) => {
            if (cell.day === 0) {
              return <View key={`empty-${ci}`} style={{ flex: 1, aspectRatio: 1 }} />;
            }
            const isToday = cell.dateKey === todayKey;
            return (
              <TouchableOpacity
                key={cell.dateKey}
                activeOpacity={0.7}
                onPress={() => {
                  setSelected(selected?.day === cell.day ? null : { day: cell.day, value: cell.value });
                  if (selected?.day !== cell.day) setTimeout(() => setSelected(null), 2000);
                }}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  borderRadius: 4,
                  backgroundColor: getColor(cell.value),
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: isToday ? 1.5 : 0,
                  borderColor: isToday ? withOpacity(colors.primary, 0.35) : "transparent",
                }}
              >
                <Text style={{
                  fontSize: 9,
                  fontWeight: "600",
                  color: cell.value > 0
                    ? withOpacity(colors.foreground, 0.7)
                    : withOpacity(colors.mutedForeground, 0.35),
                }}>
                  {cell.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Legend + selected tooltip */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <View style={s.heatmapLegend}>
          <Text style={s.legendText}>{copy.heatmapLegendLow}</Text>
          {[
            withOpacity(colors.muted, 0.3),
            withOpacity(colors.emerald, 0.25),
            withOpacity(colors.emerald, 0.4),
            withOpacity(colors.emerald, 0.7),
            withOpacity(colors.emerald, 0.9),
          ].map((c, i) => (
            <View key={i} style={[s.legendCell, { backgroundColor: c }]} />
          ))}
          <Text style={s.legendText}>{copy.heatmapLegendHigh}</Text>
        </View>

        {selected && (
          <Text style={{ fontSize: 11, color: withOpacity(colors.foreground, 0.6) }}>
            {selected.day}{isZh ? "日" : "th"} · {formatCompactMinutes(selected.value, isZh)}
          </Text>
        )}
      </View>
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Day Summary
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function DaySummaryPanel({
  dayFact,
  topBook,
  isZh,
  copy,
}: {
  dayFact: DailyReadingFact | null;
  topBook?: TopBookEntry;
  isZh: boolean;
  copy: StatsCopy;
}) {
  const colors = useColors();
  const s = makeStyles(colors);

  if (!dayFact) {
    return (
      <EmptyState
        title={copy.noDataTitle}
        description={copy.noDataDesc}
        icon={<ClockIcon size={24} color={withOpacity(colors.mutedForeground, 0.45)} />}
      />
    );
  }

  const facts = [
    { label: copy.firstSession, value: formatClock(dayFact.firstSessionAt, isZh) },
    { label: copy.lastSession, value: formatClock(dayFact.lastSessionAt, isZh) },
    { label: copy.peakHour, value: dayFact.peakHour !== undefined ? `${String(dayFact.peakHour).padStart(2, "0")}:00` : "—" },
    { label: copy.longestRead, value: formatTimeLocalized(dayFact.longestSessionTime, isZh) },
  ];

  return (
    <View style={{ gap: 12 }}>
      {/* Fact chips — 2 col grid */}
      <View style={s.daySummaryGrid}>
        {facts.map((item) => (
          <View key={item.label} style={s.daySummaryChip}>
            <Text style={s.daySummaryChipLabel}>{item.label}</Text>
            <Text style={s.daySummaryChipValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Top focus highlight */}
      <View style={s.dayTopFocus}>
        <Text style={s.dayTopFocusLabel}>{copy.topFocus}</Text>
        <Text style={s.dayTopFocusTitle} numberOfLines={1}>
          {topBook?.title ?? copy.noDayTopBook}
        </Text>
        <Text style={s.dayTopFocusSub}>
          {topBook ? formatTimeLocalized(topBook.totalTime, isZh) : copy.noTimeline}
        </Text>
      </View>
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Top Books — with expand/collapse
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const TOP_BOOKS_COLLAPSED = 3;

export function TopBooksSection({
  books,
  resolvedCovers,
  isZh,
  copy,
}: {
  books: TopBookEntry[];
  resolvedCovers: Map<string, string>;
  isZh: boolean;
  copy: StatsCopy;
}) {
  const colors = useColors();
  const s = makeStyles(colors);
  const [expanded, setExpanded] = useState(false);

  if (books.length === 0) {
    return (
      <Text style={{ fontSize: 13, color: withOpacity(colors.mutedForeground, 0.45), textAlign: "center", paddingVertical: 20 }}>
        {copy.noTopBooks}
      </Text>
    );
  }

  const canExpand = books.length > TOP_BOOKS_COLLAPSED;
  const visibleBooks = expanded ? books : books.slice(0, TOP_BOOKS_COLLAPSED);

  return (
    <View>
      {visibleBooks.map((book, index) => {
        const isFirst = index === 0;
        const coverUrl = resolvedCovers.get(book.bookId) || book.coverUrl;
        return (
          <View
            key={book.bookId}
            style={[s.bookItem, isFirst && s.bookItemFirst]}
          >
            {/* Rank */}
            <View style={[s.bookRank, isFirst ? s.bookRankFirst : s.bookRankDefault]}>
              <Text style={[s.bookRankText, isFirst ? s.bookRankTextFirst : s.bookRankTextDefault]}>
                {index + 1}
              </Text>
            </View>

            {/* Cover — library-style */}
            <StatsBookCover
              coverUrl={coverUrl}
              title={book.title}
              width={isFirst ? 52 : 36}
            />

            {/* Info */}
            <View style={s.bookInfo}>
              {isFirst && <Text style={s.bookLeadBadge}>{copy.topBookLead}</Text>}
              <Text style={[s.bookTitle, isFirst && s.bookTitleFirst]} numberOfLines={1}>
                {book.title}
              </Text>
              <Text style={s.bookAuthor} numberOfLines={1}>
                {book.author || copy.unknownAuthor}
              </Text>
              <View style={s.bookStatsRow}>
                <Text style={[s.bookTime, isFirst ? s.bookTimeFirst : s.bookTimeDefault]}>
                  {formatTimeLocalized(book.totalTime, isZh)}
                </Text>
                <Text style={s.bookMeta}>
                  {book.pagesRead > 0 && `${book.pagesRead} ${copy.pagesReadSuffix} · `}
                  {book.sessionsCount} {copy.sessionsSuffix}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      {canExpand && (
        <TouchableOpacity
          onPress={() => setExpanded((v) => !v)}
          style={s.expandBtn}
          activeOpacity={0.6}
        >
          <Text style={s.expandBtnText}>
            {expanded
              ? isZh ? "收起" : "Show less"
              : isZh ? `查看全部 ${books.length} 本` : `Show all ${books.length} books`}
          </Text>
          {expanded
            ? <ChevronUpIcon size={14} color={withOpacity(colors.mutedForeground, 0.5)} />
            : <ChevronDownIcon size={14} color={withOpacity(colors.mutedForeground, 0.5)} />}
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Insights
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function InsightsSection({
  insights,
  copy,
}: {
  insights: StatsInsight[];
  copy: StatsCopy;
}) {
  const colors = useColors();
  const s = makeStyles(colors);

  if (insights.length === 0) {
    return (
      <Text style={{ fontSize: 13, color: withOpacity(colors.mutedForeground, 0.45), textAlign: "center", paddingVertical: 16 }}>
        {copy.noInsights}
      </Text>
    );
  }

  return (
    <View>
      {insights.map((insight) => {
        const dotStyle =
          insight.tone === "celebration" ? s.insightDotCelebration
            : insight.tone === "warning" ? s.insightDotWarning
              : insight.tone === "positive" ? s.insightDotPositive
                : s.insightDotDefault;

        return (
          <View key={insight.id} style={s.insightItem}>
            <View style={[s.insightDot, dotStyle]} />
            <View style={{ flex: 1 }}>
              <Text style={s.insightTitle}>{insight.title}</Text>
              <Text style={s.insightBody}>{insight.body}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Month Calendar
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function MonthCalendarSection({
  calendar,
  isZh,
  resolvedCovers,
}: {
  calendar: NonNullable<MonthReport["readingCalendar"]>;
  isZh: boolean;
  resolvedCovers: Map<string, string>;
}) {
  const colors = useColors();
  const s = makeStyles(colors);
  const locale = isZh ? "zh-CN" : "en-US";

  const weekLabels = useMemo(() => {
    const monday = new Date(2024, 0, 1); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
    });
  }, [locale]);

  return (
    <View style={{ gap: 4 }}>
      {/* Weekday header */}
      <View style={s.calendarRow}>
        {weekLabels.map((label) => (
          <View key={label} style={s.calendarHeaderCell}>
            <Text style={s.calendarHeaderText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Week rows */}
      {calendar.weeks.map((week, wIdx) => (
        <View key={`${calendar.monthKey}-${wIdx}`} style={s.calendarRow}>
          {week.map((cell) => (
            <CalendarDayCell key={cell.date} cell={cell} isZh={isZh} resolvedCovers={resolvedCovers} />
          ))}
        </View>
      ))}
    </View>
  );
}

function CalendarDayCell({
  cell,
  isZh,
  resolvedCovers,
}: {
  cell: StatsCalendarCell;
  isZh: boolean;
  resolvedCovers: Map<string, string>;
}) {
  const colors = useColors();
  const s = makeStyles(colors);
  const [coverIdx, setCoverIdx] = useState(0);

  const hasCovers = cell.covers.length > 0;
  const multipleCovers = cell.covers.length > 1;
  const currentCover = hasCovers ? cell.covers[coverIdx % cell.covers.length] : null;
  const currentCoverUrl = currentCover
    ? resolvedCovers.get(currentCover.bookId) || currentCover.coverUrl
    : undefined;

  const handlePress = () => {
    if (multipleCovers) {
      setCoverIdx((prev) => (prev + 1) % cell.covers.length);
    }
  };

  // Intensity-based background (only for cells without covers)
  const intensityBg =
    !cell.inCurrentMonth && cell.intensity === 0
      ? withOpacity(colors.muted, 0.15)
      : cell.intensity === 0 ? colors.card
      : cell.intensity === 1 ? withOpacity(colors.primary, 0.04)
      : cell.intensity === 2 ? withOpacity(colors.primary, 0.08)
      : cell.intensity === 3 ? withOpacity(colors.primary, 0.14)
      : withOpacity(colors.primary, 0.22);

  const intensityBorder =
    !cell.inCurrentMonth && cell.intensity === 0
      ? "transparent"
      : cell.intensity === 0 ? withOpacity(colors.border, 0.3)
      : withOpacity(colors.primary, 0.08 + cell.intensity * 0.04);

  /* ── Cell WITH cover: StatsBookCover fills entire cell ── */
  if (currentCover) {
    const inner = (
      <View style={[
        s.calCoverCell,
        cell.isToday && s.calCoverCellToday,
        { opacity: cell.inCurrentMonth ? 1 : 0.55 },
      ]}>
        {/* Cover — using shared library-style component */}
        {currentCoverUrl ? (
          <Image source={{ uri: currentCoverUrl }} style={s.calCoverImage} resizeMode="cover" />
        ) : (
          <View style={s.calCoverFallback}>
            <Text style={s.calCoverFallbackText}>{currentCover.title.slice(0, 4)}</Text>
          </View>
        )}

        {/* Spine overlay */}
        <View style={s.calSpineOverlay}>
          <View style={{ width: "6%",  height: "100%", backgroundColor: "rgba(0,0,0,0.10)" }} />
          <View style={{ width: "8%",  height: "100%", backgroundColor: "rgba(20,20,20,0.20)" }} />
          <View style={{ width: "5%",  height: "100%", backgroundColor: "rgba(240,240,240,0.40)" }} />
          <View style={{ width: "18%", height: "100%", backgroundColor: "rgba(215,215,215,0.35)" }} />
          <View style={{ width: "12%", height: "100%", backgroundColor: "rgba(150,150,150,0.25)" }} />
          <View style={{ width: "20%", height: "100%", backgroundColor: "rgba(100,100,100,0.18)" }} />
          <View style={{ width: "31%", height: "100%", backgroundColor: "rgba(175,175,175,0.12)" }} />
        </View>

        {/* Top scrim — gradient for date readability */}
        <View style={s.calCoverTopScrim} />

        {/* Bottom scrim — gradient for page badge readability */}
        <View style={s.calCoverBottomScrim} />

        {/* Overlaid info */}
        <View style={s.calCoverOverlay}>
          <View style={s.calCoverTopRow}>
            <Text style={s.calCoverDay}>{cell.dayOfMonth}</Text>
            {cell.totalTime > 0 && (
              <Text style={s.calCoverTime}>{formatCompactMinutes(cell.totalTime, isZh)}</Text>
            )}
          </View>
          {multipleCovers && (
            <View style={s.calCoverPageBadge}>
              <Text style={s.calCoverPageText}>
                {(coverIdx % cell.covers.length) + 1}/{cell.covers.length}
              </Text>
            </View>
          )}
        </View>
      </View>
    );

    if (multipleCovers) {
      return (
        <TouchableOpacity activeOpacity={0.8} onPress={handlePress} style={{ flex: 1 }}>
          {inner}
        </TouchableOpacity>
      );
    }
    return <View style={{ flex: 1 }}>{inner}</View>;
  }

  /* ── Cell WITHOUT cover: plain intensity cell ── */
  return (
    <View style={{ flex: 1 }}>
      <View
        style={[
          s.calPlainCell,
          {
            backgroundColor: intensityBg,
            borderColor: intensityBorder,
            opacity: cell.inCurrentMonth ? 1 : 0.55,
          },
          cell.isToday && s.calPlainCellToday,
        ]}
      >
        <Text
          style={[
            s.calPlainDay,
            cell.isToday && { color: withOpacity(colors.primary, 0.7) },
            !cell.inCurrentMonth && { color: withOpacity(colors.mutedForeground, 0.25) },
          ]}
        >
          {cell.dayOfMonth}
        </Text>
        {cell.totalTime > 0 && (
          <Text style={s.calPlainTime}>{formatCompactMinutes(cell.totalTime, isZh)}</Text>
        )}
      </View>
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Rhythm Profile (Year / Lifetime)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function RhythmProfileSection({
  timeOfDayChart,
  categoryChart,
  isZh,
  copy,
}: {
  timeOfDayChart?: StatsChartBlock;
  categoryChart?: StatsChartBlock;
  isZh: boolean;
  copy: StatsCopy;
}) {
  const colors = useColors();
  const s = makeStyles(colors);

  return (
    <View style={{ gap: 24 }}>
      {/* Time of day bar chart */}
      {timeOfDayChart && (
        <View style={{ gap: 8 }}>
          <Text style={s.rhythmSubTitle}>{copy.timeOfDay}</Text>
          <Text style={s.rhythmSubDesc}>{copy.timeOfDayDesc}</Text>
          <BarChart
            data={timeOfDayChart.data.map((item) => ({
              label: localizeSemanticLabel(item.key, item.label, copy.timeOfDayLabels, copy.uncategorized),
              value: item.value,
            }))}
          />
        </View>
      )}

      {/* Category distribution as horizontal progress bars */}
      {categoryChart && (
        <View style={{ gap: 8 }}>
          <Text style={s.rhythmSubTitle}>{copy.categoryDistribution}</Text>
          <Text style={s.rhythmSubDesc}>{copy.categoryDistributionDesc}</Text>
          <CategoryDistributionList chart={categoryChart} isZh={isZh} copy={copy} />
        </View>
      )}
    </View>
  );
}

function CategoryDistributionList({
  chart,
  isZh,
  copy,
}: {
  chart: StatsChartBlock;
  isZh: boolean;
  copy: StatsCopy;
}) {
  const colors = useColors();
  const s = makeStyles(colors);
  const maxValue = Math.max(...chart.data.map((item) => item.value), 1);

  return (
    <View style={{ gap: 12 }}>
      {chart.data.map((item, index) => {
        const label = localizeSemanticLabel(item.key, item.label, copy.timeOfDayLabels, copy.uncategorized);
        const pct = Math.max(10, (item.value / maxValue) * 100);

        return (
          <View key={`${item.key}-${index}`} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              <Text style={s.categoryLabel}>{label}</Text>
              <Text style={s.categoryValue}>{formatCompactMinutes(item.value, isZh)}</Text>
            </View>
            <View style={s.categoryTrack}>
              <View style={[s.categoryFill, { width: `${pct}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Yearly Snapshots (Lifetime) — flat rows
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function YearlySnapshotsSection({
  snapshots,
  isZh,
  copy,
}: {
  snapshots: Extract<StatsReport, { dimension: "lifetime" }>["yearlySnapshots"];
  isZh: boolean;
  copy: StatsCopy;
}) {
  const colors = useColors();
  const s = makeStyles(colors);

  return (
    <View>
      {snapshots.map((snapshot, index) => (
        <View
          key={snapshot.year}
          style={[
            s.snapshotRow,
            index > 0 && s.snapshotRowBorder,
          ]}
        >
          {/* Year */}
          <Text style={s.snapshotYear}>{snapshot.year}</Text>

          {/* Top book cover — library style */}
          {snapshot.topBook ? (
            <StatsBookCover
              coverUrl={snapshot.topBook.coverUrl}
              title={snapshot.topBook.title}
              width={28}
            />
          ) : (
            <View style={{ width: 28 }} />
          )}

          {/* Stats */}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.snapshotTime}>
              {formatCompactMinutes(snapshot.totalReadingTime, isZh)}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Text style={s.snapshotMeta}>
                {snapshot.booksTouched} {copy.books}
              </Text>
              <Text style={s.snapshotMeta}>
                {snapshot.activeDays} {copy.activeDays}
              </Text>
              {snapshot.topBook && (
                <Text style={s.snapshotTopBookTitle} numberOfLines={1}>
                  {snapshot.topBook.title}
                </Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Journey Summary (Lifetime)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function JourneySummaryPanel({
  report,
  isZh,
  copy,
}: {
  report: Extract<StatsReport, { dimension: "lifetime" }>;
  isZh: boolean;
  copy: StatsCopy;
}) {
  const colors = useColors();
  const s = makeStyles(colors);

  return (
    <View style={{ gap: 16 }}>
      {/* Hero big number */}
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <Text style={s.journeyBigNumber}>
            {report.context.daysSinceJoined.toLocaleString()}
          </Text>
          <Text style={s.journeyBigSuffix}>{copy.daysSuffix}</Text>
        </View>
        <Text style={s.journeyNarrative}>
          {copy.journeyNarrative(report.context.daysSinceJoined)}
        </Text>
      </View>

      {/* Start date */}
      <Text style={s.journeyStartDate}>
        {copy.startedOn} {formatDateLabel(report.context.joinedSince, isZh)}
      </Text>

      {/* Metric row */}
      <View style={s.journeyMetricsRow}>
        <View style={{ gap: 2 }}>
          <Text style={s.journeyMetricLabel}>{copy.activeReadingDays}</Text>
          <Text style={s.journeyMetricValue}>
            {report.context.totalActiveDays.toLocaleString()} {copy.daysSuffix}
          </Text>
        </View>
        <View style={{ gap: 2 }}>
          <Text style={s.journeyMetricLabel}>{copy.inactiveReadingDays}</Text>
          <Text style={s.journeyMetricValue}>
            {report.context.totalInactiveDays.toLocaleString()} {copy.daysSuffix}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Section card wrapper
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function SectionCard({
  title,
  description,
  featured,
  children,
}: {
  title: string;
  description?: string;
  featured?: boolean;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const s = makeStyles(colors);

  return (
    <View style={[s.sectionCard, featured && s.sectionFeatured]}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{title}</Text>
        {description && <Text style={s.sectionDesc}>{description}</Text>}
      </View>
      {children}
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Metric tile
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function MetricTile({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  const colors = useColors();
  const s = makeStyles(colors);

  return (
    <View style={s.metricTile}>
      <Text style={s.metricLabel} numberOfLines={1}>{label}</Text>
      <Text style={s.metricValue} numberOfLines={1}>{value}</Text>
      {sublabel && <Text style={s.metricSub} numberOfLines={1}>{sublabel}</Text>}
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Empty state
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  const colors = useColors();
  const s = makeStyles(colors);

  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyIcon}>{icon}</View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyDesc}>{description}</Text>
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Shared BookCover — library-style with spine + highlights
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function StatsBookCover({
  coverUrl,
  title,
  width: w,
}: {
  coverUrl?: string;
  title: string;
  width: number;
}) {
  const colors = useColors();
  const h = w * (41 / 28);

  return (
    <View style={{
      width: w,
      height: h,
      borderRadius: 4,
      overflow: "hidden",
      position: "relative",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    }}>
      {/* Cover image or fallback */}
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={{ width: "100%", height: "100%", borderRadius: 4 }} resizeMode="cover" />
      ) : (
        <View style={{
          width: "100%", height: "100%", borderRadius: 4,
          backgroundColor: withOpacity(colors.muted, 0.5),
          alignItems: "center", justifyContent: "center", paddingHorizontal: 2,
        }}>
          <Text style={{
            fontSize: Math.max(8, w * 0.2),
            fontWeight: "600",
            color: withOpacity(colors.mutedForeground, 0.4),
            textAlign: "center",
          }}>
            {title.slice(0, 3)}
          </Text>
        </View>
      )}

      {/* Spine overlay — 7 strips matching library BookCard */}
      <View style={{
        position: "absolute", top: 0, left: 0, bottom: 0,
        width: "8%", flexDirection: "row", zIndex: 2,
      }}>
        <View style={{ width: "6%",  height: "100%", backgroundColor: "rgba(0,0,0,0.10)" }} />
        <View style={{ width: "8%",  height: "100%", backgroundColor: "rgba(20,20,20,0.20)" }} />
        <View style={{ width: "5%",  height: "100%", backgroundColor: "rgba(240,240,240,0.40)" }} />
        <View style={{ width: "18%", height: "100%", backgroundColor: "rgba(215,215,215,0.35)" }} />
        <View style={{ width: "12%", height: "100%", backgroundColor: "rgba(150,150,150,0.25)" }} />
        <View style={{ width: "20%", height: "100%", backgroundColor: "rgba(100,100,100,0.18)" }} />
        <View style={{ width: "31%", height: "100%", backgroundColor: "rgba(175,175,175,0.12)" }} />
      </View>

      {/* Top highlight */}
      <View style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: "3%", backgroundColor: "rgba(240,240,240,0.15)", zIndex: 3,
      }} />

      {/* Bottom shadow */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: "8%", backgroundColor: "rgba(15,15,15,0.15)", zIndex: 3,
      }} />
    </View>
  );
}
