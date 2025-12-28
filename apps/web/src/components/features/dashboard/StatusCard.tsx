"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AssessmentProgress, AssessmentStatus } from "@/types/dashboard";
import { Activity, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface StatusCardProps {
  status: AssessmentStatus;
  progress: AssessmentProgress;
}

// Circular Progress Component
const CircularProgress = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = "#3b82f6",
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-[var(--border)]"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-[var(--foreground)]">
            {Math.round(percentage)}%
          </div>
          <div className="text-xs text-[var(--text-secondary)]">Complete</div>
        </div>
      </div>
    </div>
  );
};

// Mini Trend Chart Component
const MiniTrendChart = ({ data, color = "#3b82f6" }: { data: number[]; color?: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="w-full h-16 relative">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          className="opacity-80"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <polygon fill="url(#gradient)" points={`0,100 ${points} 100,100`} />
      </svg>
    </div>
  );
};

export function StatusCard({ status, progress }: StatusCardProps) {
  const router = useRouter();

  const getStatusConfig = (status: AssessmentStatus) => {
    switch (status) {
      case "Draft":
        return {
          badgeText: "Draft",
          title: "Your assessment is currently in progress.",
          buttonText: "Continue Assessment",
          buttonAction: () => router.push("/blgu/assessments"),
          primaryColor: "#3b82f6",
          accentColor: "text-blue-500",
          icon: <TrendingUp className="h-5 w-5" style={{ color: "var(--kpi-blue-text)" }} />,
        };
      case "Needs Rework":
        return {
          badgeText: "NEEDS REWORK",
          title: "Your assessment requires rework.",
          buttonText: "View Feedback & Rework Items",
          buttonAction: () => router.push("/blgu/assessments"),
          primaryColor: "#f59e0b",
          accentColor: "text-amber-500",
          icon: (
            <AlertTriangle className="h-5 w-5" style={{ color: "var(--analytics-warning-text)" }} />
          ),
        };
      case "Submitted for Review":
        return {
          badgeText: "Submitted for Review",
          title: "Your assessment has been submitted and is awaiting review.",
          buttonText: "View My Submission (Read-Only)",
          buttonAction: () => router.push("/blgu/assessments"),
          primaryColor: "#8b5cf6",
          accentColor: "text-purple-500",
          icon: <CheckCircle2 className="h-5 w-5" style={{ color: "var(--kpi-purple-text)" }} />,
        };
      case "Validated":
        return {
          badgeText: "Validated",
          title: "Congratulations! Your pre-assessment has been validated.",
          buttonText: "View My Submission (Read-Only)",
          buttonAction: () => router.push("/blgu/assessments"),
          primaryColor: "#10b981",
          accentColor: "text-emerald-500",
          icon: (
            <CheckCircle2 className="h-5 w-5" style={{ color: "var(--analytics-success-text)" }} />
          ),
        };
    }
  };

  const config = getStatusConfig(status);

  // Mock trend data - in real app this would come from API
  const trendData = [65, 68, 70, 72, 75, 73, 76, 78, progress.percentage];

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] shadow-lg hover:shadow-xl transition-all duration-300 rounded-sm">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--cityscape-yellow)]/5 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[var(--cityscape-yellow)]/3 rounded-full translate-y-12 -translate-x-12"></div>

        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
              {config.icon}
              Current Pre-Assessment Status
            </CardTitle>
            <Badge
              className={`px-3 py-1 text-xs font-medium rounded-sm bg-[var(--cityscape-yellow)]/20 text-[var(--cityscape-yellow)] border border-[var(--cityscape-yellow)]/30`}
            >
              {config.badgeText}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left side - Progress Circle and Stats */}
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <CircularProgress
                  percentage={progress.percentage}
                  color={config.primaryColor}
                  size={140}
                  strokeWidth={10}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-3 border border-[var(--border)]">
                  <div className="text-xl font-bold text-[var(--foreground)]">
                    {progress.current}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Compliant</div>
                </div>
                <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-3 border border-[var(--border)]">
                  <div className="text-xl font-bold text-[var(--foreground)]">
                    {progress.total - progress.current}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Remaining</div>
                </div>
                <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-3 border border-[var(--border)]">
                  <div className="text-xl font-bold text-[var(--foreground)]">{progress.total}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Total</div>
                </div>
              </div>
            </div>

            {/* Right side - Trend and Details */}
            <div className="space-y-4">
              <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-4 border border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    Progress Trend
                  </span>
                  <Activity className="h-4 w-4 text-[var(--icon-default)]" />
                </div>
                <MiniTrendChart data={trendData} color={config.primaryColor} />
                <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-2">
                  <span>Last 30 days</span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />+
                    {Math.round(progress.percentage - trendData[0])}%
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-medium text-[var(--foreground)] leading-relaxed">
                  {config.title}
                </h3>

                <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-3 border border-[var(--border)]">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-[var(--text-secondary)]">
                      Overall Progress
                    </span>
                    <span className="text-[var(--text-secondary)] font-mono">
                      {progress.current} / {progress.total} Indicators
                    </span>
                  </div>
                  <Progress
                    value={progress.percentage}
                    className="h-2 bg-[var(--border)]/60 mt-2"
                    progressColor={config.primaryColor}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={config.buttonAction}
            className="w-full h-12 text-sm font-medium bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-[var(--cityscape-accent-foreground)] rounded-sm shadow-lg hover:shadow-xl transition-all duration-200 mt-6"
          >
            {config.buttonText}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
