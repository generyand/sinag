"use client";

import {
  ANALYTICS_TABS,
  ActiveFilterPills,
  GARAnalyticsTab,
  useAnalyticsFilters,
  type AnalyticsTabId,
} from "@/components/features/analytics";
import { YearSelector } from "@/components/features/assessment-year/YearSelector";
import { BBIStatusTab, type MunicipalityBBIAnalyticsData } from "@/components/features/reports";
import {
  AggregatedCapDevCard,
  BarangayStatusTable,
  ComplianceSummaryCard,
  TopFailingIndicatorsCard,
} from "@/components/features/municipal-overview";
import { GovernanceAreaBreakdown } from "@/components/features/dashboard/GovernanceAreaBreakdown";
import { ExportControls, VisualizationGrid } from "@/components/features/reports";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { useAuthStore } from "@/store/useAuthStore";
import {
  useGetAnalyticsReports,
  useGetMunicipalOverviewDashboard,
  useGetUsersMe,
} from "@sinag/shared";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BarChart3, Filter, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, isAuthenticated } = useAuthStore();

  // Get initial tab from URL or default to "overview"
  const initialTab = (searchParams.get("tab") as AnalyticsTabId) || "overview";
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>(initialTab);

  // Use the centralized filter hook (now uses year instead of cycle)
  const {
    selectedYear,
    selectedPhase,
    filters,
    setSelectedPhase,
    clearAllFilters,
    hasActiveFilters,
    activeFilterLabels,
  } = useAnalyticsFilters();

  // Auto-generated hook to fetch current user data
  const userQuery = useGetUsersMe();

  // Analytics dashboard data hook (now using year instead of cycle)
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboardAnalytics(selectedYear);

  // Reports data hook (now using year instead of cycle_id)
  const {
    data: reportsData,
    isLoading: isReportsLoading,
    error: reportsError,
  } = useGetAnalyticsReports({
    year: filters.year,
    start_date: filters.start_date,
    end_date: filters.end_date,
    governance_area: filters.governance_area,
    barangay_id: filters.barangay_id,
    status: filters.status,
    page: filters.page,
    page_size: filters.page_size,
  });

  // Municipal Overview data hook (now using year filter)
  const {
    data: municipalData,
    isLoading: isMunicipalLoading,
    error: municipalError,
  } = useGetMunicipalOverviewDashboard({
    year: selectedYear ?? undefined,
  });

  // BBI Analytics data hook for municipality-wide BBI status matrix
  // OPTIMIZED: Long cache times since BBI data is relatively stable
  const { data: bbiAnalytics, isLoading: isBBILoading } = useQuery<MunicipalityBBIAnalyticsData>({
    queryKey: ["bbis", "analytics", "municipality", selectedYear],
    queryFn: async () => {
      const response = await api.get(`/api/v1/bbis/analytics/municipality`, {
        params: { year: selectedYear },
      });
      return response.data as MunicipalityBBIAnalyticsData;
    },
    enabled: !!selectedYear && activeTab === "bbi",
    // PERFORMANCE: BBI data doesn't change frequently
    staleTime: 10 * 60 * 1000, // 10 minutes - data is stable
    gcTime: 30 * 60 * 1000, // 30 minutes - matches backend cache TTL
    refetchOnWindowFocus: false, // Don't refetch on tab focus for analytics
    placeholderData: (previousData: MunicipalityBBIAnalyticsData | undefined) => previousData, // Keep showing old data while fetching
  });

  // Handler for viewing CapDev insights - navigates to submissions detail page
  const handleViewCapDev = (assessmentId: number) => {
    router.push(`/mlgoo/submissions/${assessmentId}`);
  };

  // Update URL when tab changes
  const handleTabChange = (tab: AnalyticsTabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/analytics?${params.toString()}`, { scroll: false });
  };

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  // Handle user data fetch success and RBAC check
  useEffect(() => {
    if (userQuery.data && !user) {
      setUser(userQuery.data);
    }

    // Check if user has MLGOO_DILG or VALIDATOR role (both can access analytics)
    const allowedRoles = ["MLGOO_DILG", "VALIDATOR"];
    if (userQuery.data && !allowedRoles.includes(userQuery.data.role)) {
      router.replace("/");
    }
  }, [userQuery.data, user, setUser, router]);

  // Show loading if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--cityscape-yellow)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Check RBAC - MLGOO_DILG and VALIDATOR can access
  const analyticsAllowedRoles = ["MLGOO_DILG", "VALIDATOR"];
  if (user && !analyticsAllowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-8">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to access this page. Only MLGOO-DILG and Validator users
              can view the analytics dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const isLoading = isDashboardLoading || isReportsLoading || isMunicipalLoading;
  const error = dashboardError || reportsError || municipalError;

  // Show loading skeleton
  if (isLoading && !dashboardData && !reportsData) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-8">
        <div className="max-w-7xl mx-auto">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !dashboardData && !reportsData) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-8">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>
              Unable to load analytics data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <button
              onClick={() => refetchDashboard()}
              className="inline-flex items-center px-6 py-3 rounded-sm font-semibold hover:shadow-lg transition-all duration-200"
              style={{
                background:
                  "linear-gradient(to bottom right, var(--cityscape-yellow), var(--cityscape-yellow-dark))",
                color: "var(--foreground)",
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Enhanced Header Section */}
          <div className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-8">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 dark:from-blue-400/20 dark:to-indigo-400/10 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-500/10 to-pink-500/5 dark:from-purple-400/20 dark:to-pink-400/10 rounded-full translate-y-16 -translate-x-16"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] rounded-sm shadow-md">
                    <BarChart3 className="h-8 w-8 text-[var(--foreground)]" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-[var(--foreground)]">
                      Analytics &{" "}
                      <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                        Reports
                      </span>
                    </h1>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Comprehensive overview of assessment KPIs, trends, and visualizations
                    </p>
                  </div>
                </div>

                {/* Export Controls */}
                {reportsData && (
                  <div className="flex-shrink-0">
                    <ExportControls
                      tableData={reportsData.table_data.rows || []}
                      currentFilters={{
                        year: filters.year,
                        start_date: filters.start_date,
                        end_date: filters.end_date,
                        governance_area: filters.governance_area,
                        barangay_id: filters.barangay_id,
                        status: filters.status,
                      }}
                      reportsData={reportsData}
                      activeTab={activeTab}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-2">
            <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as AnalyticsTabId)}>
              <TabsList className="w-full flex flex-wrap gap-1 bg-transparent h-auto p-0">
                {ANALYTICS_TABS.map((tab) => {
                  const Icon = tab.icon;
                  // Hide GAR tab for non-MLGOO users
                  if (tab.id === "gar" && user?.role !== "MLGOO_DILG") {
                    return null;
                  }

                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-sm data-[state=active]:bg-[var(--cityscape-yellow)] data-[state=active]:text-[var(--foreground)] data-[state=active]:shadow-sm transition-all"
                      aria-label={tab.label}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* Global Filters */}
          <div className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <Filter
                className="h-5 w-5"
                style={{ color: "var(--cityscape-yellow)" }}
                aria-hidden="true"
              />
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Global Filters</h2>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              {/* Year Selector */}
              <div className="w-full sm:w-auto">
                <YearSelector showLabel showIcon />
              </div>

              {/* Phase Selector */}
              <div className="w-full sm:w-64">
                <label
                  htmlFor="phase-select"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wide"
                >
                  Assessment Phase
                </label>
                <Select
                  value={selectedPhase}
                  onValueChange={(value: "phase1" | "phase2" | "all") => {
                    setSelectedPhase(value);
                  }}
                >
                  <SelectTrigger
                    id="phase-select"
                    className="w-full bg-[var(--background)] border-[var(--border)] rounded-sm"
                  >
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card)] border border-[var(--border)] shadow-xl rounded-sm z-50">
                    <SelectItem
                      value="all"
                      className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                    >
                      All Phases
                    </SelectItem>
                    <SelectItem
                      value="phase1"
                      className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                    >
                      Phase 1: Table Assessment (Assessor)
                    </SelectItem>
                    <SelectItem
                      value="phase2"
                      className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                    >
                      Phase 2: Table Validation (Validator)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Active Filter Pills */}
          <ActiveFilterPills
            filterLabels={activeFilterLabels}
            onClearAll={clearAllFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Overview Tab - Municipal Overview Dashboard */}
            {activeTab === "overview" && municipalData && (
              <>
                {/* Compliance Summary - Full Width */}
                <ComplianceSummaryCard data={municipalData.compliance_summary} />

                {/* Two Column Layout for Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GovernanceAreaBreakdown
                    data={
                      municipalData.governance_area_performance?.areas?.map((area) => ({
                        areaCode: area.id.toString(),
                        areaName: area.name,
                        passed: area.passed_count,
                        failed: area.failed_count,
                        percentage: area.pass_rate,
                      })) ?? []
                    }
                  />
                  <TopFailingIndicatorsCard data={municipalData.top_failing_indicators} />
                </div>

                {/* Aggregated CapDev Insights */}
                <AggregatedCapDevCard data={municipalData.capdev_summary} />

                {/* Barangay Status Table - Full Width */}
                <BarangayStatusTable
                  data={municipalData.barangay_statuses}
                  onViewCapDev={handleViewCapDev}
                />

                {/* Footer with generation timestamp */}
                <p className="text-xs text-gray-400 text-right">
                  Dashboard generated: {new Date(municipalData.generated_at).toLocaleString()}
                  {municipalData.assessment_cycle && ` | Cycle: ${municipalData.assessment_cycle}`}
                </p>
              </>
            )}

            {/* Map Tab - Geographic Distribution */}
            {activeTab === "map" && reportsData && (
              <VisualizationGrid
                data={reportsData}
                isLoading={isReportsLoading}
                showOnly={["map"]}
              />
            )}

            {/* BBI Tab - Municipality-wide BBI Status Matrix */}
            {activeTab === "bbi" && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm p-6">
                <BBIStatusTab
                  data={bbiAnalytics ?? null}
                  isLoading={isBBILoading}
                  municipalityName="Sulop"
                />
              </div>
            )}

            {/* Table Tab - Verdict Results (formerly Detailed Results) */}
            {activeTab === "table" && reportsData && (
              <VisualizationGrid
                data={reportsData}
                isLoading={isReportsLoading}
                showOnly={["table"]}
              />
            )}

            {/* GAR Report Tab - MLGOO Only */}
            {activeTab === "gar" && (
              <GARAnalyticsTab year={selectedYear ?? new Date().getFullYear()} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton component for the dashboard
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-8">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-sm" />
              <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-2">
        <div className="flex gap-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-sm" />
          ))}
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-5 w-5 rounded-sm" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-64">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="w-full sm:w-64">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-[var(--card)] p-6 rounded-sm shadow-lg border border-[var(--border)] space-y-4"
          >
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
