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
  useGetBlguDashboardAssessmentId,
} from "@sinag/shared";
import { useEffectiveYear, useAccessibleYears } from "@/hooks/useAssessmentYear";
import { YearSelector } from "@/components/features/assessment-year/YearSelector";
import {
  AnalyticsPendingCard,
  LanguageSelector,
  GovernanceWeaknessesCard,
  RecommendationsCard,
  PriorityActionsChecklist,
} from "@/components/features/blgu-analytics";
import { CapDevInsightsContent } from "@/types/capdev";

// =============================================================================
// TEMPORARY PREVIEW MODE - Remove after review
// =============================================================================
const PREVIEW_MODE = false; // Set to false to disable mock data

const MOCK_INSIGHTS: CapDevInsightsContent = {
  summary: "Mock summary for preview",
  governance_weaknesses: [
    {
      area_name: "Financial Administration",
      description:
        "Incomplete financial records and delayed submission of budget reports. The barangay lacks a systematic approach to tracking expenditures and revenue.",
      severity: "high",
    },
    {
      area_name: "Disaster Preparedness",
      description:
        "No updated Barangay Disaster Risk Reduction Management Plan. Emergency response protocols are outdated and evacuation routes need review.",
      severity: "high",
    },
    {
      area_name: "Environmental Management",
      description:
        "Waste segregation program needs improvement. Only 40% of households are actively participating in the waste management initiative.",
      severity: "medium",
    },
    {
      area_name: "Social Protection",
      description:
        "Database of senior citizens and PWDs requires updating. Some beneficiaries may not be receiving appropriate support services.",
      severity: "low",
    },
  ],
  recommendations: [
    {
      title: "Implement Digital Financial Tracking System",
      description:
        "Adopt a simple digital bookkeeping system to track all barangay income and expenses. This will improve transparency and make audit preparation easier.",
      governance_area: "Financial Administration",
      priority: "high",
      expected_impact: "90% improvement in financial report accuracy and on-time submission",
    },
    {
      title: "Update BDRRM Plan with Community Input",
      description:
        "Conduct community consultations to update the disaster risk reduction plan. Include new hazard assessments and updated evacuation procedures.",
      governance_area: "Disaster Preparedness",
      priority: "high",
      expected_impact: "Enhanced community resilience and faster emergency response",
    },
    {
      title: "Launch Waste Segregation Awareness Campaign",
      description:
        "Organize purok-level information drives about proper waste segregation. Partner with schools for youth education programs.",
      governance_area: "Environmental Management",
      priority: "medium",
      expected_impact: "Increase household participation from 40% to 75%",
    },
    {
      title: "Conduct Beneficiary Database Validation",
      description:
        "Perform house-to-house validation of senior citizens and PWD registry. Ensure all eligible residents are properly documented.",
      governance_area: "Social Protection",
      priority: "medium",
      expected_impact: "100% accurate beneficiary database for social services",
    },
  ],
  priority_actions: [
    {
      action:
        "Designate a Barangay Financial Records Officer and provide basic bookkeeping training",
      responsible_party: "Barangay Captain",
      timeline: "Immediate",
      success_indicator: "Officer appointed and trained within 2 weeks",
    },
    {
      action: "Schedule BDRRM committee meeting to review and update emergency protocols",
      responsible_party: "BDRRM Committee Chair",
      timeline: "Immediate",
      success_indicator: "Meeting conducted with action items documented",
    },
    {
      action: "Procure waste segregation bins and educational materials for distribution",
      responsible_party: "Environment Committee",
      timeline: "Short-term",
      success_indicator: "Materials distributed to all puroks within 1 month",
    },
    {
      action: "Deploy barangay health workers for beneficiary database validation",
      responsible_party: "Barangay Secretary",
      timeline: "Short-term",
      success_indicator: "Validation completed for 100% of registered beneficiaries",
    },
    {
      action: "Establish quarterly review schedule for all governance areas",
      responsible_party: "Barangay Council",
      timeline: "Long-term",
      success_indicator: "Regular review meetings institutionalized",
    },
  ],
};
// =============================================================================

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

  // Fetch dashboard data for progress calculation (only when not completed)
  const { data: dashboardData, isLoading: isLoadingDashboard } = useGetBlguDashboardAssessmentId(
    assessmentId!,
    {},
    {
      query: {
        enabled: !!assessmentId && !isCompleted,
        staleTime: 30 * 1000,
      } as any,
    }
  );

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

  const isLoading =
    isLoadingYears ||
    isLoadingAssessment ||
    (isCompleted && isLoadingCapdev) ||
    (!isCompleted && isLoadingDashboard);
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
        {!isCompleted && !PREVIEW_MODE ? (
          // Pending State
          <AnalyticsPendingCard
            status={assessmentStatus}
            statusLabel={STATUS_LABELS[assessmentStatus] || assessmentStatus}
            completionPercentage={dashboardData?.completion_percentage || 0}
            isCalibrationRework={dashboardData?.is_calibration_rework || false}
            isMlgooRecalibration={dashboardData?.is_mlgoo_recalibration || false}
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

            {/* Preview Mode Banner */}
            {PREVIEW_MODE && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                <span className="text-amber-600 text-sm font-medium">
                  Preview Mode - Showing mock data for UI review
                </span>
              </div>
            )}

            {!PREVIEW_MODE &&
            (capdevData?.status === "pending" || capdevData?.status === "generating") ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--cityscape-yellow)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  Generating Insights...
                </h3>
                <p className="text-[var(--text-secondary)]">
                  AI is analyzing your assessment data. This may take a few minutes.
                </p>
              </div>
            ) : !PREVIEW_MODE && capdevData?.status === "failed" ? (
              <div className="bg-[var(--card)] border border-red-200 rounded-lg p-6 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  Generation Failed
                </h3>
                <p className="text-[var(--text-secondary)]">
                  Unable to generate insights. Please contact support if this persists.
                </p>
              </div>
            ) : (PREVIEW_MODE ? MOCK_INSIGHTS : insights) ? (
              // Display CapDev Content - Streamlined 3-section layout
              <>
                {/* Governance Weaknesses - "What's wrong?" */}
                {(PREVIEW_MODE ? MOCK_INSIGHTS : insights)!.governance_weaknesses &&
                  (PREVIEW_MODE ? MOCK_INSIGHTS : insights)!.governance_weaknesses!.length > 0 && (
                    <GovernanceWeaknessesCard
                      weaknesses={(PREVIEW_MODE ? MOCK_INSIGHTS : insights)!.governance_weaknesses!}
                    />
                  )}

                {/* Recommendations - "What should we do?" */}
                {(PREVIEW_MODE ? MOCK_INSIGHTS : insights)!.recommendations &&
                  (PREVIEW_MODE ? MOCK_INSIGHTS : insights)!.recommendations!.length > 0 && (
                    <RecommendationsCard
                      recommendations={(PREVIEW_MODE ? MOCK_INSIGHTS : insights)!.recommendations!}
                    />
                  )}

                {/* Priority Actions - "What do I do first?" */}
                {(PREVIEW_MODE ? MOCK_INSIGHTS : insights)!.priority_actions &&
                  (PREVIEW_MODE ? MOCK_INSIGHTS : insights)!.priority_actions!.length > 0 && (
                    <PriorityActionsChecklist
                      actions={(PREVIEW_MODE ? MOCK_INSIGHTS : insights)!.priority_actions!}
                    />
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
