"use client";

import { AreaStatusType, Assessment, AssessmentValidation } from "@/types/assessment";
import { AlertCircle, CheckCircle, Clock, Info, Send } from "lucide-react";

interface AreaSubmissionStatusData {
  area_submission_status: Record<string, { status: AreaStatusType } | unknown>;
  area_assessor_approved: Record<string, boolean>;
  all_areas_approved: boolean;
}

interface AssessmentHeaderProps {
  assessment: Assessment;
  validation: AssessmentValidation;
  isCalibrationRework?: boolean;
  calibrationGovernanceAreaName?: string;
  calibrationGovernanceAreaNames?: string[];
  areaStatusData?: AreaSubmissionStatusData | null;
}

export function AssessmentHeader({
  assessment,
  validation,
  isCalibrationRework = false,
  calibrationGovernanceAreaName,
  calibrationGovernanceAreaNames = [],
  areaStatusData,
}: AssessmentHeaderProps) {
  // Combine legacy single name with new multiple names array
  const allCalibrationAreaNames =
    calibrationGovernanceAreaNames.length > 0
      ? calibrationGovernanceAreaNames
      : calibrationGovernanceAreaName
        ? [calibrationGovernanceAreaName]
        : [];

  const getStatusIcon = () => {
    switch (assessment.status.toLowerCase()) {
      case "draft":
        return <Clock className="h-4 w-4" />;
      case "rework":
      case "needs-rework":
        return <AlertCircle className="h-4 w-4" />;
      case "submitted":
      case "submitted-for-review":
      case "submitted_for_review":
      case "awaiting_final_validation":
      case "awaiting-final-validation":
        return <Clock className="h-4 w-4" />;
      case "validated":
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (assessment.status.toLowerCase()) {
      case "draft":
        return "In Progress";
      case "rework":
      case "needs-rework":
        return isCalibrationRework ? "Calibration in Progress" : "Rework in Progress";
      case "submitted":
      case "submitted-for-review":
      case "submitted_for_review":
        return "Submitted for Review";
      case "awaiting_final_validation":
      case "awaiting-final-validation":
        return "Awaiting Final Validation";
      case "validated":
        return "Validated";
      case "completed":
        return "Completed";
      default:
        return "Unknown";
    }
  };

  const progressPercentage = Math.round(
    (assessment.completedIndicators / assessment.totalIndicators) * 100
  );

  // Count submitted/approved areas from area status data
  const getAreasSubmittedCount = () => {
    if (!areaStatusData?.area_submission_status) return 0;
    let count = 0;
    for (const [, status] of Object.entries(areaStatusData.area_submission_status)) {
      if (status && typeof status === "object" && "status" in status) {
        const areaStatus = (status as { status: AreaStatusType }).status;
        if (areaStatus === "submitted" || areaStatus === "in_review" || areaStatus === "approved") {
          count++;
        }
      }
    }
    return count;
  };

  const getAreasApprovedCount = () => {
    if (!areaStatusData?.area_assessor_approved) return 0;
    return Object.values(areaStatusData.area_assessor_approved).filter(Boolean).length;
  };

  const areasSubmitted = getAreasSubmittedCount();
  const areasApproved = getAreasApprovedCount();
  const totalAreas = 6;

  const getStatusConfig = () => {
    switch (assessment.status.toLowerCase()) {
      case "draft":
        return {
          badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
          iconColor: "text-blue-600",
        };
      case "rework":
      case "needs-rework":
        return {
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
          iconColor: "text-amber-600",
        };
      case "submitted-for-review":
        return {
          badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
          iconColor: "text-purple-600",
        };
      case "validated":
        return {
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
          iconColor: "text-emerald-600",
        };
      default:
        return {
          badgeClass: "bg-gray-50 text-gray-700 border-gray-200",
          iconColor: "text-gray-600",
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="relative overflow-hidden bg-[var(--card)] border-b border-[var(--border)]">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--cityscape-yellow)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <div className="relative z-10 max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Calibration Notice Banner */}
        {isCalibrationRework && allCalibrationAreaNames.length > 0 && (
          <div className="mb-8 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-800 dark:text-orange-300">
                  Calibration Required - {allCalibrationAreaNames.join(", ")}
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                  {allCalibrationAreaNames.length > 1 ? (
                    <>
                      Validators have requested calibration for indicators in{" "}
                      <strong>{allCalibrationAreaNames.join(", ")}</strong>.
                    </>
                  ) : (
                    <>
                      The Validator has requested calibration for indicators in{" "}
                      <strong>{allCalibrationAreaNames[0]}</strong>.
                    </>
                  )}{" "}
                  Please review and update the affected indicators, then submit for calibration
                  review.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-8">
          {/* Left side - Title and Status */}
          <div className="space-y-6 max-w-3xl">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${statusConfig.badgeClass}`}
                >
                  <span className={statusConfig.iconColor}>{getStatusIcon()}</span>
                  {getStatusText()}
                </div>
                <span className="text-sm text-[var(--text-secondary)]">
                  * {new Date(assessment.createdAt).getFullYear()} Assessment
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight leading-tight">
                SGLGB Pre-Assessment for{" "}
                <span className="text-[var(--cityscape-yellow-dark)]">
                  {assessment.barangayName}
                </span>
              </h1>
              <p className="mt-2 text-lg text-[var(--text-secondary)]">
                Complete each governance area and submit it individually for review.
              </p>
            </div>
          </div>

          {/* Right side - Stats */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 xl:pl-8 xl:border-l border-[var(--border)]">
            {/* Progress Stats */}
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--foreground)] tabular-nums">
                  {assessment.completedIndicators}
                  <span className="text-lg text-[var(--text-secondary)] font-medium">
                    /{assessment.totalIndicators}
                  </span>
                </div>
                <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mt-1">
                  Indicators
                </div>
              </div>

              <div className="w-px h-12 bg-[var(--border)]"></div>

              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--cityscape-yellow-dark)] tabular-nums">
                  {progressPercentage}%
                </div>
                <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mt-1">
                  Completion
                </div>
              </div>

              {/* Areas Submitted Counter */}
              {areaStatusData && (
                <>
                  <div className="w-px h-12 bg-[var(--border)]"></div>
                  <div className="text-center">
                    <div className="text-3xl font-bold tabular-nums">
                      <span
                        className={
                          areasApproved === totalAreas
                            ? "text-green-600"
                            : areasSubmitted > 0
                              ? "text-purple-600"
                              : "text-[var(--foreground)]"
                        }
                      >
                        {areasApproved > 0 ? areasApproved : areasSubmitted}
                      </span>
                      <span className="text-lg text-[var(--text-secondary)] font-medium">
                        /{totalAreas}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mt-1">
                      {areasApproved > 0 ? "Areas Approved" : "Areas Submitted"}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Status Summary Badge */}
            {areaStatusData && areasApproved === totalAreas && (
              <div className="h-14 px-8 flex items-center justify-center text-base font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg min-w-[200px]">
                <CheckCircle className="h-5 w-5 mr-3" />
                All Areas Approved
              </div>
            )}

            {areaStatusData && areasSubmitted === totalAreas && areasApproved < totalAreas && (
              <div className="h-14 px-8 flex items-center justify-center text-base font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg min-w-[200px]">
                <Send className="h-5 w-5 mr-3" />
                All Areas Submitted
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-10">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-[var(--foreground)]">Overall Progress</span>
            <span className="text-[var(--text-secondary)]">{progressPercentage}% Complete</span>
          </div>
          <div className="w-full bg-[var(--border)] rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Validation Info */}
          {!validation.isComplete && validation.missingIndicators.length > 0 && (
            <div className="mt-4 flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-100">
              <Info className="h-5 w-5 flex-shrink-0" />
              <span>
                You have {validation.missingIndicators.length} incomplete indicators. Complete each
                governance area to enable its submit button.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
