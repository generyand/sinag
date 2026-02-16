"use client";

import {
  AssessmentHeader,
  AssessmentLockedBanner,
  AssessmentSkeleton,
} from "@/components/features/assessments";
import { AssessmentContentPanel } from "@/components/features/assessments/AssessmentContentPanel";
import {
  MobileNavButton,
  MobileTreeDrawer,
  TreeNavigator,
  findIndicatorById,
} from "@/components/features/assessments/tree-navigation";
import { useAssessmentValidation, useCurrentAssessment } from "@/hooks/useAssessment";
import { useAuthStore } from "@/store/useAuthStore";
import {
  useGetAssessmentsAssessmentIdAreaStatus,
  useGetBlguDashboardAssessmentId,
} from "@sinag/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function BLGUAssessmentsPage() {
  const { isAuthenticated, user, token } = useAuthStore();
  const { data: assessment, updateAssessmentData, isLoading, error } = useCurrentAssessment();
  const validation = useAssessmentValidation(assessment);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Fetch MOV annotations for rework workflow
  const { data: dashboardData, refetch: refetchDashboard } = useGetBlguDashboardAssessmentId(
    assessment ? parseInt(assessment.id) : 0,
    undefined,
    {
      query: {
        enabled: !!assessment?.id,
      } as any,
    }
  );

  // Fetch per-area submission status
  const { data: areaStatusData, refetch: refetchAreaStatus } =
    useGetAssessmentsAssessmentIdAreaStatus(assessment ? parseInt(assessment.id) : 0, {
      query: {
        enabled: !!assessment?.id,
      } as any,
    });

  // Handler for when an area is successfully submitted
  const handleAreaSubmitSuccess = useCallback(() => {
    refetchAreaStatus();
    refetchDashboard();
  }, [refetchAreaStatus, refetchDashboard]);

  // Epic 5.0: Trust the backend's completion count
  // The backend correctly tracks is_completed for indicators during rework.
  // No frontend adjustment needed - just use the assessment as-is.
  const reworkAwareAssessment = assessment;

  // Selected indicator state
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);

  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Sync selectedIndicatorId with URL params
  useEffect(() => {
    const indicatorParam = searchParams.get("indicator");
    if (indicatorParam && assessment) {
      const result = findIndicatorById(assessment, indicatorParam);
      if (result && selectedIndicatorId !== indicatorParam) {
        setSelectedIndicatorId(indicatorParam);
      } else if (!result && selectedIndicatorId !== null) {
        router.replace("/blgu/assessments");
        setSelectedIndicatorId(null);
      }
    } else if (!indicatorParam && selectedIndicatorId !== null) {
      setSelectedIndicatorId(null);
    }
  }, [searchParams, assessment, router, selectedIndicatorId]);

  // Update URL when indicator is selected (without scrolling)
  const handleIndicatorSelect = (indicatorId: string) => {
    setSelectedIndicatorId(indicatorId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("indicator", indicatorId);

    // Use window.history.pushState to update URL without triggering scroll
    window.history.pushState(null, "", `/blgu/assessments?${params.toString()}`);
  };

  // Handle back to list (mobile) - clear indicator selection
  const handleBackToList = () => {
    setSelectedIndicatorId(null);
    // Remove indicator param from URL
    window.history.pushState(null, "", "/blgu/assessments");
  };

  // Show loading if not authenticated or if auth state is still loading
  if (!isAuthenticated || !user || !token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--cityscape-yellow)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading authentication...</p>
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
          <div
            className="w-16 h-16 bg-red-100 rounded-sm flex items-center justify-center mx-auto mb-4"
            aria-hidden="true"
          >
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
          <div
            className="w-16 h-16 bg-amber-100 rounded-sm flex items-center justify-center mx-auto mb-4"
            aria-hidden="true"
          >
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
          <p className="text-amber-600 mb-4">Please try refreshing the page or contact support</p>
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
  // Status values are now lowercase with hyphens (e.g., "submitted-for-review", "validated")
  const normalizedStatus = (assessment.status || "").toLowerCase();

  // Per-area workflow: Check if ALL areas are submitted (none in "draft")
  // The banner should only show "Assessment Submitted" when ALL 6 areas have been submitted,
  // not when just ONE area is submitted

  const typedAreaStatusData = areaStatusData as {
    area_submission_status?: Record<string, { status?: string }>;
  } | null;
  const hasPerAreaTracking = Boolean(
    typedAreaStatusData?.area_submission_status &&
    Object.keys(typedAreaStatusData.area_submission_status).length > 0
  );

  // Check if any area is still in "draft" status
  const hasAnyDraftArea = hasPerAreaTracking
    ? Object.values(typedAreaStatusData?.area_submission_status || {}).some(
        (areaData) => areaData?.status === "draft" || !areaData?.status
      )
    : false;
  const hasAnyReworkArea = hasPerAreaTracking
    ? Object.values(typedAreaStatusData?.area_submission_status || {}).some(
        (areaData) => areaData?.status === "rework"
      )
    : false;

  // Assessment is fully locked only when:
  // 1. Status is in a locked state (submitted, validated, etc.) AND
  // 2. Either it's legacy workflow (no per-area tracking) OR all areas are submitted (no drafts)
  const isFullySubmitted =
    (normalizedStatus === "submitted" ||
      normalizedStatus === "submitted-for-review" ||
      normalizedStatus === "in-review") &&
    (!hasPerAreaTracking || (!hasAnyDraftArea && !hasAnyReworkArea));

  // Always show locked banner for these statuses (past the submission phase)
  const isPastSubmission =
    normalizedStatus === "awaiting-final-validation" ||
    normalizedStatus === "validated" ||
    normalizedStatus === "completed";

  const isLocked = isFullySubmitted || isPastSubmission;

  // Get selected indicator
  const selectedIndicatorData = selectedIndicatorId
    ? findIndicatorById(assessment, selectedIndicatorId)
    : null;
  const selectedIndicator = selectedIndicatorData?.indicator || null;

  // Calculate progress percentage for mobile button
  // Use reworkAwareAssessment for correct count during rework status
  const displayAssessment = reworkAwareAssessment || assessment;
  const progressPercentage =
    displayAssessment.totalIndicators > 0
      ? Math.round(
          (displayAssessment.completedIndicators / displayAssessment.totalIndicators) * 100
        )
      : 0;

  return (
    <div
      className="min-h-screen bg-[var(--background)] flex flex-col"
      role="application"
      aria-label="BLGU Assessment Form"
    >
      {/* Enhanced Locked Banner */}
      {isLocked && <AssessmentLockedBanner status={assessment.status} />}

      {/* Header (Full Width) */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-[1920px] mx-auto">
          <AssessmentHeader
            assessment={displayAssessment}
            validation={validation}
            isCalibrationRework={dashboardData?.is_calibration_rework === true}
            calibrationGovernanceAreaName={(dashboardData as any)?.calibration_governance_area_name}
            calibrationGovernanceAreaNames={(
              (dashboardData as any)?.calibration_governance_areas || []
            ).map((a: any) => a.governance_area_name)}
            areaStatusData={areaStatusData as any}
          />
        </div>
      </header>

      {/* Split Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop & Tablet (md+): Left Sidebar Tree Navigation */}
        <nav
          className="hidden md:block w-60 lg:w-64 xl:w-72 flex-shrink-0"
          aria-label="Assessment navigation sidebar"
        >
          <TreeNavigator
            assessment={assessment}
            selectedIndicatorId={selectedIndicatorId}
            onIndicatorSelect={handleIndicatorSelect}
            areaStatusData={areaStatusData as any}
            onAreaSubmitSuccess={handleAreaSubmitSuccess}
            areaAssessorStatus={(dashboardData as any)?.area_assessor_status}
          />
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden" role="main" aria-label="Assessment form content">
          <AssessmentContentPanel
            assessment={assessment}
            selectedIndicator={selectedIndicator}
            isLocked={isLocked}
            updateAssessmentData={updateAssessmentData}
            onIndicatorSelect={handleIndicatorSelect}
            onBackToList={handleBackToList}
            movAnnotations={dashboardData?.mov_annotations_by_indicator || {}}
            dashboardData={dashboardData}
            mlgooFlaggedFileIds={(dashboardData as any)?.mlgoo_recalibration_mov_file_ids || []}
            areaStatusData={areaStatusData as any}
          />
        </main>
      </div>

      {/* Mobile: Bottom Sheet Drawer - Only show when an indicator is selected */}
      {selectedIndicatorId && (
        <MobileTreeDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          assessment={assessment}
          selectedIndicatorId={selectedIndicatorId}
          onIndicatorSelect={handleIndicatorSelect}
        />
      )}

      {/* Mobile: Floating Action Button - Only show when an indicator is selected */}
      {selectedIndicatorId && (
        <MobileNavButton
          progress={progressPercentage}
          onClick={() => setIsMobileDrawerOpen(true)}
        />
      )}
    </div>
  );
}
