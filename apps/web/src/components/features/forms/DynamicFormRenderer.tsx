// 🎨 Dynamic Form Renderer Component
// Renders forms dynamically based on form schema with conditional field visibility

"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSections, getVisibleFields, type Section } from "@/lib/forms/formSchemaParser";
import { generateValidationSchema } from "@/lib/forms/generateValidationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FormSchema, FormSchemaFieldsItem, FormNotes, MOVFileResponse } from "@sinag/shared";
import {
  useGetAssessmentsAssessmentIdAnswers,
  usePostAssessmentsAssessmentIdAnswers,
  useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles,
} from "@sinag/shared";
import { isFieldRequired } from "@/lib/forms/formSchemaParser";
import { classifyError } from "@/lib/error-utils";
import { AlertCircle, Info } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Control, FieldValues, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { IndicatorNavigationFooter } from "../assessments/IndicatorNavigationFooter";
import { CompletionFeedbackPanel } from "./CompletionFeedbackPanel";
import {
  CheckboxFieldComponent,
  DateFieldComponent,
  FileFieldComponent,
  NumberFieldComponent,
  RadioFieldComponent,
  TextAreaFieldComponent,
  TextFieldComponent,
} from "./fields";

interface DynamicFormRendererProps {
  /** Form schema defining the structure and fields */
  formSchema?: FormSchema | Record<string, unknown>;
  /** Assessment ID for saving responses */
  assessmentId: number;
  /** Indicator ID for saving responses */
  indicatorId: number;
  /** Callback fired after successful save */
  onSaveSuccess?: () => void;
  /** Callback fired when indicator completion status changes */
  onIndicatorComplete?: (indicatorId: number, isComplete: boolean) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Epic 5.0: Locked state - disables form editing when assessment is submitted */
  isLocked?: boolean;
  /** Epic 5.0: MOV annotations for this indicator (for rework workflow) */
  movAnnotations?: any[];
  /** Navigation: Current indicator code */
  currentCode?: string;
  /** Navigation: Current position in the assessment */
  currentPosition?: number;
  /** Navigation: Total number of indicators */
  totalIndicators?: number;
  /** Navigation: Has previous indicator */
  hasPrevious?: boolean;
  /** Navigation: Has next indicator */
  hasNext?: boolean;
  /** Navigation: Go to previous indicator */
  onPrevious?: () => void;
  /** Navigation: Go to next indicator */
  onNext?: () => void;
}

