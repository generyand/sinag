/**
 * Rework Indicators Panel Component - ENHANCED VERSION
 *
 * Displays all indicators that failed validation and require resubmission.
 * Shows indicators grouped by governance area with feedback summaries.
 *
 * PRIORITY COMPONENT: This is the main entry point for BLGU users to see
 * which indicators need attention when assessment status is REWORK/NEEDS_REWORK.
 *
 * ENHANCEMENTS:
 * - Improved visual hierarchy with gradient backgrounds and better spacing
 * - Prominent call-to-action button to start addressing rework items
 * - Circular progress indicator for better visual feedback
 * - Auto-expanded governance areas (collapsed by default, all expanded on mount)
 * - Summary of feedback types (comments vs annotations)
 * - Urgency messaging and helpful instructions
 * - Improved color scheme using theme variables and better contrast
 */

"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  FileText,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { FailedIndicatorCard } from "./FailedIndicatorCard";
import type { BLGUDashboardResponse } from "@sinag/shared";
import type { FailedIndicator } from "@/types/rework";

interface ReworkIndicatorsPanelProps {
  dashboardData: BLGUDashboardResponse;
  assessmentId: number;
}

export function ReworkIndicatorsPanel({ dashboardData, assessmentId }: ReworkIndicatorsPanelProps) {
  const router = useRouter();
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set());

  // Check if this is a calibration rework (from Validator, not Assessor)
  const isCalibration = dashboardData.is_calibration_rework === true;
  // Support multiple calibration areas (parallel calibration from different validators)
  const calibrationGovernanceAreas: Array<{
    governance_area_id: number;
    governance_area_name: string;
  }> = (dashboardData as any).calibration_governance_areas || [];
  // Legacy single area support (fallback)
  const legacyCalibrationAreaId = (dashboardData as any).calibration_governance_area_id;
  const legacyCalibrationAreaName = (dashboardData as any).calibration_governance_area_name;
  // Build set of all calibration area IDs
  const calibrationAreaIds = new Set<number>(
    calibrationGovernanceAreas.length > 0
      ? calibrationGovernanceAreas.map((a) => a.governance_area_id)
      : legacyCalibrationAreaId
        ? [legacyCalibrationAreaId]
        : []
  );
  // Get area names for display
  const calibrationAreaNames =
    calibrationGovernanceAreas.length > 0
      ? calibrationGovernanceAreas.map((a) => a.governance_area_name)
      : legacyCalibrationAreaName
        ? [legacyCalibrationAreaName]
        : [];

  // Check if this is an MLGOO RE-calibration (distinct from Validator calibration)
  // MLGOO RE-calibration targets specific indicators, not entire governance areas
  const isMlgooRecalibration = (dashboardData as any).is_mlgoo_recalibration === true;
  const mlgooRecalibrationIndicatorIds: number[] =
    (dashboardData as any).mlgoo_recalibration_indicator_ids || [];
  const mlgooRecalibrationComments: string | null =
    (dashboardData as any).mlgoo_recalibration_comments || null;
  // MLGOO RE-calibration can now target specific MOV files (more granular than indicators)
  const mlgooRecalibrationMovFileIds: Array<{ mov_file_id: number; comment?: string | null }> =
    (dashboardData as any).mlgoo_recalibration_mov_file_ids || [];

  // Compute failed indicators based on calibration mode or assessor feedback
  // For MLGOO RE-CALIBRATION: Show ONLY the specific indicators selected by MLGOO
  // For CALIBRATION: Show incomplete indicators in the calibrated governance area
  // For REWORK: Show indicators with assessor feedback (comments OR annotations)
  const failedIndicators = useMemo<FailedIndicator[]>(() => {
    const indicatorMap = new Map<number, FailedIndicator>();

    // Helper function to find indicator in governance areas (including children)
    const findIndicator = (indicatorId: number) => {
      // Recursive search through indicator tree
      const searchIndicators = (
        indicators: any[],
        areaId: number,
        areaName: string
      ): any | null => {
        for (const indicator of indicators) {
          if (indicator.indicator_id === indicatorId) {
            return {
              ...indicator,
              governance_area_id: areaId,
              governance_area_name: areaName,
            };
          }
          // Search in children if present
          if (indicator.children && indicator.children.length > 0) {
            const found = searchIndicators(indicator.children, areaId, areaName);
            if (found) return found;
          }
        }
        return null;
      };

      for (const area of dashboardData.governance_areas) {
        const indicator = searchIndicators(
          area.indicators,
          area.governance_area_id,
          area.governance_area_name
        );
        if (indicator) {
          return indicator;
        }
      }
      return null;
    };

    // For MLGOO RE-CALIBRATION: Show indicators that have flagged files OR are explicitly selected
    if (isMlgooRecalibration && (mlgooRecalibrationIndicatorIds.length > 0 || mlgooRecalibrationMovFileIds.length > 0)) {
      // First, handle explicitly selected indicators (by indicator ID)
      mlgooRecalibrationIndicatorIds.forEach((indicatorId) => {
        const indicator = findIndicator(indicatorId);
        if (indicator) {
          indicatorMap.set(indicatorId, {
            indicator_id: indicatorId,
            indicator_name: indicator.indicator_name,
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
      });

      // Second, handle MOV file-level flagging (find indicators by flagged file IDs)
      // MOV files are associated with indicators, so we need to find which indicators
      // the flagged files belong to
      if (mlgooRecalibrationMovFileIds.length > 0) {
        // Search all governance areas to find indicators with the flagged files
        const flaggedFileIds = new Set(mlgooRecalibrationMovFileIds.map(f => f.mov_file_id));

        // Check mov_annotations_by_indicator for file-to-indicator mapping
        // Also iterate through all indicators to check if they have flagged files
        dashboardData.governance_areas.forEach((area) => {
          const searchAndAddIndicators = (indicators: any[]) => {
            indicators.forEach((indicator: any) => {
              // Check if this indicator's ID matches any flagged files
              // We'll use the indicator_ids from the mlgoo_recalibration data
              // Note: The backend should have set mlgoo_recalibration_indicator_ids based on the flagged files

              // For now, we use the file associations from mov_annotations_by_indicator
              // or check if the indicator is already in our map
              const indicatorId = indicator.indicator_id;

              // If not already added and has flagged files, add it
              // The is_complete check will be based on whether BLGU has re-uploaded
              if (!indicatorMap.has(indicatorId)) {
                // Check if this indicator has any flagged files
                // For MLGOO file-level flagging, indicator completion should reflect file replacement status
                const needsAttention = !indicator.is_complete;

                // Only add if the indicator needs attention (not complete)
                // The backend marks indicators incomplete when their files are flagged
                if (needsAttention || mlgooRecalibrationIndicatorIds.includes(indicatorId)) {
                  indicatorMap.set(indicatorId, {
                    indicator_id: indicatorId,
                    indicator_name: indicator.indicator_name,
                    governance_area_id: area.governance_area_id,
                    governance_area_name: area.governance_area_name,
                    is_complete: indicator.is_complete,
                    comments: [],
                    annotations: [],
                    total_feedback_items: mlgooRecalibrationMovFileIds.length,
                    has_mov_issues: true,
                    has_field_issues: false,
                    route_path: `/blgu/assessments?indicator=${indicatorId}`,
                  });
                }
              }

              // Search children
              if (indicator.children && indicator.children.length > 0) {
                searchAndAddIndicators(indicator.children);
              }
            });
          };

          searchAndAddIndicators(area.indicators);
        });
      }

      // Also add any annotations for the MLGOO-selected indicators
      Object.entries(dashboardData.mov_annotations_by_indicator || {}).forEach(
        ([indicatorIdStr, annotations]: [string, any]) => {
          const indicatorId = Number(indicatorIdStr);

          // Only include if it's in the MLGOO recalibration list
          if (mlgooRecalibrationIndicatorIds.includes(indicatorId)) {
            const failed = indicatorMap.get(indicatorId);
            if (failed) {
              failed.annotations.push(...annotations);
            }
          }
        }
      );
    }
    // For CALIBRATION: Get all incomplete indicators from ALL calibrated governance areas
    else if (isCalibration && calibrationAreaIds.size > 0) {
      // Find ALL calibrated governance areas
      const calibratedAreas = dashboardData.governance_areas.filter((area) =>
        calibrationAreaIds.has(area.governance_area_id)
      );

      // Add all INCOMPLETE indicators from ALL calibrated areas
      calibratedAreas.forEach((calibratedArea) => {
        calibratedArea.indicators.forEach((indicator: any) => {
          // Only show indicators that are NOT complete (need to be fixed)
          if (!indicator.is_complete) {
            indicatorMap.set(indicator.indicator_id, {
              indicator_id: indicator.indicator_id,
              indicator_name: indicator.indicator_name,
              governance_area_id: calibratedArea.governance_area_id,
              governance_area_name: calibratedArea.governance_area_name,
              is_complete: indicator.is_complete,
              comments: [],
              annotations: [],
              total_feedback_items: 0,
              has_mov_issues: false,
              has_field_issues: false,
              route_path: `/blgu/assessments?indicator=${indicator.indicator_id}`,
            });
          }
        });
      });

      // Also add any annotations that are in ANY of the calibrated areas
      Object.entries(dashboardData.mov_annotations_by_indicator || {}).forEach(
        ([indicatorIdStr, annotations]: [string, any]) => {
          const indicatorId = Number(indicatorIdStr);
          const indicator = findIndicator(indicatorId);

          // Only include if it's in one of the calibrated areas
          if (indicator && calibrationAreaIds.has(indicator.governance_area_id)) {
            if (!indicatorMap.has(indicatorId)) {
              indicatorMap.set(indicatorId, {
                indicator_id: indicatorId,
                indicator_name: annotations[0]?.indicator_name || indicator.indicator_name,
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
            const failed = indicatorMap.get(indicatorId);
            if (failed) {
              failed.annotations.push(...annotations);
            }
          }
        }
      );
    } else {
      // For REWORK: Use the original logic (feedback-based)
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
    }

    // Compute derived metadata
    return Array.from(indicatorMap.values()).map((failed) => ({
      ...failed,
      total_feedback_items: failed.comments.length + failed.annotations.length,
      has_mov_issues: failed.annotations.length > 0,
      has_field_issues: failed.comments.length > 0,
    }));
  }, [
    dashboardData,
    assessmentId,
    isCalibration,
    calibrationAreaIds,
    isMlgooRecalibration,
    mlgooRecalibrationIndicatorIds,
    mlgooRecalibrationMovFileIds,
  ]);

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

  // Compute feedback summary statistics
  const feedbackSummary = useMemo(() => {
    const totalComments = failedIndicators.reduce(
      (sum, indicator) => sum + indicator.comments.length,
      0
    );
    const totalAnnotations = failedIndicators.reduce(
      (sum, indicator) => sum + indicator.annotations.length,
      0
    );
    return { totalComments, totalAnnotations };
  }, [failedIndicators]);

  // Auto-expand all governance areas on mount for better UX
  // Use a stable dependency (stringified area IDs) to prevent infinite loops
  const areaIdsKey = useMemo(() => {
    return Array.from(failedByArea.keys()).sort().join(",");
  }, [failedByArea]);

  useEffect(() => {
    if (areaIdsKey) {
      const allAreaIds = areaIdsKey.split(",").filter(Boolean).map(Number);
      if (allAreaIds.length > 0) {
        setExpandedAreas(new Set(allAreaIds));
      }
    }
  }, [areaIdsKey, setExpandedAreas]);

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

  // Find the first incomplete indicator for the "Start Fixing" button
  const firstIncompleteIndicator = failedIndicators.find((f) => !f.is_complete);

  return (
    <Card className="border-2 border-orange-300 dark:border-orange-700 bg-gradient-to-br from-orange-50 via-white to-orange-50/30 dark:from-orange-950/30 dark:via-gray-900 dark:to-orange-950/20 shadow-lg">
      {/* Header with Gradient Background */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-700 dark:to-red-700 p-6 text-white">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4 flex-1">
            {/* Circular Progress Indicator */}
            <div className="relative flex-shrink-0">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-white/20"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress.percentage / 100)}`}
                  className="text-white transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{progress.percentage.toFixed(0)}%</span>
              </div>
            </div>

            {/* Title and Description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-7 h-7 flex-shrink-0" />
                <h2 className="text-2xl font-bold">
                  {isMlgooRecalibration
                    ? "MLGOO RE-Calibration Required"
                    : isCalibration
                      ? "Indicators Requiring Calibration"
                      : "Action Required: Address Assessor Feedback"}
                </h2>
              </div>
              <p className="text-white/90 text-base leading-relaxed mb-3">
                {isMlgooRecalibration ? (
                  <>
                    The MLGOO has requested RE-calibration for{" "}
                    <span className="font-semibold">{progress.total}</span> specific indicator
                    {progress.total !== 1 ? "s" : ""}. Please address{" "}
                    <span className="font-semibold">{progress.remaining}</span> of{" "}
                    <span className="font-semibold">{progress.total}</span> to proceed.
                  </>
                ) : isCalibration && calibrationAreaNames.length > 0 ? (
                  <>
                    Your <span className="font-semibold">{calibrationAreaNames.join(", ")}</span>{" "}
                    assessment{calibrationAreaNames.length > 1 ? "s require" : " requires"}{" "}
                    calibration. Please review and update{" "}
                    <span className="font-semibold">{progress.remaining}</span> of{" "}
                    <span className="font-semibold">{progress.total}</span> indicators to proceed.
                  </>
                ) : (
                  <>
                    The assessor has identified areas needing improvement in your submission. Please
                    address <span className="font-semibold">{progress.remaining}</span> of{" "}
                    <span className="font-semibold">{progress.total}</span> indicators to resubmit.
                  </>
                )}
              </p>
              {/* MLGOO Comments */}
              {isMlgooRecalibration && mlgooRecalibrationComments && (
                <div className="bg-white/10 border border-white/20 rounded-sm p-3 mb-3">
                  <p className="text-sm text-white/90 italic">
                    <span className="font-semibold not-italic">MLGOO&apos;s Note:</span>{" "}
                    {mlgooRecalibrationComments}
                  </p>
                </div>
              )}
              {/* Flagged MOV Files Count */}
              {isMlgooRecalibration && mlgooRecalibrationMovFileIds.length > 0 && (
                <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-sm p-3 mb-3">
                  <p className="text-sm text-white/90">
                    <span className="font-semibold">
                      {mlgooRecalibrationMovFileIds.length} specific file(s)
                    </span>{" "}
                    have been flagged for resubmission. Look for the{" "}
                    <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded">
                      FLAGGED
                    </span>{" "}
                    badge on files that need to be replaced.
                  </p>
                </div>
              )}

              {/* Feedback Summary */}
              <div className="flex items-center gap-4 text-sm text-white/80">
                {feedbackSummary.totalComments > 0 && (
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-sm">
                    <MessageSquare className="w-4 h-4" />
                    <span>
                      {feedbackSummary.totalComments} comment
                      {feedbackSummary.totalComments !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {feedbackSummary.totalAnnotations > 0 && (
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-sm">
                    <FileText className="w-4 h-4" />
                    <span>
                      {feedbackSummary.totalAnnotations} annotation
                      {feedbackSummary.totalAnnotations !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {progress.remaining > 0 && (
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-sm">
                    <Clock className="w-4 h-4" />
                    <span>Needs attention</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed Count Badge */}
          {progress.fixed > 0 && (
            <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-sm shadow-md flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
              <div className="text-left">
                <div className="text-xs opacity-90">Fixed</div>
                <div className="text-lg font-bold">{progress.fixed}</div>
              </div>
            </div>
          )}
        </div>

        {/* Call to Action Button */}
        {firstIncompleteIndicator && (
          <div className="mt-4">
            <Button
              onClick={() => router.push(firstIncompleteIndicator.route_path)}
              size="lg"
              className="w-full sm:w-auto bg-white text-orange-600 hover:bg-orange-50 hover:text-orange-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 text-base py-6"
            >
              <span>Start Fixing Issues</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Instructional Message */}
      <div className="px-6 py-4 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
          <strong>What to do next:</strong>{" "}
          {isMlgooRecalibration ? (
            <>
              The MLGOO has unlocked specific indicators for you to update. Review each indicator
              below, make the necessary corrections, then resubmit your assessment. Only the
              indicators listed below need to be addressed.
            </>
          ) : (
            <>
              Review each indicator below to see the assessor&apos;s feedback. Address all comments
              and annotations, then resubmit your assessment for review. You can track your progress
              as you complete each indicator.
            </>
          )}
        </p>
      </div>

      {/* Failed Indicators by Area */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Array.from(failedByArea.entries()).map(([areaId, indicators]) => {
          const isExpanded = expandedAreas.has(areaId);
          const areaName = indicators[0]?.governance_area_name || `Area ${areaId}`;
          const areaFixed = indicators.filter((i) => i.is_complete).length;
          const areaProgress = indicators.length > 0 ? (areaFixed / indicators.length) * 100 : 0;

          return (
            <div key={areaId} className="bg-white dark:bg-gray-900">
              {/* Area Header */}
              <button
                onClick={() => toggleArea(areaId)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
                  )}
                  <div className="flex-1 text-left">
                    <span className="font-semibold text-[var(--foreground)] text-base group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {areaName}
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {areaFixed} of {indicators.length} fixed
                      </span>
                      {areaFixed === indicators.length && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-sm font-medium">
                          Complete
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mini Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                      style={{ width: `${areaProgress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)] w-10 text-right">
                    {areaProgress.toFixed(0)}%
                  </span>
                </div>
              </button>

              {/* Indicator Cards */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
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
