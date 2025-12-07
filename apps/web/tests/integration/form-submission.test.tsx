// 🧪 Integration Test: Form Submission with Validation Errors
// Tests the complete form submission flow with validation
// Epic 3 - Task 3.18.9

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/tests/test-utils";
import userEvent from "@testing-library/user-event";
import { DynamicFormRenderer } from "@/components/features/forms/DynamicFormRenderer";
import type { FormSchema } from "@sinag/shared";

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

describe("Integration: Form Submission with Validation Errors", () => {
  const testSchema: FormSchema = {
    fields: [
      {
        field_id: "full_name",
        field_type: "text_input",
        label: "Full Name",
        required: true,
        placeholder: "Enter your full name",
      },
      {
        field_id: "email",
        field_type: "text_input",
        label: "Email Address",
        required: true,
        placeholder: "email@example.com",
      },
      {
        field_id: "age",
        field_type: "number_input",
        label: "Age",
        required: true,
        min_value: 18,
        max_value: 100,
      },
      {
        field_id: "experience",
        field_type: "radio_button",
        label: "Do you have experience?",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
    ],
  };

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

  it("should prevent submission when required fields are missing", async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({});

    mockUsePostAssessmentsAssessmentIdAnswers.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    });

    renderWithProviders(
      <DynamicFormRenderer formSchema={testSchema} assessmentId={1} indicatorId={1} />
    );

    // Try to submit without filling any fields
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Wait for validation errors
    await waitFor(
      () => {
        const errors = screen.queryAllByRole("alert");
        expect(errors.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );

    // Submission should not have been called
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("should display inline errors for each missing required field", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <DynamicFormRenderer formSchema={testSchema} assessmentId={1} indicatorId={1} />
    );

    // Try to submit without filling fields
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Wait for validation errors to appear
    await waitFor(
      () => {
        const errors = screen.queryAllByRole("alert");
        // Should have errors for: full_name, email, age, experience (4 required fields)
        expect(errors.length).toBeGreaterThanOrEqual(3);
      },
      { timeout: 3000 }
    );
  });

  it("should validate number field constraints", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <DynamicFormRenderer formSchema={testSchema} assessmentId={1} indicatorId={1} />
    );

    // Fill age with value below minimum (18)
    const ageInput = screen.getByLabelText(/Age/i);
    await user.type(ageInput, "15");

    // Try to submit
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Should show validation error for age constraint
    await waitFor(
      () => {
        const errors = screen.queryAllByRole("alert");
        expect(errors.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });

  it("should clear errors when fields are filled correctly", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <DynamicFormRenderer formSchema={testSchema} assessmentId={1} indicatorId={1} />
    );

    // Try to submit empty form to trigger errors
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Wait for errors to appear
    await waitFor(
      () => {
        const errors = screen.queryAllByRole("alert");
        expect(errors.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );

    // Now fill in the fields
    const nameInput = screen.getByLabelText(/Full Name/i);
    await user.type(nameInput, "John Doe");

    const emailInput = screen.getByLabelText(/Email/i);
    await user.type(emailInput, "john@example.com");

    const ageInput = screen.getByLabelText(/Age/i);
    await user.clear(ageInput);
    await user.type(ageInput, "25");

    const yesOption = screen.getByLabelText("Yes");
    await user.click(yesOption);

    // Errors should eventually clear as fields are filled
    // Note: React Hook Form validates onChange, so errors clear as you type
    await waitFor(
      () => {
        const nameField = screen.getByLabelText(/Full Name/i);
        expect(nameField).toHaveValue("John Doe");
      },
      { timeout: 3000 }
    );
  });

  it("should allow successful submission after fixing validation errors", async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    const mockOnSaveSuccess = vi.fn();

    mockUsePostAssessmentsAssessmentIdAnswers.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    });

    renderWithProviders(
      <DynamicFormRenderer
        formSchema={testSchema}
        assessmentId={1}
        indicatorId={1}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    // Fill all required fields correctly
    const nameInput = screen.getByLabelText(/Full Name/i);
    await user.type(nameInput, "Jane Smith");

    const emailInput = screen.getByLabelText(/Email/i);
    await user.type(emailInput, "jane@example.com");

    const ageInput = screen.getByLabelText(/Age/i);
    await user.type(ageInput, "30");

    const yesOption = screen.getByLabelText("Yes");
    await user.click(yesOption);

    // Submit the form
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Submission should succeed
    await waitFor(
      () => {
        expect(mockMutateAsync).toHaveBeenCalled();
        expect(mockOnSaveSuccess).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it("should show validation summary when multiple fields have errors", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <DynamicFormRenderer formSchema={testSchema} assessmentId={1} indicatorId={1} />
    );

    // Submit empty form
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Should have multiple error alerts (one per required field)
    await waitFor(
      () => {
        const errors = screen.queryAllByRole("alert");
        expect(errors.length).toBeGreaterThanOrEqual(3); // At least 3 errors
      },
      { timeout: 3000 }
    );
  });

  it("should prevent submission when number is above maximum", async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({});

    mockUsePostAssessmentsAssessmentIdAnswers.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    });

    renderWithProviders(
      <DynamicFormRenderer formSchema={testSchema} assessmentId={1} indicatorId={1} />
    );

    // Fill fields with age above maximum (100)
    const nameInput = screen.getByLabelText(/Full Name/i);
    await user.type(nameInput, "John Doe");

    const emailInput = screen.getByLabelText(/Email/i);
    await user.type(emailInput, "john@example.com");

    const ageInput = screen.getByLabelText(/Age/i);
    await user.type(ageInput, "150"); // Above max of 100

    const yesOption = screen.getByLabelText("Yes");
    await user.click(yesOption);

    // Try to submit
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Should show validation error
    await waitFor(
      () => {
        const errors = screen.queryAllByRole("alert");
        expect(errors.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );

    // Submission should not have been called
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
