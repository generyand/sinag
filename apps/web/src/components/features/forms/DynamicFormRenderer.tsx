// 🎨 Dynamic Form Renderer Component
// Renders forms dynamically based on form schema with conditional field visibility

"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getSections,
    getVisibleFields,
    type Section,
} from "@/lib/forms/formSchemaParser";
import { generateValidationSchema } from "@/lib/forms/generateValidationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FormSchema, FormSchemaFieldsItem } from "@sinag/shared";
import {
    useGetAssessmentsAssessmentIdAnswers,
    usePostAssessmentsAssessmentIdAnswers,
} from "@sinag/shared";
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo } from "react";
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
    TextFieldComponent
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
  const { data: savedResponses, isLoading: isLoadingSaved } =
    useGetAssessmentsAssessmentIdAnswers(
      assessmentId,
      { indicator_id: indicatorId },
      {
        query: {
          enabled: !!assessmentId && !!indicatorId,
        } as any,
      } as any
    );

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
      toast.error("Failed to save responses. Please try again.");
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Navigation Header - Removed in favor of footer */}

        {/* Completion Feedback Panel */}
        <CompletionFeedbackPanel
          formValues={formValues}
          formSchema={formSchema}
          assessmentId={assessmentId}
          indicatorId={indicatorId}
        />

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
          />
        ))}

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
}: SectionRendererProps) {
  // Get visible fields for this section based on conditional logic
  const visibleFields = useMemo(() => {
    return getVisibleFields(formSchema, section.id, formValues);
  }, [formSchema, section.id, formValues]);

  // Don't render empty sections
  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0">
        <CardTitle className="text-lg">{section.title}</CardTitle>
        {section.description && (
          <CardDescription>{section.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6 px-0">
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

function FieldRenderer({ field, control, error, assessmentId, indicatorId, isLocked, movAnnotations }: FieldRendererProps) {
  // Render appropriate field component based on field type
  switch (field.field_type) {
    case "section_header":
      // Render section header for grouped options (e.g., "OPTION A - For MRF:")
      return (
        <div className="pt-4 pb-2 border-b border-[var(--border)]">
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            {field.label}
          </h3>
          {field.description && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {field.description}
            </p>
          )}
        </div>
      );

    case "info_text":
      // Render info text (e.g., "OR" separator)
      return (
        <div className="flex items-center justify-center py-3">
          <div className="flex items-center gap-3">
            <div className="h-px w-12 bg-[var(--border)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)] uppercase">
              {field.label}
            </span>
            <div className="h-px w-12 bg-[var(--border)]" />
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
          <AlertDescription>
            Unknown field type: {field.field_type}
          </AlertDescription>
        </Alert>
      );
  }
}
