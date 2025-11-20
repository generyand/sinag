/**
 * Failed Indicator Card Component
 *
 * Displays a single failed indicator with feedback summary and action button.
 * Used within ReworkIndicatorsPanel to show indicators requiring resubmission.
 */

"use client";

import { AlertCircle, MessageSquare, FileText, ChevronRight } from "lucide-react";
import type { FailedIndicator } from "@/types/rework";

interface FailedIndicatorCardProps {
  failed: FailedIndicator;
  onFixClick: () => void;
}

export function FailedIndicatorCard({ failed, onFixClick }: FailedIndicatorCardProps) {
  return (
    <button
      onClick={onFixClick}
      className="w-full flex items-center gap-4 p-4 rounded-sm border-2 border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 hover:border-red-400 dark:hover:border-red-600 hover:shadow-md transition-all text-left"
    >
      {/* Left: Status Icon */}
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
      </div>

      {/* Middle: Indicator Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">
          {failed.indicator_name}
        </div>

        {/* Feedback Summary */}
        {failed.total_feedback_items > 0 && (
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            {failed.comments.length > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {failed.comments.length} {failed.comments.length === 1 ? "comment" : "comments"}
              </span>
            )}
            {failed.annotations.length > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {failed.annotations.length} {failed.annotations.length === 1 ? "annotation" : "annotations"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Action Icon */}
      <div className="flex-shrink-0">
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>
    </button>
  );
}
