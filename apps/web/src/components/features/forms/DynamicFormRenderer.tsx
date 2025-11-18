// 🎨 Dynamic Form Renderer Component
// Renders forms dynamically based on form schema with conditional field visibility

"use client";

import { useMemo, useEffect } from "react";
import { useForm, FormProvider, Control, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Save } from "lucide-react";
import { toast } from "sonner";
import type { FormSchema } from "@vantage/shared";
import {
  useGetAssessmentsAssessmentIdAnswers,
  usePostAssessmentsAssessmentIdAnswers,
} from "@vantage/shared";
import {
  getSections,
  getVisibleFields,
  type Section,
} from "@/lib/forms/formSchemaParser";
import { generateValidationSchema } from "@/lib/forms/generateValidationSchema";
import {
  TextFieldComponent,
  NumberFieldComponent,
  TextAreaFieldComponent,
  SelectFieldComponent,
  RadioFieldComponent,
  CheckboxFieldComponent,
  DateFieldComponent,
  FileFieldComponent,
} from "./fields";
import { CompletionFeedbackPanel } from "./CompletionFeedbackPanel";
import type { FormSchemaFieldsItem } from "@vantage/shared";

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
}

export function DynamicFormRenderer({
  formSchema,
  assessmentId,
  indicatorId,
  onSaveSuccess,
  isLoading = false,
  isLocked = false,
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

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          />
        ))}

        {/* Epic 5.0: Hide save button when assessment is locked */}
        {!isLocked && (
          <div className="flex justify-end pt-4 border-t border-[var(--border)] mt-6">
            <Button
              type="submit"
              disabled={saveMutation.isPending || formState.isSubmitting}
              className="min-w-40 bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow)]/90 text-gray-900 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : "Save Responses"}
            </Button>
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
}

function FieldRenderer({ field, control, error, assessmentId, indicatorId, isLocked }: FieldRendererProps) {
  // Render appropriate field component based on field type
  switch (field.field_type) {
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
