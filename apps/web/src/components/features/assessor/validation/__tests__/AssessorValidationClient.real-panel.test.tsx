import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGetAssessorAssessmentsAssessmentId } from "@sinag/shared";
import { AssessorValidationClient } from "../AssessorValidationClient";

const validateMutateAsync = vi.fn();

vi.mock("@sinag/shared", () => ({
  getGetAssessorAssessmentsAssessmentIdQueryKey: (id: number) => ["assessor", "assessments", id],
  useGetAssessorAssessmentsAssessmentId: vi.fn(),
  usePostAssessorAssessmentResponsesResponseIdValidate: vi.fn(() => ({
    mutateAsync: validateMutateAsync,
    isPending: false,
    reset: vi.fn(),
  })),
  usePostAssessorAssessmentsAssessmentIdFinalize: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostAssessorAssessmentsAssessmentIdRework: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostAssessorAssessmentsAssessmentIdAreasGovernanceAreaIdApprove: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostAssessorAssessmentsAssessmentIdAreasGovernanceAreaIdRework: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useGetAssessorMovsMovFileIdAnnotations: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
  usePostAssessorMovsMovFileIdAnnotations: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePatchAssessorAnnotationsAnnotationId: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteAssessorAnnotationsAnnotationId: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostAssessorAssessmentResponsesResponseIdMovsUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("next/dynamic", async () => {
  const React = await import("react");

  return {
    default: (loader: () => Promise<{ default: React.ComponentType<any> }>, options: any) => {
      const LazyComponent = React.lazy(loader);
      return function DynamicComponent(props: any) {
        return (
          <React.Suspense fallback={options?.loading ? React.createElement(options.loading) : null}>
            <LazyComponent {...props} />
          </React.Suspense>
        );
      };
    },
  };
});

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: () => ({
    user: {
      id: 1,
      role: "ASSESSOR",
      assessor_area_id: 2,
    },
    token: "mock-token",
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/components/features/assessments/tree-navigation", () => ({
  TreeNavigator: () => <div data-testid="tree-nav" />,
}));

vi.mock("../MiddleMovFilesPanel", () => ({
  MiddleMovFilesPanel: () => <div data-testid="mov-panel" />,
}));

vi.mock("@/components/features/shared/TechNotesPDF", () => ({
  TechNotesPDF: () => null,
}));

const mockUseGetAssessorAssessmentsAssessmentId =
  useGetAssessorAssessmentsAssessmentId as unknown as ReturnType<typeof vi.fn>;

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function makeAssessment() {
  return {
    success: true,
    assessment_id: 1,
    assessment: {
      id: 1,
      status: "SUBMITTED",
      rework_count: 0,
      my_area_rework_used: false,
      my_area_status: "draft",
      area_assessor_approved: {},
      blgu_user: {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        barangay: { id: 1, name: "Test Barangay" },
      },
      responses: [
        {
          id: 101,
          indicator_id: 1,
          indicator: {
            id: 1,
            name: "Test Indicator",
            indicator_code: "1.1.1",
            governance_area: { id: 2, name: "Disaster Preparedness" },
            validation_rule: "ALL_ITEMS_REQUIRED",
            checklist_items: [
              {
                id: 1,
                item_id: "item_1",
                label: "Checklist item 1",
                item_type: "checkbox",
                required: true,
              },
              {
                id: 2,
                item_id: "item_2",
                label: "How many documents were submitted?",
                item_type: "document_count",
                required: true,
              },
            ],
          },
          movs: [{ id: 1, uploaded_at: "2024-01-01T00:00:00Z" }],
          response_data: {},
          feedback_comments: [],
          flagged_mov_file_ids: [],
          requires_rework: false,
        },
      ],
    },
  };
}

function makeAssessmentWithExistingValues() {
  return {
    success: true,
    assessment_id: 1,
    assessment: {
      id: 1,
      status: "SUBMITTED",
      rework_count: 0,
      my_area_rework_used: false,
      my_area_status: "draft",
      area_assessor_approved: {},
      blgu_user: {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        barangay: { id: 1, name: "Test Barangay" },
      },
      responses: [
        {
          id: 101,
          indicator_id: 1,
          indicator: {
            id: 1,
            name: "Test Indicator",
            indicator_code: "1.1.1",
            governance_area: { id: 2, name: "Disaster Preparedness" },
            validation_rule: "ALL_ITEMS_REQUIRED",
            checklist_items: [
              {
                id: 1,
                item_id: "item_1",
                label: "Checklist item 1",
                item_type: "checkbox",
                required: true,
              },
              {
                id: 2,
                item_id: "item_2",
                label: "How many documents were submitted?",
                item_type: "document_count",
                required: true,
              },
            ],
          },
          movs: [{ id: 1, uploaded_at: "2024-01-01T00:00:00Z" }],
          response_data: {
            assessor_val_item_1: true,
            assessor_val_item_2: "111",
          },
          feedback_comments: [
            {
              id: 10,
              comment: "Old assessor feedback",
              comment_type: "validation",
              is_internal_note: false,
              created_at: "2024-01-01T00:00:00Z",
              assessor: { role: "ASSESSOR" },
            },
          ],
          flagged_mov_file_ids: [],
          requires_rework: false,
        },
      ],
    },
  };
}

describe("AssessorValidationClient real panel integration", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    validateMutateAsync.mockResolvedValue({ success: true });
  });

  it("autosaves the actual checkbox, numeric input, and general feedback values", async () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    const user = userEvent.setup();

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    const checkbox = await screen.findByRole("checkbox");
    const countInput = await screen.findByPlaceholderText(/Enter count/i);
    const feedback = await screen.findByPlaceholderText(
      /Provide an overall summary of the required changes or general instructions/i
    );

    await user.click(checkbox);
    await user.clear(countInput);
    await user.type(countInput, "123");
    await user.clear(feedback);
    await user.type(feedback, "Updated assessor feedback");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3700));
    });

    expect(validateMutateAsync).toHaveBeenCalledWith({
      responseId: 101,
      data: {
        public_comment: "Updated assessor feedback",
        response_data: {
          assessor_val_item_1: true,
          assessor_val_item_2: "123",
        },
      },
    });
  });

  it("autosaves edits to previously persisted values", async () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessmentWithExistingValues(),
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    const user = userEvent.setup();

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    const checkbox = await screen.findByRole("checkbox");
    const countInput = await screen.findByDisplayValue("111");
    const feedback = await screen.findByDisplayValue("Old assessor feedback");

    await user.click(checkbox);
    await user.clear(countInput);
    await user.type(countInput, "456");
    await user.clear(feedback);
    await user.type(feedback, "New assessor feedback");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3700));
    });

    expect(validateMutateAsync).toHaveBeenCalledWith({
      responseId: 101,
      data: {
        public_comment: "New assessor feedback",
        response_data: {
          assessor_val_item_1: false,
          assessor_val_item_2: "456",
        },
      },
    });
  });

  it("does NOT trigger a phantom autosave on initial load with clean empty data", async () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    // Wait for RightAssessorPanel to load (dynamic import) and all effects to settle
    await screen.findByRole("checkbox");

    // Wait longer than the autosave timer to catch any phantom saves
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3700));
    });

    // No save should have been triggered — data is clean
    expect(validateMutateAsync).not.toHaveBeenCalled();
  });

  it("does NOT trigger a phantom autosave on initial load with existing saved data", async () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessmentWithExistingValues(),
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    // Wait for RightAssessorPanel to load and display existing values
    await screen.findByDisplayValue("Old assessor feedback");

    // Wait longer than the autosave timer
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3700));
    });

    // No save should have been triggered — loaded data matches server
    expect(validateMutateAsync).not.toHaveBeenCalled();
  });

  it("simulated refresh: values survive when data is reloaded after save", async () => {
    const initialData = makeAssessment();
    let currentDataUpdatedAt = Date.now();

    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: initialData,
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: currentDataUpdatedAt,
    });

    const { rerender } = render(wrap(<AssessorValidationClient assessmentId={1} />));

    const user = userEvent.setup();

    const checkbox = await screen.findByRole("checkbox");
    const countInput = await screen.findByPlaceholderText(/Enter count/i);
    const feedback = await screen.findByPlaceholderText(
      /Provide an overall summary of the required changes or general instructions/i
    );

    await user.click(checkbox);
    await user.clear(countInput);
    await user.type(countInput, "42");
    await user.clear(feedback);
    await user.type(feedback, "My feedback");

    // Wait for autosave
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3700));
    });

    expect(validateMutateAsync).toHaveBeenCalledTimes(1);

    // Now simulate a "refresh": update the mock data to reflect what was saved,
    // just as the server would return after a page reload
    const refreshedData = makeAssessment();
    refreshedData.assessment.responses[0].response_data = {
      assessor_val_item_1: true,
      assessor_val_item_2: "42",
    };
    refreshedData.assessment.responses[0].feedback_comments = [
      {
        id: 99,
        comment: "My feedback",
        comment_type: "validation",
        is_internal_note: false,
        created_at: new Date().toISOString(),
        assessor: { role: "ASSESSOR" },
      },
    ];

    currentDataUpdatedAt = Date.now();
    validateMutateAsync.mockClear();

    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: refreshedData,
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: currentDataUpdatedAt,
    });

    // Rerender to simulate the data refresh
    rerender(wrap(<AssessorValidationClient assessmentId={1} />));

    // Wait for all effects to settle + autosave timer
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3700));
    });

    // Verify values survived the "refresh"
    expect(screen.getByDisplayValue("My feedback")).toBeTruthy();
    expect(screen.getByDisplayValue("42")).toBeTruthy();

    // No phantom save should have been triggered after refresh
    expect(validateMutateAsync).not.toHaveBeenCalled();
  }, 15000);

  it("preserves an unsaved checked checkbox across a stale refetch", async () => {
    const initialData = makeAssessment();
    let currentDataUpdatedAt = Date.now();
    const client = createClient();

    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: initialData,
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: currentDataUpdatedAt,
    });

    const { rerender } = render(
      <QueryClientProvider client={client}>
        <AssessorValidationClient assessmentId={1} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();

    const checkbox = await screen.findByRole("checkbox");
    await user.click(checkbox);

    expect(checkbox).toBeChecked();

    const staleRefetchedData = makeAssessment();
    staleRefetchedData.assessment.responses[0].feedback_comments = [
      {
        id: 77,
        comment: "Server-side note changed",
        comment_type: "validation",
        is_internal_note: false,
        created_at: new Date().toISOString(),
        assessor: { role: "ASSESSOR" },
      },
    ];

    currentDataUpdatedAt = Date.now();
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: staleRefetchedData,
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: currentDataUpdatedAt,
    });

    rerender(
      <QueryClientProvider client={client}>
        <AssessorValidationClient assessmentId={1} />
      </QueryClientProvider>
    );

    const checkboxAfterRefetch = await screen.findByRole("checkbox");
    expect(checkboxAfterRefetch).toBeChecked();
  });
});
