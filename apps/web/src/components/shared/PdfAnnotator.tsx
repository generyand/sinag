"use client";

import { SpecialZoomLevel, Viewer, Worker } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { highlightPlugin, RenderHighlightContentProps, RenderHighlightsProps, RenderHighlightTargetProps } from '@react-pdf-viewer/highlight';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import * as React from 'react';

interface PdfRect {
  x: number; y: number; w: number; h: number;
}

export interface PdfAnnotationItem {
  id: string;
  type: 'pdfRect';
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
}

export default function PdfAnnotator({ url, annotateEnabled, annotations, onAdd, focusAnnotationId }: PdfAnnotatorProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  // The highlight plugin provides selection -> trigger UI -> save data
  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget: (props: RenderHighlightTargetProps) => {
      const anyProps: any = props as any;
      const cssProps = anyProps?.getCssProperties;
      const baseStyle = cssProps ? cssProps(props.selectionRegion) : {
        left: `${props.selectionRegion.left}%`,
        top: `${props.selectionRegion.top}%`,
        width: `${props.selectionRegion.width}%`,
        height: `${props.selectionRegion.height}%`,
      };
      return (
        <div
          style={{
            position: 'absolute',
            ...baseStyle,
            transform: 'translateY(-120%)',
            width: 'auto',
            height: 'auto',
            zIndex: 10,
            display: annotateEnabled ? 'block' : 'none',
          }}
        >
          <button
            type="button"
            className="rounded bg-black/80 text-white text-xs px-2 py-1 cursor-pointer shadow"
            onClick={() => {
            const comment = window.prompt('Add a comment for this highlight (optional):', '') || '';
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            // Prefer page index from selectedText.position.pageIndex, then other fallbacks
            const resolvedPageIndex =
              (anyProps?.selectedText?.position?.pageIndex)
              ?? (typeof anyProps?.pageIndex === 'number' ? anyProps.pageIndex : undefined)
              ?? anyProps?.selectedText?.pageIndex
              ?? anyProps?.selectionRegion?.pageIndex
              ?? anyProps?.page?.index
              ?? 0;
            // Try to derive rects from DOM selection client rects (covers multi-line reliably)
            const collectRectsFromSelection = (): { rects: PdfRect[]; pageIndexOverride?: number } => {
              try {
                const sel = window.getSelection();
                if (!sel || sel.rangeCount === 0) return { rects: [] };
                const findPageEl = (node: Node | null): HTMLElement | null => {
                  let el: HTMLElement | null = (node as HTMLElement) && (node as HTMLElement).nodeType === 1 ? (node as HTMLElement) : (node?.parentElement ?? null);
                  while (el) {
                    if (el.getAttribute && el.getAttribute('data-page-number')) return el;
                    if (el.classList && el.classList.contains('rpv-core__page-layer')) return el;
                    el = el.parentElement;
                  }
                  return null;
                };
                const pageEl = findPageEl(sel.anchorNode) || findPageEl(sel.focusNode);
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
                const sorted = rects.slice().sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
                const merged: PdfRect[] = [];
                let lineGroup: PdfRect[] = [];
                const flushLine = () => {
                  if (lineGroup.length === 0) return;
                  const minX = Math.min(...lineGroup.map(r => r.x));
                  const maxX = Math.max(...lineGroup.map(r => r.x + r.w));
                  const base = lineGroup[0];
                  const height = Math.max(...lineGroup.map(r => r.h));
                  merged.push({ x: minX, y: base.y, w: Math.max(0, maxX - minX), h: height });
                  lineGroup = [];
                };
                for (const r of sorted) {
                  if (lineGroup.length === 0) {
                    lineGroup.push(r);
                    continue;
                  }
                  const ref = lineGroup[0];
                  const sameLine = Math.abs(r.y - ref.y) <= mergeToleranceY && Math.abs(r.h - ref.h) <= mergeToleranceH;
                  if (sameLine) lineGroup.push(r); else { flushLine(); lineGroup.push(r); }
                }
                flushLine();
                const pn = pageEl.getAttribute('data-page-number');
                const pageIndexOverride = pn ? Math.max(0, parseInt(pn, 10) - 1) : undefined;
                return { rects: merged, pageIndexOverride };
              } catch {
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
                    typeof left === 'number' && typeof top === 'number' &&
                    typeof width === 'number' && typeof height === 'number'
                  ) {
                    results.push({ x: left, y: top, w: width, h: height });
                  }
                }
              };
              // Common paths
              if (Array.isArray(anyProps?.selectedText)) {
                for (const item of anyProps.selectedText) {
                  const rects = item?.position?.rects || item?.rects || item?.selectionRects || [];
                  if (Array.isArray(rects)) pushMapped(rects);
                }
              } else if (anyProps?.selectedText) {
                const rects = anyProps?.selectedText?.position?.rects
                  || anyProps?.selectedText?.rects
                  || anyProps?.selectedText?.selectionRects
                  || [];
                if (Array.isArray(rects)) pushMapped(rects);
              }
              // Alternative props names seen across versions
              if (Array.isArray(anyProps?.selectedTextPosition?.rects)) pushMapped(anyProps.selectedTextPosition.rects);
              if (Array.isArray(anyProps?.selectionData?.rects)) pushMapped(anyProps.selectionData.rects);
              if (Array.isArray(anyProps?.selectionRegion?.rects)) pushMapped(anyProps.selectionRegion.rects);
              if (selInfo.rects.length > 0) return selInfo.rects;
              return results;
            };
            let rects: PdfRect[] = collectRects();
            if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
              try {
                // eslint-disable-next-line no-console
                console.log('[PdfAnnotator] collected rects (pre-normalize)', rects);
              } catch {}
            }
            // Normalize if values look like 0..1 by converting to percentages
            if (rects.length > 0) {
              const looksUnit = (v: number) => v <= 1 && v >= 0;
              const needsScale = rects.some((r) => looksUnit(r.x) && looksUnit(r.y) && looksUnit(r.w) && looksUnit(r.h));
              if (needsScale) {
                rects = rects.map((r) => ({ x: r.x * 100, y: r.y * 100, w: r.w * 100, h: r.h * 100 }));
              }
            }
            if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
              try {
                // eslint-disable-next-line no-console
                console.log('[PdfAnnotator] rects (final)', rects);
              } catch {}
            }
            const pageIndexFinal = (selInfo.pageIndexOverride ?? resolvedPageIndex);
            const primaryRect: PdfRect = rects.length > 0
              ? rects[0]
              : { x: props.selectionRegion.left, y: props.selectionRegion.top, w: props.selectionRegion.width, h: props.selectionRegion.height };
            onAdd({
              id,
              type: 'pdfRect',
              page: pageIndexFinal,
              rect: primaryRect,
              rects: rects.length > 0 ? rects : undefined,
              comment,
              createdAt: new Date().toISOString(),
            });
              // Clear selection if API provides a cancel function
              if (typeof anyProps.cancel === 'function') anyProps.cancel();
            }}
          >
            Add comment
          </button>
        </div>
      );
    },
    renderHighlightContent: (_props: RenderHighlightContentProps) => <></>,
    renderHighlights: (props: RenderHighlightsProps) => {
      const pageAnns = annotations.filter((a) => a.page === props.pageIndex);
      return (
        <>
          {pageAnns.map((a, idx) => (
            <div key={a.id || `temp-${idx}`} data-ann-id={a.id} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 100 }}>
              {(() => {
                const sourceRects = Array.isArray(a.rects) && a.rects.length > 0 ? a.rects : [a.rect];
                const first = sourceRects[0];
                const anyRProps: any = props as any;
                const rectCssFrom = (r: PdfRect) => (
                  anyRProps?.getCssProperties
                    ? anyRProps.getCssProperties({ left: r.x, top: r.y, width: r.w, height: r.h })
                    : { left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }
                );
                const badgeCss = anyRProps?.getCssProperties
                  ? anyRProps.getCssProperties({ left: first.x, top: first.y, width: 0, height: 0 })
                  : { left: `${first.x}%`, top: `${first.y}%` };
                return (
                  <>
                    {sourceRects.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          ...rectCssFrom(r),
                          backgroundColor: 'rgba(250, 204, 21, 0.35)',
                          border: '2px solid rgb(250, 204, 21)',
                          borderRadius: '0.125rem',
                          pointerEvents: 'none',
                          zIndex: 110,
                        }}
                      />
                    ))}
                    <div
                      style={{
                        position: 'absolute',
                        ...badgeCss,
                        transform: 'translate(-8px, -18px)',
                        fontSize: 10,
                        background: 'rgb(250, 204, 21)',
                        color: '#000',
                        borderRadius: 4,
                        padding: '2px 4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                        pointerEvents: 'none',
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

  // Scroll to a specific annotation id when requested
  React.useEffect(() => {
    if (!focusAnnotationId) return;
    const root = containerRef.current;
    if (!root) return;
    // Determine the page of the target annotation
    const target = annotations.find((a) => a.id === focusAnnotationId);
    const pageIndex = typeof target?.page === 'number' ? target!.page : 0;
    // pdf.js uses data-page-number (1-based)
    const pageEl = root.querySelector(`div[data-page-number="${pageIndex + 1}"]`) as HTMLElement | null;
    if (pageEl && typeof pageEl.scrollIntoView === 'function') {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // After the page is centered, locate the exact highlight overlay and outline it
      window.setTimeout(() => {
        const el = root.querySelector(`[data-ann-id="${CSS.escape(focusAnnotationId)}"]`) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          try {
            const rect = el.firstElementChild as HTMLElement | null;
            if (rect) {
              rect.style.outline = '2px solid #2563eb';
              rect.style.outlineOffset = '2px';
              window.setTimeout(() => {
                rect.style.outline = 'none';
              }, 1200);
            }
          } catch {}
        }
      }, 150);
    }
  }, [focusAnnotationId, annotations]);

  return (
    <div ref={containerRef} className="h-full w-full bg-white overflow-auto relative">
      <Worker workerUrl="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer
          fileUrl={url}
          defaultScale={SpecialZoomLevel.PageWidth}
          plugins={[highlightPluginInstance]}
        />
      </Worker>
    </div>
  );
}


