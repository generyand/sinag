"use client";

/**
 * VerdictSection Component
 *
 * Displays the SGLGB Result (Verdict) within the BLGU dashboard.
 * Shows the final compliance status, area results breakdown, and AI recommendations.
 *
 * Status Logic:
 * - Not COMPLETED → "Pending" (show placeholder)
 * - COMPLETED → "Available" (show results)
 *
 * IMPORTANT: This component shows compliance data ONLY after assessment is COMPLETED.
 * During earlier phases, BLGU users never see Pass/Fail status.
 */

import { PhaseCard, PhaseStatus } from "./PhaseCard";
import { BBIComplianceCard, BBIComplianceData } from "./BBIComplianceCard";
import { BLGUDashboardResponse } from "@sinag/shared";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { ReworkIndicatorsPanel, AISummaryPanel } from "@/components/features/rework";
import { ResubmitAssessmentButton } from "@/components/features/assessments";
import { AISummary } from "@sinag/shared";

interface VerdictSectionProps {
  dashboardData: BLGUDashboardResponse;
  assessmentId: number;
  selectedLanguage?: string;
  onLanguageChange?: (lang: string) => void;
  isFetchingDashboard?: boolean;
  onRefetch?: () => void;
}

function getVerdictStatus(
  status: string,
  isMlgooRecalibration: boolean
): {
  phaseStatus: PhaseStatus;
  statusLabel: string;
  isActive: boolean;
  pendingMessage: string;
} {
  if (status === "COMPLETED") {
    return {
      phaseStatus: "available",
      statusLabel: "Available",
      isActive: true,
      pendingMessage: "",
    };
  }

  // MLGOO RE-calibration: Show recalibration state (this is the active phase)
  if (
    isMlgooRecalibration &&
    (status === "REWORK" || status === "NEEDS_REWORK")
  ) {
    return {
      phaseStatus: "calibration",
      statusLabel: "RE-Calibration Requested",
      isActive: true,
      pendingMessage: "",
    };
  }

  if (status === "AWAITING_MLGOO_APPROVAL") {
    return {
      phaseStatus: "pending",
      statusLabel: "Awaiting MLGOO Approval",
      isActive: false,
      pendingMessage: "Your assessment has been validated and is now awaiting final approval from the MLGOO Chairman.",
    };
  }

  return {
    phaseStatus: "pending",
    statusLabel: "Pending",
    isActive: false,
    pendingMessage: "Your SGLGB classification result will be available after the table validation is completed by the DILG validator team.",
  };
}

// Type for area results (from classification)
interface AreaResult {
  area_id: number;
  area_name: string;
  area_type: "Core" | "Essential";
  passed: boolean;
  total_indicators: number;
  passed_indicators: number;
  failed_indicators: number;
}

// Type for AI recommendations (CapDev)
interface AIRecommendation {
  governance_area: string;
  recommendations: string[];
  priority: "high" | "medium" | "low";
}

