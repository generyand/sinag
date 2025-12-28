"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Indicator Navigation List Component
 *
 * Displays indicators grouped by governance area with completion status.
 * Provides navigation to individual indicator pages.
 *
 * IMPORTANT: Shows ONLY completion status (complete/incomplete).
 * NEVER shows compliance status (PASS/FAIL/CONDITIONAL).
 */

interface IndicatorNavigationItem {
  indicator_id: number;
  title: string;
  completion_status: "complete" | "incomplete";
  route_path: string;
  governance_area_name: string;
  governance_area_id: number;
}

interface IndicatorNavigationListProps {
  items: IndicatorNavigationItem[];
}

interface GroupedIndicators {
  [governanceAreaId: number]: {
    name: string;
    indicators: IndicatorNavigationItem[];
  };
}

export function IndicatorNavigationList({ items }: IndicatorNavigationListProps) {
  const router = useRouter();
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set());

  // Group indicators by governance area
  const groupedIndicators: GroupedIndicators = items.reduce((acc, item) => {
    const areaId = item.governance_area_id;
    if (!acc[areaId]) {
      acc[areaId] = {
        name: item.governance_area_name,
        indicators: [],
      };
    }
    acc[areaId].indicators.push(item);
    return acc;
  }, {} as GroupedIndicators);

  const toggleArea = (areaId: number) => {
    setExpandedAreas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(areaId)) {
        newSet.delete(areaId);
      } else {
        newSet.add(areaId);
      }
      return newSet;
    });
  };

  const handleIndicatorClick = (routePath: string) => {
    router.push(routePath);
  };

  return (
    <div className="space-y-2">
      {Object.entries(groupedIndicators).map(
        ([areaIdStr, areaData]: [string, GroupedIndicators[number]]) => {
          const areaId = parseInt(areaIdStr);
          const isExpanded = expandedAreas.has(areaId);
          const completedCount = areaData.indicators.filter(
            (ind: IndicatorNavigationItem) => ind.completion_status === "complete"
          ).length;
          const totalCount = areaData.indicators.length;

          return (
            <div
              key={areaId}
              className="bg-[var(--card)] rounded-lg border border-[var(--border)] overflow-hidden"
            >
              {/* Governance Area Header */}
              <button
                onClick={() => toggleArea(areaId)}
                className="w-full flex items-center justify-between p-4 hover:bg-[var(--hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
                  )}
                  <span className="font-semibold text-[var(--foreground)]">{areaData.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {completedCount}/{totalCount} completed
                  </span>
                  {completedCount === totalCount ? (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  ) : (
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  )}
                </div>
              </button>

              {/* Indicator List */}
              {isExpanded && (
                <div className="border-t border-[var(--border)]">
                  {areaData.indicators.map((indicator: IndicatorNavigationItem) => (
                    <button
                      key={indicator.indicator_id}
                      onClick={() => handleIndicatorClick(indicator.route_path)}
                      className="w-full flex items-center justify-between p-3 px-4 hover:bg-[var(--hover)] transition-colors border-b border-[var(--border)] last:border-b-0"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            indicator.completion_status === "complete"
                              ? "bg-green-500"
                              : "bg-amber-500"
                          }`}
                        />
                        <span className="text-sm text-[var(--foreground)]">{indicator.title}</span>
                      </div>
                      <div>
                        {indicator.completion_status === "complete" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                            Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Incomplete
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }
      )}
    </div>
  );
}
