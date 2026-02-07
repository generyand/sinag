/**
 * Failed Indicator Card Component - ENHANCED VERSION
 *
 * Displays a single failed indicator with feedback summary and action button.
 * Used within ReworkIndicatorsPanel to show indicators requiring resubmission.
 *
 * ENHANCEMENTS:
 * - Shows addressed status badge (Fixed/Needs Attention)
 * - Displays preview of first comment if available
 * - Better visual hierarchy with improved colors and spacing
 * - More prominent hover state with shadow and border animation
 * - Clearer feedback type indicators with counts
 *
 * NOTE: Uses `is_addressed` (new file uploaded after rework) to determine "Fixed" status,
 * NOT `is_complete`. An indicator is "Fixed" only when BLGU uploads new files after rework.
 */

"use client";

import { AlertCircle, MessageSquare, FileText, ChevronRight, CheckCircle2 } from "lucide-react";
import type { FailedIndicator } from "@/types/rework";

interface FailedIndicatorCardProps {
  failed: FailedIndicator;
  onFixClick: () => void;
}

export function FailedIndicatorCard({ failed, onFixClick }: FailedIndicatorCardProps) {
  // Get first comment preview
  const firstComment = failed.comments[0]?.comment || failed.annotations[0]?.comment;
  const commentPreview =
    firstComment && firstComment.length > 100
      ? firstComment.substring(0, 100) + "..."
      : firstComment;

  // Use is_addressed to determine if indicator is "Fixed"
  // An indicator is addressed when BLGU uploads new files after rework was requested
  const isFixed = failed.is_addressed;

  return (
    <button
      onClick={onFixClick}
      className={`w-full flex items-start gap-4 p-4 rounded-sm border-2 transition-all text-left group ${
        isFixed
          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 hover:border-green-400 dark:hover:border-green-600 hover:shadow-md"
          : "border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-900 hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-lg hover:scale-[1.01]"
      }`}
    >
      {/* Left: Status Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <div
          className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
            isFixed
              ? "bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50"
              : "bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50"
          }`}
        >
          {isFixed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          )}
        </div>
      </div>

      {/* Middle: Indicator Info */}
      <div className="flex-1 min-w-0">
        {/* Indicator Name and Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">
            {failed.indicator_name}
          </h4>
          {isFixed ? (
            <span className="flex-shrink-0 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-1 rounded-sm font-medium border border-green-200 dark:border-green-800">
              Fixed
            </span>
          ) : (
            <span className="flex-shrink-0 text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 px-2 py-1 rounded-sm font-medium border border-orange-200 dark:border-orange-800">
              Needs Attention
            </span>
          )}
        </div>

        {/* Feedback Summary with Counts */}
        {failed.total_feedback_items > 0 && (
          <div className="flex items-center gap-4 mb-2">
            {failed.comments.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-sm">
                <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium">
                  {failed.comments.length} {failed.comments.length === 1 ? "comment" : "comments"}
                </span>
              </div>
            )}
            {failed.annotations.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-sm">
                <FileText className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span className="font-medium">
                  {failed.annotations.length}{" "}
                  {failed.annotations.length === 1 ? "annotation" : "annotations"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Comment Preview - show only if not fixed */}
        {commentPreview && !isFixed && (
          <div className="text-xs text-gray-600 dark:text-gray-400 italic leading-relaxed bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-sm border-l-2 border-orange-300 dark:border-orange-600">
            "{commentPreview}"
          </div>
        )}
      </div>

      {/* Right: Action Icon */}
      <div className="flex-shrink-0 mt-1">
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
      </div>
    </button>
  );
}
