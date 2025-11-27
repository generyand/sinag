'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, Database, TrendingUp, AlertTriangle, Lightbulb, FileDown, Loader2 } from 'lucide-react';
import { useGetExternalAnalyticsDashboard } from '@sinag/shared';
import { OverallComplianceCard } from '@/components/features/external-analytics/OverallComplianceCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * External Analytics Dashboard Page
 *
 * Provides aggregated, anonymized SGLGB data for Katuparan Center
 * for research and CapDev program development purposes.
 *
 * All data is aggregated to protect individual barangay privacy.
 */
export default function ExternalAnalyticsPage() {
  // Fetch all dashboard data in one request
  const { data, isLoading, error } = useGetExternalAnalyticsDashboard();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            SGLGB Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Aggregated Seal of Good Local Governance for Barangays Performance Data
          </p>
        </div>

        {/* Export Controls */}
        {data && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('http://localhost:8000/api/v1/external/analytics/export/csv', '_blank')}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('http://localhost:8000/api/v1/external/analytics/export/pdf', '_blank')}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        )}
      </div>

      {/* Privacy Disclaimer */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Data Privacy Notice:</strong> All data displayed on this dashboard is aggregated
          and anonymized. Individual barangay performance cannot be identified from this information.
        </AlertDescription>
      </Alert>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data. {(error as any)?.message || 'An error occurred'}
          </AlertDescription>
        </Alert>
      )}

      {/* Dashboard Content */}
      {data && (
        <>
          {/* Overall Compliance Section */}
          <OverallComplianceCard
            data={data.overall_compliance}
            isLoading={false}
            error={null}
          />

          {/* Governance Area Performance Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Governance Area Performance</CardTitle>
              </div>
              <CardDescription>
                Aggregated pass/fail rates by governance area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.governance_area_performance.areas}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="area_name" type="category" width={90} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="pass_percentage" name="Pass Rate (%)" fill="#22c55e" />
                    <Bar dataKey="fail_percentage" name="Fail Rate (%)" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Area Details */}
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.governance_area_performance.areas.map((area) => (
                  <div key={area.area_code} className="rounded-lg border p-4">
                    <h4 className="font-semibold text-sm mb-2">{area.area_name}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Passed:</span>
                        <span className="ml-2 font-medium text-green-600">{area.passed_count}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failed:</span>
                        <span className="ml-2 font-medium text-red-600">{area.failed_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Failing Indicators Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Top 5 Failing Indicators</CardTitle>
              </div>
              <CardDescription>
                Most frequently failed indicators across all barangays
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.top_failing_indicators.top_failing_indicators.map((indicator, index) => (
                  <div key={indicator.indicator_id} className="flex items-start gap-4 p-4 rounded-lg border">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{indicator.indicator_name}</h4>
                      <div className="mt-2 flex gap-6 text-sm text-muted-foreground">
                        <div>
                          <span>Failures:</span>
                          <span className="ml-2 font-medium text-destructive">{indicator.failure_count}</span>
                        </div>
                        <div>
                          <span>Failure Rate:</span>
                          <span className="ml-2 font-medium text-destructive">{indicator.failure_percentage.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span>Total Assessments:</span>
                          <span className="ml-2 font-medium">{indicator.total_assessed}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Insights Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <CardTitle>Anonymized AI Insights</CardTitle>
              </div>
              <CardDescription>
                Aggregated capacity development recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.ai_insights.insights.map((insight, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex items-start gap-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        insight.priority === 'high' ? 'bg-red-100 text-red-800' :
                        insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {(insight.priority || 'low').toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">{insight.governance_area_name}</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{insight.insight_summary}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {data.ai_insights.insights.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No AI insights available yet.</p>
                    <p className="text-sm mt-2">Insights will be generated after assessments are validated.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-4 border-t">
        <p>
          SINAG: Strategic Insights Nurturing Assessments and Governance
        </p>
        <p className="mt-1">
          To Assess And Assist Barangays utilizing a Large Language Model and Classification Algorithm
        </p>
      </div>
    </div>
  );
}
