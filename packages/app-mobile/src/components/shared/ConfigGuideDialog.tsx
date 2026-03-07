/**
 * ConfigGuideDialog — modal dialog prompting user to configure AI or vector model.
 * Uses shadcn-ui Dialog components.
 */
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ConfigGuideType = "ai" | "vectorModel" | null;

interface ConfigGuideDialogProps {
  type: ConfigGuideType;
  onClose: () => void;
}

const CONFIG: Record<"ai" | "vectorModel", { titleKey: string; descKey: string; route: string; actionKey: string }> = {
  ai: {
    titleKey: "chat.notConfigured",
    descKey: "chat.notConfiguredDesc",
    route: "/settings/ai",
    actionKey: "chat.goSettings",
  },
  vectorModel: {
    titleKey: "vectorize.notConfigured",
    descKey: "vectorize.notConfiguredDesc",
    route: "/settings/vector-model",
    actionKey: "vectorize.goSettings",
  },
};

export function ConfigGuideDialog({ type, onClose }: ConfigGuideDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!type) return null;
  const cfg = CONFIG[type];

  return (
    <Dialog open={!!type} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[320px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t(cfg.titleKey)}</DialogTitle>
          <DialogDescription>{t(cfg.descKey)}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onClose();
              navigate(cfg.route);
            }}
          >
            {t(cfg.actionKey)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
