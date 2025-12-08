"use client";

import {
  useGetComplianceAssessmentsAssessmentIdComplianceOverview,
  usePostAssessorAssessmentResponsesResponseIdValidate,
} from "@sinag/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  Sparkles,
  TrendingUp,
  FileCheck,
  Info,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useMemo } from "react";

interface ComplianceOverviewClientProps {
  assessmentId: number;
}

// BBI functionality level colors and labels
const BBI_LEVEL_CONFIG = {
  HIGHLY_FUNCTIONAL: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    label: "Highly Functional",
    icon: "✓✓✓",
  },
  MODERATELY_FUNCTIONAL: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    label: "Moderately Functional",
    icon: "✓✓",
  },
  LOW_FUNCTIONAL: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    label: "Low Functional",
    icon: "✓",
  },
  NON_FUNCTIONAL: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    label: "Non-Functional",
    icon: "✗",
  },
};

export function ComplianceOverviewClient({
  assessmentId,
}: ComplianceOverviewClientProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } =
    useGetComplianceAssessmentsAssessmentIdComplianceOverview(assessmentId);
  const validateMut = usePostAssessorAssessmentResponsesResponseIdValidate();

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!data?.governance_areas) return null;
    
    let totalSubIndicators = 0;
    let metCount = 0;
    let unmetCount = 0;
    let pendingCount = 0;
    
    for (const area of data.governance_areas) {
      for (const indicator of area.indicators) {
        for (const sub of indicator.sub_indicators) {
          totalSubIndicators++;
          if (sub.validation_status === "PASS") metCount++;
          else if (sub.validation_status === "FAIL") unmetCount++;
          else pendingCount++;
        }
      }
    }
    
    const confirmedCount = metCount + unmetCount;
    const progressPercent = totalSubIndicators > 0 ? (confirmedCount / totalSubIndicators) * 100 : 0;
    
    return { totalSubIndicators, metCount, unmetCount, pendingCount, confirmedCount, progressPercent };
  }, [data]);

  // Handle override: set validation_status to PASS or FAIL
  const handleOverride = async (
    responseId: number,
    newStatus: "PASS" | "FAIL"
  ) => {
    try {
      await validateMut.mutateAsync({
        responseId,
        data: {
          validation_status: newStatus,
        },
      });
      await queryClient.invalidateQueries();
      toast.success(`Status set to ${newStatus === "PASS" ? "Met" : "Unmet"}`);
    } catch (err) {
      console.error("Override error:", err);
      toast.error("Failed to update status");
    }
  };

  // Handle reset: clear validation_status to revert to auto-calculation
  const handleResetOverride = async (responseId: number) => {
    try {
      await validateMut.mutateAsync({
        responseId,
        data: {
          validation_status: null as unknown as undefined,
        },
      });
      await queryClient.invalidateQueries();
      toast.success("Reset to pending");
    } catch (err) {
      console.error("Reset error:", err);
      toast.error("Failed to reset status");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-sm" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link href={`/validator/submissions/${assessmentId}/validation`}>
                <ChevronLeft className="h-4 w-4" />
                Back to Validation
              </Link>
            </Button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-sm p-6">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
              <XCircle className="h-6 w-6" />
              <span className="font-semibold text-lg">
                Failed to load compliance overview
              </span>
            </div>
            <p className="text-red-600 dark:text-red-400 mt-2">
              {error?.message || "An unexpected error occurred"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const {
    barangay_name,
    assessment_year,
    assessment_status,
    all_sub_indicators_validated,
    governance_areas,
  } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
              <Link href={`/validator/submissions/${assessmentId}/validation`}>
                <ChevronLeft className="h-4 w-4" />
                Back to Validation
              </Link>
            </Button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">{barangay_name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                CY {assessment_year} · {assessment_status?.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <FileCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Compliance Overview</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            Review and confirm compliance status for each sub-indicator based on your validation results.
          </p>
        </div>

        {/* Summary Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800/50 rounded-sm p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                <TrendingUp className="h-4 w-4" />
                Progress
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.progressPercent.toFixed(0)}%
              </div>
              <Progress value={stats.progressPercent} className="h-1.5 mt-2" />
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-sm p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm mb-1">
                <CheckCircle2 className="h-4 w-4" />
                Met
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.metCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                of {stats.totalSubIndicators} indicators
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-sm p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mb-1">
                <XCircle className="h-4 w-4" />
                Unmet
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.unmetCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                needs attention
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 rounded-sm p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm mb-1">
                <Clock className="h-4 w-4" />
                Pending
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.pendingCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                awaiting confirmation
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-sm p-4 mb-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-indigo-800 dark:text-indigo-200">
                <strong>How it works:</strong> Glowing buttons show the <em>suggested</em> status based on your checklist completion. 
                Click a button to <strong>confirm</strong> the status. All indicators start as <span className="text-amber-600 dark:text-amber-400 font-medium">Pending</span> until confirmed.
              </p>
            </div>
          </div>
        </div>

        {/* Warning if not all sub-indicators validated */}
        {!all_sub_indicators_validated && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-sm p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  Not all sub-indicators have been validated
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Complete validation of all sub-indicators to see final compliance status.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Governance Areas */}
        <div className="space-y-6">
          {governance_areas.map((area) => (
            <div key={area.governance_area_id} className="bg-white dark:bg-slate-800/50 rounded-sm border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              {/* Area Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {area.governance_area_name}
                </h2>
              </div>

              {/* Indicators */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {area.indicators.map((indicator) => (
                  <div key={indicator.indicator_id} className="p-5">
                    {/* Indicator Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {indicator.indicator_code}. {indicator.name}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {indicator.sub_indicators_passed} Met
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">/</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {indicator.sub_indicators_total} Total
                          </span>
                          {indicator.sub_indicators_pending > 0 && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <Clock className="h-3.5 w-3.5" />
                                {indicator.sub_indicators_pending} Pending
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {indicator.is_bbi ? (
                          indicator.all_validated && indicator.bbi_functionality_level ? (
                            <Badge
                              variant="outline"
                              className={`
                                ${BBI_LEVEL_CONFIG[indicator.bbi_functionality_level as keyof typeof BBI_LEVEL_CONFIG]?.bg || ""}
                                ${BBI_LEVEL_CONFIG[indicator.bbi_functionality_level as keyof typeof BBI_LEVEL_CONFIG]?.text || ""}
                                ${BBI_LEVEL_CONFIG[indicator.bbi_functionality_level as keyof typeof BBI_LEVEL_CONFIG]?.border || ""}
                                font-medium px-3 py-1
                              `}
                            >
                              {BBI_LEVEL_CONFIG[indicator.bbi_functionality_level as keyof typeof BBI_LEVEL_CONFIG]?.label || indicator.bbi_functionality_level}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 px-3 py-1">
                              <Clock className="h-3.5 w-3.5 mr-1.5" />
                              Pending
                            </Badge>
                          )
                        ) : indicator.all_validated && indicator.compliance_status ? (
                          <Badge
                            variant="outline"
                            className={`px-3 py-1 font-medium ${
                              indicator.compliance_status === "MET"
                                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                            }`}
                          >
                            {indicator.compliance_status === "MET" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {indicator.compliance_status}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 px-3 py-1">
                            <Clock className="h-3.5 w-3.5 mr-1.5" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Sub-indicators */}
                    {indicator.sub_indicators.length > 0 && (
                      <div className="bg-slate-50 dark:bg-slate-800/30 rounded-sm p-3">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
                          <span>Sub-indicators</span>
                          <span className="text-slate-400 dark:text-slate-500">Click to confirm status</span>
                        </div>
                        <div className="space-y-1">
                          {indicator.sub_indicators.map((sub) => {
                            const isConfirmed = sub.validation_status !== null;
                            const isMetConfirmed = sub.validation_status === "PASS";
                            const isUnmetConfirmed = sub.validation_status === "FAIL";
                            const isMetRecommended = sub.recommended_status === "PASS" && !isConfirmed;
                            const isUnmetRecommended = sub.recommended_status === "FAIL" && !isConfirmed;

                            return (
                              <div
                                key={sub.indicator_id}
                                className="flex items-center justify-between text-sm py-2 px-3 rounded-lg hover:bg-white dark:hover:bg-slate-700/50 transition-colors group"
                              >
                                <span className="text-slate-600 dark:text-slate-300 truncate flex-1 mr-4">
                                  {sub.indicator_code}. {sub.name}
                                </span>
                                <div className="flex items-center gap-2">
                                  {/* Status hint */}
                                  {isConfirmed && (
                                    <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                                      confirmed
                                    </span>
                                  )}
                                  {!isConfirmed && sub.has_checklist_data && (
                                    <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <Sparkles className="h-3 w-3" />
                                      suggested
                                    </span>
                                  )}
                                  {!isConfirmed && !sub.has_checklist_data && (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                                      not reviewed
                                    </span>
                                  )}

                                  {/* Action buttons */}
                                  {sub.response_id ? (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleOverride(sub.response_id!, "PASS")}
                                        disabled={validateMut.isPending}
                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                          isMetConfirmed
                                            ? "bg-emerald-500 text-white shadow-sm"
                                            : isMetRecommended
                                              ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400 ring-offset-1 animate-pulse dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-500"
                                              : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400"
                                        }`}
                                      >
                                        Met
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOverride(sub.response_id!, "FAIL")}
                                        disabled={validateMut.isPending}
                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                          isUnmetConfirmed
                                            ? "bg-red-500 text-white shadow-sm"
                                            : isUnmetRecommended
                                              ? "bg-red-100 text-red-700 ring-2 ring-red-400 ring-offset-1 animate-pulse dark:bg-red-900/50 dark:text-red-300 dark:ring-red-500"
                                              : "bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                                        }`}
                                      >
                                        Unmet
                                      </button>
                                      {isConfirmed && (
                                        <button
                                          type="button"
                                          onClick={() => handleResetOverride(sub.response_id!)}
                                          disabled={validateMut.isPending}
                                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors"
                                          title="Reset to pending"
                                        >
                                          <RotateCcw className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                                      No response
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {governance_areas.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <FileCheck className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              No indicators found for your governance area.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