export function DynamicFormRenderer({
  formSchema,
  assessmentId,
  indicatorId,
  onSaveSuccess,
  onIndicatorComplete,
  isLoading = false,
  isLocked = false,
  movAnnotations = [],
  currentCode,
  currentPosition,
  totalIndicators,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: DynamicFormRendererProps) {
  // Generate validation schema from form schema
  const validationSchema = useMemo(() => {
    return generateValidationSchema(formSchema);
  }, [formSchema]);

  // Load saved responses
  const { data: savedResponses, isLoading: isLoadingSaved } = useGetAssessmentsAssessmentIdAnswers(
    assessmentId,
    { indicator_id: indicatorId },
    {
      query: {
        enabled: !!assessmentId && !!indicatorId,
      } as any,
    } as any
  );

  // Load uploaded files for this indicator (for progress tracking)
  const { data: filesResponse } = useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles(
    assessmentId,
    indicatorId,
    {
      query: {
        enabled: !!assessmentId && !!indicatorId,
      } as any,
    } as any
  );

  // Get active uploaded files (not deleted)
  const uploadedFiles = useMemo(() => {
    const allFiles = (filesResponse?.files || []) as MOVFileResponse[];
    return allFiles.filter((f) => !f.deleted_at);
  }, [filesResponse]);

  // Calculate indicator completion status based on uploaded files
  // This mirrors the logic in CompletionFeedbackPanel
  const isIndicatorComplete = useMemo(() => {
    if (!formSchema) return false;

    // Extract fields from either root-level "fields" or nested "sections[].fields"
    let fields: FormSchemaFieldsItem[] = [];

    if (formSchema && "fields" in formSchema && Array.isArray(formSchema.fields)) {
      fields = formSchema.fields as FormSchemaFieldsItem[];
    } else if (
      formSchema &&
      "sections" in formSchema &&
      Array.isArray((formSchema as any).sections)
    ) {
      const sections = (formSchema as any).sections as Array<{ fields?: FormSchemaFieldsItem[] }>;
      fields = sections.flatMap((section) => section.fields || []);
    }

    if (fields.length === 0) return false;

    const validationRule = (formSchema as any).validation_rule || "ALL_ITEMS_REQUIRED";
    const isOrLogic =
      validationRule === "ANY_ITEM_REQUIRED" || validationRule === "OR_LOGIC_AT_LEAST_1_REQUIRED";
    const isSharedPlusOrLogic = validationRule === "SHARED_PLUS_OR_LOGIC";
    const isAnyOptionGroupRequired = validationRule === "ANY_OPTION_GROUP_REQUIRED";

    // Get fields to track for completion
    const requiredFields =
      isOrLogic || isSharedPlusOrLogic || isAnyOptionGroupRequired
        ? fields.filter((field) => field.field_type === "file_upload")
        : fields.filter((field) => isFieldRequired(field));

    // Helper function to check if a field is filled
    const isFieldFilled = (field: FormSchemaFieldsItem): boolean => {
      const isFileField = field.field_type === "file_upload";
      if (isFileField) {
        return uploadedFiles.some(
          (file: MOVFileResponse) => file.field_id === field.field_id && !file.deleted_at
        );
      }
      return false; // Non-file fields handled elsewhere
    };

    // For ANY_OPTION_GROUP_REQUIRED (e.g., 1.6.1 with Options 1, 2, 3)
    if (isAnyOptionGroupRequired) {
      const optionGroups: Record<string, FormSchemaFieldsItem[]> = {};
      requiredFields.forEach((field) => {
        const optionGroup = (field as any).option_group;
        if (optionGroup) {
          if (!optionGroups[optionGroup]) {
            optionGroups[optionGroup] = [];
          }
          optionGroups[optionGroup].push(field);
        }
      });

      // Check if at least one complete option group exists
      for (const [groupName, groupFields] of Object.entries(optionGroups)) {
        // Check if all fields in this group are filled
        // For groups with internal OR (like Option 3), any field being filled counts
        const hasInternalOr =
          groupName.includes("Option 3") ||
          groupName.includes("OPTION 3") ||
          groupName.toLowerCase().includes("option 3");

        if (hasInternalOr) {
          if (groupFields.some((field) => isFieldFilled(field))) {
            return true; // At least one field in Option 3 is filled
          }
        } else {
          if (groupFields.every((field) => isFieldFilled(field))) {
            return true; // All fields in this option are filled
          }
        }
      }
      return false;
    }

    // For SHARED+OR logic (e.g., 4.1.6) - uses completion_group (not option_group)
    if (isSharedPlusOrLogic) {
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

      // SHARED: all must be filled
      const sharedComplete =
        sharedFields.length > 0 ? sharedFields.every((field) => isFieldFilled(field)) : true;

      // OPTION: at least one of option_a or option_b must have an upload
      const optionAHasUpload = optionAFields.some((field) => isFieldFilled(field));
      const optionBHasUpload = optionBFields.some((field) => isFieldFilled(field));
      const optionComplete = optionAHasUpload || optionBHasUpload;

      return sharedComplete && optionComplete;
    }

    // For OR logic
    if (isOrLogic) {
      const groups: Record<string, FormSchemaFieldsItem[]> = {};
      requiredFields.forEach((field) => {
        const optionGroup = (field as any).option_group || field.field_id;
        if (!groups[optionGroup]) {
          groups[optionGroup] = [];
        }
        groups[optionGroup].push(field);
      });

      // Check if at least one complete group is filled
      for (const [, groupFields] of Object.entries(groups)) {
        if (groupFields.every((field) => isFieldFilled(field))) {
          return true;
        }
      }
      return false;
    }

    // Standard AND logic - all required file upload fields must be filled
    return requiredFields.every((field) => {
      if (field.field_type === "file_upload") {
        return isFieldFilled(field);
      }
      return true; // Non-file fields are handled by form validation
    });
  }, [formSchema, uploadedFiles]);

  // Track previous completion status to avoid infinite loops
  const prevCompleteRef = useRef<boolean | null>(null);

  // Notify parent when completion status changes (only when it actually changes)
  useEffect(() => {
    // Only call callback if completion status actually changed
    if (prevCompleteRef.current !== isIndicatorComplete) {
      prevCompleteRef.current = isIndicatorComplete;
      if (onIndicatorComplete) {
        onIndicatorComplete(indicatorId, isIndicatorComplete);
      }
    }
  }, [indicatorId, isIndicatorComplete, onIndicatorComplete]);

  // Transform saved responses to default values
  const defaultValues = useMemo(() => {
    if (!savedResponses?.responses) return {};

    const values: Record<string, unknown> = {};
    savedResponses.responses.forEach((response) => {
      values[response.field_id] = response.value;
    });
    return values;
  }, [savedResponses]);

  // Initialize React Hook Form
  const methods = useForm({
    mode: "onChange",
    resolver: zodResolver(validationSchema),
    defaultValues,
  });

  const { watch, control, formState, reset, handleSubmit } = methods;

  // Reset form when default values change (when loading saved responses or switching indicators)
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  // Save mutation
  const saveMutation = usePostAssessmentsAssessmentIdAnswers();

  // Handle form submission
  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      // Transform form data to API format
      const responses = Object.entries(data)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([field_id, value]) => ({
          field_id,
          value,
        }));

      await saveMutation.mutateAsync({
        assessmentId,
        data: { responses },
        params: { indicator_id: indicatorId },
      });

      toast.success("Responses saved successfully");
      onSaveSuccess?.();
    } catch (error) {
      const errorInfo = classifyError(error);

      // Show appropriate error message based on error type
      if (errorInfo.type === "network") {
        toast.error("Unable to save responses", {
          description: "Check your internet connection and try again. Your work is still here.",
        });
      } else if (errorInfo.type === "validation") {
        toast.error("Could not save responses", {
          description: errorInfo.message || "Please check your entries and try again.",
        });
      } else if (errorInfo.type === "auth") {
        toast.error("Session expired", {
          description: "Please log in again to save your work.",
        });
      } else {
        toast.error("Failed to save responses", {
          description: "Please try again. If the problem persists, contact your MLGOO-DILG.",
        });
      }
      console.error("Save error:", error);
    }
  };

  // Watch all form values for conditional field visibility
  const formValues = watch();

  // Parse sections from form schema
  const sections = useMemo(() => {
    if (!formSchema) return [];
    return getSections(formSchema);
  }, [formSchema]);

  // Render loading state
  if (isLoading || isLoadingSaved || !formSchema) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Render error state for invalid schema
  if (sections.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load form. The form schema is invalid or empty.
          <br />
          Please contact support if this problem persists.
        </AlertDescription>
      </Alert>
    );
  }

  // Show navigation controls
  const showNavigation = currentPosition && totalIndicators && (hasPrevious || hasNext);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Navigation Header - Removed in favor of footer */}

        {/* Completion Feedback Panel */}
        <CompletionFeedbackPanel
          formValues={formValues}
          formSchema={formSchema}
          assessmentId={assessmentId}
          indicatorId={indicatorId}
        />

        {/* Notes Section - Display before form fields so users see requirements before uploading */}
        {formSchema && "notes" in formSchema && formSchema.notes && (
          <NotesSection notes={formSchema.notes as FormNotes} />
        )}

        {/* Form Sections */}
        {sections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            formSchema={formSchema}
            formValues={formValues}
            control={control as any}
            errors={formState.errors}
            assessmentId={assessmentId}
            indicatorId={indicatorId}
            isLocked={isLocked}
            movAnnotations={movAnnotations}
            uploadedFiles={uploadedFiles}
          />
        ))}

        {/* Secondary Notes Section - Display after form fields */}
        {formSchema && "secondary_notes" in formSchema && formSchema.secondary_notes && (
          <NotesSection notes={formSchema.secondary_notes as FormNotes} />
        )}

        {/* Hidden Submit Button for Testing */}
        <button
          type="submit"
          className="sr-only"
          aria-label="Save"
          disabled={saveMutation.isPending}
        >
          Save
        </button>

        {/* Navigation Footer */}
        {showNavigation && (
          <div className="pt-6 mt-6">
            <IndicatorNavigationFooter
              currentCode={currentCode}
              currentPosition={currentPosition}
              totalIndicators={totalIndicators}
              hasPrevious={hasPrevious || false}
              hasNext={hasNext || false}
              onPrevious={onPrevious || (() => {})}
              onNext={onNext || (() => {})}
              isLocked={isLocked}
            />
          </div>
        )}
      </form>
    </FormProvider>
  );
}

