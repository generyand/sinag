"use client";

import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { useDeleteMOV, useUploadMOV } from "@/hooks/useAssessment";
import { getSignedUrl, uploadMovFile } from "@/lib/uploadMov";
import { FormField, FormSchema } from "@/types/form-schema";

interface DynamicIndicatorFormProps {
  formSchema: FormSchema;
  initialData?: Record<string, unknown>;
  onSubmit?: (data: Record<string, unknown>) => void;
  onChange?: (data: Record<string, unknown>) => void;
  isDisabled?: boolean;
  indicatorId?: string;
  responseId?: number | null;
  assessmentId?: string;
  movFiles?: Array<{
    id: string;
    name: string;
    size: number;
    url: string;
    section?: string;
    storagePath?: string;
  }>;
  updateAssessmentData?: (updater: (data: any) => any) => void;
  ensureResponseId?: () => Promise<number>;
}

export function DynamicIndicatorForm({
  formSchema,
  initialData,
  onSubmit,
  onChange,
  isDisabled = false,
  indicatorId,
  responseId,
  assessmentId,
  movFiles = [],
  updateAssessmentData,
  ensureResponseId,
}: DynamicIndicatorFormProps) {
  console.log('🎯 DynamicIndicatorForm RENDERED - NEW VERSION WITH YELLOW BUTTONS');
  const { mutate: uploadMOV, isPending: isUploading } = useUploadMOV();
  const { mutate: deleteMOV, isPending: isDeleting } = useDeleteMOV();
  // Per-section upload progress so only the active section shows progress
  const [sectionUpload, setSectionUpload] = React.useState<Record<string, { progress: number; active: boolean }>>({});
  const uploadTimersRef = React.useRef<Map<string, number>>(new Map());
  const fileInputRefs = React.useRef<Map<string, HTMLInputElement>>(new Map());

  const startSectionProgress = React.useCallback((sectionKey: string) => {
    setSectionUpload((prev) => ({ ...prev, [sectionKey]: { progress: 5, active: true } }));
    const existing = uploadTimersRef.current.get(sectionKey);
    if (existing) window.clearInterval(existing);
    const id = window.setInterval(() => {
      setSectionUpload((prev) => {
        const current = prev[sectionKey] ?? { progress: 0, active: true };
        const next = Math.min(90, (current.progress || 0) + 2);
        return { ...prev, [sectionKey]: { progress: next, active: true } };
      });
    }, 150);
    uploadTimersRef.current.set(sectionKey, id);
  }, []);

  const finishSectionProgress = React.useCallback((sectionKey: string) => {
    const existing = uploadTimersRef.current.get(sectionKey);
    if (existing) {
      window.clearInterval(existing);
      uploadTimersRef.current.delete(sectionKey);
    }
    setSectionUpload((prev) => ({ ...prev, [sectionKey]: { progress: 100, active: true } }));
    window.setTimeout(() => {
      setSectionUpload((prev) => ({ ...prev, [sectionKey]: { progress: 0, active: false } }));
    }, 400);
  }, []);
  type LocalMov = {
    id: string;
    name: string;
    size: number;
    url: string;
    section?: string;
    storagePath?: string;
  };
  const [localMovs, setLocalMovs] = React.useState<LocalMov[]>(
    (movFiles || []).map((f) => ({
      id: String(f.id),
      name: f.name,
      size: f.size,
      url: f.url,
      storagePath: (f as any).storagePath || (f as any).storage_path,
    }))
  );

  // Keep local list in sync when movFiles prop changes (e.g., after refresh)
  const urlCacheRef = React.useRef<Map<string, string>>(new Map());

  React.useEffect(() => {
    console.log("[DynamicIndicatorForm] movFiles changed:", {
      count: movFiles?.length || 0,
      files: movFiles?.map((f: any) => ({
        id: f.id,
        name: f.name || f.filename,
      })),
    });

    let cancelled = false;
    (async () => {
      const mapped: LocalMov[] = await Promise.all(
        (movFiles || []).map(async (f: any) => {
          const name = f.name || f.original_filename || f.filename;
          const size = f.size ?? f.file_size;
          let url = f.url as string | undefined;
          const storagePath = (f.storage_path ?? (f as any).storagePath) as
            | string
            | undefined;
          if (!url && storagePath) {
            const cached = urlCacheRef.current.get(storagePath);
            if (cached) {
              url = cached;
            } else {
              url = await getSignedUrl(storagePath, 60);
              urlCacheRef.current.set(storagePath, url);
            }
          }
          // Detect section from storage path
          const section = (() => {
            if (typeof storagePath !== "string") return undefined;
            const sections = [
              "bfdp_monitoring_forms",
              "photo_documentation",
              "bdrrmc_documents",
              "bpoc_documents",
              "social_welfare_documents",
              "business_registration_documents",
              "beswmc_documents",
            ];
            for (const sec of sections) {
              if (storagePath.includes(sec)) {
                return sec;
              }
            }
            return undefined;
          })();
          return {
            id: String(f.id),
            name,
            size,
            url: url || "",
            section,
            storagePath,
          };
        })
      );
      if (!cancelled) {
        // Deduplicate by ID and storage_path
        const dedupedById = Array.from(
          new Map(mapped.map((f) => [f.id, f])).values()
        );
        const finalDeduped = Array.from(
          new Map(dedupedById.map((f) => [f.storagePath || f.id, f])).values()
        );
        console.log("[DynamicIndicatorForm] Setting localMovs:", {
          count: finalDeduped.length,
          files: finalDeduped.map((f) => ({ id: f.id, name: f.name })),
        });
        setLocalMovs(finalDeduped);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [movFiles]);

  // Create a dynamic Zod schema based on the form schema
  const zodSchema = React.useMemo(() => {
    const schemaObj: Record<string, z.ZodType> = {};

    // Convert form schema fields to Zod validations
    Object.entries(formSchema.properties || {}).forEach(
      ([key, field]: [string, FormField]) => {
        switch (field.type) {
          case "string":
            schemaObj[key] = field.required
              ? z.string().min(1, { message: "This field is required" })
              : z.string().optional();
            break;
          case "number":
            schemaObj[key] = field.required
              ? z.number()
              : z.number().optional();
            break;
          case "boolean":
            schemaObj[key] = field.required
              ? z.boolean()
              : z.boolean().optional();
            break;
          // Add more field types as needed
        }
      }
    );

    return z.object(schemaObj);
  }, [formSchema]);

  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: initialData || {},
  });

  // Reset form when initialData changes
  React.useEffect(() => {
    form.reset(initialData || {});
  }, [form, initialData]);

  // Handle form changes
  React.useEffect(() => {
    if (onChange) {
      const subscription = form.watch((value) => {
        onChange(value);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, onChange]);

  // --- UI/UX helpers: section counters and summaries ---
  const requiredSections: string[] = React.useMemo(() => {
    const props = (formSchema as any)?.properties || {};
    return Object.values(props)
      .map((v: any) => v?.mov_upload_section)
      .filter((s: any) => typeof s === "string") as string[];
  }, [formSchema]);

  const allMovsForSection = React.useCallback(
    (section: string) => {
      const server = (movFiles || []).filter(
        (m: any) => (m as any).section === section || (m.storagePath || (m as any).storage_path || m.url || "").includes(section)
      );
      const local = (localMovs || []).filter((m) => m.section === section);
      const merged = Array.from(
        new Map(
          [...server, ...local].map((f: any) => [String(f.storagePath || (f as any).storage_path || f.id), f])
        ).values()
      );
      return merged;
    },
    [movFiles, localMovs]
  );

  const totalMovCount = React.useMemo(() => {
    if (!requiredSections.length) return (movFiles?.length || 0) + (localMovs?.length || 0);
    return requiredSections.reduce((sum, s) => sum + allMovsForSection(s).length, 0);
  }, [requiredSections, movFiles, localMovs, allMovsForSection]);

  // Utility: derive short file-type badge from filename
  const getFileBadge = React.useCallback((filename: string | undefined) => {
    if (!filename) return "FILE";
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return "PDF";
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "webp":
        return "IMG";
      case "doc":
      case "docx":
        return "DOC";
      case "xls":
      case "xlsx":
        return "XLS";
      case "csv":
        return "CSV";
      case "zip":
      case "rar":
      case "7z":
        return "ZIP";
      case "txt":
        return "TXT";
      default:
        return (ext || "FILE").toUpperCase().slice(0, 4);
    }
  }, []);

  // Render form fields based on schema
  const renderField = (name: string, field: FormField) => {
    switch (field.type) {
      case "boolean":
        return (
          <div className="space-y-3 mt-4" key={name}>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={name}
                checked={Boolean(form.watch(name))}
                onChange={(e) => form.setValue(name, e.target.checked)}
                disabled={isDisabled}
                className="h-4 w-4 rounded border-[var(--border)] text-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]"
              />
              <Label htmlFor={name} className="text-sm font-semibold">
                {field.title || name}
              </Label>
            </div>
            {field.description && (
              <p className="text-xs text-[var(--text-secondary)] ml-6">
                {field.description}
              </p>
            )}
            {/* Show MOV upload section when checkbox is checked */}
            {form.watch(name) && (field as any).mov_upload_section && (
              <div className="ml-6 mt-6">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-[var(--border)] bg-[var(--hover)]/30 flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[var(--cityscape-yellow)]/10 text-[var(--cityscape-yellow-dark)]">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">
                        Upload Files for{" "}
                        {(field as any).mov_upload_section ===
                        "bfdp_monitoring_forms"
                          ? "BFDP Monitoring Forms"
                          : "Photo Documentation"}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Supported formats: PDF, Images
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-4">
                      <input
                        ref={(el) => {
                          if (el) {
                            const sectionKey = (field as any).mov_upload_section;
                            fileInputRefs.current.set(`input-1-${sectionKey}`, el);
                          }
                        }}
                        type="file"
                        id={`file-input-1-${(field as any).mov_upload_section}`}
                        multiple
                        accept="image/*,application/pdf"
                        disabled={isDisabled || isUploading}
                        className="hidden"
                        onChange={async (e) => {
                          const sectionKey = (field as any).mov_upload_section || 'unknown_section';
                          startSectionProgress(sectionKey);
                          const files = e.currentTarget.files;
                          console.log('📁 FILES SELECTED:', files?.length || 0, 'Multiple attr:', e.currentTarget.hasAttribute('multiple'));
                          if (!files || !indicatorId || !responseId) return;
                        for (const file of Array.from(files)) {
                          try {
                            const { storagePath } = await uploadMovFile(file, {
                              assessmentId: indicatorId,
                              responseId: responseId.toString(),
                              section: (field as any).mov_upload_section,
                            });
                            // Upload to backend and update UI immediately
                            await new Promise<void>((resolve, reject) => {
                              uploadMOV(
                                {
                                  responseId,
                                  data: {
                                    filename: file.name,
                                    original_filename: file.name,
                                    file_size: file.size,
                                    content_type: file.type,
                                    storage_path: storagePath,
                                    response_id: responseId,
                                  },
                                },
                                {
                                  onSuccess: async (created: any) => {
                                    // Get a signed URL for immediate preview and add to local list
                                    try {
                                      const url = await getSignedUrl(
                                        storagePath,
                                        60
                                      );
                                      setLocalMovs((prev) => {
                                        const next = [
                                          ...prev,
                                          {
                                            id: String(created?.id ?? Date.now()),
                                            name: file.name,
                                            size: file.size,
                                            url,
                                            section: (field as any)
                                              .mov_upload_section,
                                            storagePath,
                                          },
                                        ];
                                        // Deduplicate by storagePath or id
                                        return Array.from(
                                          new Map(
                                            next.map((f) => [
                                              f.storagePath || f.id,
                                              f,
                                            ])
                                          ).values()
                                        );
                                      });
                                    } catch {}
                                    // Mark indicator as completed in local assessment state for immediate progress update
                                    if (updateAssessmentData && indicatorId) {
                                      updateAssessmentData((prev) => {
                                        const updated = { ...(prev as any) };
                                        const updateInTree = (nodes: any[]): boolean => {
                                          for (let i = 0; i < nodes.length; i++) {
                                            if (String(nodes[i].id) === String(indicatorId)) {
                                              nodes[i] = {
                                                ...nodes[i],
                                                status: 'completed',
                                              };
                                              return true;
                                            }
                                            if (nodes[i].children && updateInTree(nodes[i].children)) return true;
                                          }
                                          return false;
                                        };
                                        for (const area of (updated.governanceAreas || [])) {
                                          if (area.indicators && updateInTree(area.indicators)) break;
                                        }
                                        return updated as any;
                                      });
                                    }
                                    resolve();
                                  },
                                  onError: (error) => reject(error),
                                }
                              );
                            });
                          } catch (err) {
                            console.error("Upload failed:", err);
                          }
                        }
                          finishSectionProgress(sectionKey);
                          e.currentTarget.value = "";
                        }}
                      />
                      
                      <div 
                        onClick={() => {
                          const sectionKey = (field as any).mov_upload_section;
                          const input = fileInputRefs.current.get(`input-1-${sectionKey}`);
                          if (input) input.click();
                        }}
                        className={`
                          relative group border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ease-in-out cursor-pointer
                          ${isDisabled || isUploading 
                            ? "border-[var(--border)] bg-[var(--muted)] opacity-60 cursor-not-allowed" 
                            : "border-[var(--border)] hover:border-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow)]/5"
                          }
                        `}
                      >
                        <div className="space-y-3">
                          <div className="mx-auto h-12 w-12 rounded-full bg-[var(--hover)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--cityscape-yellow-dark)] group-hover:bg-[var(--cityscape-yellow)]/10 transition-colors duration-200">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-base font-medium text-[var(--foreground)]">
                              <span className="text-[var(--cityscape-yellow-dark)] hover:underline">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                              Multiple files allowed
                            </p>
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const sectionKey = (field as any).mov_upload_section || 'unknown_section';
                        const state = sectionUpload[sectionKey];
                        return state?.active ? (
                        <div className="mt-4 p-4 bg-[var(--hover)] rounded-lg border border-[var(--border)]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[var(--foreground)]">Uploading files...</span>
                            <span className="text-xs font-medium text-[var(--text-secondary)]">{state.progress}%</span>
                          </div>
                          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                            <div
                              className="h-2 bg-[var(--cityscape-yellow)] transition-all duration-150 ease-out"
                              style={{ width: `${state.progress}%` }}
                            />
                          </div>
                        </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
                
                {localMovs.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {localMovs
                      .filter(
                        (f) =>
                          f.section === (field as any).mov_upload_section
                      )
                      .map((f) => (
                        <div
                          key={f.id}
                          className="group flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:border-[var(--cityscape-yellow)]/50 transition-all duration-200"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0 w-8 h-8 rounded bg-[var(--hover)] flex items-center justify-center text-[var(--text-secondary)] text-xs font-medium uppercase">
                              {getFileBadge(f.name)}
                            </div>
                            <div className="min-w-0">
                              <a
                                href={f.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-sm font-medium text-[var(--foreground)] hover:text-[var(--cityscape-yellow-dark)] truncate max-w-[200px] sm:max-w-[300px] transition-colors"
                              >
                                {f.name}
                              </a>
                              <span className="text-xs text-[var(--text-secondary)]">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={isDisabled || isDeleting}
                            onClick={async () => {
                              // Optimistically remove from UI immediately and update area progress
                              setLocalMovs((prev) => {
                                const next = prev.filter(
                                  (m) => m.id !== f.id && m.storagePath !== f.storagePath
                                );
                                if (updateAssessmentData && indicatorId) {
                                  updateAssessmentData((prevAssess) => {
                                    const updated = { ...(prevAssess as any) };
                                    const recomputeContainerStatuses = (nodes: any[]) => {
                                      for (let i = 0; i < nodes.length; i++) {
                                        const n = nodes[i];
                                        if (Array.isArray(n.children) && n.children.length > 0) {
                                          recomputeContainerStatuses(n.children);
                                          const allCompleted = n.children.every((c: any) => c.status === 'completed');
                                          if (!allCompleted) n.status = (n.status === 'completed') ? 'in_progress' : n.status;
                                        }
                                      }
                                    };
                                    const updateInTree = (nodes: any[]): boolean => {
                                      for (let i = 0; i < nodes.length; i++) {
                                        if (String(nodes[i].id) === String(indicatorId)) {
                                          const current = nodes[i];
                                          const props = (formSchema as any)?.properties || {};
                                          const requiredSections: string[] = Object.values(props)
                                            .map((v: any) => v?.mov_upload_section)
                                            .filter((s: any) => typeof s === 'string') as string[];
                                          const present = new Set<string>();
                                          for (const m of next) {
                                            const sp = m.storagePath || m.url || '';
                                            for (const rs of requiredSections) {
                                              if (typeof sp === 'string' && sp.includes(rs)) present.add(rs);
                                            }
                                          }
                                          const allSatisfied = requiredSections.length > 0
                                            ? requiredSections.every((s) => present.has(s))
                                            : next.length > 0;
                                          nodes[i] = {
                                            ...current,
                                            status: allSatisfied ? 'completed' : (next.length === 0 ? 'not_started' : 'in_progress'),
                                            movFiles: next,
                                          };
                                          return true;
                                        }
                                        if (nodes[i].children && updateInTree(nodes[i].children)) return true;
                                      }
                                      return false;
                                    };
                                    for (const area of (updated.governanceAreas || [])) {
                                      if (area.indicators && updateInTree(area.indicators)) break;
                                    }
                                    for (const area of (updated.governanceAreas || [])) {
                                      if (area.indicators) recomputeContainerStatuses(area.indicators);
                                    }
                                    return updated as any;
                                  });
                                }
                                return next;
                              });
                              // Delete from backend (which deletes storage + DB)
                              await deleteMOV({
                                movId: parseInt(f.id),
                                storagePath: f.storagePath,
                              });
                            }}
                            className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Delete file"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case "string":
        if (field.enum) {
          return (
            <div className="space-y-3 mt-4" key={name}>
              <Label className="text-sm font-semibold text-[var(--foreground)]">
                {field.title || name}
              </Label>
              {requiredSections.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="px-2 py-0.5 rounded-sm border border-[var(--border)] bg-[var(--hover)]">
                    Total MOVs: {totalMovCount}
                  </span>
                  {requiredSections.map((sec) => {
                    const displayName = sec === "bfdp_monitoring_forms"
                      ? "BFDP Monitoring Forms"
                      : sec === "photo_documentation"
                      ? "Photo Documentation"
                      : sec === "bdrrmc_documents"
                      ? "BDRRMC Documents"
                      : sec === "bpoc_documents"
                      ? "BPOC Documents"
                      : sec === "social_welfare_documents"
                      ? "Social Welfare Documents"
                      : sec === "business_registration_documents"
                      ? "Business Registration Documents"
                      : sec === "beswmc_documents"
                      ? "BESWMC Documents"
                      : sec.replace(/_/g, " ");
                    return (
                      <span
                        key={sec}
                        className="px-2 py-0.5 rounded-sm border border-[var(--border)] bg-[var(--hover)]"
                      >
                        {displayName.toLowerCase()}: {allMovsForSection(sec).length}
                      </span>
                    );
                  })}
                </div>
              )}
              <RadioGroup
                onValueChange={(value) => {
                  form.setValue(name, value, { shouldDirty: true });
                  // Trigger onChange immediately for real-time updates
                  if (onChange) {
                    const currentValues = form.getValues();
                    onChange({ ...currentValues, [name]: value });
                  }
                }}
                value={String(form.watch(name) || "")}
                disabled={isDisabled}
                className="space-y-3"
              >
                {field.enum.map((option: string) => (
                  <div className="flex items-center space-x-2" key={option}>
                    <RadioGroupItem value={option} id={`${name}-${option}`} />
                    <Label
                      htmlFor={`${name}-${option}`}
                      className="text-sm font-medium cursor-pointer capitalize"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {(field as any).mov_upload_section &&
                form.watch(name) === "yes" && (
                  <div className="ml-1 mt-6">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-[var(--border)] bg-[var(--hover)]/30 flex items-center gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[var(--cityscape-yellow)]/10 text-[var(--cityscape-yellow-dark)]">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-[var(--foreground)]">
                            Upload Files for{" "}
                            {(field as any).mov_upload_section === "bfdp_monitoring_forms"
                              ? "BFDP Monitoring Forms"
                              : (field as any).mov_upload_section === "photo_documentation"
                              ? "Photo Documentation"
                              : (field as any).mov_upload_section === "bdrrmc_documents"
                              ? "BDRRMC Documents"
                              : (field as any).mov_upload_section === "bpoc_documents"
                              ? "BPOC Documents"
                              : (field as any).mov_upload_section === "social_welfare_documents"
                              ? "Social Welfare Documents"
                              : (field as any).mov_upload_section === "business_registration_documents"
                              ? "Business Registration Documents"
                              : (field as any).mov_upload_section === "beswmc_documents"
                              ? "BESWMC Documents"
                              : "Documents"}
                          </h4>
                          <p className="text-xs text-[var(--text-secondary)]">
                            Supported formats: PDF, Images
                          </p>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="space-y-4">
                          <input
                            ref={(el) => {
                              if (el) {
                                const sectionKey = (field as any).mov_upload_section;
                                fileInputRefs.current.set(`input-2-${sectionKey}`, el);
                              }
                            }}
                            type="file"
                            id={`file-input-2-${(field as any).mov_upload_section}`}
                            multiple
                            accept="image/*,application/pdf"
                            disabled={isDisabled || isUploading}
                            className="hidden"
                            onChange={async (e) => {
                              const sectionKey = (field as any).mov_upload_section || 'unknown_section';
                              startSectionProgress(sectionKey);
                              const files = e.currentTarget.files;
                              console.log('📁 FILES SELECTED (2):', files?.length || 0, 'Multiple attr:', e.currentTarget.hasAttribute('multiple'));
                              if (!files || !indicatorId) return;

                            // Ensure we have a responseId before uploading
                            let actualResponseId = responseId;
                            if (!actualResponseId && ensureResponseId) {
                              actualResponseId = await ensureResponseId();
                            }
                            if (!actualResponseId) {
                              console.error("No responseId available for upload");
                              finishSectionProgress(sectionKey);
                              return;
                            }

                            // Use actual assessment ID if provided, otherwise fallback to indicatorId for path
                            const actualAssessmentId = assessmentId || indicatorId;

                            for (const file of Array.from(files)) {
                              try {
                                const { storagePath } = await uploadMovFile(file, {
                                  assessmentId: actualAssessmentId,
                                  responseId: actualResponseId.toString(),
                                  section: (field as any).mov_upload_section,
                                });
                                // Upload to backend and update UI immediately
                                await new Promise<void>((resolve, reject) => {
                                  uploadMOV(
                                    {
                                      responseId: actualResponseId!,
                                      data: {
                                        filename: file.name,
                                        original_filename: file.name,
                                        file_size: file.size,
                                        content_type: file.type,
                                        storage_path: storagePath,
                                        response_id: actualResponseId!,
                                      },
                                    },
                                    {
                                      onSuccess: async (created: any) => {
                                        try {
                                          const url = await getSignedUrl(
                                            storagePath,
                                            60
                                          );
                                          if (created && typeof (created as any).id !== 'undefined') {
                                            setLocalMovs((prev) => {
                                              const next = [
                                                ...prev,
                                                {
                                                  id: String((created as any).id),
                                                  name: file.name,
                                                  size: file.size,
                                                  url,
                                                  section: (field as any).mov_upload_section,
                                                  storagePath,
                                                },
                                              ];
                                              return Array.from(
                                                new Map(
                                                  next.map((f) => [f.storagePath || f.id, f])
                                                ).values()
                                              );
                                            });
                                          }
                                        } catch {}
                                        // Mark indicator status only when all required sections have at least one MOV
                                        if (updateAssessmentData && indicatorId) {
                                          const requiredSections: string[] = (() => {
                                            const props = (formSchema as any)?.properties || {};
                                            return Object.values(props)
                                              .map((v: any) => v?.mov_upload_section)
                                              .filter((s: any) => typeof s === 'string') as string[];
                                          })();
                                          updateAssessmentData((prev) => {
                                            const updated = { ...(prev as any) };
                                            const recomputeContainerStatuses = (nodes: any[]) => {
                                              for (let i = 0; i < nodes.length; i++) {
                                                const n = nodes[i];
                                                if (Array.isArray(n.children) && n.children.length > 0) {
                                                  recomputeContainerStatuses(n.children);
                                                  const allCompleted = n.children.every((c: any) => c.status === 'completed');
                                                  if (!allCompleted) n.status = (n.status === 'completed') ? 'in_progress' : n.status;
                                                }
                                              }
                                            };
                                            const updateInTree = (nodes: any[]): boolean => {
                                              for (let i = 0; i < nodes.length; i++) {
                                                if (String(nodes[i].id) === String(indicatorId)) {
                                                  const current = nodes[i];
                                                  const existing = (current.movFiles || []) as any[];
                                                  // Append the newly uploaded file to the node's movFiles
                                                  const files = (created && (created as any).id !== undefined)
                                                    ? [
                                                        ...existing,
                                                        {
                                                          id: String((created as any).id),
                                                          name: file.name,
                                                          size: file.size,
                                                          url: storagePath,
                                                          storagePath,
                                                        },
                                                      ]
                                                    : existing;
                                                  const present = new Set<string>();
                                                  // include new file section
                                                  const sec = (field as any).mov_upload_section as string | undefined;
                                                  if (sec) present.add(sec);
                                                  // include existing movs matched by storagePath
                                                  for (const m of files) {
                                                    const sp = m.storagePath || m.url || '';
                                                    for (const rs of requiredSections) {
                                                      if (typeof sp === 'string' && sp.includes(rs)) present.add(rs);
                                                    }
                                                  }
                                                  // completion rule
                                                  const allSatisfied = requiredSections.length > 0
                                                    ? requiredSections.every((s) => present.has(s))
                                                    : files.length > 0;
                                                  nodes[i] = {
                                                    ...current,
                                                    movFiles: files,
                                                    status: allSatisfied ? 'completed' : 'in_progress',
                                                  };
                                                  return true;
                                                }
                                                if (nodes[i].children && updateInTree(nodes[i].children)) return true;
                                              }
                                              return false;
                                            };
                                            for (const area of (updated.governanceAreas || [])) {
                                              if (area.indicators && updateInTree(area.indicators)) break;
                                            }
                                            for (const area of (updated.governanceAreas || [])) {
                                              if (area.indicators) recomputeContainerStatuses(area.indicators);
                                            }
                                            return updated as any;
                                          });
                                        }
                                        resolve();
                                      },
                                      onError: (error) => reject(error),
                                    }
                                  );
                                });
                              } catch (err) {
                                console.error("Upload failed:", err);
                              }
                              }
                              finishSectionProgress(sectionKey);
                              e.currentTarget.value = "";
                            }}
                          />
                          
                          <div 
                            onClick={() => {
                              const sectionKey = (field as any).mov_upload_section;
                              const input = fileInputRefs.current.get(`input-2-${sectionKey}`);
                              if (input) input.click();
                            }}
                            className={`
                              relative group border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ease-in-out cursor-pointer
                              ${isDisabled || isUploading 
                                ? "border-[var(--border)] bg-[var(--muted)] opacity-60 cursor-not-allowed" 
                                : "border-[var(--border)] hover:border-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow)]/5"
                              }
                            `}
                          >
                            <div className="space-y-3">
                              <div className="mx-auto h-12 w-12 rounded-full bg-[var(--hover)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--cityscape-yellow-dark)] group-hover:bg-[var(--cityscape-yellow)]/10 transition-colors duration-200">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-base font-medium text-[var(--foreground)]">
                                  <span className="text-[var(--cityscape-yellow-dark)] hover:underline">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                  Multiple files allowed
                                </p>
                              </div>
                            </div>
                          </div>

                          {(() => {
                            const sectionKey = (field as any).mov_upload_section || 'unknown_section';
                            const state = sectionUpload[sectionKey];
                            return state?.active ? (
                            <div className="mt-4 p-4 bg-[var(--hover)] rounded-lg border border-[var(--border)]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-[var(--foreground)]">Uploading files...</span>
                                <span className="text-xs font-medium text-[var(--text-secondary)]">{state.progress}%</span>
                              </div>
                              <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                                <div
                                  className="h-2 bg-[var(--cityscape-yellow)] transition-all duration-150 ease-out"
                                  style={{ width: `${state.progress}%` }}
                                />
                              </div>
                            </div>
                            ) : null;
                          })()}
                          
                          {localMovs.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {localMovs
                                .filter(
                                  (f) =>
                                    f.section === (field as any).mov_upload_section
                                )
                                .map((f) => (
                                  <div
                                    key={f.id}
                                    className="group flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:border-[var(--cityscape-yellow)]/50 transition-all duration-200"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="flex-shrink-0 w-8 h-8 rounded bg-[var(--hover)] flex items-center justify-center text-[var(--text-secondary)] text-xs font-medium uppercase">
                                        {getFileBadge(f.name)}
                                      </div>
                                      <div className="min-w-0">
                                        <a
                                          href={f.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="block text-sm font-medium text-[var(--foreground)] hover:text-[var(--cityscape-yellow-dark)] truncate max-w-[200px] sm:max-w-[300px] transition-colors"
                                        >
                                          {f.name}
                                        </a>
                                        <span className="text-xs text-[var(--text-secondary)]">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={isDisabled || isDeleting}
                                      onClick={async () => {
                                        if (!window.confirm(`Delete ${f.name}?`)) return;
                                      // Optimistically remove from UI immediately and update area progress
                                      setLocalMovs((prev) => {
                                        const next = prev.filter(
                                          (m) => m.id !== f.id && m.storagePath !== f.storagePath
                                        );
                                        if (updateAssessmentData && indicatorId) {
                                          updateAssessmentData((prevAssess) => {
                                            const updated = { ...(prevAssess as any) };
                                            const recomputeContainerStatuses = (nodes: any[]) => {
                                              for (let i = 0; i < nodes.length; i++) {
                                                const n = nodes[i];
                                                if (Array.isArray(n.children) && n.children.length > 0) {
                                                  recomputeContainerStatuses(n.children);
                                                  const allCompleted = n.children.every((c: any) => c.status === 'completed');
                                                  if (!allCompleted) n.status = (n.status === 'completed') ? 'in_progress' : n.status;
                                                }
                                              }
                                            };
                                            const updateInTree = (nodes: any[]): boolean => {
                                              for (let i = 0; i < nodes.length; i++) {
                                                if (String(nodes[i].id) === String(indicatorId)) {
                                                  const current = nodes[i];
                                                  const props = (formSchema as any)?.properties || {};
                                                  const requiredSections: string[] = Object.values(props)
                                                    .map((v: any) => v?.mov_upload_section)
                                                    .filter((s: any) => typeof s === 'string') as string[];
                                                  const present = new Set<string>();
                                                  for (const m of next) {
                                                    const sp = m.storagePath || m.url || '';
                                                    for (const rs of requiredSections) {
                                                      if (typeof sp === 'string' && sp.includes(rs)) present.add(rs);
                                                    }
                                                  }
                                                  const allSatisfied = requiredSections.length > 0
                                                    ? requiredSections.every((s) => present.has(s))
                                                    : next.length > 0;
                                                  nodes[i] = {
                                                    ...current,
                                                    status: allSatisfied ? 'completed' : (next.length === 0 ? 'not_started' : 'in_progress'),
                                                    movFiles: next,
                                                  };
                                                  return true;
                                                }
                                                if (nodes[i].children && updateInTree(nodes[i].children)) return true;
                                              }
                                              return false;
                                            };
                                            for (const area of (updated.governanceAreas || [])) {
                                              if (area.indicators && updateInTree(area.indicators)) break;
                                            }
                                            for (const area of (updated.governanceAreas || [])) {
                                              if (area.indicators) recomputeContainerStatuses(area.indicators);
                                            }
                                            return updated as any;
                                          });
                                        }
                                        return next;
                                      });
                                      // Delete from backend (which deletes storage + DB)
                                      await deleteMOV({
                                        movId: parseInt(f.id),
                                        storagePath: f.storagePath,
                                      });
                                    }}
                                    className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Delete file"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                )}
            </div>
          );
        }
        return (
          <div className="space-y-3 mt-4" key={name}>
            <Label
              htmlFor={name}
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              {field.title || name}
            </Label>
            <Input
              {...form.register(name)}
              id={name}
              placeholder={field.description}
              disabled={isDisabled}
              className="p-3 border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-1 focus:ring-[var(--cityscape-yellow)] transition-colors duration-200"
            />
          </div>
        );
      // Add more field types as needed
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit || (() => {}))}
        className="space-y-6 bg-[var(--card)] p-6 rounded-lg border border-[var(--border)] shadow-sm"
      >
        {Object.entries(formSchema.properties || {}).map(
          ([name, field]: [string, FormField]) => renderField(name, field)
        )}

        {/* Debug removed */}

        {localMovs.length > 0 && (
          <div className="pt-4 mt-2 border-t border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-[var(--cityscape-yellow)] rounded-full"></div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                All Uploaded Files
              </h4>
            </div>
            <div className="mt-2 space-y-1">
              {Array.from(
                new Map(localMovs.map((f) => [f.id, f])).values()
              ).map((f) => (
                <div key={f.id} className="text-xs flex items-center gap-2">
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {f.name}
                  </a>
                  <span>({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
                  {f.section && (
                    <span className="text-[var(--text-secondary)]">
                      ·{" "}
                      {f.section === "bfdp_monitoring_forms"
                        ? "BFDP Monitoring Forms"
                        : "Photo Documentation"}
                    </span>
                  )}
                              <button
                    type="button"
                    disabled={isDisabled || isDeleting}
                                onClick={async () => {
                      // Optimistically remove from UI immediately and update area progress
                      setLocalMovs((prev) => {
                        const next = prev.filter(
                          (m) => m.id !== f.id && m.storagePath !== f.storagePath
                        );
                        if (updateAssessmentData && indicatorId) {
                          updateAssessmentData((prevAssess) => {
                            const updated = { ...(prevAssess as any) };
                            const updateInTree = (nodes: any[]): boolean => {
                              for (let i = 0; i < nodes.length; i++) {
                            if (String(nodes[i].id) === String(indicatorId)) {
                              const current = nodes[i];
                              const props = (formSchema as any)?.properties || {};
                              const requiredSections: string[] = Object.values(props)
                                .map((v: any) => v?.mov_upload_section)
                                .filter((s: any) => typeof s === 'string') as string[];
                              const present = new Set<string>();
                              for (const m of next) {
                                const sp = m.storagePath || m.url || '';
                                for (const rs of requiredSections) {
                                  if (typeof sp === 'string' && sp.includes(rs)) present.add(rs);
                                }
                              }
                              const allSatisfied = requiredSections.length > 0
                                ? requiredSections.every((s) => present.has(s))
                                : next.length > 0;
                              nodes[i] = {
                                ...current,
                                status: allSatisfied ? 'completed' : (next.length === 0 ? 'not_started' : 'in_progress'),
                                movFiles: next,
                              };
                                  return true;
                                }
                                if (nodes[i].children && updateInTree(nodes[i].children)) return true;
                              }
                              return false;
                            };
                            for (const area of (updated.governanceAreas || [])) {
                              if (area.indicators && updateInTree(area.indicators)) break;
                            }
                            return updated as any;
                          });
                        }
                        return next;
                      });
                      // Delete from backend (which deletes storage + DB)
                                  await deleteMOV({
                        movId: parseInt(f.id),
                        storagePath: f.storagePath,
                      });
                                }}
                    className="text-[var(--destructive)]"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
