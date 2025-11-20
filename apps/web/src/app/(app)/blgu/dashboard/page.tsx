"use client";

/**
 * BLGU Dashboard Page - Epic 2.0 + Epic 5.0: Completion Tracking & Submission Workflow
 *
 * This dashboard shows COMPLETION status only (complete/incomplete).
 * COMPLIANCE status (PASS/FAIL/CONDITIONAL) is NEVER exposed to BLGU users.
 *
 * Features:
 * - Completion metrics (total, completed, incomplete, percentage)
 * - Governance areas with indicator completion status
 * - Assessor rework comments (if assessment needs rework)
 * - Indicator navigation for quick access to incomplete items
 *
 * Epic 5.0 Features:
 * - LockedStateBanner: Shows locked state during SUBMITTED/IN_REVIEW/COMPLETED
 * - ReworkIndicatorsPanel: Shows assessor feedback during REWORK status
 * - SubmitAssessmentButton: Allows submission when DRAFT and complete
 * - For resubmission after rework: Use "Resubmit for Review" button in /blgu/assessments
 */

import {
  CompletionMetricsCard,
  IndicatorNavigationList,
} from "@/components/features/dashboard";
import {
  LockedStateBanner,
  SubmitAssessmentButton,
} from "@/components/features/assessments";
import { ReworkIndicatorsPanel } from "@/components/features/rework";
import { useGetBlguDashboardAssessmentId, useGetAssessmentsMyAssessment } from "@vantage/shared";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2, AlertCircle } from "lucide-react";

export default function BLGUDashboardPage() {
  const { user } = useAuthStore();

  // First, fetch the user's assessment to get the correct assessment ID
  const {
    data: myAssessment,
    isLoading: isLoadingAssessment,
    error: assessmentError,
  } = useGetAssessmentsMyAssessment();

  const assessmentId = (myAssessment?.assessment as any)?.id;

  // Fetch dashboard data using generated hook (only if we have an assessment ID)
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    error: dashboardError,
    refetch,
  } = useGetBlguDashboardAssessmentId(assessmentId!);

  const isLoading = isLoadingAssessment || isLoadingDashboard;
  const error = assessmentError || dashboardError;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--cityscape-yellow)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || (!isLoading && !dashboardData)) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
            Failed to Load Dashboard
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">
            {assessmentError
              ? "Unable to load your assessment. You may not have an active assessment yet."
              : "Unable to load dashboard data. Please try again."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--cityscape-yellow)] text-white rounded-lg hover:bg-[var(--cityscape-yellow-dark)] transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // TypeScript safety check
  if (!dashboardData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Assessment Dashboard
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Track your assessment completion progress
          </p>
        </div>

        {/* Epic 5.0: Locked State Banner */}
        <div className="mb-6">
          <LockedStateBanner
            status={dashboardData.status as any}
            reworkCount={dashboardData.rework_count}
          />
        </div>

        {/* Epic 5.0: Rework Indicators Panel (shows failed indicators grouped by area) */}
        {/* Shows when status is REWORK/NEEDS_REWORK AND there are comments or annotations */}
        {/* This replaces the old AssessorCommentsPanel with better UX */}
        {(dashboardData.status === "REWORK" || dashboardData.status === "NEEDS_REWORK") &&
         (dashboardData.rework_comments || dashboardData.mov_annotations_by_indicator) && (
          <div className="mb-6">
            <ReworkIndicatorsPanel
              dashboardData={dashboardData as any}
              assessmentId={assessmentId}
            />
          </div>
        )}

        {/* Completion Metrics Section */}
        <div className="mb-8">
          <CompletionMetricsCard
            totalIndicators={dashboardData.total_indicators}
            completedIndicators={dashboardData.completed_indicators}
            incompleteIndicators={dashboardData.incomplete_indicators}
            completionPercentage={dashboardData.completion_percentage}
          />
        </div>

        {/* Epic 5.0: Submission Button */}
        <div className="mb-8 flex gap-4">
          {/* Show SubmitAssessmentButton if DRAFT status */}
          {/* Note: For REWORK status, use "Resubmit for Review" button in /blgu/assessments instead */}
          {dashboardData.status === "DRAFT" && (
            <SubmitAssessmentButton
              assessmentId={assessmentId}
              isComplete={dashboardData.completion_percentage === 100}
              onSuccess={() => refetch()}
            />
          )}
        </div>

        {/* Assessor Comments Section - removed in favor of ReworkIndicatorsPanel */}

        {/* Indicator Navigation Section */}
        <div>
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Indicators by Governance Area
          </h2>
          <IndicatorNavigationList
            items={dashboardData.governance_areas.flatMap((area) =>
              area.indicators.map((indicator) => ({
                indicator_id: indicator.indicator_id,
                title: indicator.indicator_name,
                completion_status: indicator.is_complete
                  ? ("complete" as const)
                  : ("incomplete" as const),
                route_path: `/blgu/assessments?indicator=${indicator.indicator_id}`,
                governance_area_name: area.governance_area_name,
                governance_area_id: area.governance_area_id,
              }))
            )}
          />
        </div>
      </div>
    </div>
  );
}
