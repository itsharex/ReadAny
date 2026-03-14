import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import { Maximize2, Minimize2, Download } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

interface MindmapViewProps {
  markdown: string;
  title?: string;
}

const transformer = new Transformer();

export function MindmapView({ markdown, title }: MindmapViewProps) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const fullscreenSvgRef = useRef<SVGSVGElement>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const fullscreenMarkmapRef = useRef<Markmap | null>(null);
  const [expanded, setExpanded] = useState(false);

  const renderMap = useCallback(() => {
    if (!svgRef.current || !markdown) return;

    const { root } = transformer.transform(markdown);

    if (markmapRef.current) {
      markmapRef.current.setData(root);
      markmapRef.current.fit();
    } else {
      markmapRef.current = Markmap.create(svgRef.current, {
        autoFit: true,
        duration: 300,
        maxWidth: 300,
        paddingX: 16,
      }, root);
    }
  }, [markdown]);

  const renderFullscreenMap = useCallback(() => {
    if (!fullscreenSvgRef.current || !markdown || !expanded) return;

    const { root } = transformer.transform(markdown);

    if (fullscreenMarkmapRef.current) {
      fullscreenMarkmapRef.current.setData(root);
      setTimeout(() => fullscreenMarkmapRef.current?.fit(), 100);
    } else {
      fullscreenMarkmapRef.current = Markmap.create(fullscreenSvgRef.current, {
        autoFit: true,
        duration: 300,
        maxWidth: 400,
        paddingX: 24,
      }, root);
    }
  }, [markdown, expanded]);

  useEffect(() => {
    renderMap();
  }, [renderMap]);

  useEffect(() => {
    if (expanded) {
      setTimeout(renderFullscreenMap, 50);
    } else {
      fullscreenMarkmapRef.current = null;
    }
  }, [expanded, renderFullscreenMap]);

  useEffect(() => {
    if (!expanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expanded]);

  const handleDownload = useCallback(() => {
    const svgElement = expanded ? fullscreenSvgRef.current : svgRef.current;
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `${title || t("mindmap.title")}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  }, [expanded, title, t]);

  const fullscreenOverlay = expanded
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
            onKeyDown={() => {}}
          />
          <div className="relative z-10 m-4 flex h-[90vh] w-[90vw] max-w-6xl flex-col rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-base font-medium text-foreground">
                {title || t("mindmap.title")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded p-1.5 hover:bg-muted transition-colors"
                  title={t("mindmap.download")}
                >
                  <Download className="h-5 w-5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="rounded p-1.5 hover:bg-muted transition-colors"
                  title={t("mindmap.exitFullscreen")}
                >
                  <Minimize2 className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <svg ref={fullscreenSvgRef} className="h-full w-full flex-1" />
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div className="relative rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium text-foreground">
            {title || t("mindmap.title")}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDownload}
              className="rounded p-1 hover:bg-muted transition-colors"
              title={t("mindmap.download")}
            >
              <Download className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded p-1 hover:bg-muted transition-colors"
              title={t("mindmap.fullscreen")}
            >
              <Maximize2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <svg ref={svgRef} className="h-[400px] w-full" />
      </div>

      {fullscreenOverlay}
    </>
  );
}
