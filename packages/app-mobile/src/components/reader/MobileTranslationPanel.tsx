/**
 * MobileTranslationPanel — bottom sheet for translation results.
 * Uses core useTranslator hook. Supports language switching and copy.
 */
import { useTranslator } from "@readany/core/hooks/useTranslator";
import { useSettingsStore } from "@readany/core/stores/settings-store";
import {
  TRANSLATOR_LANGS,
  type TranslationTargetLang,
} from "@readany/core/types/translation";
import { Check, ChevronDown, Copy, Languages, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface MobileTranslationPanelProps {
  text: string;
  onClose: () => void;
}

export function MobileTranslationPanel({ text, onClose }: MobileTranslationPanelProps) {
  const { t } = useTranslation();
  const translationConfig = useSettingsStore((s) => s.translationConfig);
  const updateTranslationConfig = useSettingsStore((s) => s.updateTranslationConfig);

  const [targetLang, setTargetLang] = useState<TranslationTargetLang>(translationConfig.targetLang);
  const [translation, setTranslation] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const { translate, loading, error, provider } = useTranslator({ targetLang });

  // Fetch translation
  useEffect(() => {
    let cancelled = false;
    setTranslation(null);

    const doTranslate = async () => {
      try {
        const input = text.split("\n").join(" ").trim();
        const results = await translate([input]);
        if (!cancelled && results[0]) {
          setTranslation(results[0]);
        }
      } catch (err) {
        console.error("Translation error:", err);
      }
    };

    doTranslate();
    return () => { cancelled = true; };
  }, [text, targetLang, translate]);

  const handleLangChange = useCallback((lang: TranslationTargetLang) => {
    setTargetLang(lang);
    updateTranslationConfig({ targetLang: lang });
    setLangOpen(false);
  }, [updateTranslationConfig]);

  const handleCopy = useCallback(async () => {
    if (translation) {
      await navigator.clipboard.writeText(translation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [translation]);

  // Provider display name
  const aiConfig = useSettingsStore((s) => s.aiConfig);
  const endpointId = translationConfig.provider.endpointId || aiConfig.activeEndpointId;
  const endpoint = aiConfig.endpoints.find((e) => e.id === endpointId);
  const providerName = provider === "ai" ? (endpoint?.name || "AI") : "DeepL";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-border bg-background shadow-2xl animate-in slide-in-from-bottom duration-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 pb-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground active:bg-muted"
            >
              <Languages className="h-4 w-4" />
              <span>{TRANSLATOR_LANGS[targetLang]}</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {langOpen && (
              <div className="absolute left-0 bottom-full z-50 mb-1 w-40 rounded-lg border bg-background p-1 shadow-lg">
                <div className="max-h-48 overflow-y-auto">
                  {Object.entries(TRANSLATOR_LANGS).map(([code, name]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleLangChange(code as TranslationTargetLang)}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm ${
                        code === targetLang ? "bg-primary/10 text-primary" : "active:bg-muted"
                      }`}
                    >
                      <span>{name}</span>
                      {code === targetLang && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {/* Source text */}
          <p className="mb-3 max-h-16 overflow-y-auto text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {text}
          </p>

          {/* Translation result */}
          {loading && (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("translation.translating", "翻译中...")}</span>
            </div>
          )}

          {error && !loading && (
            <div className="py-2 text-sm text-destructive">{error}</div>
          )}

          {!loading && !error && translation && (
            <>
              <p className="max-h-32 overflow-y-auto text-base leading-relaxed">{translation}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{providerName}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground active:bg-muted"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      <span>{t("common.copied", "已复制")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>{t("common.copy", "复制")}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
