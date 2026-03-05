/**
 * MobileReadSettings — bottom sheet for reading settings.
 * Font size, line height, font theme, view mode, paragraph spacing.
 */
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ViewSettings } from "@readany/core/types";

interface MobileReadSettingsProps {
  settings: ViewSettings;
  onUpdate: (updates: Partial<ViewSettings>) => void;
  onClose: () => void;
}

const FONT_THEMES = [
  { id: "default", labelKey: "reader.fontThemeDefault" },
  { id: "classic", labelKey: "reader.fontThemeClassic" },
  { id: "modern", labelKey: "reader.fontThemeModern" },
  { id: "elegant", labelKey: "reader.fontThemeElegant" },
  { id: "literary", labelKey: "reader.fontThemeLiterary" },
];

export function MobileReadSettings({ settings, onUpdate, onClose }: MobileReadSettingsProps) {
  const { t } = useTranslation();

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[60vh] rounded-t-2xl">
        <SheetHeader className="pb-3">
          <SheetTitle className="text-base">{t("reader.settings")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 overflow-y-auto pb-8">
          {/* Font Size */}
          <SettingRow label={t("reader.fontSize")}>
            <div className="flex items-center gap-3">
              <StepButton
                onClick={() => onUpdate({ fontSize: Math.max(12, settings.fontSize - 1) })}
                icon={<Minus className="h-3.5 w-3.5" />}
              />
              <span className="w-8 text-center text-sm font-medium">{settings.fontSize}</span>
              <StepButton
                onClick={() => onUpdate({ fontSize: Math.min(32, settings.fontSize + 1) })}
                icon={<Plus className="h-3.5 w-3.5" />}
              />
            </div>
          </SettingRow>

          {/* Line Height */}
          <SettingRow label={t("reader.lineHeight")}>
            <div className="flex items-center gap-3">
              <StepButton
                onClick={() =>
                  onUpdate({ lineHeight: Math.round(Math.max(1.2, settings.lineHeight - 0.1) * 10) / 10 })
                }
                icon={<Minus className="h-3.5 w-3.5" />}
              />
              <span className="w-8 text-center text-sm font-medium">{settings.lineHeight.toFixed(1)}</span>
              <StepButton
                onClick={() =>
                  onUpdate({ lineHeight: Math.round(Math.min(2.5, settings.lineHeight + 0.1) * 10) / 10 })
                }
                icon={<Plus className="h-3.5 w-3.5" />}
              />
            </div>
          </SettingRow>

          {/* Paragraph Spacing */}
          <SettingRow label={t("reader.paragraphSpacing")}>
            <div className="flex items-center gap-3">
              <StepButton
                onClick={() => onUpdate({ paragraphSpacing: Math.max(0, settings.paragraphSpacing - 2) })}
                icon={<Minus className="h-3.5 w-3.5" />}
              />
              <span className="w-8 text-center text-sm font-medium">{settings.paragraphSpacing}</span>
              <StepButton
                onClick={() => onUpdate({ paragraphSpacing: Math.min(24, settings.paragraphSpacing + 2) })}
                icon={<Plus className="h-3.5 w-3.5" />}
              />
            </div>
          </SettingRow>

          {/* Page Margin */}
          <SettingRow label={t("reader.pageMargin")}>
            <div className="flex items-center gap-3">
              <StepButton
                onClick={() => onUpdate({ pageMargin: Math.max(0, settings.pageMargin - 4) })}
                icon={<Minus className="h-3.5 w-3.5" />}
              />
              <span className="w-8 text-center text-sm font-medium">{settings.pageMargin}</span>
              <StepButton
                onClick={() => onUpdate({ pageMargin: Math.min(48, settings.pageMargin + 4) })}
                icon={<Plus className="h-3.5 w-3.5" />}
              />
            </div>
          </SettingRow>

          {/* Font Theme */}
          <SettingRow label={t("reader.fontTheme")}>
            <div className="flex gap-2">
              {FONT_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    settings.fontTheme === theme.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground active:bg-muted/80"
                  }`}
                  onClick={() => onUpdate({ fontTheme: theme.id })}
                >
                  {t(theme.labelKey)}
                </button>
              ))}
            </div>
          </SettingRow>

          {/* View Mode */}
          <SettingRow label={t("reader.viewMode")}>
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                  settings.viewMode === "paginated"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground active:bg-muted/80"
                }`}
                onClick={() => onUpdate({ viewMode: "paginated" })}
              >
                {t("reader.paginated")}
              </button>
              <button
                type="button"
                className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                  settings.viewMode === "scroll"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground active:bg-muted/80"
                }`}
                onClick={() => onUpdate({ viewMode: "scroll" })}
              >
                {t("reader.scrollMode")}
              </button>
            </div>
          </SettingRow>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function StepButton({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground active:bg-muted/80"
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
