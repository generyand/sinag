import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ValidatorSubmissionsPage from "../page";
import { useAssessorQueue } from "@/hooks/useAssessor";

vi.mock("@/hooks/useAssessor", () => ({
  useAssessorQueue: vi.fn(),
}));

vi.mock("@/components/features/submissions", async () => {
  const actual = await vi.importActual<typeof import("@/components/features/submissions")>(
    "@/components/features/submissions"
  );

  return {
    ...actual,
    KPICards: () => <div data-testid="kpi-cards" />,
    SubmissionsFilters: () => <div data-testid="submissions-filters" />,
  };
});

const mockedUseAssessorQueue = vi.mocked(useAssessorQueue);

describe("ValidatorSubmissionsPage status and action alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps calibration-pending submissions aligned even when submission_type is missing", () => {
    mockedUseAssessorQueue.mockReturnValue({
      data: [
        {
          assessment_id: 11,
          barangay_name: "San Miguel",
          updated_at: "2026-03-20T10:00:00Z",
          global_status: "REWORK",
          status: "REWORK",
          area_progress: 67,
          reviewed_count: 4,
          total_count: 6,
          re_review_progress: 0,
          submission_type: null,
          is_calibration_rework: true,
          pending_calibrations_count: 1,
        },
      ] as any,
      isLoading: false,
      error: null,
    });

    render(<ValidatorSubmissionsPage />);

    const row = screen.getByText("Brgy. San Miguel").closest("tr");
    expect(row).not.toBeNull();

    const scoped = within(row as HTMLElement);
    expect(scoped.getByText("Sent for Calibration")).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: /view for san miguel/i })).toHaveTextContent("View");
  });

  it("shows awaiting re-validation when calibration was resubmitted but re-review has not started", () => {
    mockedUseAssessorQueue.mockReturnValue({
      data: [
        {
          assessment_id: 12,
          barangay_name: "San Jose",
          updated_at: "2026-03-20T11:00:00Z",
          global_status: "AWAITING_FINAL_VALIDATION",
          status: "AWAITING_FINAL_VALIDATION",
          area_progress: 83,
          reviewed_count: 5,
          total_count: 6,
          re_review_progress: 0,
          submission_type: "rework_resubmission",
          is_calibration_rework: false,
          pending_calibrations_count: 0,
        },
      ] as any,
      isLoading: false,
      error: null,
    });

    render(<ValidatorSubmissionsPage />);

    const row = screen.getByText("Brgy. San Jose").closest("tr");
    expect(row).not.toBeNull();

    const scoped = within(row as HTMLElement);
    expect(scoped.getByText("Awaiting Re-Validation")).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: /re-validate for san jose/i })).toHaveTextContent(
      "Re-Validate"
    );
  });

  it("shows resume re-validation once calibration re-review is already in progress", () => {
    mockedUseAssessorQueue.mockReturnValue({
      data: [
        {
          assessment_id: 13,
          barangay_name: "San Rafael",
          updated_at: "2026-03-20T12:00:00Z",
          global_status: "AWAITING_FINAL_VALIDATION",
          status: "AWAITING_FINAL_VALIDATION",
          area_progress: 100,
          reviewed_count: 6,
          total_count: 6,
          re_review_progress: 50,
          submission_type: "rework_resubmission",
          is_calibration_rework: false,
          pending_calibrations_count: 0,
        },
      ] as any,
      isLoading: false,
      error: null,
    });

    render(<ValidatorSubmissionsPage />);

    const row = screen.getByText("Brgy. San Rafael").closest("tr");
    expect(row).not.toBeNull();

    const scoped = within(row as HTMLElement);
    expect(scoped.getByText("Re-Validation in Progress")).toBeInTheDocument();
    expect(
      scoped.getByRole("button", { name: /resume re-validation for san rafael/i })
    ).toHaveTextContent("Resume Re-Validation");
  });
});
