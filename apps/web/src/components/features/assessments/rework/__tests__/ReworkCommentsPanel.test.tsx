/**
 * Tests for ReworkCommentsPanel Component (Epic 5.0 - Story 5.14)
 *
 * Verifies that the component correctly:
 * - Only displays when assessment status is REWORK
 * - Displays rework alert banner
 * - Shows assessor comments with proper formatting
 * - Displays timestamp of rework request
 * - Handles loading and error states
 * - Hides for non-REWORK statuses
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReworkCommentsPanel } from "../ReworkCommentsPanel";

// Mock the generated hook
vi.mock("@sinag/shared", () => ({
  useGetAssessmentsAssessmentIdSubmissionStatus: vi.fn(),
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  formatDistanceToNow: vi.fn(() => "2 days ago"),
}));

import { useGetAssessmentsAssessmentIdSubmissionStatus } from "@sinag/shared";

const mockUseGetSubmissionStatus = useGetAssessmentsAssessmentIdSubmissionStatus as ReturnType<
  typeof vi.fn
>;

describe("ReworkCommentsPanel", () => {
  const mockAssessmentId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Visibility Logic", () => {
    it("should not render for DRAFT status", () => {
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
            missing_movs: [],
            error_message: null,
          },
        },
        isLoading: false,
        error: null,
      });

      const { container } = render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("should not render for SUBMITTED status", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "SUBMITTED",
          is_locked: true,
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
      });

      const { container } = render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("should not render for IN_REVIEW status", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "IN_REVIEW",
          is_locked: true,
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
      });

      const { container } = render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("should not render for COMPLETED status", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "COMPLETED",
          is_locked: true,
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
      });

      const { container } = render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("should render for REWORK status", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "REWORK",
          is_locked: false,
          rework_count: 1,
          rework_comments: "Please fix the budget indicators.",
          rework_requested_at: "2025-11-07T10:00:00Z",
          rework_requested_by: null,
          validation_result: {
            is_valid: false,
            incomplete_indicators: [],
            missing_movs: [],
            error_message: null,
          },
        },
        isLoading: false,
        error: null,
      });

      render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);
      expect(screen.getByText("Rework Requested")).toBeInTheDocument();
    });

    it("should not render if REWORK but no comments", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "REWORK",
          is_locked: false,
          rework_count: 1,
          rework_comments: null,
          rework_requested_at: "2025-11-07T10:00:00Z",
          rework_requested_by: null,
          validation_result: {
            is_valid: false,
            incomplete_indicators: [],
            missing_movs: [],
            error_message: null,
          },
        },
        isLoading: false,
        error: null,
      });

      const { container } = render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Loading State", () => {
    it("should display loading skeletons while fetching", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);

      const skeletons = screen.getAllByRole("status", { hidden: true });
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Error State", () => {
    it("should not render anything on error", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Network error"),
      });

      const { container } = render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Rework Alert Banner", () => {
    it("should display alert banner with correct message", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "REWORK",
          is_locked: false,
          rework_count: 1,
          rework_comments: "Please fix the issues.",
          rework_requested_at: "2025-11-07T10:00:00Z",
          rework_requested_by: null,
          validation_result: {
            is_valid: false,
            incomplete_indicators: [],
            missing_movs: [],
            error_message: null,
          },
        },
        isLoading: false,
        error: null,
      });

      render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);

      expect(screen.getByText("Rework Requested")).toBeInTheDocument();
      expect(
        screen.getByText("Please address the assessor's feedback below and resubmit your assessment.")
      ).toBeInTheDocument();
    });

    it("should display REWORK status badge", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "REWORK",
          is_locked: false,
          rework_count: 1,
          rework_comments: "Fix indicators.",
          rework_requested_at: "2025-11-07T10:00:00Z",
          rework_requested_by: null,
          validation_result: {
            is_valid: false,
            incomplete_indicators: [],
            missing_movs: [],
            error_message: null,
          },
        },
        isLoading: false,
        error: null,
      });

      render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);
      expect(screen.getByText("REWORK")).toBeInTheDocument();
    });
  });

  describe("Assessor Comments Display", () => {
    it("should display assessor comments in card", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "REWORK",
          is_locked: false,
          rework_count: 1,
          rework_comments: "Please update the budget transparency indicator with correct values.",
          rework_requested_at: "2025-11-07T10:00:00Z",
          rework_requested_by: null,
          validation_result: {
            is_valid: false,
            incomplete_indicators: [],
            missing_movs: [],
            error_message: null,
          },
        },
        isLoading: false,
        error: null,
      });

      render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);

      expect(screen.getByText("Assessor Feedback")).toBeInTheDocument();
      expect(
        screen.getByText("Please update the budget transparency indicator with correct values.")
      ).toBeInTheDocument();
    });

    it("should preserve line breaks in multi-line comments", () => {
      const multiLineComments = "Line 1\nLine 2\nLine 3";

      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "REWORK",
          is_locked: false,
          rework_count: 1,
          rework_comments: multiLineComments,
          rework_requested_at: "2025-11-07T10:00:00Z",
          rework_requested_by: null,
          validation_result: {
            is_valid: false,
            incomplete_indicators: [],
            missing_movs: [],
            error_message: null,
          },
        },
        isLoading: false,
        error: null,
      });

      render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);

      const commentsElement = screen.getByText(/Line 1/);
      // Verify whitespace-pre-wrap class is applied to preserve line breaks
      expect(commentsElement).toHaveClass("whitespace-pre-wrap");
      // Verify all lines are present (textContent collapses whitespace, but the content is there)
      expect(commentsElement).toHaveTextContent("Line 1");
      expect(commentsElement).toHaveTextContent("Line 2");
      expect(commentsElement).toHaveTextContent("Line 3");
    });
  });

  describe("Timestamp Display", () => {
    it("should display relative timestamp", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "REWORK",
          is_locked: false,
          rework_count: 1,
          rework_comments: "Fix this.",
          rework_requested_at: "2025-11-07T10:00:00Z",
          rework_requested_by: null,
          validation_result: {
            is_valid: false,
            incomplete_indicators: [],
            missing_movs: [],
            error_message: null,
          },
        },
        isLoading: false,
        error: null,
      });

      render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);

      expect(screen.getByText(/Requested 2 days ago/)).toBeInTheDocument();
    });

    it("should display assessor email if provided", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "REWORK",
          is_locked: false,
          rework_count: 1,
          rework_comments: "Fix this.",
          rework_requested_at: "2025-11-07T10:00:00Z",
          rework_requested_by: { email: "assessor@example.com" },
          validation_result: {
            is_valid: false,
            incomplete_indicators: [],
            missing_movs: [],
            error_message: null,
          },
        },
        isLoading: false,
        error: null,
      });

      render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);

      expect(screen.getByText(/by assessor@example.com/)).toBeInTheDocument();
    });

    it("should show 'Assessor' if rework_requested_by is not an object with email", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "REWORK",
          is_locked: false,
          rework_count: 1,
          rework_comments: "Fix this.",
          rework_requested_at: "2025-11-07T10:00:00Z",
          rework_requested_by: "Some string",
          validation_result: {
            is_valid: false,
            incomplete_indicators: [],
            missing_movs: [],
            error_message: null,
          },
        },
        isLoading: false,
        error: null,
      });

      render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);

      expect(screen.getByText(/by Assessor/)).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should apply orange theme to alert banner", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "REWORK",
          is_locked: false,
          rework_count: 1,
          rework_comments: "Fix this.",
          rework_requested_at: "2025-11-07T10:00:00Z",
          rework_requested_by: null,
          validation_result: {
            is_valid: false,
            incomplete_indicators: [],
            missing_movs: [],
            error_message: null,
          },
        },
        isLoading: false,
        error: null,
      });

      const { container } = render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass("border-orange-600");
      expect(alert).toHaveClass("bg-orange-50");
    });

    it("should apply orange theme to card", () => {
      mockUseGetSubmissionStatus.mockReturnValue({
        data: {
          assessment_id: mockAssessmentId,
          status: "REWORK",
          is_locked: false,
          rework_count: 1,
          rework_comments: "Fix this.",
          rework_requested_at: "2025-11-07T10:00:00Z",
          rework_requested_by: null,
          validation_result: {
            is_valid: false,
            incomplete_indicators: [],
            missing_movs: [],
            error_message: null,
          },
        },
        isLoading: false,
        error: null,
      });

      const { container } = render(<ReworkCommentsPanel assessmentId={mockAssessmentId} />);

      const card = container.querySelector('.border-orange-200');
      expect(card).toBeInTheDocument();
    });
  });
});
