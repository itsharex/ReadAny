import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, Github, ExternalLink, Code2, Zap, Shield } from "lucide-react";

export function AboutPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [version, setVersion] = useState("1.0.0");

  useEffect(() => {
    (async () => {
      try {
        const { getVersion } = await import("@tauri-apps/api/app");
        const v = await getVersion();
        setVersion(v);
      } catch {
        // fallback
      }
    })();
  }, []);

  const techStack = [
    { icon: Code2, label: "Tauri v2", descKey: "about.nativeContainer" },
    { icon: Zap, label: "React 19", descKey: "about.uiFramework" },
    { icon: BookOpen, label: "Foliate.js", descKey: "about.ebookRenderer" },
    { icon: Shield, label: "SQLite", descKey: "about.localDatabase" },
  ];

  const links = [
    { icon: Github, label: "GitHub", url: "https://github.com/nicepkg/ReadAny" },
    { icon: ExternalLink, label: t("about.feedback"), url: "https://github.com/nicepkg/ReadAny/issues" },
  ];

  return (
    <div className="flex h-full flex-col bg-background">
      <header
        className="shrink-0 flex items-center gap-3 px-4 pb-3 border-b border-border bg-background"
        style={{ paddingTop: "calc(var(--safe-area-top) + 12px)" }}
      >
        <button type="button" className="p-1 -ml-1" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">{t("about.title")}</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Logo & Version */}
        <div className="flex flex-col items-center pt-10 pb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold">ReadAny</h2>
          <p className="mt-1 text-sm text-muted-foreground">v{version}</p>
          <p className="mt-3 px-8 text-center text-sm text-muted-foreground leading-relaxed">
            {t("about.desc")}
          </p>
        </div>

        {/* Tech Stack */}
        <div className="px-4 mb-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t("about.techStack")}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {techStack.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl bg-card border border-border p-3"
                >
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{t(item.descKey)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Links */}
        <div className="px-4 mb-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t("about.links")}
          </h3>
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            {links.map((link, idx) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3.5 active:bg-accent transition-colors"
                  style={
                    idx < links.length - 1
                      ? { borderBottom: "1px solid var(--border)" }
                      : undefined
                  }
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="flex-1 text-base">{link.label}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              );
            })}
          </div>
        </div>

        <p className="mt-4 mb-8 text-center text-xs text-muted-foreground">
          Made with ❤️ by NicePkg
        </p>
      </div>
    </div>
  );
}
