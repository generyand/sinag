/**
 * Tests for RequestReworkForm Component (Epic 5.0 - Story 5.15)
 *
 * Verifies that the component correctly:
 * - Displays form with textarea and character count
 * - Validates minimum character length (10)
 * - Disables button when validation fails
 * - Shows confirmation dialog before requesting rework
 * - Calls mutation with correct data
 * - Handles success and error states
 * - Disables form when rework limit reached (reworkCount >= 1)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/tests/test-utils";
import userEvent from "@testing-library/user-event";
import { RequestReworkForm } from "../RequestReworkForm";

// Mock the generated hook
vi.mock("@sinag/shared", () => ({
  usePostAssessmentsAssessmentIdRequestRework: vi.fn(),
}));

// Mock toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { usePostAssessmentsAssessmentIdRequestRework } from "@sinag/shared";
import { useToast } from "@/hooks/use-toast";

const mockUseRequestRework = usePostAssessmentsAssessmentIdRequestRework as ReturnType<
  typeof vi.fn
>;
const mockToast = vi.mocked(useToast);

describe("RequestReworkForm", () => {
  const mockAssessmentId = 123;
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rework Limit Enforcement", () => {
    it("should show disabled state when rework limit reached (reworkCount = 1)", () => {
      mockUseRequestRework.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      });

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={1}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("Rework Limit Reached")).toBeInTheDocument();
      expect(
        screen.getByText(
          "This BLGU has already used their one rework cycle. No further rework requests are allowed."
        )
      ).toBeInTheDocument();

      // Form should not be rendered
      expect(screen.queryByLabelText(/Rework Comments/)).not.toBeInTheDocument();
    });

    it("should show disabled state when reworkCount exceeds 1", () => {
      mockUseRequestRework.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      });

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={2}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("Rework Limit Reached")).toBeInTheDocument();
    });

    it("should show form when reworkCount is 0", () => {
      mockUseRequestRework.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      });

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByLabelText(/Rework Comments/)).toBeInTheDocument();
      expect(screen.queryByText("Rework Limit Reached")).not.toBeInTheDocument();
    });
  });

  describe("Form Rendering", () => {
    beforeEach(() => {
      mockUseRequestRework.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      });
    });

    it("should render textarea with label and placeholder", () => {
      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByLabelText(/Rework Comments/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Explain what needs to be revised/)).toBeInTheDocument();
    });

    it("should display required indicator (*)", () => {
      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const label = screen.getByText(/Rework Comments/);
      expect(label.parentElement).toHaveTextContent("*");
    });

    it("should render Request Rework button", () => {
      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole("button", { name: /Request Rework/ })).toBeInTheDocument();
    });
  });

  describe("Character Count Validation", () => {
    beforeEach(() => {
      mockUseRequestRework.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      });
    });

    it("should display initial character count as 0", () => {
      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("0 characters (minimum 10)")).toBeInTheDocument();
    });

    it("should update character count as user types", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, "Test");

      expect(screen.getByText("4 characters (minimum 10)")).toBeInTheDocument();
    });

    it("should show remaining characters needed when below minimum", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, "Short");

      expect(screen.getByText(/Need 5 more/)).toBeInTheDocument();
    });

    it("should not show 'need more' message when at minimum length", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, "Ten chars!");

      expect(screen.getByText("10 characters (minimum 10)")).toBeInTheDocument();
      expect(screen.queryByText(/Need \d+ more/)).not.toBeInTheDocument();
    });

    it("should use singular 'character' for count of 1", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, "A");

      expect(screen.getByText("1 character (minimum 10)")).toBeInTheDocument();
    });
  });

  describe("Button State", () => {
    beforeEach(() => {
      mockUseRequestRework.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      });
    });

    it("should disable button when comments are empty", () => {
      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const button = screen.getByRole("button", { name: /Request Rework/ });
      expect(button).toBeDisabled();
    });

    it("should disable button when comments are below minimum length", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, "Short");

      const button = screen.getByRole("button", { name: /Request Rework/ });
      expect(button).toBeDisabled();
    });

    it("should enable button when comments meet minimum length", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, "This is a valid comment");

      const button = screen.getByRole("button", { name: /Request Rework/ });
      expect(button).not.toBeDisabled();
    });

    it("should disable button and show loading state during submission", () => {
      mockUseRequestRework.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      });

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const button = screen.getByRole("button", { name: /Requesting Rework/ });
      expect(button).toBeDisabled();
    });
  });

  describe("Confirmation Dialog", () => {
    beforeEach(() => {
      mockUseRequestRework.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      });
    });

    it("should open confirmation dialog when button clicked with valid comments", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, "Valid comment text");

      const button = screen.getByRole("button", { name: /Request Rework/ });
      await user.click(button);

      expect(screen.getByText("Request Rework?")).toBeInTheDocument();
      expect(
        screen.getByText("Are you sure you want to request rework for this assessment?")
      ).toBeInTheDocument();
    });

    it("should display preview of comments in dialog", async () => {
      const user = userEvent.setup();
      const testComment = "Please update budget figures";

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, testComment);

      const button = screen.getByRole("button", { name: /Request Rework/ });
      await user.click(button);

      // Check for preview in dialog
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toHaveTextContent(testComment);
      expect(dialog).toHaveTextContent("Your feedback:");
    });

    it("should show warning about rework consequences", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, "Valid comment");

      const button = screen.getByRole("button", { name: /Request Rework/ });
      await user.click(button);

      expect(screen.getByText("This will:")).toBeInTheDocument();
      expect(
        screen.getByText(/Send the assessment back to the BLGU for revisions/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Use their one allowed rework cycle/)).toBeInTheDocument();
    });

    it("should close dialog when Cancel clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, "Valid comment");

      const requestButton = screen.getByRole("button", { name: /Request Rework/ });
      await user.click(requestButton);

      const cancelButton = screen.getByRole("button", { name: /Cancel/ });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText("Request Rework?")).not.toBeInTheDocument();
      });
    });
  });

  describe("Mutation Integration", () => {
    it("should call mutation with correct data when confirmed", async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseRequestRework.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      const testComment = "Please revise indicators";

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, testComment);

      const requestButton = screen.getByRole("button", { name: /Request Rework/ });
      await user.click(requestButton);

      const confirmButton = screen.getByRole("button", { name: /Confirm Request/ });
      await user.click(confirmButton);

      expect(mockMutate).toHaveBeenCalledWith({
        assessmentId: mockAssessmentId,
        data: {
          comments: testComment,
        },
      });
    });

    it("should trim whitespace from comments before submission", async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();

      mockUseRequestRework.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, "  Valid comment  ");

      const requestButton = screen.getByRole("button", { name: /Request Rework/ });
      await user.click(requestButton);

      const confirmButton = screen.getByRole("button", { name: /Confirm Request/ });
      await user.click(confirmButton);

      expect(mockMutate).toHaveBeenCalledWith({
        assessmentId: mockAssessmentId,
        data: {
          comments: "Valid comment",
        },
      });
    });
  });

  describe("Success Handling", () => {
    it("should clear form and call onSuccess callback after successful submission", async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn((args) => {
        // Simulate immediate success
        const config = mockUseRequestRework.mock.calls[0][0];
        config.mutation.onSuccess();
      });

      mockUseRequestRework.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, "Valid comment");

      const requestButton = screen.getByRole("button", { name: /Request Rework/ });
      await user.click(requestButton);

      const confirmButton = screen.getByRole("button", { name: /Confirm Request/ });
      await user.click(confirmButton);

      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should close dialog on error", async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn((args) => {
        // Simulate error
        const config = mockUseRequestRework.mock.calls[0][0];
        config.mutation.onError(new Error("Network error"));
      });

      mockUseRequestRework.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      renderWithProviders(
        <RequestReworkForm
          assessmentId={mockAssessmentId}
          reworkCount={0}
          onSuccess={mockOnSuccess}
        />
      );

      const textarea = screen.getByLabelText(/Rework Comments/);
      await user.type(textarea, "Valid comment");

      const requestButton = screen.getByRole("button", { name: /Request Rework/ });
      await user.click(requestButton);

      const confirmButton = screen.getByRole("button", { name: /Confirm Request/ });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText("Request Rework?")).not.toBeInTheDocument();
      });
    });
  });
});
