"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import {
  useGetExternalAnalyticsDashboard,
  useGetExternalAnalyticsGeographicHeatmap,
} from "@sinag/shared";
import { BBITrendsChart, AnonymizedHeatmap } from "@/components/features/katuparan";
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
} from "recharts";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// =============================================================================
// TEMPORARY PREVIEW MODE - Remove after review
// =============================================================================
const PREVIEW_MODE = false; // Set to false to disable mock data

const MOCK_DASHBOARD_DATA = {
  overall_compliance: {
    total_barangays: 25,
    passed_count: 19,
    failed_count: 6,
    pass_percentage: 76.0,
    fail_percentage: 24.0,
  },
  governance_area_performance: {
    areas: [
      {
        area_code: "GA1",
        area_name: "Financial Administration",
        area_type: "Core",
        passed_count: 20,
        failed_count: 4,
        pass_percentage: 83.3,
        fail_percentage: 16.7,
      },
      {
        area_code: "GA2",
        area_name: "Disaster Preparedness",
        area_type: "Core",
        passed_count: 16,
        failed_count: 8,
        pass_percentage: 66.7,
        fail_percentage: 33.3,
      },
      {
        area_code: "GA3",
        area_name: "Safety, Peace and Order",
        area_type: "Core",
        passed_count: 22,
        failed_count: 2,
        pass_percentage: 91.7,
        fail_percentage: 8.3,
      },
      {
        area_code: "GA4",
        area_name: "Social Protection",
        area_type: "Essential",
        passed_count: 19,
        failed_count: 5,
        pass_percentage: 79.2,
        fail_percentage: 20.8,
      },
      {
        area_code: "GA5",
        area_name: "Environmental Management",
        area_type: "Essential",
        passed_count: 14,
        failed_count: 10,
        pass_percentage: 58.3,
        fail_percentage: 41.7,
      },
      {
        area_code: "GA6",
        area_name: "Sustainable Economy",
        area_type: "Essential",
        passed_count: 17,
        failed_count: 7,
        pass_percentage: 70.8,
        fail_percentage: 29.2,
      },
    ],
  },
  top_failing_indicators: {
    top_failing_indicators: [
      {
        indicator_id: 1,
        indicator_name: "Waste Segregation at Source Program Implementation",
        failure_count: 14,
        failure_percentage: 58.3,
        total_assessed: 25,
      },
      {
        indicator_id: 2,
        indicator_name: "Updated BDRRM Plan with Climate Change Adaptation",
        failure_count: 12,
        failure_percentage: 50.0,
        total_assessed: 25,
      },
      {
        indicator_id: 3,
        indicator_name: "Quarterly Financial Report Submission",
        failure_count: 10,
        failure_percentage: 41.7,
        total_assessed: 25,
      },
      {
        indicator_id: 4,
        indicator_name: "Livelihood Program with Monitoring System",
        failure_count: 9,
        failure_percentage: 37.5,
        total_assessed: 25,
      },
      {
        indicator_id: 5,
        indicator_name: "Senior Citizen and PWD Database Maintenance",
        failure_count: 8,
        failure_percentage: 33.3,
        total_assessed: 25,
      },
    ],
  },
  ai_insights: {
    insights: [
      {
        governance_area_name: "Environmental Management",
        priority: "high",
        insight_summary:
          "Multiple barangays struggle with waste segregation program implementation. Common challenges include lack of Materials Recovery Facilities (MRFs), insufficient waste collection equipment, and low household participation rates. Recommended interventions: Municipal-wide IEC campaign, MRF construction support, and waste segregation training for barangay officials.",
      },
      {
        governance_area_name: "Disaster Preparedness",
        priority: "high",
        insight_summary:
          "BDRRM plans across several barangays lack climate change adaptation components. Many plans have not been updated since 2020. Recommended interventions: Training on Climate Change-sensitive BDRRM planning, provision of hazard mapping support, and establishment of early warning system networks.",
      },
      {
        governance_area_name: "Financial Administration",
        priority: "medium",
        insight_summary:
          "Delays in quarterly financial report submission are common, often due to manual record-keeping systems. Recommended interventions: Basic bookkeeping training for barangay treasurers, introduction of simple digital financial tracking tools, and establishment of municipal-level technical assistance.",
      },
      {
        governance_area_name: "Sustainable Economy",
        priority: "medium",
        insight_summary:
          "Livelihood programs exist but lack systematic monitoring and evaluation. Success indicators are often undefined or unmeasured. Recommended interventions: M&E capacity building, development of standard livelihood program templates, and establishment of beneficiary tracking systems.",
      },
    ],
  },
  bbi_trends: {
    total_barangays_assessed: 25,
    bbis: [
      {
        bbi_abbreviation: "BDRRMC",
        bbi_name: "Barangay Disaster Risk Reduction Management Committee",
        governance_area_code: "GA2",
        highly_functional_count: 14,
        highly_functional_percentage: 58.3,
        moderately_functional_count: 6,
        moderately_functional_percentage: 25.0,
        low_functional_count: 3,
        low_functional_percentage: 12.5,
        non_functional_count: 1,
        non_functional_percentage: 4.2,
        total_assessed: 25,
      },
      {
        bbi_abbreviation: "BCPC",
        bbi_name: "Barangay Council for the Protection of Children",
        governance_area_code: "GA4",
        highly_functional_count: 16,
        highly_functional_percentage: 66.7,
        moderately_functional_count: 5,
        moderately_functional_percentage: 20.8,
        low_functional_count: 2,
        low_functional_percentage: 8.3,
        non_functional_count: 1,
        non_functional_percentage: 4.2,
        total_assessed: 25,
      },
      {
        bbi_abbreviation: "VAWC",
        bbi_name: "Violence Against Women and Children Desk",
        governance_area_code: "GA4",
        highly_functional_count: 12,
        highly_functional_percentage: 50.0,
        moderately_functional_count: 8,
        moderately_functional_percentage: 33.3,
        low_functional_count: 3,
        low_functional_percentage: 12.5,
        non_functional_count: 1,
        non_functional_percentage: 4.2,
        total_assessed: 25,
      },
      {
        bbi_abbreviation: "KP",
        bbi_name: "Katarungang Pambarangay",
        governance_area_code: "GA3",
        highly_functional_count: 18,
        highly_functional_percentage: 75.0,
        moderately_functional_count: 4,
        moderately_functional_percentage: 16.7,
        low_functional_count: 2,
        low_functional_percentage: 8.3,
        non_functional_count: 0,
        non_functional_percentage: 0,
        total_assessed: 25,
      },
      {
        bbi_abbreviation: "BPSO",
        bbi_name: "Barangay Peace and Security Office",
        governance_area_code: "GA3",
        highly_functional_count: 15,
        highly_functional_percentage: 62.5,
        moderately_functional_count: 6,
        moderately_functional_percentage: 25.0,
        low_functional_count: 2,
        low_functional_percentage: 8.3,
        non_functional_count: 1,
        non_functional_percentage: 4.2,
        total_assessed: 25,
      },
    ],
  },
};

