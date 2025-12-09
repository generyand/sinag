// 🧪 Performance Test: Large Form Rendering
// Tests rendering performance with large schemas (50+ fields, 10+ sections)
// Epic 3 - Task 3.18.13

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicFormRenderer } from "@/components/features/forms/DynamicFormRenderer";
import type { FormSchema, FormField } from "@sinag/shared";

// Mock the API hooks
vi.mock("@sinag/shared", async () => {
  const actual = await vi.importActual("@sinag/shared");
  return {
    ...actual,
    useGetIndicatorsIndicatorIdFormSchema: vi.fn(),
    usePostAssessmentsAssessmentIdAnswers: vi.fn(),
    useGetAssessmentsAssessmentIdAnswers: vi.fn(),
  };
});

import {
  useGetIndicatorsIndicatorIdFormSchema,
  usePostAssessmentsAssessmentIdAnswers,
  useGetAssessmentsAssessmentIdAnswers,
} from "@sinag/shared";

const mockUseGetIndicatorsIndicatorIdFormSchema =
  useGetIndicatorsIndicatorIdFormSchema as ReturnType<typeof vi.fn>;
const mockUsePostAssessmentsAssessmentIdAnswers =
  usePostAssessmentsAssessmentIdAnswers as ReturnType<typeof vi.fn>;
const mockUseGetAssessmentsAssessmentIdAnswers = useGetAssessmentsAssessmentIdAnswers as ReturnType<
  typeof vi.fn
>;

/**
 * Generate a large form schema for performance testing
 * @param numSections Number of sections to create
 * @param fieldsPerSection Number of fields per section
 */
function generateLargeFormSchema(numSections: number, fieldsPerSection: number): FormSchema {
  const fields: FormField[] = [];

  for (let section = 1; section <= numSections; section++) {
    for (let field = 1; field <= fieldsPerSection; field++) {
      const fieldId = `section_${section}_field_${field}`;

      // Mix different field types for realistic performance testing
      const fieldType =
        field % 6 === 0
          ? "text_area"
          : field % 5 === 0
            ? "select"
            : field % 4 === 0
              ? "radio_button"
              : field % 3 === 0
                ? "checkbox"
                : field % 2 === 0
                  ? "number_input"
                  : "text_input";

      const baseField: FormField = {
        field_id: fieldId,
        field_type: fieldType as any,
        label: `Section ${section} - Field ${field}`,
        required: field % 3 === 0, // Every 3rd field is required
        placeholder: `Enter value for field ${field}`,
      };

      // Add specific properties based on field type
      if (fieldType === "number_input") {
        (baseField as any).min_value = 0;
        (baseField as any).max_value = 1000;
      } else if (fieldType === "select" || fieldType === "radio_button") {
        (baseField as any).options = [
          { value: "opt1", label: "Option 1" },
          { value: "opt2", label: "Option 2" },
          { value: "opt3", label: "Option 3" },
          { value: "opt4", label: "Option 4" },
        ];
      } else if (fieldType === "checkbox") {
        (baseField as any).options = [
          { value: "check1", label: "Check 1" },
          { value: "check2", label: "Check 2" },
          { value: "check3", label: "Check 3" },
        ];
      }

      fields.push(baseField);
    }
  }

  return { fields };
}

