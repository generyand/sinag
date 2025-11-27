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
 * - AI-generated summaries for rework/calibration with language toggle
 *
 * Epic 5.0 Features:
 * - LockedStateBanner: Shows locked state during SUBMITTED/IN_REVIEW/COMPLETED
 * - ReworkIndicatorsPanel: Shows assessor feedback during REWORK status
 * - AISummaryPanel: Shows AI-generated guidance with Bisaya/Tagalog/English toggle
 * - SubmitAssessmentButton: Allows submission when DRAFT and complete
 * - For resubmission after rework: Use "Resubmit for Review" button in /blgu/assessments
 */

import { useState, useCallback } from "react";
import {
  CompletionMetricsCard,
  IndicatorNavigationList,
} from "@/components/features/dashboard";
import {
  LockedStateBanner,
  SubmitAssessmentButton,
  ResubmitAssessmentButton,
} from "@/components/features/assessments";
import { ReworkIndicatorsPanel, AISummaryPanel } from "@/components/features/rework";
import { useGetBlguDashboardAssessmentId, useGetAssessmentsMyAssessment } from "@sinag/shared";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2, AlertCircle } from "lucide-react";

export default function BLGUDashboardPage() {
  const { user } = useAuthStore();

  // Language state for AI summary (defaults to user's preference or Bisaya)
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    user?.preferred_language || "ceb"
  );

  // First, fetch the user's assessment to get the correct assessment ID
  // Enable refetchOnWindowFocus to ensure fresh data when user returns to tab
  const {
    data: myAssessment,
    isLoading: isLoadingAssessment,
    error: assessmentError,
  } = useGetAssessmentsMyAssessment({
    query: {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0, // Always treat as stale to ensure fresh data
    },
  });

  const assessmentId = (myAssessment?.assessment as any)?.id;

  // Fetch dashboard data using generated hook (only if we have an assessment ID)
  // Enable refetchOnWindowFocus to automatically fetch updated status when BLGU returns to dashboard
  // Pass language parameter for AI summary
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    error: dashboardError,
    refetch,
    isFetching: isFetchingDashboard,
  } = useGetBlguDashboardAssessmentId(assessmentId!, {
    language: selectedLanguage,
  }, {
    query: {
      enabled: !!assessmentId,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0, // Always treat as stale to ensure fresh data (important for rework status updates)
    },
  });

  // Handler for language change - refetches dashboard with new language
  const handleLanguageChange = useCallback((lang: string) => {
    setSelectedLanguage(lang);
    // The query will automatically refetch due to the language parameter change
  }, []);

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

        {/* AI Summary Panel - Shows AI-generated guidance for rework/calibration */}
        {/* Displayed above the detailed feedback when in REWORK status with AI summary available */}
        {(dashboardData.status === "REWORK" || dashboardData.status === "NEEDS_REWORK") &&
         dashboardData.ai_summary && (
          <div className="mb-6">
            <AISummaryPanel
              summary={dashboardData.ai_summary as any}
              availableLanguages={dashboardData.ai_summary_available_languages || ["ceb", "en"]}
              currentLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              isLoading={isFetchingDashboard}
            />
          </div>
        )}

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
        {/* Only show completion metrics when BLGU can edit (DRAFT, REWORK, NEEDS_REWORK) */}
        {/* Hide when assessment is under review (SUBMITTED, IN_REVIEW, AWAITING_FINAL_VALIDATION, COMPLETED) */}
        {(dashboardData.status === "DRAFT" ||
          dashboardData.status === "REWORK" ||
          dashboardData.status === "NEEDS_REWORK") && (
          <div className="mb-8">
            <CompletionMetricsCard
              totalIndicators={dashboardData.total_indicators}
              completedIndicators={dashboardData.completed_indicators}
              incompleteIndicators={dashboardData.incomplete_indicators}
              completionPercentage={dashboardData.completion_percentage}
            />
          </div>
        )}

        {/* Epic 5.0: Submission Button */}
        <div className="mb-8 flex gap-4">
          {/* Show SubmitAssessmentButton if DRAFT status */}
          {dashboardData.status === "DRAFT" && (
            <SubmitAssessmentButton
              assessmentId={assessmentId}
              isComplete={dashboardData.completion_percentage === 100}
              onSuccess={() => refetch()}
            />
          )}

          {/* Show ResubmitAssessmentButton if REWORK status */}
          {/* The button automatically shows "Submit for Calibration" if is_calibration_rework is true */}
          {(dashboardData.status === "REWORK" || dashboardData.status === "NEEDS_REWORK") && (
            <ResubmitAssessmentButton
              assessmentId={assessmentId}
              isComplete={dashboardData.completion_percentage === 100}
              isCalibrationRework={dashboardData.is_calibration_rework || false}
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
