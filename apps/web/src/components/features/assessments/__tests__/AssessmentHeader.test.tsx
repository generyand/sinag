import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AssessmentHeader } from "../AssessmentHeader";

const assessment = {
  id: "31",
  barangayName: "Lapla",
  status: "rework",
  createdAt: "2025-01-10T00:00:00.000Z",
  completedIndicators: 37,
  totalIndicators: 84,
} as any;

const validation = {
  isComplete: false,
  missingIndicators: ["1.1.1 - Something incomplete"],
  missingMOVs: [],
  canSubmit: false,
};

describe("AssessmentHeader", () => {
  it("keeps the rework banner semantics when the remaining count reaches zero", () => {
    render(
      <AssessmentHeader
        assessment={assessment}
        validation={validation}
        isCalibrationRework={true}
        reworkProgressSummary={{ flagged: 3, addressed: 3, remaining: 0 }}
      />
    );

    expect(screen.getByText(/All flagged indicators have been addressed/i)).toBeInTheDocument();
    expect(screen.queryByText(/incomplete indicators/i)).not.toBeInTheDocument();
  });

  it("does not show the all-addressed message when the flagged set is unavailable", () => {
    render(
      <AssessmentHeader
        assessment={assessment}
        validation={validation}
        isCalibrationRework={true}
        reworkProgressSummary={{ flagged: 0, addressed: 0, remaining: 0 }}
      />
    );

    expect(
      screen.queryByText(/All flagged indicators have been addressed/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText(/incomplete indicators/i)).toBeInTheDocument();
  });
});
