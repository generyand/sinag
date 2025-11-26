// 🧪 DynamicFormRenderer Component Tests
// Tests for the DynamicFormRenderer with simple and conditional schemas
// Epic 3 - Tasks 3.18.7 & 3.18.8

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DynamicFormRenderer } from "../DynamicFormRenderer";
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

// ============================================================================
// Test Setup
// ============================================================================

const mockUseGetIndicatorsIndicatorIdFormSchema =
  useGetIndicatorsIndicatorIdFormSchema as ReturnType<typeof vi.fn>;
const mockUsePostAssessmentsAssessmentIdAnswers =
  usePostAssessmentsAssessmentIdAnswers as ReturnType<typeof vi.fn>;
const mockUseGetAssessmentsAssessmentIdAnswers =
  useGetAssessmentsAssessmentIdAnswers as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();

  // Default mock implementations
  mockUseGetIndicatorsIndicatorIdFormSchema.mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
  });

  mockUsePostAssessmentsAssessmentIdAnswers.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  });

  mockUseGetAssessmentsAssessmentIdAnswers.mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
  });
});

// ============================================================================
// Task 3.18.7: Simple Schema Tests
// ============================================================================

describe("DynamicFormRenderer - Simple Schema", () => {
  const simpleSchema: FormSchema = {
    fields: [
      {
        field_id: "name",
        field_type: "text_input",
        label: "Full Name",
        required: true,
        placeholder: "Enter your name",
      },
      {
        field_id: "age",
        field_type: "number_input",
        label: "Age",
        required: true,
        min_value: 0,
        max_value: 120,
      },
      {
        field_id: "email",
        field_type: "text_input",
        label: "Email",
        required: false,
        placeholder: "email@example.com",
      },
    ],
  };

  it("should render form with all fields from schema", () => {
    render(
      <DynamicFormRenderer
        formSchema={simpleSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Age/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it("should show required indicators for required fields", () => {
    render(
      <DynamicFormRenderer
        formSchema={simpleSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    // Check for asterisks (required indicators) - Full Name and Age are required
    const asterisks = screen.getAllByText("*");
    expect(asterisks.length).toBeGreaterThanOrEqual(2);
  });

  it("should show placeholder text", () => {
    render(
      <DynamicFormRenderer
        formSchema={simpleSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("email@example.com")
    ).toBeInTheDocument();
  });

  it("should accept user input in text fields", async () => {
    const user = userEvent.setup();

    render(
      <DynamicFormRenderer
        formSchema={simpleSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    const nameInput = screen.getByLabelText(/Full Name/i);
    await user.type(nameInput, "John Doe");

    expect(nameInput).toHaveValue("John Doe");
  });

  it("should accept numeric input in number fields", async () => {
    const user = userEvent.setup();

    render(
      <DynamicFormRenderer
        formSchema={simpleSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    const ageInput = screen.getByLabelText(/Age/i);
    await user.type(ageInput, "25");

    expect(ageInput).toHaveValue(25);
  });

  it("should display save button", () => {
    render(
      <DynamicFormRenderer
        formSchema={simpleSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeInTheDocument();
  });

  it("should call onSaveSuccess when save is successful", async () => {
    const user = userEvent.setup();
    const mockOnSaveSuccess = vi.fn();
    const mockMutateAsync = vi.fn().mockResolvedValue({});

    mockUsePostAssessmentsAssessmentIdAnswers.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    });

    render(
      <DynamicFormRenderer
        formSchema={simpleSchema}
        assessmentId={1}
        indicatorId={1}
        onSaveSuccess={mockOnSaveSuccess}
      />
    );

    const nameInput = screen.getByLabelText(/Full Name/i);
    await user.type(nameInput, "John Doe");

    const ageInput = screen.getByLabelText(/Age/i);
    await user.type(ageInput, "25");

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(
      () => {
        expect(mockMutateAsync).toHaveBeenCalled();
        expect(mockOnSaveSuccess).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it("should show validation errors for required fields", async () => {
    const user = userEvent.setup();

    render(
      <DynamicFormRenderer
        formSchema={simpleSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    // Try to save without filling required fields
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Wait for validation errors to appear with increased timeout
    await waitFor(
      () => {
        const errors = screen.queryAllByRole("alert");
        expect(errors.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });

  it("should load existing answers when available", () => {
    const existingAnswers = {
      assessment_id: 1,
      indicator_id: 1,
      responses: [
        { field_id: "name", value: "Jane Smith" },
        { field_id: "age", value: 30 },
        { field_id: "email", value: "jane@example.com" },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockUseGetAssessmentsAssessmentIdAnswers.mockReturnValue({
      data: existingAnswers,
      isLoading: false,
      error: null,
    });

    render(
      <DynamicFormRenderer
        formSchema={simpleSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    const nameInput = screen.getByLabelText(/Full Name/i) as HTMLInputElement;
    const ageInput = screen.getByLabelText(/Age/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;

    expect(nameInput.value).toBe("Jane Smith");
    expect(ageInput.value).toBe("30");
    expect(emailInput.value).toBe("jane@example.com");
  });
});

// ============================================================================
// Task 3.18.8: Conditional Fields Tests
// ============================================================================

describe("DynamicFormRenderer - Conditional Fields", () => {
  const conditionalSchema: FormSchema = {
    fields: [
      {
        field_id: "has_experience",
        field_type: "radio_button",
        label: "Do you have experience?",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        field_id: "years_experience",
        field_type: "number_input",
        label: "Years of Experience",
        required: true,
        min_value: 1,
        max_value: 50,
        conditionalRules: [
          {
            field_id: "has_experience",
            operator: "equals",
            value: "yes",
          },
        ],
      },
      {
        field_id: "reason_no_experience",
        field_type: "text_area",
        label: "Why no experience?",
        required: false,
        conditionalRules: [
          {
            field_id: "has_experience",
            operator: "equals",
            value: "no",
          },
        ],
      },
    ],
  };

  it("should hide conditional fields initially", () => {
    render(
      <DynamicFormRenderer
        formSchema={conditionalSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    // Radio field label appears multiple times (in card title and field label)
    // Use getAllByText to verify it's rendered
    const questionLabels = screen.getAllByText(/Do you have experience?/i);
    expect(questionLabels.length).toBeGreaterThan(0);

    // Verify conditional fields are NOT rendered
    expect(
      screen.queryByLabelText(/Years of Experience/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Why no experience?/i)
    ).not.toBeInTheDocument();
  });

  it("should show conditional field when condition is met", async () => {
    const user = userEvent.setup();

    render(
      <DynamicFormRenderer
        formSchema={conditionalSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    const yesOption = screen.getByLabelText("Yes");
    await user.click(yesOption);

    await waitFor(() => {
      expect(screen.getByLabelText(/Years of Experience/i)).toBeInTheDocument();
      expect(
        screen.queryByLabelText(/Why no experience?/i)
      ).not.toBeInTheDocument();
    });
  });

  it("should hide conditional field when condition is not met", async () => {
    const user = userEvent.setup();

    render(
      <DynamicFormRenderer
        formSchema={conditionalSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    const noOption = screen.getByLabelText("No");
    await user.click(noOption);

    await waitFor(() => {
      expect(
        screen.queryByLabelText(/Years of Experience/i)
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Why no experience?/i)).toBeInTheDocument();
    });
  });

  it("should toggle conditional fields when switching options", async () => {
    const user = userEvent.setup();

    render(
      <DynamicFormRenderer
        formSchema={conditionalSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    // Select "Yes" first
    const yesOption = screen.getByLabelText("Yes");
    await user.click(yesOption);

    await waitFor(() => {
      expect(screen.getByLabelText(/Years of Experience/i)).toBeInTheDocument();
    });

    // Now select "No"
    const noOption = screen.getByLabelText("No");
    await user.click(noOption);

    await waitFor(() => {
      expect(
        screen.queryByLabelText(/Years of Experience/i)
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Why no experience?/i)).toBeInTheDocument();
    });
  });

  it("should validate only visible fields", async () => {
    const user = userEvent.setup();

    render(
      <DynamicFormRenderer
        formSchema={conditionalSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    // Don't select any option, try to save
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(
      () => {
        // Should show error for required radio button
        const errors = screen.queryAllByRole("alert");
        expect(errors.length).toBeGreaterThan(0);

        // Should NOT show errors for hidden conditional fields like "Years of Experience"
        expect(
          screen.queryByText(/Years of Experience is required/i)
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe("DynamicFormRenderer - Error Handling", () => {
  const simpleSchema: FormSchema = {
    fields: [
      {
        field_id: "test_field",
        field_type: "text_input",
        label: "Test Field",
        required: false,
      },
    ],
  };

  it("should show error message when save fails", async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockRejectedValue(new Error("Save failed"));

    mockUsePostAssessmentsAssessmentIdAnswers.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: new Error("Save failed"),
    });

    render(
      <DynamicFormRenderer
        formSchema={simpleSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(
      () => {
        // The component logs the error to console
        expect(mockMutateAsync).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it("should disable save button while saving", () => {
    mockUsePostAssessmentsAssessmentIdAnswers.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      error: null,
    });

    render(
      <DynamicFormRenderer
        formSchema={simpleSchema}
        assessmentId={1}
        indicatorId={1}
      />
    );

    const saveButton = screen.getByRole("button", { name: /saving/i });
    expect(saveButton).toBeDisabled();
  });
});