export function VerdictSection({
  dashboardData,
  assessmentId,
  selectedLanguage = "ceb",
  onLanguageChange,
  isFetchingDashboard = false,
  onRefetch,
}: VerdictSectionProps) {
  // Check for MLGOO RE-calibration (distinct from validator calibration)
  const isMlgooRecalibration = (dashboardData as any).is_mlgoo_recalibration === true;
  const mlgooRecalibrationComments = (dashboardData as any).mlgoo_recalibration_comments;

  const { phaseStatus, statusLabel, isActive, pendingMessage } = getVerdictStatus(
    dashboardData.status,
    isMlgooRecalibration
  );

  // Extract verdict data (will be added to schema)
  const finalComplianceStatus = (dashboardData as any).final_compliance_status;
  const areaResults: AreaResult[] = (dashboardData as any).area_results || [];
  const aiRecommendations: AIRecommendation[] =
    (dashboardData as any).ai_recommendations?.recommendations || [];

  // Extract BBI compliance data (DILG MC 2024-417)
  const bbiComplianceData: BBIComplianceData | undefined = (dashboardData as any).bbi_compliance;

  // ComplianceStatus enum values are uppercase: "PASSED" or "FAILED"
  const isPassed = finalComplianceStatus === "PASSED";

  return (
    <PhaseCard
      title="Verdict: SGLGB Result"
      phaseNumber={3}
      status={phaseStatus}
      statusLabel={statusLabel}
      isActive={isActive}
      defaultExpanded={isActive}
    >
      <div className="space-y-6">
        {/* MLGOO RE-Calibration State */}
        {phaseStatus === "calibration" && isMlgooRecalibration && (
          <>
            {/* MLGOO RE-Calibration Header */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-200">
                    MLGOO RE-Calibration Requested
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    The MLGOO Chairman has requested re-calibration for specific indicators.
                    Please review the feedback below and make the necessary corrections.
                  </p>
                  {mlgooRecalibrationComments && (
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-amber-200 dark:border-amber-700">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                        MLGOO Comments:
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 whitespace-pre-wrap">
                        {mlgooRecalibrationComments}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Summary Panel for MLGOO RE-calibration */}
            {dashboardData.ai_summary && onLanguageChange && (
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

            {/* Submit for MLGOO RE-calibration Button */}
            {onRefetch && (
              <div className="flex gap-4">
                <ResubmitAssessmentButton
                  assessmentId={assessmentId}
                  isComplete={dashboardData.completion_percentage === 100}
                  isCalibrationRework={false}
                  isMlgooRecalibration={true}
                  onSuccess={onRefetch}
                />
              </div>
            )}
          </>
        )}

        {/* Pending State */}
        {phaseStatus === "pending" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
              {dashboardData.status === "AWAITING_MLGOO_APPROVAL"
                ? "Awaiting MLGOO Approval"
                : "SGLGB Result Pending"}
            </h3>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
              {pendingMessage}
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Passed</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Failed</span>
              </div>
            </div>
          </div>
        )}

        {/* Available State - Show Results */}
        {phaseStatus === "available" && (
          <>
            {/* Main Result Banner */}
            <div
              className={`rounded-lg p-6 text-center ${
                isPassed
                  ? "bg-green-100 dark:bg-green-900/30 border-2 border-green-500"
                  : "bg-red-100 dark:bg-red-900/30 border-2 border-red-500"
              }`}
            >
              <div className="flex justify-center mb-4">
                {isPassed ? (
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                    <Award className="w-10 h-10 text-white" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-white" />
                  </div>
                )}
              </div>
              <h2
                className={`text-2xl font-bold mb-2 ${
                  isPassed
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {isPassed
                  ? "Congratulations! SGLGB Passed"
                  : "SGLGB Not Achieved"}
              </h2>
              <p
                className={`text-sm ${
                  isPassed
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                }`}
              >
                {isPassed
                  ? "Your barangay has successfully met the requirements for the Seal of Good Local Governance for Barangays."
                  : "Your barangay did not meet all requirements. Review the area results below and the recommendations to improve."}
              </p>
            </div>

            {/* Area Results Breakdown */}
            {areaResults.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Governance Area Results
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {areaResults.map((area) => (
                    <div
                      key={area.area_id}
                      className={`rounded-lg border p-4 ${
                        area.passed
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              area.area_type === "Core"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            }`}
                          >
                            {area.area_type}
                          </span>
                          <h4 className="font-medium text-[var(--foreground)] mt-1">
                            {area.area_name}
                          </h4>
                        </div>
                        {area.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-600 dark:text-green-400">
                          {area.passed_indicators} passed
                        </span>
                        <span className="text-red-600 dark:text-red-400">
                          {area.failed_indicators} failed
                        </span>
                        <span className="text-[var(--text-secondary)]">
                          / {area.total_indicators} total
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BBI Compliance Results (DILG MC 2024-417) */}
            <BBIComplianceCard data={bbiComplianceData} />

            {/* AI Recommendations (CapDev) */}
            {aiRecommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Capacity Development Recommendations
                </h3>
                <div className="space-y-4">
                  {aiRecommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-yellow-800 dark:text-yellow-200">
                          {rec.governance_area}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            rec.priority === "high"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : rec.priority === "medium"
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {rec.priority} priority
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {rec.recommendations.map((item, i) => (
                          <li
                            key={i}
                            className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2"
                          >
                            <span className="text-yellow-500 mt-1">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Area Results - Basic Message */}
            {areaResults.length === 0 && (
              <div className="text-center py-4">
                <p className="text-[var(--text-secondary)]">
                  Detailed area results will be available soon.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </PhaseCard>
  );
}
