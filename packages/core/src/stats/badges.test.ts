import { describe, expect, it } from "vitest";
import type { DailyReadingFact, StatsSummary } from "./schema";
import { evaluateBadges } from "./badges";

/* ─── Helpers ─── */

function makeSummary(overrides: Partial<StatsSummary> = {}): StatsSummary {
  return {
    totalReadingTime: 0,
    totalSessions: 0,
    totalPagesRead: 0,
    activeDays: 0,
    booksTouched: 0,
    completedBooks: 0,
    avgSessionTime: 0,
    avgActiveDayTime: 0,
    longestSessionTime: 0,
    currentStreak: 0,
    longestStreak: 0,
    ...overrides,
  };
}

function makeFact(overrides: Partial<DailyReadingFact> = {}): DailyReadingFact {
  return {
    date: "2026-04-13",
    weekKey: "2026-W16",
    monthKey: "2026-04",
    yearKey: "2026",
    totalTime: 30,
    pagesRead: 0,
    sessionsCount: 1,
    booksTouched: 1,
    completedBooks: 0,
    avgSessionTime: 30,
    longestSessionTime: 30,
    hourlyDistribution: Array.from({ length: 24 }, () => 0),
    bookBreakdown: [],
    ...overrides,
  };
}

/* ─── Tests ─── */

