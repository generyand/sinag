'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, AlertTriangle } from 'lucide-react';
import type { GovernanceAreaPerformanceList, AppSchemasMunicipalInsightsGovernanceAreaPerformance } from '@sinag/shared';

interface GovernanceAreaPerformanceCardProps {
  data: GovernanceAreaPerformanceList;
}

export function GovernanceAreaPerformanceCard({ data }: GovernanceAreaPerformanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Governance Area Performance
        </CardTitle>
        <div className="flex gap-4 text-sm">
          <span className="text-blue-600">
            Core Areas: <strong>{data.core_areas_pass_rate.toFixed(1)}%</strong>
          </span>
          <span className="text-purple-600">
            Essential Areas: <strong>{data.essential_areas_pass_rate.toFixed(1)}%</strong>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.areas.map((area: AppSchemasMunicipalInsightsGovernanceAreaPerformance) => (
            <div key={area.id} className="p-4 bg-[var(--muted)]/30 rounded-sm border border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{area.name}</span>
                  <Badge variant={area.area_type === 'CORE' ? 'default' : 'secondary'}>
                    {area.area_type}
                  </Badge>
                </div>
                <span className={`text-sm font-bold ${area.pass_rate >= 70 ? 'text-green-600' : area.pass_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {area.pass_rate.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={area.pass_rate}
                className="h-2 mb-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{area.passed_count} passed</span>
                <span>{area.failed_count} failed</span>
                <span>{area.total_indicators} indicators</span>
              </div>
              {area.common_weaknesses && area.common_weaknesses.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <div className="flex items-center gap-1 text-xs text-amber-600 mb-1">
                    <AlertTriangle className="h-3 w-3" />
                    Common Weaknesses
                  </div>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {area.common_weaknesses.slice(0, 2).map((weakness: string, idx: number) => (
                      <li key={idx} className="truncate">• {weakness}</li>
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
