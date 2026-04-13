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

  it("clears assessor general feedback after a rework resubmission boundary", () => {
    mockUser = { role: "ASSESSOR", id: 2, username: "assessor" };
    const assessment = {
      success: true,
      assessment_id: 1,
      assessment: {
        id: 1,
        rework_count: 1,
        rework_requested_at: "2024-01-03T00:00:00Z",
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
                comment: "Old assessor comment",
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

    expect(screen.getByPlaceholderText(/Provide an overall summary/i)).toHaveValue("");
  });

  it("clears validator general feedback after a calibration resubmission boundary", () => {
    mockUser = { role: "VALIDATOR", id: 1, username: "validator" };
    const assessment = {
      success: true,
      assessment_id: 1,
      assessment: {
        id: 1,
        calibration_requested_at: "2024-01-03T00:00:00Z",
        responses: [
          {
            id: 101,
            indicator_id: 1,
            indicator: {
              id: 1,
              name: "Indicator A",
              indicator_code: "1.1.1",
              governance_area: { id: 2, name: "Disaster Preparedness" },
              validation_rule: "ALL_ITEMS_REQUIRED",
              checklist_items: [],
            },
            response_data: {},
            movs: [],
            feedback_comments: [
              {
                id: 12,
                comment: "Old validator comment",
                comment_type: "validation",
                is_internal_note: false,
                created_at: "2024-01-02T00:00:00Z",
                assessor: { role: "VALIDATOR" },
              },
            ],
          },
        ],
      },
    } as any;

    renderWithProviders(
      <RightAssessorPanel assessment={assessment} form={{}} setField={vi.fn()} expandedId={101} />
    );

    expect(screen.getByPlaceholderText(/Provide an overall summary/i)).toHaveValue("");
  });

  it("accepts numeric accomplishment inputs without crashing and auto-sets validator assessment", async () => {
    mockUser = { role: "VALIDATOR", id: 1, username: "validator" };
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
              name: "Indicator 2.1.4",
              indicator_code: "2.1.4",
              validation_rule: "ALL_ITEMS_REQUIRED",
              checklist_items: [
                {
                  id: 1,
                  item_id: "2_1_4_physical_accomplished",
                  label: "Physical accomplished",
                  item_type: "calculation_field",
                },
                {
                  id: 2,
                  item_id: "2_1_4_physical_reflected",
                  label: "Physical reflected",
                  item_type: "calculation_field",
                },
                {
                  id: 3,
                  item_id: "2_1_4_option_a",
                  label: "Physical accomplishment is at least 50%",
                  item_type: "assessment_field",
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

    const [accomplishedInput, reflectedInput] = screen.getAllByPlaceholderText("Enter value");

    await user.type(accomplishedInput, "60");
    await user.type(reflectedInput, "100");

    expect(screen.getByText(/AUTO-YES/i)).toBeInTheDocument();
    expect(onChecklistChange).toHaveBeenCalledWith("checklist_101_2_1_4_option_a_yes", true);
    expect(onChecklistChange).toHaveBeenCalledWith("checklist_101_2_1_4_option_a_no", false);
  });

  it("filters non-numeric characters from validator calculation inputs", async () => {
    mockUser = { role: "VALIDATOR", id: 1, username: "validator" };
    const user = userEvent.setup();
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
                  item_id: "financial_amount",
                  label: "Amount utilized",
                  item_type: "calculation_field",
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
      <RightAssessorPanel assessment={assessment} form={{}} setField={vi.fn()} expandedId={101} />
    );

    const input = screen.getByPlaceholderText("Enter value");
    await user.type(input, "12ab3.4$5");

    expect(input).toHaveValue("123.45");
  });
});
