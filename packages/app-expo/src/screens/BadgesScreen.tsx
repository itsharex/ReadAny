/**
 * BadgesScreen.tsx — Full-screen badges page for mobile.
 * Category-grouped grid with rich badge icons + tap-for-detail bottom sheet.
 */
import { useColors, withOpacity } from "@/styles/theme";
import { radius, fontWeight } from "@/styles/theme";
import { ChevronLeftIcon, TrendingUpIcon } from "@/components/ui/Icon";
import { useReadingSessionStore } from "@/stores";
import {
  ALL_BADGE_DEFINITIONS,
  BADGE_CATEGORIES,
  buildStatsSummary,
  evaluateBadges,
  groupBadgesByCategory,
  readingReportsService,
  type BadgeDefinition,
} from "@readany/core/stats";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Easing, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BadgeIconMobile } from "./stats/BadgeIconMobile";

export default function BadgesScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const nav = useNavigation();
  const currentSession = useReadingSessionStore((s) => s.currentSession);

  const [allFacts, setAllFacts] = useState<import("@readany/core/stats").DailyReadingFact[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);

  useEffect(() => {
    readingReportsService.getAllDailyFacts(currentSession).then(setAllFacts).catch(() => {});
  }, [currentSession]);

  const earnedBadges = useMemo(() => {
    if (allFacts.length === 0) return [];
    return evaluateBadges(allFacts, buildStatsSummary(allFacts));
  }, [allFacts]);

  const earnedIds = useMemo(() => new Set(earnedBadges.map((b) => b.id)), [earnedBadges]);
  const grouped = useMemo(() => groupBadgesByCategory(ALL_BADGE_DEFINITIONS), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 12, paddingVertical: 10,
        borderBottomWidth: 0.5, borderBottomColor: withOpacity(colors.border, 0.3),
      }}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeftIcon size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "600", color: colors.foreground }}>
          {t("stats.desktop.myBadges")}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}>
        {/* Hero area with warm tint */}
        <View style={{
          alignItems: "center", marginBottom: 32, paddingVertical: 24,
          backgroundColor: withOpacity(colors.primary, 0.03),
          borderRadius: 20, marginHorizontal: 4,
        }}>
          {/* Trophy icon */}
          <View style={{
            width: 48, height: 48, borderRadius: 16,
            backgroundColor: withOpacity(colors.primary, 0.08),
            alignItems: "center", justifyContent: "center", marginBottom: 12,
          }}>
            <TrendingUpIcon size={24} color={withOpacity(colors.primary, 0.6)} />
          </View>
          <Text style={{ fontSize: 52, fontWeight: "800", letterSpacing: -2, color: withOpacity(colors.foreground, 0.85) }}>
            {earnedBadges.length}
          </Text>
          <Text style={{ fontSize: 14, color: withOpacity(colors.mutedForeground, 0.5), marginTop: 2 }}>
            {t("stats.desktop.badgesEarnedCount", { count: earnedBadges.length })}
          </Text>
          <Text style={{ fontSize: 12, color: withOpacity(colors.mutedForeground, 0.35), marginTop: 4 }}>
            {t("stats.desktop.myBadgesDesc")}
          </Text>
        </View>

        {/* Category sections */}
        {BADGE_CATEGORIES.map(({ key, titleKey }) => {
          const badges = grouped.get(key);
          if (!badges || badges.length === 0) return null;

          return (
            <View key={key} style={{
              marginBottom: 20, backgroundColor: withOpacity(colors.card, 0.8),
              borderRadius: 16, padding: 16,
              borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2),
            }}>
              <Text style={{
                fontSize: 15, fontWeight: "600",
                color: withOpacity(colors.foreground, 0.8), marginBottom: 14,
              }}>
                {t(titleKey)}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {badges.map((badge) => {
                  const isEarned = earnedIds.has(badge.id);
                  return (
                    <TouchableOpacity
                      key={badge.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedBadge(badge)}
                      style={{ width: "30%", alignItems: "center", gap: 6, paddingVertical: 10 }}
                    >
                      <BadgeIconMobile badge={badge} isEarned={isEarned} size={72} />
                      <Text
                        style={{
                          fontSize: 11, fontWeight: "600", textAlign: "center",
                          color: isEarned ? withOpacity(colors.foreground, 0.7) : withOpacity(colors.mutedForeground, 0.3),
                        }}
                        numberOfLines={2}
                      >
                        {t(`stats.desktop.badge_${badge.id}_title`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Detail bottom sheet */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          isEarned={earnedIds.has(selectedBadge.id)}
          t={t}
          colors={colors}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </SafeAreaView>
  );
}

/* ─── Badge Detail Modal — Centered with spin ─── */

function BadgeDetailModal({
  badge,
  isEarned,
  t,
  colors,
  onClose,
}: {
  badge: BadgeDefinition;
  isEarned: boolean;
  t: (key: string) => string;
  colors: any;
  onClose: () => void;
}) {
  const spinAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center", alignItems: "center",
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.card,
            borderRadius: 24,
            paddingHorizontal: 32, paddingVertical: 32,
            alignItems: "center", gap: 16,
            width: "80%", maxWidth: 320,
            shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
          }}
          onPress={() => {}}
        >
          {/* Spinning badge */}
          <Animated.View style={{ transform: [{ rotateY: spin }] }}>
            <BadgeIconMobile badge={badge} isEarned size={120} />
          </Animated.View>

          {/* Title */}
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground, marginTop: 4, textAlign: "center" }}>
            {t(`stats.desktop.badge_${badge.id}_title`)}
          </Text>

          {/* Description */}
          <Text style={{
            fontSize: 14, color: withOpacity(colors.mutedForeground, 0.6),
            textAlign: "center", lineHeight: 20,
          }}>
            {t(`stats.desktop.badge_${badge.id}_desc`)}
          </Text>

          {/* Status pill */}
          <View style={{
            paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16,
            backgroundColor: isEarned
              ? withOpacity(colors.primary, 0.08)
              : withOpacity(colors.muted, 0.2),
          }}>
            <Text style={{
              fontSize: 13, fontWeight: "600",
              color: isEarned
                ? withOpacity(colors.primary, 0.7)
                : withOpacity(colors.mutedForeground, 0.4),
            }}>
              {isEarned ? t("stats.desktop.badgeEarnedOn") : t("stats.desktop.badgeNotEarned")}
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
