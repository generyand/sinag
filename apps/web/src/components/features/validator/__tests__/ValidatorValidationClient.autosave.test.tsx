import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useGetAssessorAssessmentsAssessmentId,
  usePostAssessorAssessmentResponsesResponseIdValidate,
  usePostAssessorAssessmentsAssessmentIdFinalize,
  getGetAssessorAssessmentsAssessmentIdQueryKey,
} from "@sinag/shared";
import { ValidatorValidationClient } from "../ValidatorValidationClient";

const routerPush = vi.fn();
const validateMutateAsync = vi.fn();
const finalizeMutateAsync = vi.fn();
const calibrateMutateAsync = vi.fn();

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
    mutateAsync: calibrateMutateAsync,
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
          <button onClick={() => props.setField(202, "publicComment", "response 202 draft")}>
            Edit response 202 comment
          </button>
          <button onClick={() => props.setField(202, "publicComment", "")}>
            Revert response 202 comment
          </button>
          <button onClick={() => props.onChecklistChange?.("checklist_201_requirement_1", true)}>
            Toggle validator checklist
          </button>
          <button onClick={() => props.onChecklistChange?.("checklist_201_requirement_1", false)}>
            Set validator checklist false
          </button>
          <button onClick={() => props.onChecklistChange?.("checklist_201_requirement_2", true)}>
            Toggle validator checklist 2
          </button>
          <button onClick={() => props.onCalibrationFlagChange?.(201, true)}>
            Flag validator calibration
          </button>
        </div>
      );
    }

    return MockRightAssessorPanel;
  },
}));

vi.mock("../../assessor/validation/MiddleMovFilesPanel", () => ({
  MiddleMovFilesPanel: (props: any) => (
    <div data-testid="mov-panel">
      <button onClick={() => props.onMovAttentionChange?.(201, 1, true)}>
        Add validator MOV note
      </button>
      <button onClick={() => props.onMovAttentionChange?.(201, 1, false)}>
        Clear validator MOV note
      </button>
    </div>
  ),
}));

