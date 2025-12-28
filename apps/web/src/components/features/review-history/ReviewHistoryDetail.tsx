"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { ReviewHistoryDetail as DetailType } from "@sinag/shared";
import { XCircle, MessageSquare, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatIndicatorName } from "@/lib/utils/text-formatter";

interface ReviewHistoryDetailProps {
  detail: DetailType | undefined;
  isLoading: boolean;
  error?: Error | null;
}

export function ReviewHistoryDetail({ detail, isLoading, error }: ReviewHistoryDetailProps) {
  if (isLoading) {
    return (
      <div className="px-4 py-3 bg-[var(--muted)]/20 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Loading indicators...</span>
        </div>
        <div className="space-y-1 mt-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    // Extract error message from Axios error structure
    let errorMessage = "An unexpected error occurred";

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      // Handle Axios error response
      const axiosError = error as any;
      if (axiosError.response?.data?.detail) {
        errorMessage = axiosError.response.data.detail;
      } else if (axiosError.response?.data?.message) {
        errorMessage = axiosError.response.data.message;
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    return (
      <div className="px-4 py-2 bg-red-50 dark:bg-red-950/20 border-t border-[var(--border)]">
        <p className="text-xs text-red-600 dark:text-red-400">
          <XCircle className="h-3 w-3 inline mr-1" />
          {errorMessage}
        </p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="px-4 py-2 bg-[var(--muted)]/20 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
        Unable to load details.
      </div>
    );
  }

  const indicators = detail.indicators ?? [];

  if (indicators.length === 0) {
    return (
      <div className="px-4 py-2 bg-[var(--muted)]/20 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
        No indicators found.
      </div>
    );
  }

  // Calculate summary stats
  const passCount = indicators.filter((i) => i.validation_status?.toUpperCase() === "PASS").length;
  const failCount = indicators.filter((i) => i.validation_status?.toUpperCase() === "FAIL").length;
  const conditionalCount = indicators.filter(
    (i) => i.validation_status?.toUpperCase() === "CONDITIONAL"
  ).length;

  return (
    <div className="px-4 py-3 bg-[var(--muted)]/20 border-t border-[var(--border)]">
      {/* Compact header */}
      <div className="flex items-center justify-between mb-2 text-xs text-[var(--text-muted)]">
        <span className="font-medium">{indicators.length} indicators</span>
        <div className="flex items-center gap-3">
          <span className="text-green-600 dark:text-green-400">{passCount} Pass</span>
          <span className="text-red-600 dark:text-red-400">{failCount} Fail</span>
          {conditionalCount > 0 && (
            <span className="text-yellow-600 dark:text-yellow-400">{conditionalCount} Cond</span>
          )}
        </div>
      </div>

      {/* Indicators list - compact */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {indicators.map((indicator, index) => {
          const statusColor =
            indicator.validation_status?.toUpperCase() === "PASS"
              ? "border-l-green-500"
              : indicator.validation_status?.toUpperCase() === "FAIL"
                ? "border-l-red-500"
                : indicator.validation_status?.toUpperCase() === "CONDITIONAL"
                  ? "border-l-yellow-500"
                  : "border-l-gray-300 dark:border-l-gray-600";

          // Format the indicator name with dynamic year
          const formattedName = formatIndicatorName(
            indicator.indicator_name || "",
            detail.assessment_year
          );

          return (
            <div
              key={indicator.indicator_id}
              className={cn(
                "flex items-start gap-2 py-1.5 px-2 rounded border-l-2 bg-[var(--card)] text-xs",
                statusColor
              )}
            >
              {/* Code */}
              <span className="flex-shrink-0 font-mono text-[var(--text-muted)] w-10">
                {indicator.indicator_code}
              </span>

              {/* Name - takes remaining space */}
              <span className="flex-1 min-w-0 text-[var(--foreground)] line-clamp-2">
                {formattedName}
              </span>

              {/* Badges - compact */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* MOV count */}
                {(indicator.mov_count ?? 0) > 0 && (
                  <span className="text-[var(--text-muted)]" title="MOV files">
                    <FileText className="h-3 w-3 inline" /> {indicator.mov_count}
                  </span>
                )}

                {/* Comments count */}
                {indicator.feedback_comments && indicator.feedback_comments.length > 0 && (
                  <span className="text-blue-600 dark:text-blue-400" title="Comments">
                    <MessageSquare className="h-3 w-3 inline" />{" "}
                    {indicator.feedback_comments.length}
                  </span>
                )}

                {/* Status badge */}
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded font-medium",
                    indicator.validation_status?.toUpperCase() === "PASS" &&
                      "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50",
                    indicator.validation_status?.toUpperCase() === "FAIL" &&
                      "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50",
                    indicator.validation_status?.toUpperCase() === "CONDITIONAL" &&
                      "text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/50",
                    !indicator.validation_status && "text-[var(--text-muted)]"
                  )}
                >
                  {indicator.validation_status || "N/A"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rework comments if present */}
      {detail.rework_comments && (
        <div className="mt-2 px-2 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-700 dark:text-orange-300">
          <MessageSquare className="h-3 w-3 inline mr-1" />
          <span className="font-medium">Rework:</span> {detail.rework_comments}
        </div>
      )}
    </div>
  );
}
