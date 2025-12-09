import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/test-utils";
import userEvent from "@testing-library/user-event";
import { RightAssessorPanel } from "../RightAssessorPanel";

vi.mock("@sinag/shared", () => ({
  usePostAssessorAssessmentResponsesResponseIdMovsUpload: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: () => ({
    user: { role: "VALIDATOR", id: 1, username: "validator" },
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
  it("requires public findings when status is Fail or Conditional", async () => {
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

    // Select Fail - button text is "Unmet" for validators
    const failButton = screen.getByRole("button", { name: /Unmet/i });
    await user.click(failButton);

    // Verify setField was called with the correct status
    expect(setField).toHaveBeenCalledWith(101, "status", "Fail");
  });
});
