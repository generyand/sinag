"use client";

/**
 * AssessorStatusPanel Component
 *
 * Displays the review status of each governance area assessor.
 * Shows BLGU users which assessors have reviewed their assessment.
 *
 * Each governance area has a dedicated assessor, and this panel shows:
 * - The assessor's name (if assigned)
 * - A checkmark if the assessor has approved that area
 * - A cross if the assessor hasn't yet approved
 */

import { Check, X, Users, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AreaAssessorStatus {
  governance_area_id: number;
  governance_area_name: string;
  assessor_name: string | null;
  is_assessed: boolean;
  status?: string | null;
  rework_used?: boolean;
  calibration_used?: boolean;
}

interface AssessorStatusPanelProps {
  /** List of area assessor status objects */
  areaAssessorStatus: AreaAssessorStatus[];
  /** Optional CSS class name */
  className?: string;
}

export function AssessorStatusPanel({ areaAssessorStatus, className }: AssessorStatusPanelProps) {
  if (!areaAssessorStatus || areaAssessorStatus.length === 0) {
    return null;
  }

  // Count how many areas have been assessed
  const assessedCount = areaAssessorStatus.filter((a) => a.is_assessed).length;
  const totalCount = areaAssessorStatus.length;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-[var(--text-secondary)]" />
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Assessor Review Status</h3>
      </div>

      {/* Progress summary */}
      <div className="mb-3 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-secondary)]">Areas Reviewed</span>
          <span
            className={cn(
              "text-sm font-semibold",
              assessedCount === totalCount
                ? "text-green-600 dark:text-green-400"
                : "text-[var(--foreground)]"
            )}
          >
            {assessedCount}/{totalCount}
          </span>
        </div>
        {/* Mini progress bar */}
        <div className="mt-1.5 w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              assessedCount === totalCount ? "bg-green-500" : "bg-[var(--cityscape-yellow)]"
            )}
            style={{ width: `${(assessedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Assessor list */}
      <div className="space-y-2">
        {areaAssessorStatus.map((area) => {
          // Determine the display state: approved, rework, or pending
          const isRework = area.status === "rework";
          const isApproved = area.is_assessed;

          return (
            <div
              key={area.governance_area_id}
              className={cn(
                "flex items-center justify-between gap-2 py-1.5 px-2 rounded-md transition-colors",
                isApproved
                  ? "bg-green-50 dark:bg-green-950/20"
                  : isRework
                    ? "bg-yellow-50 dark:bg-yellow-950/20"
                    : "bg-gray-50 dark:bg-gray-800/30"
              )}
            >
              {/* Area info */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-xs font-medium truncate",
                    isApproved
                      ? "text-green-700 dark:text-green-300"
                      : isRework
                        ? "text-yellow-700 dark:text-yellow-300"
                        : "text-[var(--foreground)]"
                  )}
                  title={area.governance_area_name}
                >
                  {area.governance_area_name}
                </p>
                {area.assessor_name && (
                  <p className="text-[10px] text-[var(--text-secondary)] truncate">
                    {area.assessor_name}
                  </p>
                )}
                {/* Remaining rework & calibration attempts */}
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={cn(
                      "inline-block text-[9px] font-medium px-1 py-px rounded",
                      area.rework_used
                        ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    )}
                  >
                    {area.rework_used ? "Rework used" : "1 rework left"}
                  </span>
                  <span
                    className={cn(
                      "inline-block text-[9px] font-medium px-1 py-px rounded",
                      area.calibration_used
                        ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    )}
                  >
                    {area.calibration_used ? "Calibrated" : "1 calibration left"}
                  </span>
                </div>
              </div>

              {/* Status icon */}
              <div className="flex-shrink-0">
                {isApproved ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                ) : isRework ? (
                  <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                    <RotateCcw className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <X className="w-3 h-3 text-gray-500 dark:text-gray-400" strokeWidth={3} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion message */}
      {assessedCount === totalCount && (
        <p className="mt-3 text-xs text-green-600 dark:text-green-400 text-center font-medium">
          All areas have been reviewed!
        </p>
      )}
    </div>
  );
}
