import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useGetAssessorAssessmentsAssessmentId,
  usePostAssessorAssessmentResponsesResponseIdValidate,
  usePostAssessorAssessmentsAssessmentIdFinalize,
} from "@sinag/shared";
import { ValidatorValidationClient } from "../ValidatorValidationClient";

const routerPush = vi.fn();
const validateMutateAsync = vi.fn();
const finalizeMutateAsync = vi.fn();

vi.mock("@sinag/shared", () => ({
  getGetAssessorAssessmentsAssessmentIdQueryKey: (id: number) => ["assessor", "assessments", id],
  useGetAssessorAssessmentsAssessmentId: vi.fn(),
  usePostAssessorAssessmentResponsesResponseIdValidate: vi.fn(() => ({
    mutateAsync: validateMutateAsync,
    isPending: false,
  })),
  usePostAssessorAssessmentsAssessmentIdFinalize: vi.fn(() => ({
    mutateAsync: finalizeMutateAsync,
    isPending: false,
  })),
  usePostAssessorAssessmentsAssessmentIdCalibrate: () => ({
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
      return (
        <div data-testid="mock-validator-panel">
          <button onClick={() => props.setField(201, "publicComment", "validator first draft")}>
            Edit validator comment once
          </button>
          <button onClick={() => props.setField(201, "publicComment", "validator latest draft")}>
            Edit validator comment twice
          </button>
        </div>
      );
    }

    return MockRightAssessorPanel;
  },
}));

vi.mock("../../assessor/validation/MiddleMovFilesPanel", () => ({
  MiddleMovFilesPanel: () => <div data-testid="mov-panel" />,
}));

vi.mock("@/components/features/assessments/tree-navigation", () => ({
  TreeNavigator: () => <div data-testid="tree-nav" />,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

const mockUseGetAssessorAssessmentsAssessmentId =
  useGetAssessorAssessmentsAssessmentId as unknown as ReturnType<typeof vi.fn>;
const mockUsePostValidate =
  usePostAssessorAssessmentResponsesResponseIdValidate as unknown as ReturnType<typeof vi.fn>;
const mockUseFinalize = usePostAssessorAssessmentsAssessmentIdFinalize as unknown as ReturnType<
  typeof vi.fn
>;

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

function makeAssessment() {
  return {
    success: true,
    assessment_id: 1,
    assessment: {
      id: 1,
      status: "IN_REVIEW",
      blgu_user: {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        barangay: { id: 1, name: "Test Barangay" },
      },
      calibrated_area_ids: [],
      responses: [
        {
          id: 201,
          indicator_id: 1,
          indicator: {
            id: 1,
            name: "Test Indicator",
            indicator_code: "2.1.1",
            governance_area: { id: 2, name: "Disaster Preparedness" },
          },
          movs: [{ id: 1, uploaded_at: "2024-01-01T00:00:00Z" }],
          response_data: {},
          feedback_comments: [],
          validation_status: "PASS",
          flagged_for_calibration: false,
        },
      ],
    },
  };
}

describe("ValidatorValidationClient autosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockUsePostValidate.mockReturnValue({
      mutateAsync: validateMutateAsync,
      isPending: false,
    });
    mockUseFinalize.mockReturnValue({
      mutateAsync: finalizeMutateAsync,
      isPending: false,
    });
    finalizeMutateAsync.mockResolvedValue({ new_status: "AWAITING_MLGOO_APPROVAL" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("re-saves the latest validator edit made while the previous auto-save is still in flight", async () => {
    const firstSave = deferred<unknown>();

    validateMutateAsync
      .mockImplementationOnce(() => firstSave.promise)
      .mockResolvedValueOnce({ success: true });

    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    fireEvent.click(screen.getAllByRole("button", { name: "Edit validator comment once" })[0]);

    await act(async () => {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(3500);
      await Promise.resolve();
    });

    expect(validateMutateAsync).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: "Edit validator comment twice" })[0]);

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
      responseId: 201,
      data: {
        validation_status: "PASS",
        public_comment: "validator latest draft",
        response_data: undefined,
        flagged_for_calibration: false,
      },
    });
  });

  it("waits for an active auto-save before finalizing", async () => {
    const firstSave = deferred<unknown>();

    validateMutateAsync.mockImplementationOnce(() => firstSave.promise);
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    fireEvent.click(screen.getAllByRole("button", { name: "Edit validator comment once" })[0]);

    await act(async () => {
      vi.advanceTimersByTime(0);
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(3500);
      await Promise.resolve();
    });

    expect(validateMutateAsync).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: /Finalize Validation/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Yes, Finalize/i }));

    await act(async () => {
      firstSave.resolve({ success: true });
      await Promise.resolve();
    });

    expect(finalizeMutateAsync).toHaveBeenCalledWith({ assessmentId: 1 });
  });
});
