/**
 * Rework/Calibration Summary Section Component
 *
 * Displays a summary of rework/calibration activity for MLGOO users reviewing assessments.
 * Shows:
 * - Which indicators are being reworked/calibrated
 * - Who requested the rework/calibration (assessor/validator)
 * - Notes and MOV annotations from assessors
 */

"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  MessageSquare,
  RefreshCw,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ReworkCalibrationSummary, ReworkCalibrationIndicatorItem } from "@sinag/shared";

interface ReworkCalibrationSummarySectionProps {
  summary: ReworkCalibrationSummary | null;
  reworkRequestedAt?: string | null;
  calibrationRequestedAt?: string | null;
  mlgooRecalibrationComments?: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    rework: {
      label: "Rework",
      className: "bg-orange-100 text-orange-800 border-orange-200",
    },
    calibration: {
      label: "Calibration",
      className: "bg-purple-100 text-purple-800 border-purple-200",
    },
    mlgoo_recalibration: {
      label: "RE-Calibration",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
  }[status] || { label: status, className: "bg-gray-100 text-gray-800" };

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

function ValidationStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;

  const config = {
    PASS: { label: "Pass", className: "bg-green-100 text-green-800 border-green-200" },
    FAIL: { label: "Fail", className: "bg-red-100 text-red-800 border-red-200" },
    CONDITIONAL: {
      label: "Conditional",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
  }[status.toUpperCase()] || { label: status, className: "bg-gray-100 text-gray-800" };

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

function IndicatorFeedbackCard({ indicator }: { indicator: ReworkCalibrationIndicatorItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const feedbackComments = indicator.feedback_comments ?? [];
  const movAnnotations = indicator.mov_annotations ?? [];
  const hasFeedback = feedbackComments.length > 0 || movAnnotations.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  {indicator.indicator_code && (
                    <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                      {indicator.indicator_code}
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-left">
                    {indicator.indicator_name}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {indicator.governance_area_name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={indicator.status} />
              <ValidationStatusBadge status={indicator.validation_status} />
              {hasFeedback && (
                <div className="flex items-center gap-1.5 text-gray-500">
                  {feedbackComments.length > 0 && (
                    <div className="flex items-center gap-0.5 text-xs">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{feedbackComments.length}</span>
                    </div>
                  )}
                  {movAnnotations.length > 0 && (
                    <div className="flex items-center gap-0.5 text-xs">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{movAnnotations.length}</span>
                    </div>
                  )}
                </div>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-slate-700 pt-3">
            {/* Feedback Comments */}
            {feedbackComments.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Feedback Notes
                </h5>
                <div className="space-y-2">
                  {feedbackComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3 border-l-2 border-blue-500"
                    >
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {comment.comment}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <User className="h-3 w-3" />
                        <span>{comment.assessor_name}</span>
                        {comment.created_at && (
                          <>
                            <span>&middot;</span>
                            <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MOV Annotations */}
            {movAnnotations.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  File Annotations
                </h5>
                <div className="space-y-2">
                  {movAnnotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className="bg-purple-50 dark:bg-purple-900/20 rounded-md p-3 border-l-2 border-purple-500"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                          {annotation.mov_filename}
                        </span>
                        {annotation.page !== null && annotation.page !== undefined && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700 border-purple-200"
                          >
                            Page {annotation.page + 1}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {annotation.comment}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <User className="h-3 w-3" />
                        <span>{annotation.assessor_name}</span>
                        {annotation.created_at && (
                          <>
                            <span>&middot;</span>
                            <span>{new Date(annotation.created_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasFeedback && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No detailed feedback available for this indicator.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function ReworkCalibrationSummarySection({
  summary,
  reworkRequestedAt,
  calibrationRequestedAt,
  mlgooRecalibrationComments,
}: ReworkCalibrationSummarySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Memoize indicator counts to avoid recalculating on every render
  const { totalIndicators, reworkCount, calibrationCount, mlgooRecalCount } = useMemo(() => {
    const indicators = summary?.rework_indicators ?? [];
    return {
      totalIndicators: indicators.length,
      reworkCount: indicators.filter((i) => i.status === "rework").length,
      calibrationCount: indicators.filter((i) => i.status === "calibration").length,
      mlgooRecalCount: indicators.filter((i) => i.status === "mlgoo_recalibration").length,
    };
  }, [summary?.rework_indicators]);

  // Don't render if no summary data
  if (!summary) return null;

  // Don't render if no rework/calibration activity
  if (!summary.has_rework && !summary.has_calibration && !summary.has_mlgoo_recalibration) {
    return null;
  }

  return (
    <Card className="border-2 border-amber-300 dark:border-amber-600 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-amber-900 dark:text-amber-100">
            <div className="p-1.5 rounded-md bg-amber-200 dark:bg-amber-800">
              <RefreshCw className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            </div>
            Rework/Calibration Activity
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-300 dark:hover:text-amber-100 dark:hover:bg-amber-900/30"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="flex flex-wrap gap-2 mt-2">
          {summary.has_rework && (
            <Badge className="bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-100">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Assessor Rework {reworkCount > 0 && `(${reworkCount})`}
            </Badge>
          )}
          {summary.has_calibration && (
            <Badge className="bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-100">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Validator Calibration {calibrationCount > 0 && `(${calibrationCount})`}
            </Badge>
          )}
          {summary.has_mlgoo_recalibration && (
            <Badge className="bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-100">
              <RefreshCw className="h-3 w-3 mr-1" />
              MLGOO RE-Calibration {mlgooRecalCount > 0 && `(${mlgooRecalCount})`}
            </Badge>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Requester Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rework Requester */}
            {summary.has_rework && summary.rework_requested_by_name && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase">
                    Rework Requested By
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {summary.rework_requested_by_name}
                </p>
                {reworkRequestedAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(reworkRequestedAt).toLocaleString()}
                  </p>
                )}
                {summary.rework_comments && (
                  <div className="mt-2 pt-2 border-t border-orange-100 dark:border-orange-900">
                    <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                      &ldquo;{summary.rework_comments}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Calibration Validator */}
            {summary.has_calibration && summary.calibration_validator_name && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase">
                    Calibration Requested By
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {summary.calibration_validator_name}
                </p>
                {calibrationRequestedAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(calibrationRequestedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Pending Calibrations (parallel calibration) */}
            {(summary.pending_calibrations?.length ?? 0) > 0 && (
              <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase">
                    Pending Calibrations
                  </span>
                </div>
                <div className="space-y-2">
                  {(summary.pending_calibrations ?? []).map((cal, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm bg-purple-50 dark:bg-purple-900/20 rounded px-2 py-1"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {cal.validator_name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs bg-purple-100 text-purple-700 border-purple-200"
                      >
                        {cal.governance_area_name}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MLGOO Recalibration Comments */}
            {summary.has_mlgoo_recalibration && mlgooRecalibrationComments && (
              <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">
                    MLGOO RE-Calibration Comments
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {mlgooRecalibrationComments}
                </p>
              </div>
            )}
          </div>

          {/* Indicators List */}
          {totalIndicators > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Indicators Under Review ({totalIndicators})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {(summary.rework_indicators ?? []).map((indicator) => (
                  <IndicatorFeedbackCard key={indicator.indicator_id} indicator={indicator} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
