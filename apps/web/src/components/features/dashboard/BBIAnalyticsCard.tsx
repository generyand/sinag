'use client';

/**
 * BBIAnalyticsCard Component
 *
 * Displays aggregate BBI (Barangay-based Institutions) compliance analytics
 * across all barangays in the municipality.
 *
 * Shows:
 * - Average compliance across municipality
 * - Distribution by rating tier
 * - Per-BBI breakdown with mini charts
 *
 * Per DILG MC 2024-417 guidelines.
 */

import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Users,
  Shield,
  Heart,
  Briefcase,
  Leaf,
  Scale,
} from 'lucide-react';

// BBI analytics types
export interface BBIAnalyticsItem {
  bbi_id: number;
  bbi_name: string;
  bbi_abbreviation: string;
  average_compliance: number;
  highly_functional_count: number;
  moderately_functional_count: number;
  low_functional_count: number;
  total_barangays: number;
}

export interface BBIAnalyticsSummary {
  total_assessments: number;
  overall_average_compliance: number;
  total_highly_functional: number;
  total_moderately_functional: number;
  total_low_functional: number;
}

export interface BBIAnalyticsData {
  summary: BBIAnalyticsSummary;
  bbi_breakdown: BBIAnalyticsItem[];
}

interface BBIAnalyticsCardProps {
  data?: BBIAnalyticsData;
}

// Map BBI abbreviations to icons
const BBIIcons: Record<string, React.ElementType> = {
  BDC: Users,
  BDRRMC: Shield,
  BPOC: Scale,
  BESWMC: Leaf,
  'VAW Desk': Heart,
  BCPC: Users,
  BADAC: Briefcase,
};

// Get rating color based on average compliance
function getComplianceColor(percentage: number): string {
  if (percentage >= 75) return 'text-green-600 dark:text-green-400';
  if (percentage >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getComplianceBg(percentage: number): string {
  if (percentage >= 75) return 'bg-green-100 dark:bg-green-950/30';
  if (percentage >= 50) return 'bg-amber-100 dark:bg-amber-950/30';
  return 'bg-red-100 dark:bg-red-950/30';
}

// Mini bar chart for distribution
function DistributionBar({
  high,
  moderate,
  low,
  total,
}: {
  high: number;
  moderate: number;
  low: number;
  total: number;
}) {
  const highPct = total > 0 ? (high / total) * 100 : 0;
  const modPct = total > 0 ? (moderate / total) * 100 : 0;
  const lowPct = total > 0 ? (low / total) * 100 : 0;

  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
      {highPct > 0 && (
        <div
          className="bg-green-500"
          style={{ width: `${highPct}%` }}
          title={`Highly Functional: ${high}`}
        />
      )}
      {modPct > 0 && (
        <div
          className="bg-amber-400"
          style={{ width: `${modPct}%` }}
          title={`Moderately Functional: ${moderate}`}
        />
      )}
      {lowPct > 0 && (
        <div
          className="bg-red-500"
          style={{ width: `${lowPct}%` }}
          title={`Low Functional: ${low}`}
        />
      )}
    </div>
  );
}

export function BBIAnalyticsCard({ data }: BBIAnalyticsCardProps) {
  if (!data || data.bbi_breakdown.length === 0) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm">
        <div className="p-5 border-b border-[var(--border)]">
          <h3 className="text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            BBI Compliance Analytics
          </h3>
        </div>
        <div className="p-5 text-center">
          <Building2 className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-[var(--text-secondary)]">
            BBI analytics data not yet available.
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Data will appear after assessments are completed.
          </p>
        </div>
      </div>
    );
  }

  const { summary, bbi_breakdown } = data;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            BBI Compliance Analytics
          </h3>
          <span className="text-xs text-[var(--muted-foreground)]">
            {summary.total_assessments} assessments
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-5 border-b border-[var(--border)]">
        <div className="grid grid-cols-4 gap-4">
          {/* Average Compliance */}
          <div className={`rounded-sm p-3 ${getComplianceBg(summary.overall_average_compliance)}`}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className={`w-4 h-4 ${getComplianceColor(summary.overall_average_compliance)}`} />
              <span className="text-xs text-[var(--muted-foreground)]">Avg</span>
            </div>
            <p className={`text-xl font-bold ${getComplianceColor(summary.overall_average_compliance)}`}>
              {Math.round(summary.overall_average_compliance)}%
            </p>
          </div>

          {/* Highly Functional */}
          <div className="bg-green-100 dark:bg-green-950/30 rounded-sm p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs text-[var(--muted-foreground)]">High</span>
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {summary.total_highly_functional}
            </p>
          </div>

          {/* Moderately Functional */}
          <div className="bg-amber-100 dark:bg-amber-950/30 rounded-sm p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-[var(--muted-foreground)]">Moderate</span>
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {summary.total_moderately_functional}
            </p>
          </div>

          {/* Low Functional */}
          <div className="bg-red-100 dark:bg-red-950/30 rounded-sm p-3">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-xs text-[var(--muted-foreground)]">Low</span>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {summary.total_low_functional}
            </p>
          </div>
        </div>
      </div>

      {/* Per-BBI Breakdown */}
      <div className="p-5">
        <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">
          Per-BBI Breakdown
        </h4>
        <div className="space-y-3">
          {bbi_breakdown.map((bbi) => {
            const Icon = BBIIcons[bbi.bbi_abbreviation] || Building2;
            return (
              <div
                key={bbi.bbi_id}
                className="flex items-center gap-3 p-2 rounded-sm hover:bg-[var(--muted)]/20 transition-colors"
              >
                <Icon className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--foreground)] truncate">
                      {bbi.bbi_abbreviation}
                    </span>
                    <span className={`text-sm font-semibold ${getComplianceColor(bbi.average_compliance)}`}>
                      {Math.round(bbi.average_compliance)}%
                    </span>
                  </div>
                  <DistributionBar
                    high={bbi.highly_functional_count}
                    moderate={bbi.moderately_functional_count}
                    low={bbi.low_functional_count}
                    total={bbi.total_barangays}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--muted)]/10">
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>Per DILG MC 2024-417</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              75%+
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              50-74%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              &lt;50%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BBIAnalyticsCard;