// ============================================================================
// Section Renderer Component
// ============================================================================

interface SectionRendererProps {
  section: Section;
  formSchema: FormSchema | Record<string, unknown>;
  formValues: Record<string, unknown>;
  control: Control<FieldValues>;
  errors: ReturnType<typeof useForm>["formState"]["errors"];
  assessmentId: number;
  indicatorId: number;
  isLocked: boolean;
  movAnnotations: any[];
  uploadedFiles: MOVFileResponse[];
}

/**
 * Groups fields by their option_group attribute.
 * Returns null if no option groups are detected (flat form).
 */
interface OptionGroup {
  name: string;
  label: string;
  fields: FormSchemaFieldsItem[];
}

function groupFieldsByOptionGroup(fields: FormSchemaFieldsItem[]): OptionGroup[] | null {
  // Check if any field has option_group
  const hasOptionGroups = fields.some((field) => "option_group" in field && field.option_group);

  if (!hasOptionGroups) {
    return null;
  }

  const groups: OptionGroup[] = [];
  let currentGroup: OptionGroup | null = null;

  for (const field of fields) {
    const optionGroup = "option_group" in field ? (field.option_group as string | null) : null;

    if (optionGroup) {
      // Field belongs to an option group
      if (!currentGroup || currentGroup.name !== optionGroup) {
        // Start a new group
        currentGroup = {
          name: optionGroup,
          label: optionGroup,
          fields: [],
        };
        groups.push(currentGroup);
      }

      // Check if this is a section_header - use its label as the group label
      if (field.field_type === "section_header") {
        currentGroup.label = field.label;
      } else {
        // Add non-header fields to the group
        currentGroup.fields.push(field);
      }
    } else {
      // Field without option_group (like main OR separators between groups)
      // Skip these as accordion separation handles the visual break
      // Exception: if we're not in a group yet, don't skip
      if (!currentGroup && field.field_type !== "info_text") {
        // This is a standalone field before any groups
        // For now, skip - could add ungrouped handling if needed
      }
      // Otherwise, skip OR separators between groups
    }
  }

  // Filter out groups with no actual upload fields
  return groups.filter((g) => g.fields.length > 0);
}

