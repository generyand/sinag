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

import { PhaseCard, PhaseStatus } from "./PhaseCard";
import {
  CompletionMetricsCard,
  IndicatorNavigationList,
} from "@/components/features/dashboard";
import {
  SubmitAssessmentButton,
  ResubmitAssessmentButton,
} from "@/components/features/assessments";
import { ReworkIndicatorsPanel, AISummaryPanel } from "@/components/features/rework";
import { BLGUDashboardResponse, AISummary } from "@sinag/shared";

type AssessmentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "REWORK"
  | "NEEDS_REWORK"
  | "AWAITING_FINAL_VALIDATION"
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
  isCalibrationRework: boolean
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
        statusLabel: "Under Review",
        isActive: true,
      };
    case "REWORK":
    case "NEEDS_REWORK":
      if (isCalibrationRework) {
        // Calibration rework belongs to Phase 2
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
  const { phaseStatus, statusLabel, isActive } = getPhase1Status(
    dashboardData.status,
    dashboardData.is_calibration_rework || false
  );

  const isEditable =
    dashboardData.status === "DRAFT" ||
    ((dashboardData.status === "REWORK" || dashboardData.status === "NEEDS_REWORK") &&
      !dashboardData.is_calibration_rework);

  const showReworkFeedback =
    (dashboardData.status === "REWORK" || dashboardData.status === "NEEDS_REWORK") &&
    !dashboardData.is_calibration_rework;

  // Build navigation items
  const navigationItems = dashboardData.governance_areas.flatMap((area) =>
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
  );

  return (
    <PhaseCard
      title="Phase 1: Initial Assessment"
      phaseNumber={1}
      status={phaseStatus}
      statusLabel={statusLabel}
      isActive={isActive}
      defaultExpanded={isActive}
    >
      <div className="space-y-6">
        {/* AI Summary Panel - Shows AI-generated guidance for rework */}
        {showReworkFeedback && dashboardData.ai_summary && (
          <AISummaryPanel
            summary={dashboardData.ai_summary as AISummary}
            availableLanguages={dashboardData.ai_summary_available_languages || ["ceb", "en"]}
            currentLanguage={selectedLanguage}
            onLanguageChange={onLanguageChange}
            isLoading={isFetchingDashboard}
          />
        )}

        {/* Rework Indicators Panel - Shows failed indicators grouped by area */}
        {showReworkFeedback &&
          (dashboardData.rework_comments || dashboardData.mov_annotations_by_indicator) && (
            <ReworkIndicatorsPanel
              dashboardData={dashboardData as any}
              assessmentId={assessmentId}
            />
          )}

        {/* Completion Metrics - Only show when editable */}
        {isEditable && (
          <CompletionMetricsCard
            totalIndicators={dashboardData.total_indicators}
            completedIndicators={dashboardData.completed_indicators}
            incompleteIndicators={dashboardData.incomplete_indicators}
            completionPercentage={dashboardData.completion_percentage}
          />
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
                <div className="text-xs text-green-600 dark:text-green-400">
                  Total Indicators
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {dashboardData.completed_indicators}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  Completed
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {dashboardData.completion_percentage.toFixed(0)}%
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  Completion
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isEditable && (
          <div className="flex gap-4">
            {dashboardData.status === "DRAFT" && (
              <SubmitAssessmentButton
                assessmentId={assessmentId}
                isComplete={dashboardData.completion_percentage === 100}
                onSuccess={onRefetch}
              />
            )}

            {(dashboardData.status === "REWORK" || dashboardData.status === "NEEDS_REWORK") &&
              !dashboardData.is_calibration_rework && (
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
