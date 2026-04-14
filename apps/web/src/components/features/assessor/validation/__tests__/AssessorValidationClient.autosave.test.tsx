import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useGetAssessorAssessmentsAssessmentId,
  usePostAssessorAssessmentResponsesResponseIdValidate,
} from "@sinag/shared";
import { AssessorValidationClient } from "../AssessorValidationClient";

const routerPush = vi.fn();
const toast = vi.fn();
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
    push: routerPush,
    replace: vi.fn(),
  }),
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    function MockRightAssessorPanel(props: any) {
      const syncedChecklistResponsesRef = React.useRef<Set<number>>(new Set());

      React.useEffect(() => {
        const response = props.assessment?.assessment?.responses?.find(
          (item: any) => item.id === props.expandedId
        );
        const feedbackComments = response?.feedback_comments || [];
        const persistedComment = feedbackComments.find((comment: any) => {
          if (comment.comment_type !== "validation" || comment.is_internal_note) return false;
          return comment.assessor?.role?.toLowerCase() === "assessor";
        })?.comment;

        if (persistedComment && !props.form?.[response.id]?.publicComment) {
          props.setField(response.id, "publicComment", persistedComment);
        }
      }, [props]);

      React.useEffect(() => {
        const response = props.assessment?.assessment?.responses?.find(
          (item: any) => item.id === props.expandedId
        );
        if (!response || syncedChecklistResponsesRef.current.has(response.id)) {
          return;
        }

        Object.entries(response.response_data || {}).forEach(([key, value]) => {
          if (!key.startsWith("assessor_val_")) return;
          const fieldName = key.replace("assessor_val_", "");
          props.onChecklistChange?.(`checklist_${response.id}_${fieldName}`, value);
          syncedChecklistResponsesRef.current.add(response.id);
        });
      }, [props]);

      return (
        <div data-testid="mock-right-assessor-panel">
          <button onClick={() => props.setField(101, "publicComment", "first draft")}>
            Edit assessor comment once
          </button>
          <button onClick={() => props.setField(101, "publicComment", "latest draft")}>
            Edit assessor comment twice
          </button>
          <button onClick={() => props.onChecklistChange?.("checklist_101_item_1", true)}>
            Toggle assessor checklist
          </button>
          <button onClick={() => props.onChecklistChange?.("checklist_101_item_1", false)}>
            Set assessor checklist false
          </button>
          <button onClick={() => props.onReworkFlagChange?.(101, true)}>Flag for rework</button>
        </div>
      );
    }

    return MockRightAssessorPanel;
  },
}));

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
    toast,
  }),
}));

vi.mock("@/components/features/assessments/tree-navigation", () => ({
  TreeNavigator: () => <div data-testid="tree-nav" />,
}));

vi.mock("../MiddleMovFilesPanel", () => ({
  MiddleMovFilesPanel: () => <div data-testid="mov-panel" />,
}));

const mockUseGetAssessorAssessmentsAssessmentId =
  useGetAssessorAssessmentsAssessmentId as unknown as ReturnType<typeof vi.fn>;
const mockUsePostValidate =
  usePostAssessorAssessmentResponsesResponseIdValidate as unknown as ReturnType<typeof vi.fn>;

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

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

function makeAssessment(overrides?: {
  feedbackComments?: any[];
  responseData?: Record<string, unknown>;
  requiresRework?: boolean;
}) {
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
            indicator_code: "2.1.1",
            governance_area: { id: 2, name: "Disaster Preparedness" },
          },
          movs: [{ id: 1, uploaded_at: "2024-01-01T00:00:00Z" }],
          response_data: overrides?.responseData ?? {},
          feedback_comments: overrides?.feedbackComments ?? [],
          flagged_mov_file_ids: [],
          requires_rework: overrides?.requiresRework ?? false,
        },
      ],
    },
  };
}

