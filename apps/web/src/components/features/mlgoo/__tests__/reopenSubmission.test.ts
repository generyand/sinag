import { AssessmentStatus } from "@sinag/shared";
import { describe, expect, it } from "vitest";

import { canReopenSubmission } from "../reopenSubmission";

describe("canReopenSubmission", () => {
  it.each([
    AssessmentStatus.SUBMITTED,
    AssessmentStatus.SUBMITTED_FOR_REVIEW,
    AssessmentStatus.IN_REVIEW,
    AssessmentStatus.AWAITING_FINAL_VALIDATION,
    AssessmentStatus.AWAITING_MLGOO_APPROVAL,
  ])("allows MLGOO reopen for %s", (status) => {
    expect(canReopenSubmission(status, false)).toBe(true);
  });

  it.each([
    undefined,
    null,
    AssessmentStatus.DRAFT,
    AssessmentStatus.REWORK,
    AssessmentStatus.COMPLETED,
    AssessmentStatus.VALIDATED,
    "REOPENED_BY_MLGOO",
  ])("does not allow MLGOO reopen for %s", (status) => {
    expect(canReopenSubmission(status, false)).toBe(false);
  });

  it("does not allow reopen when BLGU editing is deadline-locked", () => {
    expect(canReopenSubmission(AssessmentStatus.SUBMITTED, true)).toBe(false);
  });
});
