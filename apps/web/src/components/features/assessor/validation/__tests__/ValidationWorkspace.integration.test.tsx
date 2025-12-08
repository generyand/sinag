import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ValidationWorkspace } from "../ValidationWorkspace";

const validateSpy = vi.fn();
const reworkSpy = vi.fn();
const finalizeSpy = vi.fn();

vi.mock("@sinag/shared", () => ({
  usePostAssessorAssessmentResponsesResponseIdValidate: () => ({
    mutateAsync: validateSpy,
    isPending: false,
  }),
  usePostAssessorAssessmentsAssessmentIdRework: () => ({
    mutateAsync: reworkSpy,
    isPending: false,
  }),
  usePostAssessorAssessmentsAssessmentIdFinalize: () => ({
    mutateAsync: finalizeSpy,
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

describe("ValidationWorkspace integration", () => {
  it.skip("Save as Draft calls validate for updated responses", async () => {
    const user = userEvent.setup();
    validateSpy.mockReset();
    const assessment = makeAssessment() as any;
    render(wrap(<ValidationWorkspace assessment={assessment} />));

    const passRadios = screen.getAllByLabelText("Pass");
    await user.click(passRadios[0]);

    await user.click(screen.getByRole("button", { name: /Save as Draft/i }));

    expect(validateSpy).toHaveBeenCalledTimes(1);
    expect(validateSpy.mock.calls[0][0]).toMatchObject({ responseId: 101 });
  });

  it.skip("Rework saves draft first then calls rework endpoint", async () => {
    const user = userEvent.setup();
    validateSpy.mockReset();
    reworkSpy.mockReset();
    const assessment = makeAssessment() as any;
    render(wrap(<ValidationWorkspace assessment={assessment} />));

    const passRadios = screen.getAllByLabelText("Pass");
    const failRadios = screen.getAllByLabelText("Fail");
    await user.click(passRadios[0]);
    await user.click(failRadios[1]);
    const comment = screen.getAllByPlaceholderText(/Provide clear, actionable feedback/i)[1];
    await user.type(comment, "Needs more evidence");

    await user.click(screen.getByRole("button", { name: /Compile and Send for Rework/i }));

    expect(validateSpy).toHaveBeenCalled();
    expect(reworkSpy).toHaveBeenCalledWith({ assessmentId: 1 });
  });

  it.skip("Finalize saves draft first then calls finalize endpoint (no Fail)", async () => {
    const user = userEvent.setup();
    validateSpy.mockReset();
    finalizeSpy.mockReset();
    const assessment = makeAssessment() as any;
    render(wrap(<ValidationWorkspace assessment={assessment} />));

    const passRadios = screen.getAllByLabelText("Pass");
    await user.click(passRadios[0]);
    await user.click(passRadios[1]);

    await user.click(screen.getByRole("button", { name: /Finalize Validation/i }));

    expect(validateSpy).toHaveBeenCalled();
    expect(finalizeSpy).toHaveBeenCalledWith({ assessmentId: 1 });
  });
});
