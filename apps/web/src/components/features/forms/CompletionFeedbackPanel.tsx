// 📊 Completion Feedback Panel Component
// Shows real-time progress for form completion with required fields tracking

"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { FormSchema, FormSchemaFieldsItem, MOVFileResponse } from "@vantage/shared";
import { isFieldRequired } from "@/lib/forms/formSchemaParser";
import { useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles } from "@vantage/shared";

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

  const uploadedFiles = filesResponse?.files || [];

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
        const fieldFiles = uploadedFiles.filter(
          (file: MOVFileResponse) => file.field_id === field.field_id
        );
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

    // For grouped OR logic (e.g., indicator 2.1.4 with Option A vs Option B)
    if (validationRule === "ANY_ITEM_REQUIRED") {
      console.log('[GROUPED OR FRONTEND] Starting validation...');
      console.log('[GROUPED OR FRONTEND] validationRule:', validationRule);
      console.log('[GROUPED OR FRONTEND] Total fields:', fields.length);
      console.log('[GROUPED OR FRONTEND] Required fields count:', requiredFields.length);
      console.log('[GROUPED OR FRONTEND] Uploaded files count:', uploadedFiles.length);
      console.log('[GROUPED OR FRONTEND] Uploaded files:', uploadedFiles);

      // Detect field groups by analyzing field_ids
      const groups: Record<string, FormSchemaFieldsItem[]> = {};

      requiredFields.forEach((field) => {
        const fieldId = field.field_id;

        // Detect group by pattern in field_id
        // Special case: If only 2 fields total with section_1/section_2, treat each as separate option
        // (e.g., 1.6.1.3 with 2 separate upload options)
        // Otherwise, group section_1+section_2 together (e.g., 2.1.4 Option A)
        let groupName: string;

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

        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(field);
      });

      console.log('[GROUPED OR FRONTEND] Detected groups:', groups);
      console.log('[GROUPED OR FRONTEND] Required fields:', requiredFields.map(f => f.field_id));

      // Check if at least one complete group is filled
      const completeGroups = Object.entries(groups).filter(([groupName, groupFields]) => {
        // All fields in this group must be filled
        const isComplete = groupFields.every(field => isFieldFilled(field));
        console.log(`[GROUPED OR FRONTEND] Group "${groupName}": ${isComplete ? 'COMPLETE' : 'INCOMPLETE'} (${groupFields.length} fields)`);
        groupFields.forEach(field => {
          const filled = isFieldFilled(field);
          console.log(`  - ${field.field_id}: ${filled ? 'FILLED' : 'EMPTY'}`);
        });
        return isComplete;
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
  }, [formValues, formSchema, uploadedFiles]);

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
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Form Completion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {completed} of {totalRequired} required fields completed
            </span>
            <span className="text-muted-foreground">{percentage}%</span>
          </div>
          <Progress
            value={percentage}
            className="h-2"
            progressColor={getProgressColor()}
          />
        </div>

        {/* Success Message for 100% Completion */}
        {percentage === 100 && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              All required fields completed!
            </AlertDescription>
          </Alert>
        )}

        {/* Incomplete Required Fields List */}
        {percentage < 100 && incompleteFields.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Please complete the following required fields:
            </p>
            <ul className="space-y-1">
              {incompleteFields.map((field) => (
                <li
                  key={field.field_id}
                  className="flex items-center gap-2 text-sm text-destructive"
                >
                  <AlertCircle className="h-3 w-3" />
                  <span>{field.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
