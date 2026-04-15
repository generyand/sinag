import { describe, expect, it } from "vitest";

import {
  getAssessorIndicatorDetail,
  getAssessorProgressBreakdown,
  getValidatorIndicatorDetail,
  getValidatorProgressBreakdown,
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

  it("counts flagged items as processed while keeping them separate from completed items", () => {
    const indicators = [
      {
        indicator_id: 1,
        indicator_name: "Complete",
        indicator_code: "1.1.1",
        validation_status: "PASS",
        assessor_remarks: "Reviewed",
        is_completed: true,
        assessor_reviewed: true,
        validator_reviewed: true,
        is_recalibration_target: false,
        requires_rework: false,
        flagged_for_calibration: false,
        mov_files: [],
      },
      {
        indicator_id: 2,
        indicator_name: "Rework",
        indicator_code: "1.1.2",
        validation_status: null,
        assessor_remarks: "Needs fix",
        is_completed: false,
        assessor_reviewed: true,
        validator_reviewed: false,
        is_recalibration_target: false,
        requires_rework: true,
        flagged_for_calibration: false,
        mov_files: [],
      },
      {
        indicator_id: 3,
        indicator_name: "Calibration",
        indicator_code: "1.1.3",
        validation_status: "PASS",
        assessor_remarks: "Reviewed",
        is_completed: true,
        assessor_reviewed: true,
        validator_reviewed: true,
        is_recalibration_target: false,
        requires_rework: true,
        flagged_for_calibration: true,
        mov_files: [],
      },
      {
        indicator_id: 4,
        indicator_name: "Pending",
        indicator_code: "1.1.4",
        validation_status: null,
        assessor_remarks: null,
        is_completed: false,
        assessor_reviewed: false,
        validator_reviewed: false,
        is_recalibration_target: false,
        requires_rework: false,
        flagged_for_calibration: false,
        mov_files: [],
      },
    ] as any;

    expect(getAssessorProgressBreakdown(indicators)).toEqual({
      completedCount: 1,
      flaggedCount: 2,
      processedCount: 3,
      pendingCount: 1,
    });
    expect(getValidatorProgressBreakdown(indicators)).toEqual({
      completedCount: 1,
      flaggedCount: 1,
      processedCount: 2,
      pendingCount: 2,
    });
  });

  it("treats active assessor rework items as flagged instead of pending", () => {
    const indicator = {
      indicator_id: 13,
      indicator_name: "Rework Indicator",
      indicator_code: "1.6.2",
      validation_status: null,
      assessor_remarks: "Needs correction",
      is_completed: false,
      assessor_reviewed: true,
      validator_reviewed: false,
      is_recalibration_target: false,
      requires_rework: true,
      flagged_for_calibration: false,
      mov_files: [],
    } as any;

    expect(isAssessorIndicatorCompleted(indicator)).toBe(false);
    expect(getAssessorIndicatorDetail(indicator)).toEqual({
      label: "Flagged for Rework",
      isPositive: false,
    });
  });

  it("treats all-flagged indicators as fully processed for progress counts", () => {
    const indicators = [
      {
        indicator_id: 21,
        indicator_name: "Flagged 1",
        indicator_code: "2.1.1",
        validation_status: null,
        assessor_remarks: "Needs correction",
        is_completed: false,
        assessor_reviewed: true,
        validator_reviewed: false,
        is_recalibration_target: false,
        requires_rework: true,
        flagged_for_calibration: false,
        mov_files: [],
      },
      {
        indicator_id: 22,
        indicator_name: "Flagged 2",
        indicator_code: "2.1.2",
        validation_status: null,
        assessor_remarks: "Needs another fix",
        is_completed: false,
        assessor_reviewed: true,
        validator_reviewed: false,
        is_recalibration_target: false,
        requires_rework: true,
        flagged_for_calibration: false,
        mov_files: [],
      },
    ] as any;

    expect(getAssessorProgressBreakdown(indicators)).toEqual({
      completedCount: 0,
      flaggedCount: 2,
      processedCount: 2,
      pendingCount: 0,
    });
  });
});
