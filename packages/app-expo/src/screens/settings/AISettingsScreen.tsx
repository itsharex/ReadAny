import { useSettingsStore } from "@/stores";
import { getAIEndpointRequestPreview, testAIEndpoint } from "@readany/core/ai";
import { getPlatformService } from "@readany/core/services";
import type { AIEndpoint, AIProviderType } from "@readany/core/types";
import {
  getDefaultBaseUrl,
  PROVIDER_CONFIGS,
  providerSupportsExactRequestUrl,
  providerRequiresApiKey,
} from "@readany/core/utils";
import type { TFunction } from "i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoaderIcon, MinusIcon, PlusIcon, Trash2Icon, XIcon } from "../../components/ui/Icon";
import { PasswordInput } from "../../components/ui/PasswordInput";
import {
  type ThemeColors,
  fontSize,
  fontWeight,
  radius,
  spacing,
  useColors,
  withOpacity,
} from "../../styles/theme";
import { SettingsHeader } from "./SettingsHeader";

const PROVIDERS: { id: AIProviderType; label: string }[] = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "google", label: "Google Gemini" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "ollama", label: "Ollama" },
  { id: "lmstudio", label: "LM Studio" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "siliconflow", label: "SiliconFlow" },
  { id: "moonshot", label: "Moonshot" },
  { id: "zhipu", label: "智谱 GLM" },
  { id: "aliyun", label: "阿里云通义" },
  { id: "custom", label: "Custom" },
];

