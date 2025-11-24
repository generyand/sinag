/**
 * Rework Alert Banner Component
 *
 * Shows at the top of indicator forms when accessed via rework workflow.
 * Displays relevant assessor feedback for the current indicator plus
 * AI-generated summary with link to full rework summary page.
 */

"use client";

import { AlertCircle, MessageSquare, FileText, Sparkles, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { FailedIndicator } from "@/types/rework";
import { useReworkSummary } from "@/hooks/useReworkSummary";
import { ReworkLoadingState } from "./ReworkLoadingState";

interface ReworkAlertBannerProps {
  indicator: FailedIndicator;
  assessmentId: number;
}

export function ReworkAlertBanner({ indicator, assessmentId }: ReworkAlertBannerProps) {
  const { data: reworkSummary, isLoading, isGenerating } = useReworkSummary(assessmentId);

  return (
    <div className="space-y-4">
      <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        <AlertTitle className="text-orange-900 dark:text-orange-100 font-semibold">
          This Indicator Requires Rework
        </AlertTitle>
        <AlertDescription className="text-orange-800 dark:text-orange-200 space-y-3">
          <p>
            The assessor has provided feedback for this indicator. Please review the comments below,
            update your responses, and reupload any required MOVs.
          </p>

          {/* Feedback Summary */}
          <div className="flex items-center gap-4 text-sm">
            {indicator.comments.length > 0 && (
              <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">
                  Assessor note provided
                </span>
              </div>
            )}
            {indicator.annotations.length > 0 && (
              <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                <FileText className="h-4 w-4" />
                <span className="font-medium">
                  {indicator.annotations.length} MOV {indicator.annotations.length === 1 ? "annotation" : "annotations"}
                </span>
              </div>
            )}
          </div>

          {/* Assessor Comments (if any) - Show only the first/most recent comment */}
          {indicator.comments.length > 0 && (
            <div className="space-y-2 mt-4 pt-4 border-t border-orange-200 dark:border-orange-800">
              <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                Assessor Notes:
              </h4>
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-sm p-3 border-l-2 border-blue-500">
                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {indicator.comments[0].comment}
                </p>
              </div>
            </div>
          )}

          {/* MOV Annotations Notice (if any) */}
          {indicator.annotations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                📎 <strong>MOV Feedback:</strong> The assessor has highlighted and commented on{" "}
                {indicator.annotations.length} of your uploaded files. Review the MOV section below to see the
                annotations.
              </p>
            </div>
          )}
        </AlertDescription>
      </Alert>

      {/* AI-Generated Summary Section */}
      {(isLoading || isGenerating || reworkSummary) && (
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100 font-semibold">
            AI-Powered Summary
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200 space-y-3">
            {isGenerating ? (
              <div className="flex items-center gap-2 text-sm">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                <span>Analyzing assessor feedback and generating summary...</span>
              </div>
            ) : reworkSummary ? (
              <>
                <p className="text-sm">{reworkSummary.overall_summary}</p>

                {/* Priority Actions */}
                {reworkSummary.priority_actions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Priority Actions:
                    </h4>
                    <ul className="space-y-1 pl-4">
                      {reworkSummary.priority_actions.slice(0, 3).map((action, index) => (
                        <li
                          key={index}
                          className="text-sm text-blue-800 dark:text-blue-200 list-disc marker:text-blue-600"
                        >
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Estimated Time */}
                {reworkSummary.estimated_time && (
                  <p className="text-sm font-medium">
                    ⏱️ Estimated time to fix: {reworkSummary.estimated_time}
                  </p>
                )}

                {/* View Full Summary Link */}
                <div className="pt-2">
                  <Link href={`/blgu/rework-summary?assessment=${assessmentId}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-blue-600 text-blue-700 hover:bg-blue-100"
                    >
                      View Full Rework Summary
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
