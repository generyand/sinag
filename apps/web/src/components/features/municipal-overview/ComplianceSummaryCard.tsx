"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  TrendingUp,
  Info,
  RotateCcw,
  FileQuestion,
  FilePen,
  Send,
  Eye,
  ClipboardCheck,
  Stamp,
  ChevronRight,
} from "lucide-react";
import { AnalyticsEmptyState } from "@/components/features/analytics";
import { cn } from "@/lib/utils";
import type { MunicipalComplianceSummary } from "@sinag/shared";

interface ComplianceSummaryCardProps {
  data: MunicipalComplianceSummary | null | undefined;
  isLoading?: boolean;
  onFilterChange?: (filter: string) => void;
  /** Currently active filter from the pipeline */
  activeFilter?: string;
}

interface StatCardProps {
  label: string;
  value: number;
  description: string;
  variant?: "default" | "info" | "success" | "danger";
  percentage?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

function StatCard({
  label,
  value,
  description,
  variant = "default",
  percentage,
  onClick,
  icon,
}: StatCardProps) {
  const variantStyles = {
    default: "bg-[var(--muted)]/30 hover:bg-[var(--muted)]/50",
    info: "bg-blue-500/10 hover:bg-blue-500/20",
    success: "bg-green-500/10 hover:bg-green-500/20",
    danger: "bg-red-500/10 hover:bg-red-500/20",
  };

  const textStyles = {
    default: "text-[var(--foreground)]",
    info: "text-blue-600",
    success: "text-green-600",
    danger: "text-red-600",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "text-center p-4 rounded-sm transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              onClick && "cursor-pointer hover:shadow-md",
              variantStyles[variant]
            )}
            disabled={!onClick}
            type="button"
            aria-label={`${label}: ${value}${percentage ? ` (${percentage})` : ""}`}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              {icon}
              <p className={cn("text-3xl font-bold", textStyles[variant])}>{value}</p>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
            {percentage && (
              <p className={cn("text-xs font-medium mt-1", textStyles[variant])}>{percentage}</p>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p>{description}</p>
          {onClick && <p className="text-xs text-muted-foreground mt-1">Click to filter</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface WorkflowStageProps {
  label: string;
  count: number;
  color: string;
  bgColor: string;
  borderColor: string;
  percentage: number;
  description: string;
  icon: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}

function WorkflowStage({
  label,
  count,
  color,
  bgColor,
  borderColor,
  percentage,
  description,
  icon,
  isActive,
  onClick,
}: WorkflowStageProps) {
  const isEmpty = count === 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={isEmpty}
            className={cn(
              "flex flex-col items-center justify-center gap-1",
              "rounded-lg border-2 p-3 min-w-[72px] flex-1",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              isEmpty
                ? "opacity-40 cursor-default bg-gray-50 border-gray-200"
                : cn(bgColor, borderColor, "cursor-pointer hover:shadow-md hover:-translate-y-0.5"),
              isActive && "ring-2 ring-primary shadow-lg"
            )}
            aria-label={`${label}: ${count} barangays (${percentage.toFixed(1)}%). ${isEmpty ? "" : "Click to filter."}`}
          >
            <div className={cn("mb-0.5", isEmpty ? "text-gray-400" : color)}>{icon}</div>
            <span
              className={cn("text-2xl font-bold leading-none", isEmpty ? "text-gray-400" : color)}
            >
              {count}
            </span>
            <span className="text-[10px] text-[var(--muted-foreground)] text-center leading-tight font-medium">
              {label}
            </span>
            {!isEmpty && (
              <span className={cn("text-[9px] leading-none", color)}>{percentage.toFixed(0)}%</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
          <p className="text-xs mt-2">
            {count} barangay{count !== 1 ? "s" : ""} ({percentage.toFixed(1)}%)
          </p>
          {!isEmpty && <p className="text-xs text-muted-foreground mt-1">Click to filter list</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StageConnector() {
  return (
    <div className="flex items-center justify-center px-0.5 self-center mb-4">
      <ArrowRight className="h-4 w-4 text-gray-300" />
    </div>
  );
}

export function ComplianceSummaryCard({
  data,
  isLoading,
  onFilterChange,
  activeFilter = "all",
}: ComplianceSummaryCardProps) {
  const hasData = data && data.total_barangays > 0;

  // Calculate pass rate for display
  const passRate =
    hasData && data.assessed_barangays > 0
      ? ((data.passed_barangays / data.assessed_barangays) * 100).toFixed(1)
      : "0.0";

  // Check for action-required conditions
  const hasPendingApprovals = hasData && data.pending_mlgoo_approval > 0;
  const hasStalledAssessments = hasData && data.stalled_assessments > 0;
  const showActionAlert = hasPendingApprovals || hasStalledAssessments;

  // Calculate workflow stage percentages
  const getStagePercentage = (count: number) =>
    hasData && data.total_barangays > 0 ? (count / data.total_barangays) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" aria-hidden="true" />
            Municipal Compliance Summary
          </div>
          {hasData && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-sm font-normal">
                    <TrendingUp className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <span className="text-[var(--muted-foreground)]">Overall Progress:</span>
                    <span className="font-semibold text-blue-600">
                      {data.weighted_progress?.toFixed(1) ?? data.assessment_rate.toFixed(1)}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Weighted progress based on workflow stages. Each stage contributes
                    proportionally: Draft (10%), Submitted (25%), In Review (40%), Validation (55%),
                    Approval (70%), Completed (100%).
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasData ? (
          <AnalyticsEmptyState variant="no-data" compact />
        ) : (
          <>
            {/* Action Required Alert */}
            {showActionAlert && (
              <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">Action Required</AlertTitle>
                <AlertDescription className="text-amber-800">
                  <div className="flex flex-wrap gap-4 mt-2">
                    {hasPendingApprovals && (
                      <button
                        onClick={() => onFilterChange?.("awaiting_approval")}
                        className="flex items-center gap-1.5 hover:underline"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {data.pending_mlgoo_approval} assessment
                          {data.pending_mlgoo_approval !== 1 ? "s" : ""} awaiting your approval
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {hasStalledAssessments && (
                      <button
                        onClick={() => onFilterChange?.("stalled")}
                        className="flex items-center gap-1.5 hover:underline"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>
                          {data.stalled_assessments} assessment
                          {data.stalled_assessments !== 1 ? "s" : ""} stalled (&gt;14 days)
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Main Stats Grid */}
            <div
              className="grid grid-cols-2 lg:grid-cols-5 gap-4"
              role="group"
              aria-label="Compliance statistics"
            >
              <StatCard
                label="Total Barangays"
                value={data.total_barangays}
                description="Total number of barangays in the municipality"
                onClick={() => onFilterChange?.("all")}
              />
              <StatCard
                label="Completed"
                value={data.assessed_barangays}
                description="Barangays with finalized assessments (passed or failed)"
                variant="info"
                percentage={`${data.assessment_rate.toFixed(1)}% of total`}
                onClick={() => onFilterChange?.("completed")}
                icon={<FileText className="h-4 w-4 text-blue-500" />}
              />
              <StatCard
                label="Passed SGLGB"
                value={data.passed_barangays}
                description="Barangays that met all SGLGB requirements"
                variant="success"
                percentage={data.assessed_barangays > 0 ? `${passRate}% pass rate` : "No data yet"}
                onClick={() => onFilterChange?.("passed")}
                icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
              />
              <StatCard
                label="Failed SGLGB"
                value={data.failed_barangays}
                description="Barangays that did not meet SGLGB requirements"
                variant="danger"
                percentage={
                  data.assessed_barangays > 0
                    ? `${(100 - parseFloat(passRate)).toFixed(1)}% fail rate`
                    : "No data yet"
                }
                onClick={() => onFilterChange?.("failed")}
                icon={<XCircle className="h-4 w-4 text-red-500" />}
              />
              <StatCard
                label="In Progress"
                value={data.in_progress}
                description="Assessments currently being worked on (draft, submitted, under review, or rework)"
                variant="default"
                onClick={() => onFilterChange?.("in_progress")}
                icon={<RotateCcw className="h-4 w-4 text-gray-500" />}
              />
            </div>

            {/* Pass Rate Highlight */}
            {data.assessed_barangays > 0 && (
              <div className="flex items-center justify-center gap-4 py-3 px-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-sm border border-green-100">
                <div className="text-center">
                  <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
                    Compliance Rate
                  </p>
                  <p className="text-2xl font-bold text-green-600">{passRate}%</p>
                </div>
                <div className="h-10 w-px bg-gray-200" />
                <div className="text-center">
                  <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
                    Assessment Progress
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {data.assessment_rate.toFixed(1)}%
                  </p>
                </div>
                {data.rework_rate > 0 && (
                  <>
                    <div className="h-10 w-px bg-gray-200" />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center cursor-help">
                            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
                              Rework Rate
                            </p>
                            <p className="text-2xl font-bold text-amber-600">
                              {data.rework_rate.toFixed(1)}%
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Percentage of assessments that required rework</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>
            )}

            {/* Workflow Pipeline */}
            {data.workflow_breakdown && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-[var(--foreground)]">
                      Assessment Pipeline
                    </h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-[var(--muted-foreground)] cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Track barangays through each assessment stage. Click any stage to filter
                            the list below.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {data.total_barangays} total barangays
                  </span>
                </div>

                {/* Visual Pipeline - Improved Cards */}
                <div className="flex items-stretch gap-1 overflow-x-auto pb-2 -mx-2 px-2">
                  <WorkflowStage
                    label="Not Started"
                    count={data.workflow_breakdown.not_started ?? 0}
                    color="text-slate-600"
                    bgColor="bg-slate-50"
                    borderColor="border-slate-200"
                    percentage={getStagePercentage(data.workflow_breakdown.not_started ?? 0)}
                    description="Barangays that haven't begun their assessment yet."
                    icon={<FileQuestion className="h-4 w-4" />}
                    isActive={activeFilter === "not_started"}
                    onClick={() => onFilterChange?.("not_started")}
                  />
                  <StageConnector />
                  <WorkflowStage
                    label="Draft"
                    count={data.workflow_breakdown.draft ?? 0}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                    borderColor="border-blue-200"
                    percentage={getStagePercentage(data.workflow_breakdown.draft ?? 0)}
                    description="Assessment started but not yet submitted by BLGU."
                    icon={<FilePen className="h-4 w-4" />}
                    isActive={activeFilter === "draft"}
                    onClick={() => onFilterChange?.("draft")}
                  />
                  <StageConnector />
                  <WorkflowStage
                    label="Submitted"
                    count={data.workflow_breakdown.submitted ?? 0}
                    color="text-cyan-600"
                    bgColor="bg-cyan-50"
                    borderColor="border-cyan-200"
                    percentage={getStagePercentage(data.workflow_breakdown.submitted ?? 0)}
                    description="Submitted by BLGU, awaiting assessor review."
                    icon={<Send className="h-4 w-4" />}
                    isActive={activeFilter === "submitted"}
                    onClick={() => onFilterChange?.("submitted")}
                  />
                  <StageConnector />
                  <WorkflowStage
                    label="In Review"
                    count={data.workflow_breakdown.in_review ?? 0}
                    color="text-indigo-600"
                    bgColor="bg-indigo-50"
                    borderColor="border-indigo-200"
                    percentage={getStagePercentage(data.workflow_breakdown.in_review ?? 0)}
                    description="Being reviewed by an assessor."
                    icon={<Eye className="h-4 w-4" />}
                    isActive={activeFilter === "in_review"}
                    onClick={() => onFilterChange?.("in_review")}
                  />
                  <StageConnector />
                  <WorkflowStage
                    label="Validation"
                    count={data.workflow_breakdown.awaiting_validation ?? 0}
                    color="text-purple-600"
                    bgColor="bg-purple-50"
                    borderColor="border-purple-200"
                    percentage={getStagePercentage(
                      data.workflow_breakdown.awaiting_validation ?? 0
                    )}
                    description="Awaiting validator to determine pass/fail."
                    icon={<ClipboardCheck className="h-4 w-4" />}
                    isActive={activeFilter === "awaiting_validation"}
                    onClick={() => onFilterChange?.("awaiting_validation")}
                  />
                  <StageConnector />
                  <WorkflowStage
                    label="Approval"
                    count={data.workflow_breakdown.awaiting_approval ?? 0}
                    color="text-amber-600"
                    bgColor="bg-amber-50"
                    borderColor="border-amber-200"
                    percentage={getStagePercentage(data.workflow_breakdown.awaiting_approval ?? 0)}
                    description="Awaiting MLGOO final approval."
                    icon={<Stamp className="h-4 w-4" />}
                    isActive={activeFilter === "awaiting_approval"}
                    onClick={() => onFilterChange?.("awaiting_approval")}
                  />
                  <StageConnector />
                  <WorkflowStage
                    label="Completed"
                    count={data.workflow_breakdown.completed ?? 0}
                    color="text-green-600"
                    bgColor="bg-green-50"
                    borderColor="border-green-200"
                    percentage={getStagePercentage(data.workflow_breakdown.completed ?? 0)}
                    description="Assessment finalized with pass/fail result."
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    isActive={activeFilter === "completed"}
                    onClick={() => onFilterChange?.("completed")}
                  />
                </div>

                {/* Pipeline Distribution Bar */}
                <div className="space-y-1.5">
                  <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                    {(data.workflow_breakdown.not_started ?? 0) > 0 && (
                      <div
                        className="h-full bg-slate-300 transition-all duration-500"
                        style={{
                          width: `${getStagePercentage(data.workflow_breakdown.not_started ?? 0)}%`,
                        }}
                      />
                    )}
                    {(data.workflow_breakdown.draft ?? 0) > 0 && (
                      <div
                        className="h-full bg-blue-300 transition-all duration-500"
                        style={{
                          width: `${getStagePercentage(data.workflow_breakdown.draft ?? 0)}%`,
                        }}
                      />
                    )}
                    {(data.workflow_breakdown.submitted ?? 0) > 0 && (
                      <div
                        className="h-full bg-cyan-300 transition-all duration-500"
                        style={{
                          width: `${getStagePercentage(data.workflow_breakdown.submitted ?? 0)}%`,
                        }}
                      />
                    )}
                    {(data.workflow_breakdown.in_review ?? 0) > 0 && (
                      <div
                        className="h-full bg-indigo-300 transition-all duration-500"
                        style={{
                          width: `${getStagePercentage(data.workflow_breakdown.in_review ?? 0)}%`,
                        }}
                      />
                    )}
                    {(data.workflow_breakdown.awaiting_validation ?? 0) > 0 && (
                      <div
                        className="h-full bg-purple-400 transition-all duration-500"
                        style={{
                          width: `${getStagePercentage(data.workflow_breakdown.awaiting_validation ?? 0)}%`,
                        }}
                      />
                    )}
                    {(data.workflow_breakdown.awaiting_approval ?? 0) > 0 && (
                      <div
                        className="h-full bg-amber-400 transition-all duration-500"
                        style={{
                          width: `${getStagePercentage(data.workflow_breakdown.awaiting_approval ?? 0)}%`,
                        }}
                      />
                    )}
                    {(data.workflow_breakdown.completed ?? 0) > 0 && (
                      <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{
                          width: `${getStagePercentage(data.workflow_breakdown.completed ?? 0)}%`,
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Insights & Rework indicator */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Bottleneck insight */}
                  {(data.workflow_breakdown.not_started ?? 0) > data.total_barangays * 0.5 && (
                    <Badge
                      variant="outline"
                      className="text-xs border-slate-300 text-slate-700 bg-slate-50"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {data.workflow_breakdown.not_started ?? 0} barangays haven&apos;t started
                    </Badge>
                  )}
                  {(data.workflow_breakdown.rework ?? 0) > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs border-orange-300 text-orange-700 bg-orange-50 cursor-pointer hover:bg-orange-100"
                      onClick={() => onFilterChange?.("rework")}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      {data.workflow_breakdown.rework ?? 0} in rework
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Progress Bar (simplified) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Completion Progress
                </span>
                <span className="text-sm font-bold text-blue-600">
                  {data.assessed_barangays} of {data.total_barangays} completed
                </span>
              </div>
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                {/* Passed segment */}
                <div
                  className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-500"
                  style={{
                    width: `${(data.passed_barangays / data.total_barangays) * 100}%`,
                  }}
                />
                {/* Failed segment */}
                <div
                  className="absolute top-0 h-full bg-red-400 transition-all duration-500"
                  style={{
                    left: `${(data.passed_barangays / data.total_barangays) * 100}%`,
                    width: `${(data.failed_barangays / data.total_barangays) * 100}%`,
                  }}
                />
                {/* In progress segment */}
                <div
                  className="absolute top-0 h-full bg-blue-300 transition-all duration-500"
                  style={{
                    left: `${((data.passed_barangays + data.failed_barangays) / data.total_barangays) * 100}%`,
                    width: `${(data.in_progress / data.total_barangays) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Passed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    Failed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-300" />
                    In Progress
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-200" />
                    Not Started
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Status Badges */}
            <div
              className="flex flex-wrap gap-2 pt-2 border-t"
              role="group"
              aria-label="Quick status indicators"
            >
              <Badge
                variant="outline"
                className={cn(
                  "flex items-center gap-1 rounded-sm cursor-pointer hover:bg-amber-50",
                  data.pending_mlgoo_approval > 0 && "border-amber-300 text-amber-700"
                )}
                onClick={() => onFilterChange?.("awaiting_approval")}
              >
                <Clock className="h-3 w-3" aria-hidden="true" />
                {data.pending_mlgoo_approval} Pending Approval
              </Badge>
              {data.stalled_assessments > 0 && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 rounded-sm border-red-300 text-red-700 cursor-pointer hover:bg-red-50"
                  onClick={() => onFilterChange?.("stalled")}
                >
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {data.stalled_assessments} Stalled
                </Badge>
              )}
              {(data.workflow_breakdown?.rework ?? 0) > 0 && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 rounded-sm border-orange-300 text-orange-700 cursor-pointer hover:bg-orange-50"
                  onClick={() => onFilterChange?.("rework")}
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  {data.workflow_breakdown?.rework ?? 0} In Rework
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
