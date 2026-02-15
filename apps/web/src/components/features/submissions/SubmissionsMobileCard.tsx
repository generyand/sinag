"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Eye, Info, Loader2, Send } from "lucide-react";
import { NeedsReworkPopover } from "./NeedsReworkPopover";
import {
  getAreasBreakdownWithAssessors,
  getValidatorDisplayStatus,
  type SubmissionUIModel,
} from "./utils/dataTransformers";
import {
  getProgressBarColor,
  getStatusConfig,
  getStatusClickTooltip,
  isStatusClickable,
} from "./utils/statusConfig";

interface SubmissionsMobileCardProps {
  submission: SubmissionUIModel;
  onView: (submission: SubmissionUIModel) => void;
  onRemind: (submission: SubmissionUIModel) => void;
  remindingId?: number | null;
}

/**
 * Assessors progress row with tooltip showing detailed breakdown.
 */
function AssessorsProgressRow({ submission }: { submission: SubmissionUIModel }) {
  const { areasReviewedCount, areaApprovalStatus, reviewers, areaReworkInfo } = submission;
  const isComplete = areasReviewedCount === 6;
  const { reviewed, sentForRework, missing } = getAreasBreakdownWithAssessors(
    areaApprovalStatus,
    reviewers,
    areaReworkInfo
  );

  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-[var(--foreground)]">Assessors:</span>
      <span
        className={
          isComplete ? "text-green-600 dark:text-green-400 font-medium" : "text-[var(--foreground)]"
        }
      >
        {areasReviewedCount}/6
      </span>
      {isComplete ? (
        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
          <Check className="h-3.5 w-3.5" />
          Complete
        </span>
      ) : (
        <span className="text-[var(--muted-foreground)]">Submitted</span>
      )}
      {/* Info icon with tooltip showing assessor breakdown */}
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              aria-label="View assessor details"
            >
              <Info className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="start"
            className="bg-[var(--card)] border border-[var(--border)] shadow-lg p-3 max-w-xs"
          >
            <div className="space-y-3 text-xs">
              {reviewed.length > 0 && (
                <div>
                  <div className="font-semibold text-green-600 dark:text-green-400 mb-1.5">
                    Reviewed ({reviewed.length}):
                  </div>
                  <ul className="space-y-1 ml-2">
                    {reviewed.map((area) => (
                      <li key={area.areaId} className="text-[var(--foreground)]">
                        <span className="font-medium">{area.areaName}</span>
                        {area.assessorName && (
                          <span className="text-[var(--muted-foreground)]">
                            {" "}
                            — {area.assessorName}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {sentForRework.length > 0 && (
                <div>
                  <div className="font-semibold text-orange-600 dark:text-orange-400 mb-1.5">
                    Sent for Rework ({sentForRework.length}):
                  </div>
                  <ul className="space-y-1 ml-2">
                    {sentForRework.map((area) => (
                      <li key={area.areaId} className="text-[var(--foreground)]">
                        <span className="font-medium">{area.areaName}</span>
                        {area.assessorName && (
                          <span className="text-[var(--muted-foreground)]">
                            {" "}
                            — {area.assessorName}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {missing.length > 0 && (
                <div>
                  <div className="font-semibold text-amber-600 dark:text-amber-400 mb-1.5">
                    Missing ({missing.length}):
                  </div>
                  <ul className="space-y-1 ml-2">
                    {missing.map((area) => (
                      <li key={area.areaId} className="text-[var(--foreground)]">
                        {area.areaName}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/**
 * Mobile-friendly card view for a single submission.
 * Used on smaller screens instead of the table layout.
 */
export function SubmissionsMobileCard({
  submission,
  onView,
  onRemind,
  remindingId,
}: SubmissionsMobileCardProps) {
  const statusConfig = getStatusConfig(submission.currentStatus);
  const StatusIcon = statusConfig.icon;
  const progressColor = getProgressBarColor(submission.overallProgress);
  const validatorDisplay = getValidatorDisplayStatus(submission);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-4 shadow-sm">
      {/* Header: Barangay name and status */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-semibold text-[var(--foreground)] text-base">
          Brgy. {submission.barangayName}
        </h3>
        {submission.currentStatus === "Needs Rework" ? (
          /* Needs Rework: Show popover with assessor details */
          <NeedsReworkPopover submission={submission} statusConfig={statusConfig} />
        ) : isStatusClickable(submission.currentStatus) ? (
          <button
            onClick={() => onView(submission)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium shrink-0 cursor-pointer transition-all duration-200 hover:opacity-80 hover:ring-2 hover:ring-offset-1 hover:ring-current"
            style={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.textColor,
            }}
            aria-label={`${submission.currentStatus} - Click to view details`}
            title={getStatusClickTooltip(submission.currentStatus) ?? undefined}
          >
            <StatusIcon className="h-3 w-3" aria-hidden="true" />
            {submission.currentStatus}
          </button>
        ) : (
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
        )}
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
      <div className="space-y-2 mb-4 text-sm">
        {/* Assessors Progress with detailed tooltip */}
        <AssessorsProgressRow submission={submission} />
        {/* Validator Status */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--foreground)]">Validator:</span>
          <span className={validatorDisplay.className}>{validatorDisplay.text}</span>
        </div>
        {/* Last Updated */}
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted-foreground)]">Updated:</span>
          <span className="text-[var(--foreground)]">{submission.lastUpdated}</span>
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
          disabled={remindingId === submission.id}
          aria-label={`Send reminder to ${submission.barangayName}`}
          title="Send a reminder email to the barangay to complete their submission"
          className="flex-1 bg-[var(--background)] hover:bg-[var(--cityscape-yellow)]/10 hover:border-[var(--cityscape-yellow)] border-[var(--border)] text-[var(--foreground)] rounded-sm font-medium disabled:opacity-50"
        >
          {remindingId === submission.id ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4 mr-1.5" aria-hidden="true" />
          )}
          {remindingId === submission.id ? "Sending..." : "Remind"}
        </Button>
      </div>
    </div>
  );
}

interface SubmissionsMobileListProps {
  submissions: SubmissionUIModel[];
  onView: (submission: SubmissionUIModel) => void;
  onRemind: (submission: SubmissionUIModel) => void;
  remindingId?: number | null;
}

/**
 * Mobile-friendly list of submission cards.
 */
export function SubmissionsMobileList({
  submissions,
  onView,
  onRemind,
  remindingId,
}: SubmissionsMobileListProps) {
  return (
    <div className="space-y-3 p-4 lg:hidden">
      {submissions.map((submission) => (
        <SubmissionsMobileCard
          key={submission.id}
          submission={submission}
          onView={onView}
          onRemind={onRemind}
          remindingId={remindingId}
        />
      ))}
    </div>
  );
}
