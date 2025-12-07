import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ValidationWorkspace } from "../ValidationWorkspace";

vi.mock("@sinag/shared", () => ({
  usePostAssessorAssessmentResponsesResponseIdValidate: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostAssessorAssessmentsAssessmentIdRework: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePostAssessorAssessmentsAssessmentIdFinalize: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostAssessorAssessmentResponsesResponseIdMovsUpload: () => ({ mutateAsync: vi.fn() }),
  useGetAssessorMovsMovFileIdAnnotations: () => ({ data: null, isLoading: false, error: null }),
  usePostAssessorMovsMovFileIdAnnotations: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePatchAssessorAnnotationsAnnotationId: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteAssessorAnnotationsAnnotationId: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const wrap = (ui: React.ReactNode) => {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
};

const makeAssessment = () => ({
  success: true,
  assessment_id: 1,
  assessment: {
    id: 1,
    rework_count: 0,
    responses: [
      { id: 101, indicator_id: 1, indicator: { name: "Ind A" }, movs: [], response_data: {} },
      { id: 102, indicator_id: 2, indicator: { name: "Ind B" }, movs: [], response_data: {} },
    ],
  },
});

describe("ValidationWorkspace footer logic", () => {
  it.skip("enables rework after all reviewed; keeps finalize disabled if any Fail", async () => {
    const user = userEvent.setup();
    const assessment = makeAssessment() as any;
    render(wrap(<ValidationWorkspace assessment={assessment} />));

    const passRadios = screen.getAllByLabelText("Pass");
    const failRadios = screen.getAllByLabelText("Fail");

    // Mark first as Pass, second as Fail (requires comment)
    await user.click(passRadios[0]);
    await user.click(failRadios[1]);

    // Provide required public comment for the failed one
    const comment = screen.getAllByPlaceholderText(/Provide clear, actionable feedback/i)[1];
    await user.type(comment, "Needs more evidence");

    const reworkBtn = screen.getByRole("button", { name: /Compile and Send for Rework/i });
    const finalizeBtn = screen.getByRole("button", { name: /Finalize Validation/i });

    expect(reworkBtn).not.toBeDisabled();
    expect(finalizeBtn).toBeDisabled();
  });

  it.skip("enables finalize when all reviewed and no Fail", async () => {
    const user = userEvent.setup();
    const assessment = makeAssessment() as any;
    render(wrap(<ValidationWorkspace assessment={assessment} />));

    const passRadios = screen.getAllByLabelText("Pass");
    await user.click(passRadios[0]);
    await user.click(passRadios[1]);

    const reworkBtn = screen.getByRole("button", { name: /Compile and Send for Rework/i });
    const finalizeBtn = screen.getByRole("button", { name: /Finalize Validation/i });

    expect(reworkBtn).not.toBeDisabled();
    expect(finalizeBtn).not.toBeDisabled();
  });
});
