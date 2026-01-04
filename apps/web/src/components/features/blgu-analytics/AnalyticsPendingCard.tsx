"use client";

import { Clock, FileCheck, Sparkles } from "lucide-react";

interface AnalyticsPendingCardProps {
  status: string;
  statusLabel: string;
  /** Indicator completion percentage (0-100) for dynamic progress within phases */
  completionPercentage?: number;
  /** Whether this is a calibration rework (Phase 2 rework) */
  isCalibrationRework?: boolean;
  /** Whether this is an MLGOO recalibration */
  isMlgooRecalibration?: boolean;
}

/** Helper to check if status is a rework status */
function isReworkStatus(status: string): boolean {
  return status === "REWORK" || status === "NEEDS_REWORK";
}

/**
 * Calculate progress percentage based on status and completion.
 * Uses the same logic as AssessmentProgress component for consistency.
 *
 * Progress ranges:
 * - 0–20%: Preparation and Drafting (DRAFT)
 * - 20–45%: Phase 1 (SUBMITTED, IN_REVIEW)
 * - 45–55%: Phase 1 Rework
 * - 55–80%: Phase 2 (AWAITING_FINAL_VALIDATION)
 * - 80–90%: Phase 2 Calibration
 * - 90–100%: Final Approval (AWAITING_MLGOO_APPROVAL, COMPLETED)
 */
function calculateProgress(
  status: string,
  completionPercentage: number,
  isCalibrationRework: boolean,
  isMlgooRecalibration: boolean
): number {
  if (status === "COMPLETED") return 100;
  if (status === "AWAITING_MLGOO_APPROVAL") return 95;
  if (isMlgooRecalibration && isReworkStatus(status)) return 92;
  if (isCalibrationRework && isReworkStatus(status)) return 85;
  if (status === "AWAITING_FINAL_VALIDATION") return 65;
  if (isReworkStatus(status)) return 50;
  if (status === "IN_REVIEW") return 35;
  if (status === "SUBMITTED") return 25;
  if (status === "DRAFT") {
    // Scale completion percentage to the 0-20% range
    return Math.round((completionPercentage / 100) * 20);
  }
  return 0;
}

/**
 * Shown when assessment is not yet COMPLETED
 * Explains that CapDev insights are generated after MLGOO approval
 */
export function AnalyticsPendingCard({
  status,
  statusLabel,
  completionPercentage = 0,
  isCalibrationRework = false,
  isMlgooRecalibration = false,
}: AnalyticsPendingCardProps) {
  const progress = calculateProgress(
    status,
    completionPercentage,
    isCalibrationRework,
    isMlgooRecalibration
  );

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 sm:p-8">
      <div className="max-w-2xl mx-auto text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] mb-3">
          AI Insights Coming Soon
        </h2>

        {/* Description */}
        <p className="text-[var(--text-secondary)] mb-6 text-base sm:text-lg leading-relaxed">
          Capacity Development (CapDev) recommendations will be generated automatically once your
          assessment is approved by MLGOO. These AI-powered insights will help your barangay improve
          governance performance.
        </p>

        {/* Current Status Badge */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--muted)] rounded-full">
            <FileCheck className="w-4 h-4 text-[var(--cityscape-yellow)]" />
            <span className="text-sm font-medium text-[var(--foreground)]">
              Current Status: <span className="text-[var(--cityscape-yellow)]">{statusLabel}</span>
            </span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-[var(--text-secondary)]">Progress to completion</span>
            <span className="font-medium text-[var(--foreground)]">{progress}%</span>
          </div>
          <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* What you'll get section */}
        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--cityscape-yellow)]" />
            What you&apos;ll receive after approval:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-[var(--muted)] rounded-lg">
              <p className="font-medium text-[var(--foreground)]">Governance Insights</p>
              <p className="text-[var(--text-secondary)] text-xs mt-1">Areas for improvement</p>
            </div>
            <div className="p-3 bg-[var(--muted)] rounded-lg">
              <p className="font-medium text-[var(--foreground)]">Recommendations</p>
              <p className="text-[var(--text-secondary)] text-xs mt-1">Actionable next steps</p>
            </div>
            <div className="p-3 bg-[var(--muted)] rounded-lg">
              <p className="font-medium text-[var(--foreground)]">Priority Actions</p>
              <p className="text-[var(--text-secondary)] text-xs mt-1">What to do first</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
