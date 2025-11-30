// 📊 Completion Feedback Panel Component
// Shows real-time progress for form completion with required fields tracking

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isFieldRequired } from "@/lib/forms/formSchemaParser";
import type { FormSchema, FormSchemaFieldsItem, MOVFileResponse } from "@sinag/shared";
import { useGetAssessmentsMyAssessment, useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles } from "@sinag/shared";
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
}

export function CompletionFeedbackPanel({
  formValues,
  formSchema,
  assessmentId,
  indicatorId,
}: CompletionFeedbackPanelProps) {
  // Fetch uploaded MOV files for this indicator
  const { data: filesResponse } = useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles(
    assessmentId,
    indicatorId,
    {
      query: {
        // Refetch when window regains focus to ensure fresh data
        refetchOnWindowFocus: true,
      },
    } as any
  );

  // Fetch assessment details to get status and rework timestamp
  const { data: myAssessmentData } = useGetAssessmentsMyAssessment({
    query: {
      cacheTime: 0,
      staleTime: 0,
    } as any,
  } as any);

  const uploadedFiles = filesResponse?.files || [];

  // Get rework status and timestamp
  const assessmentData = myAssessmentData as any;
  const normalizedStatus = (assessmentData?.assessment?.status || '').toUpperCase();
  const isReworkStatus = normalizedStatus === 'REWORK' || normalizedStatus === 'NEEDS_REWORK';
  const reworkRequestedAt = assessmentData?.assessment?.rework_requested_at;

  // Calculate completion metrics
  const completionMetrics = useMemo(() => {
    if (!formSchema || !("fields" in formSchema) || !Array.isArray(formSchema.fields)) {
      return {
        totalRequired: 0,
        completed: 0,
        percentage: 0,
        incompleteFields: [],
      };
    }

    const fields = formSchema.fields as FormSchemaFieldsItem[];
    const validationRule = (formSchema as any).validation_rule || "ALL_ITEMS_REQUIRED";

    // Get all required fields
    const requiredFields = fields.filter((field) => isFieldRequired(field));

    // Helper function to check if a field is filled
    const isFieldFilled = (field: FormSchemaFieldsItem): boolean => {
      const isFileField = field.field_type === "file_upload";

      if (isFileField) {
        let fieldFiles = uploadedFiles.filter(
          (file: MOVFileResponse) => file.field_id === field.field_id && !file.deleted_at
        );

        // During rework status, only count files uploaded AFTER rework was requested
        if (isReworkStatus && reworkRequestedAt) {
          const reworkDate = new Date(reworkRequestedAt);
          fieldFiles = fieldFiles.filter((file: MOVFileResponse) => {
            if (!file.uploaded_at) return false;
            const uploadDate = new Date(file.uploaded_at);
            return uploadDate >= reworkDate;
          });
        }

        return fieldFiles.length > 0;
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

    // For grouped OR logic (e.g., indicator 2.1.4 with Option A vs Option B, or 6.2.1 with Options A/B/C)
    if (validationRule === "ANY_ITEM_REQUIRED" || validationRule === "OR_LOGIC_AT_LEAST_1_REQUIRED") {
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

          if (requiredFields.length === 2 &&
              requiredFields.every(f => f.field_id.includes('section_1') || f.field_id.includes('section_2'))) {
            // Only 2 fields, both with section_1 or section_2 → each is its own option
            groupName = `Field ${fieldId}`;
          } else if (fieldId.includes('section_1') || fieldId.includes('section_2')) {
            // Part of a multi-field group (Option A)
            groupName = "Group A (Option A)";
          } else if (fieldId.includes('section_3') || fieldId.includes('section_4')) {
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
        return groupFields.every(field => isFieldFilled(field));
      });

      // At least one group must be complete for OR logic
      const totalRequired = 1; // Only 1 complete group is required
      const completed = completeGroups.length > 0 ? 1 : 0;
      const percentage = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 0;

      // Get incomplete required fields (only show if NO groups are complete)
      const incompleteFields = completed === 0 ? requiredFields.filter((field) => !isFieldFilled(field)) : [];

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
            <span className="font-medium text-[var(--text-secondary)]">
              Overall Progress
            </span>
            <span className="font-bold text-[var(--foreground)]">{percentage}% Complete</span>
          </div>
          <div className="h-2.5 w-full bg-[var(--muted)] rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-500 ease-out rounded-full"
              style={{ 
                width: `${percentage}%`,
                backgroundColor: getProgressColor()
              }}
            />
          </div>
        </div>

        {/* Success Message for 100% Completion */}
        {percentage === 100 && (
          <div className="flex items-start gap-3 p-3 rounded-md bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
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
          <div className="space-y-3 pt-2 border-t border-[var(--border)]">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" />
              Missing Requirements
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {incompleteFields.map((field) => (
                <div
                  key={field.field_id}
                  className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/10 px-2 py-1.5 rounded border border-red-100 dark:border-red-900/20"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="truncate" title={field.label}>{field.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
