'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useGetAssessmentsList, useGetCapdevAssessmentsAssessmentId, getGetCapdevAssessmentsAssessmentIdQueryKey, AssessmentStatus } from '@sinag/shared';
import type { CapDevInsightsContent } from '@/types/capdev';

// Type for assessment list items (the API returns Dict[str, Any])
interface AssessmentListItem {
  id: number;
  barangay_id: number;
  barangay_name: string;
  cycle_year?: number;
  status: string;
}

interface AIRecommendationsWidgetProps {
  /** Optional: Pre-filter to only show specific barangays */
  barangayIds?: number[];
}

export function AIRecommendationsWidget({ barangayIds }: AIRecommendationsWidgetProps) {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  // Fetch list of completed assessments that can have CapDev insights
  const { data: assessmentsRaw, isLoading: isLoadingAssessments } = useGetAssessmentsList(
    { assessment_status: AssessmentStatus.COMPLETED }
  );

  // Cast to typed array
  const assessments = (assessmentsRaw || []) as unknown as AssessmentListItem[];

  // Filter assessments if barangayIds is provided
  const filteredAssessments = useMemo(() => {
    if (assessments.length === 0) return [];
    if (!barangayIds || barangayIds.length === 0) return assessments;
    return assessments.filter(a => barangayIds.includes(a.barangay_id));
  }, [assessments, barangayIds]);

  // Fetch CapDev insights for selected assessment
  const assessmentIdNum = Number(selectedAssessmentId);
  const {
    data: capdevData,
    isLoading: isLoadingCapdev,
    error: capdevError,
  } = useGetCapdevAssessmentsAssessmentId(
    assessmentIdNum,
    {
      query: {
        queryKey: getGetCapdevAssessmentsAssessmentIdQueryKey(assessmentIdNum),
        enabled: !!selectedAssessmentId && !isNaN(assessmentIdNum),
      }
    }
  );

  const selectedAssessment = useMemo(() => {
    if (!selectedAssessmentId || filteredAssessments.length === 0) return null;
    return filteredAssessments.find(a => a.id.toString() === selectedAssessmentId) || null;
  }, [selectedAssessmentId, filteredAssessments]);

  const handleDownloadPDF = () => {
    if (!selectedAssessment) return;
    // TODO: Implement PDF export using the existing pdf-export utility
    console.log('Downloading PDF for assessment', selectedAssessmentId);
  };

  const hasInsights = capdevData?.status === 'completed' && capdevData?.insights;
  const defaultLanguage = capdevData?.available_languages?.[0] || 'en';
  const insightsRaw = hasInsights && capdevData.insights ? capdevData.insights[defaultLanguage] : null;
  // Cast insights to proper type for type-safe access
  const insights = insightsRaw as CapDevInsightsContent | null;

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>AI-Powered CapDev Insights</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          View AI-generated capacity development insights for completed assessments
        </p>
      </CardHeader>
      <CardContent>
        {/* Assessment Selector */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Select an Assessment
              </label>
              <Select
                value={selectedAssessmentId}
                onValueChange={setSelectedAssessmentId}
                disabled={isLoadingAssessments}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingAssessments ? "Loading..." : "Choose an assessment..."} />
                </SelectTrigger>
                <SelectContent>
                  {filteredAssessments.map((assessment) => (
                    <SelectItem key={assessment.id} value={assessment.id.toString()}>
                      {assessment.barangay_name} - {assessment.cycle_year || 'N/A'}
                    </SelectItem>
                  ))}
                  {filteredAssessments.length === 0 && !isLoadingAssessments && (
                    <SelectItem value="none" disabled>
                      No completed assessments available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {isLoadingCapdev && selectedAssessmentId && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading CapDev insights...</p>
            </div>
          )}

          {/* Error State */}
          {capdevError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">
                Failed to load CapDev insights. The assessment may not have insights generated yet.
              </p>
            </div>
          )}

          {/* Status Messages */}
          {capdevData && !hasInsights && !isLoadingCapdev && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {capdevData.status === 'pending' && 'CapDev insights generation is queued...'}
                {capdevData.status === 'generating' && 'CapDev insights are being generated...'}
                {capdevData.status === 'failed' && 'CapDev insights generation failed.'}
                {capdevData.status === 'not_generated' && 'CapDev insights have not been generated yet.'}
              </p>
            </div>
          )}

          {/* Display Insights */}
          {hasInsights && insights && (
            <div className="space-y-6 pt-4">
              {/* Report Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    CapDev Report: {capdevData.barangay_name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    AI-Generated Analysis
                    {capdevData.generated_at && (
                      <> • Generated {new Date(capdevData.generated_at).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <Button onClick={handleDownloadPDF} variant="outline">
                  Download as PDF
                </Button>
              </div>

              {/* Executive Summary */}
              {insights.summary && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Executive Summary</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{insights.summary}</p>
                </div>
              )}

              {/* Governance Weaknesses */}
              {insights.governance_weaknesses && insights.governance_weaknesses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Governance Weaknesses</h4>
                  <div className="space-y-2">
                    {insights.governance_weaknesses.map((weakness, index) => {
                      // Handle both string and object formats
                      if (typeof weakness === 'string') {
                        return (
                          <div key={index} className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{weakness}</p>
                          </div>
                        );
                      }
                      return (
                        <div key={index} className="flex items-start space-x-2">
                          <Badge
                            variant="outline"
                            className={`mt-1 flex-shrink-0 ${
                              weakness.severity === 'high' ? 'border-red-500 text-red-700 dark:text-red-300' :
                              weakness.severity === 'medium' ? 'border-yellow-500 text-yellow-700 dark:text-yellow-300' :
                              'border-gray-500 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {weakness.severity}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{weakness.area_name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{weakness.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {insights.recommendations && insights.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Recommendations</h4>
                  <div className="space-y-3">
                    {insights.recommendations.map((rec, index) => {
                      // Handle both string and object formats
                      if (typeof rec === 'string') {
                        return (
                          <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="flex-shrink-0">
                                {index + 1}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{rec}</p>
                          </div>
                        );
                      }
                      return (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="flex-shrink-0">
                              {index + 1}
                            </Badge>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rec.title}</p>
                            {rec.priority && (
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  rec.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                  rec.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                  'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {rec.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{rec.description}</p>
                          {rec.governance_area && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Area: {rec.governance_area}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Capacity Development Needs */}
              {insights.capacity_development_needs && insights.capacity_development_needs.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Capacity Development Needs</h4>
                  <div className="space-y-2">
                    {insights.capacity_development_needs.map((need, index) => {
                      // Handle AI format with category vs standard format with area
                      const areaOrCategory = 'category' in (need as object) ? (need as { category: string }).category : (need as { area: string }).area;
                      const gapOrDesc = 'description' in (need as object) ? (need as { description: string }).description : (need as { current_gap: string }).current_gap;
                      return (
                        <div key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{areaOrCategory}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{gapOrDesc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Priority Actions */}
              {insights.priority_actions && insights.priority_actions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Priority Actions</h4>
                  <div className="space-y-2">
                    {insights.priority_actions.map((action, index) => {
                      // Handle both string and object formats
                      if (typeof action === 'string') {
                        return (
                          <div key={index} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-sm font-medium text-green-900 dark:text-green-300">{action}</p>
                          </div>
                        );
                      }
                      return (
                        <div key={index} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium text-green-900 dark:text-green-300">{action.action}</p>
                          <div className="flex gap-4 mt-1 text-xs text-green-700 dark:text-green-400">
                            <span>Responsible: {action.responsible_party}</span>
                            <span>Timeline: {action.timeline}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Clear Selection Button */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setSelectedAssessmentId('')}
                >
                  View Another Assessment
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 