"use client";

/**
 * AssessmentProgress Component
 *
 * Displays the overall assessment progress as a percentage with a visual progress bar.
 * Progress is calculated based on the assessment status:
 *
 * - 0–20%: Preparation and Drafting (DRAFT status)
 * - 20–45%: Phase 1 (SUBMITTED, IN_REVIEW)
 * - 45–55%: Phase 1 Rework (REWORK/NEEDS_REWORK, not calibration)
 * - 55–80%: Phase 2 (AWAITING_FINAL_VALIDATION)
 * - 80–90%: Phase 2 Calibration (REWORK during calibration)
 * - 90–100%: Final Approval and Result (AWAITING_MLGOO_APPROVAL, COMPLETED)
 */

import { useMemo } from "react";
import { Info, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Assessment status union type for type safety */
type AssessmentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "REWORK"
  | "NEEDS_REWORK"
  | "AWAITING_FINAL_VALIDATION"
  | "AWAITING_MLGOO_APPROVAL"
  | "COMPLETED";

type DeadlineUrgencyLevel = "normal" | "warning" | "urgent" | "critical" | "expired";

interface AssessmentProgressProps {
  /** Current assessment status */
  currentStatus: AssessmentStatus | string;
  /** Whether this is a calibration rework (Phase 2 rework) */
  isCalibrationRework: boolean;
  /** Whether this is an MLGOO recalibration */
  isMlgooRecalibration?: boolean;
  /** Completion percentage for DRAFT status (0-100) */
  completionPercentage?: number;
  /** Days remaining until Phase 1 deadline (null if not applicable) */
  daysUntilDeadline?: number | null;
  /** Urgency level based on days remaining */
  deadlineUrgencyLevel?: DeadlineUrgencyLevel | null;
  /** Whether the assessment was auto-submitted */
  isAutoSubmitted?: boolean;
  className?: string;
}

interface ProgressInfo {
  percentage: number;
  phase: string;
  description: string;
}

/** Helper to check if status is a rework status */
function isReworkStatus(status: string): boolean {
  return status === "REWORK" || status === "NEEDS_REWORK";
}

function calculateProgress(
  status: string,
  isCalibrationRework: boolean,
  isMlgooRecalibration: boolean,
  completionPercentage: number
): ProgressInfo {
  // COMPLETED status
  if (status === "COMPLETED") {
    return {
      percentage: 100,
      phase: "Completed",
      description: "Final Approval and Result",
    };
  }

  // AWAITING_MLGOO_APPROVAL status
  if (status === "AWAITING_MLGOO_APPROVAL") {
    return {
      percentage: 95,
      phase: "Final Approval",
      description: "Final Approval and Result",
    };
  }

  // MLGOO RE-calibration
  if (isMlgooRecalibration && isReworkStatus(status)) {
    return {
      percentage: 92,
      phase: "RE-Calibration",
      description: "Final Approval and Result",
    };
  }

  // Phase 2 Calibration (REWORK during Phase 2)
  if (isCalibrationRework && isReworkStatus(status)) {
    return {
      percentage: 85,
      phase: "Calibration",
      description: "Phase 2 (Calibration)",
    };
  }

  // Phase 2: Table Validation
  if (status === "AWAITING_FINAL_VALIDATION") {
    return {
      percentage: 65,
      phase: "Phase 2",
      description: "Phase 2",
    };
  }

  // Phase 1 Rework (non-calibration)
  if (isReworkStatus(status)) {
    return {
      percentage: 50,
      phase: "Rework",
      description: "Phase 1 (Rework)",
    };
  }

  // Phase 1: In Review
  if (status === "IN_REVIEW") {
    return {
      percentage: 35,
      phase: "Phase 1",
      description: "Phase 1",
    };
  }

  // Phase 1: Submitted
  if (status === "SUBMITTED") {
    return {
      percentage: 25,
      phase: "Phase 1",
      description: "Phase 1",
    };
  }

  // DRAFT status: Map completion percentage to 0-20% range
  if (status === "DRAFT") {
    // Scale the completion percentage to the 0-20% range
    const scaledProgress = Math.round((completionPercentage / 100) * 20);
    return {
      percentage: scaledProgress,
      phase: "Drafting",
      description: "Preparation and Drafting",
    };
  }

  // Default fallback
  return {
    percentage: 0,
    phase: "Starting",
    description: "Preparation and Drafting",
  };
}

function getProgressColor(percentage: number): string {
  if (percentage >= 90) return "bg-green-500";
  if (percentage >= 55) return "bg-blue-500";
  if (percentage >= 45) return "bg-orange-500";
  if (percentage >= 20) return "bg-yellow-500";
  return "bg-gray-400";
}

/** Progress legend shown in tooltip */
function ProgressLegend() {
  return (
    <div className="space-y-1.5 text-xs">
      <p className="font-medium text-[var(--foreground)] mb-2">Progress Phases</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
        <span>0–20%: Preparation and Drafting</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
        <span>20–45%: Phase 1</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
        <span>45–55%: Phase 1 (Rework)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        <span>55–80%: Phase 2</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        <span>80–90%: Phase 2 (Calibration)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
        <span>90–100%: Final Approval</span>
      </div>
    </div>
  );
}

/** Deadline countdown widget configuration */
const deadlineConfig: Record<
  DeadlineUrgencyLevel,
  { bg: string; text: string; textMuted: string; border: string; iconBg: string }
> = {
  normal: {
    bg: "bg-slate-50 dark:bg-slate-900/30",
    text: "text-slate-700 dark:text-slate-200",
    textMuted: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    iconBg: "bg-slate-100 dark:bg-slate-800",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-200",
    textMuted: "text-amber-600 dark:text-amber-400",
    border: "border-amber-300 dark:border-amber-700",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
  },
  urgent: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-700 dark:text-orange-200",
    textMuted: "text-orange-600 dark:text-orange-400",
    border: "border-orange-400 dark:border-orange-600",
    iconBg: "bg-orange-100 dark:bg-orange-900/50",
  },
  critical: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-200",
    textMuted: "text-red-600 dark:text-red-400",
    border: "border-red-400 dark:border-red-600",
    iconBg: "bg-red-100 dark:bg-red-900/50",
  },
  expired: {
    bg: "bg-red-100 dark:bg-red-950/40",
    text: "text-red-800 dark:text-red-100",
    textMuted: "text-red-700 dark:text-red-300",
    border: "border-red-500 dark:border-red-500",
    iconBg: "bg-red-200 dark:bg-red-900/60",
  },
};

