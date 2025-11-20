/**
 * Rework Alert Banner Component
 *
 * Shows at the top of indicator forms when accessed via rework workflow.
 * Displays relevant assessor feedback for the current indicator.
 */

"use client";

import { AlertCircle, MessageSquare, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { FailedIndicator } from "@/types/rework";

interface ReworkAlertBannerProps {
  indicator: FailedIndicator;
  assessmentId: number;
}

export function ReworkAlertBanner({ indicator, assessmentId }: ReworkAlertBannerProps) {
  return (
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
  );
}
