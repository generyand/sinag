import { AssessmentStatus } from "@sinag/shared";
import { describe, expect, it } from "vitest";

import { transformAssessmentToUI } from "./dataTransformers";

describe("transformAssessmentToUI", () => {
  it("keeps reopened submissions at submitted-stage workflow progress", () => {
    const submission = transformAssessmentToUI({
      id: 18,
      barangay_name: "Poblacion",
      status: AssessmentStatus.REOPENED_BY_MLGOO,
      updated_at: "2026-03-25T00:00:00Z",
      area_assessor_approved: {},
      area_rework_info: [],
    });

    expect(submission.currentStatus).toBe("Reopened by MLGOO");
    expect(submission.overallProgress).toBe(25);
  });
});