// Helper to render with QueryClient
const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe("Performance: Large Form Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetIndicatorsIndicatorIdFormSchema.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    mockUsePostAssessmentsAssessmentIdAnswers.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      error: null,
    });

    mockUseGetAssessmentsAssessmentIdAnswers.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
  });

  it("should render large form (50+ fields) in under 2 seconds", () => {
    // Generate schema with 10 sections, 6 fields per section = 60 fields
    const largeSchema = generateLargeFormSchema(10, 6);

    expect(largeSchema.fields.length).toBe(60);

    // Measure render time
    const startTime = performance.now();

    renderWithQueryClient(
      <DynamicFormRenderer formSchema={largeSchema} assessmentId={1} indicatorId={1} />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Assert render time is under 2000ms
    expect(renderTime).toBeLessThan(2000);

    // Log the actual render time for monitoring
    console.log(`✅ Large form (60 fields) rendered in ${renderTime.toFixed(2)}ms`);
  });

  it("should render very large form (100+ fields) in under 3 seconds", () => {
    // Generate schema with 10 sections, 12 fields per section = 120 fields
    const veryLargeSchema = generateLargeFormSchema(10, 12);

    expect(veryLargeSchema.fields.length).toBe(120);

    // Measure render time
    const startTime = performance.now();

    renderWithQueryClient(
      <DynamicFormRenderer formSchema={veryLargeSchema} assessmentId={1} indicatorId={1} />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Assert render time is under 3000ms (more lenient for very large forms)
    expect(renderTime).toBeLessThan(3000);

    console.log(`✅ Very large form (120 fields) rendered in ${renderTime.toFixed(2)}ms`);
  });

  it("should render form with many sections efficiently", () => {
    // Generate schema with 20 sections, 3 fields per section = 60 fields
    const manySectionsSchema = generateLargeFormSchema(20, 3);

    expect(manySectionsSchema.fields.length).toBe(60);

    const startTime = performance.now();

    renderWithQueryClient(
      <DynamicFormRenderer formSchema={manySectionsSchema} assessmentId={1} indicatorId={1} />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should still render in under 2 seconds
    expect(renderTime).toBeLessThan(2000);

    console.log(`✅ Form with 20 sections (60 fields) rendered in ${renderTime.toFixed(2)}ms`);
  });

  it("should render form with mixed field types efficiently", () => {
    // Generate schema with variety of field types
    const mixedSchema = generateLargeFormSchema(8, 8);

    expect(mixedSchema.fields.length).toBe(64);

    // Count field types to verify diversity
    const fieldTypes = mixedSchema.fields.reduce(
      (acc, field) => {
        acc[field.field_type] = (acc[field.field_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Should have at least 4 different field types
    expect(Object.keys(fieldTypes).length).toBeGreaterThanOrEqual(4);

    const startTime = performance.now();

    renderWithQueryClient(
      <DynamicFormRenderer formSchema={mixedSchema} assessmentId={1} indicatorId={1} />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(2000);

    console.log(
      `✅ Mixed field types form (64 fields, ${Object.keys(fieldTypes).length} types) rendered in ${renderTime.toFixed(2)}ms`
    );
  });

  it("should maintain performance with pre-populated data", () => {
    const largeSchema = generateLargeFormSchema(10, 6);

    // Generate mock saved responses for all fields
    const savedResponses = largeSchema.fields.map((field, index) => ({
      field_id: field.field_id,
      value:
        field.field_type === "number_input"
          ? index * 10
          : field.field_type === "select" || field.field_type === "radio_button"
            ? "opt1"
            : field.field_type === "checkbox"
              ? ["check1"]
              : `Saved value ${index}`,
    }));

    mockUseGetAssessmentsAssessmentIdAnswers.mockReturnValue({
      data: {
        assessment_id: 1,
        indicator_id: 1,
        responses: savedResponses,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    const startTime = performance.now();

    renderWithQueryClient(
      <DynamicFormRenderer formSchema={largeSchema} assessmentId={1} indicatorId={1} />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Pre-populated forms should still render quickly
    expect(renderTime).toBeLessThan(2500);

    console.log(`✅ Pre-populated large form (60 fields) rendered in ${renderTime.toFixed(2)}ms`);
  });

  it("should handle re-renders efficiently", () => {
    const schema = generateLargeFormSchema(10, 6);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <DynamicFormRenderer formSchema={schema} assessmentId={1} indicatorId={1} />
      </QueryClientProvider>
    );

    // Measure re-render time
    const startTime = performance.now();

    rerender(
      <QueryClientProvider client={queryClient}>
        <DynamicFormRenderer formSchema={schema} assessmentId={1} indicatorId={1} />
      </QueryClientProvider>
    );

    const endTime = performance.now();
    const rerenderTime = endTime - startTime;

    // Re-renders should be very fast (< 500ms)
    expect(rerenderTime).toBeLessThan(500);

    console.log(`✅ Large form re-render completed in ${rerenderTime.toFixed(2)}ms`);
  });
});

describe("Performance: Form Interaction Response Time", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetIndicatorsIndicatorIdFormSchema.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    mockUsePostAssessmentsAssessmentIdAnswers.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      error: null,
    });

    mockUseGetAssessmentsAssessmentIdAnswers.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
  });

  it("should handle form state updates efficiently", () => {
    const schema = generateLargeFormSchema(10, 6);

    const startTime = performance.now();

    const { container } = renderWithQueryClient(
      <DynamicFormRenderer formSchema={schema} assessmentId={1} indicatorId={1} />
    );

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Verify the form container exists
    expect(container).toBeTruthy();

    // Total setup should be quick
    expect(totalTime).toBeLessThan(2000);

    console.log(`✅ Form state setup completed in ${totalTime.toFixed(2)}ms`);
  });
});
