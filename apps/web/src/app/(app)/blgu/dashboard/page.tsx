"use client";

/**
 * BLGU Dashboard Page - Phase-Based Assessment View
 *
 * Restructured dashboard showing three distinct phases:
 * - Phase 1: Initial Assessment (Assessor review workflow)
 * - Phase 2: Table Validation (Validator review workflow)
 * - Verdict: SGLGB Classification Result
 *
 * This allows BLGU users to review completed phases anytime, providing
 * better visibility into their assessment journey.
 *
 * IMPORTANT: COMPLIANCE status (PASS/FAIL/CONDITIONAL) is NEVER exposed
 * to BLGU users until the assessment reaches COMPLETED status.
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Phase1Section,
  Phase2Section,
  VerdictSection,
  PhaseTimeline,
} from "@/components/features/blgu-phases";
import { useGetBlguDashboardAssessmentId, useGetAssessmentsMyAssessment } from "@sinag/shared";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2, AlertCircle } from "lucide-react";
import { YearSelector } from "@/components/features/assessment-year/YearSelector";
import { useEffectiveYear, useIsActiveYear, useAccessibleYears } from "@/hooks/useAssessmentYear";
import { TourHelpButton } from "@/components/tour";
import { useTour } from "@/providers/TourProvider";
import { getDashboardTourSteps } from "@/components/tour";
import { useTourAutoStart } from "@/hooks/useTourAutoStart";

export default function BLGUDashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { registerTourSteps, tourLanguage, shouldShowTour, startTour } = useTour();

  // Register dashboard tour steps
  useEffect(() => {
    registerTourSteps("dashboard", getDashboardTourSteps(tourLanguage));
  }, [registerTourSteps, tourLanguage]);

  // Auto-start tour for first-time BLGU users
  useTourAutoStart({
    tourName: "dashboard",
    firstTimeOnly: true,
    delay: 2000, // Wait for page to fully load
    blguOnly: true,
  });

  // Year state from global store - useAccessibleYears fetches and initializes the store
  const { isLoading: isLoadingYears } = useAccessibleYears();
  const effectiveYear = useEffectiveYear();
  const isActiveYear = useIsActiveYear();

  // Language state for AI summary (defaults to user's preference or Bisaya)
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    user?.preferred_language || "ceb"
  );

  // Only BLGU users should fetch assessment data
  // This prevents 403 errors when other roles (e.g., KATUPARAN_CENTER_USER)
  // briefly render this page during middleware redirects
  const isBLGU = user?.role === "BLGU_USER";

  // Redirect non-BLGU users to their appropriate dashboard
  // This is a client-side fallback in case middleware redirect has a race condition
  useEffect(() => {
    if (user && !isBLGU) {
      const redirectMap: Record<string, string> = {
        KATUPARAN_CENTER_USER: "/katuparan/dashboard",
        MLGOO_DILG: "/mlgoo/dashboard",
        ASSESSOR: "/assessor/dashboard",
        VALIDATOR: "/validator/dashboard",
      };
      const redirectPath = redirectMap[user.role] || "/";
      router.replace(redirectPath);
    }
  }, [user, isBLGU, router]);

  // First, fetch the user's assessment to get the correct assessment ID
  // Enable refetchOnWindowFocus to ensure fresh data when user returns to tab
  const {
    data: myAssessment,
    isLoading: isLoadingAssessment,
    error: assessmentError,
  } = useGetAssessmentsMyAssessment(
    // Pass year parameter to filter by selected year
    { year: effectiveYear ?? undefined },
    {
      query: {
        enabled: isBLGU && effectiveYear !== null, // Only fetch for BLGU users when year is available
        refetchOnWindowFocus: true, // Refetch when user returns to tab for fresh status
        refetchOnMount: true, // Fresh data on mount for accurate status
        staleTime: 30 * 1000, // 30 seconds - shorter for faster invalidation after uploads
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
      } as any,
    }
  );

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
  } = useGetBlguDashboardAssessmentId(
    assessmentId!,
    {
      language: selectedLanguage,
    },
    {
      query: {
        enabled: !!assessmentId,
        refetchOnWindowFocus: true, // Refetch when user returns for fresh status updates
        refetchOnMount: true, // Fresh data on mount for accurate progress
        staleTime: 30 * 1000, // 30 seconds - shorter for faster invalidation after uploads
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
      } as any,
    }
  );

  // Handler for language change - refetches dashboard with new language
  const handleLanguageChange = useCallback((lang: string) => {
    setSelectedLanguage(lang);
    // The query will automatically refetch due to the language parameter change
  }, []);

  const isLoading = isLoadingYears || isLoadingAssessment || isLoadingDashboard;
  const error = assessmentError || dashboardError;

  // Non-BLGU users: show redirect message while useEffect redirects them
  if (user && !isBLGU) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--cityscape-yellow)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

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
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">
                  Assessment Dashboard
                </h1>
                {/* Historical Year Indicator */}
                {!isActiveYear && effectiveYear && (
                  <span className="px-2 py-1 text-xs font-medium rounded-sm bg-amber-100 text-amber-800 border border-amber-200">
                    Viewing {effectiveYear}
                  </span>
                )}
                {/* Tour Help Button - Prominent variant for high visibility */}
                <TourHelpButton tourName="dashboard" variant="prominent" />
              </div>
              <p className="mt-2 text-[var(--text-secondary)]">
                Track your SGLGB assessment progress through each phase
              </p>
            </div>
            {/* Year Selector */}
            <div className="flex-shrink-0" data-tour="year-selector">
              <YearSelector size="md" />
            </div>
          </div>
        </div>

        {/* Main Content: Timeline + Phases */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Timeline Sidebar - Desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <div
                className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-4"
                data-tour="phase-timeline"
              >
                <PhaseTimeline
                  submittedAt={dashboardData.submitted_at}
                  reworkRequestedAt={dashboardData.rework_requested_at}
                  validatedAt={dashboardData.validated_at}
                  currentStatus={dashboardData.status}
                  isCalibrationRework={dashboardData.is_calibration_rework || false}
                  isMlgooRecalibration={(dashboardData as any).is_mlgoo_recalibration || false}
                  mlgooRecalibrationRequestedAt={
                    (dashboardData as any).mlgoo_recalibration_requested_at
                  }
                  reworkCount={dashboardData.rework_count}
                />
              </div>
            </div>
          </div>

          {/* Phase Sections */}
          <div className="lg:col-span-3 space-y-6">
            {/* Mobile Timeline - Collapsible */}
            <div className="lg:hidden" data-tour="phase-timeline">
              <details className="bg-[var(--card)] rounded-lg border border-[var(--border)]">
                <summary className="p-4 cursor-pointer font-medium text-[var(--foreground)]">
                  View Assessment Journey
                </summary>
                <div className="px-4 pb-4">
                  <PhaseTimeline
                    submittedAt={dashboardData.submitted_at}
                    reworkRequestedAt={dashboardData.rework_requested_at}
                    validatedAt={dashboardData.validated_at}
                    currentStatus={dashboardData.status}
                    isCalibrationRework={dashboardData.is_calibration_rework || false}
                    isMlgooRecalibration={(dashboardData as any).is_mlgoo_recalibration || false}
                    mlgooRecalibrationRequestedAt={
                      (dashboardData as any).mlgoo_recalibration_requested_at
                    }
                    reworkCount={dashboardData.rework_count}
                  />
                </div>
              </details>
            </div>

            {/* Phase 1: Initial Assessment */}
            <Phase1Section
              dashboardData={dashboardData}
              assessmentId={assessmentId}
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              isFetchingDashboard={isFetchingDashboard}
              onRefetch={() => refetch()}
            />

            {/* Phase 2: Table Validation */}
            <Phase2Section
              dashboardData={dashboardData}
              assessmentId={assessmentId}
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              isFetchingDashboard={isFetchingDashboard}
              onRefetch={() => refetch()}
            />

            {/* Verdict: SGLGB Result */}
            <VerdictSection
              dashboardData={dashboardData}
              assessmentId={assessmentId}
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              isFetchingDashboard={isFetchingDashboard}
              onRefetch={() => refetch()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
