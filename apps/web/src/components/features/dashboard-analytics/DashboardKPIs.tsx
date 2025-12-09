"use client";

import { AnalyticsEmptyState } from "@/components/features/analytics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  AreaBreakdown,
  BarangayRanking,
  ComplianceRate,
  FailedIndicator,
} from "@sinag/shared";
import { AlertCircle, CheckCircle2, Info, TrendingDown, TrendingUp, XCircle } from "lucide-react";

/**
 * Returns semantic color based on percentage value.
 * - Green: ≥70% (good performance)
 * - Yellow: 50-69% (needs improvement)
 * - Red: <50% (critical)
 */
function getSemanticColor(percentage: number): { text: string; progress: string; badge: string } {
  if (percentage >= 70) {
    return {
      text: "text-green-600 dark:text-green-400",
      progress: "#16a34a", // green-600
      badge: "border-green-600 dark:border-green-400 text-green-700 dark:text-green-300",
    };
  }
  if (percentage >= 50) {
    return {
      text: "text-yellow-600 dark:text-yellow-400",
      progress: "#ca8a04", // yellow-600
      badge: "border-yellow-600 dark:border-yellow-400 text-yellow-700 dark:text-yellow-300",
    };
  }
  return {
    text: "text-red-600 dark:text-red-400",
    progress: "#dc2626", // red-600
    badge: "border-red-600 dark:border-red-400 text-red-700 dark:text-red-300",
  };
}

/**
 * ComplianceRateCard - Displays overall pass/fail compliance statistics
 */
interface ComplianceRateCardProps {
  data: ComplianceRate;
  title?: string;
  description?: string;
}

