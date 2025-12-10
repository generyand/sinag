// 📊 Completion Feedback Panel Component
// Shows real-time progress for form completion with required fields tracking

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="border border-[var(--border)] shadow-sm bg-[var(--card)] rounded-lg overflow-hidden">
      <CardHeader className="pb-4 border-b border-[var(--border)] bg-[var(--muted)]/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wide text-[var(--foreground)]">
            Form Completion
          </CardTitle>
          <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--muted)] px-2 py-0.5 rounded border border-[var(--border)]">
            {completed} / {totalRequired} Required
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span id="progress-label" className="font-medium text-[var(--text-secondary)]">
              Overall Progress
            </span>
            <span className="font-bold text-[var(--foreground)]" aria-live="polite">
              {percentage}% Complete
            </span>
          </div>
          <div
            className="h-2.5 w-full bg-[var(--muted)] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-labelledby="progress-label"
            aria-label={`Form completion: ${percentage}% complete`}
          >
            <div
              className="h-full transition-all duration-500 ease-out rounded-full"
              style={{
                width: `${percentage}%`,
                backgroundColor: getProgressColor(),
              }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Success Message for 100% Completion */}
        {percentage === 100 && (
          <div
            className="flex items-start gap-3 p-3 rounded-sm bg-green-500/10 border border-green-500/20"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <div>
              <h4 className="text-sm font-bold text-green-700">All set!</h4>
              <p className="text-xs text-green-600/90 mt-0.5">
                All required fields have been completed. You can now proceed to the next indicator.
              </p>
            </div>
          </div>
        )}

        {/* Incomplete Required Fields List */}
        {percentage < 100 && incompleteFields.length > 0 && (
          <section
            className="space-y-3 pt-2 border-t border-[var(--border)]"
            aria-labelledby="missing-requirements-title"
          >
            <h4
              id="missing-requirements-title"
              className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] flex items-center gap-2"
            >
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Missing Requirements
            </h4>
            <ul
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
              role="list"
              aria-label="List of missing required fields"
            >
              {incompleteFields.map((field) => (
                <li
                  key={field.field_id}
                  className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/10 px-2 py-1.5 rounded-sm border border-red-100 dark:border-red-900/20"
                >
                  <div
                    className="h-1.5 w-1.5 rounded-sm bg-red-500 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate" title={field.label}>
                    {field.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
