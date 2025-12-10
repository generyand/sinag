"use client";

import FileUploader from "@/components/shared/FileUploader";
import { IndicatorFormSkeleton } from "@/components/shared/skeletons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  useCurrentAssessment,
  useDeleteMOV,
  useUpdateResponse,
  useUploadMOV,
} from "@/hooks/useAssessment";
import { uploadMovFile } from "@/lib/uploadMov";
import { Assessment, ComplianceAnswer, Indicator } from "@/types/assessment";
import { postAssessmentsResponses, useGetAssessmentsMyAssessment } from "@sinag/shared";
import { AlertCircle, CheckCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { DynamicFormRenderer } from "../forms/DynamicFormRenderer";

// Lazy load heavy DynamicIndicatorForm component (1100+ LOC)
const DynamicIndicatorForm = dynamic(
  () => import("./DynamicIndicatorForm").then((mod) => ({ default: mod.DynamicIndicatorForm })),
  {
    loading: () => <IndicatorFormSkeleton />,
    ssr: false,
  }
);

interface IndicatorAccordionProps {
  indicator: Indicator;
  isLocked: boolean;
  updateAssessmentData?: (updater: (data: Assessment) => Assessment) => void;
  /** Navigation props */
  currentCode?: string;
  currentPosition?: number;
  totalIndicators?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  /** MOV annotations for rework workflow */
  movAnnotations?: any[];
}

export function IndicatorAccordion({
  indicator,
  isLocked,
  updateAssessmentData,
  currentCode,
  currentPosition,
  totalIndicators,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  movAnnotations = [],
}: IndicatorAccordionProps) {
  const { data: assessment } = useCurrentAssessment();

  // Fetch assessment details directly to get status and rework timestamp
  const { data: myAssessmentData } = useGetAssessmentsMyAssessment({
    query: {
      cacheTime: 0,
      staleTime: 0,
    } as any,
  } as any);

  // Get assessment data for rework status checking
  const assessmentData = (myAssessmentData || assessment) as any;
  const normalizedStatus = (assessmentData?.assessment?.status || "").toUpperCase();
  const isReworkStatus = normalizedStatus === "REWORK" || normalizedStatus === "NEEDS_REWORK";
  const reworkRequestedAt = assessmentData?.assessment?.rework_requested_at;

  const [isOpen, setIsOpen] = useState(false);
  const { updateResponse } = useUpdateResponse();
  const { mutate: uploadMOV, isPending: isUploading } = useUploadMOV();
  const { mutate: deleteMOV, isPending: isDeleting } = useDeleteMOV();

  // Track compliance locally so UI reacts immediately on change
  const [localCompliance] = useState<ComplianceAnswer | undefined>(
    (indicator.complianceAnswer ||
      (indicator.responseData?.compliance as ComplianceAnswer | undefined)) as
      | ComplianceAnswer
      | undefined
  );
  const shouldShowMov = localCompliance === "yes";
  const hasSectionUploads = (() => {
    const props = (indicator as any)?.formSchema?.properties || {};
    return Object.values(props).some((v: any) => typeof v?.mov_upload_section === "string");
  })();

  // Memoized callback for indicator completion status changes
  // This prevents infinite re-render loops
  const handleIndicatorComplete = useCallback(
    (indicatorIdNum: number, isComplete: boolean) => {
      if (updateAssessmentData) {
        updateAssessmentData((prevData) => {
          const updated = { ...prevData } as any;

          // Recursive function to update indicator status in the tree
          const updateInTree = (nodes: any[]): any[] => {
            return nodes.map((node) => {
              if (node.id === indicator.id) {
                return {
                  ...node,
                  status: isComplete ? "completed" : "not_started",
                };
              }
              if (node.children && node.children.length > 0) {
                const updatedChildren = updateInTree(node.children);
                // Check if all children are completed
                const allChildrenCompleted = updatedChildren.every(
                  (c: any) => c.status === "completed"
                );
                return {
                  ...node,
                  children: updatedChildren,
                  status: allChildrenCompleted ? "completed" : node.status,
                };
              }
              return node;
            });
          };

          // Update indicators in all governance areas
          updated.governanceAreas = updated.governanceAreas.map((area: any) => {
            if (area.indicators && area.indicators.length > 0) {
              return {
                ...area,
                indicators: updateInTree(area.indicators),
              };
            }
            return area;
          });

          return updated;
        });
      }
    },
    [indicator.id, updateAssessmentData]
  );

  async function ensureResponseId(): Promise<number> {
    const existing = (indicator as any).responseId as number | null | undefined;
    if (existing) return existing;

    // For synthetic child indicators (areas 2-6), use responseIndicatorId to create response for the parent
    const indicatorIdToUse = (indicator as any).responseIndicatorId
      ? (indicator as any).responseIndicatorId
      : parseInt(indicator.id);

    const created = await postAssessmentsResponses({
      indicator_id:
        typeof indicatorIdToUse === "number"
          ? indicatorIdToUse
          : parseInt(String(indicatorIdToUse)),
      assessment_id: assessment ? parseInt(assessment.id) : 1,
      response_data: {},
    });

    if (updateAssessmentData) {
      updateAssessmentData((prevData) => {
        const updated = { ...prevData };
        const updateInTree = (nodes: any[]): boolean => {
          for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === indicator.id) {
              (nodes[i] as any).responseId = created.id;
              return true;
            }
            if (nodes[i].children && updateInTree(nodes[i].children)) return true;
          }
          return false;
        };
        for (const area of updated.governanceAreas) {
          if (area.indicators && updateInTree(area.indicators as any[])) break;
        }
        return updated;
      });
    }
    return created.id;
  }

  // Calculate completion metrics for progress display
  const calculateCompletionMetrics = () => {
    const schema = indicator.formSchema as any;
    const data = indicator.responseData || {};

    if (!schema || typeof schema !== "object") {
      return { completedFields: 0, totalFields: 0, percentage: 0 };
    }

    // Helper function to check if a file field has new files (during rework)
    const hasNewFiles = (field: any): boolean => {
      // Get all files for this indicator
      const indicatorFiles = indicator.movFiles || [];

      // Only apply special logic during rework status
      if (!isReworkStatus || !reworkRequestedAt) {
        // Not in rework, check if this field has any files
        const fieldFiles = indicatorFiles.filter(
          (f: any) => f.field_id === field.field_id && !f.deleted_at
        );
        return fieldFiles.length > 0;
      }

      // During rework, check if there are files for this field uploaded AFTER rework was requested
      const reworkDate = new Date(reworkRequestedAt);
      const newFieldFiles = indicatorFiles.filter((f: any) => {
        // Must match this field and not be deleted
        if (f.field_id !== field.field_id || f.deleted_at) return false;

        // Must be uploaded after rework was requested
        if (!f.uploaded_at) return false;
        const uploadDate = new Date(f.uploaded_at);
        return uploadDate >= reworkDate;
      });

      return newFieldFiles.length > 0;
    };

    // For Epic 3/4 format
    if (isEpic3Format()) {
      let totalFields = 0;
      let completedFields = 0;

      // Count fields from sections
      if ("sections" in schema && Array.isArray(schema.sections)) {
        schema.sections.forEach((section: any) => {
          if (Array.isArray(section.fields)) {
            section.fields.forEach((field: any) => {
              if (field.required) {
                totalFields++;
                // Check if this is a file upload field by field_id pattern or component property
                const isFileField =
                  field.field_id?.includes("upload") ||
                  field.component === "file_upload" ||
                  field.type === "file_upload";

                // For file upload fields during rework, check if they have new files
                if (isFileField) {
                  if (hasNewFiles(field)) completedFields++;
                } else {
                  // For non-file fields, check normally
                  if (data[field.field_id]) completedFields++;
                }
              }
            });
          }
        });
      }
      // Count fields from root-level fields array
      else if ("fields" in schema && Array.isArray(schema.fields)) {
        schema.fields.forEach((field: any) => {
          if (field.required) {
            totalFields++;
            // Check if this is a file upload field by field_id pattern or component property
            const isFileField =
              field.field_id?.includes("upload") ||
              field.component === "file_upload" ||
              field.type === "file_upload";

            // For file upload fields during rework, check if they have new files
            if (isFileField) {
              if (hasNewFiles(field)) completedFields++;
            } else {
              // For non-file fields, check normally
              if (data[field.field_id]) completedFields++;
            }
          }
        });
      }

      const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
      return { completedFields, totalFields, percentage };
    }

    // For legacy format
    const required = schema.required || [];
    const totalFields = required.length;
    const completedFields = required.filter((fieldName: string) => {
      const value = data[fieldName];
      return typeof value === "string" && ["yes", "no", "na"].includes(value.toLowerCase());
    }).length;

    const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
    return { completedFields, totalFields, percentage };
  };

  const getCompletionBadge = () => {
    const { percentage } = calculateCompletionMetrics();

    if (indicator.status === "completed") {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 shadow-sm">
          <CheckCircle className="h-3.5 w-3.5" />
          <span className="text-xs font-bold uppercase tracking-wide">Complete</span>
        </div>
      );
    }

    if (indicator.status === "needs_rework") {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20 shadow-sm animate-pulse">
          <span className="text-xs font-bold uppercase tracking-wide">Rework Needed</span>
        </div>
      );
    }

    if (percentage > 0) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end mr-2">
            <span className="text-xs font-bold text-[var(--foreground)]">{percentage}%</span>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
              Progress
            </span>
          </div>
          {/* Mini Progress Circle */}
          <div className="relative h-9 w-9">
            <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
              {/* Background circle */}
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-[var(--muted)]"
              />
              {/* Progress circle */}
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${percentage} ${100 - percentage}`}
                strokeLinecap="round"
                className="text-[var(--cityscape-yellow)] transition-all duration-500"
              />
            </svg>
          </div>
        </div>
      );
    }

    return (
      <div className="px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--text-secondary)] border border-[var(--border)]">
        <span className="text-[10px] font-bold uppercase tracking-wide">Not Started</span>
      </div>
    );
  };

  // Detect if this indicator uses Epic 3/4 format (has "fields" or "sections" array)
  const isEpic3Format = () => {
    const schema = indicator.formSchema;
    if (!schema || typeof schema !== "object") return false;

    // Epic 3: root-level fields array
    if ("fields" in schema && Array.isArray(schema.fields)) return true;

    // Epic 4: sections array with fields inside
    if ("sections" in schema && Array.isArray(schema.sections)) return true;

    return false;
  };

  return (
    <Accordion
      type="single"
      collapsible
      value={isOpen ? indicator.id : ""}
      onValueChange={(value) => setIsOpen(value === indicator.id)}
    >
      <AccordionItem
        value={indicator.id}
        className="border border-[var(--border)] rounded-md mb-4 bg-[var(--card)] shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
      >
        <AccordionTrigger className="group px-3 sm:px-6 py-4 sm:py-5 hover:no-underline transition-all duration-200 focus-visible:outline-none data-[state=open]:bg-[var(--muted)]/30 data-[state=open]:rounded-b-none">
          <div className="flex items-start justify-between w-full gap-6">
            {/* Left: Status + Content */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {/* Content Stack */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Code + Name (Primary Info) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    {/* Code - Monospace, subdued badge */}
                    {indicator.code && (
                      <span className="text-[10px] font-mono text-[var(--text-secondary)] tracking-wider uppercase font-bold bg-[var(--muted)] px-2 py-0.5 rounded-sm border border-[var(--border)]">
                        {indicator.code}
                      </span>
                    )}

                    {/* Status Badge (if not completed) */}
                    {indicator.status === "needs_rework" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wide border border-orange-100">
                        <AlertCircle className="h-3 w-3" />
                        Action Required
                      </span>
                    )}
                  </div>

                  {/* Name - Bold, prominent */}
                  <h3 className="text-lg font-bold text-[var(--foreground)] leading-tight group-hover:text-[var(--cityscape-yellow-dark)] transition-colors">
                    {indicator.name}
                  </h3>
                </div>

                {/* Description - Always show description for better context */}
                {indicator.description && (
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-4xl">
                    {indicator.description}
                  </p>
                )}

                {/* Progress Metadata (Only when collapsed) */}
                {!isOpen && (
                  <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] pt-1">
                    {/* MOV Count */}
                    {indicator.movFiles.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="font-medium">
                          {indicator.movFiles.length} file
                          {indicator.movFiles.length !== 1 ? "s" : ""}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Completion Badge */}
            <div className="flex-shrink-0 pt-1">{getCompletionBadge()}</div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-3 sm:px-6 pb-4 sm:pb-6 pt-2">
          {/* Render children if they exist */}
          {Array.isArray((indicator as any).children) && (indicator as any).children.length > 0 && (
            <div className="space-y-4 mb-6">
              {(indicator as any).children.map((child: Indicator) => (
                <RecursiveIndicator
                  key={child.id}
                  indicator={child}
                  isLocked={isLocked}
                  updateAssessmentData={updateAssessmentData}
                  currentCode={currentCode}
                  currentPosition={currentPosition}
                  totalIndicators={totalIndicators}
                  hasPrevious={hasPrevious}
                  hasNext={hasNext}
                  onPrevious={onPrevious}
                  onNext={onNext}
                  level={1}
                  movAnnotations={movAnnotations}
                />
              ))}
            </div>
          )}

          {/* Render form content only if no children or if this is a leaf node */}
          {!(
            Array.isArray((indicator as any).children) && (indicator as any).children.length > 0
          ) && (
            <div className="space-y-8">
              {/* Epic 3 Dynamic Form Renderer */}
              {isEpic3Format() && assessment?.id && (
                <DynamicFormRenderer
                  formSchema={indicator.formSchema as any}
                  assessmentId={parseInt(assessment.id)}
                  indicatorId={parseInt(indicator.id)}
                  isLocked={isLocked}
                  movAnnotations={movAnnotations}
                  reworkComments={(indicator as any).rework_comments}
                  currentCode={currentCode}
                  currentPosition={currentPosition}
                  totalIndicators={totalIndicators}
                  hasPrevious={hasPrevious}
                  hasNext={hasNext}
                  onPrevious={onPrevious}
                  onNext={onNext}
                  onSaveSuccess={() => {
                    // Optionally refresh assessment data after save
                    console.log("Answers saved successfully for indicator", indicator.id);
                  }}
                  onIndicatorComplete={handleIndicatorComplete}
                />
              )}

              {/* Legacy Form (for old format indicators) */}
              {!isEpic3Format() && (
                <DynamicIndicatorForm
                  formSchema={indicator.formSchema}
                  initialData={indicator.responseData}
                  isDisabled={isLocked}
                  indicatorId={indicator.id}
                  responseId={indicator.responseId}
                  assessmentId={assessment?.id}
                  movFiles={indicator.movFiles || []}
                  updateAssessmentData={updateAssessmentData}
                  ensureResponseId={ensureResponseId}
                  onChange={(data: Record<string, any>) => {
                    if (!isLocked && indicator.id && updateAssessmentData) {
                      // Determine completion locally based on required answers
                      const required = (indicator.formSchema as any)?.required || [];
                      const allAnswered = required.every(
                        (f: string) =>
                          typeof data[f] === "string" &&
                          ["yes", "no", "na"].includes(String(data[f]))
                      );
                      const props = (indicator.formSchema as any)?.properties || {};

                      // Build map of field_name -> section for fields with mov_upload_section
                      const fieldToSection: Record<string, string> = {};
                      for (const [fieldName, fieldProps] of Object.entries(props)) {
                        const section = (fieldProps as any)?.mov_upload_section;
                        if (typeof section === "string") {
                          fieldToSection[fieldName] = section;
                        }
                      }

                      // Only require MOVs for sections where the answer is "yes"
                      const requiredSectionsWithYes = new Set<string>();
                      for (const field of required) {
                        const value = data[field];
                        if (
                          typeof value === "string" &&
                          value.toLowerCase() === "yes" &&
                          field in fieldToSection
                        ) {
                          requiredSectionsWithYes.add(fieldToSection[field]);
                        }
                      }

                      // Check if all required sections (with "yes" answers) have MOVs
                      let allSectionsSatisfied = false;
                      if (requiredSectionsWithYes.size > 0) {
                        const present = new Set<string>();
                        for (const m of indicator.movFiles || []) {
                          const sp = (m as any).storagePath || (m as any).url || "";
                          const movSection = (m as any).section;
                          for (const rs of requiredSectionsWithYes) {
                            if (movSection === rs) {
                              present.add(rs);
                            } else if (typeof sp === "string" && sp.includes(rs)) {
                              present.add(rs);
                            }
                          }
                        }
                        allSectionsSatisfied = Array.from(requiredSectionsWithYes).every((s) =>
                          present.has(s)
                        );
                      } else {
                        // No sections require MOVs (all "no" or "na"), so it's complete
                        allSectionsSatisfied = true;
                      }

                      // Status logic: completed only if:
                      // - All answered AND
                      // - (No "yes" answers OR all "yes" sections have MOVs)
                      const hasYes = requiredSectionsWithYes.size > 0;
                      const newStatus =
                        allAnswered && (!hasYes || allSectionsSatisfied)
                          ? "completed"
                          : "not_started";

                      // Areas 2-6 now use the same flat structure as Area 1, no nested wrapping needed
                      const dataToSave = data;

                      // Optimistically update the assessment data tree
                      updateAssessmentData((prevData) => {
                        const updatedData = { ...prevData } as any;
                        const recomputeContainerStatuses = (nodes: any[]): void => {
                          for (let i = 0; i < nodes.length; i++) {
                            const n = nodes[i];
                            if (Array.isArray(n.children) && n.children.length > 0) {
                              // First recompute children
                              recomputeContainerStatuses(n.children);
                              // Then compute this container's status based on children
                              const allCompleted = n.children.every(
                                (c: any) => c.status === "completed"
                              );
                              n.status = allCompleted ? "completed" : n.status;
                            }
                          }
                        };
                        const updateInTree = (nodes: any[]): any[] => {
                          return nodes.map((node) => {
                            if (node.id === indicator.id) {
                              // Create a new node object to ensure React detects the change
                              return {
                                ...node,
                                responseData: data, // Keep flat for frontend
                                status: newStatus,
                              };
                            }
                            if (node.children && node.children.length > 0) {
                              // Recursively update children
                              const updatedChildren = updateInTree(node.children);
                              const allCompleted = updatedChildren.every(
                                (c: any) => c.status === "completed"
                              );
                              // Create a new container object with updated children
                              return {
                                ...node,
                                children: updatedChildren,
                                status: allCompleted ? "completed" : node.status,
                              };
                            }
                            return node;
                          });
                        };
                        // Create new area objects to ensure React detects changes
                        updatedData.governanceAreas = updatedData.governanceAreas.map(
                          (area: any) => {
                            if (area.indicators && area.indicators.length > 0) {
                              const updatedIndicators = updateInTree(area.indicators);
                              return { ...area, indicators: updatedIndicators }; // Create new area object
                            }
                            return area;
                          }
                        );
                        // Global pass to ensure all containers reflect latest children state
                        for (const area of updatedData.governanceAreas) {
                          if (area.indicators) recomputeContainerStatuses(area.indicators);
                        }

                        // Return updated data - updateAssessmentData will recompute counts automatically
                        return updatedData;
                      });

                      // Ensure a real response exists, then save with nested structure
                      ensureResponseId().then((responseId) =>
                        updateResponse(responseId, { response_data: dataToSave })
                      );
                    }
                  }}
                />
              )}

              {/* MOV File Uploader Section (shown only when compliant == yes and no per-section uploads are defined) */}
              {!isEpic3Format() && shouldShowMov && !hasSectionUploads && (
                <div className="mt-8 pt-8 border-t border-[var(--border)]">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[var(--cityscape-yellow)]/10 border border-[var(--cityscape-yellow)]/20">
                      <svg
                        className="h-5 w-5 text-[var(--cityscape-yellow)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-[var(--foreground)]">
                        Supporting Documents
                      </h4>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Upload Means of Verification (MOV) files here.
                      </p>
                    </div>
                  </div>
                  <FileUploader
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    maxSize={10} // 10MB limit
                    multiple={true}
                    disabled={isLocked}
                    isLoading={isUploading || isDeleting}
                    uploadUrl={`/api/v1/assessments/responses/${indicator.id}/movs`}
                    existingFiles={indicator.movFiles.map((file) => ({
                      id: file.id,
                      name: file.name,
                      size: file.size,
                      url: file.url,
                    }))}
                    onUploadComplete={async (files) => {
                      for (const file of files) {
                        try {
                          // 1) Upload file to Supabase Storage
                          const { storagePath } = await uploadMovFile(file, {
                            assessmentId: "1", // TODO: replace with real assessment id from context
                            responseId: indicator.id.toString(),
                          });

                          // 2) Create the MOV record in backend
                          const responseId = await ensureResponseId();
                          await uploadMOV({
                            responseId,
                            data: {
                              filename: file.name,
                              original_filename: file.name,
                              file_size: file.size,
                              content_type: file.type,
                              storage_path: storagePath,
                              response_id: responseId,
                            },
                          });

                          // Update local UI state so area progress reflects upload
                          if (updateAssessmentData) {
                            updateAssessmentData((prev) => {
                              const updated = { ...prev } as any;
                              const updateInTree = (nodes: any[]): boolean => {
                                for (let i = 0; i < nodes.length; i++) {
                                  if (nodes[i].id === indicator.id) {
                                    const current = nodes[i];
                                    // Determine if all required sections are satisfied
                                    const props = (current.formSchema as any)?.properties || {};
                                    const requiredSections: string[] = Object.values(props)
                                      .map((v: any) => v?.mov_upload_section)
                                      .filter((s: any) => typeof s === "string") as string[];
                                    const present = new Set<string>();
                                    for (const f of current.movFiles || []) {
                                      const sp = f.storagePath || f.url || "";
                                      for (const rs of requiredSections) {
                                        if (typeof sp === "string" && sp.includes(rs))
                                          present.add(rs);
                                      }
                                    }
                                    const allSatisfied =
                                      requiredSections.length > 0
                                        ? requiredSections.every((s) => present.has(s))
                                        : true; // uploading any file counts; list will refresh from server
                                    nodes[i] = {
                                      ...current,
                                      status:
                                        (current.complianceAnswer || localCompliance) === "yes" &&
                                        allSatisfied
                                          ? "completed"
                                          : "not_started",
                                    };
                                    return true;
                                  }
                                  if (nodes[i].children && updateInTree(nodes[i].children))
                                    return true;
                                }
                                return false;
                              };
                              for (const area of updated.governanceAreas) {
                                if (area.indicators && updateInTree(area.indicators)) break;
                              }
                              return updated;
                            });
                          }
                        } catch (error) {
                          console.error("Failed to upload MOV:", error);
                        }
                      }
                    }}
                    onDeleteFile={async (fileId) => {
                      try {
                        await deleteMOV({
                          movId: typeof fileId === "string" ? parseInt(fileId) : fileId,
                        });

                        // Remove from local state and update status if necessary
                        if (updateAssessmentData) {
                          updateAssessmentData((prev) => {
                            const updated = { ...prev } as any;
                            const updateInTree = (nodes: any[]): boolean => {
                              for (let i = 0; i < nodes.length; i++) {
                                if (nodes[i].id === indicator.id) {
                                  const current = nodes[i];
                                  const files = current.movFiles.filter(
                                    (f: any) => String(f.id) !== String(fileId)
                                  );
                                  const props = (current.formSchema as any)?.properties || {};
                                  const requiredSections: string[] = Object.values(props)
                                    .map((v: any) => v?.mov_upload_section)
                                    .filter((s: any) => typeof s === "string") as string[];
                                  const present = new Set<string>();
                                  for (const f of files) {
                                    const sp = f.storagePath || f.url || "";
                                    for (const rs of requiredSections) {
                                      if (typeof sp === "string" && sp.includes(rs))
                                        present.add(rs);
                                    }
                                  }
                                  const allSatisfied =
                                    requiredSections.length > 0
                                      ? requiredSections.every((s) => present.has(s))
                                      : files.length > 0;
                                  nodes[i] = {
                                    ...current,
                                    movFiles: files,
                                    status:
                                      (current.complianceAnswer || localCompliance) === "yes" &&
                                      allSatisfied
                                        ? "completed"
                                        : "not_started",
                                  };
                                  return true;
                                }
                                if (nodes[i].children && updateInTree(nodes[i].children))
                                  return true;
                              }
                              return false;
                            };
                            for (const area of updated.governanceAreas) {
                              if (area.indicators && updateInTree(area.indicators)) break;
                            }
                            return updated;
                          });
                        }
                      } catch (error) {
                        console.error("Failed to delete MOV:", error);
                        // TODO: Show error toast
                      }
                    }}
                    onUploadError={(error) => {
                      console.error("MOV upload error:", error);
                      // TODO: Show error toast
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

interface RecursiveIndicatorProps extends IndicatorAccordionProps {
  level?: number;
}

export function RecursiveIndicator({
  indicator,
  isLocked,
  updateAssessmentData,
  currentCode,
  currentPosition,
  totalIndicators,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  level = 0,
  movAnnotations = [],
}: RecursiveIndicatorProps) {
  return (
    <div style={{ paddingLeft: level * 16 }}>
      <IndicatorAccordion
        indicator={indicator}
        isLocked={isLocked}
        updateAssessmentData={updateAssessmentData}
        currentCode={currentCode}
        currentPosition={currentPosition}
        totalIndicators={totalIndicators}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onPrevious={onPrevious}
        onNext={onNext}
        movAnnotations={movAnnotations}
      />
    </div>
  );
}
