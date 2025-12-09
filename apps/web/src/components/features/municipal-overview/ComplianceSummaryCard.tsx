"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, FileSearch } from "lucide-react";
import { AnalyticsEmptyState } from "@/components/features/analytics";
import type { MunicipalComplianceSummary } from "@sinag/shared";

interface ComplianceSummaryCardProps {
  data: MunicipalComplianceSummary | null | undefined;
  isLoading?: boolean;
}

/**
 * Returns the appropriate color based on rate value.
 * - Green (≥70%): Healthy compliance
 * - Yellow (50-69%): Needs attention
 * - Red (<50%): Critical
 */
function getComplianceColor(rate: number): { text: string; progress: string } {
  if (rate >= 70) {
    return { text: "text-green-600", progress: "#16a34a" }; // green-600
  }
  if (rate >= 50) {
    return { text: "text-yellow-600", progress: "#ca8a04" }; // yellow-600
  }
  return { text: "text-red-600", progress: "#dc2626" }; // red-600
}

/**
 * Returns the appropriate color for assessment progress.
 * Uses blue for progress (neutral/informational).
 */
function getProgressColor(rate: number): { text: string; progress: string } {
  if (rate >= 70) {
    return { text: "text-blue-600", progress: "#2563eb" }; // blue-600
  }
  if (rate >= 50) {
    return { text: "text-blue-500", progress: "#3b82f6" }; // blue-500
  }
  return { text: "text-blue-400", progress: "#60a5fa" }; // blue-400
}

export function ComplianceSummaryCard({ data, isLoading }: ComplianceSummaryCardProps) {
  const hasData = data && data.total_barangays > 0;
  const complianceColors = hasData ? getComplianceColor(data.compliance_rate) : null;
  const progressColors = hasData ? getProgressColor(data.assessment_rate) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" aria-hidden="true" />
          Municipal Compliance Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasData ? (
          <AnalyticsEmptyState variant="no-data" compact />
        ) : (
          <>
            {/* Main Stats Grid */}
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              role="group"
              aria-label="Compliance statistics"
            >
              <div className="text-center p-4 bg-[var(--muted)]/30 rounded-sm">
                <p className="text-3xl font-bold text-[var(--foreground)]">
                  {data.total_barangays}
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">Total Barangays</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-sm">
                <p className="text-3xl font-bold text-blue-600">{data.assessed_barangays}</p>
                <p className="text-sm text-[var(--muted-foreground)]">Assessed</p>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-sm">
                <p className="text-3xl font-bold text-green-600">{data.passed_barangays}</p>
                <p className="text-sm text-[var(--muted-foreground)]">Passed SGLGB</p>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-sm">
                <p className="text-3xl font-bold text-red-600">{data.failed_barangays}</p>
                <p className="text-sm text-[var(--muted-foreground)]">Failed SGLGB</p>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-4" role="group" aria-label="Progress indicators">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    Compliance Rate
                  </span>
                  <span className={`text-sm font-bold ${complianceColors?.text}`}>
                    {data.compliance_rate.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={data.compliance_rate}
                  className="h-2"
                  progressColor={complianceColors?.progress}
                  aria-label={`Compliance rate: ${data.compliance_rate.toFixed(1)}%`}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    Assessment Progress
                  </span>
                  <span className={`text-sm font-bold ${progressColors?.text}`}>
                    {data.assessment_rate.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={data.assessment_rate}
                  className="h-2"
                  progressColor={progressColors?.progress}
                  aria-label={`Assessment progress: ${data.assessment_rate.toFixed(1)}%`}
                />
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Status indicators">
              <Badge variant="outline" className="flex items-center gap-1 rounded-sm">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {data.pending_mlgoo_approval} Pending Approval
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1 rounded-sm">
                <FileSearch className="h-3 w-3" aria-hidden="true" />
                {data.in_progress} In Progress
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
