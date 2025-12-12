/**
 * SubmitAssessmentButton Component (Epic 5.0 - Story 5.12)
 *
 * Handles assessment submission with confirmation dialog.
 * - Integrates usePostAssessmentsAssessmentIdSubmit mutation hook
 * - Shows confirmation dialog before submission
 * - Shows warning dialog if assessment is incomplete (allows submission anyway)
 * - Displays loading state during submission
 * - Handles success and error states
 *
 * Props:
 * - assessmentId: ID of the assessment to submit
 * - isComplete: Whether the assessment is complete (100%)
 * - completedCount: Number of completed indicators (optional, for warning message)
 * - totalCount: Total number of indicators (optional, for warning message)
 * - onSuccess: Callback function after successful submission
 */

"use client";

import { useState } from "react";
import { Loader2, Send, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { usePostAssessmentsAssessmentIdSubmit } from "@sinag/shared";
import type { SubmissionValidationResult } from "@sinag/shared";
import { classifyError } from "@/lib/error-utils";

interface SubmitAssessmentButtonProps {
  assessmentId: number;
  isComplete: boolean;
  completedCount?: number;
  totalCount?: number;
  assessmentStatus?: string;
  onSuccess?: () => void;
}

export function SubmitAssessmentButton({
  assessmentId,
  isComplete,
  completedCount,
  totalCount,
  assessmentStatus,
  onSuccess,
}: SubmitAssessmentButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  // Calculate incomplete count for warning message
  const incompleteCount =
    completedCount !== undefined && totalCount !== undefined
      ? totalCount - completedCount
      : undefined;

  // Epic 5.0 mutation hook for submitting assessment
  const { mutate: submitAssessment, isPending } = usePostAssessmentsAssessmentIdSubmit({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Assessment Submitted",
          description: `Your assessment was successfully submitted on ${new Date(
            data.submitted_at
          ).toLocaleString()}. It is now locked for editing.`,
          variant: "default",
        });

        // Close dialog and call success callback
        setShowConfirmDialog(false);
        onSuccess?.();
      },
      onError: (error: any) => {
        const errorInfo = classifyError(error);

        toast({
          title: errorInfo.title,
          description: errorInfo.message,
          variant: "destructive",
        });

        // Close dialog on error
        setShowConfirmDialog(false);
      },
    },
  });

  const handleSubmitClick = () => {
    // Always show dialog - different content based on completion status
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = () => {
    submitAssessment({
      assessmentId,
    });
  };

  // Check if assessment is in an editable state
  const isEditableStatus =
    !assessmentStatus ||
    assessmentStatus.toLowerCase() === "draft" ||
    assessmentStatus.toLowerCase() === "rework" ||
    assessmentStatus.toLowerCase() === "needs-rework";

  // Disable when pending OR when assessment is already submitted (not editable)
  const isButtonDisabled = isPending || !isEditableStatus;

  return (
    <>
      <Button
        onClick={handleSubmitClick}
        disabled={isButtonDisabled}
        size="lg"
        className="w-full sm:w-auto bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow)]/90 text-gray-900 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Submit Assessment
          </>
        )}
      </Button>

      {/* Confirmation Dialog - Different content based on completion status */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {isComplete ? (
                <>
                  <Send className="h-5 w-5" />
                  Submit Assessment for Review?
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Submit Incomplete Assessment?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                {/* Warning banner for incomplete assessment */}
                {!isComplete && (
                  <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md">
                    <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-orange-500" />
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                        Your assessment is not yet complete
                      </span>
                      {incompleteCount !== undefined && totalCount !== undefined && (
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          {incompleteCount} of {totalCount} indicators are incomplete. You can still
                          submit, but incomplete indicators may affect your assessment result.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  {isComplete
                    ? "Are you sure you want to submit this assessment? Once submitted:"
                    : "Are you sure you want to submit anyway? Once submitted:"}
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Your assessment will be locked for editing</li>
                  <li>An assessor will review your submission</li>
                  <li>
                    You will only be able to edit if the assessor requests rework (one rework cycle
                    allowed)
                  </li>
                  {!isComplete && (
                    <li className="text-orange-600 dark:text-orange-400">
                      Incomplete indicators cannot be edited after submission
                    </li>
                  )}
                </ul>
                <div className="flex items-start gap-2 p-3 bg-muted rounded-md mt-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {isComplete
                      ? "Please ensure all information is accurate before submitting."
                      : "If you don't have MOVs for certain indicators, you may proceed with submission."}
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              disabled={isPending}
              className={
                isComplete
                  ? "bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow)]/90 text-gray-900 font-semibold shadow-md hover:shadow-lg"
                  : "bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-md hover:shadow-lg"
              }
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {isComplete ? "Confirm Submit" : "Submit Anyway"}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
