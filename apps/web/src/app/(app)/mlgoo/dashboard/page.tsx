"use client";

import {
  AdminDashboardSkeleton,
  DashboardHeader,
  MunicipalProgressChart,
  TopReworkReasonsCard,
} from "@/components/features/dashboard";
import { SimplifiedKPICards } from "@/components/features/dashboard/SimplifiedKPICards";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useAuthStore } from "@/store/useAuthStore";
import { useGetUsersMe, usePostAnalyticsDashboardRefreshAnalysis } from "@sinag/shared";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUser, isAuthenticated } = useAuthStore();

  // Auto-generated hook to fetch current user data
  const userQuery = useGetUsersMe();

  // Admin dashboard data hook - automatically uses year from global store
  const dashboardQuery = useAdminDashboard();

  // Mutation hook for refreshing AI analysis
  const refreshAnalysisMutation = usePostAnalyticsDashboardRefreshAnalysis({
    mutation: {
      onSuccess: () => {
        // Invalidate the dashboard query to refetch fresh data
        // Query key format: ['/api/v1/analytics/dashboard', params]
        queryClient.invalidateQueries({
          queryKey: ["/api/v1/analytics/dashboard"],
        });
        toast.success("AI analysis refreshed successfully");
      },
      onError: () => {
        toast.error("Failed to refresh AI analysis. Please try again.");
      },
    },
  });

  // Handler for regenerating AI analysis
  const handleRegenerateAnalysis = useCallback(() => {
    const year = dashboardQuery.year;
    refreshAnalysisMutation.mutate({
      params: year ? { year } : undefined,
    });
  }, [dashboardQuery.year, refreshAnalysisMutation]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  // Handle user data fetch success
  useEffect(() => {
    if (userQuery.data && !user) {
      console.log("User data fetched in dashboard:", userQuery.data);
      setUser(userQuery.data);
    }
  }, [userQuery.data, user, setUser]);

  // Show loading if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
            style={{ borderColor: "var(--analytics-danger)" }}
          ></div>
          <p className="text-[var(--muted-foreground)]">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show loading skeleton while dashboard data is loading
  if (dashboardQuery.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <AdminDashboardSkeleton />
      </div>
    );
  }

  // Show error state
  if (dashboardQuery.error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="mb-4" style={{ color: "var(--analytics-danger)" }}>
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-[var(--muted-foreground)] mb-4">
            Unable to load dashboard data. Please try refreshing the page.
          </p>
          <button
            onClick={() => dashboardQuery.refetch()}
            className="px-4 py-2 rounded-md transition-colors"
            style={{
              backgroundColor: "var(--kpi-blue-from)",
              color: "var(--kpi-blue-text)",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const dashboardData = dashboardQuery.data;

  if (!dashboardData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-[var(--muted-foreground)]">No dashboard data available.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)]" role="main" aria-label="MLGOO Dashboard">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header Section */}
        <header className="mb-4 sm:mb-6">
          <DashboardHeader municipality={dashboardData.municipality} />
        </header>

        {/* Simplified KPI Cards with Hero Action */}
        <section className="mb-4 sm:mb-6" aria-label="Key Performance Indicators">
          <SimplifiedKPICards data={dashboardData.kpiData} />
        </section>

        {/* Main Content: Progress Chart + Quick Actions */}
        <section className="mb-4 sm:mb-6" aria-label="Municipal Progress and Quick Actions">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Municipal Progress Chart - Expanded to 9 columns */}
            <div className="lg:col-span-9">
              <MunicipalProgressChart
                data={dashboardData.municipalProgress}
                totalBarangays={dashboardData.totalBarangays}
              />
            </div>

            {/* Quick Actions Sidebar - 3 columns */}
            <aside className="lg:col-span-3" aria-label="Quick Actions">
              <nav
                className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm p-4 sm:p-5 h-full"
                aria-labelledby="quick-actions-title"
              >
                <h3
                  id="quick-actions-title"
                  className="text-sm sm:text-base font-semibold text-[var(--foreground)] mb-3 sm:mb-4"
                >
                  Quick Actions
                </h3>
                <ul className="space-y-3">
                  <li>
                    <button
                      onClick={() => router.push("/mlgoo/submissions")}
                      className="w-full text-left p-3 rounded-sm border border-[var(--border)] bg-[var(--muted)]/20 hover:bg-[var(--cityscape-yellow)]/10 hover:border-[var(--cityscape-yellow)] transition-all duration-200 min-h-[44px]"
                      aria-label="Review Submissions - Check pending assessments"
                    >
                      <div className="font-medium text-[var(--foreground)] text-xs sm:text-sm">
                        Review Submissions
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1">
                        Check pending assessments
                      </div>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => router.push("/analytics")}
                      className="w-full text-left p-3 rounded-sm border border-[var(--border)] bg-[var(--muted)]/20 hover:bg-[var(--cityscape-yellow)]/10 hover:border-[var(--cityscape-yellow)] transition-all duration-200 min-h-[44px]"
                      aria-label="View Analytics - Detailed reports and insights"
                    >
                      <div className="flex items-center gap-2 font-medium text-[var(--foreground)] text-xs sm:text-sm">
                        <BarChart3 className="h-4 w-4" />
                        View Analytics
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1">
                        Detailed reports & insights
                      </div>
                    </button>
                  </li>
                </ul>
              </nav>
            </aside>
          </div>
        </section>

        {/* Top Rework Reasons - AI Insights (Unique to Dashboard) */}
        <section className="mb-4 sm:mb-6" aria-label="AI-Generated Insights">
          <TopReworkReasonsCard
            data={dashboardData.topReworkReasons}
            onRegenerate={handleRegenerateAnalysis}
            isRegenerating={refreshAnalysisMutation.isPending}
            isRefetching={dashboardQuery.isFetching && !dashboardQuery.isLoading}
          />
        </section>

        {/* Link to Analytics for detailed analysis */}
        <div className="flex justify-center pb-4 sm:pb-0">
          <button
            onClick={() => router.push("/analytics")}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)] rounded-sm hover:bg-[var(--cityscape-yellow)]/10 hover:border-[var(--cityscape-yellow)] transition-all duration-200 min-h-[44px] w-full sm:w-auto"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">View Detailed Analytics & Reports</span>
            <span className="sm:hidden">View Analytics & Reports</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
