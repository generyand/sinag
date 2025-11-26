import { useGetAssessmentsDashboard } from "@sinag/shared";

// No need to map status anymore since we're using the API status directly

export function useDashboard() {
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useGetAssessmentsDashboard();

  // Transform the data to match the expected structure
  const transformedData = dashboardData
    ? {
        barangayName: dashboardData.barangay_name,
        performanceYear: dashboardData.performance_year,
        assessmentYear: dashboardData.assessment_year,
        status: dashboardData.stats.assessment_status,
        progress: {
          current: dashboardData.stats.completed_indicators,
          total: dashboardData.stats.total_indicators,
          percentage: dashboardData.stats.completion_percentage,
        },
        feedback: dashboardData.feedback || [],
        governanceAreas: dashboardData.stats.governance_areas.map((area) => ({
          ...area,
          status:
            area.requires_rework_count > 0
              ? "needs-rework"
              : area.completion_percentage === 100
              ? "completed"
              : area.completion_percentage > 0
              ? "in-progress"
              : "not-started",
        })),
      }
    : undefined;

  return {
    data: transformedData,
    loading: isLoading,
    error,
    refetch,
  };
}
