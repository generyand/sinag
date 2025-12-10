"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIndicatorName } from "@/lib/utils/text-formatter";
import { cn } from "@/lib/utils";

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
  year?: number;
}

const getSeverityColor = (percentage: number): string => {
  if (percentage >= 50) return "var(--analytics-danger)";
  if (percentage >= 30) return "var(--analytics-warning)";
  return "var(--analytics-neutral)";
};

const getSeverityLabel = (percentage: number): string => {
  if (percentage >= 50) return "Critical";
  if (percentage >= 30) return "High";
  return "Moderate";
};

const getSeverityBgColor = (percentage: number): string => {
  if (percentage >= 50) return "var(--analytics-danger-bg)";
  if (percentage >= 30) return "var(--analytics-warning-bg)";
  return "transparent";
};

const getGovernanceAreaColor = (area: string) => {
  const colors: Record<string, { color: string; bgColor: string }> = {
    "Environmental Management": {
      color: "var(--analytics-success-text)",
      bgColor: "var(--analytics-success-bg)",
    },
    "Financial Administration and Sustainability": {
      color: "#1d4ed8",
      bgColor: "#dbeafe",
    },
    "Financial Administration": {
      color: "#1d4ed8",
      bgColor: "#dbeafe",
    },
    "Disaster Preparedness": {
      color: "#9333ea",
      bgColor: "#f3e8ff",
    },
    "Social Protection": {
      color: "#db2777",
      bgColor: "#fce7f3",
    },
    "Safety, Peace and Order": {
      color: "var(--analytics-danger-text)",
      bgColor: "var(--analytics-danger-bg)",
    },
    "Business-Friendliness": {
      color: "#0891b2",
      bgColor: "#cffafe",
    },
  };
  return (
    colors[area] || {
      color: "var(--analytics-neutral-text)",
      bgColor: "var(--analytics-neutral-bg)",
    }
  );
};

export function FailedIndicators({ data, totalBarangays, year }: FailedIndicatorsProps) {
  const [showAll, setShowAll] = useState(false);
  const criticalIssues = data.filter((item) => item.percentage >= 30).length;
  const totalFailures = data.reduce((sum, item) => sum + item.failedCount, 0);
  const displayYear = year ?? new Date().getFullYear();

  const displayedData = showAll ? data : data.slice(0, 5);

  // Empty state
  if (data.length === 0) {
    return (
      <Card className="border border-[var(--border)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            Top Failing Indicators
          </CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Systemic weaknesses requiring intervention
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 mx-auto text-[var(--muted-foreground)]/50 mb-3" />
            <h3 className="font-semibold text-lg mb-1 text-[var(--foreground)]">
              No Critical Issues
            </h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              All indicators are performing well across barangays
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-[var(--border)]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
              Top Failing Indicators
            </CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Systemic weaknesses requiring intervention
            </p>
          </div>
          {criticalIssues > 0 && (
            <Badge variant="destructive" className="h-fit shrink-0">
              {criticalIssues} Critical
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Critical alert banner */}
        {criticalIssues > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-md bg-[var(--destructive)]/10 border border-[var(--destructive)]/20">
            <AlertTriangle className="h-4 w-4 text-[var(--destructive)] shrink-0" />
            <p className="text-sm text-[var(--destructive)]">
              {criticalIssues} indicator{criticalIssues > 1 ? "s" : ""} with 30%+ failure rate —
              consider organizing focused training sessions
            </p>
          </div>
        )}

        {/* Indicator cards */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {displayedData.map((indicator) => {
            const severityColor = getSeverityColor(indicator.percentage);
            const isCritical = indicator.percentage >= 30;

            const areaColors = getGovernanceAreaColor(indicator.governanceArea);

            return (
              <div
                key={indicator.id}
                className="group border-l-4 border border-[var(--border)] rounded-r-lg p-4 hover:shadow-md transition-all duration-200"
                style={{
                  borderLeftColor: severityColor,
                  backgroundColor: getSeverityBgColor(indicator.percentage),
                }}
              >
                <div className="space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Metadata row */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="text-xs font-medium px-2 py-0.5"
                          style={{
                            color: areaColors.color,
                            backgroundColor: areaColors.bgColor,
                          }}
                        >
                          {indicator.governanceArea}
                        </Badge>
                        <span className="text-xs font-mono text-[var(--muted-foreground)] bg-[var(--muted)]/50 px-1.5 py-0.5 rounded">
                          {indicator.code}
                        </span>
                      </div>
                      {/* Indicator name - primary focus */}
                      <h4 className="font-semibold text-sm leading-tight text-[var(--foreground)]">
                        {formatIndicatorName(indicator.name, displayYear)}
                      </h4>
                    </div>

                    {/* Failure metric */}
                    <div className="text-right shrink-0">
                      <div
                        className="text-2xl font-bold tabular-nums"
                        style={{ color: severityColor }}
                      >
                        {indicator.failedCount}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        of {totalBarangays}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--muted-foreground)]">Failure rate</span>
                      <span
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: severityColor }}
                      >
                        {indicator.percentage}%
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                      <div
                        className="h-full transition-all duration-500 rounded-full"
                        style={{
                          width: `${indicator.percentage}%`,
                          backgroundColor: severityColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Priority hint for critical items */}
                  {isCritical && (
                    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] pt-1">
                      <AlertTriangle className="h-3.5 w-3.5" style={{ color: severityColor }} />
                      <span>
                        <span className="font-medium" style={{ color: severityColor }}>
                          {getSeverityLabel(indicator.percentage)} priority
                        </span>{" "}
                        — recommended for municipal training
                      </span>
                    </div>
                  )}

                  {/* Screen reader only severity */}
                  <span className="sr-only">
                    {getSeverityLabel(indicator.percentage)} severity indicator
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show more/less button */}
        {data.length > 5 && (
          <Button
            variant="ghost"
            className="w-full text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : `Show ${data.length - 5} More Indicators`}
            <ChevronDown
              className={cn("ml-2 h-4 w-4 transition-transform", showAll && "rotate-180")}
            />
          </Button>
        )}

        {/* Summary footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--analytics-danger)" }}
            />
            <span className="text-sm font-medium text-[var(--foreground)]">
              {totalFailures} total failures across {data.length} indicators
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
