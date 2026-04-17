/**
 * StatsScreen.tsx — Mobile reading statistics dashboard.
 *
 * Feature-parity with desktop ReadingStatsPanel:
 * - Dimension tabs (day/week/month/year/lifetime)
 * - Hero metric section with period navigation + narrative
 * - Day summary panel (day dimension)
 * - Chart surface (heatmap or bar)
 * - Month calendar (month dimension)
 * - Rhythm profile (year/lifetime)
 * - Yearly snapshots (lifetime)
 * - Journey summary (lifetime)
 * - Top books with expand/collapse
 * - Insights cards
 * - Milestones (lifetime)
 * - Longest streak card
 */
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FlameIcon,
  SearchIcon,
} from "@/components/ui/Icon";
import { useReadingSessionStore } from "@/stores";
import { useColors, withOpacity } from "@/styles/theme";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  fromLocalDateKey,
  readingReportsService,
  type StatsDimension,
  type StatsReport,
} from "@readany/core/stats";
import { eventBus } from "@readany/core/utils/event-bus";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useResolvedCovers } from "./notes/useResolvedCovers";
import { makeStyles } from "./stats/stats-styles";
import {
  buildHeroNarrative,
  formatDateLabel,
  formatTimeLocalized,
  localizeInsight,
} from "./stats/stats-utils";
import {
  ChartSurface,
  DaySummaryPanel,
  EmptyState,
  InsightsSection,
  JourneySummaryPanel,
  MetricTile,
  MonthCalendarSection,
  RhythmProfileSection,
  SectionCard,
  TopBooksSection,
  YearlySnapshotsSection,
} from "./stats/StatsSections";

const DIMENSIONS: StatsDimension[] = ["day", "week", "month", "year", "lifetime"];

/* ─── Helpers ─── */

function formatPeriodLabel(report: StatsReport, isZh: boolean): string {
  if (report.dimension === "day") return formatDateLabel(report.period.startDate, isZh);
  if (report.dimension === "week") {
    const start = formatDateLabel(report.period.startDate, isZh);
    const end = formatDateLabel(report.period.endDate, isZh);
    return `${start} – ${end}`;
  }
  if (report.dimension === "month") {
    const date = fromLocalDateKey(report.period.startDate);
    return new Intl.DateTimeFormat(isZh ? "zh-CN" : "en-US", { year: "numeric", month: "long" }).format(date);
  }
  if (report.dimension === "year") return report.period.key;
  return "";
}

