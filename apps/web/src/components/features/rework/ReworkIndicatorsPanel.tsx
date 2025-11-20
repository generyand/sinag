/**
 * Rework Indicators Panel Component
 *
 * Displays all indicators that failed validation and require resubmission.
 * Shows indicators grouped by governance area with feedback summaries.
 *
 * PRIORITY COMPONENT: This is the main entry point for BLGU users to see
 * which indicators need attention when assessment status is REWORK/NEEDS_REWORK.
 */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FailedIndicatorCard } from "./FailedIndicatorCard";
import type { BLGUDashboardResponse } from "@vantage/shared";
import type { FailedIndicator } from "@/types/rework";

interface ReworkIndicatorsPanelProps {
  dashboardData: BLGUDashboardResponse;
  assessmentId: number;
}

export function ReworkIndicatorsPanel({
  dashboardData,
  assessmentId,
}: ReworkIndicatorsPanelProps) {
  const router = useRouter();
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set());

  // Compute failed indicators based on presence of assessor feedback (comments OR annotations)
  // CORRECT LOGIC: If assessor left feedback, indicator needs rework
  // If no feedback, indicator is good (MOV checklist automatically determines pass/fail)
  const failedIndicators = useMemo<FailedIndicator[]>(() => {
    const indicatorMap = new Map<number, FailedIndicator>();

    // Helper function to find indicator in governance areas
    const findIndicator = (indicatorId: number) => {
      for (const area of dashboardData.governance_areas) {
        const indicator = area.indicators.find((i: any) => i.indicator_id === indicatorId);
        if (indicator) {
          return {
            ...indicator,
            governance_area_id: area.governance_area_id,
            governance_area_name: area.governance_area_name,
          };
        }
      }
      return null;
    };

    // Add indicators from rework comments
    dashboardData.rework_comments?.forEach((comment: any) => {
      if (!indicatorMap.has(comment.indicator_id)) {
        const indicator = findIndicator(comment.indicator_id);

        if (indicator) {
          indicatorMap.set(comment.indicator_id, {
            indicator_id: comment.indicator_id,
            indicator_name: comment.indicator_name,
            governance_area_id: indicator.governance_area_id,
            governance_area_name: indicator.governance_area_name,
            is_complete: indicator.is_complete,
            comments: [],
            annotations: [],
            total_feedback_items: 0,
            has_mov_issues: false,
            has_field_issues: false,
            route_path: `/blgu/assessments?indicator=${comment.indicator_id}`,
          });
        }
      }
      indicatorMap.get(comment.indicator_id)?.comments.push(comment);
    });

    // Add indicators from MOV annotations
    Object.entries(dashboardData.mov_annotations_by_indicator || {}).forEach(
      ([indicatorIdStr, annotations]: [string, any]) => {
        const indicatorId = Number(indicatorIdStr);

        if (!indicatorMap.has(indicatorId) && annotations.length > 0) {
          const indicator = findIndicator(indicatorId);

          if (indicator) {
            indicatorMap.set(indicatorId, {
              indicator_id: indicatorId,
              indicator_name: annotations[0].indicator_name,
              governance_area_id: indicator.governance_area_id,
              governance_area_name: indicator.governance_area_name,
              is_complete: indicator.is_complete,
              comments: [],
              annotations: [],
              total_feedback_items: 0,
              has_mov_issues: false,
              has_field_issues: false,
              route_path: `/blgu/assessments?indicator=${indicatorId}`,
            });
          }
        }

        const failed = indicatorMap.get(indicatorId);
        if (failed) {
          failed.annotations.push(...annotations);
        }
      }
    );

    // Compute derived metadata
    return Array.from(indicatorMap.values()).map((failed) => ({
      ...failed,
      total_feedback_items: failed.comments.length + failed.annotations.length,
      has_mov_issues: failed.annotations.length > 0,
      has_field_issues: failed.comments.length > 0,
    }));
  }, [dashboardData, assessmentId]);

  // Compute progress
  const progress = useMemo(() => {
    const total = failedIndicators.length;
    const fixed = failedIndicators.filter((f) => f.is_complete).length;
    return {
      total,
      fixed,
      remaining: total - fixed,
      percentage: total > 0 ? (fixed / total) * 100 : 0,
    };
  }, [failedIndicators]);

  // Group by governance area
  const failedByArea = useMemo(() => {
    const groups = new Map<number, FailedIndicator[]>();
    failedIndicators.forEach((failed) => {
      if (!groups.has(failed.governance_area_id)) {
        groups.set(failed.governance_area_id, []);
      }
      groups.get(failed.governance_area_id)?.push(failed);
    });
    return groups;
  }, [failedIndicators]);

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

  if (failedIndicators.length === 0) {
    return null; // No failed indicators
  }

  return (
    <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
      {/* Header */}
      <div className="p-6 border-b border-orange-200 dark:border-orange-800">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                Indicators Requiring Rework
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {progress.remaining} of {progress.total} indicators still need attention
              </p>
            </div>
          </div>

          {progress.fixed > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-950/30 px-3 py-1.5 rounded-sm border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-4 h-4" />
              {progress.fixed} Fixed
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Progress</span>
            <span className="font-medium text-[var(--foreground)]">
              {progress.percentage.toFixed(0)}%
            </span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>
      </div>

      {/* Failed Indicators by Area */}
      <div className="divide-y divide-orange-200 dark:divide-orange-800">
        {Array.from(failedByArea.entries()).map(([areaId, indicators]) => {
          const isExpanded = expandedAreas.has(areaId);
          const areaName = indicators[0]?.governance_area_name || `Area ${areaId}`;
          const areaFixed = indicators.filter((i) => i.is_complete).length;

          return (
            <div key={areaId}>
              {/* Area Header */}
              <button
                onClick={() => toggleArea(areaId)}
                className="w-full flex items-center justify-between p-4 hover:bg-orange-100/50 dark:hover:bg-orange-950/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
                  )}
                  <span className="font-semibold text-[var(--foreground)]">
                    {areaName}
                  </span>
                </div>
                <span className="text-sm text-[var(--text-secondary)]">
                  {areaFixed}/{indicators.length} fixed
                </span>
              </button>

              {/* Indicator Cards */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {indicators.map((failed) => (
                    <FailedIndicatorCard
                      key={failed.indicator_id}
                      failed={failed}
                      onFixClick={() => router.push(failed.route_path)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
