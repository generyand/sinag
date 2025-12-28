/**
 * ReworkCommentsPanel Component (Epic 5.0 - Story 5.14)
 *
 * Displays assessor feedback when an assessment is in REWORK status.
 * Shows:
 * - Alert banner indicating rework is requested
 * - Assessor's rework comments in a Card
 * - Timestamp of when rework was requested
 *
 * Only visible when assessment status is REWORK.
 *
 * Props:
 * - assessmentId: ID of the assessment to display rework comments for
 */

"use client";

import { AlertTriangle, MessageSquare, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAssessmentsAssessmentIdSubmissionStatus } from "@sinag/shared";
import { formatDistanceToNow } from "date-fns";

interface ReworkCommentsPanelProps {
  assessmentId: number;
}

export function ReworkCommentsPanel({ assessmentId }: ReworkCommentsPanelProps) {
  const {
    data: submissionStatus,
    isLoading,
    error,
  } = useGetAssessmentsAssessmentIdSubmissionStatus(assessmentId);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Error state - don't show anything on error
  if (error) {
    return null;
  }

  // Only show if status is REWORK
  if (submissionStatus?.status !== "REWORK") {
    return null;
  }

  const { rework_comments, rework_requested_at, rework_requested_by } = submissionStatus;

  // If no comments, don't render (shouldn't happen in REWORK status)
  if (!rework_comments) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Alert Banner - Rework Requested */}
      <Alert variant="destructive" className="border-orange-600 bg-orange-50 dark:bg-orange-950/20">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-700 dark:text-orange-400">Rework Requested</AlertTitle>
        <AlertDescription className="text-orange-600 dark:text-orange-300">
          Please address the assessor's feedback below and resubmit your assessment.
        </AlertDescription>
      </Alert>

      {/* Rework Comments Card */}
      <Card className="border-orange-200 shadow-md dark:border-orange-900">
        <CardHeader className="bg-orange-50 dark:bg-orange-950/10">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-orange-600" />
            Assessor Feedback
            <Badge
              variant="outline"
              className="ml-auto bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
            >
              REWORK
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Comments - preserve line breaks */}
          <div className="rounded-md bg-muted/50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{rework_comments}</p>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            {rework_requested_at && (
              <span>
                Requested {formatDistanceToNow(new Date(rework_requested_at), { addSuffix: true })}
              </span>
            )}
          </div>
          {rework_requested_by && (
            <span className="text-xs">
              by{" "}
              {typeof rework_requested_by === "object" &&
              rework_requested_by &&
              "email" in rework_requested_by
                ? (rework_requested_by as any).email
                : "Assessor"}
            </span>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
