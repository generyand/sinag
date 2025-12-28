"use client";

/**
 * PhaseTimeline Component
 *
 * Displays a vertical timeline showing the assessment journey through all phases.
 * Shows key milestone dates when available.
 *
 * Timeline Events:
 * - Phase 1 Started: created_at
 * - Phase 1 Submitted: submitted_at
 * - Rework Requested: rework_requested_at (if applicable)
 * - Phase 2 Started: When status becomes AWAITING_FINAL_VALIDATION
 * - Completed: validated_at
 */

import { CheckCircle2, Clock, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date?: string;
  status: "completed" | "current" | "pending";
  phase: 1 | 2 | 3;
}

interface PhaseTimelineProps {
  submittedAt?: string | null;
  reworkRequestedAt?: string | null;
  validatedAt?: string | null;
  currentStatus: string;
  isCalibrationRework: boolean;
  isMlgooRecalibration?: boolean;
  mlgooRecalibrationRequestedAt?: string | null;
  reworkCount: number;
  className?: string;
}

function formatDate(dateString: string | null | undefined): string | undefined {
  if (!dateString) return undefined;

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return undefined;
  }
}

function buildTimelineEvents(
  submittedAt: string | null | undefined,
  reworkRequestedAt: string | null | undefined,
  validatedAt: string | null | undefined,
  currentStatus: string,
  isCalibrationRework: boolean,
  isMlgooRecalibration: boolean,
  mlgooRecalibrationRequestedAt: string | null | undefined,
  reworkCount: number
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Determine phase completion based on status
  // During MLGOO RE-calibration, all phases are still considered complete
  const isPhase1Complete =
    ["AWAITING_FINAL_VALIDATION", "AWAITING_MLGOO_APPROVAL", "COMPLETED"].includes(currentStatus) ||
    (isCalibrationRework && currentStatus === "REWORK") ||
    (isMlgooRecalibration && (currentStatus === "REWORK" || currentStatus === "NEEDS_REWORK"));

  // Phase 2 is complete when MLGOO approval is pending, completed, or during MLGOO RE-calibration
  const isPhase2Complete =
    ["AWAITING_MLGOO_APPROVAL", "COMPLETED"].includes(currentStatus) ||
    (isMlgooRecalibration && (currentStatus === "REWORK" || currentStatus === "NEEDS_REWORK"));

  // Final verdict is only complete when assessment is COMPLETED (not during MLGOO RE-calibration)
  const isPhase3Complete = currentStatus === "COMPLETED";

  // Phase 1: Initial Assessment
  if (currentStatus === "DRAFT") {
    events.push({
      id: "phase1-draft",
      title: "Phase 1: Initial Assessment",
      description: "Complete your self-assessment",
      status: "current",
      phase: 1,
    });
  } else if (submittedAt) {
    events.push({
      id: "phase1-submitted",
      title: "Phase 1: Submitted",
      description: "Initial assessment submitted for review",
      date: formatDate(submittedAt),
      status: isPhase1Complete ? "completed" : "current",
      phase: 1,
    });
  }

  // Rework event (if applicable and in Phase 1)
  if (reworkRequestedAt && reworkCount > 0 && !isCalibrationRework) {
    events.push({
      id: "phase1-rework",
      title: "Rework Requested",
      description: "Assessor requested corrections",
      date: formatDate(reworkRequestedAt),
      status:
        currentStatus === "REWORK" || currentStatus === "NEEDS_REWORK" ? "current" : "completed",
      phase: 1,
    });
  }

  // Phase 2: Table Validation
  if (isPhase1Complete || currentStatus === "AWAITING_FINAL_VALIDATION") {
    const phase2Status = isPhase2Complete
      ? "completed"
      : currentStatus === "AWAITING_FINAL_VALIDATION" ||
          (isCalibrationRework && (currentStatus === "REWORK" || currentStatus === "NEEDS_REWORK"))
        ? "current"
        : "pending";

    events.push({
      id: "phase2-validation",
      title: "Phase 2: Table Validation",
      description:
        phase2Status === "completed"
          ? "Validation completed"
          : phase2Status === "current"
            ? "Under validator review"
            : "Awaiting validation",
      status: phase2Status,
      phase: 2,
    });
  } else {
    events.push({
      id: "phase2-pending",
      title: "Phase 2: Table Validation",
      description: "Will start after Phase 1 completion",
      status: "pending",
      phase: 2,
    });
  }

  // Calibration event (if applicable)
  if (isCalibrationRework && (currentStatus === "REWORK" || currentStatus === "NEEDS_REWORK")) {
    events.push({
      id: "phase2-calibration",
      title: "Calibration Requested",
      description: "Validator requested corrections",
      date: formatDate(reworkRequestedAt),
      status: "current",
      phase: 2,
    });
  }

  // Phase 3: MLGOO Approval (new phase)
  if (isMlgooRecalibration && (currentStatus === "REWORK" || currentStatus === "NEEDS_REWORK")) {
    // MLGOO RE-calibration: Show approved then RE-calibration requested
    events.push({
      id: "phase3-mlgoo-approved",
      title: "Phase 3: MLGOO Approved",
      description: "Assessment was approved by MLGOO",
      status: "completed",
      phase: 3,
    });
    events.push({
      id: "phase3-mlgoo-recalibration",
      title: "MLGOO RE-Calibration Requested",
      description: "MLGOO requested corrections for specific indicators",
      date: formatDate(mlgooRecalibrationRequestedAt),
      status: "current",
      phase: 3,
    });
  } else if (currentStatus === "AWAITING_MLGOO_APPROVAL") {
    events.push({
      id: "phase3-mlgoo-approval",
      title: "Phase 3: MLGOO Approval",
      description: "Awaiting final approval from MLGOO",
      status: "current",
      phase: 3,
    });
  } else if (isPhase3Complete) {
    events.push({
      id: "phase3-mlgoo-approved",
      title: "Phase 3: MLGOO Approved",
      description: "Assessment approved by MLGOO",
      status: "completed",
      phase: 3,
    });
  }

  // Phase 4: Verdict (final result) - Skip during MLGOO RE-calibration (shows in RE-calibration)
  if (!isMlgooRecalibration) {
    events.push({
      id: "phase4-verdict",
      title: "Verdict: SGLGB Result",
      description: isPhase3Complete
        ? "Classification completed"
        : "Result will be available after MLGOO approval",
      date: formatDate(validatedAt),
      status: isPhase3Complete ? "completed" : "pending",
      phase: 3,
    });
  }

  return events;
}

