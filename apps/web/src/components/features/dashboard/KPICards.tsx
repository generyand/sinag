"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertTriangle, TrendingUp } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "danger";
  progress?: number;
  showProgress?: boolean;
}

const KPICard = ({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
  progress,
  showProgress = false,
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
  };

  const config = variantStyles[variant];

  return (
    <Card
      className="relative overflow-hidden border border-[var(--border)] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: `linear-gradient(135deg, ${config.bgFromColor}, ${config.bgViaColor}, ${config.bgToColor})`,
      }}
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-[var(--foreground)]">{title}</CardTitle>
          <div className="p-3 rounded-sm shadow-sm" style={{ backgroundColor: config.iconBgColor }}>
            <Icon className="h-5 w-5" style={{ color: config.iconTextColor }} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="space-y-3">
          <div className="text-3xl font-bold text-[var(--foreground)]">{value}</div>
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
        </div>
      </CardContent>
    </Card>
  );
};

interface KPICardsProps {
  data: {
    barangaySubmissions: { current: number; total: number };
    awaitingReview: number;
    inRework: number;
    validatedReady: number;
  };
}

export function KPICards({ data }: KPICardsProps) {
  const submissionProgress = Math.round(
    (data.barangaySubmissions.current / data.barangaySubmissions.total) * 100
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <KPICard
        title="Barangay Submissions"
        value={`${data.barangaySubmissions.current} / ${data.barangaySubmissions.total}`}
        description="Total submissions received"
        icon={TrendingUp}
        variant="default"
        progress={submissionProgress}
        showProgress={true}
      />

      <KPICard
        title="Awaiting Assessor Review"
        value={data.awaitingReview.toString()}
        description="Submissions waiting for validation"
        icon={Clock}
        variant="warning"
      />

      <KPICard
        title="Barangays in Rework"
        value={data.inRework.toString()}
        description="Currently fixing issues"
        icon={AlertTriangle}
        variant="warning"
      />

      <KPICard
        title="Validated & Ready"
        value={data.validatedReady.toString()}
        description="Ready for offline validation"
        icon={CheckCircle2}
        variant="success"
      />
    </div>
  );
}