const MOCK_HEATMAP_DATA = {
  total_barangays: 25,
  summary: {
    pass_count: 19,
    fail_count: 6,
    in_progress_count: 0,
    not_started_count: 0,
  },
  barangays: [
    { anonymous_id: "Barangay A01", status: "pass" },
    { anonymous_id: "Barangay A02", status: "pass" },
    { anonymous_id: "Barangay A03", status: "pass" },
    { anonymous_id: "Barangay A04", status: "pass" },
    { anonymous_id: "Barangay A05", status: "fail" },
    { anonymous_id: "Barangay A06", status: "pass" },
    { anonymous_id: "Barangay A07", status: "pass" },
    { anonymous_id: "Barangay A08", status: "pass" },
    { anonymous_id: "Barangay A09", status: "pass" },
    { anonymous_id: "Barangay B01", status: "pass" },
    { anonymous_id: "Barangay B02", status: "fail" },
    { anonymous_id: "Barangay B03", status: "pass" },
    { anonymous_id: "Barangay B04", status: "pass" },
    { anonymous_id: "Barangay B05", status: "pass" },
    { anonymous_id: "Barangay B06", status: "fail" },
    { anonymous_id: "Barangay B07", status: "pass" },
    { anonymous_id: "Barangay B08", status: "pass" },
    { anonymous_id: "Barangay C01", status: "pass" },
    { anonymous_id: "Barangay C02", status: "fail" },
    { anonymous_id: "Barangay C03", status: "pass" },
    { anonymous_id: "Barangay C04", status: "pass" },
    { anonymous_id: "Barangay C05", status: "fail" },
    { anonymous_id: "Barangay C06", status: "pass" },
    { anonymous_id: "Barangay C07", status: "fail" },
    { anonymous_id: "Barangay C08", status: "pass" },
  ],
};
// =============================================================================

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

  // Fetch geographic heatmap data separately
  const { data: heatmapData, isLoading: heatmapLoading } = useGetExternalAnalyticsGeographicHeatmap(
    undefined,
    {
      query: {
        retry: (failureCount, error) => {
          const axiosError = error as AxiosError;
          if (axiosError?.response?.status === 400) {
            return false;
          }
          return failureCount < 3;
        },
        enabled: !!data, // Only fetch heatmap after dashboard data loads
      },
    }
  );

  // Check if error is insufficient data (privacy threshold not met)
  // API returns { error: "message", error_code: "BAD_REQUEST" } format from exception handler
  const axiosError = error as AxiosError<{ error?: string; detail?: string; error_code?: string }>;
  const errorMessage =
    axiosError?.response?.data?.error || axiosError?.response?.data?.detail || "";
  const errorMessageLower = errorMessage.toLowerCase();
  const isInsufficientData =
    axiosError?.response?.status === 400 &&
    (errorMessageLower.includes("insufficient") ||
      errorMessageLower.includes("minimum") ||
      errorMessageLower.includes("barangays required") ||
      errorMessageLower.includes("anonymization"));

  // Extract the actual numbers from the error message if available
  // Error format: "Insufficient data for anonymization. Minimum 5 barangays required, only 0 available."
  const insufficientDataMatch = errorMessage.match(/Minimum (\d+).*only (\d+)/i);
  const requiredCount = insufficientDataMatch ? parseInt(insufficientDataMatch[1]) : 5;
  const currentCount = insufficientDataMatch ? parseInt(insufficientDataMatch[2]) : 0;

  // Use mock data in preview mode, otherwise use API data
  const effectiveData = PREVIEW_MODE ? MOCK_DASHBOARD_DATA : data;
  const effectiveHeatmapData = PREVIEW_MODE ? MOCK_HEATMAP_DATA : heatmapData;

  // Pie chart colors
  const COLORS = ["#22c55e", "#ef4444"];

  // Prepare pie chart data
  const pieData = effectiveData?.overall_compliance
    ? [
        { name: "Passed", value: effectiveData.overall_compliance.passed_count },
        { name: "Failed", value: effectiveData.overall_compliance.failed_count },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Privacy Disclaimer */}
      <Alert className="bg-blue-50 border-blue-200">
        <ShieldCheck className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Data Privacy Notice:</strong> All data displayed on this dashboard is aggregated
          and anonymized. Individual barangay performance cannot be identified from this
          information.
        </AlertDescription>
      </Alert>

      {/* Preview Mode Banner */}
      {PREVIEW_MODE && (
        <Alert className="bg-amber-50 border-amber-200">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Preview Mode:</strong> Showing mock data for UI review. Set PREVIEW_MODE to
            false to see real data.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {!PREVIEW_MODE && isLoading && (
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
      {!PREVIEW_MODE && isInsufficientData && (
        <Card className="border-dashed border-2 border-amber-300 bg-amber-50/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-amber-100 p-4 mb-6">
              <Database className="h-12 w-12 text-amber-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Analytics Data Not Yet Available</h2>
            <p className="text-muted-foreground max-w-md mb-4">
              To protect individual barangay privacy, analytics are only displayed when there are at
              least <strong>{requiredCount} barangays</strong> with completed assessments.
            </p>

            {/* Progress indicator */}
            <div className="bg-white rounded-lg border p-4 mb-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Completed Assessments</span>
                <span className="text-sm text-muted-foreground">
                  {currentCount} / {requiredCount} required
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.min((currentCount / requiredCount) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {requiredCount - currentCount > 0
                  ? `${requiredCount - currentCount} more completed assessment${requiredCount - currentCount > 1 ? "s" : ""} needed`
                  : "Threshold met - data should be loading..."}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-left">
                  <p className="font-medium mb-1 text-blue-800">Why this privacy restriction?</p>
                  <p className="text-blue-700">
                    This threshold ensures that aggregated data cannot be used to identify
                    individual barangay performance. Once more assessments reach{" "}
                    <strong>COMPLETED</strong> status, comprehensive analytics will appear here.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              Assessments must complete the full workflow: DRAFT → SUBMITTED → IN_REVIEW →
              AWAITING_FINAL_VALIDATION → AWAITING_MLGOO_APPROVAL → COMPLETED
            </p>
          </CardContent>
        </Card>
      )}

      {/* Generic Error State */}
      {!PREVIEW_MODE && error && !isInsufficientData && (
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
      {(PREVIEW_MODE || data) && effectiveData && (
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
                <CardDescription>CY {new Date().getFullYear()} Assessment Results</CardDescription>
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
                      {effectiveData.overall_compliance.pass_percentage.toFixed(0)}%
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      {effectiveData.overall_compliance.passed_count} barangays
                    </p>
                  </div>
                  {/* Failed */}
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <XCircle className="h-6 w-6 text-red-600" />
                      <span className="text-sm font-medium text-red-700">FAILED</span>
                    </div>
                    <p className="text-4xl font-bold text-red-600">
                      {effectiveData.overall_compliance.fail_percentage.toFixed(0)}%
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      {effectiveData.overall_compliance.failed_count} barangays
                    </p>
                  </div>
                </div>
                <div className="text-center pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Total Barangays Assessed:{" "}
                    <span className="font-semibold">
                      {effectiveData.overall_compliance.total_barangays}
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
                  <caption>
                    SGLGB compliance distribution showing passed and failed barangays
                  </caption>
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
                            ? item.name === "Passed"
                              ? `${effectiveData.overall_compliance.pass_percentage.toFixed(1)}%`
                              : `${effectiveData.overall_compliance.fail_percentage.toFixed(1)}%`
                            : "N/A"}
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
                  {effectiveData.governance_area_performance.areas.map((area) => (
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
                aria-label={`Bar chart showing governance area performance. ${effectiveData.governance_area_performance.areas.map((a) => `${a.area_name}: ${a.pass_percentage.toFixed(1)}% pass rate`).join(", ")}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={effectiveData.governance_area_performance.areas}
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
                {effectiveData.governance_area_performance.areas.map((area) => {
                  // Determine if Core or Essential based on area_type field
                  const isCore = area.area_type === "Core";

                  return (
                    <div
                      key={area.area_code}
                      className={`rounded-lg border p-4 ${
                        isCore ? "border-l-4 border-l-primary" : "border-l-4 border-l-amber-500"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm">{area.area_name}</h4>
                        <Badge variant={isCore ? "default" : "secondary"} className="text-xs">
                          {isCore ? "Core" : "Essential"}
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
                        Pass Rate:{" "}
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
              {effectiveData.top_failing_indicators.top_failing_indicators.length > 0 ? (
                <div className="space-y-4">
                  {effectiveData.top_failing_indicators.top_failing_indicators.map(
                    (indicator, index) => (
                      <div
                        key={indicator.indicator_id}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0
                              ? "bg-red-500"
                              : index === 1
                                ? "bg-red-400"
                                : index === 2
                                  ? "bg-orange-400"
                                  : "bg-orange-300"
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
                    )
                  )}
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
              {effectiveData.ai_insights.insights.length > 0 ? (
                <div className="space-y-6">
                  {effectiveData.ai_insights.insights.map((insight, index) => (
                    <div
                      key={index}
                      className="rounded-lg border p-4 bg-gradient-to-r from-amber-50/50 to-transparent"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`px-2.5 py-1 rounded text-xs font-semibold ${
                            insight.priority === "high"
                              ? "bg-red-100 text-red-800"
                              : insight.priority === "medium"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {(insight.priority || "low").toUpperCase()} PRIORITY
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

          {/* BBI Functionality Trends */}
          {effectiveData.bbi_trends && <BBITrendsChart data={effectiveData.bbi_trends} />}

          {/* Geographic Heatmap (Anonymized) */}
          {!PREVIEW_MODE && heatmapLoading && <Skeleton className="h-[400px] w-full" />}
          {effectiveHeatmapData && <AnonymizedHeatmap data={effectiveHeatmapData} />}

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
