import React from "react";
import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useGetComplianceAssessmentsAssessmentIdComplianceOverview,
  usePostAssessorAssessmentResponsesResponseIdValidate,
} from "@sinag/shared";
import { ComplianceOverviewClient } from "../ComplianceOverviewClient";

vi.mock("@sinag/shared", () => ({
  useGetComplianceAssessmentsAssessmentIdComplianceOverview: vi.fn(),
  usePostAssessorAssessmentResponsesResponseIdValidate: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const mockUseGetOverview =
  useGetComplianceAssessmentsAssessmentIdComplianceOverview as unknown as ReturnType<typeof vi.fn>;
const mockUsePostValidate =
  usePostAssessorAssessmentResponsesResponseIdValidate as unknown as ReturnType<typeof vi.fn>;

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

function makeOverview() {
  return {
    barangay_name: "Test Barangay",
    assessment_year: 2026,
    assessment_status: "IN_REVIEW",
    all_sub_indicators_validated: false,
    governance_areas: [
      {
        governance_area_id: 1,
        governance_area_name: "Financial Administration",
        indicators: [
          {
            indicator_id: 10,
            indicator_code: "1.1",
            name: "Sample Indicator",
            is_bbi: false,
            all_validated: false,
            compliance_status: null,
            sub_indicators_passed: 0,
            sub_indicators_total: 1,
            sub_indicators_pending: 1,
            sub_indicators: [
              {
                response_id: 100,
                name: "Sample Sub Indicator",
                validation_status: null,
                recommended_status: "PASS",
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("ComplianceOverviewClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockUsePostValidate.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("shows an explicit loading screen while preparing the compliance overview", async () => {
    mockUseGetOverview.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(wrap(<ComplianceOverviewClient assessmentId={1} />));

    expect(
      screen.getByRole("heading", { name: /preparing compliance overview/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/please wait while we load validation results across governance areas/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/preparing governance areas/i)).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByText(/checking validation results/i)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2500 * 5);
    });

    expect(screen.getByText(/almost there.../i)).toBeInTheDocument();
  });

  it("renders overview content after the data loads", () => {
    mockUseGetOverview.mockReturnValue({
      data: makeOverview(),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(wrap(<ComplianceOverviewClient assessmentId={1} />));

    expect(screen.getByRole("heading", { name: "Compliance Overview" })).toBeInTheDocument();
    expect(screen.getByText("Test Barangay")).toBeInTheDocument();
    expect(screen.getByText("Financial Administration")).toBeInTheDocument();
    expect(screen.queryByText(/preparing compliance overview/i)).not.toBeInTheDocument();
  });

  it("renders an error state when the overview request fails", () => {
    mockUseGetOverview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Request failed"),
    });

    render(wrap(<ComplianceOverviewClient assessmentId={1} />));

    expect(screen.getByText(/failed to load compliance overview/i)).toBeInTheDocument();
    expect(screen.getByText("Request failed")).toBeInTheDocument();
  });
});
