"use client";

/**
 * BLGU Analytics Page
 *
 * Shows AI-powered CapDev (Capacity Development) insights and recommendations.
 * - Pending state: When assessment is not yet COMPLETED
 * - Completed state: Full CapDev insights with multi-language support
 */

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import {
  useGetAssessmentsMyAssessment,
  useGetCapdevAssessmentsAssessmentId,
} from "@sinag/shared";
import { useEffectiveYear, useAccessibleYears } from "@/hooks/useAssessmentYear";
import { YearSelector } from "@/components/features/assessment-year/YearSelector";
import {
  AnalyticsPendingCard,
  LanguageSelector,
  CapDevSummaryCard,
  GovernanceWeaknessesCard,
  RecommendationsCard,
  CapDevNeedsAccordion,
  InterventionsGrid,
  PriorityActionsChecklist,
} from "@/components/features/blgu-analytics";
import { CapDevInsightsContent } from "@/types/capdev";

// Status labels for display
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  IN_REVIEW: "Under Review",
  REWORK: "Needs Rework",
  AWAITING_FINAL_VALIDATION: "Awaiting Validation",
  AWAITING_MLGOO_APPROVAL: "Awaiting Final Approval",
  COMPLETED: "Completed",
};

export default function BLGUAnalyticsPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  // Language state (defaults to user's preference or Bisaya)
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    user?.preferred_language || "ceb"
  );

  // Year state
  const { isLoading: isLoadingYears } = useAccessibleYears();
  const effectiveYear = useEffectiveYear();

  // Only BLGU users should access this page
  const isBLGU = user?.role === "BLGU_USER";

  // Redirect non-BLGU users
  useEffect(() => {
    if (user && !isBLGU) {
      const redirectMap: Record<string, string> = {
        KATUPARAN_CENTER_USER: "/katuparan/dashboard",
        MLGOO_DILG: "/mlgoo/dashboard",
        ASSESSOR: "/assessor/submissions",
        VALIDATOR: "/validator/submissions",
      };
      const redirectPath = redirectMap[user.role] || "/";
      router.replace(redirectPath);
    }
  }, [user, isBLGU, router]);

  // Fetch assessment data
  const {
    data: myAssessment,
    isLoading: isLoadingAssessment,
    error: assessmentError,
  } = useGetAssessmentsMyAssessment(
    { year: effectiveYear ?? undefined },
    {
      query: {
        enabled: isBLGU && effectiveYear !== null,
        refetchOnWindowFocus: true,
        staleTime: 30 * 1000,
      } as any,
    }
  );

  const assessmentId = (myAssessment?.assessment as any)?.id;
  const assessmentStatus = (myAssessment?.assessment as any)?.status;
  const isCompleted = assessmentStatus === "COMPLETED";

  // Fetch CapDev insights (only if assessment is completed)
  const {
    data: capdevData,
    isLoading: isLoadingCapdev,
    error: capdevError,
  } = useGetCapdevAssessmentsAssessmentId(assessmentId!, {
    query: {
      enabled: !!assessmentId && isCompleted,
      refetchOnWindowFocus: true,
      staleTime: 60 * 1000, // 1 minute
    } as any,
  });

  // Extract insights for selected language
  const insights = useMemo<CapDevInsightsContent | null>(() => {
    if (!capdevData?.insights) return null;

    const insightsObj = capdevData.insights as Record<string, unknown>;

    // Try selected language first, fallback to available languages
    if (insightsObj[selectedLanguage]) {
      return insightsObj[selectedLanguage] as CapDevInsightsContent;
    }

    // Fallback to first available language
    const availableLanguages = capdevData.available_languages || [];
    for (const lang of availableLanguages) {
      if (insightsObj[lang]) {
        return insightsObj[lang] as CapDevInsightsContent;
      }
    }

    return null;
  }, [capdevData, selectedLanguage]);

  const isLoading = isLoadingYears || isLoadingAssessment || (isCompleted && isLoadingCapdev);
  const error = assessmentError || capdevError;

  // Non-BLGU users: show redirect message
  if (user && !isBLGU) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--cityscape-yellow)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Redirecting...</p>
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
          <p className="text-[var(--text-secondary)]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || (!isLoading && !myAssessment)) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
            Unable to Load Analytics
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">
            {assessmentError
              ? "You may not have an active assessment yet."
              : "Failed to load analytics data. Please try again."}
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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--foreground)]">
                  AI Insights & Recommendations
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  Capacity development guidance for your barangay
                </p>
              </div>
            </div>
            {/* Year Selector */}
            <div className="flex-shrink-0">
              <YearSelector size="md" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        {!isCompleted ? (
          // Pending State
          <AnalyticsPendingCard
            status={assessmentStatus}
            statusLabel={STATUS_LABELS[assessmentStatus] || assessmentStatus}
          />
        ) : (
          // Completed State - Show CapDev Insights
          <div className="space-y-6">
            {/* Language Selector */}
            {capdevData?.available_languages && capdevData.available_languages.length > 1 && (
              <div className="flex justify-end">
                <LanguageSelector
                  selectedLanguage={selectedLanguage}
                  availableLanguages={capdevData.available_languages}
                  onLanguageChange={setSelectedLanguage}
                />
              </div>
            )}

            {/* Status Check */}
            {capdevData?.status === "pending" || capdevData?.status === "generating" ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--cityscape-yellow)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  Generating Insights...
                </h3>
                <p className="text-[var(--text-secondary)]">
                  AI is analyzing your assessment data. This may take a few minutes.
                </p>
              </div>
            ) : capdevData?.status === "failed" ? (
              <div className="bg-[var(--card)] border border-red-200 rounded-lg p-6 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  Generation Failed
                </h3>
                <p className="text-[var(--text-secondary)]">
                  Unable to generate insights. Please contact support if this persists.
                </p>
              </div>
            ) : insights ? (
              // Display CapDev Content
              <>
                {/* Summary Card */}
                {insights.summary && (
                  <CapDevSummaryCard
                    summary={insights.summary}
                    generatedAt={insights.generated_at || capdevData?.generated_at}
                  />
                )}

                {/* Governance Weaknesses */}
                {insights.governance_weaknesses && insights.governance_weaknesses.length > 0 && (
                  <GovernanceWeaknessesCard weaknesses={insights.governance_weaknesses} />
                )}

                {/* Recommendations */}
                {insights.recommendations && insights.recommendations.length > 0 && (
                  <RecommendationsCard recommendations={insights.recommendations} />
                )}

                {/* Capacity Development Needs */}
                {insights.capacity_development_needs &&
                  insights.capacity_development_needs.length > 0 && (
                    <CapDevNeedsAccordion needs={insights.capacity_development_needs} />
                  )}

                {/* Suggested Interventions */}
                {insights.suggested_interventions &&
                  insights.suggested_interventions.length > 0 && (
                    <InterventionsGrid interventions={insights.suggested_interventions} />
                  )}

                {/* Priority Actions */}
                {insights.priority_actions && insights.priority_actions.length > 0 && (
                  <PriorityActionsChecklist actions={insights.priority_actions} />
                )}
              </>
            ) : (
              // No insights available
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  No Insights Available
                </h3>
                <p className="text-[var(--text-secondary)]">
                  CapDev insights have not been generated yet. Please check back later.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
