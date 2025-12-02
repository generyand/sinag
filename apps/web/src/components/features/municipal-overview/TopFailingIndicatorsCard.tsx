'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import type { TopFailingIndicatorsList, FailingIndicator } from '@sinag/shared';

interface TopFailingIndicatorsCardProps {
  data: TopFailingIndicatorsList;
}

export function TopFailingIndicatorsCard({ data }: TopFailingIndicatorsCardProps) {
  const getFailRateColor = (rate: number) => {
    if (rate >= 70) return 'text-red-600 bg-red-50';
    if (rate >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Top Failing Indicators
        </CardTitle>
        <p className="text-sm text-gray-500">
          {data.total_indicators_assessed} unique indicators assessed
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.indicators.map((indicator: FailingIndicator, idx: number) => (
            <div
              key={indicator.indicator_id}
              className="p-3 border border-[var(--border)] rounded-sm hover:bg-[var(--muted)]/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-500">
                      #{idx + 1}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {indicator.indicator_code}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm">{indicator.indicator_name}</p>
                  <p className="text-xs text-gray-500">{indicator.governance_area}</p>
                </div>
                <div className={`text-right px-2 py-1 rounded ${getFailRateColor(indicator.fail_rate)}`}>
                  <p className="text-lg font-bold">{indicator.fail_rate.toFixed(1)}%</p>
                  <p className="text-xs">fail rate</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>{indicator.fail_count} failed</span>
                <span>/</span>
                <span>{indicator.total_assessed} assessed</span>
              </div>
              {indicator.common_issues && indicator.common_issues.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-medium text-gray-600 mb-1">Common Issues:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    {indicator.common_issues.slice(0, 2).map((issue: string, i: number) => (
                      <li key={i} className="truncate">• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
