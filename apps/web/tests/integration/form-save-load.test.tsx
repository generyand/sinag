// 🧪 Integration Test: Form Save and Load Flow
// Tests the complete save/load workflow for form data persistence
// Epic 3 - Task 3.18.10

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

describe("Integration: Form Save and Load Flow", () => {
  const testSchema: FormSchema = {
    fields: [
      {
        field_id: "project_name",
        field_type: "text_input",
        label: "Project Name",
        required: true,
        placeholder: "Enter project name",
      },
      {
        field_id: "budget",
        field_type: "number_input",
        label: "Budget",
        required: true,
        min_value: 0,
      },
      {
        field_id: "status",
        field_type: "radio_button",
        label: "Project Status",
        required: true,
        options: [
          { value: "planning", label: "Planning" },
          { value: "active", label: "Active" },
          { value: "completed", label: "Completed" },
        ],
      },
      {
        field_id: "description",
        field_type: "text_area",
        label: "Description",
        required: false,
        placeholder: "Project description",
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

  it("should save form data successfully", async () => {
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

    // Fill in form fields
    const projectNameInput = screen.getByLabelText(/Project Name/i);
    await user.type(projectNameInput, "BLGU Infrastructure Project");

    const budgetInput = screen.getByLabelText(/Budget/i);
    await user.type(budgetInput, "500000");

    const activeOption = screen.getByLabelText("Active");
    await user.click(activeOption);

    // Save the form
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Verify save was called with correct data
    await waitFor(
      () => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            assessmentId: 1,
            data: {
              responses: expect.arrayContaining([
                { field_id: "project_name", value: "BLGU Infrastructure Project" },
                { field_id: "budget", value: 500000 },
                { field_id: "status", value: "active" },
              ]),
            },
            params: { indicator_id: 1 },
          })
        );
        expect(mockOnSaveSuccess).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it("should load previously saved data and pre-populate fields", () => {
    const savedData = {
      assessment_id: 1,
      indicator_id: 1,
      responses: [
        { field_id: "project_name", value: "Community Health Center" },
        { field_id: "budget", value: 750000 },
        { field_id: "status", value: "planning" },
        { field_id: "description", value: "Building a new health facility" },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockUseGetAssessmentsAssessmentIdAnswers.mockReturnValue({
      data: savedData,
      isLoading: false,
      error: null,
    });

    renderWithProviders(
      <DynamicFormRenderer formSchema={testSchema} assessmentId={1} indicatorId={1} />
    );

    // Verify all fields are pre-populated with saved data
    const projectNameInput = screen.getByLabelText(/Project Name/i) as HTMLInputElement;
    const budgetInput = screen.getByLabelText(/Budget/i) as HTMLInputElement;
    const planningOption = screen.getByLabelText("Planning") as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

    expect(projectNameInput.value).toBe("Community Health Center");
    expect(budgetInput.value).toBe("750000");
    expect(planningOption).toBeChecked();
    expect(descriptionInput.value).toBe("Building a new health facility");
  });

  it("should handle save and reload cycle", async () => {
    const user = userEvent.setup();
    let savedResponses: any = null;
    const mockMutateAsync = vi.fn().mockImplementation((data) => {
      // Simulate successful save
      savedResponses = data.data.responses;
      return Promise.resolve({});
    });

    mockUsePostAssessmentsAssessmentIdAnswers.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    });

    // Initial render with no saved data
    const { unmount } = renderWithProviders(
      <DynamicFormRenderer formSchema={testSchema} assessmentId={1} indicatorId={1} />
    );

    // Fill and save
    const projectNameInput = screen.getByLabelText(/Project Name/i);
    await user.type(projectNameInput, "Road Rehabilitation");

    const budgetInput = screen.getByLabelText(/Budget/i);
    await user.type(budgetInput, "1000000");

    const completedOption = screen.getByLabelText("Completed");
    await user.click(completedOption);

    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    await waitFor(
      () => {
        expect(mockMutateAsync).toHaveBeenCalled();
        expect(savedResponses).not.toBeNull();
      },
      { timeout: 3000 }
    );

    // Unmount and re-render with saved data
    unmount();

    // Mock the GET endpoint to return saved data
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

    renderWithProviders(
      <DynamicFormRenderer formSchema={testSchema} assessmentId={1} indicatorId={1} />
    );

    // Verify data was restored
    const reloadedProjectName = screen.getByLabelText(/Project Name/i) as HTMLInputElement;
    const reloadedBudget = screen.getByLabelText(/Budget/i) as HTMLInputElement;
    const reloadedCompleted = screen.getByLabelText("Completed") as HTMLInputElement;

    expect(reloadedProjectName.value).toBe("Road Rehabilitation");
    expect(reloadedBudget.value).toBe("1000000");
    expect(reloadedCompleted).toBeChecked();
  });

  it("should load empty form when no saved data exists", () => {
    mockUseGetAssessmentsAssessmentIdAnswers.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    renderWithProviders(
      <DynamicFormRenderer formSchema={testSchema} assessmentId={1} indicatorId={1} />
    );

    // Verify all fields are empty
    const projectNameInput = screen.getByLabelText(/Project Name/i) as HTMLInputElement;
    const budgetInput = screen.getByLabelText(/Budget/i) as HTMLInputElement;

    expect(projectNameInput.value).toBe("");
    expect(budgetInput.value).toBe("");
  });

  it("should update existing data on subsequent saves (upsert)", async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({});

    // Start with existing data
    const existingData = {
      assessment_id: 1,
      indicator_id: 1,
      responses: [
        { field_id: "project_name", value: "Old Project Name" },
        { field_id: "budget", value: 100000 },
        { field_id: "status", value: "planning" },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockUseGetAssessmentsAssessmentIdAnswers.mockReturnValue({
      data: existingData,
      isLoading: false,
      error: null,
    });

    mockUsePostAssessmentsAssessmentIdAnswers.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    });

    renderWithProviders(
      <DynamicFormRenderer formSchema={testSchema} assessmentId={1} indicatorId={1} />
    );

    // Verify pre-populated with old data
    await waitFor(() => {
      const projectNameInput = screen.getByLabelText(/Project Name/i);
      expect(projectNameInput).toHaveValue("Old Project Name");
    });

    // Update the fields
    const projectNameInput = screen.getByLabelText(/Project Name/i);
    await user.clear(projectNameInput);
    await user.type(projectNameInput, "Updated Project Name");

    const budgetInput = screen.getByLabelText(/Budget/i);
    await user.clear(budgetInput);
    await user.type(budgetInput, "200000");

    // Save the updated data
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Verify save was called
    await waitFor(
      () => {
        expect(mockMutateAsync).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it("should handle partial data saves (optional fields empty)", async () => {
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

    // Fill only required fields, leave optional empty
    const projectNameInput = screen.getByLabelText(/Project Name/i);
    await user.type(projectNameInput, "Minimal Project");

    const budgetInput = screen.getByLabelText(/Budget/i);
    await user.type(budgetInput, "50000");

    const planningOption = screen.getByLabelText("Planning");
    await user.click(planningOption);

    // Description is optional - don't fill it

    // Save
    const saveButton = screen.getByRole("button", { name: /save/i });
    await user.click(saveButton);

    // Verify save was called with only filled fields
    await waitFor(
      () => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            data: {
              responses: [
                { field_id: "project_name", value: "Minimal Project" },
                { field_id: "budget", value: 50000 },
                { field_id: "status", value: "planning" },
              ],
            },
          })
        );
      },
      { timeout: 3000 }
    );
  });

  it("should show loading state while fetching saved data", () => {
    mockUseGetAssessmentsAssessmentIdAnswers.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    renderWithProviders(
      <DynamicFormRenderer formSchema={testSchema} assessmentId={1} indicatorId={1} />
    );

    // Should show skeleton loaders
    const skeletons = document.querySelectorAll(".h-8, .h-32");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
