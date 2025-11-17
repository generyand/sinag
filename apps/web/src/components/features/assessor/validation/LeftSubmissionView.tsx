"use client";

import { getSignedUrl } from '@/lib/uploadMov';
import { resolveMovUrl } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AssessmentTreeNode } from '@/components/features/assessments/tree-navigation/AssessmentTreeNode';
import type { AssessmentDetailsResponse } from '@vantage/shared';
import type { GovernanceArea, Indicator } from '@/types/assessment';
import * as React from 'react';
import dynamic from 'next/dynamic';
const PdfAnnotator = dynamic(() => import('@/components/shared/PdfAnnotator'), { ssr: false });

interface LeftSubmissionViewProps {
  assessment: AssessmentDetailsResponse;
  expandedId?: number | null;
  onToggle?: (responseId: number) => void;
}

type AnyRecord = Record<string, any>;

export function LeftSubmissionView({ assessment, expandedId, onToggle }: LeftSubmissionViewProps) {
  // State for expanded governance areas
  const [expandedAreas, setExpandedAreas] = React.useState<Set<number>>(() => new Set());

  // Modal state for in-app MOV preview with next/prev
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalIndicatorTitle, setModalIndicatorTitle] = React.useState<string>('');
  const [modalMovs, setModalMovs] = React.useState<AnyRecord[]>([]);
  const [modalIndex, setModalIndex] = React.useState<number>(0);
  const [currentUrl, setCurrentUrl] = React.useState<string>('');
  const [currentExt, setCurrentExt] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [annotateMode, setAnnotateMode] = React.useState<boolean>(false);
  const [annotations, setAnnotations] = React.useState<AnyRecord[]>([]);
  const [focusAnnotationId, setFocusAnnotationId] = React.useState<string | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const drawingRef = React.useRef<{ startX: number; startY: number; active: boolean } | null>(null);
  const [previewRect, setPreviewRect] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [imageReady, setImageReady] = React.useState<boolean>(false);
  const [annotateLoaded, setAnnotateLoaded] = React.useState<boolean>(false);

  const data: AnyRecord = (assessment as unknown as AnyRecord) ?? {};
  const core = (data.assessment as AnyRecord) ?? data;
  const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];

  // Transform API response data to match BLGU Assessment tree structure
  const governanceAreas: GovernanceArea[] = React.useMemo(() => {
    const areaMap: Record<string, GovernanceArea> = {};

    responses.forEach((r) => {
      const indicator = (r.indicator as AnyRecord) ?? {};
      const govArea = (indicator.governance_area as AnyRecord) ?? {};
      const areaId = String(govArea.id || 0);
      const areaName = govArea.name || 'Unknown Area';
      const areaCode = govArea.code || '';

      // Create governance area if not exists
      if (!areaMap[areaId]) {
        areaMap[areaId] = {
          id: areaId,
          name: areaName,
          code: areaCode,
          indicators: [],
        };
      }

      // Create indicator in BLGU tree format
      const treeIndicator: Indicator = {
        id: String(r.id), // Use response ID as indicator ID for selection
        name: indicator.name || `Indicator ${r.indicator_id}`,
        code: indicator.code || '',
        status: 'completed', // All submitted indicators are considered completed
        description: indicator.description || '',
        technicalNotes: indicator.technical_notes || '',
      };

      areaMap[areaId].indicators.push(treeIndicator);
    });

    return Object.values(areaMap).sort((a, b) => Number(a.id) - Number(b.id));
  }, [responses]);

  const resolveMov = async (mov: AnyRecord): Promise<string> => {
    const key: string | null = mov?.storage_path || mov?.url || null;
    if (!key) return "";
    try {
      const signed = await getSignedUrl(key, 300);
      if (signed) {
        return signed;
      }
    } catch {
      // fall through
    }
    const fallback = resolveMovUrl(key) || key;
    return fallback as string;
  };

  const openMovModal = async (indicatorTitle: string, movs: AnyRecord[], startIndex: number) => {
    if (!movs || movs.length === 0) return;
    setModalIndicatorTitle(indicatorTitle);
    setModalMovs(movs);
    setModalIndex(Math.max(0, Math.min(startIndex, movs.length - 1)));
    setModalOpen(true);
  };

  // Load current URL whenever modalIndex/movs change
  React.useEffect(() => {
    if (!modalOpen || !modalMovs.length) return;
    const mov = modalMovs[modalIndex];
    if (!mov) return;
    const name: string = mov.original_filename || mov.filename || '';
    const ext = typeof name === 'string' && name.includes('.') ? String(name.split('.').pop() || '').toLowerCase() : '';
    setCurrentExt(ext);
    setIsLoading(true);
    resolveMov(mov)
      .then((url) => {
        setImageReady(false);
        setCurrentUrl(url);
      })
      .finally(() => setIsLoading(false));
    // Load annotations for this MOV from localStorage
    try {
      const key = String(mov.id || mov.storage_path || mov.url || '');
      const raw = window.localStorage.getItem(`mov-annotations:${key}`);
      setAnnotations(raw ? JSON.parse(raw) : []);
      const savedMode = window.localStorage.getItem(`mov-annotate-enabled:${key}`);
      setAnnotateMode(savedMode ? savedMode === '1' : ext === 'pdf');
      setAnnotateLoaded(true);
    } catch {
      setAnnotations([]);
      setAnnotateMode(false);
      setAnnotateLoaded(true);
    }
  }, [modalOpen, modalMovs, modalIndex]);

  const saveAnnotations = React.useCallback(() => {
    const mov = modalMovs[modalIndex];
    if (!mov) return;
    try {
      const key = String(mov.id || mov.storage_path || mov.url || '');
      window.localStorage.setItem(`mov-annotations:${key}`, JSON.stringify(annotations));
    } catch {
      // ignore
    }
  }, [annotations, modalMovs, modalIndex]);

  React.useEffect(() => {
    if (!modalOpen) return;
    saveAnnotations();
  }, [annotations, modalOpen, saveAnnotations]);

  // Persist annotate mode per MOV
  const persistAnnotateMode = React.useCallback((enabled: boolean) => {
    const mov = modalMovs[modalIndex];
    if (!mov) return;
    try {
      const key = String(mov.id || mov.storage_path || mov.url || '');
      window.localStorage.setItem(`mov-annotate-enabled:${key}`, String(enabled ? '1' : '0'));
    } catch {
      // ignore
    }
  }, [modalMovs, modalIndex]);

  React.useEffect(() => {
    if (!modalOpen || !annotateLoaded) return;
    persistAnnotateMode(annotateMode);
  }, [annotateMode, modalOpen, annotateLoaded, persistAnnotateMode]);

  const imageToNaturalRect = (rect: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return rect;
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    return { x: rect.x * scaleX, y: rect.y * scaleY, w: rect.w * scaleX, h: rect.h * scaleY };
  };

  const naturalToImageRect = (rect: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return rect;
    const scaleX = img.clientWidth / img.naturalWidth;
    const scaleY = img.clientHeight / img.naturalHeight;
    return { x: rect.x * scaleX, y: rect.y * scaleY, w: rect.w * scaleX, h: rect.h * scaleY };
  };

  const onImageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!annotateMode) return;
    const container = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - container.left;
    const y = e.clientY - container.top;
    drawingRef.current = { startX: x, startY: y, active: true };
    setPreviewRect({ x, y, w: 0, h: 0 });
  };

  const onImageMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!annotateMode || !drawingRef.current?.active) return;
    const container = e.currentTarget.getBoundingClientRect();
    const x2 = e.clientX - container.left;
    const y2 = e.clientY - container.top;
    const startX = drawingRef.current.startX;
    const startY = drawingRef.current.startY;
    drawingRef.current.active = false;
    const x = Math.min(startX, x2);
    const y = Math.min(startY, y2);
    const w = Math.abs(x2 - startX);
    const h = Math.abs(y2 - startY);
    setPreviewRect(null);
    if (w < 3 || h < 3) return; // ignore tiny selections
    const naturalRect = imageToNaturalRect({ x, y, w, h });
    const comment = window.prompt('Add a comment for this highlight (optional):', '') || '';
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setAnnotations((prev) => [...prev, { id, type: 'rect', rect: naturalRect, comment, createdAt: new Date().toISOString() }]);
  };

  const onImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!annotateMode || !drawingRef.current?.active) return;
    const container = e.currentTarget.getBoundingClientRect();
    const x2 = e.clientX - container.left;
    const y2 = e.clientY - container.top;
    const startX = drawingRef.current.startX;
    const startY = drawingRef.current.startY;
    const x = Math.min(startX, x2);
    const y = Math.min(startY, y2);
    const w = Math.abs(x2 - startX);
    const h = Math.abs(y2 - startY);
    setPreviewRect({ x, y, w, h });
  };

  const onImageContextMenu = (e: React.MouseEvent<HTMLDivElement | HTMLImageElement>) => {
    // Prevent browser's default context menu from appearing
    e.preventDefault();
  };

  const onDeleteAnnotation = (id: string) => {
    setAnnotations((prev) => {
      const next = prev.filter((a) => a.id !== id);
      // Persist deletion immediately
      try {
        const mov = modalMovs[modalIndex];
        if (mov) {
          const key = String(mov.id || mov.storage_path || mov.url || '');
          window.localStorage.setItem(`mov-annotations:${key}`, JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  };

  const formatPrimitive = (val: unknown): string => {
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (val === null || val === undefined) return '';
    if (val instanceof Date) return val.toLocaleString();
    return String(val);
  };

  const humanizeKey = (key: string): string => {
    try {
      const spaced = key.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      return spaced
        .toLowerCase()
        .split(' ')
        .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ');
    } catch {
      return key;
    }
  };

  const renderValue = (val: unknown, depth = 0): React.ReactNode => {
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-muted-foreground">None</span>;
      return (
        <ul className="list-disc pl-5 space-y-1">
          {val.map((item, i) => (
            <li key={i}>{typeof item === 'object' ? renderValue(item, depth + 1) : formatPrimitive(item)}</li>
          ))}
        </ul>
      );
    }
    if (val && typeof val === 'object') {
      const entries = Object.entries(val as Record<string, unknown>);
      if (entries.length === 0) return <span className="text-muted-foreground">Empty</span>;
      return (
        <dl className="grid grid-cols-1 gap-y-2">
          {entries.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[240px_1fr] items-start gap-4">
              <dt className="text-[12px] font-medium tracking-wide text-muted-foreground break-words">{humanizeKey(k)}</dt>
              <dd className="text-[13px] leading-5 break-words">{renderValue(v, depth + 1)}</dd>
            </div>
          ))}
        </dl>
      );
    }
    if (typeof val === 'boolean') {
      return (
        <span
          className={val ? 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white' : 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white'}
          style={{ background: val ? 'var(--success)' : 'var(--destructive, #ef4444)' }}
        >
          {formatPrimitive(val)}
        </span>
      );
    }
    return <span>{formatPrimitive(val)}</span>;
  };

  const toggleArea = (areaId: number) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
      } else {
        next.add(areaId);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <div className="text-sm font-medium text-foreground">BLGU Submission</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {responses.length} indicator{responses.length === 1 ? '' : 's'} submitted
        </div>
      </div>

      {/* Tree Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {responses.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No submitted responses.</div>
        ) : (
          governanceAreas.map((area) => {
            const isExpanded = expandedAreas.has(Number(area.id));
            const progress = {
              completed: area.indicators.length,
              total: area.indicators.length,
              percentage: 100, // All submitted indicators are complete
            };

            return (
              <div key={area.id}>
                {/* Governance Area Node */}
                <AssessmentTreeNode
                  type="area"
                  item={area}
                  isExpanded={isExpanded}
                  onToggle={() => toggleArea(Number(area.id))}
                  progress={progress}
                  level={0}
                />

                {/* Indicators (when expanded) */}
                {isExpanded && (
                  <div>
                    {area.indicators.map((indicator) => {
                      const isActive = expandedId === Number(indicator.id);
                      return (
                        <AssessmentTreeNode
                          key={indicator.id}
                          type="indicator"
                          item={indicator}
                          isActive={isActive}
                          onClick={() => onToggle?.(Number(indicator.id))}
                          level={1}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MOV Previewer Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => {
        if (!open) {
          // Persist any pending annotations on close
          try {
            saveAnnotations();
          } catch {}
        }
        setModalOpen(open);
      }}>
        <DialogContent className="max-w-5xl h-[90vh] bg-white border-0 outline-none focus:outline-none focus-visible:ring-0 overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>MOV Preview</DialogTitle>
            <DialogDescription>
              {modalIndicatorTitle} — File {modalIndex + 1} of {modalMovs.length}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3 mb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalIndex((i) => Math.max(0, i - 1))}
              disabled={modalIndex <= 0}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalIndex((i) => Math.min(modalMovs.length - 1, i + 1))}
              disabled={modalIndex >= modalMovs.length - 1}
            >
              Next
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 pb-4">
          <div className="h-[70vh] w-full border border-black/10 rounded bg-muted/20 overflow-hidden">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : currentUrl ? (
              currentExt === 'pdf' ? (
                <PdfAnnotator
                  url={currentUrl}
                  annotateEnabled={annotateMode}
                  annotations={annotations.filter((a) => a.type === 'pdfRect') as any}
                  focusAnnotationId={focusAnnotationId || undefined}
                  onAdd={(a: any) => {
                    setAnnotations((prev) => {
                      const next = [...prev, a];
                      // Synchronously persist to localStorage to avoid data loss on immediate close
                      try {
                        const mov = modalMovs[modalIndex];
                        if (mov) {
                          const key = String(mov.id || mov.storage_path || mov.url || '');
                          window.localStorage.setItem(`mov-annotations:${key}`, JSON.stringify(next));
                        }
                      } catch {}
                      // Do not auto-scroll on add; only scroll when user clicks list item
                      return next;
                    });
                  }}
                />
              ) : currentExt === 'png' || currentExt === 'jpg' || currentExt === 'jpeg' || currentExt === 'webp' ? (
                <div
                  className="relative w-full h-full flex items-center justify-center select-none"
                  onMouseDown={onImageMouseDown}
                  onMouseUp={onImageMouseUp}
                  onMouseMove={onImageMouseMove}
                  onContextMenu={onImageContextMenu}
                  style={{ cursor: annotateMode ? 'crosshair' : 'default' }}
                >
                  <img ref={imgRef} src={currentUrl} alt="MOV preview" className="max-h-full max-w-full object-contain" onLoad={() => setImageReady(true)} onContextMenu={onImageContextMenu} />
                  {/* Render annotation rectangles */}
                  {(() => {
                    const img = imgRef.current;
                    if (!img || !imageReady) return null;
                    return (
                      <div className="absolute inset-0 pointer-events-none">
                        {annotations.map((a, idx) => {
                          if (a.type !== 'rect') return null;
                          const r = naturalToImageRect(a.rect as any);
                          return (
                            <div
                              key={a.id}
                              className="absolute border-2 border-yellow-400 bg-yellow-300/20"
                              style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
                            >
                              {/* Badge + inline comment label for visibility */}
                              <div className="absolute -top-2 -left-2 text-[10px] px-1.5 py-0.5 rounded bg-yellow-400 text-black shadow" style={{ pointerEvents: 'none' }}>{idx + 1}</div>
                              {a.comment ? (
                                <div
                                  className="absolute left-0 bottom-0 max-w-[70%] m-1 px-1.5 py-0.5 rounded bg-yellow-200/90 text-[11px] text-black shadow line-clamp-2"
                                  style={{ pointerEvents: 'none' }}
                                >
                                  {String(a.comment)}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                        {previewRect ? (
                          <div
                            className="absolute border-2 border-blue-400 bg-blue-300/10"
                            style={{ left: previewRect.x, top: previewRect.y, width: previewRect.w, height: previewRect.h }}
                          />
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="p-4 text-sm text-center">
                  Preview not available. <a href={currentUrl} target="_blank" rel="noreferrer" className="underline">Open in new tab</a>
                </div>
              )
            ) : (
              <div className="text-sm text-muted-foreground">No preview available.</div>
            )}
          </div>
          {/* Toolbar and comments (images + pdf) */}
          {currentExt ? (
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm inline-flex items-center gap-2">
                  <input type="checkbox" checked={annotateMode} onChange={(e) => setAnnotateMode(e.target.checked)} />
                  Enable highlight & comment {currentExt === 'pdf' ? '(select text)' : '(drag to draw rectangle)'}
                </label>
              </div>
              {annotations.length > 0 ? (
                <div className="rounded border border-black/10">
                  <div className="px-3 py-2 text-sm font-medium bg-muted/40">Highlights & Comments</div>
                  <ul className="max-h-52 overflow-y-auto divide-y">
                    {annotations.map((a) => (
                      <li key={a.id} className="px-3 py-2 text-sm flex items-start justify-between gap-3">
                        <div className="min-w-0 cursor-pointer" onClick={() => setFocusAnnotationId(a.id)} title="Click to locate highlight">
                          <div className="text-xs text-muted-foreground">
                            {a.type === 'pdfRect' ? (() => {
                              const first = Array.isArray(a.rects) && a.rects.length > 0 ? a.rects[0] : a.rect;
                              return (
                                <>Page {a.page} — Rect: x{Math.round(first.x)}, y{Math.round(first.y)}, w{Math.round(first.w)}, h{Math.round(first.h)}{Array.isArray(a.rects) && a.rects.length > 1 ? ` (+${a.rects.length - 1} more)` : ''}</>
                              );
                            })() : (
                              <>Rect: x{Math.round(a.rect.x)}, y{Math.round(a.rect.y)}, w{Math.round(a.rect.w)}, h{Math.round(a.rect.h)}</>
                            )}
                          </div>
                          <div className="break-words">{a.comment || <span className="text-muted-foreground">(no comment)</span>}</div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => onDeleteAnnotation(a.id)}>Delete</Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No highlights yet.</div>
              )}
            </div>
          ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


