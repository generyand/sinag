import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock all the shared hooks
vi.mock("@sinag/shared", () => ({
  getGetAssessorAssessmentsAssessmentIdQueryKey: (id: number) => ["assessor", "assessments", id],
  useGetAssessorAssessmentsAssessmentId: vi.fn(),
  usePostAssessorAssessmentResponsesResponseIdValidate: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    reset: vi.fn(),
  }),
  usePostAssessorAssessmentsAssessmentIdFinalize: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostAssessorAssessmentsAssessmentIdRework: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostAssessorAssessmentsAssessmentIdAreasGovernanceAreaIdApprove: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostAssessorAssessmentsAssessmentIdAreasGovernanceAreaIdRework: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useGetAssessorMovsMovFileIdAnnotations: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
  usePostAssessorMovsMovFileIdAnnotations: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePatchAssessorAnnotationsAnnotationId: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteAssessorAnnotationsAnnotationId: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostAssessorAssessmentResponsesResponseIdMovsUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock next/dynamic to return a simple component
vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="right-panel">RightAssessorPanel</div>,
}));

// Mock auth store
vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: () => ({
    user: {
      id: 1,
      role: "ASSESSOR",
      assessor_area_id: 2,
    },
    token: "mock-token",
  }),
}));

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { useGetAssessorAssessmentsAssessmentId } from "@sinag/shared";
import { AssessorValidationClient } from "../AssessorValidationClient";

const mockUseGetAssessorAssessmentsAssessmentId =
  useGetAssessorAssessmentsAssessmentId as unknown as ReturnType<typeof vi.fn>;

const wrap = (ui: React.ReactNode) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
};

const makeAssessment = (overrides: {
  rework_count?: number;
  rework_round_used?: boolean;
  status?: string;
}) => ({
  success: true,
  assessment_id: 1,
  assessment: {
    id: 1,
    status: overrides.status ?? "SUBMITTED",
    rework_count: overrides.rework_count ?? 0,
    rework_round_used: overrides.rework_round_used ?? false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    blgu_user: {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      barangay: { id: 1, name: "Test Barangay" },
    },
    area_assessor_approved: {},
    responses: [
      {
        id: 101,
        indicator_id: 1,
        indicator: {
          id: 1,
          name: "Test Indicator",
          indicator_code: "2.1.1",
          governance_area: { id: 2, name: "Disaster Preparedness" },
        },
        movs: [],
        response_data: {},
        flagged_mov_file_ids: [],
      },
    ],
  },
});

describe("AssessorValidationClient rework button disabled state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should disable rework button when rework_round_used is true (even if rework_count is 0)", async () => {
    // This is the critical test case - per-area workflow sets rework_round_used but not rework_count
    const assessment = makeAssessment({
      rework_count: 0,
      rework_round_used: true,
    });

    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: assessment,
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    // Find the rework button - it should be disabled
    const reworkButton = screen.getByRole("button", { name: /send for rework/i });
    expect(reworkButton).toBeDisabled();
  });

  it("should enable rework button when rework_round_used is false and has flagged indicators", async () => {
    const assessment = makeAssessment({
      rework_count: 0,
      rework_round_used: false,
    });

    // Add a MOV file explicitly flagged for rework (toggle ON)
    assessment.assessment.responses[0].flagged_mov_file_ids = [1];

    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: assessment,
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    const reworkButton = screen.getByRole("button", { name: /send for rework/i });
    // Button should NOT be disabled when rework_round_used is false and has flagged indicators
    expect(reworkButton).not.toBeDisabled();
  });

  it("should disable rework button when no indicators are flagged for rework", async () => {
    const assessment = makeAssessment({
      rework_count: 0,
      rework_round_used: false,
    });

    // No annotations - no indicators flagged
    assessment.assessment.responses[0].flagged_mov_file_ids = [];

    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: assessment,
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    const reworkButton = screen.getByRole("button", { name: /send for rework/i });
    // Should be disabled because no indicators are flagged
    expect(reworkButton).toBeDisabled();
  });

  it("should show correct tooltip when rework round is already used", async () => {
    const assessment = makeAssessment({
      rework_count: 0,
      rework_round_used: true,
    });

    mockUseGetAssessorAssessmentsAssessmentId.mockReturnValue({
      data: assessment,
      isLoading: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
    });

    render(wrap(<AssessorValidationClient assessmentId={1} />));

    const reworkButton = screen.getByRole("button", { name: /send for rework/i });
    expect(reworkButton).toHaveAttribute(
      "title",
      "Rework round has already been used for this assessment. Only one rework round is allowed."
    );
  });
});
