/**
 * BadgesPreview.tsx — Compact badge summary for mobile Stats screen.
 * Horizontal scroll of earned badges with rich icon rendering + "查看全部 >" link.
 */
import { useColors, withOpacity } from "@/styles/theme";
import { ChevronRightIcon } from "@/components/ui/Icon";
import type { EarnedBadge } from "@readany/core/stats";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { BadgeIconMobile } from "./BadgeIconMobile";

export function BadgesPreview({
  earned,
  t,
  onViewAll,
}: {
  earned: EarnedBadge[];
  t: (key: string, opts?: Record<string, unknown>) => string;
  onViewAll: () => void;
}) {
  const colors = useColors();

  if (earned.length === 0) {
    return (
      <Text style={{ fontSize: 13, color: withOpacity(colors.mutedForeground, 0.4), paddingVertical: 6, textAlign: "center" }}>
        {t("stats.desktop.noBadges")}
      </Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 13, fontWeight: "500", color: withOpacity(colors.foreground, 0.6) }}>
          {t("stats.desktop.badgesEarnedCount", { count: earned.length })}
        </Text>
        <TouchableOpacity
          onPress={onViewAll}
          style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
          activeOpacity={0.6}
        >
          <Text style={{ fontSize: 12, fontWeight: "500", color: withOpacity(colors.primary, 0.6) }}>
            {t("stats.desktop.viewAllBadges")}
          </Text>
          <ChevronRightIcon size={14} color={withOpacity(colors.primary, 0.6)} />
        </TouchableOpacity>
      </View>

      {/* Horizontal badge scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
        {earned.slice(0, 6).map((badge) => (
          <TouchableOpacity
            key={badge.id}
            onPress={onViewAll}
            activeOpacity={0.7}
            style={{ alignItems: "center", gap: 4, width: 68 }}
          >
            <BadgeIconMobile badge={badge} isEarned size={56} />
            <Text
              style={{ fontSize: 9, fontWeight: "600", color: withOpacity(colors.foreground, 0.55), textAlign: "center" }}
              numberOfLines={1}
            >
              {t(`stats.desktop.badge_${badge.id}_title`)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