// Individual endpoint editor with local state
function EndpointEditor({
  ep,
  isActive,
  onUpdate,
  onDelete,
  onFetchModels,
  aiConfig,
  setActiveEndpoint,
  setActiveModel,
  colors,
  styles,
  t,
}: {
  ep: AIEndpoint;
  isActive: boolean;
  onUpdate: (id: string, updates: Partial<AIEndpoint>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onFetchModels: (ep: AIEndpoint) => Promise<void>;
  aiConfig: { activeModel: string; activeEndpointId: string };
  setActiveEndpoint: (id: string) => void;
  setActiveModel: (model: string) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
  t: TFunction;
}) {
  // Local state for form fields - only initialized once
  const [name, setName] = useState(ep.name);
  const [apiKey, setApiKey] = useState(ep.apiKey);
  const [baseUrl, setBaseUrl] = useState(ep.baseUrl);
  const [useExactRequestUrl, setUseExactRequestUrl] = useState(!!ep.useExactRequestUrl);
  const [newModelInput, setNewModelInput] = useState("");
  const [testModel, setTestModel] = useState("__auto__");
  const [testState, setTestState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  // Refs to track latest values for unmount save
  const epRef = useRef(ep);
  epRef.current = ep;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const stateRef = useRef({ name, apiKey, baseUrl, useExactRequestUrl });
  stateRef.current = { name, apiKey, baseUrl, useExactRequestUrl };

  // Save on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      const current = epRef.current;
      const update = onUpdateRef.current;
      const state = stateRef.current;
      if (
        state.name !== current.name ||
        state.apiKey !== current.apiKey ||
        state.baseUrl !== current.baseUrl ||
        state.useExactRequestUrl !== !!current.useExactRequestUrl
      ) {
        update(current.id, {
          name: state.name,
          apiKey: state.apiKey,
          baseUrl: state.baseUrl,
          useExactRequestUrl: state.useExactRequestUrl,
        }).catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    if (testModel !== "__auto__" && !ep.models.includes(testModel)) {
      setTestModel("__auto__");
    }
  }, [ep.models, testModel]);

  const currentEndpoint = useMemo(
    () => ({
      ...ep,
      name,
      apiKey,
      baseUrl,
      useExactRequestUrl,
    }),
    [apiKey, baseUrl, ep, name, useExactRequestUrl],
  );

  const supportsExactRequestUrl = providerSupportsExactRequestUrl(ep.provider);
  const exactRequestUrlEnabled = supportsExactRequestUrl && useExactRequestUrl;

  const requestPreview = useMemo(
    () =>
      getAIEndpointRequestPreview(
        currentEndpoint,
        testModel === "__auto__" ? undefined : testModel,
      ),
    [currentEndpoint, testModel],
  );

  const handleCopyRequestPreview = useCallback(async () => {
    if (!requestPreview) return;
    try {
      await getPlatformService().copyToClipboard(requestPreview);
      Alert.alert(
        t("common.success", "成功！"),
        t("notes.copiedToClipboard", "已复制到剪贴板"),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("common.failed", "失败");
      Alert.alert(t("common.failed", "失败"), message);
    }
  }, [requestPreview, t]);

  const handleAddModel = useCallback(() => {
    const trimmed = newModelInput.trim();
    if (!trimmed || ep.models.includes(trimmed)) return;
    onUpdate(ep.id, { models: [...ep.models, trimmed] }).catch(console.error);
    setNewModelInput("");
  }, [newModelInput, ep.models, ep.id, onUpdate]);

  const handleTestConnection = useCallback(async () => {
    setTestState("testing");
    setTestMessage("");
    try {
      await onUpdate(ep.id, { name, apiKey, baseUrl, useExactRequestUrl });
      const result = await testAIEndpoint(currentEndpoint, {
        model: testModel === "__auto__" ? undefined : testModel,
      });
      setTestState("success");
      setTestMessage(
        result.testedModel
          ? t("settings.ai_testSuccessWithModel", { model: result.testedModel })
          : result.modelCount && result.modelCount > 0
            ? t("settings.ai_testSuccessWithModels", { count: result.modelCount })
            : t("settings.ai_testSuccess"),
      );
    } catch (err) {
      setTestState("error");
      setTestMessage(err instanceof Error ? err.message : t("settings.ai_testFailed"));
    }
  }, [apiKey, baseUrl, currentEndpoint, ep.id, name, onUpdate, t, testModel, useExactRequestUrl]);

  return (
    <View style={styles.expandedContent}>
      {/* Set as active */}
      <TouchableOpacity style={styles.row} onPress={() => setActiveEndpoint(ep.id)}>
        <Text style={styles.label}>{t("settings.ai_setDefault", "设为默认")}</Text>
        <View style={[styles.toggle, isActive && styles.toggleActive]}>
          <View style={[styles.toggleThumb, isActive && styles.toggleThumbActive]} />
        </View>
      </TouchableOpacity>

      {/* Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t("settings.ai_name", "名称")}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          onBlur={() => {
            if (name !== ep.name) onUpdate(ep.id, { name }).catch(console.error);
          }}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      {/* Provider grid */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t("settings.ai_providerLabel", "提供商")}</Text>
        <View style={styles.providerGrid}>
          {PROVIDERS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.providerBtn, ep.provider === p.id && styles.providerBtnActive]}
              onPress={() => {
                const config = PROVIDER_CONFIGS[p.id];
                const defaultBaseUrl = getDefaultBaseUrl(p.id);
                onUpdate(ep.id, {
                  provider: p.id,
                  baseUrl: defaultBaseUrl,
                  useExactRequestUrl: false,
                  name: config?.name || p.label,
                  models: [],
                  modelsFetched: false,
                }).catch(console.error);
                setBaseUrl(defaultBaseUrl);
                setUseExactRequestUrl(false);
                setName(config?.name || p.label);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.providerBtnText,
                  ep.provider === p.id && styles.providerBtnTextActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* API Key */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t("settings.ai_apiKey", "API Key")}</Text>
        <PasswordInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          onBlur={() => {
            if (apiKey !== ep.apiKey) onUpdate(ep.id, { apiKey }).catch(console.error);
          }}
          placeholder="sk-..."
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      {/* Base URL */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>
          {exactRequestUrlEnabled
            ? t("settings.ai_exactRequestUrlLabel", "完整请求地址")
            : t("settings.ai_baseUrl", "Base URL")}
        </Text>
        <TextInput
          style={styles.input}
          value={baseUrl}
          onChangeText={setBaseUrl}
          onBlur={() => {
            if (baseUrl !== ep.baseUrl) onUpdate(ep.id, { baseUrl }).catch(console.error);
          }}
          placeholderTextColor={colors.mutedForeground}
          placeholder={PROVIDER_CONFIGS[ep.provider || "openai"]?.placeholder || "https://api.example.com"}
          autoCapitalize="none"
        />
        {supportsExactRequestUrl && (
          <View style={styles.exactUrlCard}>
            <View style={styles.exactUrlInfo}>
              <Text style={styles.fieldLabel}>
                {t("settings.ai_exactRequestUrl", "完全自定义请求地址")}
              </Text>
              <Text style={styles.baseUrlHint}>
                {t(
                  "settings.ai_exactRequestUrlDesc",
                  "启用后将按你填写的地址原样请求，不再自动追加 /v1、/chat/completions 或 /models。",
                )}
              </Text>
            </View>
            <Switch
              value={exactRequestUrlEnabled}
              onValueChange={(value) => {
                setUseExactRequestUrl(value);
                onUpdate(ep.id, { useExactRequestUrl: value }).catch(console.error);
              }}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.card}
            />
          </View>
        )}
        {!exactRequestUrlEnabled && PROVIDER_CONFIGS[ep.provider]?.needsV1Suffix && (
          <Text style={styles.baseUrlHint}>
            {t(
              "settings.ai_baseUrlHint",
              "OpenAI-compatible endpoints append /v1 by default. End the URL with / to use your custom path as-is.",
            )}
          </Text>
        )}
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewLabel}>
              {t("settings.ai_requestUrlPreview", "最终请求地址")}
            </Text>
            <TouchableOpacity
              style={styles.previewCopyButton}
              onPress={handleCopyRequestPreview}
              activeOpacity={0.8}
              disabled={!requestPreview}
            >
              <Text style={styles.previewCopyButtonText}>
                {t("common.copy", "复制")}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.previewValue}>{requestPreview || "—"}</Text>
          <Text style={styles.previewLabel}>{t("settings.ai_testModel", "测试模型")}</Text>
          <View style={styles.testModelChips}>
            <TouchableOpacity
              style={[
                styles.testModelChip,
                testModel === "__auto__" && styles.testModelChipActive,
              ]}
              onPress={() => setTestModel("__auto__")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.testModelChipText,
                  testModel === "__auto__" && styles.testModelChipTextActive,
                ]}
              >
                {t("settings.ai_testModelAuto", "自动选择首个可用模型")}
              </Text>
            </TouchableOpacity>
            {ep.models.map((model) => {
              const active = testModel === model;
              return (
                <TouchableOpacity
                  key={model}
                  style={[styles.testModelChip, active && styles.testModelChipActive]}
                  onPress={() => setTestModel(model)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.testModelChipText, active && styles.testModelChipTextActive]}
                  >
                    {model}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Models */}
      <View style={styles.fieldGroup}>
        <View style={styles.modelsHeader}>
          <Text style={styles.fieldLabel}>{t("settings.ai_modelsList", "模型列表")}</Text>
          <View style={styles.modelsActions}>
            <TouchableOpacity
              style={styles.fetchBtn}
              onPress={() =>
                onFetchModels({ ...ep, name, apiKey, baseUrl, useExactRequestUrl })
              }
              disabled={
                exactRequestUrlEnabled ||
                !!ep.modelsFetching ||
                (providerRequiresApiKey(ep.provider) && !apiKey.trim())
              }
            >
              {ep.modelsFetching ? (
                <LoaderIcon size={12} color={colors.primary} />
              ) : (
                <Text style={styles.fetchBtnText}>{t("settings.ai_fetchModels", "获取模型")}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fetchBtn}
              onPress={handleTestConnection}
              disabled={testState === "testing"}
            >
              {testState === "testing" ? (
                <LoaderIcon size={12} color={colors.primary} />
              ) : (
                <Text style={styles.fetchBtnText}>
                  {t("settings.ai_testConnection", "测试连接")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        {exactRequestUrlEnabled && (
          <Text style={styles.endpointTestResult}>
            {t(
              "settings.ai_exactRequestUrlFetchHint",
              "完全自定义请求地址模式下无法自动推断模型列表地址，请手动添加模型后再测试。",
            )}
          </Text>
        )}
        {testState !== "idle" && !!testMessage && (
          <Text
            style={[
              styles.endpointTestResult,
              testState === "success" ? styles.endpointTestSuccess : styles.endpointTestError,
            ]}
          >
            {testMessage}
          </Text>
        )}

        {/* Model tags */}
        <View style={styles.modelTags}>
          {ep.models.map((m) => {
            const modelActive = aiConfig.activeModel === m && isActive;
            return (
              <View key={m} style={[styles.modelTag, modelActive && styles.modelTagActive]}>
                <TouchableOpacity
                  onPress={() => {
                    setActiveEndpoint(ep.id);
                    setActiveModel(m);
                  }}
                >
                  <Text
                    style={[styles.modelTagText, modelActive && styles.modelTagTextActive]}
                    numberOfLines={1}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    onUpdate(ep.id, {
                      models: ep.models.filter((x) => x !== m),
                    }).catch(console.error)
                  }
                  hitSlop={{
                    top: 4,
                    bottom: 4,
                    left: 4,
                    right: 4,
                  }}
                >
                  <XIcon size={12} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Add model input */}
        <View style={styles.addModelRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={t("settings.ai_addManualModelPlaceholder", "手动添加模型名")}
            placeholderTextColor={colors.mutedForeground}
            value={newModelInput}
            onChangeText={setNewModelInput}
            onSubmitEditing={handleAddModel}
          />
          <TouchableOpacity style={styles.addModelBtn} onPress={handleAddModel} activeOpacity={0.8}>
            <Text style={styles.addModelBtnText}>{t("common.add", "添加")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete button */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(ep.id)}
        activeOpacity={0.8}
      >
        <Trash2Icon size={14} color={colors.destructive} />
        <Text style={styles.deleteBtnText}>{t("common.delete", "删除")}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AISettingsScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { t } = useTranslation();
  const {
    aiConfig,
    addEndpoint,
    updateEndpoint,
    removeEndpoint,
    setActiveEndpoint,
    setActiveModel,
    updateAIConfig,
    fetchModels,
  } = useSettingsStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAddEndpoint = useCallback(async () => {
    const defaultProvider = "openai";
    const config = PROVIDER_CONFIGS[defaultProvider];
    const defaultBaseUrl = getDefaultBaseUrl(defaultProvider);
    await addEndpoint({
      id: `${Date.now()}`,
      name: config?.name || "OpenAI",
      provider: defaultProvider,
      apiKey: "",
      baseUrl: defaultBaseUrl,
      useExactRequestUrl: false,
      models: [],
      modelsFetched: false,
    });
  }, [addEndpoint]);

  const handleFetchModels = useCallback(
    async (ep: AIEndpoint) => {
      await updateEndpoint(ep.id, {
        name: ep.name,
        apiKey: ep.apiKey,
        baseUrl: ep.baseUrl,
        useExactRequestUrl: ep.useExactRequestUrl,
        modelsFetching: true,
      });
      try {
        const models = await fetchModels(ep.id);
        // 自动选中第一个模型（如果当前没有选中任何模型）
        if (models.length > 0 && !aiConfig.activeModel) {
          setActiveEndpoint(ep.id);
          setActiveModel(models[0]);
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
      }
    },
    [fetchModels, updateEndpoint, aiConfig.activeModel, setActiveEndpoint, setActiveModel],
  );

  const addButton = (
    <TouchableOpacity style={styles.addBtn} onPress={handleAddEndpoint} activeOpacity={0.8}>
      <PlusIcon size={14} color={colors.primaryForeground} />
      <Text style={styles.addBtnText}>{t("common.add", "添加")}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <SettingsHeader
        title={t("settings.ai_title", "AI 设置")}
        subtitle={t("settings.realtimeHint")}
        right={addButton}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={true}
          alwaysBounceVertical={false}
          scrollEventThrottle={16}
          overScrollMode="never"
          bounces={true}
        >
          {/* Endpoints */}
          {aiConfig.endpoints.map((ep) => {
            const isActive = ep.id === aiConfig.activeEndpointId;
            const isExpanded = expandedId === ep.id;

            return (
              <View
                key={ep.id}
                style={[styles.endpointCard, isActive && styles.endpointCardActive]}
              >
                {/* Header */}
                <TouchableOpacity
                  style={styles.endpointHeader}
                  onPress={() => setExpandedId(isExpanded ? null : ep.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.endpointInfo}>
                    <View style={styles.endpointNameRow}>
                      <Text style={styles.endpointName}>
                        {ep.name || t("common.unnamed", "未命名")}
                      </Text>
                      {isActive && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>{t("common.current", "当前")}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.endpointProvider}>{ep.provider}</Text>
                  </View>
                  <Text style={styles.chevron}>{isExpanded ? "▲" : "▼"}</Text>
                </TouchableOpacity>

                {/* Expanded Content */}
                {isExpanded && (
                  <EndpointEditor
                    ep={ep}
                    isActive={isActive}
                    onUpdate={updateEndpoint}
                    onDelete={removeEndpoint}
                    onFetchModels={handleFetchModels}
                    aiConfig={aiConfig}
                    setActiveEndpoint={setActiveEndpoint}
                    setActiveModel={setActiveModel}
                    colors={colors}
                    styles={styles}
                    t={t}
                  />
                )}
              </View>
            );
          })}

          {/* Global Settings */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t("settings.ai_globalParams", "全局参数")}</Text>

            <View style={styles.paramRow}>
              <Text style={styles.paramLabel}>Temperature</Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const newValue = Math.max(0, aiConfig.temperature - 0.1);
                    updateAIConfig({ temperature: Math.round(newValue * 10) / 10 });
                  }}
                  activeOpacity={0.7}
                >
                  <MinusIcon size={16} color={colors.foreground} />
                </TouchableOpacity>
                <TextInput
                  style={styles.stepperInput}
                  value={String(aiConfig.temperature)}
                  onChangeText={(v) => {
                    const num = Number.parseFloat(v);
                    if (!Number.isNaN(num) && num >= 0 && num <= 1) {
                      updateAIConfig({ temperature: num });
                    }
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.0 - 1.0"
                  textAlign="center"
                />
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const newValue = Math.min(1, aiConfig.temperature + 0.1);
                    updateAIConfig({ temperature: Math.round(newValue * 10) / 10 });
                  }}
                  activeOpacity={0.7}
                >
                  <PlusIcon size={16} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.paramRow, { marginTop: spacing.md }]}>
              <Text style={styles.paramLabel}>Max Tokens</Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const newValue = Math.max(256, aiConfig.maxTokens - 256);
                    updateAIConfig({ maxTokens: newValue });
                  }}
                  activeOpacity={0.7}
                >
                  <MinusIcon size={16} color={colors.foreground} />
                </TouchableOpacity>
                <TextInput
                  style={styles.stepperInput}
                  value={String(aiConfig.maxTokens)}
                  onChangeText={(v) => {
                    const num = Number.parseInt(v, 10);
                    if (!Number.isNaN(num) && num > 0) {
                      updateAIConfig({ maxTokens: num });
                    }
                  }}
                  keyboardType="number-pad"
                  textAlign="center"
                />
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const newValue = Math.min(32768, aiConfig.maxTokens + 256);
                    updateAIConfig({ maxTokens: newValue });
                  }}
                  activeOpacity={0.7}
                >
                  <PlusIcon size={16} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.paramRow, { marginTop: spacing.md }]}>
              <Text style={styles.paramLabel}>{t("settings.ai_slidingWindow", "上下文窗口")}</Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const newValue = Math.max(1, aiConfig.slidingWindowSize - 1);
                    updateAIConfig({ slidingWindowSize: newValue });
                  }}
                  activeOpacity={0.7}
                >
                  <MinusIcon size={16} color={colors.foreground} />
                </TouchableOpacity>
                <TextInput
                  style={styles.stepperInput}
                  value={String(aiConfig.slidingWindowSize)}
                  onChangeText={(v) => {
                    const num = Number.parseInt(v, 10);
                    if (!Number.isNaN(num) && num > 0) {
                      updateAIConfig({ slidingWindowSize: num });
                    }
                  }}
                  keyboardType="number-pad"
                  textAlign="center"
                />
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const newValue = Math.min(100, aiConfig.slidingWindowSize + 1);
                    updateAIConfig({ slidingWindowSize: newValue });
                  }}
                  activeOpacity={0.7}
                >
                  <PlusIcon size={16} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md, gap: spacing.md },

    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    addBtnText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.primaryForeground,
    },

    endpointCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    endpointCardActive: {
      borderColor: colors.primary,
    },
    endpointHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    endpointInfo: { flex: 1 },
    endpointNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    endpointName: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.foreground,
    },
    currentBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.sm,
      backgroundColor: withOpacity(colors.primary, 0.15),
    },
    currentBadgeText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      color: colors.primary,
    },
    endpointProvider: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    chevron: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },

    expandedContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.xs,
    },
    label: {
      fontSize: fontSize.sm,
      color: colors.foreground,
    },
    toggle: {
      width: 44,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.muted,
      padding: 2,
    },
    toggleActive: {
      backgroundColor: colors.primary,
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.background,
      transform: [{ translateX: 0 }],
    },
    toggleThumbActive: {
      transform: [{ translateX: 20 }],
    },

    fieldGroup: { gap: spacing.xs },
    fieldLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.foreground,
    },
    input: {
      height: 36,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.sm,
      fontSize: fontSize.sm,
      color: colors.foreground,
      textAlignVertical: "center",
    },
    baseUrlHint: {
      fontSize: fontSize.xs,
      lineHeight: 18,
      color: colors.mutedForeground,
    },
    exactUrlCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: withOpacity(colors.border, 0.8),
      backgroundColor: withOpacity(colors.background, 0.6),
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    exactUrlInfo: {
      flex: 1,
      gap: 2,
    },
    previewCard: {
      gap: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: withOpacity(colors.border, 0.8),
      backgroundColor: withOpacity(colors.background, 0.7),
      padding: spacing.sm,
    },
    previewHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    previewLabel: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
    },
    previewValue: {
      fontSize: fontSize.xs,
      color: colors.foreground,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    previewCopyButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    previewCopyButtonText: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      fontWeight: fontWeight.medium,
    },
    testModelChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    testModelChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    testModelChipActive: {
      borderColor: colors.primary,
      backgroundColor: withOpacity(colors.primary, 0.1),
    },
    testModelChipText: {
      fontSize: fontSize.xs,
      color: colors.foreground,
    },
    testModelChipTextActive: {
      color: colors.primary,
      fontWeight: fontWeight.medium,
    },

    providerGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    providerBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    providerBtnActive: {
      borderColor: colors.primary,
      backgroundColor: withOpacity(colors.primary, 0.1),
    },
    providerBtnText: {
      fontSize: fontSize.sm,
      color: colors.foreground,
    },
    providerBtnTextActive: {
      color: colors.primary,
      fontWeight: fontWeight.medium,
    },

    modelsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modelsActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    fetchBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fetchBtnText: {
      fontSize: fontSize.xs,
      color: colors.foreground,
    },
    endpointTestResult: {
      fontSize: fontSize.xs,
      marginTop: spacing.xs,
    },
    endpointTestSuccess: {
      color: "#16a34a",
    },
    endpointTestError: {
      color: colors.destructive,
    },
    modelTags: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    modelTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    modelTagActive: {
      borderColor: colors.primary,
      backgroundColor: withOpacity(colors.primary, 0.1),
    },
    modelTagText: {
      fontSize: fontSize.xs,
      color: colors.foreground,
      maxWidth: 120,
    },
    modelTagTextActive: {
      color: colors.primary,
      fontWeight: fontWeight.medium,
    },

    addModelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    addModelBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    addModelBtnText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.primaryForeground,
    },

    deleteBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.destructive,
      backgroundColor: withOpacity(colors.destructive, 0.05),
    },
    deleteBtnText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.destructive,
    },

    sectionCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: spacing.md,
      gap: spacing.md,
    },
    sectionTitle: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.foreground,
    },
    sectionDesc: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },

    paramRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    paramLabel: {
      fontSize: fontSize.sm,
      color: colors.foreground,
    },
    paramValue: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.primary,
    },
    paramInput: {
      width: 80,
      height: 32,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.sm,
      fontSize: fontSize.sm,
      color: colors.foreground,
      textAlign: "right",
    },

    stepperContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    stepperBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperInput: {
      width: 60,
      height: 32,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      fontSize: fontSize.sm,
      color: colors.foreground,
      paddingHorizontal: 4,
      paddingVertical: 6,
      textAlign: "center",
    },
  });
