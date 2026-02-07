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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { classifyError } from "@/lib/error-utils";
import { AreaStatusType } from "@/types/assessment";
import {
  usePostAssessmentsAssessmentIdAreasGovernanceAreaIdSubmit,
  usePostAssessmentsAssessmentIdAreasGovernanceAreaIdResubmit,
} from "@sinag/shared";
import { CheckCircle, Clock, Loader2, Send, AlertCircle } from "lucide-react";

interface AreaSubmitButtonProps {
  assessmentId: string;
  governanceAreaId: string;
  governanceAreaName: string;
  areaStatus: AreaStatusType;
  isComplete: boolean;
  assessmentStatus: string;
  onSubmitSuccess: () => void;
}

export function AreaSubmitButton({
  assessmentId,
  governanceAreaId,
  governanceAreaName,
  areaStatus,
  isComplete,
  assessmentStatus,
  onSubmitSuccess,
}: AreaSubmitButtonProps) {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const submitMutation = usePostAssessmentsAssessmentIdAreasGovernanceAreaIdSubmit({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Area Submitted",
          description: `${governanceAreaName} has been submitted for review.`,
          variant: "default",
        });
        setShowConfirmDialog(false);
        onSubmitSuccess();
      },
      onError: (error: any) => {
        const errorInfo = classifyError(error);
        let title = "Submission Failed";
        let description = "Please try again. If the problem persists, contact your MLGOO-DILG.";

        if (errorInfo.type === "network") {
          title = "Unable to submit";
          description = "Check your internet connection and try again.";
        } else if (errorInfo.type === "auth") {
          title = "Session expired";
          description = "Please log in again to submit.";
        } else if (errorInfo.type === "validation") {
          title = "Cannot submit area";
          description = errorInfo.message;
        }

        toast({ title, description, variant: "destructive" });
      },
    },
  });

  const resubmitMutation = usePostAssessmentsAssessmentIdAreasGovernanceAreaIdResubmit({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Area Resubmitted",
          description: `${governanceAreaName} has been resubmitted for review.`,
          variant: "default",
        });
        setShowConfirmDialog(false);
        onSubmitSuccess();
      },
      onError: (error: any) => {
        const errorInfo = classifyError(error);
        let title = "Resubmission Failed";
        let description = "Please try again. If the problem persists, contact your MLGOO-DILG.";

        if (errorInfo.type === "network") {
          title = "Unable to resubmit";
          description = "Check your internet connection and try again.";
        } else if (errorInfo.type === "auth") {
          title = "Session expired";
          description = "Please log in again to resubmit.";
        } else if (errorInfo.type === "validation") {
          title = "Cannot resubmit area";
          description = errorInfo.message;
        }

        toast({ title, description, variant: "destructive" });
      },
    },
  });

  const isPending = submitMutation.isPending || resubmitMutation.isPending;
  const isRework = areaStatus === "rework";

  // Check if the overall assessment is in a locked state (no submissions allowed)
  const isAssessmentLocked = [
    "submitted",
    "submitted-for-review",
    "in-review",
    "awaiting-final-validation",
    "validated",
    "completed",
  ].includes(assessmentStatus.toLowerCase());

  // Determine what to show based on status
  const renderContent = () => {
    // Don't show anything if assessment is locked (submission happens at area level now)
    if (isAssessmentLocked) {
      return null;
    }
    // Show status badge for non-actionable states
    if (areaStatus === "submitted") {
      return (
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
        >
          <Clock className="h-2.5 w-2.5 mr-1" />
          Submitted
        </Badge>
      );
    }

    if (areaStatus === "in_review") {
      return (
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        >
          <Clock className="h-2.5 w-2.5 mr-1" />
          In Review
        </Badge>
      );
    }

    if (areaStatus === "approved") {
      return (
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
        >
          <CheckCircle className="h-2.5 w-2.5 mr-1" />
          Approved
        </Badge>
      );
    }

    // Show rework badge if area needs rework but is not complete
    if (isRework && !isComplete) {
      return (
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
        >
          <AlertCircle className="h-2.5 w-2.5 mr-1" />
          Rework
        </Badge>
      );
    }

    // Show submit/resubmit button only when area is complete and in actionable state
    if (isComplete && (areaStatus === "draft" || isRework)) {
      return (
        <Button
          size="sm"
          variant={isRework ? "outline" : "default"}
          className={`h-6 px-2 text-[10px] font-medium ${
            isRework
              ? "border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/20"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirmDialog(true);
          }}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Send className="h-2.5 w-2.5 mr-1" />
              {isRework ? "Resubmit" : "Submit"}
            </>
          )}
        </Button>
      );
    }

    // No button/badge for draft state when incomplete
    return null;
  };

  const handleSubmit = () => {
    const numericAssessmentId = parseInt(assessmentId, 10);
    const numericAreaId = parseInt(governanceAreaId, 10);

    // Validate that IDs are valid numbers
    if (isNaN(numericAssessmentId) || isNaN(numericAreaId)) {
      toast({
        title: "Invalid Request",
        description: "Unable to process submission. Please refresh and try again.",
        variant: "destructive",
      });
      setShowConfirmDialog(false);
      return;
    }

    if (isRework) {
      resubmitMutation.mutate({
        assessmentId: numericAssessmentId,
        governanceAreaId: numericAreaId,
      });
    } else {
      submitMutation.mutate({
        assessmentId: numericAssessmentId,
        governanceAreaId: numericAreaId,
      });
    }
  };

  return (
    <>
      {renderContent()}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              {isRework ? "Resubmit" : "Submit"} {governanceAreaName}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  {isRework
                    ? "Are you sure you want to resubmit this governance area after rework?"
                    : "Are you sure you want to submit this governance area for review?"}
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>This area will be locked for editing once submitted</li>
                  <li>The assigned assessor will review your submission</li>
                  {!isRework && <li>You may edit again if the assessor requests rework</li>}
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
              onClick={handleSubmit}
              disabled={isPending}
              className={`font-semibold ${
                isRework
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isRework ? "Resubmitting..." : "Submitting..."}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isRework ? "Resubmit Area" : "Submit Area"}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
