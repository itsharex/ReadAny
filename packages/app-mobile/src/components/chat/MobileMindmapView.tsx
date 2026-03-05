/**
 * MobileMindmapView — renders a mindmap from Markdown using markmap.
 * Mobile-optimized: no fullscreen overlay, uses horizontal scroll + pinch zoom.
 */
import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import { Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

interface MobileMindmapViewProps {
  markdown: string;
  title?: string;
}

const transformer = new Transformer();

export function MobileMindmapView({ markdown, title }: MobileMindmapViewProps) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const [expanded, setExpanded] = useState(false);
  const fullscreenSvgRef = useRef<SVGSVGElement>(null);
  const fullscreenMarkmapRef = useRef<Markmap | null>(null);

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
        maxWidth: 200,
        paddingX: 12,
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
        maxWidth: 300,
        paddingX: 16,
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

  return (
    <>
      <div className="relative my-2 rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {title || t("mindmap.title")}
          </span>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded p-1 active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <Maximize2 className="h-3.5 w-3.5 text-neutral-500" />
          </button>
        </div>
        <svg ref={svgRef} className="h-[280px] w-full" />
      </div>

      {/* Fullscreen overlay */}
      {expanded && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
          />
          <div className="relative z-10 m-3 flex h-[85vh] w-[95vw] flex-col rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-700">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {title || t("mindmap.title")}
              </span>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded p-1.5 active:bg-neutral-100 dark:active:bg-neutral-800"
              >
                <Minimize2 className="h-4 w-4 text-neutral-500" />
              </button>
            </div>
            <svg ref={fullscreenSvgRef} className="h-full w-full flex-1" />
          </div>
        </div>
      )}
    </>
  );
}
