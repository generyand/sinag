'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { AnalyticsEmptyState } from '@/components/features/analytics';
import type { TopFailingIndicatorsList, FailingIndicator } from '@sinag/shared';

interface TopFailingIndicatorsCardProps {
  data: TopFailingIndicatorsList | null | undefined;
}

/**
 * Returns severity styling based on fail rate.
 * Higher fail rates = more critical (red), lower = warning (yellow).
 * Semantically: failing is bad, so higher fail rates are more severe.
 */
function getFailRateSeverity(rate: number): { text: string; bg: string; label: string } {
  if (rate >= 70) {
    return { text: 'text-red-700', bg: 'bg-red-100', label: 'Critical' };
  }
  if (rate >= 50) {
    return { text: 'text-orange-700', bg: 'bg-orange-100', label: 'High' };
  }
  if (rate >= 30) {
    return { text: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Moderate' };
  }
  return { text: 'text-gray-700', bg: 'bg-gray-100', label: 'Low' };
}

export function TopFailingIndicatorsCard({ data }: TopFailingIndicatorsCardProps) {
  const hasData = data && data.indicators && data.indicators.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
          Top Failing Indicators
        </CardTitle>
        {hasData && (
          <p className="text-sm text-[var(--muted-foreground)]">
            {data.total_indicators_assessed} unique indicators assessed
          </p>
        )}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <AnalyticsEmptyState variant="no-indicators" compact />
        ) : (
          <div className="space-y-3" role="list" aria-label="Top failing indicators">
            {data!.indicators!.map((indicator: FailingIndicator, idx: number) => {
              const severity = getFailRateSeverity(indicator.fail_rate);
              return (
                <div
                  key={indicator.indicator_id}
                  className="p-3 border border-[var(--border)] rounded-sm hover:bg-[var(--muted)]/30 transition-colors"
                  role="listitem"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-[var(--muted-foreground)]">
                          #{idx + 1}
                        </span>
                        <Badge variant="outline" className="text-xs rounded-sm">
                          {indicator.indicator_code}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm text-[var(--foreground)]">
                        {indicator.indicator_name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {indicator.governance_area}
                      </p>
                    </div>
                    <div
                      className={`text-right px-2 py-1 rounded-sm ${severity.bg}`}
                      aria-label={`Fail rate: ${indicator.fail_rate.toFixed(1)}%, severity: ${severity.label}`}
                    >
                      <p className={`text-lg font-bold ${severity.text}`}>
                        {indicator.fail_rate.toFixed(1)}%
                      </p>
                      <p className={`text-xs ${severity.text}`}>fail rate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[var(--muted-foreground)]">
                    <span>{indicator.fail_count} failed</span>
                    <span>/</span>
                    <span>{indicator.total_assessed} assessed</span>
                  </div>
                  {indicator.common_issues && indicator.common_issues.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--border)]">
                      <p className="text-xs font-medium text-[var(--foreground)] mb-1">
                        Common Issues:
                      </p>
                      <ul className="text-xs text-[var(--muted-foreground)] space-y-1">
                        {indicator.common_issues.slice(0, 2).map((issue: string, i: number) => (
                          <li key={i} className="truncate">• {issue}</li>
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
