/**
 * SkillsPage — mobile skills management page.
 * Uses core builtinSkills + DB for persistence.
 * Now supports creating/editing custom skills via SkillEditorSheet.
 */
import { builtinSkills } from "@readany/core/ai/skills/builtin-skills";
import { getSkills, updateSkill, deleteSkill } from "@readany/core/db";
import type { Skill } from "@readany/core/types";
import { ArrowLeft, Edit2, Loader2, Plus, Puzzle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { SkillEditorSheet } from "./SkillEditorSheet";

// Icon mapping for builtin skills
const SKILL_ICONS: Record<string, string> = {
  summarizer: "📝",
  "concept-explainer": "💡",
  "argument-analyzer": "⚖️",
  "character-tracker": "👥",
  "quote-collector": "✨",
  "reading-guide": "📖",
  translator: "🌐",
  "vocabulary-builder": "📚",
};

export function SkillsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  const loadSkills = useCallback(async () => {
    try {
      const dbSkills = await getSkills();
      const mergedSkills = builtinSkills.map((builtin) => {
        const dbSkill = dbSkills.find((s) => s.id === builtin.id);
        return dbSkill ? { ...builtin, enabled: dbSkill.enabled } : builtin;
      });
      const customSkills = dbSkills.filter((s) => !s.builtIn);
      setSkills([...mergedSkills, ...customSkills]);
    } catch {
      setSkills(builtinSkills);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleToggle = useCallback(async (skillId: string, enabled: boolean) => {
    try {
      await updateSkill(skillId, { enabled });
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, enabled } : s)),
      );
    } catch (err) {
      console.error("Failed to toggle skill:", err);
    }
  }, []);

  const handleCreateSkill = useCallback(() => {
    setEditingSkill(null);
    setEditorOpen(true);
  }, []);

  const handleEditSkill = useCallback((skill: Skill) => {
    setEditingSkill(skill);
    setEditorOpen(true);
  }, []);

  const handleDeleteSkill = useCallback(async (skillId: string) => {
    try {
      await deleteSkill(skillId);
      setSkills((prev) => prev.filter((s) => s.id !== skillId));
    } catch (err) {
      console.error("Failed to delete skill:", err);
    }
  }, []);

  const handleSkillSaved = useCallback((savedSkill: Skill) => {
    setSkills((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === savedSkill.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = savedSkill;
        return updated;
      }
      return [...prev, savedSkill];
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const builtInList = skills.filter((s) => s.builtIn);
  const customList = skills.filter((s) => !s.builtIn);

  return (
    <div className="flex h-full flex-col">
      <header
        className="shrink-0 px-4 pb-3 border-b border-border bg-background"
        style={{ paddingTop: "calc(var(--safe-area-top) + 12px)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" className="p-1 -ml-1" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">{t("skills.title")}</h1>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs active:bg-muted"
            onClick={handleCreateSkill}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("settings.addSkill")}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Built-in skills */}
        <div className="px-4 pt-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t("skills.builtinSkills")}
          </h2>
          <div className="space-y-2">
            {builtInList.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm border border-border"
              >
                <span className="text-2xl shrink-0">{SKILL_ICONS[skill.id] || "🔧"}</span>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleEditSkill(skill)}
                >
                  <h3 className="text-base font-medium">{skill.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {skill.description}
                  </p>
                </div>
                <Switch
                  checked={skill.enabled}
                  onCheckedChange={(checked) => handleToggle(skill.id, checked)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Custom skills section */}
        <div className="px-4 pt-6 pb-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t("skills.customSkills")}
          </h2>
          {customList.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Puzzle className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("skills.noCustomSkills")}
              </p>
              <button
                type="button"
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
                onClick={handleCreateSkill}
              >
                <Plus className="h-4 w-4" />
                {t("settings.addSkill")}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {customList.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm border border-border"
                >
                  <span className="text-2xl shrink-0">{SKILL_ICONS[skill.id] || "🔧"}</span>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleEditSkill(skill)}
                  >
                    <h3 className="text-base font-medium">{skill.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {skill.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      className="p-1.5 text-muted-foreground active:text-foreground"
                      onClick={() => handleEditSkill(skill)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-muted-foreground active:text-destructive"
                      onClick={() => handleDeleteSkill(skill.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <Switch
                      checked={skill.enabled}
                      onCheckedChange={(checked) => handleToggle(skill.id, checked)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skill Editor Sheet */}
      <SkillEditorSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        skill={editingSkill}
        onSaved={handleSkillSaved}
      />
    </div>
  );
}
