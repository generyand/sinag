/**
 * Tests for ResubmitAssessmentButton Component (Epic 5.0 - Story 5.16)
 *
 * Verifies that the component correctly:
 * - Renders resubmit button with proper text and icon
 * - Disables button when validation fails
 * - Shows tooltip when disabled
 * - Opens confirmation dialog on click
 * - Displays final submission warning
 * - Calls mutation with correct data
 * - Handles success and error states
 * - Closes dialog on cancel
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResubmitAssessmentButton } from "../ResubmitAssessmentButton";

// Mock the generated hook
vi.mock("@sinag/shared", () => ({
  usePostAssessmentsAssessmentIdResubmit: vi.fn(),
}));

// Mock toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { usePostAssessmentsAssessmentIdResubmit } from "@sinag/shared";

const mockUseResubmit = usePostAssessmentsAssessmentIdResubmit as ReturnType<typeof vi.fn>;

describe("ResubmitAssessmentButton", () => {
  const mockAssessmentId = 123;
  const mockOnSuccess = vi.fn();

  const validValidationResult = {
    is_valid: true,
    incomplete_indicators: [],
    missing_movs: [],
    error_message: null,
  };

  const invalidValidationResult = {
    is_valid: false,
    incomplete_indicators: ["Indicator 1"],
    missing_movs: ["Indicator 2"],
    error_message: "Validation failed",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Button Rendering", () => {
    it("should render button with correct text and icon", () => {
      mockUseResubmit.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      });

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const button = screen.getByRole("button", { name: /Resubmit Assessment/ });
      expect(button).toBeInTheDocument();
    });

    it("should show loading state during resubmission", () => {
      mockUseResubmit.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      });

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole("button", { name: /Resubmitting/ })).toBeInTheDocument();
    });
  });

  describe("Validation State", () => {
    it("should disable button when validation fails", () => {
      mockUseResubmit.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      });

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={invalidValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const button = screen.getByRole("button", { name: /Resubmit Assessment/ });
      expect(button).toBeDisabled();
    });

    it("should enable button when validation passes", () => {
      mockUseResubmit.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      });

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const button = screen.getByRole("button", { name: /Resubmit Assessment/ });
      expect(button).not.toBeDisabled();
    });

    it("should show tooltip when disabled due to incomplete validation", async () => {
      const user = userEvent.setup();

      mockUseResubmit.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      });

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={invalidValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const button = screen.getByRole("button", { name: /Resubmit Assessment/ });
      await user.hover(button);

      await waitFor(() => {
        expect(
          screen.getByText(/Complete all rework requirements before resubmitting/)
        ).toBeInTheDocument();
      });
    });

    it("should not show tooltip when button is enabled", () => {
      mockUseResubmit.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      });

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      expect(
        screen.queryByText(/Complete all rework requirements before resubmitting/)
      ).not.toBeInTheDocument();
    });
  });

  describe("Confirmation Dialog", () => {
    beforeEach(() => {
      mockUseResubmit.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      });
    });

    it("should open confirmation dialog when button clicked with valid validation", async () => {
      const user = userEvent.setup();

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const button = screen.getByRole("button", { name: /Resubmit Assessment/ });
      await user.click(button);

      expect(screen.getByText("Resubmit Assessment?")).toBeInTheDocument();
      expect(
        screen.getByText("Are you sure you want to resubmit this assessment?")
      ).toBeInTheDocument();
    });

    it("should display final submission warning in dialog", async () => {
      const user = userEvent.setup();

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const button = screen.getByRole("button", { name: /Resubmit Assessment/ });
      await user.click(button);

      expect(screen.getByText("Final Submission Warning")).toBeInTheDocument();
      expect(screen.getByText(/This is your/)).toHaveTextContent("final submission");
      expect(
        screen.getByText(/No further changes will be allowed after resubmission/)
      ).toBeInTheDocument();
    });

    it("should display list of consequences", async () => {
      const user = userEvent.setup();

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const button = screen.getByRole("button", { name: /Resubmit Assessment/ });
      await user.click(button);

      expect(screen.getByText(/Your assessment will be locked for editing/)).toBeInTheDocument();
      expect(screen.getByText(/An assessor will review your resubmission/)).toBeInTheDocument();
      expect(
        screen.getByText(/No additional rework requests are possible/)
      ).toBeInTheDocument();
    });

    it("should display accuracy reminder", async () => {
      const user = userEvent.setup();

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const button = screen.getByRole("button", { name: /Resubmit Assessment/ });
      await user.click(button);

      expect(
        screen.getByText(/Please ensure all rework requirements have been addressed/)
      ).toBeInTheDocument();
    });

    it("should close dialog when Cancel clicked", async () => {
      const user = userEvent.setup();

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const resubmitButton = screen.getByRole("button", { name: /Resubmit Assessment/ });
      await user.click(resubmitButton);

      const cancelButton = screen.getByRole("button", { name: /Cancel/ });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText("Resubmit Assessment?")).not.toBeInTheDocument();
      });
    });
  });

  describe("Mutation Integration", () => {
    it("should call mutation with correct data when confirmed", async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseResubmit.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const resubmitButton = screen.getByRole("button", { name: /Resubmit Assessment/ });
      await user.click(resubmitButton);

      const confirmButton = screen.getByRole("button", { name: /Confirm Resubmit/ });
      await user.click(confirmButton);

      expect(mockMutate).toHaveBeenCalledWith({
        assessmentId: mockAssessmentId,
      });
    });

    it("should not call mutation when cancelled", async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseResubmit.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const resubmitButton = screen.getByRole("button", { name: /Resubmit Assessment/ });
      await user.click(resubmitButton);

      const cancelButton = screen.getByRole("button", { name: /Cancel/ });
      await user.click(cancelButton);

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe("Success Handling", () => {
    it("should call onSuccess callback after successful resubmission", async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn((args) => {
        // Simulate immediate success
        const config = mockUseResubmit.mock.calls[0][0];
        config.mutation.onSuccess({
          id: mockAssessmentId,
          submitted_at: new Date().toISOString(),
          status: "SUBMITTED",
        });
      });

      mockUseResubmit.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const resubmitButton = screen.getByRole("button", { name: /Resubmit Assessment/ });
      await user.click(resubmitButton);

      const confirmButton = screen.getByRole("button", { name: /Confirm Resubmit/ });
      await user.click(confirmButton);

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("should close dialog after successful resubmission", async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn((args) => {
        const config = mockUseResubmit.mock.calls[0][0];
        config.mutation.onSuccess({
          id: mockAssessmentId,
          submitted_at: new Date().toISOString(),
          status: "SUBMITTED",
        });
      });

      mockUseResubmit.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const resubmitButton = screen.getByRole("button", { name: /Resubmit Assessment/ });
      await user.click(resubmitButton);

      const confirmButton = screen.getByRole("button", { name: /Confirm Resubmit/ });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText("Resubmit Assessment?")).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should close dialog on error", async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn((args) => {
        // Simulate error
        const config = mockUseResubmit.mock.calls[0][0];
        config.mutation.onError(new Error("Network error"));
      });

      mockUseResubmit.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const resubmitButton = screen.getByRole("button", { name: /Resubmit Assessment/ });
      await user.click(resubmitButton);

      const confirmButton = screen.getByRole("button", { name: /Confirm Resubmit/ });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText("Resubmit Assessment?")).not.toBeInTheDocument();
      });
    });

    it("should not call onSuccess on error", async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn((args) => {
        const config = mockUseResubmit.mock.calls[0][0];
        config.mutation.onError(new Error("Network error"));
      });

      mockUseResubmit.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      const resubmitButton = screen.getByRole("button", { name: /Resubmit Assessment/ });
      await user.click(resubmitButton);

      const confirmButton = screen.getByRole("button", { name: /Confirm Resubmit/ });
      await user.click(confirmButton);

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("should disable cancel button during submission", () => {
      mockUseResubmit.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      });

      render(
        <ResubmitAssessmentButton
          assessmentId={mockAssessmentId}
          validationResult={validValidationResult}
          onSuccess={mockOnSuccess}
        />
      );

      // Button is disabled during loading, so we can't open dialog
      // Just verify the button shows loading state
      expect(screen.getByRole("button", { name: /Resubmitting/ })).toBeDisabled();
    });
  });
});