describe("AssessorValidationClient autosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockUsePostValidate.mockReturnValue({
      mutateAsync: validateMutateAsync,
      isPending: false,
      reset: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not auto-save persisted assessor comments during initial hydration", async () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment({
        feedbackComments: [
          {
            id: 1,
            comment: "Persisted assessor comment",
            comment_type: "validation",
            is_internal_note: false,
            created_at: "2024-01-01T00:00:00Z",
            assessor: { role: "ASSESSOR" },
          },
        ],
      }),
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(validateMutateAsync).not.toHaveBeenCalled();
  });

  it("does not auto-save persisted assessor checklist data for rework responses during hydration", async () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment({
        requiresRework: true,
        responseData: {
          assessor_val_item_1: true,
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    await act(async () => {
      vi.runOnlyPendingTimers();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(validateMutateAsync).not.toHaveBeenCalled();
  });

  it("keeps later assessor edits dirty while the previous save is still in flight", async () => {
    const firstSave = deferred<unknown>();

    validateMutateAsync
      .mockImplementationOnce(() => firstSave.promise)
      .mockResolvedValueOnce({ success: true });

    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Edit assessor comment once" })[0]);

    await act(async () => {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(3500);
      await Promise.resolve();
    });

    expect(validateMutateAsync).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: "Edit assessor comment twice" })[0]);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    await act(async () => {
      firstSave.resolve({ success: true });
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(3500);
      await Promise.resolve();
    });

    expect(validateMutateAsync).toHaveBeenCalledTimes(2);

    expect(validateMutateAsync).toHaveBeenNthCalledWith(2, {
      responseId: 101,
      data: {
        public_comment: "latest draft",
        response_data: undefined,
      },
    });
  });

  it("does not auto-save false-only checklist defaults when nothing was previously persisted", async () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Set assessor checklist false" })[0]);

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(validateMutateAsync).not.toHaveBeenCalled();
  });

  it("flushes the latest draft before immediate queue navigation", async () => {
    validateMutateAsync.mockResolvedValue({ success: true });

    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Edit assessor comment once" })[0]);
    fireEvent.click(screen.getByRole("link", { name: /queue/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(validateMutateAsync).toHaveBeenCalledWith({
      responseId: 101,
      data: {
        public_comment: "first draft",
        response_data: undefined,
      },
    });
    expect(routerPush).toHaveBeenCalledWith("/assessor/submissions");
  });

  it("patches the cached assessment after a successful autosave", async () => {
    validateMutateAsync.mockResolvedValue({ success: true });

    const assessment = makeAssessment({
      feedbackComments: [
        {
          id: 1,
          comment: "Persisted assessor comment",
          comment_type: "validation",
          is_internal_note: false,
          created_at: "2024-01-01T00:00:00Z",
          assessor: { role: "ASSESSOR" },
        },
      ],
      responseData: {
        assessor_val_item_1: false,
      },
    });

    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: assessment,
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    const client = createClient();
    client.setQueryData(["assessor", "assessments", 1], assessment);

    render(
      <QueryClientProvider client={client}>
        <AssessorValidationClient assessmentId={1} />
      </QueryClientProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Edit assessor comment once" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Toggle assessor checklist" })[0]);

    await act(async () => {
      vi.advanceTimersByTime(3500);
      await Promise.resolve();
    });

    const cached = client.getQueryData(["assessor", "assessments", 1]) as any;
    const cachedResponse = cached.assessment.responses[0];

    expect(cachedResponse.response_data.assessor_val_item_1).toBe(true);
    expect(cachedResponse.feedback_comments[0].comment).toBe("first draft");
  });

  it("refetches the assessment query after a clean successful autosave", async () => {
    validateMutateAsync.mockResolvedValue({ success: true });

    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    const client = createClient();
    const invalidateQueriesSpy = vi
      .spyOn(client, "invalidateQueries")
      .mockResolvedValue(undefined as any);

    render(
      <QueryClientProvider client={client}>
        <AssessorValidationClient assessmentId={1} />
      </QueryClientProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Edit assessor comment once" })[0]);

    await act(async () => {
      vi.advanceTimersByTime(3500);
      await Promise.resolve();
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["assessor", "assessments", 1],
      exact: true,
    });

    invalidateQueriesSpy.mockRestore();
  });

  it("re-saves the latest assessor checklist edit made while the previous auto-save is still in flight", async () => {
    const firstSave = deferred<unknown>();
    validateMutateAsync
      .mockImplementationOnce(() => firstSave.promise)
      .mockResolvedValueOnce({ success: true });

    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    fireEvent.click(screen.getAllByRole("button", { name: "Toggle assessor checklist" })[0]);

    await act(async () => {
      vi.advanceTimersByTime(3500);
      await Promise.resolve();
    });

    expect(validateMutateAsync).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: "Set assessor checklist false" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Toggle assessor checklist" })[0]);

    await act(async () => {
      firstSave.resolve({ success: true });
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(3500);
      await Promise.resolve();
    });

    expect(validateMutateAsync).toHaveBeenCalledTimes(2);
    expect(validateMutateAsync).toHaveBeenNthCalledWith(2, {
      responseId: 101,
      data: {
        public_comment: null,
        response_data: { assessor_val_item_1: true },
      },
    });
  });
});