export function PhaseTimeline({
  submittedAt,
  reworkRequestedAt,
  validatedAt,
  currentStatus,
  isCalibrationRework,
  isMlgooRecalibration = false,
  mlgooRecalibrationRequestedAt,
  reworkCount,
  className,
}: PhaseTimelineProps) {
  const events = buildTimelineEvents(
    submittedAt,
    reworkRequestedAt,
    validatedAt,
    currentStatus,
    isCalibrationRework,
    isMlgooRecalibration,
    mlgooRecalibrationRequestedAt,
    reworkCount
  );

  return (
    <div className={cn("relative", className)}>
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Assessment Journey</h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* Events */}
        <div className="space-y-4">
          {events.map((event, index) => {
            const isLast = index === events.length - 1;

            return (
              <div key={event.id} className="relative flex gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 w-8 h-8 rounded-full flex items-center justify-center",
                    event.status === "completed"
                      ? "bg-green-500"
                      : event.status === "current"
                        ? "bg-yellow-500"
                        : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  {event.status === "completed" ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : event.status === "current" ? (
                    <Clock className="w-5 h-5 text-white" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </div>

                {/* Content */}
                <div
                  className={cn(
                    "flex-1 pb-4",
                    !isLast && "border-b border-gray-100 dark:border-gray-800"
                  )}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "font-medium",
                        event.status === "completed"
                          ? "text-green-700 dark:text-green-400"
                          : event.status === "current"
                            ? "text-yellow-700 dark:text-yellow-400"
                            : "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {event.title}
                    </span>
                    {event.id.includes("rework") || event.id.includes("calibration") ? (
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                    ) : null}
                  </div>

                  {event.description && (
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                      {event.description}
                    </p>
                  )}

                  {event.date && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{event.date}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
