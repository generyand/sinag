"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";

interface FailedIndicator {
  id: string;
  code: string;
  name: string;
  failedCount: number;
  totalBarangays: number;
  percentage: number;
  governanceArea: string;
}

interface FailedIndicatorsProps {
  data: FailedIndicator[];
  totalBarangays: number;
}

const getSeverityColor = (percentage: number) => {
  if (percentage >= 50)
    return { color: "var(--analytics-danger-text)", bgColor: "var(--analytics-danger-bg)" };
  if (percentage >= 30)
    return { color: "var(--analytics-warning-text)", bgColor: "var(--analytics-warning-bg)" };
  return { color: "var(--analytics-neutral-text)", bgColor: "var(--analytics-neutral-bg)" };
};

const getGovernanceAreaColor = (area: string) => {
  const colors = {
    "Environmental Management": {
      color: "var(--analytics-success-text)",
      bgColor: "var(--analytics-success-bg)",
    },
    "Financial Administration": { color: "var(--kpi-blue-text)", bgColor: "var(--kpi-blue-from)" },
    "Disaster Preparedness": { color: "var(--kpi-purple-text)", bgColor: "var(--kpi-purple-from)" },
    "Social Protection": { color: "var(--kpi-purple-text)", bgColor: "var(--kpi-purple-from)" },
    "Safety, Peace and Order": {
      color: "var(--analytics-danger-text)",
      bgColor: "var(--analytics-danger-bg)",
    },
    "Business-Friendliness": { color: "var(--kpi-blue-text)", bgColor: "var(--kpi-blue-from)" },
  };
  return (
    colors[area as keyof typeof colors] || {
      color: "var(--analytics-neutral-text)",
      bgColor: "var(--analytics-neutral-bg)",
    }
  );
};

export function FailedIndicators({ data, totalBarangays }: FailedIndicatorsProps) {
  const criticalIssues = data.filter((item) => item.percentage >= 30).length;
  const totalFailures = data.reduce((sum, item) => sum + item.failedCount, 0);

  return (
    <Card className="bg-[var(--card)] border border-[var(--border)] shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-[var(--foreground)]">
              Most Commonly Failed Indicators
            </CardTitle>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Systemic weaknesses requiring municipal-level training
            </p>
          </div>
          <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]">
            <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              {criticalIssues}
            </div>
            <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
              Critical Issues
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {criticalIssues > 0 && (
            <div
              className="rounded-sm p-4 backdrop-blur-sm border"
              style={{
                backgroundColor: "var(--analytics-warning-bg)",
                borderColor: "var(--analytics-warning-border)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-sm flex items-center justify-center"
                  style={{ backgroundColor: "var(--analytics-warning-bg)" }}
                >
                  <AlertTriangle
                    className="h-4 w-4"
                    style={{ color: "var(--analytics-warning-text)" }}
                  />
                </div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--analytics-warning-text)" }}
                >
                  {criticalIssues} indicator{criticalIssues > 1 ? "s" : ""} with 30%+ failure rate -
                  consider organizing focused training sessions
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {data.slice(0, 8).map((indicator) => (
              <div
                key={indicator.id}
                className="p-4 rounded-sm border transition-all duration-200 hover:shadow-md"
                style={{
                  backgroundColor:
                    indicator.percentage >= 30
                      ? "var(--analytics-danger-bg)"
                      : indicator.percentage >= 15
                        ? "var(--analytics-warning-bg)"
                        : "var(--hover)",
                  borderColor:
                    indicator.percentage >= 30
                      ? "var(--analytics-danger-border)"
                      : indicator.percentage >= 15
                        ? "var(--analytics-warning-border)"
                        : "var(--border)",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {indicator.governanceArea && (
                        <Badge
                          variant="secondary"
                          className="text-xs font-medium rounded-sm"
                          style={getGovernanceAreaColor(indicator.governanceArea)}
                        >
                          {indicator.governanceArea}
                        </Badge>
                      )}
                      <span className="text-xs font-mono text-[var(--muted-foreground)] bg-[var(--hover)] px-2 py-1 rounded-sm">
                        {indicator.code}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm text-[var(--foreground)] leading-relaxed">
                      {indicator.name}
                    </h4>
                  </div>
                  <div className="text-right ml-4">
                    <div
                      className="text-2xl font-bold"
                      style={{ color: getSeverityColor(indicator.percentage).color }}
                    >
                      {indicator.failedCount}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      of {totalBarangays}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--foreground)]">Failure Rate</span>
                    <span
                      className="font-bold text-sm"
                      style={{ color: getSeverityColor(indicator.percentage).color }}
                    >
                      {indicator.percentage}%
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={indicator.percentage} className="h-2 bg-[var(--border)]" />
                    <div
                      className="absolute top-0 left-0 h-2 rounded-sm transition-all duration-500"
                      style={{
                        backgroundColor:
                          indicator.percentage >= 50
                            ? "var(--analytics-danger)"
                            : indicator.percentage >= 30
                              ? "var(--analytics-danger)"
                              : indicator.percentage >= 15
                                ? "var(--analytics-warning)"
                                : "var(--analytics-neutral-border)",
                        width: `${indicator.percentage}%`,
                      }}
                    />
                  </div>
                </div>

                {indicator.percentage >= 30 && (
                  <div
                    className="mt-3 p-3 bg-[var(--hover)] backdrop-blur-sm rounded-sm border"
                    style={{ borderColor: "var(--analytics-danger-border)" }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm" style={{ color: "var(--analytics-danger-text)" }}>
                        🎯
                      </span>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "var(--analytics-danger-text)" }}
                      >
                        <span className="font-semibold">Priority:</span> High failure rate suggests
                        need for municipal-level training on {indicator.name.toLowerCase()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {data.length > 8 && (
            <div className="text-center py-3 bg-[var(--hover)] rounded-sm">
              <p className="text-sm text-[var(--muted-foreground)]">
                Showing top 8 indicators • <span className="font-semibold">{data.length - 8}</span>{" "}
                more indicators available
              </p>
            </div>
          )}

          <div className="bg-[var(--hover)] rounded-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--analytics-danger)" }}
                ></div>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Total Failures: {totalFailures}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: "var(--analytics-success)" }}
                ></div>
                <span className="text-sm text-[var(--muted-foreground)]">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
