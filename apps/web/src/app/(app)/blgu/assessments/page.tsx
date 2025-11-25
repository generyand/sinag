"use client";

import {
  AssessmentHeader,
  AssessmentLockedBanner,
  AssessmentSkeleton,
} from "@/components/features/assessments";
import { AssessmentContentPanel } from "@/components/features/assessments/AssessmentContentPanel";
import {
  TreeNavigator,
  MobileTreeDrawer,
  MobileNavButton,
  findIndicatorById,
} from "@/components/features/assessments/tree-navigation";
import {
  useAssessmentValidation,
  useCurrentAssessment,
} from "@/hooks/useAssessment";
import { useAuthStore } from "@/store/useAuthStore";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGetBlguDashboardAssessmentId } from "@vantage/shared";

export default function BLGUAssessmentsPage() {
  const { isAuthenticated, user, token } = useAuthStore();
  const {
    data: assessment,
    updateAssessmentData,
    isLoading,
    error,
  } = useCurrentAssessment();
  const validation = useAssessmentValidation(assessment);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Fetch MOV annotations for rework workflow
  const { data: dashboardData } = useGetBlguDashboardAssessmentId(
    assessment ? parseInt(assessment.id) : 0,
    {
      query: {
        enabled: !!assessment?.id,
      } as any,
    }
  );

  // Selected indicator state
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(
    null
  );

  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Sync selectedIndicatorId with URL params
  useEffect(() => {
    const indicatorParam = searchParams.get("indicator");
    if (indicatorParam && assessment) {
      // Validate that indicator exists in assessment
      const result = findIndicatorById(assessment, indicatorParam);
      if (result) {
        setSelectedIndicatorId(indicatorParam);
      } else {
        // Invalid indicator ID in URL, clear it
        router.replace("/blgu/assessments");
      }
    }
  }, [searchParams, assessment, router]);

  // Update URL when indicator is selected (without scrolling)
  const handleIndicatorSelect = (indicatorId: string) => {
    setSelectedIndicatorId(indicatorId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("indicator", indicatorId);

    // Use window.history.pushState to update URL without triggering scroll
    window.history.pushState(
      null,
      "",
      `/blgu/assessments?${params.toString()}`
    );
  };

  // Show loading if not authenticated or if auth state is still loading
  if (!isAuthenticated || !user || !token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--cityscape-yellow)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">
            Loading authentication...
          </p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return <AssessmentSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center bg-[var(--card)] backdrop-blur-sm rounded-sm p-8 shadow-lg border border-[var(--border)]">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
            Error Loading Assessment
          </h3>
          <p className="text-red-600 mb-4">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show error if no assessment data
  if (!assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center bg-[var(--card)] backdrop-blur-sm rounded-sm p-8 shadow-lg border border-[var(--border)]">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
            No Assessment Data Found
          </h3>
          <p className="text-amber-600 mb-4">
            Please try refreshing the page or contact support
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-amber-600 text-white rounded-sm hover:bg-amber-700 transition-colors duration-200"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Show locked banner if assessment is not editable
  const isLocked =
    assessment.status === "Submitted for Review" ||
    assessment.status === "Validated";

  // Get selected indicator
  const selectedIndicatorData = selectedIndicatorId
    ? findIndicatorById(assessment, selectedIndicatorId)
    : null;
  const selectedIndicator = selectedIndicatorData?.indicator || null;

  // Calculate progress percentage for mobile button
  const progressPercentage =
    assessment.totalIndicators > 0
      ? Math.round(
          (assessment.completedIndicators / assessment.totalIndicators) * 100
        )
      : 0;

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Enhanced Locked Banner */}
      {isLocked && <AssessmentLockedBanner status={assessment.status} />}

      {/* Header (Full Width) */}
      <div className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AssessmentHeader
            assessment={assessment}
            validation={validation}
            isCalibrationRework={dashboardData?.is_calibration_rework === true}
            calibrationGovernanceAreaName={(dashboardData as any)?.calibration_governance_area_name}
          />
        </div>
      </div>

      {/* Split Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: Left Sidebar Tree Navigation */}
        <aside className="hidden lg:block w-48 xl:w-56 flex-shrink-0">
          <TreeNavigator
            assessment={assessment}
            selectedIndicatorId={selectedIndicatorId}
            onIndicatorSelect={handleIndicatorSelect}
          />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden">
          <AssessmentContentPanel
            assessment={assessment}
            selectedIndicator={selectedIndicator}
            isLocked={isLocked}
            updateAssessmentData={updateAssessmentData}
            onIndicatorSelect={handleIndicatorSelect}
            movAnnotations={dashboardData?.mov_annotations_by_indicator || {}}
            dashboardData={dashboardData}
          />
        </main>
      </div>

      {/* Mobile: Bottom Sheet Drawer */}
      <MobileTreeDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        assessment={assessment}
        selectedIndicatorId={selectedIndicatorId}
        onIndicatorSelect={handleIndicatorSelect}
      />

      {/* Mobile: Floating Action Button */}
      <MobileNavButton
        progress={progressPercentage}
        onClick={() => setIsMobileDrawerOpen(true)}
      />
    </div>
  );
}
