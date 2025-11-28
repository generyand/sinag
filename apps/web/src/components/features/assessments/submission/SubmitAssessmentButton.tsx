/**
 * SubmitAssessmentButton Component (Epic 5.0 - Story 5.12)
 *
 * Handles assessment submission with confirmation dialog.
 * - Integrates usePostAssessmentsAssessmentIdSubmit mutation hook
 * - Shows confirmation dialog before submission
 * - Disables button if assessment is incomplete
 * - Displays loading state during submission
 * - Handles success and error states
 *
 * Props:
 * - assessmentId: ID of the assessment to submit
 * - isComplete: Whether the assessment is complete (100%)
 * - onSuccess: Callback function after successful submission
 */

"use client";

import { useState } from "react";
import { Loader2, Send, AlertCircle, CheckCircle2 } from "lucide-react";
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
import { usePostAssessmentsAssessmentIdSubmit } from "@sinag/shared";
import type { SubmissionValidationResult } from "@sinag/shared";

interface SubmitAssessmentButtonProps {
  assessmentId: number;
  isComplete: boolean;
  onSuccess?: () => void;
}

export function SubmitAssessmentButton({
  assessmentId,
  isComplete,
  onSuccess,
}: SubmitAssessmentButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

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
        const rawError =
          error?.response?.data?.detail || error?.message || "Failed to submit assessment";
        // Handle case where error detail is an object (FastAPI validation errors)
        const errorMessage = typeof rawError === 'object'
          ? rawError.message || JSON.stringify(rawError)
          : rawError;

        toast({
          title: "Submission Failed",
          description: String(errorMessage),
          variant: "destructive",
        });

        // Close dialog on error
        setShowConfirmDialog(false);
      },
    },
  });

  const handleSubmitClick = () => {
    // Only show dialog if assessment is complete
    if (isComplete) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmSubmit = () => {
    submitAssessment({
      assessmentId,
    });
  };

  const isButtonDisabled = !isComplete || isPending;

  const button = (
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
  );

  // Wrap button in tooltip if disabled due to incomplete assessment
  if (!isComplete && !isPending) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              Complete all indicators and upload required MOVs before submitting
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      {button}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Submit Assessment for Review?
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
                    You will only be able to edit if the assessor requests rework (one
                    rework cycle allowed)
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
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              disabled={isPending}
              className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow)]/90 text-gray-900 font-semibold shadow-md hover:shadow-lg"
            >
              {isPending ? (
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
    </>
  );
}
