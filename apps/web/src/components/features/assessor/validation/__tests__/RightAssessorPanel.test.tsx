import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/test-utils";
import userEvent from "@testing-library/user-event";
import { RightAssessorPanel } from "../RightAssessorPanel";

let mockUser = { role: "VALIDATOR", id: 1, username: "validator" };

vi.mock("@sinag/shared", () => ({
  usePostAssessorAssessmentResponsesResponseIdMovsUpload: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}));

const makeAssessment = () => ({
  success: true,
  assessment_id: 1,
  assessment: {
    id: 1,
    rework_count: 0,
    responses: [
      {
        id: 101,
        indicator_id: 1,
        indicator: { name: "Indicator A", technical_notes: "Notes A" },
        response_data: { value: "foo" },
        movs: [],
      },
    ],
  },
});

describe("RightAssessorPanel", () => {
  it("syncs validator public comments upward", async () => {
    mockUser = { role: "VALIDATOR", id: 1, username: "validator" };
    const user = userEvent.setup();
    const assessment = makeAssessment() as any;
    const form: Record<number, { status?: any; publicComment?: string; internalNote?: string }> =
      {};
    const setField = vi.fn();

    // Set expandedId to the response ID to show the indicator form
    renderWithProviders(
      <RightAssessorPanel
        assessment={assessment}
        form={form}
        setField={setField}
        expandedId={101}
      />
    );

    const commentField = screen.getByPlaceholderText(
      /Provide an overall summary of the required changes or general instructions/i
    );
    await user.type(commentField, "Needs clarification");

    expect(setField).toHaveBeenCalledWith(101, "publicComment", "Needs clarification");
  });

  it("syncs assessor checklist checkbox changes upward", async () => {
    mockUser = { role: "ASSESSOR", id: 2, username: "assessor" };
    const user = userEvent.setup();
    const onChecklistChange = vi.fn();
    const assessment = {
      success: true,
      assessment_id: 1,
      assessment: {
        id: 1,
        rework_count: 0,
        responses: [
          {
            id: 101,
            indicator_id: 1,
            indicator: {
              name: "Indicator A",
              indicator_code: "1.1.1",
              validation_rule: "ALL_ITEMS_REQUIRED",
              checklist_items: [
                {
                  id: 1,
                  item_id: "item_1",
                  label: "Checklist item 1",
                  item_type: "checkbox",
                  required: true,
                },
              ],
            },
            response_data: {},
            movs: [],
            feedback_comments: [],
          },
        ],
      },
    } as any;

    renderWithProviders(
      <RightAssessorPanel
        assessment={assessment}
        form={{}}
        setField={vi.fn()}
        expandedId={101}
        onChecklistChange={onChecklistChange}
      />
    );

    await user.click(screen.getByRole("checkbox"));

    expect(onChecklistChange).toHaveBeenCalledWith("checklist_101_item_1", true);
    expect(onChecklistChange).toHaveBeenCalledTimes(1);
  });

  it("hydrates persisted comment and checklist values", () => {
    mockUser = { role: "ASSESSOR", id: 2, username: "assessor" };
    const assessment = {
      success: true,
      assessment_id: 1,
      assessment: {
        id: 1,
        rework_count: 0,
        responses: [
          {
            id: 101,
            indicator_id: 1,
            indicator: {
              name: "Indicator A",
              indicator_code: "1.1.1",
              validation_rule: "ALL_ITEMS_REQUIRED",
              checklist_items: [
                {
                  id: 1,
                  item_id: "item_1",
                  label: "Checklist item 1",
                  item_type: "checkbox",
                  required: true,
                },
              ],
            },
            response_data: {
              assessor_val_item_1: false,
            },
            movs: [],
            feedback_comments: [
              {
                id: 10,
                comment: "Persisted comment",
                comment_type: "validation",
                is_internal_note: false,
                created_at: "2024-01-01T00:00:00Z",
                assessor: { role: "ASSESSOR" },
              },
            ],
          },
        ],
      },
    } as any;

    renderWithProviders(
      <RightAssessorPanel assessment={assessment} form={{}} setField={vi.fn()} expandedId={101} />
    );

    expect(screen.getByPlaceholderText(/Provide an overall summary/i)).toHaveValue(
      "Persisted comment"
    );
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("loads persisted assessor comment for rework responses", () => {
    mockUser = { role: "ASSESSOR", id: 2, username: "assessor" };
    const assessment = {
      success: true,
      assessment_id: 1,
      assessment: {
        id: 1,
        rework_count: 1,
        responses: [
          {
            id: 101,
            indicator_id: 1,
            requires_rework: true,
            indicator: {
              name: "Indicator A",
              indicator_code: "1.1.1",
              validation_rule: "ALL_ITEMS_REQUIRED",
              checklist_items: [],
            },
            response_data: {},
            movs: [],
            feedback_comments: [
              {
                id: 11,
                comment: "Rework assessor comment",
                comment_type: "validation",
                is_internal_note: false,
                created_at: "2024-01-02T00:00:00Z",
                assessor: { role: "ASSESSOR" },
              },
            ],
          },
        ],
      },
    } as any;

    renderWithProviders(
      <RightAssessorPanel assessment={assessment} form={{}} setField={vi.fn()} expandedId={101} />
    );

    expect(screen.getByPlaceholderText(/Provide an overall summary/i)).toHaveValue(
      "Rework assessor comment"
    );
  });
});
