"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { classifyError } from "@/lib/error-utils";
import { Assessment, AssessmentValidation } from "@/types/assessment";
import {
  usePostAssessmentsAssessmentIdResubmit,
  usePostAssessmentsAssessmentIdSubmit,
  usePostAssessmentsAssessmentIdSubmitForCalibration,
} from "@sinag/shared";
import {
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Send,
} from "lucide-react";

interface AssessmentHeaderProps {
  assessment: Assessment;
  validation: AssessmentValidation;
  isCalibrationRework?: boolean;
  calibrationGovernanceAreaName?: string;
  calibrationGovernanceAreaNames?: string[]; // Support multiple areas
  reworkSubmittedAt?: string | null; // When BLGU already resubmitted after rework
  calibrationSubmittedAt?: string | null; // When BLGU already resubmitted after calibration
}

export function AssessmentHeader({
  assessment,
  validation,
  isCalibrationRework = false,
  calibrationGovernanceAreaName,
  calibrationGovernanceAreaNames = [],
  reworkSubmittedAt,
  calibrationSubmittedAt,
}: AssessmentHeaderProps) {
  // Combine legacy single name with new multiple names array
  const allCalibrationAreaNames =
    calibrationGovernanceAreaNames.length > 0
      ? calibrationGovernanceAreaNames
      : calibrationGovernanceAreaName
        ? [calibrationGovernanceAreaName]
        : [];
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Use Epic 5.0 submit endpoint (POST /assessments/{id}/submit)
  const submitMutation = usePostAssessmentsAssessmentIdSubmit({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Assessment Submitted",
          description: `Your assessment was successfully submitted on ${new Date(
            data.submitted_at
          ).toLocaleString()}. It is now locked for editing.`,
          variant: "default",
        });
        // Redirect to dashboard after a short delay for toast to be visible
        setTimeout(() => {
          window.location.href = "/blgu/dashboard";
        }, 1500);
      },
      onError: (error: any) => {
        const errorInfo = classifyError(error);

        let title = "Submission Failed";
        let description = "Please try again. If the problem persists, contact your MLGOO-DILG.";

        if (errorInfo.type === "network") {
          title = "Unable to submit";
          description = "Check your internet connection and try again. Your work has been saved.";
        } else if (errorInfo.type === "auth") {
          title = "Session expired";
          description = "Please log in again to submit your assessment.";
        } else if (errorInfo.type === "validation") {
          title = "Cannot submit assessment";
          description = errorInfo.message;
        }

        toast({
          title,
          description,
          variant: "destructive",
        });
      },
    },
  });

  // Use different endpoint for resubmit during REWORK status
  const resubmitMutation = usePostAssessmentsAssessmentIdResubmit({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Assessment Resubmitted",
          description: `Your assessment was successfully resubmitted on ${new Date(
            data.resubmitted_at
          ).toLocaleString()}.`,
          variant: "default",
        });
        setTimeout(() => {
          window.location.href = "/blgu/dashboard";
        }, 1500);
      },
      onError: (error: any) => {
        const errorInfo = classifyError(error);

        let title = "Resubmission Failed";
        let description = "Please try again. If the problem persists, contact your MLGOO-DILG.";

        if (errorInfo.type === "network") {
          title = "Unable to resubmit";
          description = "Check your internet connection and try again. Your work has been saved.";
        } else if (errorInfo.type === "auth") {
          title = "Session expired";
          description = "Please log in again to resubmit your assessment.";
        } else if (errorInfo.type === "validation") {
          title = "Cannot resubmit assessment";
          description = errorInfo.message;
        }

        toast({
          title,
          description,
          variant: "destructive",
        });
      },
    },
  });

  // Use calibration-specific endpoint when submitting after Validator calibration
  const calibrationMutation = usePostAssessmentsAssessmentIdSubmitForCalibration({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Calibration Submitted",
          description: `Your calibration was successfully submitted on ${new Date(
            data.resubmitted_at
          ).toLocaleString()}.`,
          variant: "default",
        });
        setTimeout(() => {
          window.location.href = "/blgu/dashboard";
        }, 1500);
      },
      onError: (error: any) => {
        const errorInfo = classifyError(error);

        let title = "Calibration Submission Failed";
        let description = "Please try again. If the problem persists, contact your MLGOO-DILG.";

        if (errorInfo.type === "network") {
          title = "Unable to submit calibration";
          description = "Check your internet connection and try again. Your work has been saved.";
        } else if (errorInfo.type === "auth") {
          title = "Session expired";
          description = "Please log in again to submit your calibration.";
        } else if (errorInfo.type === "validation") {
          title = "Cannot submit calibration";
          description = errorInfo.message;
        }

        toast({
          title,
          description,
          variant: "destructive",
        });
      },
    },
  });

  const isReworkStatus =
    assessment.status.toLowerCase() === "rework" ||
    assessment.status.toLowerCase() === "needs-rework";

  // Check if already resubmitted (button should be locked)
  const hasAlreadyResubmitted = isCalibrationRework
    ? !!calibrationSubmittedAt
    : !!reworkSubmittedAt;

  // Check if assessment is in an editable state (can be submitted)
  const isEditableStatus =
    assessment.status.toLowerCase() === "draft" ||
    assessment.status.toLowerCase() === "rework" ||
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
          <p className="font-medium mb-2">Incomplete indicators:</p>
          <ul className="text-sm space-y-1">
            {validation.missingIndicators.slice(0, 3).map((indicator, index) => (
              <li key={index}>• {indicator}</li>
            ))}
            {validation.missingIndicators.length > 3 && (
              <li>• ... and {validation.missingIndicators.length - 3} more</li>
            )}
          </ul>
        </div>
      );
    }

    return "Please complete all indicators before submitting.";
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
                  • {new Date(assessment.createdAt).getFullYear()} Assessment
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
            </div>

            {/* Submit Button - Only show when assessment is in editable state */}
            {isEditableStatus ? (
              hasAlreadyResubmitted ? (
                // Show "Already Resubmitted" message when BLGU has already resubmitted
                <div className="h-14 px-8 flex items-center justify-center text-base font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg min-w-[200px]">
                  <CheckCircle className="h-5 w-5 mr-3" />
                  {isCalibrationRework ? "Calibration Submitted" : "Resubmitted"}
                </div>
              ) : (
                <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">
                      <Button
                        onClick={() => setShowConfirmDialog(true)}
                        disabled={
                          !validation.isComplete ||
                          submitMutation.isPending ||
                          resubmitMutation.isPending ||
                          calibrationMutation.isPending
                        }
                        className="h-14 px-8 text-base font-semibold bg-[var(--foreground)] hover:bg-[var(--foreground)]/90 text-[var(--background)] rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        {submitMutation.isPending ||
                        resubmitMutation.isPending ||
                        calibrationMutation.isPending ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5 mr-3" />
                            {isReworkStatus
                              ? isCalibrationRework
                                ? "Submit Calibration"
                                : "Resubmit"
                              : "Submit Assessment"}
                          </>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!validation.isComplete && (
                    <TooltipContent side="bottom" className="max-w-xs">
                      {getTooltipContent()}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              )
            ) : (
              <div className="h-14 px-8 flex items-center justify-center text-base font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg min-w-[200px]">
                <CheckCircle className="h-5 w-5 mr-3" />
                Submitted
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
              <span>You have {validation.missingIndicators.length} incomplete indicators.</span>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              {isReworkStatus
                ? isCalibrationRework
                  ? "Submit Calibration?"
                  : "Resubmit Assessment?"
                : "Submit Assessment for Review?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to submit this assessment? Once submitted:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Your assessment will be locked for editing</li>
                  <li>An assessor will review your submission</li>
                  <li>
                    You will only be able to edit if the assessor requests rework (one rework cycle
                    allowed)
                  </li>
                </ul>
                <div className="flex items-start gap-2 p-3 bg-muted rounded-md mt-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Please ensure all information is accurate before submitting.
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={
                submitMutation.isPending ||
                resubmitMutation.isPending ||
                calibrationMutation.isPending
              }
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
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
                  submitMutation.mutate({
                    assessmentId: parseInt(assessment.id),
                  });
                }
              }}
              disabled={
                submitMutation.isPending ||
                resubmitMutation.isPending ||
                calibrationMutation.isPending
              }
              className="bg-[var(--foreground)] hover:bg-[var(--foreground)]/90 text-[var(--background)] font-semibold shadow-md hover:shadow-lg"
            >
              {submitMutation.isPending ||
              resubmitMutation.isPending ||
              calibrationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirm Submit
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
