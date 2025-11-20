/**
 * useReworkContext Hook
 *
 * Computes rework workflow context from dashboard data.
 * Provides:
 * - List of failed indicators
 * - Current indicator context (if on indicator page)
 * - Navigation helpers (next/previous failed indicator)
 * - Progress metrics
 */

"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { BLGUDashboardResponse } from "@vantage/shared";
import type { FailedIndicator, ReworkContext, ReworkProgress } from "@/types/rework";

/**
 * Hook to compute rework workflow context from dashboard data
 *
 * @param dashboardData - Dashboard API response
 * @param currentIndicatorId - Current indicator ID (if on indicator page)
 * @param assessmentId - Assessment ID for building route paths
 * @returns ReworkContext or null if no rework workflow active
 */
export function useReworkContext(
  dashboardData: BLGUDashboardResponse | undefined,
  currentIndicatorId?: number,
  assessmentId?: number
): ReworkContext | null {
  const searchParams = useSearchParams();
  const fromRework = searchParams?.get("from") === "rework";

  const failedIndicators = useMemo<FailedIndicator[]>(() => {
    if (!dashboardData || !assessmentId) return [];

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

    // Process rework comments - only keep the first comment per indicator (no duplicates)
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
            comments: [comment], // Store only the first comment
            annotations: [],
            total_feedback_items: 0,
            has_mov_issues: false,
            has_field_issues: false,
            route_path: `/blgu/assessment/${assessmentId}/indicator/${comment.indicator_id}?from=rework`,
          });
        }
      }
      // Don't push duplicate comments - only keep the first one
    });

    // Process MOV annotations
    Object.entries(dashboardData.mov_annotations_by_indicator || {}).forEach(
      ([indicatorIdStr, annotations]: [string, any]) => {
        const indicatorId = Number(indicatorIdStr);

        if (!indicatorMap.has(indicatorId) && annotations.length > 0) {
          const indicator = findIndicator(indicatorId);

          if (indicator) {
            indicatorMap.set(indicatorId, {
              indicator_id: indicatorId,
              indicator_name: (annotations as any)[0].indicator_name,
              governance_area_id: indicator.governance_area_id,
              governance_area_name: indicator.governance_area_name,
              is_complete: indicator.is_complete,
              comments: [],
              annotations: [],
              total_feedback_items: 0,
              has_mov_issues: false,
              has_field_issues: false,
              route_path: `/blgu/assessment/${assessmentId}/indicator/${indicatorId}?from=rework`,
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

  const currentIndicator = useMemo(() => {
    if (!currentIndicatorId) return undefined;
    return failedIndicators.find((f) => f.indicator_id === currentIndicatorId);
  }, [failedIndicators, currentIndicatorId]);

  const progress = useMemo<ReworkProgress>(() => {
    const total = failedIndicators.length;
    const fixed = failedIndicators.filter((f) => f.is_complete).length;
    const currentIndex = currentIndicatorId
      ? failedIndicators.findIndex((f) => f.indicator_id === currentIndicatorId)
      : -1;

    return {
      total_failed: total,
      fixed_count: fixed,
      remaining_count: total - fixed,
      completion_percentage: total > 0 ? (fixed / total) * 100 : 0,
      current_indicator_id: currentIndicatorId,
      current_index: currentIndex >= 0 ? currentIndex : undefined,
      has_next: currentIndex >= 0 && currentIndex < failedIndicators.length - 1,
      has_previous: currentIndex > 0,
      next_indicator_id: failedIndicators[currentIndex + 1]?.indicator_id,
      previous_indicator_id: failedIndicators[currentIndex - 1]?.indicator_id,
    };
  }, [failedIndicators, currentIndicatorId]);

  if (!dashboardData || failedIndicators.length === 0) {
    return null;
  }

  return {
    from_rework: fromRework,
    failed_indicators: failedIndicators,
    current_indicator: currentIndicator,
    progress,
  };
}
