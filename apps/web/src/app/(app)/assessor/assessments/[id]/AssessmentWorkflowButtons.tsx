"use client";

import { Button } from "@/components/ui/button";
import { useAssessorFinalizeMutation, useAssessorReworkMutation } from "@/hooks/useAssessor";
import { AlertCircle, CheckCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface AssessmentWorkflowButtonsProps {
  assessmentId: string;
  assessmentStatus: string;
  responses: any[];
  onStatusChange?: () => void;
}

export function AssessmentWorkflowButtons({
  assessmentId,
  assessmentStatus,
  responses,
  onStatusChange,
}: AssessmentWorkflowButtonsProps) {
  const reworkMutation = useAssessorReworkMutation(assessmentId);
  const finalizeMutation = useAssessorFinalizeMutation(assessmentId);

  // Check if all responses have been reviewed
  const allResponsesReviewed = responses.every((response) => response.validation_status !== null);

  // Check if assessment can be sent for rework
  const canSendForRework =
    assessmentStatus === "submitted_for_review" || assessmentStatus === "needs_rework";

  // Check if assessment can be finalized
  const canFinalize =
    assessmentStatus === "submitted_for_review" && allResponsesReviewed && responses.length > 0;

  const handleSendForRework = async () => {
    if (!canSendForRework) return;

    try {
      await reworkMutation.mutateAsync({ assessmentId: parseInt(assessmentId) });
      toast.success("Assessment sent for rework successfully");
      onStatusChange?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to send assessment for rework");
      console.error("Error sending for rework:", error);
    }
  };

  const handleFinalize = async () => {
    if (!canFinalize) return;

    try {
      await finalizeMutation.mutateAsync({ assessmentId: parseInt(assessmentId) });
      toast.success("Assessment finalized successfully");
      onStatusChange?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to finalize assessment");
      console.error("Error finalizing:", error);
    }
  };

  const isLoading = reworkMutation.isPending || finalizeMutation.isPending;

  // Don't render buttons if assessment is already validated
  if (assessmentStatus === "validated") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-800">
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">Assessment has been finalized and validated</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold">Assessment Workflow</h3>

      <div className="flex flex-wrap gap-3">
        {/* Send for Rework Button */}
        {canSendForRework && (
          <Button
            variant="outline"
            onClick={handleSendForRework}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Send for Rework
          </Button>
        )}

        {/* Finalize Assessment Button */}
        {canFinalize && (
          <Button
            onClick={handleFinalize}
            disabled={isLoading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4" />
            Finalize Assessment
          </Button>
        )}
      </div>

      {/* Status Messages */}
      <div className="text-sm text-gray-600">
        {assessmentStatus === "needs_rework" && (
          <div className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="h-4 w-4" />
            <span>This assessment has been sent for rework. BLGU user will be notified.</span>
          </div>
        )}

        {assessmentStatus === "submitted_for_review" && !allResponsesReviewed && (
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="h-4 w-4" />
            <span>Please review all responses before finalizing the assessment.</span>
          </div>
        )}

        {assessmentStatus === "submitted_for_review" &&
          allResponsesReviewed &&
          responses.length > 0 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>All responses have been reviewed. You can now finalize the assessment.</span>
            </div>
          )}

        {responses.length === 0 && (
          <div className="flex items-center gap-2 text-gray-500">
            <AlertCircle className="h-4 w-4" />
            <span>No responses available for review.</span>
          </div>
        )}
      </div>
    </div>
  );
}
