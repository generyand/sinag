/**
 * ResubmitAssessmentButton Component (Epic 5.0 - Story 5.16)
 *
 * BLGU-only button for resubmitting an assessment after rework or calibration.
 * Features:
 * - Only for assessments in REWORK status
 * - Uses same validation logic as initial submission
 * - Confirmation dialog with final submission warning
 * - Disabled if assessment is incomplete
 * - Success/error toast notifications
 * - Supports CALIBRATION mode (Phase 2 Validator workflow)
 *
 * Props:
 * - assessmentId: ID of the assessment to resubmit
 * - isComplete: Whether the assessment is complete (100%)
 * - isCalibrationRework: If true, submits to Validator instead of Assessor
 * - onSuccess: Callback function after successful resubmission
 */

"use client";

import { useState } from "react";
import { Loader2, AlertCircle, AlertTriangle, CheckCircle2, RotateCcw, RefreshCw } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  usePostAssessmentsAssessmentIdResubmit,
  usePostAssessmentsAssessmentIdSubmitForCalibration,
} from "@sinag/shared";

interface ResubmitAssessmentButtonProps {
  assessmentId: number;
  isComplete: boolean;
  isCalibrationRework?: boolean; // If true, submits to Validator instead of Assessor
  isMlgooRecalibration?: boolean; // If true, submits back to MLGOO (uses regular resubmit endpoint which auto-routes)
  onSuccess?: () => void;
}

