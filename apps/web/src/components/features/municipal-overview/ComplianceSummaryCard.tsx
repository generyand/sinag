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
} from "lucide-react";
import { AnalyticsEmptyState } from "@/components/features/analytics";
import { cn } from "@/lib/utils";
import type { MunicipalComplianceSummary } from "@sinag/shared";

interface ComplianceSummaryCardProps {
  data: MunicipalComplianceSummary | null | undefined;
  isLoading?: boolean;
  onFilterChange?: (filter: string) => void;
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
  percentage: number;
}

function WorkflowStage({ label, count, color, percentage }: WorkflowStageProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-1 min-w-[60px]">
            <div
              className={cn(
                "w-full h-2 rounded-full transition-all",
                count > 0 ? color : "bg-gray-200"
              )}
              style={{ opacity: count > 0 ? 1 : 0.3 }}
            />
            <span className="text-xs font-medium text-[var(--foreground)]">{count}</span>
            <span className="text-[10px] text-[var(--muted-foreground)] text-center leading-tight">
              {label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {count} barangay{count !== 1 ? "s" : ""} ({percentage.toFixed(1)}%)
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ComplianceSummaryCard({
  data,
  isLoading,
  onFilterChange,
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
              <div className="space-y-3">
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
                          Shows the distribution of barangays across different stages of the
                          assessment workflow.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Visual Pipeline */}
                <div className="flex items-end justify-between gap-1 px-2">
                  <WorkflowStage
                    label="Not Started"
                    count={data.workflow_breakdown.not_started}
                    color="bg-gray-400"
                    percentage={getStagePercentage(data.workflow_breakdown.not_started)}
                  />
                  <ArrowRight className="h-3 w-3 text-gray-300 mb-4 flex-shrink-0" />
                  <WorkflowStage
                    label="Draft"
                    count={data.workflow_breakdown.draft}
                    color="bg-slate-400"
                    percentage={getStagePercentage(data.workflow_breakdown.draft)}
                  />
                  <ArrowRight className="h-3 w-3 text-gray-300 mb-4 flex-shrink-0" />
                  <WorkflowStage
                    label="Submitted"
                    count={data.workflow_breakdown.submitted}
                    color="bg-blue-400"
                    percentage={getStagePercentage(data.workflow_breakdown.submitted)}
                  />
                  <ArrowRight className="h-3 w-3 text-gray-300 mb-4 flex-shrink-0" />
                  <WorkflowStage
                    label="In Review"
                    count={data.workflow_breakdown.in_review}
                    color="bg-indigo-400"
                    percentage={getStagePercentage(data.workflow_breakdown.in_review)}
                  />
                  <ArrowRight className="h-3 w-3 text-gray-300 mb-4 flex-shrink-0" />
                  <WorkflowStage
                    label="Validation"
                    count={data.workflow_breakdown.awaiting_validation}
                    color="bg-purple-400"
                    percentage={getStagePercentage(data.workflow_breakdown.awaiting_validation)}
                  />
                  <ArrowRight className="h-3 w-3 text-gray-300 mb-4 flex-shrink-0" />
                  <WorkflowStage
                    label="Approval"
                    count={data.workflow_breakdown.awaiting_approval}
                    color="bg-amber-400"
                    percentage={getStagePercentage(data.workflow_breakdown.awaiting_approval)}
                  />
                  <ArrowRight className="h-3 w-3 text-gray-300 mb-4 flex-shrink-0" />
                  <WorkflowStage
                    label="Completed"
                    count={data.workflow_breakdown.completed}
                    color="bg-green-500"
                    percentage={getStagePercentage(data.workflow_breakdown.completed)}
                  />
                </div>

                {/* Rework indicator */}
                {data.workflow_breakdown.rework > 0 && (
                  <div className="flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 py-1.5 px-3 rounded-sm">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>
                      {data.workflow_breakdown.rework} assessment
                      {data.workflow_breakdown.rework !== 1 ? "s" : ""} in rework
                    </span>
                  </div>
                )}
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
              {data.workflow_breakdown?.rework > 0 && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 rounded-sm border-orange-300 text-orange-700 cursor-pointer hover:bg-orange-50"
                  onClick={() => onFilterChange?.("rework")}
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  {data.workflow_breakdown.rework} In Rework
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
