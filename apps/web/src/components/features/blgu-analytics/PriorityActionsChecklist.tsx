"use client";

import { CheckSquare, User, Target } from "lucide-react";
import { PriorityAction, isStringArray } from "@/types/capdev";

interface PriorityActionsChecklistProps {
  actions?: PriorityAction[] | string[];
}

/**
 * Checklist-style display of priority actions
 */
export function PriorityActionsChecklist({ actions }: PriorityActionsChecklistProps) {
  if (!actions || actions.length === 0) {
    return null;
  }

  // Timeline badge styling
  const getTimelineStyle = (timeline?: string) => {
    const normalizedTimeline = timeline?.toLowerCase();
    switch (normalizedTimeline) {
      case "immediate":
        return "bg-red-100 text-red-700 border-red-200";
      case "short-term":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "long-term":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <CheckSquare className="w-4 h-4 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Priority Actions</h3>
      </div>

      <div className="space-y-3">
        {isStringArray(actions)
          ? // Handle string array format
            actions.map((action, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]"
              >
                <div className="w-6 h-6 flex-shrink-0 rounded border-2 border-[var(--cityscape-yellow)] flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-[var(--cityscape-yellow)]">
                    {idx + 1}
                  </span>
                </div>
                <p className="text-[var(--foreground)] text-base">{action}</p>
              </div>
            ))
          : // Handle object format
            actions.map((action, idx) => {
              // Type guard check
              if (typeof action === "string") {
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]"
                  >
                    <div className="w-6 h-6 flex-shrink-0 rounded border-2 border-[var(--cityscape-yellow)] flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold text-[var(--cityscape-yellow)]">
                        {idx + 1}
                      </span>
                    </div>
                    <p className="text-[var(--foreground)] text-base">{action}</p>
                  </div>
                );
              }

              const priorityAction = action as PriorityAction;
              return (
                <div
                  key={idx}
                  className="p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 flex-shrink-0 rounded border-2 border-[var(--cityscape-yellow)] flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold text-[var(--cityscape-yellow)]">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-[var(--foreground)]">
                          {priorityAction.action}
                        </p>
                        {priorityAction.timeline && (
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full border flex-shrink-0 ${getTimelineStyle(priorityAction.timeline)}`}
                          >
                            {priorityAction.timeline}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
                        {priorityAction.responsible_party && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {priorityAction.responsible_party}
                          </span>
                        )}
                        {priorityAction.success_indicator && (
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            <span className="text-green-600">
                              {priorityAction.success_indicator}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
