// 📊 Completion Feedback Panel Component
// Shows real-time progress for form completion with required fields tracking

"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { FormSchema, FormSchemaFieldsItem } from "@vantage/shared";
import { isFieldRequired } from "@/lib/forms/formSchemaParser";

interface CompletionFeedbackPanelProps {
  /** Current form values */
  formValues: Record<string, unknown>;
  /** Form schema defining fields and requirements */
  formSchema: FormSchema | Record<string, unknown>;
}

export function CompletionFeedbackPanel({
  formValues,
  formSchema,
}: CompletionFeedbackPanelProps) {
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

    // For OR logic (ANY_ITEM_REQUIRED), only ONE field needs to be completed
    // For AND logic (ALL_ITEMS_REQUIRED), ALL fields need to be completed
    const totalRequired = validationRule === "ANY_ITEM_REQUIRED" && requiredFields.length > 0
      ? 1  // Only 1 of N required for OR logic
      : requiredFields.length;  // All N required for AND logic

    // Calculate completed required fields
    const completedFields = requiredFields.filter((field) => {
      const value = formValues[field.field_id];

      // Check if value is non-empty
      if (value === undefined || value === null || value === "") {
        return false;
      }

      // For arrays (checkbox groups), check if at least one item selected
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return true;
    });

    // For OR logic, completion is binary: 0 if none completed, 1 if at least one completed
    const completed = validationRule === "ANY_ITEM_REQUIRED"
      ? (completedFields.length > 0 ? 1 : 0)  // 0 or 1 for OR logic
      : completedFields.length;  // Actual count for AND logic

    const percentage = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 0;

    // Get incomplete required fields
    const incompleteFields = requiredFields.filter((field) => {
      const value = formValues[field.field_id];

      if (value === undefined || value === null || value === "") {
        return true;
      }

      if (Array.isArray(value)) {
        return value.length === 0;
      }

      return false;
    });

    return {
      totalRequired,
      completed,
      percentage,
      incompleteFields,
    };
  }, [formValues, formSchema]);

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
