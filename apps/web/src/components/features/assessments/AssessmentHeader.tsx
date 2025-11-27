"use client";

import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSubmitAssessment } from "@/hooks/useAssessment";
import { Assessment, AssessmentValidation } from "@/types/assessment";
import {
    usePostAssessmentsAssessmentIdResubmit,
    usePostAssessmentsAssessmentIdSubmitForCalibration,
} from "@sinag/shared";
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Info,
    Send
} from "lucide-react";

interface AssessmentHeaderProps {
  assessment: Assessment;
  validation: AssessmentValidation;
  isCalibrationRework?: boolean;
  calibrationGovernanceAreaName?: string;
}

export function AssessmentHeader({
  assessment,
  validation,
  isCalibrationRework = false,
  calibrationGovernanceAreaName,
}: AssessmentHeaderProps) {
  const submitMutation = useSubmitAssessment();

  // Use different endpoint for resubmit during REWORK status
  const resubmitMutation = usePostAssessmentsAssessmentIdResubmit({
    mutation: {
      onSuccess: () => {
        window.alert("Assessment resubmitted successfully. Redirecting to dashboard.");
        window.location.href = "/blgu/dashboard";
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.detail || error?.message || "Failed to resubmit";
        window.alert(`Resubmission failed: ${errorMessage}`);
      },
    },
  });

  // Use calibration-specific endpoint when submitting after Validator calibration
  const calibrationMutation = usePostAssessmentsAssessmentIdSubmitForCalibration({
    mutation: {
      onSuccess: () => {
        window.alert("Calibration submitted successfully. Redirecting to dashboard.");
        window.location.href = "/blgu/dashboard";
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.detail || error?.message || "Failed to submit calibration";
        window.alert(`Calibration submission failed: ${errorMessage}`);
      },
    },
  });

  const isReworkStatus = assessment.status.toLowerCase() === "rework" ||
                         assessment.status.toLowerCase() === "needs-rework";

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

  const getTooltipContent = () => {
    if (validation.missingIndicators.length > 0) {
      return (
        <div>
          <p className="font-medium mb-2">Missing indicator responses:</p>
          <ul className="text-sm space-y-1">
            {validation.missingIndicators
              .slice(0, 3)
              .map((indicator, index) => (
                <li key={index}>• {indicator}</li>
              ))}
            {validation.missingIndicators.length > 3 && (
              <li>• ... and {validation.missingIndicators.length - 3} more</li>
            )}
          </ul>
        </div>
      );
    }

    if (validation.missingMOVs.length > 0) {
      return (
        <div>
          <p className="font-medium mb-2">Missing MOV files:</p>
          <ul className="text-sm space-y-1">
            {validation.missingMOVs.slice(0, 3).map((indicator, index) => (
              <li key={index}>• {indicator}</li>
            ))}
            {validation.missingMOVs.length > 3 && (
              <li>• ... and {validation.missingMOVs.length - 3} more</li>
            )}
          </ul>
        </div>
      );
    }

    return "Please complete all indicators and upload required MOVs before submitting.";
  };

  const progressPercentage = Math.round(
    (assessment.completedIndicators / assessment.totalIndicators) * 100
  );

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
        {isCalibrationRework && calibrationGovernanceAreaName && (
          <div className="mb-8 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-800 dark:text-orange-300">
                  Calibration Required - {calibrationGovernanceAreaName}
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                  The Validator has requested calibration for indicators in <strong>{calibrationGovernanceAreaName}</strong>.
                  Please review and update the affected indicators, then submit for calibration review.
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
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${statusConfig.badgeClass}`}>
                  <span className={statusConfig.iconColor}>{getStatusIcon()}</span>
                  {getStatusText()}
                </div>
                <span className="text-sm text-[var(--text-secondary)]">
                  • {assessment.year} Assessment
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight leading-tight">
                SGLGB Pre-Assessment for{" "}
                <span className="text-[var(--cityscape-yellow-dark)]">
                  {assessment.barangayName}
                </span>
              </h1>
              <p className="mt-2 text-lg text-[var(--text-secondary)]">
                Manage and complete your SGLGB assessment indicators and requirements.
              </p>
            </div>
          </div>

          {/* Right side - Stats and Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 xl:pl-8 xl:border-l border-[var(--border)]">
            {/* Progress Stats */}
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--foreground)] tabular-nums">
                  {assessment.completedIndicators}
                  <span className="text-lg text-[var(--text-secondary)] font-medium">/{assessment.totalIndicators}</span>
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
            </div>

            {/* Submit Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => {
                      if (isReworkStatus) {
                        if (isCalibrationRework) {
                          calibrationMutation.mutate({
                            assessmentId: parseInt(assessment.id),
                          });
                        } else {
                          resubmitMutation.mutate({
                            assessmentId: parseInt(assessment.id),
                          });
                        }
                      } else {
                        submitMutation.mutate(undefined, {
                          onSuccess: (result: any) => {
                            if (result?.is_valid) {
                              window.alert(
                                "Assessment submitted successfully. Redirecting to dashboard."
                              );
                              window.location.href = "/blgu/dashboard";
                            } else if (Array.isArray(result?.errors)) {
                              const details = result.errors
                                .map((e: any) =>
                                  [e.indicator_name, e.error]
                                    .filter(Boolean)
                                    .join(": ")
                                )
                                .join("\n");
                              window.alert(
                                `Submission failed due to the following issues:\n${details}`
                              );
                            }
                          },
                        });
                      }
                    }}
                    disabled={
                      !validation.canSubmit ||
                      submitMutation.isPending ||
                      resubmitMutation.isPending ||
                      calibrationMutation.isPending
                    }
                    className="h-14 px-8 text-base font-semibold bg-[var(--foreground)] hover:bg-[var(--foreground)]/90 text-[var(--background)] rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 min-w-[200px]"
                  >
                    {submitMutation.isPending || resubmitMutation.isPending || calibrationMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-3" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-3" />
                        {isReworkStatus
                          ? (isCalibrationRework ? "Submit Calibration" : "Resubmit")
                          : "Submit Assessment"}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                {!validation.canSubmit && (
                  <TooltipContent
                    side="bottom"
                    className="max-w-sm bg-[var(--card)]/95 backdrop-blur-sm border border-[var(--border)] shadow-xl p-4"
                  >
                    {getTooltipContent()}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
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
          {!validation.canSubmit &&
            (validation.missingIndicators.length > 0 ||
              validation.missingMOVs.length > 0) && (
              <div className="mt-4 flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-100">
                <Info className="h-5 w-5 flex-shrink-0" />
                <span>
                  You have {validation.missingIndicators.length} missing responses and {validation.missingMOVs.length} missing required files.
                </span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
