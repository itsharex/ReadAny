import {
  ChevronDownIcon,
  HeadphonesIcon,
  MinusIcon,
  PlusIcon,
  ScrollTextIcon,
  WrenchIcon,
} from "@/components/ui/Icon";
import { type ThemeColors, fontSize, fontWeight, useColors, withOpacity } from "@/styles/theme";
import {
  buildNarrationPreview,
  type TTSConfig,
  type TTSPlayState,
  getTTSVoiceLabel,
} from "@readany/core/tts";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

function PlayIcon({ size = 28, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}

function PauseIcon({ size = 24, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </Svg>
  );
}

function StopIcon({ size = 18, color = "#151515" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 6h12v12H6z" />
    </Svg>
  );
}

function ReplayIcon({ size = 20, color = "#151515" }: { size?: number; color?: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M3 2v6h6" />
      <Path d="M3 8a9 9 0 1 0 2.64-6.36L3 4" />
    </Svg>
  );
}

interface TTSPageProps {
  visible: boolean;
  bookTitle: string;
  chapterTitle: string;
  coverUri?: string;
  playState: TTSPlayState;
  currentText: string;
  config: TTSConfig;
  readingProgress: number;
  currentPage: number;
  totalPages: number;
  sourceLabel: string;
  continuousEnabled: boolean;
  onClose: () => void;
  onReplay: () => void | Promise<void>;
  onPlayPause: () => void | Promise<void>;
  onStop: () => void;
  onAdjustRate: (delta: number) => void;
  onAdjustPitch: (delta: number) => void;
  onToggleContinuous: () => void;
}

function clampProgress(progress: number) {
  return Math.max(0, Math.min(100, Math.round(progress * 100)));
}

export function TTSPage({
  visible,
  bookTitle,
  chapterTitle,
  coverUri,
  playState,
  currentText,
  config,
  readingProgress,
  currentPage,
  totalPages,
  sourceLabel,
  continuousEnabled,
  onClose,
  onReplay,
  onPlayPause,
  onStop,
  onAdjustRate,
  onAdjustPitch,
  onToggleContinuous,
}: TTSPageProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const s = makeStyles(colors);
  const [showSettings, setShowSettings] = useState(false);

  const { currentExcerpt, nextExcerpt, supportingExcerpt } = useMemo(
    () => buildNarrationPreview(currentText),
    [currentText],
  );

  const progressPct = clampProgress(readingProgress);
  const currentVoice = getTTSVoiceLabel(config);
  const stateLabel =
    playState === "loading"
      ? t("tts.loading", "加载中")
      : playState === "playing"
        ? t("tts.playing", "正在播放")
        : playState === "paused"
          ? t("tts.paused", "已暂停")
          : t("tts.stopped", "已停止");

  const pageProgressLabel =
    currentPage > 0 && totalPages > 0
      ? t("tts.pageProgress", "第 {{current}} / {{total}} 页", {
          current: currentPage,
          total: totalPages,
        })
      : t("tts.readingProgress", "阅读进度 {{progress}}%", { progress: progressPct });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={s.container}>
        <TouchableOpacity style={s.closeButton} onPress={onClose} activeOpacity={0.82}>
          <ChevronDownIcon size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={s.statusChip}>
          <HeadphonesIcon size={14} color={colors.primary} />
          <Text style={s.statusChipText}>{stateLabel}</Text>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.hero}>
            <View style={s.coverCard}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={s.coverImage} resizeMode="cover" />
              ) : (
                <View style={s.coverFallback}>
                  <Text style={s.coverFallbackEyebrow}>ReadAny</Text>
                  <Text style={s.coverFallbackTitle}>
                    {bookTitle || t("reader.untitled", "未命名")}
                  </Text>
                </View>
              )}
            </View>

            <View style={s.titleBlock}>
              <Text style={s.bookTitle}>{bookTitle || t("reader.untitled", "未命名")}</Text>
              <Text style={s.chapterTitle}>
                {chapterTitle || t("tts.fromCurrentPage", "从当前页开始")}
              </Text>
              <Text style={s.sourceText}>{sourceLabel}</Text>
            </View>

            <View style={s.metaRow}>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>{t("tts.voice", "语音")}</Text>
                <Text style={s.metaValue}>{currentVoice}</Text>
              </View>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>{t("tts.rate", "语速")}</Text>
                <Text style={s.metaValue}>{config.rate.toFixed(1)}x</Text>
              </View>
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>{t("tts.ttsEngine", "朗读引擎")}</Text>
                <Text style={s.metaValue}>
                  {config.engine === "edge"
                    ? "Edge"
                    : config.engine === "dashscope"
                      ? "DashScope"
                      : t("tts.browser", "系统语音")}
                </Text>
              </View>
            </View>
          </View>

          <View style={s.excerptCard}>
            <Text style={s.sectionEyebrow}>{t("tts.currentExcerpt", "当前朗读片段")}</Text>
            <Text style={s.excerptText}>
              {currentExcerpt || t("tts.waitingText", "开始播放后，会在这里显示正在朗读的片段。")}
            </Text>
            <Text style={s.excerptSubtext}>
              {supportingExcerpt || t("tts.keepInSync", "朗读会跟随当前阅读位置继续。")}
            </Text>
          </View>

          <View style={s.previewRow}>
            <Text style={s.previewLabel}>{t("tts.nextPreview", "下一段预览")}</Text>
            <Text style={s.previewText}>
              {nextExcerpt || t("tts.currentPageOnly", "会继续朗读当前页剩余内容。")}
            </Text>
          </View>
        </ScrollView>

        <View style={s.playerDock}>
          <View style={s.dockProgressTrack}>
            <View style={[s.dockProgressFill, { width: `${progressPct}%` }]} />
          </View>

          <View style={s.dockMetaRow}>
            <Text style={s.dockMetaText}>{pageProgressLabel}</Text>
            <Text style={s.dockMetaText}>{progressPct}%</Text>
          </View>

          <View style={s.controlsRow}>
            <Pressable style={s.miniAction} onPress={onClose}>
              <ScrollTextIcon size={22} color={colors.mutedForeground} />
              <Text style={s.miniActionText}>{t("tts.originalText", "原文")}</Text>
            </Pressable>

            <Pressable style={s.miniAction} onPress={onReplay}>
              <ReplayIcon size={20} color={colors.foreground} />
              <Text style={s.miniActionText}>{t("tts.replay", "重播")}</Text>
            </Pressable>

            <TouchableOpacity style={s.playButton} onPress={onPlayPause} activeOpacity={0.9}>
              {playState === "loading" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : playState === "playing" ? (
                <PauseIcon />
              ) : (
                <PlayIcon />
              )}
            </TouchableOpacity>

            <Pressable style={s.miniAction} onPress={onStop}>
              <StopIcon size={17} color={colors.foreground} />
              <Text style={s.miniActionText}>{t("common.stop", "停止")}</Text>
            </Pressable>

            <Pressable style={s.miniAction} onPress={() => setShowSettings((prev) => !prev)}>
              <WrenchIcon size={18} color={colors.mutedForeground} />
              <Text style={s.miniActionText}>{t("common.settings", "设置")}</Text>
            </Pressable>
          </View>

          <View style={s.toggleRow}>
            <TouchableOpacity
              style={[s.toggleChip, continuousEnabled && s.toggleChipActive]}
              onPress={onToggleContinuous}
              activeOpacity={0.88}
            >
              <Text style={[s.toggleChipText, continuousEnabled && s.toggleChipTextActive]}>
                {t("tts.autoContinuePage", "自动继续下一页")}
              </Text>
            </TouchableOpacity>
            <View style={s.secondaryChip}>
              <Text style={s.secondaryChipText}>{sourceLabel}</Text>
            </View>
          </View>

          {showSettings && (
            <View style={s.settingsCard}>
              <View style={s.settingRow}>
                <Text style={s.settingLabel}>{t("tts.rate", "语速")}</Text>
                <View style={s.stepper}>
                  <TouchableOpacity style={s.stepButton} onPress={() => onAdjustRate(-0.1)}>
                    <MinusIcon size={14} color={colors.foreground} />
                  </TouchableOpacity>
                  <Text style={s.stepperValue}>{config.rate.toFixed(1)}x</Text>
                  <TouchableOpacity style={s.stepButton} onPress={() => onAdjustRate(0.1)}>
                    <PlusIcon size={14} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.settingRow}>
                <Text style={s.settingLabel}>{t("tts.pitch", "音调")}</Text>
                <View style={s.stepper}>
                  <TouchableOpacity style={s.stepButton} onPress={() => onAdjustPitch(-0.1)}>
                    <MinusIcon size={14} color={colors.foreground} />
                  </TouchableOpacity>
                  <Text style={s.stepperValue}>{config.pitch.toFixed(1)}</Text>
                  <TouchableOpacity style={s.stepButton} onPress={() => onAdjustPitch(0.1)}>
                    <PlusIcon size={14} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    closeButton: {
      position: "absolute",
      top: 18,
      left: 18,
      zIndex: 3,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withOpacity(colors.card, 0.92),
      borderWidth: 1,
      borderColor: withOpacity(colors.border, 0.9),
    },
    statusChip: {
      position: "absolute",
      top: 22,
      right: 18,
      zIndex: 3,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: withOpacity(colors.card, 0.94),
      borderWidth: 1,
      borderColor: withOpacity(colors.border, 0.9),
    },
    statusChipText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      color: colors.primary,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 28,
      paddingTop: 82,
      paddingBottom: 310,
    },
    hero: {
      alignItems: "center",
    },
    coverCard: {
      width: 210,
      height: 280,
      borderRadius: 22,
      overflow: "hidden",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: withOpacity(colors.border, 0.9),
    },
    coverImage: {
      width: "100%",
      height: "100%",
    },
    coverFallback: {
      flex: 1,
      justifyContent: "flex-end",
      paddingHorizontal: 22,
      paddingBottom: 24,
      backgroundColor: withOpacity(colors.card, 0.88),
    },
    coverFallbackEyebrow: {
      fontSize: 11,
      letterSpacing: 1.1,
      textTransform: "uppercase",
      color: colors.mutedForeground,
      fontWeight: fontWeight.semibold,
      marginBottom: 8,
    },
    coverFallbackTitle: {
      fontSize: 24,
      lineHeight: 32,
      color: colors.foreground,
      fontWeight: fontWeight.bold,
    },
    titleBlock: {
      marginTop: 28,
      alignItems: "center",
      gap: 8,
    },
    bookTitle: {
      fontSize: 28,
      lineHeight: 34,
      color: colors.foreground,
      fontWeight: fontWeight.bold,
      textAlign: "center",
    },
    chapterTitle: {
      maxWidth: 320,
      fontSize: fontSize.base,
      lineHeight: 24,
      color: colors.mutedForeground,
      textAlign: "center",
    },
    sourceText: {
      fontSize: 12,
      letterSpacing: 0.3,
      color: colors.mutedForeground,
      fontWeight: fontWeight.semibold,
    },
    metaRow: {
      width: "100%",
      flexDirection: "row",
      gap: 12,
      marginTop: 26,
    },
    metaItem: {
      flex: 1,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: withOpacity(colors.border, 0.85),
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 4,
    },
    metaLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontWeight: fontWeight.medium,
    },
    metaValue: {
      fontSize: 13,
      color: colors.foreground,
      fontWeight: fontWeight.semibold,
    },
    excerptCard: {
      marginTop: 28,
      borderRadius: 26,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: withOpacity(colors.border, 0.85),
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    sectionEyebrow: {
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: colors.primary,
      fontWeight: fontWeight.bold,
    },
    excerptText: {
      marginTop: 12,
      fontSize: 22,
      lineHeight: 34,
      color: colors.foreground,
      fontWeight: fontWeight.semibold,
    },
    excerptSubtext: {
      marginTop: 12,
      fontSize: fontSize.sm,
      lineHeight: 22,
      color: colors.mutedForeground,
    },
    previewRow: {
      marginTop: 18,
      gap: 6,
      paddingHorizontal: 4,
    },
    previewLabel: {
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: 0.7,
      color: colors.mutedForeground,
      fontWeight: fontWeight.semibold,
    },
    previewText: {
      fontSize: fontSize.sm,
      lineHeight: 22,
      color: colors.foreground,
    },
    playerDock: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 22,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      backgroundColor: withOpacity(colors.card, 0.97),
      borderTopWidth: 1,
      borderColor: withOpacity(colors.border, 0.9),
    },
    dockProgressTrack: {
      height: 4,
      borderRadius: 999,
      backgroundColor: withOpacity(colors.border, 0.7),
      overflow: "hidden",
    },
    dockProgressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    dockMetaRow: {
      marginTop: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    dockMetaText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontWeight: fontWeight.medium,
    },
    controlsRow: {
      marginTop: 16,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    miniAction: {
      minWidth: 54,
      alignItems: "center",
      gap: 7,
    },
    miniActionText: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontWeight: fontWeight.medium,
    },
    playButton: {
      width: 78,
      height: 78,
      borderRadius: 39,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    toggleRow: {
      marginTop: 18,
      flexDirection: "row",
      gap: 10,
      flexWrap: "wrap",
    },
    toggleChip: {
      flex: 1,
      minWidth: 170,
      borderRadius: 999,
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: "center",
    },
    toggleChipActive: {
      backgroundColor: colors.primary,
    },
    toggleChipText: {
      fontSize: 12,
      color: colors.foreground,
      fontWeight: fontWeight.semibold,
    },
    toggleChipTextActive: {
      color: colors.primaryForeground,
    },
    secondaryChip: {
      borderRadius: 999,
      backgroundColor: withOpacity(colors.muted, 0.98),
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryChipText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontWeight: fontWeight.semibold,
    },
    settingsCard: {
      marginTop: 14,
      borderRadius: 22,
      backgroundColor: withOpacity(colors.muted, 0.98),
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 14,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    settingLabel: {
      fontSize: fontSize.sm,
      color: colors.foreground,
      fontWeight: fontWeight.medium,
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    stepButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: withOpacity(colors.border, 0.85),
    },
    stepperValue: {
      minWidth: 48,
      textAlign: "center",
      fontSize: fontSize.sm,
      color: colors.foreground,
      fontWeight: fontWeight.semibold,
    },
  });