describe("evaluateBadges", () => {
  describe("streak badges", () => {
    it("earns streak-7 when longestStreak >= 7", () => {
      const badges = evaluateBadges([], makeSummary({ longestStreak: 7 }));
      expect(badges.some((b) => b.id === "streak-7")).toBe(true);
    });

    it("does not earn streak-7 when longestStreak < 7", () => {
      const badges = evaluateBadges([], makeSummary({ longestStreak: 6 }));
      expect(badges.some((b) => b.id === "streak-7")).toBe(false);
    });

    it("earns streak-30 when longestStreak >= 30", () => {
      const badges = evaluateBadges([], makeSummary({ longestStreak: 30 }));
      expect(badges.some((b) => b.id === "streak-30")).toBe(true);
    });

    it("earns streak-100 when longestStreak >= 100", () => {
      const badges = evaluateBadges([], makeSummary({ longestStreak: 100 }));
      expect(badges.some((b) => b.id === "streak-100")).toBe(true);
    });
  });

  describe("volume badges", () => {
    it("earns books-10 at 10 books", () => {
      const badges = evaluateBadges([], makeSummary({ booksTouched: 10 }));
      expect(badges.some((b) => b.id === "books-10")).toBe(true);
    });

    it("does not earn books-10 at 9 books", () => {
      const badges = evaluateBadges([], makeSummary({ booksTouched: 9 }));
      expect(badges.some((b) => b.id === "books-10")).toBe(false);
    });

    it("earns books-50 at 50 books", () => {
      const badges = evaluateBadges([], makeSummary({ booksTouched: 50 }));
      expect(badges.some((b) => b.id === "books-50")).toBe(true);
    });

    it("earns books-100 at 100 books", () => {
      const badges = evaluateBadges([], makeSummary({ booksTouched: 100 }));
      expect(badges.some((b) => b.id === "books-100")).toBe(true);
    });
  });

  describe("time badges", () => {
    it("earns time-100h at 6000 minutes (100h)", () => {
      const badges = evaluateBadges([], makeSummary({ totalReadingTime: 6000 }));
      expect(badges.some((b) => b.id === "time-100h")).toBe(true);
    });

    it("does not earn time-100h at 5999 minutes", () => {
      const badges = evaluateBadges([], makeSummary({ totalReadingTime: 5999 }));
      expect(badges.some((b) => b.id === "time-100h")).toBe(false);
    });

    it("earns time-500h at 30000 minutes", () => {
      const badges = evaluateBadges([], makeSummary({ totalReadingTime: 30000 }));
      expect(badges.some((b) => b.id === "time-500h")).toBe(true);
    });

    it("earns time-1000h at 60000 minutes", () => {
      const badges = evaluateBadges([], makeSummary({ totalReadingTime: 60000 }));
      expect(badges.some((b) => b.id === "time-1000h")).toBe(true);
    });
  });

  describe("session badges", () => {
    it("earns deep-focus at 90 min longest session", () => {
      const badges = evaluateBadges([], makeSummary({ longestSessionTime: 90 }));
      expect(badges.some((b) => b.id === "deep-focus")).toBe(true);
    });

    it("earns marathon at 180 min longest session", () => {
      const badges = evaluateBadges([], makeSummary({ longestSessionTime: 180 }));
      expect(badges.some((b) => b.id === "marathon")).toBe(true);
    });

    it("does not earn deep-focus at 89 min", () => {
      const badges = evaluateBadges([], makeSummary({ longestSessionTime: 89 }));
      expect(badges.some((b) => b.id === "deep-focus")).toBe(false);
    });
  });

  describe("habit badges", () => {
    it("earns night-owl when >50% reading after 22:00", () => {
      const nightFact = makeFact({
        totalTime: 120,
        hourlyDistribution: Array.from({ length: 24 }, (_, h) => (h === 23 ? 100 : h === 10 ? 20 : 0)),
      });
      const badges = evaluateBadges([nightFact], makeSummary());
      expect(badges.some((b) => b.id === "night-owl")).toBe(true);
    });

    it("does not earn night-owl when mostly daytime reading", () => {
      const dayFact = makeFact({
        totalTime: 120,
        hourlyDistribution: Array.from({ length: 24 }, (_, h) => (h === 10 ? 100 : h === 23 ? 10 : 0)),
      });
      const badges = evaluateBadges([dayFact], makeSummary());
      expect(badges.some((b) => b.id === "night-owl")).toBe(false);
    });

    it("earns early-bird when >50% reading before 8:00", () => {
      const morningFact = makeFact({
        totalTime: 120,
        hourlyDistribution: Array.from({ length: 24 }, (_, h) => (h === 6 ? 100 : h === 15 ? 20 : 0)),
      });
      const badges = evaluateBadges([morningFact], makeSummary());
      expect(badges.some((b) => b.id === "early-bird")).toBe(true);
    });

    it("earns weekend-warrior when >70% reading days are weekends", () => {
      // 2026-04-11 = Saturday, 2026-04-12 = Sunday, 2026-04-18 = Saturday, 2026-04-19 = Sunday
      const weekendFacts = [
        makeFact({ date: "2026-04-11", totalTime: 60 }),
        makeFact({ date: "2026-04-12", totalTime: 60 }),
        makeFact({ date: "2026-04-18", totalTime: 60 }),
        makeFact({ date: "2026-04-19", totalTime: 60 }),
        makeFact({ date: "2026-04-13", totalTime: 10 }), // Monday — 1 weekday out of 5
      ];
      const badges = evaluateBadges(weekendFacts, makeSummary());
      expect(badges.some((b) => b.id === "weekend-warrior")).toBe(true);
    });

    it("earns bookworm when 28+ consecutive reading days", () => {
      const facts: DailyReadingFact[] = [];
      for (let d = 1; d <= 30; d++) {
        const dd = String(d).padStart(2, "0");
        facts.push(makeFact({ date: `2026-04-${dd}`, totalTime: 30 }));
      }
      const badges = evaluateBadges(facts, makeSummary());
      expect(badges.some((b) => b.id === "bookworm")).toBe(true);
    });

    it("does not earn bookworm with only 20 consecutive days", () => {
      const facts: DailyReadingFact[] = [];
      for (let d = 1; d <= 20; d++) {
        const dd = String(d).padStart(2, "0");
        facts.push(makeFact({ date: `2026-04-${dd}`, totalTime: 30 }));
      }
      const badges = evaluateBadges(facts, makeSummary());
      expect(badges.some((b) => b.id === "bookworm")).toBe(false);
    });
  });

  describe("multiple badges at once", () => {
    it("earns multiple badges when conditions overlap", () => {
      const badges = evaluateBadges([], makeSummary({
        longestStreak: 30,
        booksTouched: 50,
        totalReadingTime: 6000,
        longestSessionTime: 90,
      }));
      const ids = badges.map((b) => b.id);
      expect(ids).toContain("streak-7");
      expect(ids).toContain("streak-30");
      expect(ids).toContain("books-10");
      expect(ids).toContain("books-50");
      expect(ids).toContain("time-100h");
      expect(ids).toContain("deep-focus");
    });
  });

  describe("badge structure", () => {
    it("returns correct EarnedBadge shape", () => {
      const badges = evaluateBadges([], makeSummary({ longestStreak: 7 }));
      const badge = badges.find((b) => b.id === "streak-7");
      expect(badge).toBeDefined();
      expect(badge!.tier).toBe("bronze");
      expect(badge!.category).toBe("streak");
      expect(badge!.icon).toBe("flame");
      expect(badge!.titleKey).toBe("stats.desktop.badge_streak-7_title");
      expect(badge!.descKey).toBe("stats.desktop.badge_streak-7_desc");
    });
  });
});
