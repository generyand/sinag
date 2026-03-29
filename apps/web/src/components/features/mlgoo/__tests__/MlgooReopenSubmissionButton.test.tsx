import { renderWithProviders, screen, userEvent, waitFor } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MlgooReopenSubmissionButton } from "../MlgooReopenSubmissionButton";

vi.mock("@sinag/shared", async () => {
  const actual = await vi.importActual("@sinag/shared");
  return {
    ...actual,
    usePostMlgooAssessmentsAssessmentIdReopen: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(),
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { usePostMlgooAssessmentsAssessmentIdReopen } from "@sinag/shared";

describe("MlgooReopenSubmissionButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides the reopen action immediately after a successful reopen", async () => {
    let resolveOnSuccess: (() => void) | undefined;
    const onSuccess = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveOnSuccess = resolve;
        })
    );

    vi.mocked(usePostMlgooAssessmentsAssessmentIdReopen).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue({}),
    } as any);

    const user = userEvent.setup();

    renderWithProviders(
      <MlgooReopenSubmissionButton
        assessmentId={2}
        assessmentStatus="SUBMITTED_FOR_REVIEW"
        isLockedForBlgu={false}
        barangayName="Poblacion"
        onSuccess={onSuccess}
      />
    );

    await user.click(screen.getByRole("button", { name: /reopen submission/i }));
    await user.click(screen.getByRole("button", { name: /confirm reopen/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByRole("button", { name: /reopen submission/i })).not.toBeInTheDocument();

    resolveOnSuccess?.();
  });
});
