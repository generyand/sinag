"use client";
"use no memo";

import { RotateDirection, SpecialZoomLevel, Viewer, Worker } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import {
  highlightPlugin,
  RenderHighlightContentProps,
  RenderHighlightsProps,
  RenderHighlightTargetProps,
} from "@react-pdf-viewer/highlight";
import "@react-pdf-viewer/highlight/lib/styles/index.css";
import { rotatePlugin } from "@react-pdf-viewer/rotate";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import { Highlighter, RotateCcw, RotateCw, Square } from "lucide-react";
import * as React from "react";

import { AnnotationCommentDialog } from "@/components/shared/AnnotationCommentDialog";
import { Button } from "@/components/ui/button";
import { MovPreviewHelp } from "@/components/shared/MovPreviewHelp";
import { MovPreviewControls } from "@/components/shared/MovPreviewControls";

const DEFAULT_ZOOM = 100;
const MIN_ZOOM = 50;
const MAX_ZOOM = 300;
const ZOOM_STEP = 25;

interface PdfRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PdfDrawPreview {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PdfDrawDraft {
  page: number;
  rect: PdfRect;
  preview: PdfDrawPreview;
}

type PdfAnnotationMode = "highlight" | "draw";

export interface PdfAnnotationItem {
  id: string;
  type: "pdfRect";
  page: number;
  rect: PdfRect; // primary rect (first rect for multi-line selection)
  rects?: PdfRect[]; // optional multi-line rects from selection
  comment: string;
  createdAt: string;
}

interface PdfAnnotatorProps {
  url: string;
  annotateEnabled: boolean;
  annotations: PdfAnnotationItem[];
  onAdd: (annotation: PdfAnnotationItem) => void;
  onDelete?: (id: string) => void;
  focusAnnotationId?: string;
  focusRequestNonce?: number;
}

export default function PdfAnnotator({
  url,
  annotateEnabled,
  annotations,
  onAdd,
  focusAnnotationId,
  focusRequestNonce,
}: PdfAnnotatorProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = React.useState(DEFAULT_ZOOM);
  const [viewerStateKey, setViewerStateKey] = React.useState(0);
  const [annotationMode, setAnnotationMode] = React.useState<PdfAnnotationMode>("highlight");
  const [pendingAnnotation, setPendingAnnotation] = React.useState<Omit<
    PdfAnnotationItem,
    "comment"
  > | null>(null);
  const [drawStart, setDrawStart] = React.useState<{
    pageEl: HTMLElement;
    pageIndex: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const [currentDraw, setCurrentDraw] = React.useState<PdfDrawDraft | null>(null);

  // The highlight plugin provides selection -> trigger UI -> save data
  // NOTE: Do NOT memoize this with useMemo([], []) - the plugin has internal
  // useEffect hooks that track highlight areas and become stale when memoized,
  // causing "Cannot read properties of undefined (reading 'length')" crashes.
  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget: (props: RenderHighlightTargetProps) => {
      const anyProps: any = props as any;

      const cssProps = anyProps?.getCssProperties;
      const baseStyle = cssProps
        ? cssProps(props.selectionRegion)
        : {
            left: `${props.selectionRegion.left}%`,
            top: `${props.selectionRegion.top}%`,
            width: `${props.selectionRegion.width}%`,
            height: `${props.selectionRegion.height}%`,
          };
      return (
        <div
          style={{
            position: "absolute",
            ...baseStyle,
            transform: "translateY(-120%)",
            width: "auto",
            height: "auto",
            zIndex: 10,
            display: annotateEnabled && annotationMode === "highlight" ? "block" : "none",
          }}
        >
          <button
            type="button"
            className="rounded bg-black/80 text-white text-xs px-2 py-1 cursor-pointer shadow"
            onClick={() => {
              const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

              // Try to get page index from highlightAreas first (most reliable)
              let pageFromHighlightAreas: number | undefined;
              if (Array.isArray(anyProps?.highlightAreas) && anyProps.highlightAreas.length > 0) {
                pageFromHighlightAreas = anyProps.highlightAreas[0]?.pageIndex;
              }

              // Prefer page index from selectedText.position.pageIndex, then other fallbacks
              const resolvedPageIndex =
                pageFromHighlightAreas ??
                anyProps?.selectedText?.position?.pageIndex ??
                (typeof anyProps?.pageIndex === "number" ? anyProps.pageIndex : undefined) ??
                anyProps?.selectedText?.pageIndex ??
                anyProps?.selectionRegion?.pageIndex ??
                anyProps?.page?.index ??
                0;

              // Try to derive rects from DOM selection client rects (covers multi-line reliably)
              const collectRectsFromSelection = (): {
                rects: PdfRect[];
                pageIndexOverride?: number;
              } => {
                try {
                  const sel = window.getSelection();
                  if (!sel || sel.rangeCount === 0) return { rects: [] };

                  // Find the page element containing the selection
                  const findPageEl = (node: Node | null): HTMLElement | null => {
                    let el: HTMLElement | null =
                      (node as HTMLElement) && (node as HTMLElement).nodeType === 1
                        ? (node as HTMLElement)
                        : (node?.parentElement ?? null);
                    while (el) {
                      // Check for data-page-number attribute (pdf.js uses this)
                      if (el.getAttribute && el.getAttribute("data-page-number")) {
                        return el;
                      }
                      // Check for rpv-core__inner-page class (react-pdf-viewer page container)
                      if (el.classList && el.classList.contains("rpv-core__inner-page")) {
                        return el;
                      }
                      // Also check for rpv-core__page-layer class
                      if (el.classList && el.classList.contains("rpv-core__page-layer")) {
                        return el;
                      }
                      el = el.parentElement;
                    }
                    return null;
                  };

                  // Try to find page from both anchor and focus nodes
                  let pageEl = findPageEl(sel.anchorNode) || findPageEl(sel.focusNode);

                  // If still no page found, try finding from the first range's common ancestor
                  if (!pageEl && sel.rangeCount > 0) {
                    const range = sel.getRangeAt(0);
                    pageEl = findPageEl(range.commonAncestorContainer);
                  }

                  // Last resort: find page element by checking which page contains the selection rect
                  if (!pageEl) {
                    const range = sel.getRangeAt(0);
                    const selRect = range.getBoundingClientRect();
                    const container = containerRef.current;
                    if (container) {
                      // Try multiple selectors that pdf.js/react-pdf-viewer might use
                      // The react-pdf-viewer uses .rpv-core__inner-page for each page
                      const pageSelectors = [
                        "[data-page-number]",
                        ".rpv-core__inner-page",
                        ".rpv-core__page-layer",
                        '[data-testid="core__page-layer"]',
                        ".react-pdf__Page",
                      ];
                      for (const selector of pageSelectors) {
                        const pages = container.querySelectorAll(selector);
                        for (let i = 0; i < pages.length; i++) {
                          const p = pages[i];
                          const pageRect = p.getBoundingClientRect();
                          // Check if selection overlaps with this page's bounds
                          if (
                            selRect.top >= pageRect.top - 10 &&
                            selRect.top <= pageRect.bottom + 10
                          ) {
                            pageEl = p as HTMLElement;
                            // Store the page index (0-based) on the element for later use
                            const existingPageNum = pageEl.getAttribute("data-page-number");
                            if (!existingPageNum) {
                              // Set data-page-number as 1-based (i + 1)
                              pageEl.setAttribute("data-page-number", String(i + 1));
                            }
                            break;
                          }
                        }
                        if (pageEl) break;
                      }
                    }
                  }

                  if (!pageEl) return { rects: [] };

                  const pageBox = pageEl.getBoundingClientRect();
                  const toPct = (r: DOMRect): PdfRect => ({
                    x: ((r.left - pageBox.left) / pageBox.width) * 100,
                    y: ((r.top - pageBox.top) / pageBox.height) * 100,
                    w: (r.width / pageBox.width) * 100,
                    h: (r.height / pageBox.height) * 100,
                  });
                  const rects: PdfRect[] = [];
                  for (let i = 0; i < sel.rangeCount; i++) {
                    const range = sel.getRangeAt(i);
                    const crs = range.getClientRects();
                    for (let j = 0; j < crs.length; j++) {
                      const cr = crs.item(j)!;
                      if (cr.width < 1 || cr.height < 1) continue;
                      rects.push(toPct(cr));
                    }
                  }
                  // Merge contiguous word boxes on the same line into a single line rect
                  const mergeToleranceY = 1.0; // percent
                  const mergeToleranceH = 1.0; // percent
                  const sorted = rects
                    .slice()
                    .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
                  const merged: PdfRect[] = [];
                  let lineGroup: PdfRect[] = [];
                  const flushLine = () => {
                    if (lineGroup.length === 0) return;
                    const minX = Math.min(...lineGroup.map((r) => r.x));
                    const maxX = Math.max(...lineGroup.map((r) => r.x + r.w));
                    const base = lineGroup[0];
                    const height = Math.max(...lineGroup.map((r) => r.h));
                    merged.push({ x: minX, y: base.y, w: Math.max(0, maxX - minX), h: height });
                    lineGroup = [];
                  };
                  for (const r of sorted) {
                    if (lineGroup.length === 0) {
                      lineGroup.push(r);
                      continue;
                    }
                    const ref = lineGroup[0];
                    const sameLine =
                      Math.abs(r.y - ref.y) <= mergeToleranceY &&
                      Math.abs(r.h - ref.h) <= mergeToleranceH;
                    if (sameLine) lineGroup.push(r);
                    else {
                      flushLine();
                      lineGroup.push(r);
                    }
                  }
                  flushLine();

                  // Get page number from the found page element
                  const pn = pageEl.getAttribute("data-page-number");
                  let pageIndexOverride: number | undefined;

                  if (pn) {
                    pageIndexOverride = Math.max(0, parseInt(pn, 10) - 1);
                  } else {
                    // No data-page-number attribute - determine page index from sibling position
                    const container = containerRef.current;
                    if (container) {
                      // Find all page elements and determine which one this is
                      const allPages = container.querySelectorAll(".rpv-core__inner-page");
                      for (let i = 0; i < allPages.length; i++) {
                        if (allPages[i] === pageEl || allPages[i].contains(pageEl)) {
                          pageIndexOverride = i;
                          break;
                        }
                      }
                      // Also try with page-layer
                      if (pageIndexOverride === undefined) {
                        const allPageLayers = container.querySelectorAll(".rpv-core__page-layer");
                        for (let i = 0; i < allPageLayers.length; i++) {
                          if (allPageLayers[i] === pageEl || allPageLayers[i].contains(pageEl)) {
                            pageIndexOverride = i;
                            break;
                          }
                        }
                      }
                    }
                  }

                  return { rects: merged, pageIndexOverride };
                } catch (err) {
                  console.error("[PdfAnnotator] Error in collectRectsFromSelection:", err);
                  return { rects: [] };
                }
              };
              const selInfo = collectRectsFromSelection();
              // Capture multi-line rects from multiple possible locations and shapes
              const collectRects = (): PdfRect[] => {
                const results: PdfRect[] = [];
                const pushMapped = (arr: any[]) => {
                  for (const r of arr) {
                    if (r == null) continue;
                    const left = r.left ?? r.x;
                    const top = r.top ?? r.y;
                    const width = r.width ?? r.w;
                    const height = r.height ?? r.h;
                    if (
                      typeof left === "number" &&
                      typeof top === "number" &&
                      typeof width === "number" &&
                      typeof height === "number"
                    ) {
                      results.push({ x: left, y: top, w: width, h: height });
                    }
                  }
                };
                // Common paths
                if (Array.isArray(anyProps?.selectedText)) {
                  for (const item of anyProps.selectedText) {
                    const rects =
                      item?.position?.rects || item?.rects || item?.selectionRects || [];
                    if (Array.isArray(rects)) pushMapped(rects);
                  }
                } else if (anyProps?.selectedText) {
                  const rects =
                    anyProps?.selectedText?.position?.rects ||
                    anyProps?.selectedText?.rects ||
                    anyProps?.selectedText?.selectionRects ||
                    [];
                  if (Array.isArray(rects)) pushMapped(rects);
                }
                // Alternative props names seen across versions
                if (Array.isArray(anyProps?.selectedTextPosition?.rects))
                  pushMapped(anyProps.selectedTextPosition.rects);
                if (Array.isArray(anyProps?.selectionData?.rects))
                  pushMapped(anyProps.selectionData.rects);
                if (Array.isArray(anyProps?.selectionRegion?.rects))
                  pushMapped(anyProps.selectionRegion.rects);
                if (selInfo.rects.length > 0) return selInfo.rects;
                return results;
              };
              let rects: PdfRect[] = collectRects();
              if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
                try {
                  console.log("[PdfAnnotator] collected rects (pre-normalize)", rects);
                } catch {}
              }
              // Normalize if values look like 0..1 by converting to percentages
              if (rects.length > 0) {
                const looksUnit = (v: number) => v <= 1 && v >= 0;
                const needsScale = rects.some(
                  (r) => looksUnit(r.x) && looksUnit(r.y) && looksUnit(r.w) && looksUnit(r.h)
                );
                if (needsScale) {
                  rects = rects.map((r) => ({
                    x: r.x * 100,
                    y: r.y * 100,
                    w: r.w * 100,
                    h: r.h * 100,
                  }));
                }
              }
              if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
                try {
                  console.log("[PdfAnnotator] rects (final)", rects);
                } catch {}
              }
              const pageIndexFinal = selInfo.pageIndexOverride ?? resolvedPageIndex;

              const primaryRect: PdfRect =
                rects.length > 0
                  ? rects[0]
                  : {
                      x: props.selectionRegion.left,
                      y: props.selectionRegion.top,
                      w: props.selectionRegion.width,
                      h: props.selectionRegion.height,
                    };
              setPendingAnnotation({
                id,
                type: "pdfRect",
                page: pageIndexFinal,
                rect: primaryRect,
                rects: rects.length > 0 ? rects : undefined,
                createdAt: new Date().toISOString(),
              });
              // Clear selection if API provides a cancel function
              if (typeof anyProps.cancel === "function") anyProps.cancel();
            }}
          >
            Add comment
          </button>
        </div>
      );
    },
    renderHighlightContent: (_props: RenderHighlightContentProps) => <></>,
    renderHighlights: (props: RenderHighlightsProps) => {
      const safeAnnotations = Array.isArray(annotations) ? annotations : [];
      const pageAnns = safeAnnotations.filter((a) => a.page === props.pageIndex);
      return (
        <>
          {pageAnns.map((a, idx) => (
            <div
              key={a.id || `temp-${idx}`}
              data-ann-id={a.id}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                pointerEvents: "none",
                zIndex: 100,
              }}
            >
              {(() => {
                const sourceRects =
                  Array.isArray(a.rects) && a.rects.length > 0
                    ? a.rects
                    : a.rect
                      ? [a.rect]
                      : [{ x: 0, y: 0, w: 0, h: 0 }];
                const first = sourceRects[0];
                const anyRProps: any = props as any;
                const rectCssFrom = (r: PdfRect) =>
                  anyRProps?.getCssProperties
                    ? anyRProps.getCssProperties({
                        left: r.x,
                        top: r.y,
                        width: r.w,
                        height: r.h,
                      })
                    : { left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` };
                const badgeCss = anyRProps?.getCssProperties
                  ? anyRProps.getCssProperties({
                      left: first.x,
                      top: first.y,
                      width: 0,
                      height: 0,
                    })
                  : { left: `${first.x}%`, top: `${first.y}%` };
                return (
                  <>
                    {sourceRects.map((r, i) => (
                      <div
                        key={i}
                        data-ann-rect-id={i === 0 ? a.id : undefined}
                        style={{
                          position: "absolute",
                          ...rectCssFrom(r),
                          backgroundColor: "rgba(250, 204, 21, 0.35)",
                          border: "2px solid rgb(250, 204, 21)",
                          borderRadius: "0.125rem",
                          pointerEvents: "none",
                          zIndex: 110,
                        }}
                      />
                    ))}
                    <div
                      style={{
                        position: "absolute",
                        ...badgeCss,
                        transform: "translate(-8px, -18px)",
                        fontSize: 10,
                        background: "rgb(250, 204, 21)",
                        color: "#000",
                        borderRadius: 4,
                        padding: "2px 4px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                        pointerEvents: "none",
                        zIndex: 110,
                      }}
                    >
                      {idx + 1}
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
        </>
      );
    },
  });
  // These plugin factories use hooks internally, so they must be called at
  // component render time instead of inside useMemo/useState initializers.
  void viewerStateKey;
  const zoomPluginInstance = zoomPlugin();
  const rotatePluginInstance = rotatePlugin();

  const handleZoomIn = () => {
    setZoom((currentZoom) => {
      const nextZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP);
      zoomPluginInstance.zoomTo(nextZoom / 100);
      return nextZoom;
    });
  };

  const handleZoomOut = () => {
    setZoom((currentZoom) => {
      const nextZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP);
      zoomPluginInstance.zoomTo(nextZoom / 100);
      return nextZoom;
    });
  };

  const handleResetView = () => {
    setZoom(DEFAULT_ZOOM);
    setViewerStateKey((currentKey) => currentKey + 1);
  };

  // Scroll to a specific annotation id when requested
  React.useEffect(() => {
    if (!focusAnnotationId) return;
    const root = containerRef.current;
    if (!root) return;

    const safeAnns = Array.isArray(annotations) ? annotations : [];
    const target = safeAnns.find((a) => a.id === focusAnnotationId);
    const pageIndex = typeof target?.page === "number" ? target!.page : 0;

    let cancelled = false;
    const timers: number[] = [];

    const focusHighlight = (attempt = 0) => {
      if (cancelled) return;

      const pageEl = root.querySelector(
        `div[data-page-number="${pageIndex + 1}"]`
      ) as HTMLElement | null;

      if (pageEl && typeof pageEl.scrollIntoView === "function") {
        pageEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      const targetRect = root.querySelector(
        `[data-ann-rect-id="${CSS.escape(focusAnnotationId)}"]`
      ) as HTMLElement | null;

      if (!targetRect) {
        if (attempt < 12) {
          timers.push(window.setTimeout(() => focusHighlight(attempt + 1), 120));
        }
        return;
      }

      targetRect.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

      const wrapper = root.querySelector(
        `[data-ann-id="${CSS.escape(focusAnnotationId)}"]`
      ) as HTMLElement | null;

      try {
        const parts = Array.from(wrapper?.children ?? []) as HTMLElement[];
        if (parts.length === 0) return;

        parts.forEach((part, index) => {
          if (index === parts.length - 1) {
            part.style.transform = "translate(-8px, -18px) scale(1.08)";
            part.style.boxShadow = "0 0 0 3px rgba(245, 158, 11, 0.25)";
            part.style.transition = "transform 180ms ease, box-shadow 180ms ease";
          } else {
            part.style.outline = "3px solid #f59e0b";
            part.style.outlineOffset = "2px";
            part.style.backgroundColor = "rgba(245, 158, 11, 0.45)";
            part.style.boxShadow = "0 0 0 4px rgba(245, 158, 11, 0.2)";
            part.style.transition =
              "outline 180ms ease, background-color 180ms ease, box-shadow 180ms ease";
          }
        });

        timers.push(
          window.setTimeout(() => {
            parts.forEach((part, index) => {
              if (index === parts.length - 1) {
                part.style.transform = "translate(-8px, -18px)";
                part.style.boxShadow = "0 1px 2px rgba(0,0,0,0.2)";
              } else {
                part.style.outline = "none";
                part.style.backgroundColor = "rgba(250, 204, 21, 0.35)";
                part.style.boxShadow = "none";
              }
            });
          }, 1400)
        );
      } catch {}
    };

    focusHighlight();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [focusAnnotationId, focusRequestNonce, annotations]);

  React.useEffect(() => {
    setZoom(DEFAULT_ZOOM);
    setViewerStateKey((currentKey) => currentKey + 1);
    setDrawStart(null);
    setCurrentDraw(null);
    setAnnotationMode("highlight");
  }, [url]);

  const resolvePageIndex = React.useCallback((pageEl: HTMLElement) => {
    const pageNumberAttr = pageEl.getAttribute("data-page-number");
    if (pageNumberAttr) {
      const parsed = Number.parseInt(pageNumberAttr, 10);
      if (!Number.isNaN(parsed)) {
        return Math.max(0, parsed - 1);
      }
    }

    const container = containerRef.current;
    if (!container) return 0;

    const allPages = Array.from(container.querySelectorAll(".rpv-core__inner-page"));
    const index = allPages.findIndex((node) => node === pageEl || node.contains(pageEl));
    return index >= 0 ? index : 0;
  }, []);

  const findPageElementAtPoint = React.useCallback(
    (clientX: number, clientY: number): HTMLElement | null => {
      const candidates =
        typeof document.elementsFromPoint === "function"
          ? document.elementsFromPoint(clientX, clientY)
          : [document.elementFromPoint(clientX, clientY)].filter(Boolean);

      for (const candidate of candidates) {
        let el = candidate as HTMLElement | null;
        while (el) {
          if (
            el.getAttribute?.("data-page-number") ||
            el.classList?.contains("rpv-core__inner-page") ||
            el.classList?.contains("rpv-core__page-layer")
          ) {
            if (el.classList?.contains("rpv-core__page-layer")) {
              return el.parentElement;
            }
            return el;
          }
          el = el.parentElement;
        }
      }

      return null;
    },
    []
  );

  const buildDrawDraft = React.useCallback(
    (
      pageEl: HTMLElement,
      pageIndex: number,
      startClientX: number,
      startClientY: number,
      currentClientX: number,
      currentClientY: number
    ): PdfDrawDraft | null => {
      const container = containerRef.current;
      if (!container) return null;

      const pageBox = pageEl.getBoundingClientRect();
      const containerBox = container.getBoundingClientRect();

      if (!pageBox.width || !pageBox.height) return null;

      const clamp = (value: number, min: number, max: number) =>
        Math.min(Math.max(value, min), max);

      const startX = clamp(startClientX, pageBox.left, pageBox.right);
      const startY = clamp(startClientY, pageBox.top, pageBox.bottom);
      const endX = clamp(currentClientX, pageBox.left, pageBox.right);
      const endY = clamp(currentClientY, pageBox.top, pageBox.bottom);

      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      return {
        page: pageIndex,
        rect: {
          x: ((left - pageBox.left) / pageBox.width) * 100,
          y: ((top - pageBox.top) / pageBox.height) * 100,
          w: (width / pageBox.width) * 100,
          h: (height / pageBox.height) * 100,
        },
        preview: {
          left: left - containerBox.left + container.scrollLeft,
          top: top - containerBox.top + container.scrollTop,
          width,
          height,
        },
      };
    },
    []
  );

  const handleDrawStart = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!annotateEnabled || annotationMode !== "draw") return;

      const pageEl = findPageElementAtPoint(event.clientX, event.clientY);
      if (!pageEl) return;

      const pageIndex = resolvePageIndex(pageEl);
      setDrawStart({
        pageEl,
        pageIndex,
        clientX: event.clientX,
        clientY: event.clientY,
      });
      setCurrentDraw(null);
    },
    [annotateEnabled, annotationMode, findPageElementAtPoint, resolvePageIndex]
  );

  const handleDrawMove = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!drawStart) return;
      const draft = buildDrawDraft(
        drawStart.pageEl,
        drawStart.pageIndex,
        drawStart.clientX,
        drawStart.clientY,
        event.clientX,
        event.clientY
      );
      setCurrentDraw(draft);
    },
    [buildDrawDraft, drawStart]
  );

  const finishDraw = React.useCallback(() => {
    if (!drawStart || !currentDraw) {
      setDrawStart(null);
      setCurrentDraw(null);
      return;
    }

    setDrawStart(null);

    if (currentDraw.rect.w <= 1 || currentDraw.rect.h <= 1) {
      setCurrentDraw(null);
      return;
    }

    setPendingAnnotation({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "pdfRect",
      page: currentDraw.page,
      rect: currentDraw.rect,
      rects: [currentDraw.rect],
      createdAt: new Date().toISOString(),
    });
    setCurrentDraw(null);
  }, [currentDraw, drawStart]);

  return (
    <>
      <div className="flex h-full w-full flex-col bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900/60">
          {annotateEnabled ? (
            <div className="inline-flex flex-col items-start gap-1">
              <div
                className="inline-flex items-center rounded-md border border-slate-200 bg-white/90 p-1 shadow-sm"
                role="group"
                aria-label="PDF annotation mode"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={annotationMode === "highlight" ? "default" : "ghost"}
                  className="h-8 gap-1.5 px-3 text-xs"
                  onClick={() => {
                    setAnnotationMode("highlight");
                    setDrawStart(null);
                    setCurrentDraw(null);
                  }}
                >
                  <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Highlight text</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={annotationMode === "draw" ? "default" : "ghost"}
                  className="h-8 gap-1.5 px-3 text-xs"
                  onClick={() => {
                    setAnnotationMode("draw");
                    setDrawStart(null);
                    setCurrentDraw(null);
                  }}
                >
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Draw box</span>
                </Button>
              </div>
              <p className="max-w-xs pl-1 text-xs leading-4 text-slate-500">
                {annotationMode === "highlight"
                  ? "Select text to mark a specific line or phrase."
                  : "Drag to mark a photo, signature, or scanned section."}
              </p>
            </div>
          ) : (
            <div />
          )}
          <MovPreviewControls
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            zoomStep={ZOOM_STEP}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleResetView}
            onRotateLeft={() => {}}
            onRotateRight={() => {}}
            helpControl={<MovPreviewHelp mode="pdf" />}
            rotateLeftControl={
              <rotatePluginInstance.Rotate direction={RotateDirection.Backward}>
                {({ onClick }) => (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={onClick}
                    aria-label="Rotate left"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </rotatePluginInstance.Rotate>
            }
            rotateRightControl={
              <rotatePluginInstance.Rotate direction={RotateDirection.Forward}>
                {({ onClick }) => (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={onClick}
                    aria-label="Rotate right"
                  >
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </rotatePluginInstance.Rotate>
            }
          />
        </div>
        <div ref={containerRef} className="min-h-0 flex-1 overflow-auto relative">
          <Worker workerUrl="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Viewer
              key={`${url}-${viewerStateKey}`}
              fileUrl={url}
              defaultScale={SpecialZoomLevel.PageWidth}
              plugins={[highlightPluginInstance, zoomPluginInstance, rotatePluginInstance]}
            />
          </Worker>
          {annotateEnabled && annotationMode === "draw" ? (
            <div
              data-testid="pdf-draw-layer"
              className="absolute inset-0 z-20"
              style={{ cursor: "crosshair" }}
              onMouseDown={handleDrawStart}
              onMouseMove={handleDrawMove}
              onMouseUp={finishDraw}
              onMouseLeave={() => {
                setDrawStart(null);
                setCurrentDraw(null);
              }}
            >
              {currentDraw ? (
                <div
                  className="absolute rounded-[2px] border-2 border-blue-500 bg-blue-500/20"
                  style={{
                    left: currentDraw.preview.left,
                    top: currentDraw.preview.top,
                    width: currentDraw.preview.width,
                    height: currentDraw.preview.height,
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <AnnotationCommentDialog
        open={pendingAnnotation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAnnotation(null);
          }
        }}
        onSave={(comment) => {
          if (!pendingAnnotation) return;
          onAdd({
            ...pendingAnnotation,
            comment,
          });
          setPendingAnnotation(null);
        }}
      />
    </>
  );
}
