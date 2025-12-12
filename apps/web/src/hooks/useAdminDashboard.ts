import {
  DashboardKPIResponse,
  useGetAnalyticsDashboard,
  TopReworkReasons,
  BBIAnalyticsData,
} from "@sinag/shared";
import { useEffectiveYear } from "./useAssessmentYear";

// Re-export the generated types for convenience
export type { TopReworkReasons, BBIAnalyticsData };

// Status color mapping for the municipal progress chart
const statusColorMap: Record<string, { color: string; bgColor: string }> = {
  "Not Started": { color: "text-gray-600", bgColor: "bg-gray-100" },
  Submitted: { color: "text-blue-600", bgColor: "bg-blue-100" },
  "In Review": { color: "text-indigo-600", bgColor: "bg-indigo-100" },
  "In Rework": { color: "text-orange-600", bgColor: "bg-orange-100" },
  "Awaiting Validation": { color: "text-yellow-600", bgColor: "bg-yellow-100" },
  "Awaiting MLGOO Approval": { color: "text-purple-600", bgColor: "bg-purple-100" },
  Completed: { color: "text-green-600", bgColor: "bg-green-100" },
};

// Types for the administrator dashboard (frontend-friendly format)
export interface AdminDashboardData {
  kpiData: {
    barangaySubmissions: { current: number; total: number };
    awaitingReview: number;
    inRework: number;
    validatedReady: number;
    // NEW: Enhanced KPI data for improved dashboard
    awaitingAssessorReview: number; // Submitted + In Review
    awaitingFinalValidation: number; // Awaiting Validation status
    awaitingMLGOOApproval: number; // Awaiting MLGOO Approval status (ACTION REQUIRED)
    completed: number; // Completed status
    notStarted: number; // Not Started
    passedCount: number; // Barangays that passed
    failedCount: number; // Barangays that failed
    passRate: number; // Pass rate percentage
  };
  municipalProgress: Array<{
    status: string;
    count: number;
    percentage: number;
    color: string;
    bgColor: string;
  }>;
  failedIndicators: Array<{
    id: string;
    code: string;
    name: string;
    failedCount: number;
    totalBarangays: number;
    percentage: number;
    governanceArea: string;
  }>;
  areaBreakdown: Array<{
    areaCode: string;
    areaName: string;
    passed: number;
    failed: number;
    percentage: number;
  }>;
  reworkStats: {
    totalAssessments: number;
    assessmentsWithRework: number;
    reworkRate: number;
    assessmentsWithCalibration: number;
    calibrationRate: number;
  };
  topReworkReasons?: TopReworkReasons;
  bbiAnalytics?: BBIAnalyticsData;
  municipality: string;
  performanceYear: string;
  assessmentYear: string;
  totalBarangays: number;
}

// Transform API response to frontend-friendly format
function transformDashboardData(apiData: DashboardKPIResponse): AdminDashboardData {
  // Calculate KPI values from status distribution
  const statusDistribution = apiData.status_distribution || [];

  // Find specific status counts
  const getStatusCount = (statusName: string): number => {
    const item = statusDistribution.find((s) => s.status === statusName);
    return item?.count || 0;
  };

  // Count submissions (everything except "Not Started")
  const notStarted = getStatusCount("Not Started");
  const totalAssessments = statusDistribution.reduce((sum, s) => sum + s.count, 0);
  const submitted = totalAssessments - notStarted;

  // Transform status distribution to municipal progress with colors
  const municipalProgress = statusDistribution
    .filter((item) => item.count > 0) // Only show statuses with assessments
    .map((item) => ({
      status: item.status,
      count: item.count,
      percentage: item.percentage,
      color: statusColorMap[item.status]?.color || "text-gray-600",
      bgColor: statusColorMap[item.status]?.bgColor || "bg-gray-100",
    }));

  // Transform failed indicators
  const failedIndicators = (apiData.top_failed_indicators || []).map((ind) => ({
    id: String(ind.indicator_id),
    code: ind.indicator_code || `IND-${ind.indicator_id}`,
    name: ind.indicator_name,
    failedCount: ind.failure_count,
    totalBarangays: apiData.total_barangays,
    percentage: ind.percentage,
    governanceArea: ind.governance_area || "",
  }));

  // Transform area breakdown
  const areaBreakdown = (apiData.area_breakdown || []).map((area) => ({
    areaCode: area.area_code,
    areaName: area.area_name,
    passed: area.passed,
    failed: area.failed,
    percentage: area.percentage,
  }));

  // Transform rework stats
  const reworkStats = apiData.rework_stats || {
    total_assessments: 0,
    assessments_with_rework: 0,
    rework_rate: 0,
    assessments_with_calibration: 0,
    calibration_rate: 0,
  };

  // Transform BBI analytics (pass through as-is since it matches our interface)
  const bbiAnalytics = apiData.bbi_analytics || undefined;

  // Transform top rework reasons (pass through as-is since it matches our interface)
  const topReworkReasons = apiData.top_rework_reasons || undefined;

  // NEW: Calculate enhanced KPI values
  const awaitingAssessorReview = getStatusCount("Submitted") + getStatusCount("In Review");
  const awaitingFinalValidation = getStatusCount("Awaiting Validation");
  const awaitingMLGOOApproval = getStatusCount("Awaiting MLGOO Approval");
  const completed = getStatusCount("Completed");
  const passedCount = apiData.overall_compliance_rate?.passed || 0;
  const failedCount = apiData.overall_compliance_rate?.failed || 0;
  const passRate = apiData.overall_compliance_rate?.pass_percentage || 0;

  return {
    kpiData: {
      barangaySubmissions: {
        current: submitted,
        total: apiData.total_barangays,
      },
      awaitingReview: awaitingAssessorReview,
      inRework: getStatusCount("In Rework"),
      validatedReady: awaitingFinalValidation + awaitingMLGOOApproval,
      // NEW: Enhanced KPI data
      awaitingAssessorReview,
      awaitingFinalValidation,
      awaitingMLGOOApproval,
      completed,
      notStarted,
      passedCount,
      failedCount,
      passRate,
    },
    municipalProgress,
    failedIndicators,
    areaBreakdown,
    reworkStats: {
      totalAssessments: reworkStats.total_assessments,
      assessmentsWithRework: reworkStats.assessments_with_rework,
      reworkRate: reworkStats.rework_rate,
      assessmentsWithCalibration: reworkStats.assessments_with_calibration,
      calibrationRate: reworkStats.calibration_rate,
    },
    topReworkReasons,
    bbiAnalytics,
    municipality: "Municipality of Sulop", // Could be fetched from user context
    performanceYear: "2023",
    assessmentYear: new Date().getFullYear().toString(),
    totalBarangays: apiData.total_barangays,
  };
}

export interface UseAdminDashboardOptions {
  cycleId?: number;
  /** Override the year from the global store. If not provided, uses effective year from store. */
  year?: number;
}

export function useAdminDashboard(options?: UseAdminDashboardOptions) {
  const effectiveYear = useEffectiveYear();

  // Use provided year, fall back to effective year from store
  const yearToUse = options?.year ?? effectiveYear;

  // Pass year parameter to the API call
  const query = useGetAnalyticsDashboard({
    ...(options?.cycleId ? { cycle_id: options.cycleId } : {}),
    ...(yearToUse ? { year: yearToUse } : {}),
  });

  // Transform the data when available
  const transformedData = query.data ? transformDashboardData(query.data) : undefined;

  return {
    ...query,
    data: transformedData,
    year: yearToUse,
  };
}