export function ResubmitAssessmentButton({
  assessmentId,
  isComplete,
  isCalibrationRework = false,
  isMlgooRecalibration = false,
  onSuccess,
}: ResubmitAssessmentButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  // Epic 5.0 mutation hook for regular resubmit (to Assessor)
  const { mutate: resubmitAssessment, isPending: isResubmitPending } = usePostAssessmentsAssessmentIdResubmit({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Assessment Resubmitted",
          description: `Your assessment was successfully resubmitted on ${new Date(
            data.resubmitted_at
          ).toLocaleString()}. This is your final submission.`,
          variant: "default",
        });

        // Close dialog and call success callback
        setShowConfirmDialog(false);
        onSuccess?.();
      },
      onError: (error: any) => {
        const rawError =
          error?.response?.data?.detail || error?.message || "Failed to resubmit assessment";
        const errorMessage = typeof rawError === 'object'
          ? rawError.message || JSON.stringify(rawError)
          : rawError;

        toast({
          title: "Resubmission Failed",
          description: String(errorMessage),
          variant: "destructive",
        });

        // Close dialog on error
        setShowConfirmDialog(false);
      },
    },
  });

  // Calibration submit mutation hook (to Validator)
  const { mutate: submitForCalibration, isPending: isCalibrationPending } = usePostAssessmentsAssessmentIdSubmitForCalibration({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Submitted for Calibration Review",
          description: `Your assessment was submitted for calibration review on ${new Date(
            data.resubmitted_at
          ).toLocaleString()}. The Validator will review your updates.`,
          variant: "default",
        });

        // Close dialog and call success callback
        setShowConfirmDialog(false);
        onSuccess?.();
      },
      onError: (error: any) => {
        const rawError =
          error?.response?.data?.detail || error?.message || "Failed to submit for calibration";
        const errorMessage = typeof rawError === 'object'
          ? rawError.message || JSON.stringify(rawError)
          : rawError;

        toast({
          title: "Calibration Submission Failed",
          description: String(errorMessage),
          variant: "destructive",
        });

        // Close dialog on error
        setShowConfirmDialog(false);
      },
    },
  });

  const isPending = isCalibrationRework ? isCalibrationPending : isResubmitPending;

  const handleResubmitClick = () => {
    // Only show dialog if assessment is complete
    if (isComplete) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmResubmit = () => {
    if (isCalibrationRework) {
      submitForCalibration({ assessmentId });
    } else {
      resubmitAssessment({ assessmentId });
    }
  };

  const isButtonDisabled = !isComplete || isPending;

  // Different button text and styling based on mode (calibration vs MLGOO vs regular)
  const buttonText = isMlgooRecalibration
    ? "Submit for MLGOO Review"
    : isCalibrationRework
    ? "Submit for Calibration"
    : "Resubmit Assessment";
  const loadingText = isMlgooRecalibration
    ? "Submitting to MLGOO..."
    : isCalibrationRework
    ? "Submitting..."
    : "Resubmitting...";
  const ButtonIcon = isCalibrationRework || isMlgooRecalibration ? RefreshCw : RotateCcw;

  const button = (
    <Button
      onClick={handleResubmitClick}
      disabled={isButtonDisabled}
      size="lg"
      className="w-full sm:w-auto bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow)]/90 text-gray-900 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          <ButtonIcon className="mr-2 h-4 w-4" />
          {buttonText}
        </>
      )}
    </Button>
  );

  // Wrap button in tooltip if disabled due to incomplete assessment
  if (!isComplete && !isPending) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              {isMlgooRecalibration
                ? "Complete all MLGOO re-calibration requirements before submitting"
                : isCalibrationRework
                ? "Complete all calibration requirements before submitting"
                : "Complete all rework requirements before resubmitting"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Different dialog content based on mode
  const dialogTitle = isMlgooRecalibration
    ? "Submit for MLGOO Review?"
    : isCalibrationRework
    ? "Submit for Calibration Review?"
    : "Resubmit Assessment?";
  const dialogDescription = isMlgooRecalibration
    ? "Are you sure you want to submit this assessment for MLGOO re-calibration review?"
    : isCalibrationRework
    ? "Are you sure you want to submit this assessment for calibration review?"
    : "Are you sure you want to resubmit this assessment?";

  return (
    <>
      {button}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ButtonIcon className="h-5 w-5" />
              {dialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">{dialogDescription}</p>

                {isMlgooRecalibration ? (
                  // MLGOO RE-calibration content
                  <>
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                      <div className="text-xs space-y-1">
                        <span className="font-semibold text-amber-700 dark:text-amber-400 block">
                          MLGOO Re-Calibration Review
                        </span>
                        <span className="text-amber-600 dark:text-amber-300 block">
                          Your submission will be sent to the <strong>MLGOO Chairman</strong> for final review.
                          Only the specific indicators selected for re-calibration will be reviewed.
                        </span>
                      </div>
                    </div>

                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Your assessment will be locked for editing</li>
                      <li>The MLGOO Chairman will review your updates</li>
                      <li>Once approved, your final verdict will be determined</li>
                    </ul>
                  </>
                ) : isCalibrationRework ? (
                  // Calibration-specific content
                  <>
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-900">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                      <div className="text-xs space-y-1">
                        <span className="font-semibold text-blue-700 dark:text-blue-400 block">
                          Calibration Review
                        </span>
                        <span className="text-blue-600 dark:text-blue-300 block">
                          Your submission will be sent directly to the <strong>Validator</strong> who requested
                          calibration. Only the indicators marked for calibration will be reviewed.
                        </span>
                      </div>
                    </div>

                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Your assessment will be locked for editing</li>
                      <li>The Validator will review your updated indicators</li>
                      <li>Unchanged indicators will retain their status</li>
                    </ul>
                  </>
                ) : (
                  // Regular resubmit content
                  <>
                    <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-200 dark:border-orange-900">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-600" />
                      <div className="text-xs space-y-1">
                        <span className="font-semibold text-orange-700 dark:text-orange-400 block">
                          Final Submission Warning
                        </span>
                        <span className="text-orange-600 dark:text-orange-300 block">
                          This is your <strong>final submission</strong>. You have already used your one rework cycle.
                          No further changes will be allowed after resubmission.
                        </span>
                      </div>
                    </div>

                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Your assessment will be locked for editing</li>
                      <li>An assessor will review your resubmission</li>
                      <li>No additional rework requests are possible</li>
                    </ul>
                  </>
                )}

                <div className="flex items-start gap-2 p-3 bg-muted rounded-md mt-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {isMlgooRecalibration
                      ? "Please ensure all MLGOO re-calibration requirements have been addressed and all information is accurate."
                      : isCalibrationRework
                      ? "Please ensure all calibration requirements have been addressed and all information is accurate."
                      : "Please ensure all rework requirements have been addressed and all information is accurate."}
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmResubmit}
              disabled={isPending}
              className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow)]/90 text-gray-900 font-semibold shadow-md hover:shadow-lg"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {loadingText}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {isMlgooRecalibration || isCalibrationRework ? "Confirm Submit" : "Confirm Resubmit"}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
