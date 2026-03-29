import { renderWithProviders } from "@/tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BLGUAssessmentsPage from "../page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/hooks/useAssessment", () => ({
  useCurrentAssessment: vi.fn(),
  useAssessmentValidation: vi.fn(),
}));

vi.mock("@/components/features/assessments", () => ({
  AssessmentHeader: () => <div>Assessment Header</div>,
  AssessmentLockedBanner: () => <div>Locked Banner</div>,
  AssessmentSkeleton: () => <div>Assessment Skeleton</div>,
  ResubmitAssessmentButton: () => <button type="button">Resubmit Assessment</button>,
}));

vi.mock("@/components/features/assessments/AssessmentContentPanel", () => ({
  AssessmentContentPanel: () => <div>Assessment Content Panel</div>,
}));

vi.mock("@/components/features/assessments/tree-navigation", () => ({
  MobileNavButton: () => <div>Mobile Nav Button</div>,
  MobileTreeDrawer: () => <div>Mobile Tree Drawer</div>,
  TreeNavigator: () => <div>Tree Navigator</div>,
  findIndicatorById: vi.fn(() => null),
}));

vi.mock("@sinag/shared", async () => {
  const actual = await vi.importActual("@sinag/shared");
  return {
    ...actual,
    useGetBlguDashboardAssessmentId: vi.fn(),
    useGetAssessmentsAssessmentIdAreaStatus: vi.fn(),
  };
});

import { useAuthStore } from "@/store/useAuthStore";
import { useAssessmentValidation, useCurrentAssessment } from "@/hooks/useAssessment";
import {
  useGetAssessmentsAssessmentIdAreaStatus,
  useGetBlguDashboardAssessmentId,
} from "@sinag/shared";

describe("BLGUAssessmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      token: "token",
      user: {
        id: 1,
        role: "BLGU_USER",
      },
    } as any);

    vi.mocked(useCurrentAssessment).mockReturnValue({
      data: {
        id: "42",
        status: "draft",
        totalIndicators: 84,
        completedIndicators: 84,
        needsReworkIndicators: 0,
        createdAt: "2026-03-29T00:00:00Z",
        updatedAt: "2026-03-29T00:00:00Z",
        governanceAreas: [],
      },
      updateAssessmentData: vi.fn(),
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useAssessmentValidation).mockReturnValue({
      isComplete: true,
      missingIndicators: [],
      missingMOVs: [],
      canSubmit: true,
    });

    vi.mocked(useGetBlguDashboardAssessmentId).mockReturnValue({
      data: {
        status: "REOPENED_BY_MLGOO",
      },
      refetch: vi.fn(),
    } as any);

    vi.mocked(useGetAssessmentsAssessmentIdAreaStatus).mockReturnValue({
      data: {
        area_submission_status: {
          "1": { status: "draft" },
        },
      },
      refetch: vi.fn(),
    } as any);
  });

  it("forces fresh dashboard and area-status data on mount", () => {
    renderWithProviders(<BLGUAssessmentsPage />);

    expect(useGetBlguDashboardAssessmentId).toHaveBeenCalledWith(
      42,
      undefined,
      expect.objectContaining({
        query: expect.objectContaining({
          staleTime: 0,
          refetchOnMount: "always",
          refetchOnWindowFocus: true,
        }),
      })
    );

    expect(useGetAssessmentsAssessmentIdAreaStatus).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        query: expect.objectContaining({
          staleTime: 0,
          refetchOnMount: "always",
          refetchOnWindowFocus: true,
        }),
      })
    );
  });
});
