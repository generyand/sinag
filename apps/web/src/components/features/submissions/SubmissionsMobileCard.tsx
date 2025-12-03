"use client";

import { Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStatusConfig, getProgressBarColor } from "./utils/statusConfig";
import type { SubmissionUIModel } from "./utils/dataTransformers";

interface SubmissionsMobileCardProps {
  submission: SubmissionUIModel;
  onView: (submission: SubmissionUIModel) => void;
  onRemind: (submission: SubmissionUIModel) => void;
}

/**
 * Mobile-friendly card view for a single submission.
 * Used on smaller screens instead of the table layout.
 */
export function SubmissionsMobileCard({
  submission,
  onView,
  onRemind,
}: SubmissionsMobileCardProps) {
  const statusConfig = getStatusConfig(submission.currentStatus);
  const StatusIcon = statusConfig.icon;
  const progressColor = getProgressBarColor(submission.overallProgress);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-4 shadow-sm">
      {/* Header: Barangay name and status */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-semibold text-[var(--foreground)] text-base">
          {submission.barangayName}
        </h3>
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium shrink-0"
          style={{
            backgroundColor: statusConfig.bgColor,
            color: statusConfig.textColor,
          }}
        >
          <StatusIcon className="h-3 w-3" aria-hidden="true" />
          {submission.currentStatus}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-[var(--muted-foreground)]">Progress</span>
          <span className="font-medium text-[var(--foreground)]">
            {submission.overallProgress}%
          </span>
        </div>
        <div className="w-full bg-[var(--border)] rounded-sm h-2">
          <div
            className="h-2 rounded-sm transition-all duration-300"
            style={{
              backgroundColor: progressColor,
              width: `${submission.overallProgress}%`,
            }}
          />
        </div>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <span className="text-[var(--muted-foreground)] block mb-0.5">
            Validators
          </span>
          <div className="flex items-center gap-1.5">
            {submission.assignedValidators.length > 0 ? (
              submission.assignedValidators.slice(0, 3).map((validator) => (
                <div
                  key={validator.id}
                  role="img"
                  aria-label={`Validator: ${validator.name}`}
                  title={validator.name}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm"
                >
                  {validator.avatar}
                </div>
              ))
            ) : (
              <span className="text-[var(--muted-foreground)] italic">
                None assigned
              </span>
            )}
            {submission.assignedValidators.length > 3 && (
              <span className="text-xs text-[var(--muted-foreground)]">
                +{submission.assignedValidators.length - 3}
              </span>
            )}
          </div>
        </div>
        <div>
          <span className="text-[var(--muted-foreground)] block mb-0.5">
            Last Updated
          </span>
          <span className="text-[var(--foreground)]">
            {submission.lastUpdated}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onView(submission)}
          aria-label={`View details for ${submission.barangayName}`}
          className="flex-1 bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-white rounded-sm font-medium"
        >
          <Eye className="h-4 w-4 mr-1.5" aria-hidden="true" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRemind(submission)}
          aria-label={`Send reminder to ${submission.barangayName}`}
          title="Send a reminder email to the barangay to complete their submission"
          className="flex-1 bg-[var(--background)] hover:bg-[var(--cityscape-yellow)]/10 hover:border-[var(--cityscape-yellow)] border-[var(--border)] text-[var(--foreground)] rounded-sm font-medium"
        >
          <Send className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Remind
        </Button>
      </div>
    </div>
  );
}

interface SubmissionsMobileListProps {
  submissions: SubmissionUIModel[];
  onView: (submission: SubmissionUIModel) => void;
  onRemind: (submission: SubmissionUIModel) => void;
}

/**
 * Mobile-friendly list of submission cards.
 */
export function SubmissionsMobileList({
  submissions,
  onView,
  onRemind,
}: SubmissionsMobileListProps) {
  return (
    <div className="space-y-3 p-4 lg:hidden">
      {submissions.map((submission) => (
        <SubmissionsMobileCard
          key={submission.id}
          submission={submission}
          onView={onView}
          onRemind={onRemind}
        />
      ))}
    </div>
  );
}
