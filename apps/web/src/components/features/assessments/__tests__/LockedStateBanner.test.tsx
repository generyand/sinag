/**
 * Tests for LockedStateBanner Component (Epic 5.0 - Story 5.13)
 *
 * Verifies that the component correctly:
 * - Hides banner for DRAFT and REWORK statuses (editable states)
 * - Displays SUBMITTED status banner with lock icon
 * - Displays IN_REVIEW status banner with eye icon
 * - Displays COMPLETED status banner with checkmark icon
 * - Shows rework warning when reworkCount >= 1
 * - Hides rework warning when reworkCount = 0
 * - Applies correct styling and positioning (sticky, color-coded)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LockedStateBanner } from "../LockedStateBanner";

describe("LockedStateBanner", () => {
  describe("Banner Visibility", () => {
    it("should not render for DRAFT status", () => {
      const { container } = render(<LockedStateBanner status="DRAFT" reworkCount={0} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("should not render for REWORK status", () => {
      const { container } = render(<LockedStateBanner status="REWORK" reworkCount={0} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("should render for SUBMITTED status", () => {
      render(<LockedStateBanner status="SUBMITTED" reworkCount={0} />);
      expect(screen.getByText("Assessment Submitted")).toBeInTheDocument();
    });

    it("should render for IN_REVIEW status", () => {
      render(<LockedStateBanner status="IN_REVIEW" reworkCount={0} />);
      expect(screen.getByText("Assessment In Review")).toBeInTheDocument();
    });

    it("should render for COMPLETED status", () => {
      render(<LockedStateBanner status="COMPLETED" reworkCount={0} />);
      expect(screen.getByText("Assessment Completed")).toBeInTheDocument();
    });
  });

  describe("SUBMITTED Status Banner", () => {
    it("should display correct title and description", () => {
      render(<LockedStateBanner status="SUBMITTED" reworkCount={0} />);

      expect(screen.getByText("Assessment Submitted")).toBeInTheDocument();
      expect(
        screen.getByText("Your assessment is under review. You cannot make edits at this time.")
      ).toBeInTheDocument();
    });

    it("should display status badge", () => {
      render(<LockedStateBanner status="SUBMITTED" reworkCount={0} />);
      expect(screen.getByText("SUBMITTED")).toBeInTheDocument();
    });

    it("should not show rework warning when reworkCount is 0", () => {
      render(<LockedStateBanner status="SUBMITTED" reworkCount={0} />);
      expect(screen.queryByText("Final Submission")).not.toBeInTheDocument();
    });

    it("should show rework warning when reworkCount is 1", () => {
      render(<LockedStateBanner status="SUBMITTED" reworkCount={1} />);

      expect(screen.getByText("Final Submission")).toBeInTheDocument();
      expect(screen.getByText(/You have used your one rework cycle/i)).toBeInTheDocument();
      expect(screen.getByText(/This is your final submission/i)).toBeInTheDocument();
    });

    it("should show rework warning when reworkCount exceeds 1", () => {
      render(<LockedStateBanner status="SUBMITTED" reworkCount={2} />);
      expect(screen.getByText("Final Submission")).toBeInTheDocument();
    });
  });

  describe("IN_REVIEW Status Banner", () => {
    it("should display correct title and description", () => {
      render(<LockedStateBanner status="IN_REVIEW" reworkCount={0} />);

      expect(screen.getByText("Assessment In Review")).toBeInTheDocument();
      expect(
        screen.getByText("An assessor is currently reviewing your submission.")
      ).toBeInTheDocument();
    });

    it("should display status badge", () => {
      render(<LockedStateBanner status="IN_REVIEW" reworkCount={0} />);
      expect(screen.getByText("IN_REVIEW")).toBeInTheDocument();
    });

    it("should not show rework warning even with reworkCount >= 1", () => {
      render(<LockedStateBanner status="IN_REVIEW" reworkCount={1} />);
      expect(screen.queryByText("Final Submission")).not.toBeInTheDocument();
    });
  });

  describe("COMPLETED Status Banner", () => {
    it("should display correct title and description", () => {
      render(<LockedStateBanner status="COMPLETED" reworkCount={0} />);

      expect(screen.getByText("Assessment Completed")).toBeInTheDocument();
      expect(
        screen.getByText("This assessment has been finalized. No further edits allowed.")
      ).toBeInTheDocument();
    });

    it("should display status badge", () => {
      render(<LockedStateBanner status="COMPLETED" reworkCount={0} />);
      expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    });

    it("should not show rework warning even with reworkCount >= 1", () => {
      render(<LockedStateBanner status="COMPLETED" reworkCount={1} />);
      expect(screen.queryByText("Final Submission")).not.toBeInTheDocument();
    });
  });

  describe("Default Props", () => {
    it("should default reworkCount to 0 if not provided", () => {
      render(<LockedStateBanner status="SUBMITTED" />);

      // Should not show rework warning with default reworkCount
      expect(screen.queryByText("Final Submission")).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should apply sticky positioning class", () => {
      const { container } = render(<LockedStateBanner status="SUBMITTED" reworkCount={0} />);

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass("sticky");
    });

    it("should apply blue theme for SUBMITTED status", () => {
      const { container } = render(<LockedStateBanner status="SUBMITTED" reworkCount={0} />);

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass("border-blue-600");
      expect(alert).toHaveClass("bg-blue-50");
    });

    it("should apply green theme for COMPLETED status", () => {
      const { container } = render(<LockedStateBanner status="COMPLETED" reworkCount={0} />);

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveClass("border-green-600");
      expect(alert).toHaveClass("bg-green-50");
    });

    it("should apply orange theme for rework warning", () => {
      const { container } = render(<LockedStateBanner status="SUBMITTED" reworkCount={1} />);

      // Find the rework warning alert (second alert in the component)
      const alerts = container.querySelectorAll('[role="alert"]');
      const reworkAlert = alerts[1];

      expect(reworkAlert).toHaveClass("border-orange-600");
      expect(reworkAlert).toHaveClass("bg-orange-50");
    });
  });
});