vi.mock("@/components/features/assessments/tree-navigation", () => ({
  TreeNavigator: ({ assessment }: any) => (
    <div data-testid="tree-nav">
      {assessment.governanceAreas.flatMap((area: any) =>
        area.indicators.map((indicator: any) => (
          <div
            key={indicator.id}
            data-testid={`tree-indicator-${indicator.id}`}
            data-has-mov-notes={String(Boolean(indicator.hasMovNotes))}
            data-status={indicator.status}
          >
            {indicator.code}
          </div>
        ))
      )}
    </div>
  ),
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

function expectSidebarAttention(responseId: number, hasAttention: boolean) {
  const indicators = screen.getAllByTestId(`tree-indicator-${responseId}`);

  expect(indicators.length).toBeGreaterThan(0);
  indicators.forEach((indicator) => {
    expect(indicator).toHaveAttribute("data-has-mov-notes", String(hasAttention));
  });
}

function makeAssessment(
  responseOverrides: Record<string, any> = {},
  assessmentOverrides: Record<string, any> = {},
  options: { includeSecondResponse?: boolean } = {}
) {
  const responses = [
    {
      id: 201,
      indicator_id: 1,
      indicator: {
        id: 1,
        name: "Test Indicator",
        indicator_code: "2.1.1",
        governance_area: { id: 2, name: "Disaster Preparedness" },
        checklist_items: [{ item_id: "requirement_1", item_type: "checkbox", required: true }],
        validation_rule: "ALL_ITEMS_REQUIRED",
      },
      movs: [{ id: 1, uploaded_at: "2024-01-01T00:00:00Z" }],
      response_data: {},
      feedback_comments: [],
      validation_status: "PASS",
      flagged_for_calibration: false,
      ...responseOverrides,
    },
  ];

  if (options.includeSecondResponse) {
    responses.push({
      id: 202,
      indicator_id: 2,
      indicator: {
        id: 2,
        name: "Second Test Indicator",
        indicator_code: "2.1.2",
        governance_area: { id: 2, name: "Disaster Preparedness" },
        checklist_items: [{ item_id: "requirement_1", item_type: "checkbox", required: true }],
        validation_rule: "ALL_ITEMS_REQUIRED",
      },
      movs: [{ id: 2, uploaded_at: "2024-01-01T00:00:00Z" }],
      response_data: {},
      feedback_comments: [],
      validation_status: "PASS",
      flagged_for_calibration: false,
    });
  }

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
      ...assessmentOverrides,
      responses,
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
    calibrateMutateAsync.mockResolvedValue({ calibrated_indicators_count: 1 });
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

  it("shows rotating feedback while opening the compliance overview", async () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    const complianceButton = screen.getByRole("button", {
      name: /compliance overview/i,
    });

    await act(async () => {
      fireEvent.click(complianceButton);
      await Promise.resolve();
    });

    expect(
      screen.getByRole("button", {
        name: /opening overview/i,
      })
    ).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    expect(
      screen.getByRole("button", {
        name: /opening overview/i,
      })
    ).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(1300);
    });

    expect(
      screen.getByRole("button", {
        name: /saving your changes/i,
      })
    ).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(
      screen.getByRole("button", {
        name: /preparing suggestions/i,
      })
    ).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(
      screen.getByRole("button", {
        name: /preparing suggestions/i,
      })
    ).toBeDisabled();

    expect(routerPush).toHaveBeenCalledWith("/validator/submissions/1/compliance");
  });

  it("does not allow duplicate compliance overview opens while busy", async () => {
    const activeSave = deferred<unknown>();
    validateMutateAsync.mockImplementationOnce(() => activeSave.promise);
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    // Wait for hydration
    await act(async () => {
      await Promise.resolve();
    });

    // Make it dirty so flushPendingChanges has to wait
    fireEvent.click(screen.getAllByRole("button", { name: "Edit validator comment once" })[0]);

    const complianceButton = screen.getByRole("button", {
      name: /compliance overview/i,
    });

    await act(async () => {
      fireEvent.click(complianceButton);
      await Promise.resolve();
    });

    // The first click is now waiting for activeSave. The second click should be ignored.
    const busyButton = screen.getByRole("button", { name: /opening overview/i });
    expect(busyButton).toBeDisabled();

    await act(async () => {
      fireEvent.click(busyButton);
      await Promise.resolve();
    });

    expect(routerPush).not.toHaveBeenCalled();

    await act(async () => {
      activeSave.resolve({ success: true });
      await activeSave.promise;
      await Promise.resolve();
    });

    expect(routerPush).toHaveBeenCalledTimes(1);
  });

  it("cancels a stale pending queue navigation when opening compliance overview", async () => {
    const activeSave = deferred<unknown>();
    validateMutateAsync.mockImplementationOnce(() => activeSave.promise);
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    // Make the page dirty so link navigation is intercepted and waits for the save.
    fireEvent.click(screen.getAllByRole("button", { name: "Edit validator comment once" })[0]);

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: /queue/i }));
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /compliance overview/i }));
      await Promise.resolve();
    });

    await act(async () => {
      activeSave.resolve({ success: true });
      await activeSave.promise;
      await Promise.resolve();
    });

    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith("/validator/submissions/1/compliance");
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

  it("re-saves the latest validator checklist edit made while the previous auto-save is still in flight", async () => {
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

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    fireEvent.click(screen.getAllByRole("button", { name: "Toggle validator checklist" })[0]);

    await act(async () => {
      vi.advanceTimersByTime(3500);
      await Promise.resolve();
    });

    expect(validateMutateAsync).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: "Set validator checklist false" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Toggle validator checklist 2" })[0]);

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
        public_comment: null,
        response_data: { validator_val_requirement_2: true },
        flagged_for_calibration: false,
      },
    });
  });

  it("does not include a cleared validator checklist item in later saves after server hydration removes it", async () => {
    validateMutateAsync.mockResolvedValue({ success: true });
    let assessmentData = makeAssessment({
      response_data: { validator_val_requirement_1: true },
    });

    mockUseGetAssessorAssessmentsAssessmentId.mockImplementation(() => ({
      data: assessmentData,
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    }));

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <ValidatorValidationClient assessmentId={1} />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Set validator checklist false" })[0]);

    await act(async () => {
      vi.advanceTimersByTime(3500);
      await Promise.resolve();
    });

    expect(validateMutateAsync).toHaveBeenCalledTimes(1);
    expect(validateMutateAsync).toHaveBeenLastCalledWith({
      responseId: 201,
      data: {
        validation_status: "PASS",
        public_comment: null,
        response_data: { validator_val_requirement_1: false },
        flagged_for_calibration: false,
      },
    });

    assessmentData = makeAssessment({
      response_data: {},
    });

    rerender(
      <QueryClientProvider client={client}>
        <ValidatorValidationClient assessmentId={1} />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Edit validator comment once" })[0]);

    await act(async () => {
      vi.advanceTimersByTime(3500);
      await Promise.resolve();
    });

    expect(validateMutateAsync).toHaveBeenCalledTimes(2);
    expect(validateMutateAsync).toHaveBeenLastCalledWith({
      responseId: 201,
      data: {
        validation_status: "PASS",
        public_comment: "validator first draft",
        response_data: undefined,
        flagged_for_calibration: false,
      },
    });
  });

  it("keeps the global dirty status when one dirty validator response is reverted but another remains dirty", async () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment({}, {}, { includeSecondResponse: true }),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    fireEvent.click(screen.getAllByRole("button", { name: "Edit validator comment once" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Edit response 202 comment" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Revert response 202 comment" })[0]);

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("force-saves dirty validator edits when the autosave status action is clicked", async () => {
    validateMutateAsync.mockResolvedValue({ success: true });
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    fireEvent.click(screen.getAllByRole("button", { name: "Edit validator comment once" })[0]);
    fireEvent.click(screen.getByRole("button", { name: /save changes now/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(validateMutateAsync).toHaveBeenCalledWith({
      responseId: 201,
      data: {
        validation_status: "PASS",
        public_comment: "validator first draft",
        response_data: undefined,
        flagged_for_calibration: false,
      },
    });
  });

  it("flushes pending validator edits before internal navigation", async () => {
    validateMutateAsync.mockResolvedValue({ success: true });
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    fireEvent.click(screen.getAllByRole("button", { name: "Edit validator comment once" })[0]);
    fireEvent.click(screen.getByRole("link", { name: /queue/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(validateMutateAsync).toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith("/validator/submissions");
  });

  it("blocks browser unload while validator edits are pending", () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    fireEvent.click(screen.getAllByRole("button", { name: "Edit validator comment once" })[0]);

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("submits for calibration after pending validator edits are saved", async () => {
    validateMutateAsync.mockResolvedValue({ success: true });
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    fireEvent.click(screen.getAllByRole("button", { name: "Edit validator comment once" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Flag validator calibration" })[0]);
    fireEvent.click(screen.getByRole("button", { name: /submit for calibration/i }));
    fireEvent.click(screen.getByRole("button", { name: /yes, submit for calibration/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(validateMutateAsync).toHaveBeenCalled();
    expect(calibrateMutateAsync).toHaveBeenCalledWith({ assessmentId: 1 });
  });

  it("patches the cached assessment and invalidates queries after a successful validator autosave", async () => {
    validateMutateAsync.mockResolvedValue({ success: true });

    const assessment = makeAssessment();
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: assessment,
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    client.setQueryData(getGetAssessorAssessmentsAssessmentIdQueryKey(1), assessment);
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    render(
      <QueryClientProvider client={client}>
        <ValidatorValidationClient assessmentId={1} />
      </QueryClientProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Edit validator comment once" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Toggle validator checklist" })[0]);

    await act(async () => {
      vi.advanceTimersByTime(3500);
      await Promise.resolve();
    });

    const cached = client.getQueryData(getGetAssessorAssessmentsAssessmentIdQueryKey(1)) as any;
    const cachedResponse = cached.assessment.responses[0];

    // Assert cache was patched (matching assessor behavior)
    expect(cachedResponse.response_data.validator_val_requirement_1).toBe(true);
    // Comment should be in feedback_comments
    const validatorComment = cachedResponse.feedback_comments.find(
      (c: any) => c.comment_type === "validation" && c.assessor?.role === "VALIDATOR"
    );
    expect(validatorComment?.comment).toBe("validator first draft");

    // Assert invalidation was called
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetAssessorAssessmentsAssessmentIdQueryKey(1),
      exact: true,
    });
  });

  it("renders loading state without entering an update loop before assessment data arrives", () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    expect(() => {
      render(wrap(<ValidatorValidationClient assessmentId={1} />));
    }).not.toThrow();

    expect(screen.getByText(/loading assessment/i)).toBeInTheDocument();
  });

  it("marks a validator sidebar indicator as needing attention when a MOV has validator notes", () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment({
        movs: [
          {
            id: 1,
            uploaded_at: "2024-01-01T00:00:00Z",
            validator_notes: "no signature",
            flagged_for_calibration: false,
          },
        ],
      }),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    expectSidebarAttention(201, true);
  });

  it("counts a saved validator MOV note as reviewed even without a validation status", () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment({
        validation_status: null,
        movs: [
          {
            id: 1,
            uploaded_at: "2024-01-01T00:00:00Z",
            validator_notes: "no signature",
            flagged_for_calibration: false,
          },
        ],
      }),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    screen.getAllByTestId("tree-indicator-201").forEach((indicator) => {
      expect(indicator).toHaveAttribute("data-has-mov-notes", "true");
      expect(indicator).toHaveAttribute("data-status", "completed");
    });
  });

  it("marks a validator sidebar indicator as needing attention when a MOV is flagged for calibration", () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment({
        movs: [
          {
            id: 1,
            uploaded_at: "2024-01-01T00:00:00Z",
            validator_notes: "",
            flagged_for_calibration: true,
          },
        ],
      }),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    expectSidebarAttention(201, true);
  });

  it("updates the validator sidebar warning state immediately when a MOV note is added locally", () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    expectSidebarAttention(201, false);

    fireEvent.click(screen.getAllByRole("button", { name: "Add validator MOV note" })[0]);

    expectSidebarAttention(201, true);
  });

  it("clears the validator sidebar warning state when the only local MOV attention is removed", () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    fireEvent.click(screen.getAllByRole("button", { name: "Add validator MOV note" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Clear validator MOV note" })[0]);

    expectSidebarAttention(201, false);
  });

  it("keeps saved server MOV attention after a local override is cleared", () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment({
        movs: [
          {
            id: 1,
            uploaded_at: "2024-01-01T00:00:00Z",
            validator_notes: "saved note",
            flagged_for_calibration: false,
          },
        ],
      }),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    fireEvent.click(screen.getAllByRole("button", { name: "Clear validator MOV note" })[0]);

    expectSidebarAttention(201, true);
  });

  it("shows completed sidebar state after post-calibration same-field replacement files are clean", () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(
        {
          flagged_for_calibration: true,
          validation_status: "PASS",
          response_data: {
            validator_val_requirement_1: true,
          },
          movs: [
            {
              id: 1,
              field_id: "ordinance",
              uploaded_at: "2026-03-01T00:00:00.000Z",
              upload_origin: "blgu",
              validator_notes: "missing signature",
              flagged_for_calibration: true,
            },
            {
              id: 2,
              field_id: "ordinance",
              uploaded_at: "2026-04-01T00:00:00.000Z",
              upload_origin: "blgu",
              validator_notes: "",
              flagged_for_calibration: false,
            },
          ],
        },
        { calibration_requested_at: "2026-03-15T00:00:00.000Z" }
      ),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    screen.getAllByTestId("tree-indicator-201").forEach((indicator) => {
      expect(indicator).toHaveAttribute("data-status", "completed");
      expect(indicator).toHaveAttribute("data-has-mov-notes", "false");
    });
  });

  it("keeps sidebar attention when a flagged existing file is not superseded by a different field", () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment(
        {
          validation_status: null,
          response_data: {
            validator_val_requirement_1: true,
          },
          movs: [
            {
              id: 1,
              field_id: "ordinance",
              uploaded_at: "2026-03-01T00:00:00.000Z",
              upload_origin: "blgu",
              validator_notes: "missing signature",
              flagged_for_calibration: true,
            },
            {
              id: 2,
              field_id: "attendance",
              uploaded_at: "2026-04-01T00:00:00.000Z",
              upload_origin: "blgu",
              validator_notes: "",
              flagged_for_calibration: false,
            },
          ],
        },
        { calibration_requested_at: "2026-03-15T00:00:00.000Z" }
      ),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    screen.getAllByTestId("tree-indicator-201").forEach((indicator) => {
      expect(indicator).toHaveAttribute("data-status", "not_started");
      expect(indicator).toHaveAttribute("data-has-mov-notes", "true");
    });
  });

  it("disables calibration submission when every governance area has already been calibrated", async () => {
    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: makeAssessment({}, { calibrated_area_ids: [1, 2, 3, 4, 5, 6] }),
      isLoading: false,
      error: null,
    });

    render(wrap(<ValidatorValidationClient assessmentId={1} />));

    const calibrationButton = screen.getByRole("button", { name: /all areas calibrated/i });

    expect(calibrationButton).toBeDisabled();
    expect(calibrationButton.parentElement).toHaveAttribute(
      "title",
      "All governance areas have already been calibrated (max 1 calibration per area)"
    );

    fireEvent.click(calibrationButton);

    expect(screen.queryByText("Submit for Calibration?")).not.toBeInTheDocument();
  });
});