export function ComplianceRateCard({
  data,
  title = "Overall Compliance Rate",
  description = "Total pass/fail statistics across all barangays",
}: ComplianceRateCardProps) {
  const { total_barangays, passed, failed, pass_percentage } = data;
  const colors = getSemanticColor(pass_percentage);
  const isHighCompliance = pass_percentage >= 70;

  return (
    <Card role="region" aria-labelledby="compliance-rate-title">
      <CardHeader>
        <CardTitle id="compliance-rate-title" className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{title}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    className="h-4 w-4 text-[var(--muted-foreground)] cursor-help"
                    aria-hidden="true"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Percentage of barangays that passed SGLGB compliance</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {isHighCompliance ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" aria-label="High compliance" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" aria-label="Needs improvement" />
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Percentage Display */}
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${colors.text}`}>{pass_percentage.toFixed(1)}%</span>
          <span className="text-sm text-[var(--muted-foreground)]">pass rate</span>
        </div>

        {/* Progress Bar with semantic color */}
        <Progress
          value={pass_percentage}
          className="h-2"
          progressColor={colors.progress}
          aria-label={`Compliance rate: ${pass_percentage.toFixed(1)}%`}
        />

        {/* Statistics Grid */}
        <div
          className="grid grid-cols-3 gap-3 pt-2"
          role="group"
          aria-label="Compliance statistics"
        >
          <div className="space-y-1">
            <p className="text-xs text-[var(--muted-foreground)]">Total</p>
            <p className="text-lg font-semibold text-[var(--foreground)]">{total_barangays}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <CheckCircle2
                className="h-3 w-3 text-green-600 dark:text-green-400"
                aria-hidden="true"
              />
              <p className="text-xs text-[var(--muted-foreground)]">Passed</p>
            </div>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">{passed}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" aria-hidden="true" />
              <p className="text-xs text-[var(--muted-foreground)]">Failed</p>
            </div>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400">{failed}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * CompletionStatusCard - Shows validated vs in-progress assessments
 */
interface CompletionStatusCardProps {
  data: ComplianceRate;
}

export function CompletionStatusCard({ data }: CompletionStatusCardProps) {
  const {
    total_barangays,
    passed: validated,
    failed: inProgress,
    pass_percentage: completionRate,
  } = data;
  const colors = getSemanticColor(completionRate);

  return (
    <Card role="region" aria-labelledby="completion-status-title">
      <CardHeader>
        <CardTitle id="completion-status-title">Completion Status</CardTitle>
        <CardDescription>Assessment validation progress</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Percentage Display */}
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${colors.text}`}>{completionRate.toFixed(1)}%</span>
          <span className="text-sm text-[var(--muted-foreground)]">completed</span>
        </div>

        {/* Progress Bar with semantic color */}
        <Progress
          value={completionRate}
          className="h-2"
          progressColor={colors.progress}
          aria-label={`Completion rate: ${completionRate.toFixed(1)}%`}
        />

        {/* Status Badges */}
        <div
          className="flex flex-wrap gap-2 pt-2"
          role="group"
          aria-label="Validation status breakdown"
        >
          <Badge
            variant="default"
            className="rounded-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
            {validated} Validated
          </Badge>
          <Badge
            variant="default"
            className="rounded-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
          >
            <AlertCircle className="mr-1 h-3 w-3" aria-hidden="true" />
            {inProgress} In Progress
          </Badge>
        </div>

        {/* Additional Info */}
        <p className="text-xs text-[var(--muted-foreground)]">
          {validated} of {total_barangays} assessments have been validated
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * AreaBreakdownCard - Displays compliance by governance area
 */
interface AreaBreakdownCardProps {
  data: AreaBreakdown[];
}

export function AreaBreakdownCard({ data }: AreaBreakdownCardProps) {
  return (
    <Card
      className="col-span-full lg:col-span-2"
      role="region"
      aria-labelledby="area-breakdown-title"
    >
      <CardHeader>
        <CardTitle id="area-breakdown-title">Governance Area Breakdown</CardTitle>
        <CardDescription>Compliance rates by governance area</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <AnalyticsEmptyState variant="no-assessments" compact />
        ) : (
          <div className="space-y-4" role="list" aria-label="Governance areas">
            {data.map((area) => {
              const colors = getSemanticColor(area.percentage);
              return (
                <div key={area.area_code} className="space-y-2" role="listitem">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {area.area_name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">{area.area_code}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <span className="text-green-600 dark:text-green-400">
                          {area.passed} pass
                        </span>
                        <span className="mx-1 text-[var(--muted-foreground)]">•</span>
                        <span className="text-red-600 dark:text-red-400">{area.failed} fail</span>
                      </div>
                      <Badge variant="outline" className={`rounded-sm ${colors.badge}`}>
                        {area.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress
                    value={area.percentage}
                    className="h-2"
                    progressColor={colors.progress}
                    aria-label={`${area.area_name}: ${area.percentage.toFixed(1)}% compliance`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * TopFailedIndicatorsCard - Shows most frequently failed indicators
 */
interface TopFailedIndicatorsCardProps {
  data: FailedIndicator[];
}

export function TopFailedIndicatorsCard({ data }: TopFailedIndicatorsCardProps) {
  return (
    <Card role="region" aria-labelledby="top-failed-title">
      <CardHeader>
        <CardTitle id="top-failed-title" className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-600" aria-hidden="true" />
          Top Failed Indicators
        </CardTitle>
        <CardDescription>Most frequently failed assessment items</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <AnalyticsEmptyState
            variant="no-assessments"
            compact
            description="No failed indicators to display"
          />
        ) : (
          <div className="space-y-3" role="list" aria-label="Failed indicators">
            {data.map((indicator, index) => (
              <div
                key={indicator.indicator_id}
                className="flex items-start gap-3 rounded-sm p-3 hover:bg-[var(--muted)]/50 transition-colors border border-[var(--border)]"
                role="listitem"
              >
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-xs font-semibold text-red-700 dark:text-red-300 flex-shrink-0"
                  aria-label={`Rank ${index + 1}`}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm font-medium text-[var(--foreground)] truncate cursor-default">
                          {indicator.indicator_name}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>{indicator.indicator_name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <span>{indicator.failure_count} failures</span>
                    <span>•</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {indicator.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * BarangayRankingsCard - Shows barangays ranked by compliance rate
 */
interface BarangayRankingsCardProps {
  data: BarangayRanking[];
}

export function BarangayRankingsCard({ data }: BarangayRankingsCardProps) {
  // Show top 10 rankings
  const topRankings = data.slice(0, 10);

  return (
    <Card className="col-span-full lg:col-span-2" role="region" aria-labelledby="rankings-title">
      <CardHeader>
        <CardTitle id="rankings-title" className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" aria-hidden="true" />
          Barangay Rankings
        </CardTitle>
        <CardDescription>Top performing barangays by compliance rate</CardDescription>
      </CardHeader>
      <CardContent>
        {topRankings.length === 0 ? (
          <AnalyticsEmptyState variant="no-barangays" compact />
        ) : (
          <div className="space-y-2" role="list" aria-label="Barangay rankings">
            {topRankings.map((ranking) => {
              const colors = getSemanticColor(ranking.score);
              return (
                <div
                  key={ranking.barangay_id}
                  className="flex items-center gap-4 rounded-sm p-3 hover:bg-[var(--muted)]/50 transition-colors border border-[var(--border)]"
                  role="listitem"
                >
                  {/* Rank Badge */}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-white flex-shrink-0 ${
                      ranking.rank === 1
                        ? "bg-yellow-500"
                        : ranking.rank === 2
                          ? "bg-gray-400"
                          : ranking.rank === 3
                            ? "bg-orange-600"
                            : "bg-blue-600"
                    }`}
                    aria-label={`Rank ${ranking.rank}`}
                  >
                    {ranking.rank}
                  </div>

                  {/* Barangay Name with Tooltip */}
                  <div className="flex-1 min-w-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm font-medium text-[var(--foreground)] truncate cursor-default">
                            {ranking.barangay_name}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{ranking.barangay_name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Score Badge with semantic colors */}
                  <Badge variant="outline" className={`rounded-sm ${colors.badge}`}>
                    {ranking.score.toFixed(1)}%
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
