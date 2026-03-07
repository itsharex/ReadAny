import { cn } from "@readany/core/utils";
import {
  BookOpen,
  MessageSquare,
  NotebookPen,
  User,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

interface TabItem {
  path: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabItem[] = [
  { path: "/library", labelKey: "tabs.library", icon: BookOpen },
  { path: "/chat", labelKey: "tabs.ai", icon: MessageSquare },
  { path: "/notes", labelKey: "tabs.notes", icon: NotebookPen },
  { path: "/profile", labelKey: "tabs.profile", icon: User },
];

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const activeTab =
    tabs.find((t) => location.pathname.startsWith(t.path))?.path ?? "/library";

  return (
    <nav
      className="flex shrink-0 items-end border-t border-border bg-background/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.path;
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground active:text-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t(tab.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
