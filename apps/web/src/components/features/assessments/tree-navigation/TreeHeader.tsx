"use client";

import { Target } from "lucide-react";

interface TreeHeaderProps {
  completedIndicators: number;
  totalIndicators: number;
  assessmentStatus?: string;
}

export function TreeHeader({
  completedIndicators,
  totalIndicators,
  assessmentStatus,
}: TreeHeaderProps) {
  const percentage =
    totalIndicators > 0
      ? Math.round((completedIndicators / totalIndicators) * 100)
      : 0;

  // Hide completion counter when assessment is under validator review or completed
  const isUnderReview = assessmentStatus && [
    "AWAITING_FINAL_VALIDATION",
    "SUBMITTED_FOR_REVIEW",
    "SUBMITTED",
    "IN_REVIEW",
    "COMPLETED"
  ].includes(assessmentStatus);

  if (isUnderReview) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 bg-muted/5 border-b border-[var(--border)] h-14 flex items-center px-3 shrink-0">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Assessment Progress
        </h2>
      </div>
    </div>
  );
}
