"use client";

/**
 * Phase1Section Component
 *
 * Displays Phase 1 (Initial Assessment) content within the BLGU dashboard.
 * Shows completion metrics, rework feedback, and indicator navigation.
 *
 * Status Logic:
 * - DRAFT → "In Progress" (editable)
 * - SUBMITTED/IN_REVIEW → "Under Review" (locked)
 * - REWORK (not calibration) → "Needs Rework" (editable, shows feedback)
 * - AWAITING_FINAL_VALIDATION/COMPLETED → "Completed" (read-only)
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, FileText, ChevronRight } from "lucide-react";
import { PhaseCard, PhaseStatus } from "./PhaseCard";
import { DeadlineBanner } from "./DeadlineBanner";
import { CompletionMetricsCard, IndicatorNavigationList } from "@/components/features/dashboard";
import {
  SubmitAssessmentButton,
  ResubmitAssessmentButton,
} from "@/components/features/assessments";
import { ReworkIndicatorsPanel, AISummaryPanel } from "@/components/features/rework";
import { Card } from "@/components/ui/card";
import { BLGUDashboardResponse, AISummary } from "@sinag/shared";

type AssessmentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "REWORK"
  | "NEEDS_REWORK"
  | "AWAITING_FINAL_VALIDATION"
  | "AWAITING_MLGOO_APPROVAL"
  | "COMPLETED";

interface Phase1SectionProps {
  dashboardData: BLGUDashboardResponse;
  assessmentId: number;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  isFetchingDashboard: boolean;
  onRefetch: () => void;
}

function getPhase1Status(
  status: string,
  isCalibrationRework: boolean,
  isMlgooRecalibration: boolean,
  reworkCount: number = 0
): { phaseStatus: PhaseStatus; statusLabel: string; isActive: boolean } {
  const assessmentStatus = status as AssessmentStatus;

  switch (assessmentStatus) {
    case "DRAFT":
      return {
        phaseStatus: "in_progress",
        statusLabel: "In Progress",
        isActive: true,
      };
    case "SUBMITTED":
    case "IN_REVIEW":
      return {
        phaseStatus: "under_review",
        statusLabel: reworkCount > 0 ? "Under Re-Review" : "Under Review",
        isActive: true,
      };
    case "REWORK":
    case "NEEDS_REWORK":
      // MLGOO RE-calibration: Phase 1 was already completed
      if (isMlgooRecalibration) {
        return {
          phaseStatus: "completed",
          statusLabel: "Completed",
          isActive: false,
        };
      }
      // Calibration rework belongs to Phase 2
      if (isCalibrationRework) {
        return {
          phaseStatus: "completed",
          statusLabel: "Completed",
          isActive: false,
        };
      }
      return {
        phaseStatus: "needs_rework",
        statusLabel: "Needs Rework",
        isActive: true,
      };
    case "AWAITING_FINAL_VALIDATION":
    case "AWAITING_MLGOO_APPROVAL":
    case "COMPLETED":
      return {
        phaseStatus: "completed",
        statusLabel: "Completed",
        isActive: false,
      };
    default:
      return {
        phaseStatus: "in_progress",
        statusLabel: "In Progress",
        isActive: true,
      };
  }
}

export function Phase1Section({
  dashboardData,
  assessmentId,
  selectedLanguage,
  onLanguageChange,
  isFetchingDashboard,
  onRefetch,
}: Phase1SectionProps) {
  // Check for MLGOO RE-calibration (distinct from validator calibration)
  const isMlgooRecalibration = (dashboardData as any).is_mlgoo_recalibration === true;

  const { phaseStatus, statusLabel, isActive } = getPhase1Status(
    dashboardData.status,
    dashboardData.is_calibration_rework || false,
    isMlgooRecalibration,
    dashboardData.rework_count || 0
  );

  const hasAreaLevelRework = ((dashboardData as any).area_assessor_status || []).some(
    (area: any) => String(area?.status || "").toLowerCase() === "rework"
  );

  // Phase 1 is editable only during DRAFT or assessor rework (not calibration, not MLGOO recalibration)
  const isEditable =
    dashboardData.status === "DRAFT" ||
    ((dashboardData.status === "REWORK" || dashboardData.status === "NEEDS_REWORK") &&
      !dashboardData.is_calibration_rework &&
      !isMlgooRecalibration) ||
    (hasAreaLevelRework && !dashboardData.is_calibration_rework && !isMlgooRecalibration);

  // Show rework feedback only for assessor rework (not calibration, not MLGOO recalibration)
  const showReworkFeedback =
    (dashboardData.status === "REWORK" ||
      dashboardData.status === "NEEDS_REWORK" ||
      hasAreaLevelRework) &&
    !dashboardData.is_calibration_rework &&
    !isMlgooRecalibration;

  const router = useRouter();

  // Show assessor feedback notice when annotations exist outside rework workflow
  const annotationsByIndicator = (dashboardData as any).mov_annotations_by_indicator as
    | Record<string, any[]>
    | null
    | undefined;
  const feedbackIndicators = useMemo(() => {
    if (showReworkFeedback || !annotationsByIndicator) return [];
    const items: Array<{
      indicatorId: number;
      indicatorName: string;
      annotationCount: number;
      governanceAreaName: string;
    }> = [];
    for (const area of dashboardData.governance_areas) {
      const searchIndicators = (indicators: any[]) => {
        for (const ind of indicators) {
          const annotations = annotationsByIndicator[String(ind.indicator_id)];
          if (annotations && annotations.length > 0) {
            items.push({
              indicatorId: ind.indicator_id,
              indicatorName: ind.indicator_name,
              annotationCount: annotations.length,
              governanceAreaName: area.governance_area_name,
            });
          }
          if (ind.children) searchIndicators(ind.children);
        }
      };
      searchIndicators(area.indicators);
    }
    return items;
  }, [showReworkFeedback, annotationsByIndicator, dashboardData.governance_areas]);

  // Build navigation items
  const navigationItems = dashboardData.governance_areas.flatMap((area) =>
    area.indicators.map((indicator) => ({
      indicator_id: indicator.indicator_id,
      title: indicator.indicator_name,
      completion_status: indicator.is_complete ? ("complete" as const) : ("incomplete" as const),
      route_path: `/blgu/assessments?indicator=${indicator.indicator_id}`,
      governance_area_name: area.governance_area_name,
      governance_area_id: area.governance_area_id,
    }))
  );

  return (
    <PhaseCard
      title="Phase 1: Initial Assessment"
      phaseNumber={1}
      status={phaseStatus}
      statusLabel={statusLabel}
      isActive={isActive}
      defaultExpanded={isActive}
      data-tour="phase-1-section"
    >
      <div className="space-y-6">
        {/* Deadline Banner - Shows urgency when deadline is approaching */}
        <DeadlineBanner
          phase1Deadline={dashboardData.phase1_deadline ?? null}
          daysRemaining={dashboardData.days_until_deadline ?? null}
          urgencyLevel={dashboardData.deadline_urgency_level ?? null}
          assessmentStatus={dashboardData.status}
          isAutoSubmitted={dashboardData.is_auto_submitted ?? false}
        />

        {/* AI Summary Panel - Shows AI-generated guidance for rework */}
        {showReworkFeedback && dashboardData.ai_summary && (
          <div data-tour="ai-summary-panel">
            <AISummaryPanel
              summary={dashboardData.ai_summary as AISummary}
              availableLanguages={dashboardData.ai_summary_available_languages || ["ceb", "en"]}
              currentLanguage={selectedLanguage}
              onLanguageChange={onLanguageChange}
              isLoading={isFetchingDashboard}
            />
          </div>
        )}

        {/* Rework Indicators Panel - Shows failed indicators grouped by area */}
        {showReworkFeedback &&
          (dashboardData.rework_comments || dashboardData.mov_annotations_by_indicator) && (
            <div data-tour="rework-indicators-list">
              <ReworkIndicatorsPanel
                dashboardData={dashboardData as any}
                assessmentId={assessmentId}
              />
            </div>
          )}

        {/* Assessor Feedback Notice - Shows when annotations exist outside rework */}
        {feedbackIndicators.length > 0 && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-5 w-5 text-amber-600" />
              <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                Assessor Feedback Available
              </h4>
              <span className="ml-auto text-sm text-amber-700 dark:text-amber-300">
                {feedbackIndicators.length} indicator{feedbackIndicators.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
              The assessor has provided feedback on the following indicators. Review the annotated
              MOV files to see their comments.
            </p>
            <div className="space-y-1">
              {feedbackIndicators.map((item) => (
                <button
                  key={item.indicatorId}
                  onClick={() =>
                    router.push(`/blgu/assessment/${assessmentId}/indicator/${item.indicatorId}`)
                  }
                  className="flex items-center justify-between w-full text-left px-3 py-2 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span className="text-amber-900 dark:text-amber-100 truncate">
                      {item.indicatorName}
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 flex-shrink-0">
                      {item.governanceAreaName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-amber-700 dark:text-amber-300">
                      {item.annotationCount} annotation{item.annotationCount !== 1 ? "s" : ""}
                    </span>
                    <ChevronRight className="h-4 w-4 text-amber-500" />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Completion Metrics - Only show when editable */}
        {isEditable && (
          <div data-tour="completion-metrics">
            <CompletionMetricsCard
              totalIndicators={dashboardData.total_indicators}
              completedIndicators={dashboardData.completed_indicators}
              incompleteIndicators={dashboardData.incomplete_indicators}
              completionPercentage={dashboardData.completion_percentage}
            />
          </div>
        )}

        {/* Completed Phase Summary - Show when Phase 1 is completed */}
        {phaseStatus === "completed" && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-700 dark:text-green-300 font-medium">
                Phase 1 Completed
              </span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400">
              Your initial assessment has been reviewed and approved by the assessor.
              {dashboardData.rework_count > 0 && " (1 rework cycle used)"}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {dashboardData.total_indicators}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">Total Indicators</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {dashboardData.completed_indicators}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {dashboardData.completion_percentage.toFixed(0)}%
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">Completion</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isEditable && (
          <div className="flex gap-4" data-tour="submit-button">
            {dashboardData.status === "DRAFT" && (
              <SubmitAssessmentButton
                assessmentId={assessmentId}
                isComplete={dashboardData.completion_percentage === 100}
                completedCount={dashboardData.completed_indicators}
                totalCount={dashboardData.total_indicators}
                onSuccess={onRefetch}
              />
            )}

            {(dashboardData.status === "REWORK" || dashboardData.status === "NEEDS_REWORK") &&
              !dashboardData.is_calibration_rework &&
              !isMlgooRecalibration && (
                <ResubmitAssessmentButton
                  assessmentId={assessmentId}
                  isComplete={dashboardData.completion_percentage === 100}
                  isCalibrationRework={false}
                  onSuccess={onRefetch}
                />
              )}
          </div>
        )}

        {/* Indicator Navigation - Always visible for review */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Indicators by Governance Area
            {!isEditable && (
              <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">
                (Read-only)
              </span>
            )}
          </h3>
          <IndicatorNavigationList items={navigationItems} />
        </div>
      </div>
    </PhaseCard>
  );
}
