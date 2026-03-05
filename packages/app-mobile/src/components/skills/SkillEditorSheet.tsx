/**
 * SkillEditorSheet — mobile full-screen skill editor.
 * Supports create, edit custom skills, and view built-in skills.
 */
import { insertSkill, updateSkill as dbUpdateSkill } from "@readany/core/db";
import type { Skill } from "@readany/core/types";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface SkillEditorSheetProps {
  open: boolean;
  onClose: () => void;
  skill: Skill | null;
  onSaved?: (skill: Skill) => void;
}

export function SkillEditorSheet({ open, onClose, skill, onSaved }: SkillEditorSheetProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = !!skill;
  const isBuiltin = !!skill?.builtIn;

  useEffect(() => {
    if (open && skill) {
      setName(skill.name);
      setDescription(skill.description);
      setPrompt(skill.prompt);
    } else if (open) {
      setName("");
      setDescription("");
      setPrompt("");
    }
  }, [open, skill]);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !prompt.trim()) return;
    setSaving(true);
    try {
      const now = Date.now();
      const updatedSkill: Skill = isEditing
        ? {
            ...skill!,
            name: isBuiltin ? skill!.name : name.trim(),
            description: description.trim(),
            prompt: prompt.trim(),
            updatedAt: now,
          }
        : {
            id: `custom-${now}`,
            name: name.trim(),
            description: description.trim(),
            icon: undefined,
            enabled: true,
            parameters: [],
            prompt: prompt.trim(),
            builtIn: false,
            createdAt: now,
            updatedAt: now,
          };

      if (isEditing) {
        await dbUpdateSkill(updatedSkill.id, {
          name: updatedSkill.name,
          description: updatedSkill.description,
          prompt: updatedSkill.prompt,
          updatedAt: updatedSkill.updatedAt,
        });
      } else {
        await insertSkill(updatedSkill);
      }
      onSaved?.(updatedSkill);
      onClose();
    } catch (err) {
      console.error("Failed to save skill:", err);
    } finally {
      setSaving(false);
    }
  }, [name, description, prompt, isEditing, isBuiltin, skill, onSaved, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <header
        className="shrink-0 flex items-center justify-between px-4 pb-3 border-b border-border"
        style={{ paddingTop: "calc(var(--safe-area-top) + 12px)" }}
      >
        <div className="flex items-center gap-3">
          <button type="button" className="p-1 -ml-1" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">
            {isEditing
              ? isBuiltin
                ? t("settings.viewSkill")
                : t("settings.editSkill")
              : t("settings.addSkill")}
          </h1>
        </div>
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          disabled={!name.trim() || !prompt.trim() || saving}
          onClick={handleSave}
        >
          {saving ? t("common.saving") || "..." : t("common.save")}
        </button>
      </header>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">{t("settings.skillName")}</label>
          <input
            placeholder={t("settings.skillNamePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isBuiltin}
            className={`h-10 w-full rounded-xl border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isBuiltin ? "opacity-60" : ""
            }`}
          />
          {isBuiltin && (
            <p className="mt-1 text-xs text-muted-foreground">{t("settings.builtinNameReadOnly")}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">{t("settings.skillDescription")}</label>
          <input
            placeholder={t("settings.skillDescriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">{t("settings.skillPrompt")}</label>
          <textarea
            placeholder={t("settings.skillPromptPlaceholder")}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[240px] w-full resize-none rounded-xl border border-input bg-background px-3 py-3 font-mono text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}
