"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, User } from "lucide-react";
import type { SubmissionUIModel } from "./utils/dataTransformers";

interface NeedsReworkPopoverProps {
  submission: SubmissionUIModel;
  statusConfig: {
    bgColor: string;
    textColor: string;
    icon: React.ElementType;
  };
}

/**
 * A clickable "Needs Rework" badge that displays a popover with details about
 * which assessors sent the assessment for rework.
 */
export function NeedsReworkPopover({ submission, statusConfig }: NeedsReworkPopoverProps) {
  const StatusIcon = statusConfig.icon;
  const reworkInfo = submission.areaReworkInfo || [];
  const reworkCount = reworkInfo.length;

  // Count unique assessors who sent for rework
  const uniqueAssessorsCount = new Set(reworkInfo.map((info) => info.assessorId)).size;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium cursor-pointer transition-all duration-200 hover:opacity-80 hover:ring-2 hover:ring-offset-1 hover:ring-current"
          style={{
            backgroundColor: statusConfig.bgColor,
            color: statusConfig.textColor,
          }}
          aria-label={`Needs Rework - ${reworkCount} area(s) flagged by ${uniqueAssessorsCount} assessor(s). Click for details.`}
        >
          <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Needs Rework
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label="Rework details - assessors who flagged this assessment"
        className="w-80 bg-[var(--card)] border border-[var(--border)] shadow-xl p-0"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--border)] bg-amber-50 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <h4 className="font-semibold text-[var(--foreground)]">Rework Required</h4>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {reworkCount > 0 ? (
              <>
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  {reworkCount} area{reworkCount !== 1 ? "s" : ""}
                </span>{" "}
                flagged by{" "}
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  {uniqueAssessorsCount} assessor{uniqueAssessorsCount !== 1 ? "s" : ""}
                </span>
              </>
            ) : (
              "No rework details available"
            )}
          </p>
        </div>

        {/* Content */}
        <div className="max-h-60 overflow-y-auto">
          {reworkCount > 0 ? (
            <ul role="list" className="divide-y divide-[var(--border)]">
              {reworkInfo.map((info, index) => (
                <li key={`${info.governanceAreaId}-${index}`} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {info.assessorName}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        {info.governanceAreaName}
                      </p>
                      {info.reworkRequestedAt && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          {new Date(info.reworkRequestedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                No detailed rework information available.
              </p>
            </div>
          )}
        </div>

        {/* Footer with summary */}
        {reworkCount > 0 && (
          <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--muted)]/30">
            <p className="text-xs text-[var(--muted-foreground)]">
              Click "View" to see indicators marked for rework
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
