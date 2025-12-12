"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TopReworkReasons } from "@/hooks/useAdminDashboard";

interface TopReworkReasonsCardProps {
  data: TopReworkReasons | undefined;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  isRefetching?: boolean;
}

export function TopReworkReasonsCard({
  data,
  onRegenerate,
  isRegenerating = false,
  isRefetching = false,
}: TopReworkReasonsCardProps) {
  // Combined loading state: regenerating API call OR refetching dashboard data
  const isLoading = isRegenerating || isRefetching;

  // Status text for the loading overlay
  const getStatusText = () => {
    if (isRegenerating) return "Regenerating analysis...";
    if (isRefetching) return "Updating data...";
    return "";
  };
  // Regenerate button component (reusable)
  const RegenerateButton = () =>
    onRegenerate ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              disabled={isLoading}
              className="h-8 px-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh AI analysis</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : null;

  // Loading overlay component
  const LoadingOverlay = () =>
    isLoading ? (
      <div className="absolute inset-0 bg-[var(--card)]/80 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 rounded-sm">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-500 mb-2" />
        <span className="text-sm text-[var(--muted-foreground)]">{getStatusText()}</span>
      </div>
    ) : null;

  // Show empty state if no data (with null safety check for reasons array)
  if (!data || !data.reasons || data.reasons.length === 0) {
    return (
      <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
        <LoadingOverlay />
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                Top Reasons for Rework/Calibration
              </h3>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                AI Generated
              </span>
            </div>
            <RegenerateButton />
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Common issues identified in assessments
          </p>
        </div>

        <div className="text-center py-8 text-[var(--muted-foreground)]">
          <p>No rework or calibration data available yet.</p>
          <p className="text-xs mt-2">
            Data will appear once assessments go through the rework process.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <LoadingOverlay />
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Top Reasons for Rework/Calibration
            </h3>
            {data.generated_by_ai && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                AI Generated
              </span>
            )}
          </div>
          <RegenerateButton />
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Common issues identified across assessments
        </p>
      </div>

      {/* Reasons list - scrollable with max height */}
      <ul className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
        {data.reasons.map((reason, index) => (
          <li key={index} className="flex items-start gap-3">
            <span
              className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs font-medium ${
                reason.source === "rework"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
              }`}
            >
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--foreground)] leading-relaxed">{reason.reason}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    reason.source === "rework"
                      ? "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                      : "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                  }`}
                >
                  {reason.source === "rework" ? "Rework" : "Calibration"}
                </span>
                {reason.count > 1 && (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    ({reason.count} occurrences)
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-[var(--muted-foreground)]">
              <span className="font-medium text-orange-600 dark:text-orange-400">
                {data.total_rework_assessments}
              </span>{" "}
              rework
            </span>
            <span className="text-[var(--muted-foreground)]">
              <span className="font-medium text-purple-600 dark:text-purple-400">
                {data.total_calibration_assessments}
              </span>{" "}
              calibration
            </span>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">
            {data.total_rework_assessments + data.total_calibration_assessments} assessments
            analyzed
          </span>
        </div>
      </div>
    </div>
  );
}
