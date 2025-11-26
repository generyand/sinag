import type {
  ComplianceRate,
  AreaBreakdown,
  FailedIndicator,
  BarangayRanking,
} from '@sinag/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

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
  title = 'Overall Compliance Rate',
  description = 'Total pass/fail statistics across all barangays',
}: ComplianceRateCardProps) {
  const { total_barangays, passed, failed, pass_percentage } = data;
  const isHighCompliance = pass_percentage >= 70;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          {isHighCompliance ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Percentage Display */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-[var(--foreground)]">{pass_percentage.toFixed(1)}%</span>
          <span className="text-sm text-[var(--text-secondary)]">pass rate</span>
        </div>

        {/* Progress Bar */}
        <Progress value={pass_percentage} className="h-2" />

        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-secondary)]">Total</p>
            <p className="text-lg font-semibold text-[var(--foreground)]">{total_barangays}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
              <p className="text-xs text-[var(--text-secondary)]">Passed</p>
            </div>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">{passed}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
              <p className="text-xs text-[var(--text-secondary)]">Failed</p>
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
  const { total_barangays, passed: validated, failed: inProgress, pass_percentage: completionRate } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completion Status</CardTitle>
        <CardDescription>Assessment validation progress</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Percentage Display */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-[var(--foreground)]">{completionRate.toFixed(1)}%</span>
          <span className="text-sm text-[var(--text-secondary)]">completed</span>
        </div>

        {/* Progress Bar */}
        <Progress value={completionRate} className="h-2" />

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="default" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {validated} Validated
          </Badge>
          <Badge variant="default" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30">
            <AlertCircle className="mr-1 h-3 w-3" />
            {inProgress} In Progress
          </Badge>
        </div>

        {/* Additional Info */}
        <p className="text-xs text-[var(--text-secondary)]">
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
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle>Governance Area Breakdown</CardTitle>
        <CardDescription>Compliance rates by governance area</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
            No governance area data available
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((area) => (
              <div key={area.area_code} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{area.area_name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{area.area_code}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <span className="text-green-600 dark:text-green-400">{area.passed} pass</span>
                      <span className="mx-1 text-[var(--text-secondary)]">•</span>
                      <span className="text-red-600 dark:text-red-400">{area.failed} fail</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        area.percentage >= 70
                          ? 'border-green-600 dark:border-green-400 text-green-700 dark:text-green-300'
                          : area.percentage >= 50
                            ? 'border-yellow-600 dark:border-yellow-400 text-yellow-700 dark:text-yellow-300'
                            : 'border-red-600 dark:border-red-400 text-red-700 dark:text-red-300'
                      }
                    >
                      {area.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <Progress
                  value={area.percentage}
                  className={`h-2 ${
                    area.percentage >= 70
                      ? '[&>div]:bg-green-600 dark:[&>div]:bg-green-400'
                      : area.percentage >= 50
                        ? '[&>div]:bg-yellow-600 dark:[&>div]:bg-yellow-400'
                        : '[&>div]:bg-red-600 dark:[&>div]:bg-red-400'
                  }`}
                />
              </div>
            ))}
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-600" />
          Top Failed Indicators
        </CardTitle>
        <CardDescription>Most frequently failed assessment items</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
            No failed indicators to display
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((indicator, index) => (
              <div
                key={indicator.indicator_id}
                className="flex items-start gap-3 rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors shadow-sm border border-[var(--border)]"
              >
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-xs font-semibold text-red-700 dark:text-red-300 flex-shrink-0"
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {indicator.indicator_name}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
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
 * BarangayRankingsCard - Shows barangays ranked by compliance score
 */
interface BarangayRankingsCardProps {
  data: BarangayRanking[];
}

export function BarangayRankingsCard({ data }: BarangayRankingsCardProps) {
  // Show top 10 rankings
  const topRankings = data.slice(0, 10);

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Barangay Rankings
        </CardTitle>
        <CardDescription>Top performing barangays by compliance score</CardDescription>
      </CardHeader>
      <CardContent>
        {topRankings.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
            No ranking data available
          </div>
        ) : (
          <div className="space-y-2">
            {topRankings.map((ranking) => (
              <div
                key={ranking.barangay_id}
                className="flex items-center gap-4 rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors shadow-sm border border-[var(--border)]"
              >
                {/* Rank Badge */}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-white flex-shrink-0 ${
                    ranking.rank === 1
                      ? 'bg-yellow-500'
                      : ranking.rank === 2
                        ? 'bg-gray-400'
                        : ranking.rank === 3
                          ? 'bg-orange-600'
                          : 'bg-blue-600'
                  }`}
                >
                  {ranking.rank}
                </div>

                {/* Barangay Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {ranking.barangay_name}
                  </p>
                </div>

                {/* Score Badge */}
                <Badge
                  variant="outline"
                  className={
                    ranking.score >= 90
                      ? 'border-green-600 dark:border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : ranking.score >= 75
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : ranking.score >= 60
                          ? 'border-yellow-600 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'border-red-600 dark:border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }
                >
                  {ranking.score.toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
