/**
 * badges.ts — Achievement badge definitions and evaluator.
 *
 * Stateless: badges are recalculated from DailyReadingFact[] every time,
 * following the same pattern as buildInsights(). No persistence needed.
 */
import type { DailyReadingFact, StatsSummary } from "./schema";

/* ─── Types ─── */

export type BadgeTier = "bronze" | "silver" | "gold";
export type BadgeCategory = "streak" | "volume" | "habit" | "time" | "session";

export interface BadgeDefinition {
  id: string;
  icon: string; // lucide icon name for desktop, mapped to RN icon on mobile
  tier: BadgeTier;
  colorScheme: string; // "amber" | "blue" | "emerald" | "purple" | "rose"
  category: BadgeCategory;
}

export interface EarnedBadge extends BadgeDefinition {
  earnedAt: string; // ISO date string or "lifetime"
  titleKey: string; // i18n key
  descKey: string; // i18n key
}

/* ─── Badge catalog ─── */

const BADGE_DEFS: {
  id: string;
  icon: string;
  tier: BadgeTier;
  colorScheme: string;
  category: BadgeCategory;
  check: (facts: DailyReadingFact[], summary: StatsSummary) => boolean;
}[] = [
  // ── Streak badges ──
  {
    id: "streak-7",
    icon: "flame",
    tier: "bronze",
    colorScheme: "amber",
    category: "streak",
    check: (_, s) => s.longestStreak >= 7,
  },
  {
    id: "streak-30",
    icon: "flame",
    tier: "silver",
    colorScheme: "amber",
    category: "streak",
    check: (_, s) => s.longestStreak >= 30,
  },
  {
    id: "streak-100",
    icon: "flame",
    tier: "gold",
    colorScheme: "amber",
    category: "streak",
    check: (_, s) => s.longestStreak >= 100,
  },

  // ── Volume badges (books touched) ──
  {
    id: "books-10",
    icon: "library",
    tier: "bronze",
    colorScheme: "blue",
    category: "volume",
    check: (_, s) => s.booksTouched >= 10,
  },
  {
    id: "books-50",
    icon: "library",
    tier: "silver",
    colorScheme: "blue",
    category: "volume",
    check: (_, s) => s.booksTouched >= 50,
  },
  {
    id: "books-100",
    icon: "library",
    tier: "gold",
    colorScheme: "blue",
    category: "volume",
    check: (_, s) => s.booksTouched >= 100,
  },

  // ── Total time badges ──
  {
    id: "time-100h",
    icon: "clock",
    tier: "bronze",
    colorScheme: "emerald",
    category: "time",
    check: (_, s) => s.totalReadingTime >= 6000, // 100h
  },
  {
    id: "time-500h",
    icon: "clock",
    tier: "silver",
    colorScheme: "emerald",
    category: "time",
    check: (_, s) => s.totalReadingTime >= 30000, // 500h
  },
  {
    id: "time-1000h",
    icon: "clock",
    tier: "gold",
    colorScheme: "emerald",
    category: "time",
    check: (_, s) => s.totalReadingTime >= 60000, // 1000h
  },

  // ── Session badges ──
  {
    id: "marathon",
    icon: "trophy",
    tier: "gold",
    colorScheme: "purple",
    category: "session",
    check: (_, s) => s.longestSessionTime >= 180, // 3h
  },
  {
    id: "deep-focus",
    icon: "brain",
    tier: "silver",
    colorScheme: "purple",
    category: "session",
    check: (_, s) => s.longestSessionTime >= 90, // 1.5h
  },

  // ── Habit badges ──
  {
    id: "night-owl",
    icon: "moon",
    tier: "silver",
    colorScheme: "purple",
    category: "habit",
    check: (facts) => {
      let nightTime = 0;
      let totalTime = 0;
      for (const f of facts) {
        if (!f.hourlyDistribution) continue;
        for (let h = 0; h < 24; h++) {
          const t = f.hourlyDistribution[h] ?? 0;
          totalTime += t;
          if (h >= 22 || h < 4) nightTime += t;
        }
      }
      return totalTime > 60 && nightTime / totalTime > 0.5;
    },
  },
  {
    id: "early-bird",
    icon: "sunrise",
    tier: "silver",
    colorScheme: "amber",
    category: "habit",
    check: (facts) => {
      let morningTime = 0;
      let totalTime = 0;
      for (const f of facts) {
        if (!f.hourlyDistribution) continue;
        for (let h = 0; h < 24; h++) {
          const t = f.hourlyDistribution[h] ?? 0;
          totalTime += t;
          if (h >= 4 && h < 8) morningTime += t;
        }
      }
      return totalTime > 60 && morningTime / totalTime > 0.5;
    },
  },
  {
    id: "weekend-warrior",
    icon: "swords",
    tier: "bronze",
    colorScheme: "rose",
    category: "habit",
    check: (facts) => {
      let weekendDays = 0;
      let totalDays = 0;
      for (const f of facts) {
        if (f.totalTime <= 0) continue;
        totalDays++;
        const d = new Date(f.date.replace(/-/g, "/"));
        const dow = d.getDay();
        if (dow === 0 || dow === 6) weekendDays++;
      }
      return totalDays >= 4 && weekendDays / totalDays > 0.7;
    },
  },
  {
    id: "bookworm",
    icon: "book-open",
    tier: "gold",
    colorScheme: "emerald",
    category: "habit",
    check: (facts) => {
      if (facts.length < 28) return false;
      const activeDates = new Set(
        facts.filter((f) => f.totalTime > 0).map((f) => f.date),
      );
      const sorted = [...activeDates].sort();
      let consecutive = 1;
      let maxConsecutive = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].replace(/-/g, "/"));
        const curr = new Date(sorted[i].replace(/-/g, "/"));
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          consecutive++;
          maxConsecutive = Math.max(maxConsecutive, consecutive);
        } else {
          consecutive = 1;
        }
      }
      return maxConsecutive >= 28;
    },
  },
];

