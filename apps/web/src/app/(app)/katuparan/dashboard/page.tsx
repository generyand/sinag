'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Info,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Database,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  BarChart3,
  Target,
} from 'lucide-react';
import { useGetExternalAnalyticsDashboard } from '@sinag/shared';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/**
 * Katuparan Center Dashboard Page
 *
 * Municipal SGLGB Overview - Primary landing page for external stakeholders
 * Provides high-level, anonymized, aggregated insights into SGLGB performance
 * across all barangays in Sulop.
 */
export default function KatuparanDashboardPage() {
  const { data, isLoading, error, refetch } = useGetExternalAnalyticsDashboard(
    undefined, // no params
    {
      query: {
        // Disable retries for expected 400 errors (insufficient data for privacy)
        retry: (failureCount, error) => {
          const axiosError = error as AxiosError;
          // Don't retry 400 errors (expected for insufficient data)
          if (axiosError?.response?.status === 400) {
            return false;
          }
          // Retry other errors up to 3 times
          return failureCount < 3;
        },
      },
    }
  );

  // Check if error is insufficient data
  const axiosError = error as AxiosError<{ detail: string }>;
  const isInsufficientData =
    axiosError?.response?.status === 400 &&
    axiosError?.response?.data?.detail?.includes('Insufficient data');

  // Pie chart colors
  const COLORS = ['#22c55e', '#ef4444'];

  // Prepare pie chart data
  const pieData = data?.overall_compliance
    ? [
        { name: 'Passed', value: data.overall_compliance.passed_count },
        { name: 'Failed', value: data.overall_compliance.failed_count },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Privacy Disclaimer */}
      <Alert className="bg-blue-50 border-blue-200">
        <ShieldCheck className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Data Privacy Notice:</strong> All data displayed on this dashboard is aggregated
          and anonymized. Individual barangay performance cannot be identified from this information.
        </AlertDescription>
      </Alert>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      )}

      {/* Insufficient Data State */}
      {isInsufficientData && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-6">
              <Database className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Analytics Data Not Yet Available</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              To protect individual barangay privacy, analytics are only displayed when there are at
              least <strong>5 barangays</strong> with completed assessments.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 max-w-lg">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm text-left">
                  <p className="font-medium mb-1">Why this restriction?</p>
                  <p className="text-muted-foreground">
                    This privacy threshold ensures that aggregated data cannot be used to identify
                    individual barangay performance. Once more assessments are validated,
                    you&apos;ll see comprehensive analytics here.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generic Error State */}
      {error && !isInsufficientData && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Unable to load dashboard data. Please try again later or contact support if the issue
              persists.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="ml-4 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Dashboard Content */}
      {data && (
        <>
          {/* Overall SGLGB Compliance Summary */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Large Summary Card */}
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle>Municipal SGLGB Status</CardTitle>
                </div>
                <CardDescription>
                  CY {new Date().getFullYear()} Assessment Results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Passed */}
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <span className="text-sm font-medium text-green-700">PASSED</span>
                    </div>
                    <p className="text-4xl font-bold text-green-600">
                      {data.overall_compliance.pass_percentage.toFixed(0)}%
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      {data.overall_compliance.passed_count} barangays
                    </p>
                  </div>
                  {/* Failed */}
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <XCircle className="h-6 w-6 text-red-600" />
                      <span className="text-sm font-medium text-red-700">FAILED</span>
                    </div>
                    <p className="text-4xl font-bold text-red-600">
                      {data.overall_compliance.fail_percentage.toFixed(0)}%
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      {data.overall_compliance.failed_count} barangays
                    </p>
                  </div>
                </div>
                <div className="text-center pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Total Barangays Assessed:{' '}
                    <span className="font-semibold">
                      {data.overall_compliance.total_barangays}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle>Compliance Distribution</CardTitle>
                </div>
                <CardDescription>Visual breakdown of pass/fail status</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Accessible data table for screen readers */}
                <table className="sr-only" aria-label="Compliance distribution data">
                  <caption>SGLGB compliance distribution showing passed and failed barangays</caption>
                  <thead>
                    <tr>
                      <th scope="col">Status</th>
                      <th scope="col">Count</th>
                      <th scope="col">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pieData.map((item) => (
                      <tr key={item.name}>
                        <td>{item.name}</td>
                        <td>{item.value}</td>
                        <td>
                          {data?.overall_compliance
                            ? item.name === 'Passed'
                              ? `${data.overall_compliance.pass_percentage.toFixed(1)}%`
                              : `${data.overall_compliance.fail_percentage.toFixed(1)}%`
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div
                  className="h-[200px]"
                  role="img"
                  aria-label={`Pie chart showing compliance distribution: ${data?.overall_compliance?.passed_count || 0} barangays passed (${data?.overall_compliance?.pass_percentage.toFixed(1) || 0}%), ${data?.overall_compliance?.failed_count || 0} barangays failed (${data?.overall_compliance?.fail_percentage.toFixed(1) || 0}%)`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Governance Area Performance Breakdown */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Governance Area Performance</CardTitle>
              </div>
              <CardDescription>
                Aggregated pass/fail rates by governance area (Core & Essential)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Accessible data table for screen readers */}
              <table className="sr-only" aria-label="Governance area performance data">
                <caption>
                  Pass and fail rates for each governance area across all assessed barangays
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Governance Area</th>
                    <th scope="col">Type</th>
                    <th scope="col">Pass Rate</th>
                    <th scope="col">Fail Rate</th>
                    <th scope="col">Passed</th>
                    <th scope="col">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.governance_area_performance.areas.map((area) => (
                    <tr key={area.area_code}>
                      <td>{area.area_name}</td>
                      <td>{area.area_type}</td>
                      <td>{area.pass_percentage.toFixed(1)}%</td>
                      <td>{area.fail_percentage.toFixed(1)}%</td>
                      <td>{area.passed_count}</td>
                      <td>{area.failed_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Bar Chart */}
              <div
                className="h-[350px] mb-6"
                role="img"
                aria-label={`Bar chart showing governance area performance. ${data.governance_area_performance.areas.map((a) => `${a.area_name}: ${a.pass_percentage.toFixed(1)}% pass rate`).join(', ')}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.governance_area_performance.areas}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis
                      dataKey="area_name"
                      type="category"
                      width={150}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="pass_percentage" name="Pass Rate" fill="#22c55e" />
                    <Bar dataKey="fail_percentage" name="Fail Rate" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Area Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.governance_area_performance.areas.map((area) => {
                  // Determine if Core or Essential based on area_type field
                  const isCore = area.area_type === 'Core';

                  return (
                    <div
                      key={area.area_code}
                      className={`rounded-lg border p-4 ${
                        isCore ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-amber-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm">{area.area_name}</h4>
                        <Badge variant={isCore ? 'default' : 'secondary'} className="text-xs">
                          {isCore ? 'Core' : 'Essential'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">Passed:</span>
                          <span className="font-medium text-green-600">{area.passed_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-muted-foreground">Failed:</span>
                          <span className="font-medium text-red-600">{area.failed_count}</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                        Pass Rate:{' '}
                        <span className="font-medium text-foreground">
                          {area.pass_percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top 5 Most Frequently Failed Indicators */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <CardTitle>Top 5 Most Frequently Failed Indicators</CardTitle>
              </div>
              <CardDescription>
                Indicators with highest failure rates across all barangays (anonymized data)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.top_failing_indicators.top_failing_indicators.length > 0 ? (
                <div className="space-y-4">
                  {data.top_failing_indicators.top_failing_indicators.map((indicator, index) => (
                    <div
                      key={indicator.indicator_id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0
                            ? 'bg-red-500'
                            : index === 1
                            ? 'bg-red-400'
                            : index === 2
                            ? 'bg-orange-400'
                            : 'bg-orange-300'
                        }`}
                      >
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1">{indicator.indicator_name}</h4>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span>Failures:</span>
                            <span className="font-medium text-destructive">
                              {indicator.failure_count}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <span>Failure Rate:</span>
                            <span className="font-medium text-destructive">
                              {indicator.failure_percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <span>Total Assessed:</span>
                            <span className="font-medium">{indicator.total_assessed}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No failing indicator data available yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aggregated AI-Generated Insights Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <CardTitle>Aggregated AI-Generated Insights</CardTitle>
              </div>
              <CardDescription>
                Anonymized summary of common weaknesses and recommendations for CapDev
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.ai_insights.insights.length > 0 ? (
                <div className="space-y-6">
                  {data.ai_insights.insights.map((insight, index) => (
                    <div key={index} className="rounded-lg border p-4 bg-gradient-to-r from-amber-50/50 to-transparent">
                      <div className="flex items-start gap-3">
                        <div
                          className={`px-2.5 py-1 rounded text-xs font-semibold ${
                            insight.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : insight.priority === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {(insight.priority || 'low').toUpperCase()} PRIORITY
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {insight.governance_area_name}
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <h4 className="font-medium text-sm mb-2">Summary & Recommendations:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                          {insight.insight_summary}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Note about anonymization */}
                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p>
                      These AI-generated insights are aggregated from multiple assessments and
                      generalized to protect individual barangay privacy. Recommendations are
                      intended for municipal-wide capacity development planning.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No AI insights available yet.</p>
                  <p className="text-sm mt-2">
                    Insights will be generated after assessments are validated and classified.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <p className="font-medium">
              SINAG: SGLGB Insights Nurturing Assessments and Governance
            </p>
            <p className="mt-1 text-xs">
              To Assess And Assist Barangays utilizing a Large Language Model and Classification
              Algorithm
            </p>
          </div>
        </>
      )}
    </div>
  );
}
