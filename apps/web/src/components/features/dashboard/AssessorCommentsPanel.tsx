/**
 * Assessor Comments Panel Component
 *
 * Displays assessor feedback comments and MOV annotations when assessment needs rework.
 * Only shows public comments (excludes internal assessor notes).
 *
 * IMPORTANT: This component shows feedback for completion purposes only.
 * Comments are about missing/incomplete fields, NOT compliance status.
 */

"use client";

import { useState } from "react";
import {
  MessageSquare,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import type { ReworkComment } from "@sinag/shared";

interface MOVAnnotation {
  annotation_id: number;
  mov_file_id: number;
  mov_filename: string;
  mov_file_type: string;
  annotation_type: string;
  page: number;
  comment: string;
  created_at: string | null;
}

interface AssessorCommentsPanelProps {
  comments: ReworkComment[] | null;
  movAnnotationsByIndicator?: Record<number, MOVAnnotation[]> | null;
}

export function AssessorCommentsPanel({
  comments,
  movAnnotationsByIndicator,
}: AssessorCommentsPanelProps) {
  const [expandedIndicators, setExpandedIndicators] = useState<Set<number>>(new Set());

  // Don't render if no comments AND no MOV annotations
  if (
    (!comments || comments.length === 0) &&
    (!movAnnotationsByIndicator || Object.keys(movAnnotationsByIndicator).length === 0)
  ) {
    return null;
  }

  // Group and deduplicate comments by indicator
  const groupedComments =
    comments?.reduce(
      (acc, comment) => {
        const indicatorId = comment.indicator_id;
        if (!acc[indicatorId]) {
          acc[indicatorId] = {
            indicator_name: comment.indicator_name,
            uniqueComments: new Map<string, ReworkComment>(), // Use Map to deduplicate by comment text
          };
        }

        // Deduplicate: only keep the first occurrence of each unique comment text
        const commentText = comment.comment.trim();
        if (!acc[indicatorId].uniqueComments.has(commentText)) {
          acc[indicatorId].uniqueComments.set(commentText, comment);
        }

        return acc;
      },
      {} as Record<number, { indicator_name: string; uniqueComments: Map<string, ReworkComment> }>
    ) || {};

  const toggleIndicator = (indicatorId: number) => {
    setExpandedIndicators((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(indicatorId)) {
        newSet.delete(indicatorId);
      } else {
        newSet.add(indicatorId);
      }
      return newSet;
    });
  };

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

  // Merge indicator IDs from both comments and MOV annotations
  const allIndicatorIds = new Set<number>([
    ...Object.keys(groupedComments).map(Number),
    ...Object.keys(movAnnotationsByIndicator || {}).map(Number),
  ]);

  const totalIndicators = allIndicatorIds.size;
  const totalUniqueComments = Object.values(groupedComments).reduce(
    (sum, group) => sum + group.uniqueComments.size,
    0
  );
  const totalMovAnnotations = Object.values(movAnnotationsByIndicator || {}).reduce(
    (sum, annotations) => sum + annotations.length,
    0
  );

  return (
    <div className="bg-[var(--card)] rounded-sm border border-[var(--border)] shadow-sm">
      {/* Compact Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--border)] bg-amber-50 dark:bg-amber-950/20">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Assessor Feedback ({totalIndicators}{" "}
            {totalIndicators === 1 ? "Indicator" : "Indicators"})
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {totalUniqueComments > 0 &&
              `${totalUniqueComments} text ${totalUniqueComments === 1 ? "comment" : "comments"}`}
            {totalUniqueComments > 0 && totalMovAnnotations > 0 && " • "}
            {totalMovAnnotations > 0 &&
              `${totalMovAnnotations} MOV ${totalMovAnnotations === 1 ? "annotation" : "annotations"}`}
          </p>
        </div>
      </div>

      {/* Accordion-style feedback (comments + MOV annotations) */}
      <div className="divide-y divide-[var(--border)]">
        {Array.from(allIndicatorIds)
          .sort((a, b) => a - b)
          .map((indicatorId) => {
            const commentGroup = groupedComments[indicatorId];
            const movAnnotations = movAnnotationsByIndicator?.[indicatorId] || [];
            const commentsArray = commentGroup
              ? Array.from(commentGroup.uniqueComments.values())
              : [];
            const isExpanded = expandedIndicators.has(indicatorId);

            // Get indicator name from comments or use fallback
            const indicatorName = commentGroup?.indicator_name || `Indicator ${indicatorId}`;

            const totalFeedbackItems = commentsArray.length + movAnnotations.length;

            return (
              <div key={indicatorId}>
                {/* Indicator Header (Clickable) */}
                <button
                  onClick={() => toggleIndicator(indicatorId)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-[var(--hover)] transition-colors text-left"
                >
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                    )}
                  </div>
                  <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-[var(--foreground)] truncate">
                      {indicatorName}
                    </h4>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {commentsArray.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                        {commentsArray.length} {commentsArray.length === 1 ? "comment" : "comments"}
                      </span>
                    )}
                    {movAnnotations.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
                        {movAnnotations.length} MOV{" "}
                        {movAnnotations.length === 1 ? "annotation" : "annotations"}
                      </span>
                    )}
                  </div>
                </button>

                {/* Feedback (Collapsible) */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3">
                    {/* Text Comments */}
                    {commentsArray.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 ml-7 uppercase tracking-wide">
                          Text Comments
                        </div>
                        {commentsArray.map((comment, index) => (
                          <div
                            key={`comment-${index}`}
                            className="bg-blue-50 dark:bg-blue-950/20 rounded-sm p-3 border-l-2 border-blue-500 ml-7"
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <MessageSquare className="w-3 h-3 text-blue-600" />
                              <span className="text-xs text-[var(--text-secondary)]">
                                {formatDate(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--foreground)] leading-relaxed">
                              {comment.comment}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* MOV Annotations */}
                    {movAnnotations.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 ml-7 uppercase tracking-wide">
                          MOV Annotations
                        </div>
                        {movAnnotations.map((annotation, index) => (
                          <div
                            key={`mov-${index}`}
                            className="bg-purple-50 dark:bg-purple-950/20 rounded-sm p-3 border-l-2 border-purple-500 ml-7"
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              {annotation.mov_file_type === "application/pdf" ? (
                                <FileText className="w-3 h-3 text-purple-600" />
                              ) : (
                                <ImageIcon className="w-3 h-3 text-purple-600" />
                              )}
                              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                {annotation.mov_filename}
                              </span>
                              {annotation.annotation_type === "pdfRect" &&
                                annotation.page !== undefined && (
                                  <span className="text-xs text-[var(--text-secondary)]">
                                    (Page {annotation.page + 1})
                                  </span>
                                )}
                              <span className="text-xs text-[var(--text-secondary)] ml-auto">
                                {formatDate(annotation.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--foreground)] leading-relaxed">
                              {annotation.comment}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Compact Footer */}
      <div className="p-3 border-t border-[var(--border)] bg-blue-50 dark:bg-blue-950/20">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          💡 Tip: Click an indicator above to expand/collapse its comments. Navigate to each
          indicator to update your responses.
        </p>
      </div>
    </div>
  );
}
