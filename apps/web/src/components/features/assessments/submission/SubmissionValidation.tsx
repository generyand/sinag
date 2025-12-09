/**
 * SubmissionValidation Component (Epic 5.0 - Story 5.11)
 *
 * Displays validation results for assessment submission readiness.
 * Shows checklist of:
 * - Indicator completeness (all required fields filled)
 * - MOV file uploads (all required files uploaded)
 *
 * Uses the useGetAssessmentsAssessmentIdSubmissionStatus hook from Epic 5.0
 */

"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAssessmentsAssessmentIdSubmissionStatus } from "@sinag/shared";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface SubmissionValidationProps {
  assessmentId: number;
}

export function SubmissionValidation({ assessmentId }: SubmissionValidationProps) {
  // Fetch submission status using Epic 5.0 generated hook
  const {
    data: submissionStatus,
    isLoading,
    error,
    refetch,
  } = useGetAssessmentsAssessmentIdSubmissionStatus(assessmentId);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Failed to Load Validation Status</AlertTitle>
        <AlertDescription className="mt-2">
          <p>Unable to check submission readiness. Please try again.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!submissionStatus) {
    return null;
  }

  const { validation_result } = submissionStatus;
  const isValid = validation_result.is_valid;
  const incompleteCount = validation_result.incomplete_indicators?.length || 0;
  const missingMovCount = validation_result.missing_movs?.length || 0;
  const totalIssues = incompleteCount + missingMovCount;

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Submission Readiness</h3>
          <p className="text-sm text-muted-foreground">
            {isValid
              ? "All requirements complete"
              : `${totalIssues} requirement${totalIssues === 1 ? "" : "s"} pending`}
          </p>
        </div>
        <Badge
          variant={isValid ? "default" : "destructive"}
          className={isValid ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {isValid ? "Ready to Submit" : "Incomplete"}
        </Badge>
      </div>

      {/* Validation Error Message */}
      {!isValid && validation_result.error_message && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Submission Requirements Not Met</AlertTitle>
          <AlertDescription>{validation_result.error_message}</AlertDescription>
        </Alert>
      )}

      {/* Indicator Completeness Checklist */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Indicator Completeness
        </h4>

        {incompleteCount === 0 ? (
          <div className="flex items-center gap-2 p-3 border rounded-md bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">All indicators complete</span>
          </div>
        ) : (
          <div className="space-y-2">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>
                {incompleteCount} Incomplete Indicator{incompleteCount === 1 ? "" : "s"}
              </AlertTitle>
              <AlertDescription>
                <p className="mb-2">The following indicators have missing required fields:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {validation_result.incomplete_indicators?.map((indicator, index) => (
                    <li key={index} className="text-red-700 dark:text-red-400">
                      {indicator}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      {/* MOV File Upload Checklist */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          MOV File Uploads
        </h4>

        {missingMovCount === 0 ? (
          <div className="flex items-center gap-2 p-3 border rounded-md bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">All required files uploaded</span>
          </div>
        ) : (
          <div className="space-y-2">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>
                {missingMovCount} Missing File Upload{missingMovCount === 1 ? "" : "s"}
              </AlertTitle>
              <AlertDescription>
                <p className="mb-2">The following indicators are missing required file uploads:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {validation_result.missing_movs?.map((indicator, index) => (
                    <li key={index} className="text-red-700 dark:text-red-400">
                      {indicator}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      {/* Success State */}
      {isValid && (
        <Alert className="border-green-600 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700 dark:text-green-400">
            Assessment Ready for Submission
          </AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-300">
            All requirements have been met. You can now submit this assessment for review.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
