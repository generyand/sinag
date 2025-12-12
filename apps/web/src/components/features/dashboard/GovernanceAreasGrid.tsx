"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GovernanceAreaProgress } from "@/types/dashboard";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Minus,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface GovernanceAreasGridProps {
  areas: GovernanceAreaProgress[];
}

// Mini Bar Chart Component
const MiniBarChart = ({ data, color = "#3b82f6" }: { data: number[]; color?: string }) => {
  const max = Math.max(...data);

  return (
    <div className="flex items-end gap-1 h-8">
      {data.map((value, index) => (
        <div
          key={index}
          className="flex-1 rounded-sm transition-all duration-300"
          style={{
            backgroundColor: color,
            height: `${(value / max) * 100}%`,
            opacity: 0.7 + (value / max) * 0.3,
          }}
        />
      ))}
    </div>
  );
};

// Circular Progress Ring
const CircularProgressRing = ({
  percentage,
  size = 60,
  strokeWidth = 4,
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-[var(--border)]"
        />
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
        <span className="text-xs font-bold text-[var(--foreground)]">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
};

export function GovernanceAreasGrid({ areas }: GovernanceAreasGridProps) {
  const router = useRouter();

  // Function to get the logo path based on area name
  const getAreaLogo = (areaName: string) => {
    const name = areaName.toLowerCase();

    if (name.includes("financial") || name.includes("admin")) {
      return "/Assessment_Areas/financialAdmin.webp";
    } else if (name.includes("disaster") || name.includes("preparedness")) {
      return "/Assessment_Areas/disasterPreparedness.webp";
    } else if (name.includes("safety") || name.includes("peace") || name.includes("order")) {
      return "/Assessment_Areas/safetyPeaceAndOrder.webp";
    } else if (
      name.includes("social") ||
      name.includes("protection") ||
      name.includes("sensitivity")
    ) {
      return "/Assessment_Areas/socialProtectAndSensitivity.webp";
    } else if (
      name.includes("business") ||
      name.includes("friendliness") ||
      name.includes("competitiveness")
    ) {
      return "/Assessment_Areas/businessFriendliness.webp";
    } else if (name.includes("environmental") || name.includes("management")) {
      return "/Assessment_Areas/environmentalManagement.webp";
    }

    // Default fallback
    return "/Assessment_Areas/financialAdmin.webp";
  };

  const getAreaConfig = (
    areaName: string,
    status: GovernanceAreaProgress["status"],
    percentage: number
  ) => {
    const name = areaName.toLowerCase();
    const logoPath = getAreaLogo(areaName);

    let baseConfig = {
      logoPath,
      color: "var(--analytics-neutral-border)",
      bgGradient: "var(--analytics-neutral-bg)",
      accentColor: "var(--analytics-neutral-text)",
    };

    if (name.includes("financial")) {
      baseConfig = {
        logoPath,
        color: "var(--analytics-success)",
        bgGradient: "var(--analytics-success-bg)",
        accentColor: "var(--analytics-success-text)",
      };
    } else if (name.includes("disaster")) {
      baseConfig = {
        logoPath,
        color: "var(--kpi-blue-text)",
        bgGradient: "var(--kpi-blue-from)",
        accentColor: "var(--kpi-blue-text)",
      };
    } else if (name.includes("safety") || name.includes("peace")) {
      baseConfig = {
        logoPath,
        color: "var(--analytics-warning)",
        bgGradient: "var(--analytics-warning-bg)",
        accentColor: "var(--analytics-warning-text)",
      };
    } else if (name.includes("social") || name.includes("protection")) {
      baseConfig = {
        logoPath,
        color: "var(--kpi-purple-text)",
        bgGradient: "var(--kpi-purple-from)",
        accentColor: "var(--kpi-purple-text)",
      };
    } else if (name.includes("business") || name.includes("competitiveness")) {
      baseConfig = {
        logoPath,
        color: "var(--kpi-purple-text)",
        bgGradient: "var(--kpi-purple-from)",
        accentColor: "var(--kpi-purple-text)",
      };
    } else if (name.includes("environmental")) {
      baseConfig = {
        logoPath,
        color: "var(--analytics-success)",
        bgGradient: "var(--analytics-success-bg)",
        accentColor: "var(--analytics-success-text)",
      };
    }

    // Status-based modifications
    const statusIcon = {
      completed: (
        <CheckCircle className="h-4 w-4" style={{ color: "var(--analytics-success-text)" }} />
      ),
      "needs-rework": (
        <XCircle className="h-4 w-4" style={{ color: "var(--analytics-danger-text)" }} />
      ),
      "in-progress": <Clock className="h-4 w-4" style={{ color: "var(--kpi-blue-text)" }} />,
      "not-started": (
        <AlertCircle className="h-4 w-4" style={{ color: "var(--analytics-neutral-text)" }} />
      ),
    }[status];

    const trendIcon =
      percentage >= 70 ? (
        <TrendingUp className="h-3 w-3" style={{ color: "var(--analytics-success)" }} />
      ) : percentage >= 40 ? (
        <Minus className="h-3 w-3" style={{ color: "var(--analytics-warning)" }} />
      ) : (
        <TrendingDown className="h-3 w-3" style={{ color: "var(--analytics-danger)" }} />
      );

    return { ...baseConfig, statusIcon, trendIcon };
  };

  const handleAreaClick = (areaId: number) => {
    router.push(`/blgu/assessments?area=${areaId}`);
  };

  // Mock data for mini charts - in real app this would come from API
  const generateMockData = () =>
    Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 20);

  return (
    <div className="space-y-8">
      {/* Header with enhanced styling */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">Assessment Areas</h2>
        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
          Monitor progress across all governance areas. Click on any area to dive deeper into
          detailed assessments and requirements.
        </p>
        {/* Removed summary stats (quick stats) here */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map((area) => {
          const config = getAreaConfig(area.name, area.status, area.completion_percentage);
          const mockChartData = generateMockData();

          return (
            <Card
              key={area.id}
              className={`group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] bg-[var(--card)] border border-[var(--border)] shadow-lg overflow-hidden relative rounded-sm`}
              onClick={() => handleAreaClick(area.id)}
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--cityscape-yellow)]/10 rounded-full -translate-y-10 translate-x-10"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-[var(--cityscape-yellow)]/5 rounded-full translate-y-8 -translate-x-8"></div>

              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-sm bg-[var(--card)]/90 shadow-sm border border-[var(--border)]">
                      <Image
                        src={config.logoPath}
                        alt={`${area.name} logo`}
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      {config.statusIcon}
                      {config.trendIcon}
                    </div>
                  </div>
                  <CircularProgressRing
                    percentage={area.completion_percentage}
                    color={config.color}
                    size={50}
                    strokeWidth={3}
                  />
                </div>
                <CardTitle className="text-sm font-semibold line-clamp-2 text-[var(--foreground)] mt-2">
                  {area.name}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 relative z-10">
                {/* Progress section with enhanced visuals */}
                <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-3 space-y-3 border border-[var(--border)]">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      Progress Overview
                    </span>
                    <Badge
                      className="text-xs px-2 py-1 rounded-sm bg-[var(--card)]/80 border-0"
                      style={{ color: config.accentColor }}
                    >
                      {area.completed_indicators}/{area.total_indicators} Compliant
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Progress
                      value={area.completion_percentage}
                      className="h-2 bg-[var(--border)]/60"
                      progressColor={config.color}
                    />
                    <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>{Math.round(area.completion_percentage)}% Complete</span>
                      <span>{area.total_indicators - area.completed_indicators} Remaining</span>
                    </div>
                  </div>
                </div>

                {/* Mini trend chart */}
                <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-3 border border-[var(--border)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      7-Day Trend
                    </span>
                    <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                      {config.trendIcon}
                      <span>Activity</span>
                    </div>
                  </div>
                  <MiniBarChart data={mockChartData} color={config.color} />
                </div>

                {/* Enhanced stats grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-2 text-center border border-[var(--border)]">
                    <div className="text-lg font-bold text-[var(--foreground)]">
                      {area.completed_indicators}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">Done</div>
                  </div>
                  <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-2 text-center border border-[var(--border)]">
                    <div className="text-lg font-bold text-[var(--foreground)]">
                      {area.total_indicators - area.completed_indicators}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">Todo</div>
                  </div>
                  <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-2 text-center border border-[var(--border)]">
                    <div className="text-lg font-bold text-[var(--foreground)]">
                      {area.total_indicators}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">Total</div>
                  </div>
                </div>

                {/* Hover effect indicator */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-center">
                  <span className="text-xs text-[var(--text-secondary)] bg-[var(--card)]/80 px-3 py-1 rounded-sm border border-[var(--border)]">
                    Click to view details →
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
