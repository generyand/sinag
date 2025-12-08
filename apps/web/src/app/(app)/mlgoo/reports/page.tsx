"use client";

import { YearSelector } from "@/components/features/assessment-year/YearSelector";
import { ComplianceBadge } from "@/components/features/reports";
import { ReportsSkeleton } from "@/components/features/reports/ReportsSkeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffectiveYear } from "@/store/useAssessmentYearStore";
import {
  AssessmentStatus,
  useGetAssessmentsList,
  type GetAssessmentsListQueryResult,
} from "@sinag/shared";
import { Activity, Brain, Target, Zap } from "lucide-react";
import { useState } from "react";

export default function ReportsPage() {
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const effectiveYear = useEffectiveYear();

  // Fetch validated assessments with compliance data for the selected year
  const { data: assessments, isLoading } = useGetAssessmentsList<GetAssessmentsListQueryResult>({
    assessment_status: AssessmentStatus.VALIDATED,
    year: effectiveYear ?? undefined,
  });

  // Ensure we only render arrays in JSX to avoid unknown -> ReactNode errors
  const safeAssessments: GetAssessmentsListQueryResult = Array.isArray(assessments)
    ? assessments
    : [];

  // Mock data matching the design from the image
  const analyticsData = {
    globalFilters: {
      assessmentPeriod: "SGLGB 2024",
      availablePeriods: ["SGLGB 2024", "SGLGB 2023", "SGLGB 2022"],
    },
    officialPerformance: {
      title: "Official SGLGB Performance (sglgb-2024)",
      passRate: 78,
      totalBarangays: 25,
      passed: 18,
      failed: 5,
      inProgress: 2,
      barangays: [
        { name: "Barangay Poblacion", score: 95, status: "passed" },
        { name: "Barangay Balasinon", score: 92, status: "passed" },
        { name: "Barangay Buguis", score: 89, status: "passed" },
        { name: "Barangay Carre", score: 85, status: "passed" },
        { name: "Barangay Clib", score: 82, status: "passed" },
        { name: "Barangay Harada Butai", score: 80, status: "passed" },
        { name: "Barangay Katipunan", score: 78, status: "passed" },
        { name: "Barangay Kiblagon", score: 76, status: "passed" },
        { name: "Barangay Labon", score: 73, status: "passed" },
        { name: "Barangay Laperas", score: 70, status: "passed" },
        { name: "Barangay Lapla", score: 68, status: "passed" },
        { name: "Barangay Litos", score: 65, status: "passed" },
        { name: "Barangay Luparan", score: 62, status: "passed" },
        { name: "Barangay Mckinley", score: 60, status: "passed" },
        { name: "Barangay New Cebu", score: 58, status: "passed" },
        { name: "Barangay Osmeña", score: 55, status: "passed" },
        { name: "Barangay Palili", score: 52, status: "passed" },
        { name: "Barangay Parame", score: 50, status: "failed" },
        { name: "Barangay Roxas", score: 48, status: "failed" },
        { name: "Barangay Solongvale", score: 45, status: "failed" },
        { name: "Barangay Tagolilong", score: 42, status: "failed" },
        { name: "Barangay Tala-o", score: 40, status: "failed" },
        { name: "Barangay Talas", score: 38, status: "inProgress" },
        { name: "Barangay Tanwalang", score: 35, status: "inProgress" },
        { name: "Barangay Waterfall", score: 32, status: "inProgress" },
      ],
    },
    municipalityPerformance: {
      hotspots: [
        { indicator: "1.1.5 BADAC Plan", score: "10/25", status: "critical" },
        { indicator: "4.2.3 Environmental Management", score: "10/25", status: "critical" },
        { indicator: "2.1.2 Financial Records", score: "12/25", status: "warning" },
        { indicator: "3.3.1 Youth Development", score: "7/25", status: "critical" },
        { indicator: "1.4.1 Digital Governance", score: "6/25", status: "critical" },
      ],
    },
    capacityDevelopment: {
      title: "Capacity Development Priority",
      description:
        "Focus municipal training programs on the indicators with the lowest scores. Indicators with failing indicators represent the most critical areas for capacity development.",
    },
    preAssessmentAnalysis: {
      predictionAccuracy: 92,
      falsePositives: 1,
      falseNegatives: 1,
      summary:
        "The SINAG pre-assessment system achieved a 92% accuracy rate, with 1 false positives and 1 false negatives. This indicates the system's effectiveness in predicting SGLGB outcomes.",
    },
    aiReport: {
      title: "Generate AI-Powered CapDev Report",
      description: "Get detailed insights and recommendations for specific barangays",
      availableBarangays: [
        "Barangay Poblacion",
        "Barangay Balasinon",
        "Barangay Buguis",
        "Barangay Carre",
        "Barangay Clib",
        "Barangay Harada Butai",
        "Barangay Katipunan",
        "Barangay Kiblagon",
        "Barangay Labon",
        "Barangay Laperas",
        "Barangay Lapla",
        "Barangay Litos",
        "Barangay Luparan",
        "Barangay Mckinley",
        "Barangay New Cebu",
        "Barangay Osmeña",
        "Barangay Palili",
        "Barangay Parame",
        "Barangay Roxas",
        "Barangay Solongvale",
        "Barangay Tagolilong",
        "Barangay Tala-o",
        "Barangay Talas",
        "Barangay Tanwalang",
        "Barangay Waterfall",
      ],
    },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return {
          backgroundColor: "var(--analytics-success-bg)",
          color: "var(--analytics-success-text)",
        };
      case "failed":
        return {
          backgroundColor: "var(--analytics-danger-bg)",
          color: "var(--analytics-danger-text)",
        };
      case "critical":
        return {
          backgroundColor: "var(--analytics-danger-bg)",
          color: "var(--analytics-danger-text)",
        };
      case "warning":
        return {
          backgroundColor: "var(--analytics-warning-bg)",
          color: "var(--analytics-warning-text)",
        };
      default:
        return {
          backgroundColor: "var(--analytics-neutral-bg)",
          color: "var(--analytics-neutral-text)",
        };
    }
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return "var(--analytics-success)";
    if (score >= 60) return "var(--analytics-warning)";
    return "var(--analytics-danger)";
  };

  // Show skeleton while loading
  if (isLoading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Enhanced Header Section */}
          <div className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-6 sm:p-8">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/40 to-indigo-100/20 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/30 to-pink-100/20 rounded-full translate-y-16 -translate-x-16"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                    Analytics &{" "}
                    <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                      Reports
                    </span>
                  </h1>
                </div>

                {/* Year Selector + Quick Stats */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
                  <div className="w-full sm:w-auto">
                    <YearSelector showLabel showIcon />
                  </div>
                  <div className="flex gap-4 sm:contents">
                    <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)] flex-1 sm:flex-none sm:min-w-[100px]">
                      <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {analyticsData.officialPerformance.passRate}%
                      </div>
                      <div className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                        Pass Rate
                      </div>
                    </div>
                    <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)] flex-1 sm:flex-none sm:min-w-[100px]">
                      <div className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                        {analyticsData.officialPerformance.totalBarangays}
                      </div>
                      <div className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                        Barangays
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Official SGLGB Performance - 2 columns */}
            <div className="lg:col-span-2">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
                <div className="p-6 border-b border-[var(--border)]">
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
                    {analyticsData.officialPerformance.title}
                  </h3>

                  {/* Donut Chart and Stats */}
                  <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 mb-6">
                    {/* Donut Chart Representation */}
                    <div className="relative w-32 h-32 shrink-0">
                      <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
                      <div
                        className="absolute inset-0 rounded-full border-8 border-green-500 transform -rotate-90"
                        style={{
                          borderTopColor: "transparent",
                          borderRightColor: "transparent",
                          borderBottomColor: "transparent",
                          clipPath: `polygon(50% 50%, 50% 0%, ${50 + (analyticsData.officialPerformance.passRate / 100) * 50}% 0%, 100% 50%, 50% 50%)`,
                        }}
                      ></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[var(--foreground)]">
                            {analyticsData.officialPerformance.totalBarangays}
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)]">Total</div>
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2 w-full max-w-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: "var(--analytics-success)" }}
                        ></div>
                        <span className="text-sm text-[var(--foreground)]">
                          Passed ({analyticsData.officialPerformance.passed})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: "var(--analytics-danger)" }}
                        ></div>
                        <span className="text-sm text-[var(--foreground)]">
                          Failed ({analyticsData.officialPerformance.failed})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: "var(--analytics-warning)" }}
                        ></div>
                        <span className="text-sm text-[var(--foreground)]">
                          In Progress ({analyticsData.officialPerformance.inProgress})
                        </span>
                      </div>
                    </div>

                    {/* Pass Rate */}
                    <div className="md:ml-auto w-full md:w-auto text-center md:text-right p-4 bg-[var(--muted)]/10 rounded-sm">
                      <div className="text-sm font-medium text-[var(--foreground)] mb-1">
                        Officially Passed Barangays
                      </div>
                      <div className="text-sm text-[var(--muted-foreground)]">
                        Pass Rate:{" "}
                        <span
                          className="font-bold text-lg block sm:inline"
                          style={{ color: "var(--analytics-success-text-light)" }}
                        >
                          {analyticsData.officialPerformance.passRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barangay List */}
                <div className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide pb-2 border-b border-[var(--border)]">
                      <div>Barangay</div>
                      <div>Score</div>
                      <div>Status</div>
                    </div>

                    {/* Show real assessment data when available, fallback to mock data */}
                    {safeAssessments.length > 0
                      ? safeAssessments.map((raw) => {
                          const assessment = raw as unknown as {
                            id: number | string;
                            barangay_name?: string;
                            final_compliance_status?: string;
                          };
                          // Convert compliance status to display format
                          const complianceStatus: "Passed" | "Failed" | null =
                            assessment.final_compliance_status === "Passed"
                              ? "Passed"
                              : assessment.final_compliance_status === "Failed"
                                ? "Failed"
                                : null;

                          // Mock score for now - could be calculated from area_results
                          const mockScore = 85;

                          return (
                            <div
                              key={String(assessment.id)}
                              className="grid grid-cols-3 gap-4 items-center py-2 hover:bg-[var(--hover)] rounded-sm transition-colors"
                            >
                              <div className="text-sm font-medium text-[var(--foreground)]">
                                {assessment.barangay_name || "Unknown"}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-[var(--border)] rounded-sm h-2">
                                  <div
                                    className="h-2 rounded-sm"
                                    style={{
                                      backgroundColor: getScoreBarColor(mockScore),
                                      width: `${mockScore}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-[var(--foreground)] w-8">
                                  {mockScore}%
                                </span>
                              </div>
                              <div>
                                {complianceStatus && (
                                  <ComplianceBadge
                                    status={complianceStatus}
                                    assessmentId={
                                      typeof assessment.id === "number" ? assessment.id : undefined
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })
                      : // Fallback to mock data if no real assessments
                        analyticsData.officialPerformance.barangays.map((barangay, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-3 gap-4 items-center py-2 hover:bg-[var(--hover)] rounded-sm transition-colors"
                          >
                            <div className="text-sm font-medium text-[var(--foreground)]">
                              {barangay.name}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-[var(--border)] rounded-sm h-2">
                                <div
                                  className="h-2 rounded-sm"
                                  style={{
                                    backgroundColor: getScoreBarColor(barangay.score),
                                    width: `${barangay.score}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-[var(--foreground)] w-8">
                                {barangay.score}%
                              </span>
                            </div>
                            <div>
                              <span
                                className="px-2 py-1 rounded-sm text-xs font-medium"
                                style={getStatusColor(barangay.status)}
                              >
                                {barangay.status === "passed" ? "✓" : "✗"}
                              </span>
                            </div>
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Municipality-Wide Performance Hotspots */}
            <div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
                <div className="p-6 border-b border-[var(--border)]">
                  <h3 className="text-lg font-bold text-[var(--foreground)]">
                    Municipality-Wide Performance Hotspots
                  </h3>
                </div>

                <div className="p-6 space-y-4">
                  {analyticsData.municipalityPerformance.hotspots.map((hotspot, index) => (
                    <div
                      key={index}
                      className="rounded-sm p-4 border"
                      style={{
                        backgroundColor: "var(--analytics-danger-bg)",
                        borderColor: "var(--analytics-danger-border)",
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-[var(--foreground)] mb-1">
                            {hotspot.indicator}
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)]">
                            Failed by {hotspot.score.split("/")[1]} barangays ({hotspot.score})
                          </div>
                        </div>
                        <div
                          className="px-2 py-1 rounded-sm text-xs font-bold"
                          style={getStatusColor(hotspot.status)}
                        >
                          {hotspot.score}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Capacity Development Priority */}
                  <div
                    className="mt-6 rounded-sm p-4 border"
                    style={{
                      backgroundColor: "var(--kpi-blue-from)",
                      borderColor: "var(--kpi-blue-border, var(--border))",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Target
                        className="h-5 w-5 mt-0.5 flex-shrink-0"
                        style={{ color: "var(--kpi-blue-text)" }}
                      />
                      <div>
                        <h4
                          className="text-sm font-semibold mb-1"
                          style={{ color: "var(--kpi-blue-text)" }}
                        >
                          {analyticsData.capacityDevelopment.title}
                        </h4>
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: "var(--kpi-blue-text)" }}
                        >
                          {analyticsData.capacityDevelopment.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pre-Assessment Effectiveness Analysis */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-1">
                Pre-Assessment Effectiveness Analysis
              </h3>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Prediction Accuracy */}
                <div
                  className="rounded-sm p-6 text-center border"
                  style={{
                    backgroundColor: "var(--analytics-success-bg)",
                    borderColor: "var(--analytics-success-border)",
                  }}
                >
                  <div
                    className="text-4xl font-bold mb-2"
                    style={{ color: "var(--analytics-success-text-light)" }}
                  >
                    {analyticsData.preAssessmentAnalysis.predictionAccuracy}%
                  </div>
                  <div
                    className="text-sm font-semibold mb-1"
                    style={{ color: "var(--analytics-success-text)" }}
                  >
                    Prediction Accuracy
                  </div>
                  <div className="text-xs" style={{ color: "var(--analytics-success-text)" }}>
                    21 total predictions
                  </div>
                </div>

                {/* False Positives */}
                <div
                  className="rounded-sm p-6 text-center border"
                  style={{
                    backgroundColor: "var(--analytics-warning-bg)",
                    borderColor: "var(--analytics-warning-border)",
                  }}
                >
                  <div
                    className="text-4xl font-bold mb-2"
                    style={{ color: "var(--analytics-warning-text-light)" }}
                  >
                    {analyticsData.preAssessmentAnalysis.falsePositives}
                  </div>
                  <div
                    className="text-sm font-semibold mb-1"
                    style={{ color: "var(--analytics-warning-text)" }}
                  >
                    False Positives
                  </div>
                  <div className="text-xs" style={{ color: "var(--analytics-warning-text)" }}>
                    Predicted Pass, Actually Failed
                  </div>
                </div>

                {/* False Negatives */}
                <div
                  className="rounded-sm p-6 text-center border"
                  style={{
                    backgroundColor: "var(--analytics-danger-bg)",
                    borderColor: "var(--analytics-danger-border)",
                  }}
                >
                  <div
                    className="text-4xl font-bold mb-2"
                    style={{ color: "var(--analytics-danger-text-light)" }}
                  >
                    {analyticsData.preAssessmentAnalysis.falseNegatives}
                  </div>
                  <div
                    className="text-sm font-semibold mb-1"
                    style={{ color: "var(--analytics-danger-text)" }}
                  >
                    False Negatives
                  </div>
                  <div className="text-xs" style={{ color: "var(--analytics-danger-text)" }}>
                    Predicted Fail, Actually Passed
                  </div>
                </div>
              </div>

              {/* Analysis Summary */}
              <div
                className="rounded-sm p-4 border"
                style={{
                  backgroundColor: "var(--kpi-blue-from)",
                  borderColor: "var(--kpi-blue-border, var(--border))",
                }}
              >
                <div className="flex items-start gap-3">
                  <Activity
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: "var(--kpi-blue-text)" }}
                  />
                  <div>
                    <h4
                      className="text-sm font-semibold mb-1"
                      style={{ color: "var(--kpi-blue-text)" }}
                    >
                      Analysis Summary
                    </h4>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "var(--kpi-blue-text)" }}
                    >
                      {analyticsData.preAssessmentAnalysis.summary}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI-Powered CapDev Report Generator */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <Brain className="h-6 w-6" style={{ color: "var(--kpi-purple-text)" }} />
                <h3 className="text-xl font-bold text-[var(--foreground)]">
                  {analyticsData.aiReport.title}
                </h3>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {analyticsData.aiReport.description}
              </p>
            </div>

            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-grow">
                  <span className="text-sm font-medium text-[var(--foreground)] whitespace-nowrap">
                    Select a Barangay:
                  </span>
                  <Select value={selectedBarangay} onValueChange={setSelectedBarangay}>
                    <SelectTrigger className="w-full sm:w-64 bg-[var(--background)] border-[var(--border)] rounded-sm">
                      <SelectValue placeholder="Choose a barangay..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--card)] border border-[var(--border)] shadow-xl rounded-sm z-50">
                      {analyticsData.aiReport.availableBarangays.map((barangay) => (
                        <SelectItem
                          key={barangay}
                          value={barangay}
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          {barangay}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="px-8 h-11 font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 rounded-sm w-full sm:w-auto"
                  style={{
                    background:
                      "linear-gradient(to bottom right, var(--cityscape-yellow), var(--cityscape-yellow-dark))",
                    color: "var(--foreground)",
                  }}
                  disabled={!selectedBarangay}
                >
                  <Zap className="h-4 w-4" />
                  Generate Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
