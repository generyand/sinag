"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  FileCheck,
  RotateCcw,
  ArrowRight,
  ClipboardCheck,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface KPICardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "danger" | "primary";
  progress?: number;
  showProgress?: boolean;
  onClick?: () => void;
  badge?: {
    label: string;
    variant: "default" | "warning" | "success" | "destructive" | "secondary";
  };
  tooltip?: string;
  subValue?: string;
}

const KPICard = ({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
  progress,
  showProgress = false,
  onClick,
  badge,
  tooltip,
  subValue,
}: KPICardProps) => {
  const variantStyles = {
    default: {
      bgFromColor: "var(--dashboard-default-from)",
      bgViaColor: "var(--dashboard-default-via)",
      bgToColor: "var(--dashboard-default-to)",
      iconBgColor: "var(--dashboard-default-icon-bg)",
      iconTextColor: "var(--dashboard-default-icon-text)",
      accentColor: "var(--dashboard-default-accent)",
    },
    success: {
      bgFromColor: "var(--dashboard-success-from)",
      bgViaColor: "var(--dashboard-success-via)",
      bgToColor: "var(--dashboard-success-to)",
      iconBgColor: "var(--dashboard-success-icon-bg)",
      iconTextColor: "var(--dashboard-success-icon-text)",
      accentColor: "var(--dashboard-success-accent)",
    },
    warning: {
      bgFromColor: "var(--dashboard-warning-from)",
      bgViaColor: "var(--dashboard-warning-via)",
      bgToColor: "var(--dashboard-warning-to)",
      iconBgColor: "var(--dashboard-warning-icon-bg)",
      iconTextColor: "var(--dashboard-warning-icon-text)",
      accentColor: "var(--dashboard-warning-accent)",
    },
    danger: {
      bgFromColor: "var(--dashboard-danger-from)",
      bgViaColor: "var(--dashboard-danger-via)",
      bgToColor: "var(--dashboard-danger-to)",
      iconBgColor: "var(--dashboard-danger-icon-bg)",
      iconTextColor: "var(--dashboard-danger-icon-text)",
      accentColor: "var(--dashboard-danger-accent)",
    },
    primary: {
      bgFromColor: "#eff6ff",
      bgViaColor: "#dbeafe",
      bgToColor: "#bfdbfe",
      iconBgColor: "#3b82f6",
      iconTextColor: "#ffffff",
      accentColor: "#2563eb",
    },
  };

  const config = variantStyles[variant];

  const cardContent = (
    <Card
      className={cn(
        "relative overflow-hidden border border-[var(--border)] shadow-lg transition-all duration-300",
        onClick && "cursor-pointer hover:shadow-xl hover:scale-[1.02]"
      )}
      style={{
        background: `linear-gradient(135deg, ${config.bgFromColor}, ${config.bgViaColor}, ${config.bgToColor})`,
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>

      {/* Badge indicator */}
      {badge && (
        <div className="absolute top-3 right-3 z-20">
          <Badge
            variant={
              badge.variant === "warning" || badge.variant === "success" ? "outline" : badge.variant
            }
            className={cn(
              "text-xs",
              badge.variant === "warning" && "border-amber-400 bg-amber-50 text-amber-700",
              badge.variant === "success" && "border-green-400 bg-green-50 text-green-700"
            )}
          >
            {badge.label}
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-[var(--foreground)] pr-16">
            {title}
          </CardTitle>
          <div className="p-3 rounded-sm shadow-sm" style={{ backgroundColor: config.iconBgColor }}>
            <Icon className="h-5 w-5" style={{ color: config.iconTextColor }} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[var(--foreground)]">{value}</span>
            {subValue && <span className="text-sm text-[var(--muted-foreground)]">{subValue}</span>}
          </div>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{description}</p>
          {showProgress && progress !== undefined && (
            <div className="space-y-2 bg-[var(--hover)] backdrop-blur-sm rounded-sm p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-[var(--foreground)]">Progress</span>
                <span className="text-xs font-bold" style={{ color: config.accentColor }}>
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="h-2 bg-[var(--border)]" />
            </div>
          )}
          {onClick && (
            <div
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: config.accentColor }}
            >
              <span>View details</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
};

interface KPICardsProps {
  data: {
    barangaySubmissions: { current: number; total: number };
    awaitingReview: number;
    inRework: number;
    validatedReady: number;
    // Enhanced KPI data
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

export function KPICards({ data }: KPICardsProps) {
  const router = useRouter();
  const submissionProgress = Math.round(
    (data.barangaySubmissions.current / data.barangaySubmissions.total) * 100
  );

  // Use new enhanced data if available, otherwise fallback to calculated values
  const awaitingMLGOOApproval = data.awaitingMLGOOApproval ?? 0;
  const completed = data.completed ?? 0;
  const passedCount = data.passedCount ?? 0;
  const failedCount = data.failedCount ?? 0;
  const passRate =
    data.passRate ?? (completed > 0 ? Math.round((passedCount / completed) * 100) : 0);
  const awaitingFinalValidation = data.awaitingFinalValidation ?? 0;
  const awaitingAssessorReview = data.awaitingAssessorReview ?? data.awaitingReview;

  // Calculate completion rate
  const completionRate =
    data.barangaySubmissions.total > 0
      ? Math.round((completed / data.barangaySubmissions.total) * 100)
      : 0;

  // Check if there are actions required
  const hasActionsRequired = awaitingMLGOOApproval > 0;

  return (
    <div className="space-y-6">
      {/* Action Required Alert */}
      {hasActionsRequired && (
        <Alert className="bg-amber-50 border-amber-200">
          <ClipboardCheck className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Action Required</AlertTitle>
          <AlertDescription className="text-amber-800">
            <button
              onClick={() => router.push("/mlgoo/submissions?status=AWAITING_MLGOO_APPROVAL")}
              className="flex items-center gap-1.5 hover:underline font-medium"
            >
              <span>
                {awaitingMLGOOApproval} assessment{awaitingMLGOOApproval !== 1 ? "s" : ""} awaiting
                your final approval
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Primary KPI Cards - Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Awaiting Your Approval - Most important for MLGOO */}
        <KPICard
          title="Awaiting Your Approval"
          value={awaitingMLGOOApproval.toString()}
          description="Final approval needed from you"
          icon={ClipboardCheck}
          variant={awaitingMLGOOApproval > 0 ? "warning" : "success"}
          onClick={() => router.push("/mlgoo/submissions?status=AWAITING_MLGOO_APPROVAL")}
          badge={
            awaitingMLGOOApproval > 0 ? { label: "Action Required", variant: "warning" } : undefined
          }
          tooltip="Assessments that have passed final validation and are ready for your approval"
        />

        {/* Submission Progress */}
        <KPICard
          title="Submission Progress"
          value={`${data.barangaySubmissions.current}`}
          subValue={`/ ${data.barangaySubmissions.total}`}
          description="Barangays have submitted"
          icon={TrendingUp}
          variant="primary"
          progress={submissionProgress}
          showProgress={true}
          onClick={() => router.push("/mlgoo/submissions")}
          tooltip="Total number of barangays that have submitted their assessments (excluding drafts)"
        />

        {/* Completed Assessments */}
        <KPICard
          title="Completed"
          value={completed.toString()}
          subValue={`(${completionRate}%)`}
          description={`${passedCount} passed, ${failedCount} failed`}
          icon={CheckCircle2}
          variant="success"
          onClick={() => router.push("/mlgoo/submissions?status=COMPLETED")}
          tooltip="Assessments that have completed the full workflow with final MLGOO approval"
        />

        {/* Pass Rate */}
        <KPICard
          title="Pass Rate"
          value={`${passRate}%`}
          description={
            completed > 0 ? `${passedCount} of ${completed} passed` : "No completed assessments yet"
          }
          icon={completed > 0 && passRate >= 50 ? CheckCircle2 : XCircle}
          variant={
            completed > 0
              ? passRate >= 70
                ? "success"
                : passRate >= 50
                  ? "warning"
                  : "danger"
              : "default"
          }
          tooltip="Percentage of completed assessments that passed SGLGB requirements"
        />
      </div>

      {/* Secondary KPI Cards - Pipeline Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Awaiting Assessor Review"
          value={awaitingAssessorReview.toString()}
          description="Submissions being reviewed"
          icon={Clock}
          variant="warning"
          onClick={() => router.push("/mlgoo/submissions?status=IN_REVIEW")}
          tooltip="Assessments currently being reviewed by assessors (Submitted + In Review statuses)"
        />

        <KPICard
          title="In Rework"
          value={data.inRework.toString()}
          description="Currently fixing issues"
          icon={RotateCcw}
          variant={data.inRework > 0 ? "warning" : "default"}
          onClick={() => router.push("/mlgoo/submissions?status=REWORK")}
          tooltip="Assessments sent back to BLGUs for corrections"
        />

        <KPICard
          title="With Final Validator"
          value={awaitingFinalValidation.toString()}
          description="Awaiting final validation"
          icon={FileCheck}
          variant="default"
          onClick={() => router.push("/mlgoo/submissions?status=AWAITING_FINAL_VALIDATION")}
          tooltip="Assessments being reviewed by validators before coming to you for approval"
        />
      </div>

      {/* Quick Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-[var(--muted)]/30 rounded-sm border">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-[var(--muted-foreground)]" />
          <span className="text-[var(--muted-foreground)]">Total Barangays:</span>
          <span className="font-semibold">{data.barangaySubmissions.total}</span>
        </div>
        <div className="h-4 w-px bg-[var(--border)]" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--muted-foreground)]">Not Started:</span>
          <span className="font-semibold">
            {data.notStarted ?? data.barangaySubmissions.total - data.barangaySubmissions.current}
          </span>
        </div>
        <div className="h-4 w-px bg-[var(--border)]" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--muted-foreground)]">In Pipeline:</span>
          <span className="font-semibold">{data.barangaySubmissions.current - completed}</span>
        </div>
        {completed > 0 && (
          <>
            <div className="h-4 w-px bg-[var(--border)]" />
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-600">{passedCount} Passed</span>
            </div>
            {failedCount > 0 && (
              <>
                <div className="h-4 w-px bg-[var(--border)]" />
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="font-semibold text-red-600">{failedCount} Failed</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
