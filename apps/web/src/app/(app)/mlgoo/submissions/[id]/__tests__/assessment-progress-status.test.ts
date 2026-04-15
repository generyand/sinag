import { describe, expect, it } from "vitest";

import {
  getAssessorIndicatorDetail,
  getValidatorIndicatorDetail,
  isAssessorIndicatorCompleted,
  isValidatorIndicatorCompleted,
} from "../assessment-progress-status";

describe("assessment progress status helpers", () => {
  it("treats active calibration items as flagged instead of complete", () => {
    const indicator = {
      indicator_id: 12,
      indicator_name: "Calibration Indicator",
      indicator_code: "1.6.1",
      validation_status: "PASS",
      assessor_remarks: "Reviewed before calibration",
      is_completed: true,
      assessor_reviewed: true,
      validator_reviewed: true,
      is_recalibration_target: false,
      requires_rework: true,
      flagged_for_calibration: true,
      mov_files: [],
    } as any;

    expect(isAssessorIndicatorCompleted(indicator)).toBe(false);
    expect(isValidatorIndicatorCompleted(indicator)).toBe(false);
    expect(getAssessorIndicatorDetail(indicator)).toEqual({
      label: "Flagged for Calibration",
      isPositive: false,
    });
    expect(getValidatorIndicatorDetail(indicator)).toEqual({
      label: "Flagged for Calibration",
      isPositive: false,
    });
  });
});