/* ─── All badge IDs (for showing unearned) ─── */

export const ALL_BADGE_DEFINITIONS: BadgeDefinition[] = BADGE_DEFS.map(
  ({ id, icon, tier, colorScheme, category }) => ({ id, icon, tier, colorScheme, category }),
);

/* ─── Evaluator ─── */

export function evaluateBadges(
  facts: DailyReadingFact[],
  summary: StatsSummary,
): EarnedBadge[] {
  const earned: EarnedBadge[] = [];

  for (const def of BADGE_DEFS) {
    if (def.check(facts, summary)) {
      earned.push({
        id: def.id,
        icon: def.icon,
        tier: def.tier,
        colorScheme: def.colorScheme,
        category: def.category,
        earnedAt: "lifetime",
        titleKey: `stats.desktop.badge_${def.id}_title`,
        descKey: `stats.desktop.badge_${def.id}_desc`,
      });
    }
  }

  return earned;
}

/* ─── Badge display number (shown on badge face) ─── */

export const BADGE_NUMBERS: Record<string, string> = {
  "streak-7": "7",
  "streak-30": "30",
  "streak-100": "100",
  "books-10": "10",
  "books-50": "50",
  "books-100": "100",
  "time-100h": "100",
  "time-500h": "500",
  "time-1000h": "1K",
  marathon: "3h",
  "deep-focus": "90",
  "night-owl": "",
  "early-bird": "",
  "weekend-warrior": "",
  bookworm: "28",
};

/* ─── Category grouping ─── */

export const BADGE_CATEGORIES: { key: BadgeCategory; titleKey: string }[] = [
  { key: "streak", titleKey: "stats.desktop.badgeCategoryStreak" },
  { key: "volume", titleKey: "stats.desktop.badgeCategoryVolume" },
  { key: "time", titleKey: "stats.desktop.badgeCategoryTime" },
  { key: "session", titleKey: "stats.desktop.badgeCategorySession" },
  { key: "habit", titleKey: "stats.desktop.badgeCategoryHabit" },
];

export function groupBadgesByCategory(badges: BadgeDefinition[]): Map<BadgeCategory, BadgeDefinition[]> {
  const map = new Map<BadgeCategory, BadgeDefinition[]>();
  for (const b of badges) {
    const list = map.get(b.category) ?? [];
    list.push(b);
    map.set(b.category, list);
  }
  return map;
}
