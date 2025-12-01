'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Users, Target, Wrench } from 'lucide-react';
import type { AggregatedCapDevSummary, AggregatedCapDevSummaryTopRecommendationsItem, AggregatedCapDevSummaryPriorityInterventionsItem } from '@sinag/shared';

interface AggregatedCapDevCardProps {
  data: AggregatedCapDevSummary;
}

export function AggregatedCapDevCard({ data }: AggregatedCapDevCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Aggregated CapDev Insights
        </CardTitle>
        <p className="text-sm text-gray-500">
          Based on {data.total_assessments_with_capdev} assessments with AI insights
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top Recommendations */}
        {data.top_recommendations && data.top_recommendations.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Most Common Recommendations
            </h4>
            <div className="space-y-2">
              {data.top_recommendations.slice(0, 5).map((rec: AggregatedCapDevSummaryTopRecommendationsItem, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{rec.title}</p>
                    {rec.governance_area && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {rec.governance_area}
                      </Badge>
                    )}
                  </div>
                  <Badge className="bg-blue-600">
                    {rec.frequency} barangays
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Common Weaknesses by Area */}
        {data.common_weaknesses_by_area && Object.keys(data.common_weaknesses_by_area).length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-500" />
              Common Weaknesses by Area
            </h4>
            <div className="space-y-3">
              {Object.entries(data.common_weaknesses_by_area).slice(0, 4).map(([area, weaknesses]) => (
                <div key={area} className="p-3 bg-orange-50 rounded">
                  <p className="text-sm font-medium text-orange-800">{area}</p>
                  <ul className="text-xs text-orange-600 mt-1 space-y-1">
                    {(weaknesses as string[]).slice(0, 2).map((w: string, i: number) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Priority Interventions */}
        {data.priority_interventions && data.priority_interventions.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Priority Interventions
            </h4>
            <div className="space-y-2">
              {data.priority_interventions.slice(0, 5).map((intervention: AggregatedCapDevSummaryPriorityInterventionsItem, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                  <p className="text-sm">{intervention.title}</p>
                  <Badge variant="outline" className="text-purple-700">
                    {intervention.frequency}x suggested
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills Gap */}
        {data.skills_gap_analysis && Object.keys(data.skills_gap_analysis).length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-3">Skills Development Needs</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.skills_gap_analysis)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .slice(0, 8)
                .map(([skill, count]) => (
                  <Badge key={skill} variant="secondary">
                    {skill} ({count as number})
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
