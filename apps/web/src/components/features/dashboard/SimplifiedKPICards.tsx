"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  RotateCcw,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SimplifiedKPICardsProps {
  data: {
    barangaySubmissions: { current: number; total: number };
    awaitingReview: number;
    inRework: number;
    validatedReady: number;
    awaitingAssessorReview?: number;
    awaitingFinalValidation?: number;
    awaitingMLGOOApproval?: number;
    completed?: number;
    notStarted?: number;
    passedCount?: number;
    failedCount?: number;
    passRate?: number;
  };
}

export function SimplifiedKPICards({ data }: SimplifiedKPICardsProps) {
  const router = useRouter();

  const submissionProgress = Math.round(
    (data.barangaySubmissions.current / data.barangaySubmissions.total) * 100
  );

  const awaitingMLGOOApproval = data.awaitingMLGOOApproval ?? 0;
  const completed = data.completed ?? 0;
  const passedCount = data.passedCount ?? 0;
  const failedCount = data.failedCount ?? 0;
  const awaitingFinalValidation = data.awaitingFinalValidation ?? 0;
  const awaitingAssessorReview = data.awaitingAssessorReview ?? data.awaitingReview;

  // Pipeline health: assessments in review stages (not completed, not rework)
  const pipelineCount = awaitingAssessorReview + awaitingFinalValidation;

  const hasActionsRequired = awaitingMLGOOApproval > 0;

  return (
    <div className="space-y-6">
      {/* Hero Action Card - Most Prominent */}
      <Card
        className={cn(
          "relative overflow-hidden border-2 shadow-lg transition-all duration-300 cursor-pointer",
          hasActionsRequired
            ? "border-amber-400 bg-gradient-to-r from-amber-50 via-amber-50 to-orange-50 hover:shadow-xl hover:scale-[1.01]"
            : "border-green-400 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50"
        )}
        onClick={() =>
          hasActionsRequired
            ? router.push("/mlgoo/submissions?status=AWAITING_MLGOO_APPROVAL")
            : router.push("/mlgoo/submissions")
        }
        role="button"
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === "Enter" && router.push("/mlgoo/submissions?status=AWAITING_MLGOO_APPROVAL")
        }
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/30 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/20 rounded-full translate-y-12 -translate-x-12" />

        <CardContent className="relative z-10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "p-4 rounded-sm shadow-md",
                  hasActionsRequired ? "bg-amber-500" : "bg-green-500"
                )}
              >
                {hasActionsRequired ? (
                  <ClipboardCheck className="h-8 w-8 text-white" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-white" />
                )}
              </div>
              <div>
                <p
                  className={cn(
                    "text-sm font-semibold uppercase tracking-wide",
                    hasActionsRequired ? "text-amber-700" : "text-green-700"
                  )}
                >
                  {hasActionsRequired ? "Action Required" : "All Clear"}
                </p>
                <h2 className="text-2xl font-bold text-gray-900">
                  {hasActionsRequired ? (
                    <>
                      {awaitingMLGOOApproval} Assessment{awaitingMLGOOApproval !== 1 ? "s" : ""}{" "}
                      Awaiting Your Approval
                    </>
                  ) : (
                    "No assessments require your action"
                  )}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {hasActionsRequired
                    ? "Click to review and approve pending assessments"
                    : "Check submissions to monitor progress"}
                </p>
              </div>
            </div>
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-sm font-medium transition-colors",
                hasActionsRequired
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-green-500 text-white hover:bg-green-600"
              )}
            >
              <span>{hasActionsRequired ? "Review Now" : "View All"}</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core KPI Cards - 3 focused metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Submission Progress */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card
                className="relative overflow-hidden border border-[var(--border)] shadow-md bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-50 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                onClick={() => router.push("/mlgoo/submissions")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && router.push("/mlgoo/submissions")}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/30 rounded-full -translate-y-8 translate-x-8" />
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">Submission Progress</span>
                    <div className="p-2 bg-blue-500 rounded-sm">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {data.barangaySubmissions.current}
                    </span>
                    <span className="text-lg text-gray-500">
                      / {data.barangaySubmissions.total}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Barangays have submitted</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-semibold text-blue-600">{submissionProgress}%</span>
                    </div>
                    <Progress value={submissionProgress} className="h-2 bg-blue-100" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total barangays that have submitted their assessments</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Pipeline Health - Combined */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card
                className="relative overflow-hidden border border-[var(--border)] shadow-md bg-gradient-to-br from-purple-50 via-purple-50 to-indigo-50 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                onClick={() => router.push("/mlgoo/submissions?status=IN_REVIEW")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter" && router.push("/mlgoo/submissions?status=IN_REVIEW")
                }
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/30 rounded-full -translate-y-8 translate-x-8" />
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">Pipeline Health</span>
                    <div className="p-2 bg-purple-500 rounded-sm">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">{pipelineCount}</span>
                    <span className="text-lg text-gray-500">in review</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Assessments being processed</p>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span className="text-gray-600">{awaitingAssessorReview} Assessor</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <span className="text-gray-600">{awaitingFinalValidation} Validator</span>
                    </div>
                    {data.inRework > 0 && (
                      <div className="flex items-center gap-1.5">
                        <RotateCcw className="h-3 w-3 text-orange-500" />
                        <span className="text-orange-600 font-medium">{data.inRework} Rework</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Assessments currently in the review pipeline</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Results - Pass/Fail */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card
                className={cn(
                  "relative overflow-hidden border border-[var(--border)] shadow-md cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300",
                  completed > 0
                    ? "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50"
                    : "bg-gradient-to-br from-gray-50 via-gray-50 to-slate-50"
                )}
                onClick={() => router.push("/mlgoo/submissions?status=COMPLETED")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter" && router.push("/mlgoo/submissions?status=COMPLETED")
                }
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/30 rounded-full -translate-y-8 translate-x-8" />
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">Assessment Results</span>
                    <div
                      className={cn(
                        "p-2 rounded-sm",
                        completed > 0 ? "bg-green-500" : "bg-gray-400"
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">{completed}</span>
                    <span className="text-lg text-gray-500">completed</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {completed > 0 ? "Assessments finalized" : "No assessments completed yet"}
                  </p>
                  {completed > 0 ? (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="font-semibold text-green-600">{passedCount} Passed</span>
                      </div>
                      {failedCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="font-semibold text-red-600">{failedCount} Failed</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">
                      Results will appear here once assessments are finalized
                    </div>
                  )}
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Completed assessments and their pass/fail results</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