function shiftAnchor(date: Date, dim: StatsDimension, delta: -1 | 1): Date {
  const next = new Date(date);
  if (dim === "day") next.setDate(next.getDate() + delta);
  else if (dim === "week") next.setDate(next.getDate() + delta * 7);
  else if (dim === "month") next.setMonth(next.getMonth() + delta);
  else if (dim === "year") next.setFullYear(next.getFullYear() + delta);
  return next;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function StatsScreen() {
  const colors = useColors();
  const s = makeStyles(colors);
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith("zh");
  const nav = useNavigation();
  const saveCurrentSession = useReadingSessionStore((ss) => ss.saveCurrentSession);
  const currentSession = useReadingSessionStore((ss) => ss.currentSession);

  const [dimension, setDimension] = useState<StatsDimension>("month");
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [report, setReport] = useState<StatsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedCovers = useResolvedCovers(report?.topBooks);

  // Collect all calendar covers for resolution
  const calendarCoverItems = useMemo(() => {
    if (report?.dimension !== "month" || !report.readingCalendar) return [];
    const seen = new Set<string>();
    const items: { bookId: string; coverUrl?: string }[] = [];
    for (const week of report.readingCalendar.weeks) {
      for (const cell of week) {
        for (const cover of cell.covers) {
          if (!seen.has(cover.bookId)) {
            seen.add(cover.bookId);
            items.push({ bookId: cover.bookId, coverUrl: cover.coverUrl });
          }
        }
      }
    }
    return items;
  }, [report]);
  const resolvedCalendarCovers = useResolvedCovers(calendarCoverItems);

  /* ── Data loading ── */
  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let r: StatsReport;
      if (dimension === "day") r = await readingReportsService.getDayReport(anchorDate, currentSession);
      else if (dimension === "week") r = await readingReportsService.getWeekReport(anchorDate, currentSession);
      else if (dimension === "month") r = await readingReportsService.getMonthReport(anchorDate, currentSession);
      else if (dimension === "year") r = await readingReportsService.getYearReport(anchorDate, currentSession);
      else r = await readingReportsService.getLifetimeReport(currentSession);
      setReport(r);
    } catch (err) {
      console.error("[StatsScreen] Failed to load report", err);
      setError(t("stats.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [anchorDate, currentSession, dimension, t]);

  useFocusEffect(
    useCallback(() => {
      void saveCurrentSession().finally(() => void loadReport());
    }, [saveCurrentSession, loadReport]),
  );

  useEffect(() => {
    return eventBus.on("sync:completed", () => void loadReport());
  }, [loadReport]);

  /* ── Derived ── */
  const periodLabel = useMemo(() => (report ? formatPeriodLabel(report, isZh) : ""), [report, isZh]);

  const headlineValue = useMemo(() => {
    if (!report) return "";
    if (report.dimension === "lifetime")
      return `${report.context.daysSinceJoined.toLocaleString()}${isZh ? " 天" : "d"}`;
    return formatTimeLocalized(report.summary.totalReadingTime, isZh);
  }, [report, isZh]);

  const headlineLabel = useMemo(() => {
    if (!report) return "";
    return report.dimension === "lifetime"
      ? t("stats.desktop.daysTogether")
      : t("stats.desktop.readingTime");
  }, [report, t]);

  const heroNarrative = useMemo(
    () => (report ? buildHeroNarrative(report, t, isZh) : ""),
    [report, t, isZh],
  );

  const supportMetrics = useMemo(() => {
    if (!report) return [];
    return [
      { label: t("stats.desktop.activeDays"), value: `${report.summary.activeDays}${isZh ? "天" : "d"}` },
      { label: t("stats.desktop.sessions"), value: `${report.summary.totalSessions}${isZh ? "次" : ""}` },
      { label: t("stats.desktop.books"), value: String(report.summary.booksTouched), sublabel: `${report.summary.totalPagesRead} ${t("stats.desktop.pagesReadSuffix")}` },
      { label: t("stats.desktop.streak"), value: `${report.dimension === "lifetime" ? report.summary.longestStreak : report.summary.currentStreak}${isZh ? "天" : "d"}` },
      { label: t("stats.desktop.avgActiveDay"), value: formatTimeLocalized(report.summary.avgActiveDayTime, isZh) },
    ];
  }, [report, isZh, t]);

  const localizedInsights = useMemo(
    () => report ? report.insights.map((ins) => localizeInsight(ins, report, t, isZh)) : [],
    [report, t, isZh],
  );

  const localizedMilestones = useMemo(
    () => report?.dimension === "lifetime"
      ? report.milestones.map((ins) => localizeInsight(ins, report, t, isZh))
      : [],
    [report, t, isZh],
  );

  const copy = useMemo(() => ({
    heatmapLegendLow: t("stats.desktop.heatmapLegendLow", isZh ? "少" : "Less"),
    heatmapLegendHigh: t("stats.desktop.heatmapLegendHigh", isZh ? "多" : "More"),
    activeDaysSummary: (count: number) => t("stats.desktop.activeDaysSummary", { count }),
    noDataDesc: t("stats.desktop.noDataDesc"),
    noDataTitle: t("stats.desktop.noDataTitle"),
    chartPeakLabel: (label: string, value: string) => t("stats.desktop.chartPeakLabel", { label, value }),
    topBookLead: t("stats.desktop.topBookLead"),
    noTopBooks: t("stats.desktop.noTopBooks"),
    unknownAuthor: t("stats.desktop.unknownAuthor"),
    pagesReadSuffix: t("stats.desktop.pagesReadSuffix"),
    sessionsSuffix: t("stats.desktop.sessionsSuffix"),
    noInsights: t("stats.desktop.noInsights"),
    // Day summary
    firstSession: t("stats.desktop.firstSession"),
    lastSession: t("stats.desktop.lastSession"),
    peakHour: t("stats.desktop.peakHour"),
    longestRead: t("stats.desktop.longestRead"),
    topFocus: t("stats.desktop.topFocus"),
    noDayTopBook: t("stats.desktop.noDayTopBook"),
    noTimeline: t("stats.desktop.noTimeline"),
    activeNow: t("stats.desktop.activeNow"),
    // Calendar
    readingCalendar: t("stats.desktop.readingCalendar"),
    readingCalendarDesc: t("stats.desktop.readingCalendarDesc"),
    // Rhythm
    timeOfDay: t("stats.desktop.timeOfDay"),
    timeOfDayDesc: t("stats.desktop.timeOfDayDesc"),
    categoryDistribution: t("stats.desktop.categoryDistribution"),
    categoryDistributionDesc: t("stats.desktop.categoryDistributionDesc"),
    uncategorized: t("stats.desktop.uncategorized"),
    timeOfDayLabels: {
      lateNight: t("stats.desktop.timeOfDayLabels.lateNight"),
      earlyMorning: t("stats.desktop.timeOfDayLabels.earlyMorning"),
      morning: t("stats.desktop.timeOfDayLabels.morning"),
      afternoon: t("stats.desktop.timeOfDayLabels.afternoon"),
      evening: t("stats.desktop.timeOfDayLabels.evening"),
      night: t("stats.desktop.timeOfDayLabels.night"),
    },
    // Yearly snapshots
    books: t("stats.desktop.books"),
    activeDays: t("stats.desktop.activeDays"),
    // Journey
    daysSuffix: t("stats.desktop.daysSuffix"),
    startedOn: t("stats.desktop.startedOn"),
    activeReadingDays: t("stats.desktop.activeReadingDays"),
    inactiveReadingDays: t("stats.desktop.inactiveReadingDays"),
    journeyNarrative: (days: number) => t("stats.desktop.journeyNarrative", { days }),
    // Milestones
    milestones: t("stats.desktop.milestones"),
    milestonesDesc: t("stats.desktop.milestonesDesc"),
    // Day summary
    daySummary: t("stats.desktop.daySummary"),
    daySummaryDesc: t("stats.desktop.daySummaryDesc"),
  }), [t, isZh]);

  const dimLabels: Record<StatsDimension, string> = {
    day: t("stats.desktop.dimensions.day"),
    week: t("stats.desktop.dimensions.week"),
    month: t("stats.desktop.dimensions.month"),
    year: t("stats.desktop.dimensions.year"),
    lifetime: t("stats.desktop.dimensions.lifetime"),
  };

  const primaryChart = report?.charts[0] ?? null;
  const monthlyReport = report?.dimension === "month" ? report : null;
  const yearOrLifetimeReport =
    report?.dimension === "year" || report?.dimension === "lifetime" ? report : null;

  /* ━━━━━━━━━━ Render ━━━━━━━━━━ */

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
          <ChevronLeftIcon size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("stats.title", "阅读统计")}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Dimension tabs */}
        <View style={s.dimTabs}>
          {DIMENSIONS.map((dim) => (
            <TouchableOpacity
              key={dim}
              style={[s.dimTab, dimension === dim && s.dimTabActive]}
              onPress={() => { setDimension(dim); setAnchorDate(new Date()); }}
              activeOpacity={0.7}
            >
              <Text style={[s.dimTabText, dimension === dim && s.dimTabTextActive]}>
                {dimLabels[dim]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={colors.mutedForeground} />
          </View>
        ) : error || !report ? (
          <EmptyState
            title={error ?? t("stats.desktop.noDataTitle")}
            description={t("stats.desktop.noDataDesc")}
            icon={<SearchIcon size={24} color={withOpacity(colors.mutedForeground, 0.45)} />}
          />
        ) : (
          <>
            {/* ═══ Hero Section ═══ */}
            <View style={s.heroCard}>
              {/* Period row + nav */}
              <View style={s.heroPeriodRow}>
                <View>
                  <Text style={s.heroDimLabel}>
                    {t(`stats.desktop.dimensionTitles.${dimension}`)}
                  </Text>
                  <Text style={s.heroPeriodLabel}>{periodLabel}</Text>
                </View>
                {dimension !== "lifetime" && (
                  <View style={s.heroNavRow}>
                    <TouchableOpacity
                      style={s.heroNavBtn}
                      onPress={() => setAnchorDate((p) => shiftAnchor(p, dimension, -1))}
                      disabled={!report.navigation.canGoPrev}
                    >
                      <ChevronLeftIcon size={16} color={report.navigation.canGoPrev ? colors.foreground : withOpacity(colors.mutedForeground, 0.3)} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.heroNavBtn}
                      onPress={() => setAnchorDate((p) => shiftAnchor(p, dimension, 1))}
                      disabled={!report.navigation.canGoNext}
                    >
                      <ChevronRightIcon size={16} color={report.navigation.canGoNext ? colors.foreground : withOpacity(colors.mutedForeground, 0.3)} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Headline metric */}
              <Text style={s.heroValue}>{headlineValue}</Text>
              <View style={s.heroSubRow}>
                <ClockIcon size={14} color={withOpacity(colors.primary, 0.35)} />
                <Text style={s.heroSubText}>{headlineLabel}</Text>
              </View>

              {/* Hero narrative */}
              {heroNarrative ? (
                <Text style={s.heroNarrative}>{heroNarrative}</Text>
              ) : null}

              {/* Supporting metrics grid */}
              <View style={s.metricsGrid}>
                {supportMetrics.map((m) => (
                  <MetricTile key={m.label} label={m.label} value={m.value} sublabel={m.sublabel} />
                ))}
              </View>
            </View>

            {/* ═══ Day Summary (day dimension) ═══ */}
            {report.dimension === "day" && (
              <SectionCard
                title={copy.daySummary}
                description={copy.daySummaryDesc}
              >
                <DaySummaryPanel
                  dayFact={report.dayFact}
                  topBook={report.topBooks[0]}
                  isZh={isZh}
                  copy={copy}
                />
              </SectionCard>
            )}

            {/* ═══ Primary Chart ═══ */}
            {primaryChart && (
              <SectionCard
                title={primaryChart.type === "heatmap"
                  ? t("stats.desktop.readingHeatmap")
                  : t("stats.desktop.primaryChart")}
                description={primaryChart.type === "heatmap"
                  ? t("stats.desktop.readingHeatmapDesc")
                  : t("stats.desktop.primaryChartDesc")}
              >
                <ChartSurface
                  chart={primaryChart}
                  isZh={isZh}
                  copy={copy}
                />
              </SectionCard>
            )}

            {/* ═══ Month Calendar (month dimension) ═══ */}
            {monthlyReport?.readingCalendar && (
              <SectionCard
                title={copy.readingCalendar}
                description={copy.readingCalendarDesc}
              >
                <MonthCalendarSection
                  calendar={monthlyReport.readingCalendar}
                  isZh={isZh}
                  resolvedCovers={resolvedCalendarCovers}
                />
              </SectionCard>
            )}

            {/* ═══ Rhythm Profile (year/lifetime) ═══ */}
            {yearOrLifetimeReport &&
              (yearOrLifetimeReport.timeOfDayChart || yearOrLifetimeReport.categoryDistribution) && (
              <SectionCard
                title={t("stats.desktop.rhythmProfile")}
                description={t("stats.desktop.rhythmProfileDesc")}
              >
                <RhythmProfileSection
                  timeOfDayChart={yearOrLifetimeReport.timeOfDayChart}
                  categoryChart={yearOrLifetimeReport.categoryDistribution}
                  isZh={isZh}
                  copy={copy}
                />
              </SectionCard>
            )}

            {/* ═══ Yearly Snapshots (lifetime) ═══ */}
            {report.dimension === "lifetime" && report.yearlySnapshots.length > 0 && (
              <SectionCard
                title={t("stats.desktop.annualShelf")}
                description={t("stats.desktop.annualShelfDesc")}
              >
                <YearlySnapshotsSection
                  snapshots={report.yearlySnapshots}
                  isZh={isZh}
                  copy={copy}
                />
              </SectionCard>
            )}

            {/* ═══ Journey Summary (lifetime) ═══ */}
            {report.dimension === "lifetime" && (
              <SectionCard
                title={t("stats.desktop.journey")}
                description={t("stats.desktop.journeySubtitle")}
              >
                <JourneySummaryPanel
                  report={report}
                  isZh={isZh}
                  copy={copy}
                />
              </SectionCard>
            )}

            {/* ═══ Top Books ═══ */}
            <SectionCard
              title={t("stats.desktop.topBooks")}
              description={t("stats.desktop.topBooksDesc")}
              featured
            >
              <TopBooksSection
                books={report.topBooks}
                resolvedCovers={resolvedCovers}
                isZh={isZh}
                copy={copy}
              />
            </SectionCard>

            {/* ═══ Insights ═══ */}
            {localizedInsights.length > 0 && (
              <SectionCard
                title={t("stats.desktop.insights")}
                description={t("stats.desktop.insightsDesc")}
              >
                <InsightsSection insights={localizedInsights} copy={copy} />
              </SectionCard>
            )}

            {/* ═══ Milestones (lifetime) ═══ */}
            {report.dimension === "lifetime" && localizedMilestones.length > 0 && (
              <SectionCard
                title={t("stats.desktop.milestones")}
                description={t("stats.desktop.milestonesDesc")}
              >
                <InsightsSection insights={localizedMilestones} copy={copy} />
              </SectionCard>
            )}

            {/* ═══ Longest streak ═══ */}
            {report.summary.longestStreak > 0 && (
              <View style={s.streakCard}>
                <View style={s.streakIconWrap}>
                  <FlameIcon size={16} color={colors.amber} />
                </View>
                <View style={s.streakInfo}>
                  <Text style={s.streakLabel}>
                    {t("stats.longestStreak", { days: report.summary.longestStreak })}
                  </Text>
                  <Text style={s.streakDesc}>
                    {t("stats.longestStreakDesc", "历史最长连续阅读记录")}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
