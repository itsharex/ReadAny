import { useEffect, useRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import { Maximize2, Minimize2, Download, ZoomIn, ZoomOut } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

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
  const [scale, setScale] = useState(1);
  const [showTooltip, setShowTooltip] = useState(false);

  const renderMap = useCallback(() => {
    if (!svgRef.current || !markdown) return;

    const { root } = transformer.transform(markdown);

    if (markmapRef.current) {
      markmapRef.current.setData(root);
      markmapRef.current.fit();
    } else {
      const mm = Markmap.create(svgRef.current, {
        autoFit: false,
        fitRatio: 0.8,
        duration: 300,
        maxWidth: 300,
        paddingX: 16,
        style: (id: string) => `
          .${id} {
            --markmap-text-color: #333;
            --markmap-code-bg: #f5f5f5;
            --markmap-code-color: #333;
            --markmap-circle-open-bg: #fff;
          }
          .${id} .markmap-foreign {
            color: #333;
          }
          .${id} .markmap-foreign a {
            color: #0066cc;
          }
          .${id} .markmap-foreign a:hover {
            color: #0052a3;
          }
          .${id} .markmap-foreign code {
            color: #333;
            background-color: #f5f5f5;
          }
        `,
      }, root);
      markmapRef.current = mm;
      // Set initial scale to 1
      mm.svg.select('g').attr('transform', 'translate(400,200) scale(1)');
      setScale(1);
    }
  }, [markdown]);

  const renderFullscreenMap = useCallback(() => {
    if (!fullscreenSvgRef.current || !markdown || !expanded) return;

    const { root } = transformer.transform(markdown);

    if (fullscreenMarkmapRef.current) {
      fullscreenMarkmapRef.current.setData(root);
    } else {
      const mm = Markmap.create(fullscreenSvgRef.current, {
        autoFit: false,
        fitRatio: 0.8,
        duration: 300,
        maxWidth: 400,
        paddingX: 24,
        style: (id: string) => `
          .${id} {
            --markmap-text-color: #333;
            --markmap-code-bg: #f5f5f5;
            --markmap-code-color: #333;
            --markmap-circle-open-bg: #fff;
          }
          .${id} .markmap-foreign {
            color: #333;
          }
          .${id} .markmap-foreign a {
            color: #0066cc;
          }
          .${id} .markmap-foreign a:hover {
            color: #0052a3;
          }
          .${id} .markmap-foreign code {
            color: #333;
            background-color: #f5f5f5;
          }
        `,
      }, root);
      fullscreenMarkmapRef.current = mm;
      // Set initial scale to 1 (center in fullscreen container)
      mm.svg.select('g').attr('transform', `translate(${window.innerWidth * 0.45},${window.innerHeight * 0.45}) scale(1)`);
      setScale(1);
    }
  }, [markdown, expanded]);

  useEffect(() => {
    renderMap();
  }, [renderMap]);

  // Update scale display on interaction end
  useEffect(() => {
    const handleInteractionEnd = (e: Event) => {
      const target = e.target as HTMLElement;
      
      // Check if click is inside our mindmap containers
      const isInMindmap = target.closest('[data-mindmap="true"]');
      const isInFullscreen = target.closest('[data-fullscreen="true"]');
      
      if (!isInMindmap && !isInFullscreen) return;
      
      setTimeout(() => {
        const mm = isInFullscreen ? fullscreenMarkmapRef.current : markmapRef.current;
        
        if (mm) {
          const svg = mm.svg;
          const g = svg.select('g');
          const transform = g.attr('transform') || '';
          const scaleMatch = transform.match(/scale\(([^)]+)\)/);
          if (scaleMatch) {
            setScale(parseFloat(scaleMatch[1]));
          }
        }
      }, 350);
    };

    document.addEventListener('dblclick', handleInteractionEnd, true);

    return () => {
      document.removeEventListener('dblclick', handleInteractionEnd, true);
    };
  }, []);

  // Reset scale when expanding/collapsing
  useEffect(() => {
    setScale(1);
  }, [expanded]);

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

    // Use original SVG to calculate bounds (more accurate)
    const gElement = svgElement.querySelector('g');
    let contentX = -500, contentY = -500, contentWidth = 2000, contentHeight = 1500;
    
    if (gElement) {
      try {
        // Get bbox from original SVG
        const bbox = gElement.getBBox();
        const padding = 50;
        contentX = bbox.x - padding;
        contentY = bbox.y - padding;
        contentWidth = bbox.width + padding * 2;
        contentHeight = bbox.height + padding * 2;
      } catch (e) {
        // Use defaults
      }
    }
    
    // Clone the SVG to modify it
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    
    // Reset transform on g element to show all content at original scale
    const clonedG = clonedSvg.querySelector('g');
    if (clonedG) {
      clonedG.setAttribute('transform', 'translate(0,0) scale(1)');
    }
    
    // Set viewBox to fit all content
    clonedSvg.setAttribute('viewBox', `${contentX} ${contentY} ${contentWidth} ${contentHeight}`);
    clonedSvg.setAttribute('width', String(contentWidth));
    clonedSvg.setAttribute('height', String(contentHeight));
    
    // Remove any existing width/height styles
    clonedSvg.style.width = '';
    clonedSvg.style.height = '';
    
    // Add white background
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("x", String(contentX));
    bgRect.setAttribute("y", String(contentY));
    bgRect.setAttribute("width", String(contentWidth));
    bgRect.setAttribute("height", String(contentHeight));
    bgRect.setAttribute("fill", "white");
    clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);
    
    // Add font styles and color overrides
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      .markmap {
        --markmap-text-color: #333 !important;
        --markmap-code-bg: #f5f5f5 !important;
        --markmap-code-color: #333 !important;
        --markmap-circle-open-bg: #fff !important;
      }
      .markmap-foreign {
        color: #333 !important;
      }
      text {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        fill: #333 !important;
      }
    `;
    clonedSvg.insertBefore(style, clonedSvg.firstChild);

    let svgData = new XMLSerializer().serializeToString(clonedSvg);
    // Replace any remaining CSS variables with actual values
    svgData = svgData.replace(/var\(--foreground\)/g, '#333');
    svgData = svgData.replace(/var\(--background\)/g, '#fff');
    svgData = svgData.replace(/var\(--muted\)/g, '#f5f5f5');
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `${title || t("mindmap.title")}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
    
    // Show success message
    toast.success(t("common.downloadSuccess", "图表已下载"));
  }, [expanded, title, t]);

  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(scale + 0.2, 3);
    setScale(newScale);
    // Apply zoom using markmap's transform
    if (markmapRef.current) {
      const svg = markmapRef.current.svg;
      const g = svg.select('g');
      const currentTransform = g.attr('transform') || '';
      const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (translateMatch) {
        const x = parseFloat(translateMatch[1]);
        const y = parseFloat(translateMatch[2]);
        g.attr('transform', `translate(${x},${y}) scale(${newScale})`);
      }
    }
    if (fullscreenMarkmapRef.current) {
      const svg = fullscreenMarkmapRef.current.svg;
      const g = svg.select('g');
      const currentTransform = g.attr('transform') || '';
      const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (translateMatch) {
        const x = parseFloat(translateMatch[1]);
        const y = parseFloat(translateMatch[2]);
        g.attr('transform', `translate(${x},${y}) scale(${newScale})`);
      }
    }
  }, [scale]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(scale - 0.2, 0.3);
    setScale(newScale);
    // Apply zoom using markmap's transform
    if (markmapRef.current) {
      const svg = markmapRef.current.svg;
      const g = svg.select('g');
      const currentTransform = g.attr('transform') || '';
      const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (translateMatch) {
        const x = parseFloat(translateMatch[1]);
        const y = parseFloat(translateMatch[2]);
        g.attr('transform', `translate(${x},${y}) scale(${newScale})`);
      }
    }
    if (fullscreenMarkmapRef.current) {
      const svg = fullscreenMarkmapRef.current.svg;
      const g = svg.select('g');
      const currentTransform = g.attr('transform') || '';
      const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (translateMatch) {
        const x = parseFloat(translateMatch[1]);
        const y = parseFloat(translateMatch[2]);
        g.attr('transform', `translate(${x},${y}) scale(${newScale})`);
      }
    }
  }, [scale]);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    // Reset transform to scale 1 without changing position
    if (markmapRef.current) {
      const svg = markmapRef.current.svg;
      const g = svg.select('g');
      const currentTransform = g.attr('transform') || '';
      const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (translateMatch) {
        const x = parseFloat(translateMatch[1]);
        const y = parseFloat(translateMatch[2]);
        g.attr('transform', `translate(${x},${y}) scale(1)`);
      }
    }
    if (fullscreenMarkmapRef.current) {
      const svg = fullscreenMarkmapRef.current.svg;
      const g = svg.select('g');
      const currentTransform = g.attr('transform') || '';
      const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (translateMatch) {
        const x = parseFloat(translateMatch[1]);
        const y = parseFloat(translateMatch[2]);
        g.attr('transform', `translate(${x},${y}) scale(1)`);
      }
    }
  }, []);

  const displayTitle = title && title.length > 20 ? title.slice(0, 20) + "..." : title;

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
              <span
                className="text-base font-medium text-foreground cursor-default"
                title={title && title.length > 20 ? title : undefined}
              >
                {displayTitle || t("mindmap.title")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="rounded p-1.5 hover:bg-muted transition-colors"
                  title={t("common.zoomOut", "缩小")}
                >
                  <ZoomOut className="h-5 w-5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="text-xs text-muted-foreground min-w-[3rem] hover:text-foreground transition-colors"
                  title={t("common.resetZoom", "重置缩放")}
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="rounded p-1.5 hover:bg-muted transition-colors"
                  title={t("common.zoomIn", "放大")}
                >
                  <ZoomIn className="h-5 w-5 text-muted-foreground" />
                </button>
                <div className="w-px h-5 bg-border mx-1" />
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
            <div className="flex-1 overflow-auto" data-fullscreen="true">
              <svg
                ref={fullscreenSvgRef}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div className="relative rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span
            className="text-sm font-medium text-foreground cursor-default"
            title={title && title.length > 20 ? title : undefined}
          >
            {displayTitle || t("mindmap.title")}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleZoomOut}
              className="rounded p-1 hover:bg-muted transition-colors"
              title={t("common.zoomOut", "缩小")}
            >
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="text-xs text-muted-foreground min-w-[3rem] text-center hover:text-foreground transition-colors"
              title={t("common.resetZoom", "重置缩放")}
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="rounded p-1 hover:bg-muted transition-colors"
              title={t("common.zoomIn", "放大")}
            >
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
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

        <div className="overflow-auto" style={{ height: 400 }} data-mindmap="true">
          <svg
            ref={svgRef}
            className="w-full h-full"
          />
        </div>
      </div>

      {fullscreenOverlay}
    </>
  );
}
