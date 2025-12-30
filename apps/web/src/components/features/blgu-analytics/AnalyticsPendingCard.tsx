"use client";

import { Clock, FileCheck, Sparkles } from "lucide-react";

interface AnalyticsPendingCardProps {
  status: string;
  statusLabel: string;
}

/**
 * Shown when assessment is not yet COMPLETED
 * Explains that CapDev insights are generated after MLGOO approval
 */
export function AnalyticsPendingCard({ status, statusLabel }: AnalyticsPendingCardProps) {
  // Map assessment status to progress percentage
  const getProgressPercent = () => {
    const statusMap: Record<string, number> = {
      DRAFT: 10,
      SUBMITTED: 30,
      IN_REVIEW: 45,
      REWORK: 35,
      AWAITING_FINAL_VALIDATION: 60,
      AWAITING_MLGOO_APPROVAL: 85,
      COMPLETED: 100,
    };
    return statusMap[status] || 0;
  };

  const progress = getProgressPercent();

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
          Capacity Development (CapDev) recommendations will be generated automatically
          once your assessment is approved by MLGOO. These AI-powered insights will help
          your barangay improve governance performance.
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
