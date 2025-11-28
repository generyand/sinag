import { useGetAnalyticsDashboard, DashboardKPIResponse } from '@sinag/shared';

// Status color mapping for the municipal progress chart
const statusColorMap: Record<string, { color: string; bgColor: string }> = {
  'Not Started': { color: 'text-gray-600', bgColor: 'bg-gray-100' },
  'Submitted': { color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'In Review': { color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  'In Rework': { color: 'text-orange-600', bgColor: 'bg-orange-100' },
  'Awaiting Validation': { color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  'Awaiting MLGOO Approval': { color: 'text-purple-600', bgColor: 'bg-purple-100' },
  'Completed': { color: 'text-green-600', bgColor: 'bg-green-100' },
};

// Types for the administrator dashboard (frontend-friendly format)
export interface AdminDashboardData {
  kpiData: {
    barangaySubmissions: { current: number; total: number };
    awaitingReview: number;
    inRework: number;
    validatedReady: number;
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
    const item = statusDistribution.find(s => s.status === statusName);
    return item?.count || 0;
  };

  // Count submissions (everything except "Not Started")
  const notStarted = getStatusCount('Not Started');
  const totalAssessments = statusDistribution.reduce((sum, s) => sum + s.count, 0);
  const submitted = totalAssessments - notStarted;

  // Transform status distribution to municipal progress with colors
  const municipalProgress = statusDistribution
    .filter(item => item.count > 0) // Only show statuses with assessments
    .map(item => ({
      status: item.status,
      count: item.count,
      percentage: item.percentage,
      color: statusColorMap[item.status]?.color || 'text-gray-600',
      bgColor: statusColorMap[item.status]?.bgColor || 'bg-gray-100',
    }));

  // Transform failed indicators
  const failedIndicators = (apiData.top_failed_indicators || []).map((ind, index) => ({
    id: String(ind.indicator_id),
    code: `${index + 1}`, // We don't have code in the API, use index
    name: ind.indicator_name,
    failedCount: ind.failure_count,
    totalBarangays: apiData.total_barangays,
    percentage: ind.percentage,
    governanceArea: '', // Not available in current API response
  }));

  // Transform area breakdown
  const areaBreakdown = (apiData.area_breakdown || []).map(area => ({
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

  return {
    kpiData: {
      barangaySubmissions: {
        current: submitted,
        total: apiData.total_barangays
      },
      awaitingReview: getStatusCount('Submitted') + getStatusCount('In Review'),
      inRework: getStatusCount('In Rework'),
      validatedReady: getStatusCount('Awaiting Validation') + getStatusCount('Awaiting MLGOO Approval'),
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
    municipality: 'Municipality of Sulop', // Could be fetched from user context
    performanceYear: '2023',
    assessmentYear: new Date().getFullYear().toString(),
    totalBarangays: apiData.total_barangays,
  };
}

export function useAdminDashboard(year?: string) {
  const query = useGetAnalyticsDashboard(
    year ? { cycle_id: parseInt(year) } : undefined,
    {
      query: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
      },
    }
  );

  // Transform the data when available
  const transformedData = query.data ? transformDashboardData(query.data) : undefined;

  return {
    ...query,
    data: transformedData,
  };
}
