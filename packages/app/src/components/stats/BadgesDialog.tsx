/**
 * BadgesDialog.tsx — Full badges dialog for desktop.
 * Groups by category. Click badge → nested centered detail dialog with spin animation.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { BadgeDefinition, EarnedBadge } from "@readany/core/stats";
import { BADGE_CATEGORIES, groupBadgesByCategory } from "@readany/core/stats";
import { cn } from "@readany/core/utils";
import { Trophy } from "lucide-react";
import { useState } from "react";
import { BadgeIcon } from "./BadgeIcon";

export function BadgesDialog({
  open,
  onOpenChange,
  earned,
  allBadges,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  earned: EarnedBadge[];
  allBadges: BadgeDefinition[];
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const earnedIds = new Set(earned.map((b) => b.id));
  const grouped = groupBadgesByCategory(allBadges);
  const [detailBadge, setDetailBadge] = useState<BadgeDefinition | null>(null);

  return (
    <>
      {/* Main badges grid dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b border-border/20">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50">
                <Trophy className="h-6 w-6 text-amber-600/70" />
              </div>
              <div>
                <DialogTitle className="text-xl">{t("stats.desktop.myBadges")}</DialogTitle>
                <DialogDescription>
                  {t("stats.desktop.myBadgesDesc")} · {t("stats.desktop.badgesEarnedCount", { count: earned.length })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 -mx-6 px-6 space-y-8 pb-6 pt-2">
            {BADGE_CATEGORIES.map(({ key, titleKey }) => {
              const badges = grouped.get(key);
              if (!badges || badges.length === 0) return null;

              return (
                <div key={key}>
                  <h3 className="mb-4 text-[14px] font-semibold text-foreground/80">
                    {t(titleKey)}
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {badges.map((badge) => {
                      const isEarned = earnedIds.has(badge.id);
                      return (
                        <button
                          key={badge.id}
                          onClick={() => setDetailBadge(badge)}
                          className="flex flex-col items-center gap-2 rounded-2xl py-4 px-2 transition-all duration-200 hover:bg-muted/10 active:scale-95"
                        >
                          <BadgeIcon badge={badge} isEarned={isEarned} size={80} />
                          <span className={cn(
                            "text-center text-[12px] font-semibold leading-tight",
                            isEarned ? "text-foreground/70" : "text-muted-foreground/25",
                          )}>
                            {t(`stats.desktop.badge_${badge.id}_title`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Badge detail dialog — centered, no layout disruption */}
      <Dialog open={!!detailBadge} onOpenChange={(v) => !v && setDetailBadge(null)}>
        <DialogContent className="max-w-sm">
          {detailBadge && (
            <BadgeDetailContent
              badge={detailBadge}
              isEarned={earnedIds.has(detailBadge.id)}
              t={t}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Badge Detail with spin animation ─── */

function BadgeDetailContent({
  badge,
  isEarned,
  t,
}: {
  badge: BadgeDefinition;
  isEarned: boolean;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      {/* Badge with CSS spin animation on mount */}
      <style>{`
        @keyframes badge-spin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .badge-spin-enter {
          animation: badge-spin 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
          perspective: 600px;
        }
      `}</style>
      <div className="badge-spin-enter">
        {/* Always show colorful (earned) version to attract user */}
        <BadgeIcon badge={badge} isEarned size={120} />
      </div>

      <div className="space-y-2 text-center">
        <h3 className="text-lg font-bold text-foreground">
          {t(`stats.desktop.badge_${badge.id}_title`)}
        </h3>
        <p className="text-[13px] leading-relaxed text-muted-foreground/55 max-w-[240px]">
          {t(`stats.desktop.badge_${badge.id}_desc`)}
        </p>
      </div>

      <span className={cn(
        "rounded-full px-5 py-1.5 text-[12px] font-semibold",
        isEarned
          ? "bg-primary/8 text-primary/70"
          : "bg-muted/20 text-muted-foreground/40",
      )}>
        {isEarned ? t("stats.desktop.badgeEarnedOn") : t("stats.desktop.badgeNotEarned")}
      </span>
    </div>
  );
}
