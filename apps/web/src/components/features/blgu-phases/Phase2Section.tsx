"use client";

/**
 * Phase2Section Component
 *
 * Displays Phase 2 (Table Validation) content within the BLGU dashboard.
 * Shows validator calibration feedback and status.
 *
 * Status Logic:
 * - Before AWAITING_FINAL_VALIDATION → "Not Started"
 * - AWAITING_FINAL_VALIDATION → "In Progress"
 * - REWORK + is_calibration_rework → "Calibration Requested" (shows feedback)
 * - COMPLETED → "Completed"
 */

import { PhaseCard, PhaseStatus } from "./PhaseCard";
import { ResubmitAssessmentButton } from "@/components/features/assessments";
import { ReworkIndicatorsPanel, AISummaryPanel } from "@/components/features/rework";
import { BLGUDashboardResponse, AISummary } from "@sinag/shared";
import { Clock, CheckCircle2, AlertCircle, FileText } from "lucide-react";

type AssessmentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "REWORK"
  | "NEEDS_REWORK"
  | "AWAITING_FINAL_VALIDATION"
  | "COMPLETED";

interface Phase2SectionProps {
  dashboardData: BLGUDashboardResponse;
  assessmentId: number;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  isFetchingDashboard: boolean;
  onRefetch: () => void;
}

function getPhase2Status(
  status: string,
  isCalibrationRework: boolean
): { phaseStatus: PhaseStatus; statusLabel: string; isActive: boolean } {
  const assessmentStatus = status as AssessmentStatus;

  // Phase 2 hasn't started yet
  if (
    assessmentStatus === "DRAFT" ||
    assessmentStatus === "SUBMITTED" ||
    assessmentStatus === "IN_REVIEW"
  ) {
    return {
      phaseStatus: "not_started",
      statusLabel: "Not Started",
      isActive: false,
    };
  }

  // Regular rework (Phase 1) - Phase 2 not started
  if (
    (assessmentStatus === "REWORK" || assessmentStatus === "NEEDS_REWORK") &&
    !isCalibrationRework
  ) {
    return {
      phaseStatus: "not_started",
      statusLabel: "Not Started",
      isActive: false,
    };
  }

  // Calibration rework (Phase 2 active)
  if (
    (assessmentStatus === "REWORK" || assessmentStatus === "NEEDS_REWORK") &&
    isCalibrationRework
  ) {
    return {
      phaseStatus: "calibration",
      statusLabel: "Calibration Requested",
      isActive: true,
    };
  }

  // Awaiting final validation (Phase 2 in progress)
  if (assessmentStatus === "AWAITING_FINAL_VALIDATION") {
    return {
      phaseStatus: "in_progress",
      statusLabel: "Under Validation",
      isActive: true,
    };
  }

  // Completed
  if (assessmentStatus === "COMPLETED") {
    return {
      phaseStatus: "completed",
      statusLabel: "Completed",
      isActive: false,
    };
  }

  return {
    phaseStatus: "not_started",
    statusLabel: "Not Started",
    isActive: false,
  };
}

export function Phase2Section({
  dashboardData,
  assessmentId,
  selectedLanguage,
  onLanguageChange,
  isFetchingDashboard,
  onRefetch,
}: Phase2SectionProps) {
  const { phaseStatus, statusLabel, isActive } = getPhase2Status(
    dashboardData.status,
    dashboardData.is_calibration_rework || false
  );

  const isCalibrationRework =
    (dashboardData.status === "REWORK" || dashboardData.status === "NEEDS_REWORK") &&
    dashboardData.is_calibration_rework;

  return (
    <PhaseCard
      title="Phase 2: Table Validation"
      phaseNumber={2}
      status={phaseStatus}
      statusLabel={statusLabel}
      isActive={isActive}
      defaultExpanded={isActive}
    >
      <div className="space-y-6">
        {/* Not Started State */}
        {phaseStatus === "not_started" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
              Table Validation Not Yet Started
            </h3>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
              This phase will begin after your initial assessment is reviewed and approved
              by the assessor. You will be notified when table validation starts.
            </p>
          </div>
        )}

        {/* In Progress State (Awaiting Final Validation) */}
        {phaseStatus === "in_progress" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
              Under Validator Review
            </h3>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
              Your assessment is currently being validated by the DILG validator team.
              This involves in-person table validation of your submitted documents.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Waiting for validator feedback
              </span>
            </div>
          </div>
        )}

        {/* Calibration Requested State */}
        {isCalibrationRework && (
          <>
            {/* Calibration Header */}
            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-purple-800 dark:text-purple-200">
                    Calibration Requested
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    The validator has requested calibration for{" "}
                    <strong>{dashboardData.calibration_governance_area_name}</strong>.
                    Please review the feedback below and make the necessary corrections.
                  </p>
                </div>
              </div>
            </div>

            {/* AI Summary Panel for Calibration */}
            {dashboardData.ai_summary && (
              <AISummaryPanel
                summary={dashboardData.ai_summary as AISummary}
                availableLanguages={dashboardData.ai_summary_available_languages || ["ceb", "en"]}
                currentLanguage={selectedLanguage}
                onLanguageChange={onLanguageChange}
                isLoading={isFetchingDashboard}
              />
            )}

            {/* Rework Indicators Panel */}
            {(dashboardData.rework_comments || dashboardData.mov_annotations_by_indicator) && (
              <ReworkIndicatorsPanel
                dashboardData={dashboardData as any}
                assessmentId={assessmentId}
              />
            )}

            {/* Submit for Calibration Button */}
            <div className="flex gap-4">
              <ResubmitAssessmentButton
                assessmentId={assessmentId}
                isComplete={dashboardData.completion_percentage === 100}
                isCalibrationRework={true}
                onSuccess={onRefetch}
              />
            </div>
          </>
        )}

        {/* Completed State */}
        {phaseStatus === "completed" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
              Table Validation Completed
            </h3>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
              Your assessment has been validated by the DILG validator team.
              View your SGLGB result in the Verdict section below.
            </p>
          </div>
        )}
      </div>
    </PhaseCard>
  );
}
