import { renderWithProviders, screen } from "@/tests/test-utils";
import { describe, expect, it } from "vitest";

import { AssessmentProgress } from "../AssessmentProgress";

describe("AssessmentProgress", () => {
  it("uses completion percentage when assessment was reopened by MLGOO", () => {
    renderWithProviders(
      <AssessmentProgress
        currentStatus="REOPENED_BY_MLGOO"
        isCalibrationRework={false}
        completionPercentage={100}
      />
    );

    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("Drafting")).toBeInTheDocument();
    expect(screen.getByText("Preparation and Drafting")).toBeInTheDocument();
    expect(screen.queryByText("Starting")).not.toBeInTheDocument();
  });

  it("treats submitted-for-review as a review-phase progress state", () => {
    renderWithProviders(
      <AssessmentProgress
        currentStatus="SUBMITTED_FOR_REVIEW"
        isCalibrationRework={false}
        completionPercentage={100}
      />
    );

    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getAllByText("Phase 1")).toHaveLength(2);
    expect(screen.queryByText("Starting")).not.toBeInTheDocument();
  });
});
