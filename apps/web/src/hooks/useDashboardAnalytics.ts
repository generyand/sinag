import { useGetAnalyticsDashboard } from "@sinag/shared";
import type { DashboardKPIResponse, BBIAnalyticsData } from "@sinag/shared";
import type { BBIFunctionalityData } from "@/components/features/dashboard-analytics/BBIFunctionalityWidget";

export interface DashboardAnalyticsResponse extends DashboardKPIResponse {
  bbi_functionality?: BBIFunctionalityData;
}

/**
 * Transform backend BBIAnalyticsData to frontend BBIFunctionalityData format
 */
function transformBBIAnalytics(
  bbiAnalytics: BBIAnalyticsData | null | undefined
): BBIFunctionalityData | undefined {
  if (!bbiAnalytics || !bbiAnalytics.bbi_breakdown || bbiAnalytics.bbi_breakdown.length === 0) {
    return undefined;
  }

  const { summary, bbi_breakdown } = bbiAnalytics;

  // Transform bbi_breakdown to bbi_statuses
  const bbi_statuses = bbi_breakdown.map((item) => ({
    bbi_code: item.bbi_abbreviation,
    bbi_name: item.bbi_abbreviation,
    bbi_full_name: item.bbi_name,
    // Consider "functional" if average compliance >= 50%
    is_functional: item.average_compliance >= 50,
    // Contributing indicators not available from aggregated data
    contributing_indicators: [],
  }));

  // Calculate functional counts based on highly + moderately functional
  const functional_count = summary.total_highly_functional + summary.total_moderately_functional;
  const non_functional_count = summary.total_low_functional;
  const total = functional_count + non_functional_count;

  return {
    total_bbis: bbi_breakdown.length,
    functional_count,
    non_functional_count,
    functionality_percentage: total > 0 ? (functional_count / total) * 100 : 0,
    bbi_statuses,
  };
}

/**
 * Custom hook wrapper for analytics dashboard data fetching
 *
 * Wraps the Orval-generated useGetAnalyticsDashboard hook with:
 * - Proper error handling
 * - User-friendly error messages
 * - Typed data with defaults for missing fields
 * - Simplified return interface
 *
 * @param year - Optional assessment year (e.g., 2024, 2025). Defaults to active year if not provided.
 * @returns Object containing data, loading state, error, and refetch function
 */
export function useDashboardAnalytics(year?: number | null) {
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useGetAnalyticsDashboard({
    year: year ?? undefined,
  });

  const rawData = data as DashboardAnalyticsResponse | undefined;

  // Format error message for user display
  const error = queryError ? formatErrorMessage(queryError) : null;

  // Provide typed data with defaults for missing fields
  const dashboardData: DashboardAnalyticsResponse | undefined = rawData
    ? {
        overall_compliance_rate: rawData.overall_compliance_rate || {
          total_barangays: 0,
          passed: 0,
          failed: 0,
          pass_percentage: 0,
        },
        completion_status: rawData.completion_status || {
          total_barangays: 0,
          passed: 0,
          failed: 0,
          pass_percentage: 0,
        },
        area_breakdown: rawData.area_breakdown || [],
        top_failed_indicators: rawData.top_failed_indicators || [],
        barangay_rankings: rawData.barangay_rankings || [],
        trends: rawData.trends || [],
        status_distribution: rawData.status_distribution || [],
        rework_stats: rawData.rework_stats || {
          total_assessments: 0,
          assessments_with_rework: 0,
          rework_rate: 0,
          assessments_with_calibration: 0,
          calibration_rate: 0,
        },
        total_barangays: rawData.total_barangays || 0,
        bbi_functionality: transformBBIAnalytics(rawData.bbi_analytics),
      }
    : undefined;

  return {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Format error object into user-friendly error message
 *
 * @param error - Error object from the API query
 * @returns Formatted error message string
 */
function formatErrorMessage(error: unknown): string {
  // Handle axios error response
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as { response?: { status?: number; data?: { detail?: string } } };

    if (axiosError.response?.status === 401) {
      return "Authentication required. Please log in again.";
    }

    if (axiosError.response?.status === 403) {
      return "You do not have permission to view analytics. MLGOO-DILG access required.";
    }

    if (axiosError.response?.status === 404) {
      return "Analytics data not found for the selected year.";
    }

    if (axiosError.response?.status === 500) {
      return "Server error occurred while fetching analytics data. Please try again later.";
    }

    // Try to get detail from response
    if (axiosError.response?.data?.detail) {
      return axiosError.response.data.detail;
    }
  }

  // Handle network error
  if (error && typeof error === "object" && "message" in error) {
    const networkError = error as { message?: string };

    if (networkError.message?.toLowerCase().includes("network")) {
      return "Network error. Please check your internet connection and try again.";
    }

    return networkError.message || "An unexpected error occurred while fetching analytics data.";
  }

  // Fallback error message
  return "An unexpected error occurred. Please try refreshing the page.";
}

export default useDashboardAnalytics;
