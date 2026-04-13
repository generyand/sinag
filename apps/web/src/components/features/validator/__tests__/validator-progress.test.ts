import { describe, expect, it } from "vitest";
import {
  getValidatorChecklistCompletion,
  getValidatorIndicatorProgress,
  hasActiveValidatorMovAttention,
  isSupersededBlguMovFile,
} from "../validator-progress";

function mov(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    field_id: "ordinance",
    uploaded_at: "2026-04-01T00:00:00.000Z",
    upload_origin: "blgu",
    validator_notes: "",
    flagged_for_calibration: false,
    ...overrides,
  };
}

function response(overrides: Record<string, any> = {}) {
  return {
    id: 201,
    validation_status: null,
    response_data: {},
    flagged_for_calibration: false,
    feedback_comments: [],
    movs: [],
    indicator: {
      checklist_items: [{ item_id: "requirement_1", item_type: "checkbox", required: true }],
      validation_rule: "ALL_ITEMS_REQUIRED",
    },
    ...overrides,
  };
}

describe("validator-progress", () => {
  it("requires all required validator checklist items for ALL_ITEMS_REQUIRED", () => {
    const itemResponse = response({
      indicator: {
        checklist_items: [
          { item_id: "requirement_1", item_type: "checkbox", required: true },
          { item_id: "requirement_2", item_type: "checkbox", required: true },
        ],
        validation_rule: "ALL_ITEMS_REQUIRED",
      },
    });

    expect(
      getValidatorChecklistCompletion(itemResponse, {
        checklist_201_requirement_1: true,
      }).isComplete
    ).toBe(false);

    expect(
      getValidatorChecklistCompletion(itemResponse, {
        checklist_201_requirement_1: true,
        checklist_201_requirement_2: true,
      }).isComplete
    ).toBe(true);
  });

  it("supports option groups using the same completion shape as RightAssessorPanel", () => {
    const groupedResponse = response({
      indicator: {
        checklist_items: [
          { item_id: "base", item_type: "checkbox", required: true },
          { item_id: "a1", item_type: "checkbox", option_group: "Option 1" },
          { item_id: "a2", item_type: "checkbox", option_group: "Option 1" },
          { item_id: "b1", item_type: "checkbox", option_group: "Option 2" },
        ],
        validation_rule: "ALL_ITEMS_REQUIRED",
      },
    });

    expect(
      getValidatorChecklistCompletion(groupedResponse, {
        checklist_201_base: true,
        checklist_201_a1: true,
      }).isComplete
    ).toBe(false);

    expect(
      getValidatorChecklistCompletion(groupedResponse, {
        checklist_201_base: true,
        checklist_201_a1: true,
        checklist_201_a2: true,
      }).isComplete
    ).toBe(true);
  });

  it("only supersedes old BLGU files with newer BLGU files from the same field", () => {
    const oldOrdinance = mov({
      id: 1,
      field_id: "ordinance",
      uploaded_at: "2026-03-01T00:00:00.000Z",
      validator_notes: "missing signature",
      flagged_for_calibration: true,
    });
    const newAttendance = mov({
      id: 2,
      field_id: "attendance",
      uploaded_at: "2026-04-01T00:00:00.000Z",
    });

    expect(isSupersededBlguMovFile(oldOrdinance, [oldOrdinance, newAttendance])).toBe(false);
  });

  it("supersedes an old BLGU file with a newer BLGU file from the same field", () => {
    const oldFile = mov({
      id: 1,
      field_id: "ordinance",
      uploaded_at: "2026-03-01T00:00:00.000Z",
      validator_notes: "missing signature",
      flagged_for_calibration: true,
    });
    const replacement = mov({
      id: 2,
      field_id: "ordinance",
      uploaded_at: "2026-04-01T00:00:00.000Z",
    });

    expect(isSupersededBlguMovFile(oldFile, [oldFile, replacement])).toBe(true);
    expect(
      hasActiveValidatorMovAttention(response({ movs: [oldFile, replacement] }), {
        localMovAttentionByFileId: {},
      })
    ).toBe(false);
  });

  it("does not let validator-uploaded files supersede BLGU files", () => {
    const oldFile = mov({
      id: 1,
      field_id: "ordinance",
      uploaded_at: "2026-03-01T00:00:00.000Z",
      flagged_for_calibration: true,
    });
    const validatorUpload = mov({
      id: 2,
      field_id: "ordinance",
      uploaded_at: "2026-04-01T00:00:00.000Z",
      upload_origin: "validator",
    });

    expect(isSupersededBlguMovFile(oldFile, [oldFile, validatorUpload])).toBe(false);
    expect(
      hasActiveValidatorMovAttention(response({ movs: [oldFile, validatorUpload] }), {
        localMovAttentionByFileId: {},
      })
    ).toBe(true);
  });

  it("evaluates local unsaved MOV attention by active file id", () => {
    const oldFile = mov({
      id: 1,
      field_id: "ordinance",
      uploaded_at: "2026-03-01T00:00:00.000Z",
    });
    const replacement = mov({
      id: 2,
      field_id: "ordinance",
      uploaded_at: "2026-04-01T00:00:00.000Z",
    });

    expect(
      hasActiveValidatorMovAttention(response({ movs: [oldFile, replacement] }), {
        localMovAttentionByFileId: { 1: true },
      })
    ).toBe(false);

    expect(
      hasActiveValidatorMovAttention(response({ movs: [oldFile, replacement] }), {
        localMovAttentionByFileId: { 2: true },
      })
    ).toBe(true);
  });

  it("turns green only when checklist is complete and active BLGU files are clean", () => {
    expect(
      getValidatorIndicatorProgress(response(), {
        checklistState: { checklist_201_requirement_1: true },
        localMovAttentionByFileId: {},
        responseCalibrationFlag: false,
        strictChecklistRequired: true,
      })
    ).toEqual({ status: "completed", hasMovNotes: false });
  });

  it("does not turn green from validation_status alone in strict post-calibration mode", () => {
    expect(
      getValidatorIndicatorProgress(response({ validation_status: "PASS" }), {
        checklistState: {},
        localMovAttentionByFileId: {},
        responseCalibrationFlag: false,
        strictChecklistRequired: true,
      })
    ).toEqual({ status: "not_started", hasMovNotes: false });
  });

  it("preserves existing validation_status only when strict checklist mode is off", () => {
    expect(
      getValidatorIndicatorProgress(response({ validation_status: "PASS" }), {
        checklistState: {},
        localMovAttentionByFileId: {},
        responseCalibrationFlag: false,
        strictChecklistRequired: false,
      })
    ).toEqual({ status: "completed", hasMovNotes: false });
  });
});
