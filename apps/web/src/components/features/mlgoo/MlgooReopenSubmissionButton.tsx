"use client";

import * as React from "react";
import { usePostMlgooAssessmentsAssessmentIdReopen } from "@sinag/shared";
import { Loader2, LockOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { canReopenSubmission } from "./reopenSubmission";

const DEFAULT_REOPEN_REASON = "Reopened by MLGOO";

interface MlgooReopenSubmissionButtonProps {
  assessmentId: number;
  assessmentStatus: string | null | undefined;
  isLockedForBlgu: boolean;
  barangayName: string;
  onSuccess?: () => void | Promise<void>;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
}

export function MlgooReopenSubmissionButton({
  assessmentId,
  assessmentStatus,
  isLockedForBlgu,
  barangayName,
  onSuccess,
  size = "sm",
  variant = "outline",
  className,
}: MlgooReopenSubmissionButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [reopenCompleted, setReopenCompleted] = React.useState(false);
  const reopenMutation = usePostMlgooAssessmentsAssessmentIdReopen();

  if (reopenCompleted || !canReopenSubmission(assessmentStatus, isLockedForBlgu)) {
    return null;
  }

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();
    const reopenReason = trimmedReason || DEFAULT_REOPEN_REASON;

    toast.loading("Reopening submission...", { id: `reopen-submission-${assessmentId}` });

    try {
      await reopenMutation.mutateAsync({
        assessmentId,
        data: { reason: reopenReason },
      });

      toast.dismiss(`reopen-submission-${assessmentId}`);
      toast.success(`${barangayName} was reopened for BLGU editing.`, {
        description: "The assessment status is now Reopened by MLGOO.",
      });

      setReason("");
      setIsOpen(false);
      setReopenCompleted(true);
      await onSuccess?.();
    } catch (err: any) {
      toast.dismiss(`reopen-submission-${assessmentId}`);
      const errorMessage =
        err?.response?.data?.detail || err?.message || "Failed to reopen submission";
      toast.error("Failed to reopen submission", {
        description: errorMessage,
      });
    }
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <LockOpen className="mr-2 h-4 w-4" />
        Reopen Submission
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reopen Submission</DialogTitle>
            <DialogDescription>
              Return this assessment to BLGU editing without using the deadline unlock flow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{barangayName}</p>
              <p className="mt-1">MLGOO must provide a reason before reopening this submission.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`reopen-reason-${assessmentId}`}>Reason</Label>
              <Textarea
                id={`reopen-reason-${assessmentId}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Optional: explain why the assessment is being reopened for BLGU editing."
                rows={5}
              />
              <p className="text-xs text-slate-500">
                If left blank, the activity log will use “{DEFAULT_REOPEN_REASON}”.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={reopenMutation.isPending}>
              {reopenMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reopening...
                </>
              ) : (
                <>
                  <LockOpen className="mr-2 h-4 w-4" />
                  Confirm Reopen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