export function AssessmentProgress({
  currentStatus,
  isCalibrationRework,
  isMlgooRecalibration = false,
  completionPercentage = 0,
  daysUntilDeadline,
  deadlineUrgencyLevel,
  isAutoSubmitted = false,
  className,
}: AssessmentProgressProps) {
  const progressInfo = useMemo(
    () =>
      calculateProgress(
        currentStatus,
        isCalibrationRework,
        isMlgooRecalibration,
        completionPercentage
      ),
    [currentStatus, isCalibrationRework, isMlgooRecalibration, completionPercentage]
  );

  const progressColor = useMemo(
    () => getProgressColor(progressInfo.percentage),
    [progressInfo.percentage]
  );

  return (
    <div className={className}>
      {/* Header with info tooltip */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Assessment Progress</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              aria-label="View progress phases"
            >
              <Info className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="max-w-xs">
            <ProgressLegend />
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Progress percentage and phase */}
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-3xl font-bold text-[var(--foreground)]">
          {progressInfo.percentage}%
        </span>
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {progressInfo.phase}
        </span>
      </div>

      {/* Progress bar with ARIA attributes for accessibility */}
      <div
        className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3"
        role="progressbar"
        aria-valuenow={progressInfo.percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Assessment progress: ${progressInfo.percentage}% - ${progressInfo.description}`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", progressColor)}
          style={{ width: `${progressInfo.percentage}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Phase description */}
      <p className="text-sm text-[var(--text-secondary)]">{progressInfo.description}</p>

      {/* Deadline Countdown Widget - Only show for DRAFT status with deadline approaching */}
      {currentStatus === "DRAFT" &&
        deadlineUrgencyLevel &&
        deadlineUrgencyLevel !== "normal" &&
        daysUntilDeadline !== null &&
        daysUntilDeadline !== undefined && (
          <div
            className={cn(
              "mt-4 rounded-xl border-2 overflow-hidden",
              deadlineConfig[deadlineUrgencyLevel].bg,
              deadlineConfig[deadlineUrgencyLevel].border,
              deadlineUrgencyLevel === "critical" && "animate-pulse"
            )}
          >
            {/* Compact header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-inherit">
              <div className={cn("p-1 rounded-md", deadlineConfig[deadlineUrgencyLevel].iconBg)}>
                {deadlineUrgencyLevel === "expired" || deadlineUrgencyLevel === "critical" ? (
                  <AlertTriangle
                    className={cn("h-3.5 w-3.5", deadlineConfig[deadlineUrgencyLevel].text)}
                  />
                ) : (
                  <Clock className={cn("h-3.5 w-3.5", deadlineConfig[deadlineUrgencyLevel].text)} />
                )}
              </div>
              <span
                className={cn("text-xs font-semibold", deadlineConfig[deadlineUrgencyLevel].text)}
              >
                {isAutoSubmitted
                  ? "Auto-Submitted"
                  : deadlineUrgencyLevel === "expired"
                    ? "Deadline Passed"
                    : "Submission Deadline"}
              </span>
            </div>

            {/* Countdown display */}
            <div className="px-3 py-3 text-center">
              {daysUntilDeadline >= 0 && !isAutoSubmitted ? (
                <>
                  <div
                    className={cn(
                      "text-3xl font-black leading-none",
                      deadlineConfig[deadlineUrgencyLevel].text
                    )}
                  >
                    {daysUntilDeadline}
                  </div>
                  <div
                    className={cn(
                      "text-xs font-medium mt-1",
                      deadlineConfig[deadlineUrgencyLevel].textMuted
                    )}
                  >
                    {daysUntilDeadline === 1 ? "day remaining" : "days remaining"}
                  </div>
                </>
              ) : isAutoSubmitted ? (
                <div
                  className={cn("text-sm font-semibold py-1", "text-green-700 dark:text-green-300")}
                >
                  Submitted
                </div>
              ) : (
                <div
                  className={cn(
                    "text-sm font-semibold py-1",
                    deadlineConfig[deadlineUrgencyLevel].text
                  )}
                >
                  Expired
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
