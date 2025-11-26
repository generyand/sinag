/**
 * Tests for SubmissionValidation Component (Epic 5.0 - Story 5.11)
 *
 * Verifies that the component correctly:
 * - Displays loading state while fetching validation status
 * - Displays error state when validation check fails
 * - Shows validation summary (ready/incomplete)
 * - Lists incomplete indicators with proper styling
 * - Lists missing MOV files with proper styling
 * - Shows success state when all requirements met
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmissionValidation } from "../SubmissionValidation";

// Mock the generated hook
vi.mock("@sinag/shared", () => ({
  useGetAssessmentsAssessmentIdSubmissionStatus: vi.fn(),
}));

import { useGetAssessmentsAssessmentIdSubmissionStatus } from "@sinag/shared";

const mockUseGetSubmissionStatus = useGetAssessmentsAssessmentIdSubmissionStatus as ReturnType<
  typeof vi.fn
>;

describe("SubmissionValidation", () => {
  const mockAssessmentId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display loading skeleton while fetching data", () => {
    mockUseGetSubmissionStatus.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubmissionValidation assessmentId={mockAssessmentId} />);

    // Check for skeleton elements (using Skeleton component role)
    const skeletons = screen.getAllByRole("status", { hidden: true });
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should display error state with retry button when fetch fails", async () => {
    const mockRefetch = vi.fn();
    mockUseGetSubmissionStatus.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    render(<SubmissionValidation assessmentId={mockAssessmentId} />);

    expect(screen.getByText("Failed to Load Validation Status")).toBeInTheDocument();
    expect(
      screen.getByText("Unable to check submission readiness. Please try again.")
    ).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /retry/i });
    await userEvent.click(retryButton);

    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it("should display ready state when all requirements are met", () => {
    mockUseGetSubmissionStatus.mockReturnValue({
      data: {
        assessment_id: mockAssessmentId,
        status: "DRAFT",
        is_locked: false,
        rework_count: 0,
        rework_comments: null,
        rework_requested_at: null,
        rework_requested_by: null,
        validation_result: {
          is_valid: true,
          incomplete_indicators: [],
          missing_movs: [],
          error_message: null,
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubmissionValidation assessmentId={mockAssessmentId} />);

    expect(screen.getByText("Submission Readiness")).toBeInTheDocument();
    expect(screen.getByText("All requirements complete")).toBeInTheDocument();
    expect(screen.getByText("Ready to Submit")).toBeInTheDocument();
    expect(screen.getByText("All indicators complete")).toBeInTheDocument();
    expect(screen.getByText("All required files uploaded")).toBeInTheDocument();
    expect(
      screen.getByText("Assessment Ready for Submission")
    ).toBeInTheDocument();
  });

  it("should display incomplete indicators when validation fails", () => {
    mockUseGetSubmissionStatus.mockReturnValue({
      data: {
        assessment_id: mockAssessmentId,
        status: "DRAFT",
        is_locked: false,
        rework_count: 0,
        rework_comments: null,
        rework_requested_at: null,
        rework_requested_by: null,
        validation_result: {
          is_valid: false,
          incomplete_indicators: [
            "Indicator 1: Budget Transparency",
            "Indicator 2: Revenue Collection",
          ],
          missing_movs: [],
          error_message: "2 indicator(s) are incomplete",
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubmissionValidation assessmentId={mockAssessmentId} />);

    expect(screen.getByText("Incomplete")).toBeInTheDocument();
    expect(screen.getByText("2 requirements pending")).toBeInTheDocument();
    expect(screen.getByText("2 Incomplete Indicators")).toBeInTheDocument();
    expect(screen.getByText("Indicator 1: Budget Transparency")).toBeInTheDocument();
    expect(screen.getByText("Indicator 2: Revenue Collection")).toBeInTheDocument();
  });

  it("should display missing MOV files when validation fails", () => {
    mockUseGetSubmissionStatus.mockReturnValue({
      data: {
        assessment_id: mockAssessmentId,
        status: "DRAFT",
        is_locked: false,
        rework_count: 0,
        rework_comments: null,
        rework_requested_at: null,
        rework_requested_by: null,
        validation_result: {
          is_valid: false,
          incomplete_indicators: [],
          missing_movs: [
            "Indicator 3: Barangay Development Plan",
            "Indicator 4: Annual Budget Document",
          ],
          error_message: "2 indicator(s) are missing required file uploads",
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubmissionValidation assessmentId={mockAssessmentId} />);

    expect(screen.getByText("Incomplete")).toBeInTheDocument();
    expect(screen.getByText("2 Missing File Uploads")).toBeInTheDocument();
    expect(
      screen.getByText("Indicator 3: Barangay Development Plan")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Indicator 4: Annual Budget Document")
    ).toBeInTheDocument();
  });

  it("should display both incomplete indicators and missing MOVs", () => {
    mockUseGetSubmissionStatus.mockReturnValue({
      data: {
        assessment_id: mockAssessmentId,
        status: "DRAFT",
        is_locked: false,
        rework_count: 0,
        rework_comments: null,
        rework_requested_at: null,
        rework_requested_by: null,
        validation_result: {
          is_valid: false,
          incomplete_indicators: ["Indicator 1: Test"],
          missing_movs: ["Indicator 2: Test MOV"],
          error_message:
            "1 indicator(s) are incomplete. 1 indicator(s) are missing required file uploads",
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubmissionValidation assessmentId={mockAssessmentId} />);

    expect(screen.getByText("2 requirements pending")).toBeInTheDocument();
    expect(screen.getByText("1 Incomplete Indicator")).toBeInTheDocument();
    expect(screen.getByText("1 Missing File Upload")).toBeInTheDocument();
    expect(screen.getByText("Indicator 1: Test")).toBeInTheDocument();
    expect(screen.getByText("Indicator 2: Test MOV")).toBeInTheDocument();
  });

  it("should use singular form for single incomplete indicator", () => {
    mockUseGetSubmissionStatus.mockReturnValue({
      data: {
        assessment_id: mockAssessmentId,
        status: "DRAFT",
        is_locked: false,
        rework_count: 0,
        rework_comments: null,
        rework_requested_at: null,
        rework_requested_by: null,
        validation_result: {
          is_valid: false,
          incomplete_indicators: ["Single Indicator"],
          missing_movs: [],
          error_message: "1 indicator(s) are incomplete",
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SubmissionValidation assessmentId={mockAssessmentId} />);

    expect(screen.getByText("1 requirement pending")).toBeInTheDocument();
    expect(screen.getByText("1 Incomplete Indicator")).toBeInTheDocument();
  });
});
