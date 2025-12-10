// 📊 Completion Feedback Panel Component
// Shows real-time progress for form completion with required fields tracking

"use client";

import { Button } from "@/components/ui/button";
import { isFieldRequired } from "@/lib/forms/formSchemaParser";
import type { FormSchema, FormSchemaFieldsItem, MOVFileResponse } from "@sinag/shared";
import { useGetAssessmentsMyAssessment } from "@sinag/shared";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";

interface CompletionFeedbackPanelProps {
  /** Current form values */
  formValues: Record<string, unknown>;
  /** Form schema defining fields and requirements */
  formSchema: FormSchema | Record<string, unknown>;
  /** Assessment ID for fetching uploaded files */
  assessmentId: number;
  /** Indicator ID for fetching uploaded files */
  indicatorId: number;
  /** Pre-filtered files that count towards completion (handles Hybrid Rework Logic) */
  completionValidFiles: MOVFileResponse[];
}

export function CompletionFeedbackPanel({
  formValues,
  formSchema,
  assessmentId,
  indicatorId,
  completionValidFiles,
}: CompletionFeedbackPanelProps) {
  // Use passed files directly - no need to fetch again
  // also no need to re-filter for rework as completionValidFiles is already filtered
  const uploadedFiles = completionValidFiles;

  // Fetch assessment details to get status (still needed for logic related to status display if any)
  const { data: myAssessmentData } = useGetAssessmentsMyAssessment({
    query: {
      cacheTime: 0,
      staleTime: 0,
    } as any,
  } as any);

  // Get rework status and timestamp
  const assessmentData = myAssessmentData as any;
  const normalizedStatus = (assessmentData?.assessment?.status || "").toUpperCase();
  const isReworkStatus = normalizedStatus === "REWORK" || normalizedStatus === "NEEDS_REWORK";
  const reworkRequestedAt = assessmentData?.assessment?.rework_requested_at;

  // Calculate completion metrics
  const completionMetrics = useMemo(() => {
    // Extract fields from either root-level "fields" or nested "sections[].fields"
    let fields: FormSchemaFieldsItem[] = [];

    if (formSchema && "fields" in formSchema && Array.isArray(formSchema.fields)) {
      // Root-level fields (newer format: type: mov_checklist)
      fields = formSchema.fields as FormSchemaFieldsItem[];
    } else if (
      formSchema &&
      "sections" in formSchema &&
      Array.isArray((formSchema as any).sections)
    ) {
      // Sections format (older format: sections[].fields)
      const sections = (formSchema as any).sections as Array<{ fields?: FormSchemaFieldsItem[] }>;
      fields = sections.flatMap((section) => section.fields || []);
    }

    if (fields.length === 0) {
      return {
        totalRequired: 0,
        completed: 0,
        percentage: 0,
        incompleteFields: [],
      };
    }
    const validationRule = (formSchema as any).validation_rule || "ALL_ITEMS_REQUIRED";

    // For OR-logic indicators, treat all file_upload fields as "required" for completion purposes
    // (even though individual fields have required: false)
    const isOrLogic =
      validationRule === "ANY_ITEM_REQUIRED" || validationRule === "OR_LOGIC_AT_LEAST_1_REQUIRED";
    const isSharedPlusOrLogic = validationRule === "SHARED_PLUS_OR_LOGIC";

    // Get fields to track for completion
    const requiredFields =
      isOrLogic || isSharedPlusOrLogic
        ? fields.filter((field) => field.field_type === "file_upload") // All upload fields for OR logic
        : fields.filter((field) => isFieldRequired(field)); // Only required fields for AND logic

    // Helper function to check if a field is filled
    const isFieldFilled = (field: FormSchemaFieldsItem): boolean => {
      const isFileField = field.field_type === "file_upload";

      if (isFileField) {
        // Check if filtered valid files contain an entry for this field
        const hasValidFile = uploadedFiles.some(
          (file: MOVFileResponse) => file.field_id === field.field_id && !file.deleted_at
        );

        return hasValidFile;
      }

      const value = formValues[field.field_id];
      if (value === undefined || value === null || value === "") {
        return false;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return true;
    };

    // For SHARED+OR logic (e.g., indicator 4.1.6, 4.8.4)
    // Pattern: SHARED (required) + (OPTION A OR OPTION B) = 2 total requirements
    if (isSharedPlusOrLogic) {
      // Group fields by completion_group (not option_group to avoid accordion rendering)
      const sharedFields: FormSchemaFieldsItem[] = [];
      const optionAFields: FormSchemaFieldsItem[] = [];
      const optionBFields: FormSchemaFieldsItem[] = [];

      requiredFields.forEach((field) => {
        const completionGroup = (field as any).completion_group;
        if (completionGroup === "shared") {
          sharedFields.push(field);
        } else if (completionGroup === "option_a") {
          optionAFields.push(field);
        } else if (completionGroup === "option_b") {
          optionBFields.push(field);
        }
      });

      // Check SHARED fields - all must be filled
      const sharedComplete =
        sharedFields.length > 0 ? sharedFields.every((field) => isFieldFilled(field)) : true;

      // Check OPTION A - at least 1 upload
      const optionAHasUpload = optionAFields.some((field) => isFieldFilled(field));

      // Check OPTION B - at least 1 upload
      const optionBHasUpload = optionBFields.some((field) => isFieldFilled(field));

      // Either option_a OR option_b must have at least 1 upload
      const optionComplete = optionAHasUpload || optionBHasUpload;

      // Total requirements: 2 (1 for shared + 1 for option)
      const totalRequired = 2;
      let completed = 0;
      if (sharedComplete) completed += 1;
      if (optionComplete) completed += 1;

      const percentage = Math.round((completed / totalRequired) * 100);

      // Get incomplete fields for display
      const incompleteFields: FormSchemaFieldsItem[] = [];
      if (!sharedComplete) {
        incompleteFields.push(...sharedFields.filter((field) => !isFieldFilled(field)));
      }
      if (!optionComplete) {
        // Show first incomplete field from each option as hint
        const firstOptionAIncomplete = optionAFields.find((field) => !isFieldFilled(field));
        const firstOptionBIncomplete = optionBFields.find((field) => !isFieldFilled(field));
        if (firstOptionAIncomplete) incompleteFields.push(firstOptionAIncomplete);
        if (firstOptionBIncomplete) incompleteFields.push(firstOptionBIncomplete);
      }

      return {
        totalRequired,
        completed,
        percentage,
        incompleteFields,
      };
    }

    // For grouped OR logic (e.g., indicator 2.1.4 with Option A vs Option B, or 6.2.1 with Options A/B/C)
    if (isOrLogic) {
      // Detect field groups by analyzing field_ids
      const groups: Record<string, FormSchemaFieldsItem[]> = {};

      requiredFields.forEach((field) => {
        const fieldId = field.field_id;

        // Check if field has explicit option_group metadata (for 6.2.1-style indicators)
        const optionGroup = (field as any).option_group;

        let groupName: string;

        if (optionGroup) {
          // Use explicit option_group if available (e.g., "option_a", "option_b", "option_c")
          groupName = optionGroup;
        } else {
          // Fallback to pattern-based detection for backwards compatibility
          // Special case: If only 2 fields total with section_1/section_2, treat each as separate option
          // (e.g., 1.6.1.3 with 2 separate upload options)
          // Otherwise, group section_1+section_2 together (e.g., 2.1.4 Option A)

          if (
            requiredFields.length === 2 &&
            requiredFields.every(
              (f) => f.field_id.includes("section_1") || f.field_id.includes("section_2")
            )
          ) {
            // Only 2 fields, both with section_1 or section_2 → each is its own option
            groupName = `Field ${fieldId}`;
          } else if (fieldId.includes("section_1") || fieldId.includes("section_2")) {
            // Part of a multi-field group (Option A)
            groupName = "Group A (Option A)";
          } else if (fieldId.includes("section_3") || fieldId.includes("section_4")) {
            // Part of a multi-field group (Option B)
            groupName = "Group B (Option B)";
          } else {
            // Default: each field is its own group
            groupName = `Field ${fieldId}`;
          }
        }

        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(field);
      });

      // Check if at least one complete group is filled
      const completeGroups = Object.entries(groups).filter(([groupName, groupFields]) => {
        // All fields in this group must be filled
        return groupFields.every((field) => isFieldFilled(field));
      });

      // At least one group must be complete for OR logic
      const totalRequired = 1; // Only 1 complete group is required
      const completed = completeGroups.length > 0 ? 1 : 0;
      const percentage = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 0;

      // Get incomplete required fields (only show if NO groups are complete)
      const incompleteFields =
        completed === 0 ? requiredFields.filter((field) => !isFieldFilled(field)) : [];

      return {
        totalRequired,
        completed,
        percentage,
        incompleteFields,
      };
    }

    // Standard AND logic - all fields must be completed
    const completedFields = requiredFields.filter(isFieldFilled);
    const totalRequired = requiredFields.length;
    const completed = completedFields.length;
    const percentage = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 0;

    // Get incomplete required fields (for AND logic)
    const incompleteFields = requiredFields.filter((field) => !isFieldFilled(field));

    return {
      totalRequired,
      completed,
      percentage,
      incompleteFields,
    };
  }, [formValues, formSchema, uploadedFiles, isReworkStatus, reworkRequestedAt]);

  const { totalRequired, completed, percentage, incompleteFields } = completionMetrics;

  // Determine progress bar color based on completion
  const getProgressColor = () => {
    if (percentage === 100) return "hsl(142, 76%, 36%)"; // green-600
    if (percentage >= 50) return "hsl(48, 96%, 53%)"; // yellow-500
    return "hsl(0, 84%, 60%)"; // red-500
  };

  // Don't render if no required fields
  if (totalRequired === 0) {
    return null;
  }

  return (
    <div className="mb-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 py-2">
        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            Submission Status
            {percentage === 100 ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-900/50">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-900/50">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                In Progress
              </span>
            )}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Complete all requirements below to proceed.
          </p>
        </div>

        <div className="flex items-center">
          <div className="text-right">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Progress
            </div>
            <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {percentage}% <span className="text-zinc-300 dark:text-zinc-700 mx-2">|</span>{" "}
              {completed}/{totalRequired} Required
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div
            className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Submission status: ${percentage}% complete`}
          >
            <div
              className={`h-full transition-all duration-500 ease-out rounded-full ${
                percentage === 100 ? "bg-green-600" : "bg-amber-500"
              }`}
              style={{
                width: `${percentage}%`,
              }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Success Message for 100% Completion */}
        {percentage === 100 && (
          <div className="flex gap-4 p-5 rounded-md bg-green-50 border border-green-100 dark:bg-green-900/10 dark:border-green-900/10">
            <CheckCircle2
              className="h-6 w-6 text-green-600 dark:text-green-500 shrink-0"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-green-900 dark:text-green-300">
                Requirement Met
              </h4>
              <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">
                You have uploaded all the required documents. You can now verify your uploads or
                proceed to the next indicator.
              </p>
            </div>
          </div>
        )}

        {/* Incomplete Required Fields List */}
        {percentage < 100 && incompleteFields.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500">
                <AlertCircle className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Action Required ({incompleteFields.length})
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {incompleteFields.map((field) => (
                <div
                  key={field.field_id}
                  className="group flex items-center justify-between p-4 rounded-md border border-zinc-200 bg-white hover:border-amber-300 hover:shadow-sm transition-all dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-amber-700"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0 ring-2 ring-amber-50 dark:ring-amber-900/20" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                        {field.label}
                      </span>
                      <span className="text-xs text-zinc-500 truncate">Missing document</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-4 h-9 text-xs font-semibold border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 dark:border-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-900/20 uppercase tracking-wide"
                    asChild
                  >
                    <a href={`#file-upload-${field.field_id}`}>Upload</a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