/**
 * Check if a specific field has an uploaded file
 * Uses the actual uploaded files from API, not form values
 */
function hasFileUploaded(field: FormSchemaFieldsItem, uploadedFiles: MOVFileResponse[]): boolean {
  if (field.field_type !== "file_upload") return false;
  // Check if there's any file uploaded for this field_id
  return uploadedFiles.some((f) => f.field_id === field.field_id);
}

/**
 * Check if an option group is complete based on its requirements
 * - Option 1: ALL file uploads must have files (a AND b)
 * - Option 2: The single file upload must have files
 * - Option 3: ANY file upload must have files (a OR b - internal OR logic)
 */
function isOptionGroupComplete(
  group: { name: string; label: string; fields: FormSchemaFieldsItem[] },
  uploadedFiles: MOVFileResponse[]
): boolean {
  const fileUploadFields = group.fields.filter((f) => f.field_type === "file_upload");

  if (fileUploadFields.length === 0) return false;

  // Check if this is Option 3 (has internal OR logic)
  const hasInternalOr = group.name.includes("Option 3") || group.name.includes("OPTION 3");

  if (hasInternalOr) {
    // Option 3: ANY file upload must have files (internal OR)
    return fileUploadFields.some((field) => hasFileUploaded(field, uploadedFiles));
  } else {
    // Option 1 & 2: ALL file uploads must have files
    return fileUploadFields.every((field) => hasFileUploaded(field, uploadedFiles));
  }
}

/**
 * Get the required count display for an option group
 * Returns something like "0/2" for Option 1 or "0/1" for Option 2/3
 */
