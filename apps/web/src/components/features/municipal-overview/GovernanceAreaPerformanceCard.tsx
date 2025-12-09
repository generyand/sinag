"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, AlertTriangle } from "lucide-react";
import { AnalyticsEmptyState } from "@/components/features/analytics";
import type {
  GovernanceAreaPerformanceList,
  AppSchemasMunicipalInsightsGovernanceAreaPerformance,
} from "@sinag/shared";

interface GovernanceAreaPerformanceCardProps {
  data: GovernanceAreaPerformanceList | null | undefined;
}

/**
 * Returns the appropriate color based on pass rate.
 */
function getPassRateColor(rate: number): { text: string; progress: string } {
  if (rate >= 70) {
    return { text: "text-green-600", progress: "#16a34a" };
  }
  if (rate >= 50) {
    return { text: "text-yellow-600", progress: "#ca8a04" };
  }
  return { text: "text-red-600", progress: "#dc2626" };
}

export function GovernanceAreaPerformanceCard({ data }: GovernanceAreaPerformanceCardProps) {
  const hasData = data && data.areas && data.areas.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" aria-hidden="true" />
          Governance Area Performance
        </CardTitle>
        {hasData && (
          <div className="flex gap-4 text-sm" role="group" aria-label="Summary rates">
            <span className="text-blue-600">
              Core Areas: <strong>{data.core_areas_pass_rate.toFixed(1)}%</strong>
            </span>
            <span className="text-purple-600">
              Essential Areas: <strong>{data.essential_areas_pass_rate.toFixed(1)}%</strong>
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <AnalyticsEmptyState variant="no-assessments" compact />
        ) : (
          <div className="space-y-4" role="list" aria-label="Governance areas">
            {data!.areas!.map((area: AppSchemasMunicipalInsightsGovernanceAreaPerformance) => {
              const rateColors = getPassRateColor(area.pass_rate);
              return (
                <div
                  key={area.id}
                  className="p-4 bg-[var(--muted)]/30 rounded-sm border border-[var(--border)]"
                  role="listitem"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--foreground)]">{area.name}</span>
                      <Badge
                        className={`rounded-sm ${
                          area.area_type === "CORE"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                        }`}
                      >
                        {area.area_type}
                      </Badge>
                    </div>
                    <span className={`text-sm font-bold ${rateColors.text}`}>
                      {area.pass_rate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={area.pass_rate}
                    className="h-2 mb-2"
                    progressColor={rateColors.progress}
                    aria-label={`${area.name} pass rate: ${area.pass_rate.toFixed(1)}%`}
                  />
                  <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                    <span>{area.passed_count} passed</span>
                    <span>{area.failed_count} failed</span>
                    <span>{area.total_indicators} indicators</span>
                  </div>
                  {area.common_weaknesses && area.common_weaknesses.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--border)]">
                      <div className="flex items-center gap-1 text-xs text-amber-600 mb-1">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        Common Weaknesses
                      </div>
                      <ul className="text-xs text-[var(--muted-foreground)] space-y-1">
                        {area.common_weaknesses.slice(0, 2).map((weakness: string, idx: number) => (
                          <li key={idx} className="truncate">
                            • {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
