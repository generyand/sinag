/**
 * RequestReworkForm Component (Epic 5.0 - Story 5.15)
 *
 * Assessor-only form to request rework on a submitted assessment.
 * Features:
 * - Textarea for rework comments (minimum 10 characters)
 * - Character count indicator
 * - Confirmation dialog before requesting rework
 * - Disabled if rework limit reached (reworkCount >= 1)
 * - Success/error toast notifications
 *
 * Props:
 * - assessmentId: ID of the assessment to request rework for
 * - reworkCount: Current rework count (0 or 1)
 * - onSuccess: Callback after successful rework request
 */

"use client";

import { useState } from "react";
import { classifyError } from "@/lib/error-utils";
import { Loader2, AlertTriangle, MessageSquare, RotateCcw } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePostAssessmentsAssessmentIdRequestRework } from "@sinag/shared";
import { useQueryClient } from "@tanstack/react-query";

interface RequestReworkFormProps {
  assessmentId: number;
  reworkCount: number;
  onSuccess?: () => void;
}

const MIN_COMMENT_LENGTH = 10;

export function RequestReworkForm({
  assessmentId,
  reworkCount,
  onSuccess,
}: RequestReworkFormProps) {
  const [comments, setComments] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Epic 5.0 mutation hook for requesting rework
  const { mutate: requestRework, isPending } = usePostAssessmentsAssessmentIdRequestRework({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Rework Requested",
          description: "The BLGU has been notified and can now make revisions to their assessment.",
          variant: "default",
        });

        // Invalidate all assessment-related queries to ensure fresh data
        // This will update the assessor's submissions queue and any cached assessment data
        queryClient.invalidateQueries({ queryKey: ["assessments"] });
        queryClient.invalidateQueries({ queryKey: ["assessor"] });
        queryClient.invalidateQueries({ queryKey: ["blgu-dashboard"] });

        // Clear form and close dialog
        setComments("");
        setShowConfirmDialog(false);
        onSuccess?.();
      },
      onError: (error: any) => {
        const errorInfo = classifyError(error);
        const errorMessage = error?.response?.data?.detail || error?.message || "";

        // Check for rework limit error (specific business rule)
        const isReworkLimitError = errorMessage.toLowerCase().includes("rework limit");

        let title = "Request Failed";
        let description = "Please try again. If the problem persists, contact your MLGOO-DILG.";

        if (isReworkLimitError) {
          title = "Rework Limit Reached";
          description = "This assessment has already used its one rework cycle.";
        } else if (errorInfo.type === "network") {
          title = "Unable to connect";
          description = "Check your internet connection and try again.";
        } else if (errorInfo.type === "auth") {
          title = "Session expired";
          description = "Please log in again to request rework.";
        } else if (errorInfo.type === "validation") {
          title = "Cannot request rework";
          description = errorInfo.message;
        }

        toast({
          title,
          description,
          variant: "destructive",
        });

        // Close dialog on error
        setShowConfirmDialog(false);
      },
    },
  });

  const handleRequestReworkClick = () => {
    // Only show dialog if comments are valid
    if (comments.trim().length >= MIN_COMMENT_LENGTH) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmRequest = () => {
    requestRework({
      assessmentId,
      data: {
        comments: comments.trim(),
      },
    });
  };

  // If rework limit reached, show disabled state
  if (reworkCount >= 1) {
    return (
      <Alert variant="destructive" className="border-red-600 bg-red-50 dark:bg-red-950/20">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-700 dark:text-red-400">
          Rework Limit Reached
        </AlertTitle>
        <AlertDescription className="text-red-600 dark:text-red-300">
          This BLGU has already used their one rework cycle. No further rework requests are allowed.
        </AlertDescription>
      </Alert>
    );
  }

  const isCommentsValid = comments.trim().length >= MIN_COMMENT_LENGTH;
  const characterCount = comments.trim().length;

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="space-y-2">
        <Label htmlFor="rework-comments" className="flex items-center gap-2 text-base font-semibold">
          <MessageSquare className="h-4 w-4" />
          Rework Comments
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="rework-comments"
          placeholder="Explain what needs to be revised... (minimum 10 characters)"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="min-h-[120px] resize-y"
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          {characterCount} character{characterCount !== 1 ? "s" : ""} (minimum {MIN_COMMENT_LENGTH})
          {!isCommentsValid && characterCount > 0 && (
            <span className="ml-2 text-destructive">
              Need {MIN_COMMENT_LENGTH - characterCount} more
            </span>
          )}
        </p>
      </div>

      {/* Request Rework Button */}
      <Button
        onClick={handleRequestReworkClick}
        disabled={!isCommentsValid || isPending}
        variant="destructive"
        size="lg"
        className="w-full sm:w-auto"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Requesting Rework...
          </>
        ) : (
          <>
            <RotateCcw className="mr-2 h-4 w-4" />
            Request Rework
          </>
        )}
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Request Rework?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>Are you sure you want to request rework for this assessment?</p>

              {/* Preview of comments */}
              <div className="rounded-md border bg-muted p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Your feedback:</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {comments.trim()}
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-600" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-orange-700 dark:text-orange-400">
                    This will:
                  </p>
                  <ul className="list-disc list-inside text-orange-600 dark:text-orange-300 space-y-0.5">
                    <li>Send the assessment back to the BLGU for revisions</li>
                    <li>Change the status to REWORK</li>
                    <li>Allow the BLGU to make edits and resubmit</li>
                    <li>Use their one allowed rework cycle</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRequest}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Confirm Request
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