function getOptionGroupProgress(
  group: { name: string; label: string; fields: FormSchemaFieldsItem[] },
  uploadedFiles: MOVFileResponse[]
): { current: number; required: number; isComplete: boolean } {
  const fileUploadFields = group.fields.filter((f) => f.field_type === "file_upload");

  if (fileUploadFields.length === 0) {
    return { current: 0, required: 0, isComplete: true };
  }

  const uploadedCount = fileUploadFields.filter((field) =>
    hasFileUploaded(field, uploadedFiles)
  ).length;

  // Check if this is Option 3 (has internal OR logic)
  const hasInternalOr = group.name.includes("Option 3") || group.name.includes("OPTION 3");

  if (hasInternalOr) {
    // Option 3: Only need 1 of the files (internal OR)
    return {
      current: Math.min(uploadedCount, 1),
      required: 1,
      isComplete: uploadedCount >= 1,
    };
  } else {
    // Option 1 & 2: Need all files
    return {
      current: uploadedCount,
      required: fileUploadFields.length,
      isComplete: uploadedCount >= fileUploadFields.length,
    };
  }
}

function SectionRenderer({
  section,
  formSchema,
  formValues,
  control,
  errors,
  assessmentId,
  indicatorId,
  isLocked,
  movAnnotations,
  uploadedFiles,
}: SectionRendererProps) {
  // Get visible fields for this section based on conditional logic
  const visibleFields = useMemo(() => {
    return getVisibleFields(formSchema, section.id, formValues);
  }, [formSchema, section.id, formValues]);

  // Check if fields should be grouped by option_group
  const optionGroups = useMemo(() => {
    return groupFieldsByOptionGroup(visibleFields);
  }, [visibleFields]);

  // Don't render empty sections
  if (visibleFields.length === 0) {
    return null;
  }

  // Render with accordion if option groups detected
  if (optionGroups && optionGroups.length > 0) {
    // Calculate overall completion: need at least 1 option group complete
    const completedGroups = optionGroups.filter((group) =>
      isOptionGroupComplete(group, uploadedFiles)
    ).length;
    const overallComplete = completedGroups >= 1;

    return (
      <Card className="border-none shadow-none bg-transparent mb-8 last:mb-0">
        <CardHeader className="px-0 pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-[var(--foreground)]">
              {section.title}
            </CardTitle>
            {/* Overall completion indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                overallComplete
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              <span>Required:</span>
              <span className="font-bold">{overallComplete ? "1" : "0"}/1</span>
            </div>
          </div>
          {section.description && (
            <CardDescription className="text-base mt-2">{section.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="px-0">
          {/* Info alert for OR logic */}
          <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Choose ONE option</strong> that applies to your barangay&apos;s situation. You
              only need to upload documents for the option that matches your case.
            </AlertDescription>
          </Alert>

          {/* Accordion for option groups */}
          <Accordion type="single" collapsible className="space-y-4">
            {optionGroups.map((group) => {
              const progress = getOptionGroupProgress(group, uploadedFiles);

              return (
                <AccordionItem
                  key={group.name}
                  value={group.name}
                  className={`border rounded-lg overflow-hidden bg-card ${
                    progress.isComplete
                      ? "border-green-300 dark:border-green-700"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="font-semibold text-base text-left">{group.label}</span>
                      {/* Progress indicator for this option */}
                      <span
                        className={`text-sm font-medium px-2 py-0.5 rounded ${
                          progress.isComplete
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {progress.current}/{progress.required}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4 pb-6">
                    <div className="space-y-6">
                      {group.fields.map((field) => (
                        <FieldRenderer
                          key={field.field_id}
                          field={field}
                          control={control as any}
                          error={errors[field.field_id]?.message as string | undefined}
                          assessmentId={assessmentId}
                          indicatorId={indicatorId}
                          isLocked={isLocked}
                          movAnnotations={movAnnotations}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    );
  }

  // Default flat rendering (no option groups)
  return (
    <Card className="border-none shadow-none bg-transparent mb-8 last:mb-0">
      <CardHeader className="px-0 pb-6">
        <CardTitle className="text-xl font-bold text-[var(--foreground)]">
          {section.title}
        </CardTitle>
        {section.description && (
          <CardDescription className="text-base mt-2">{section.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-8 px-0">
        {visibleFields.map((field) => (
          <FieldRenderer
            key={field.field_id}
            field={field}
            control={control as any}
            error={errors[field.field_id]?.message as string | undefined}
            assessmentId={assessmentId}
            indicatorId={indicatorId}
            isLocked={isLocked}
            movAnnotations={movAnnotations}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Field Renderer Component
// ============================================================================

interface FieldRendererProps {
  field: FormSchemaFieldsItem;
  control: Control<FieldValues>;
  error?: string;
  assessmentId: number;
  indicatorId: number;
  isLocked: boolean;
  movAnnotations: any[];
}

function FieldRenderer({
  field,
  control,
  error,
  assessmentId,
  indicatorId,
  isLocked,
  movAnnotations,
}: FieldRendererProps) {
  // Render appropriate field component based on field type
  switch (field.field_type) {
    case "section_header":
      // Render section header for grouped options (e.g., "OPTION A - For MRF:")
      return (
        <div className="pt-4 pb-2 border-b border-[var(--border)]">
          <h3 className="text-base font-semibold text-[var(--foreground)]">{field.label}</h3>
          {field.description && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{field.description}</p>
          )}
        </div>
      );

    case "info_text":
      // Render info text (e.g., "OR" separator) with full-width lines
      return (
        <div className="flex items-center justify-center py-4 my-2">
          <div className="flex items-center gap-4 w-full">
            <div className="h-px flex-1 bg-orange-500" />
            <span className="text-sm font-semibold text-orange-500 uppercase px-2">
              {field.label}
            </span>
            <div className="h-px flex-1 bg-orange-500" />
          </div>
        </div>
      );

    case "text_input":
      return (
        <TextFieldComponent
          {...({
            field,
            control,
            name: field.field_id,
            error,
            disabled: isLocked,
          } as any)}
        />
      );

    case "number_input":
      return (
        <NumberFieldComponent
          {...({
            field,
            control,
            name: field.field_id,
            error,
            disabled: isLocked,
          } as any)}
        />
      );

    case "text_area":
      return (
        <TextAreaFieldComponent
          {...({
            field,
            control,
            name: field.field_id,
            error,
            disabled: isLocked,
          } as any)}
        />
      );

    case "radio_button":
      return (
        <RadioFieldComponent
          {...({
            field,
            control,
            name: field.field_id,
            error,
            disabled: isLocked,
          } as any)}
        />
      );

    case "checkbox_group":
      return (
        <CheckboxFieldComponent
          {...({
            field,
            control,
            name: field.field_id,
            error,
            disabled: isLocked,
          } as any)}
        />
      );

    case "date_picker":
      return (
        <DateFieldComponent
          {...({
            field,
            control,
            name: field.field_id,
            error,
            disabled: isLocked,
          } as any)}
        />
      );

    case "file_upload":
      return (
        <FileFieldComponent
          field={field}
          assessmentId={assessmentId}
          indicatorId={indicatorId}
          disabled={isLocked}
          movAnnotations={movAnnotations}
        />
      );

    default:
      // Unknown field type - render placeholder
      return (
        <Alert>
          <AlertDescription>Unknown field type: {field.field_type}</AlertDescription>
        </Alert>
      );
  }
}

// ============================================================================
// Notes Section Component
// ============================================================================

interface NotesSectionProps {
  notes: FormNotes;
}

function NotesSection({ notes }: NotesSectionProps) {
  // Helper to determine indentation level based on label prefix spaces
  const getIndentLevel = (label?: string): number => {
    if (!label) return 0;
    const leadingSpaces = label.match(/^(\s*)/)?.[1]?.length || 0;
    // Every 3 spaces = 1 indent level
    return Math.floor(leadingSpaces / 3);
  };

  // Helper to check if this is a section header (like "Minimum Composition of the BADAC Committees:")
  const isSectionHeader = (item: { label?: string; text: string }): boolean => {
    return !item.label && item.text.length > 0 && item.text.endsWith(":");
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-2">
          <p className="font-semibold text-blue-900 dark:text-blue-100">{notes.title}</p>
          <ul className="space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
            {notes.items.map((item, index) => {
              const indentLevel = getIndentLevel(item.label);
              const trimmedLabel = item.label?.trim();
              const isHeader = isSectionHeader(item);

              // Empty line spacer
              if (!item.label && !item.text) {
                return <li key={index} className="h-2" />;
              }

              return (
                <li
                  key={index}
                  className="flex gap-2"
                  style={{ marginLeft: `${indentLevel * 1.5}rem` }}
                >
                  {trimmedLabel && (
                    <span className="font-medium flex-shrink-0">{trimmedLabel}</span>
                  )}
                  <span className={isHeader ? "font-semibold mt-2" : ""}>{item.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
