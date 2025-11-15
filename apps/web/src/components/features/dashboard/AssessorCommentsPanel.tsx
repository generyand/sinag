/**
 * Assessor Comments Panel Component
 *
 * Displays assessor feedback comments when assessment needs rework.
 * Only shows public comments (excludes internal assessor notes).
 *
 * IMPORTANT: This component shows feedback for completion purposes only.
 * Comments are about missing/incomplete fields, NOT compliance status.
 */

import { MessageSquare, AlertCircle } from "lucide-react";
import type { ReworkComment } from "@vantage/shared";

interface AssessorCommentsPanelProps {
  comments: ReworkComment[] | null;
}

export function AssessorCommentsPanel({
  comments,
}: AssessorCommentsPanelProps) {
  // Don't render if no comments
  if (!comments || comments.length === 0) {
    return null;
  }

  // Group comments by indicator
  const groupedComments = comments.reduce((acc, comment) => {
    const indicatorId = comment.indicator_id;
    if (!acc[indicatorId]) {
      acc[indicatorId] = {
        indicator_name: comment.indicator_name,
        comments: [],
      };
    }
    acc[indicatorId].comments.push(comment);
    return acc;
  }, {} as Record<number, { indicator_name: string; comments: ReworkComment[] }>);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Recently";
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
      return "Recently";
    }
  };

  const getCommentTypeColor = (commentType: string) => {
    switch (commentType.toLowerCase()) {
      case "specific issue":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "general":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-[var(--text-muted)] bg-[var(--hover)] border-[var(--border)]";
    }
  };

  return (
    <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6 pb-4 border-b border-[var(--border)]">
        <div className="flex-shrink-0 mt-1">
          <AlertCircle className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
            Action Required: Assessor Feedback
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Please review and address the following comments from the assessor before resubmitting your assessment.
          </p>
        </div>
      </div>

      {/* Comments grouped by indicator */}
      <div className="space-y-6">
        {Object.entries(groupedComments).map(([indicatorIdStr, group]) => (
          <div
            key={indicatorIdStr}
            className="bg-[var(--hover)] rounded-lg p-4 border border-[var(--border)]"
          >
            {/* Indicator Name */}
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-[var(--text-secondary)]" />
              <h4 className="font-semibold text-[var(--foreground)]">
                {group.indicator_name}
              </h4>
            </div>

            {/* Comments for this indicator */}
            <div className="space-y-3">
              {group.comments.map((comment, index) => (
                <div
                  key={index}
                  className="bg-[var(--card)] rounded-md p-3 border-l-4 border-amber-500"
                >
                  {/* Comment metadata */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getCommentTypeColor(
                        comment.comment_type
                      )}`}
                    >
                      {comment.comment_type}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>

                  {/* Comment text */}
                  <p className="text-sm text-[var(--foreground)]">
                    {comment.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer with action prompt */}
      <div className="mt-6 pt-4 border-t border-[var(--border)]">
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            💡 Tip: Click on an indicator in the navigation above to review and update your responses.
          </p>
        </div>
      </div>
    </div>
  );
}
