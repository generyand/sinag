"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useGetUsersMe, useGetAnalyticsReports } from "@sinag/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  RefreshCw,
  Filter,
  BarChart3,
  LineChart,
  Map,
  Table2,
  PieChart,
  Trophy,
  TrendingUp,
  Layers,
} from "lucide-react";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import {
  ComplianceRateCard,
  CompletionStatusCard,
  AreaBreakdownCard,
  TopFailedIndicatorsCard,
  BarangayRankingsCard,
  BBIFunctionalityWidget,
  TrendChart,
} from "@/components/features/dashboard-analytics";
import {
  FilterControls,
  VisualizationGrid,
  ExportControls,
} from "@/components/features/reports";

// Tab definitions with icons
const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "charts", label: "Charts", icon: PieChart },
  { id: "map", label: "Geographic", icon: Map },
  { id: "table", label: "Detailed Results", icon: Table2 },
  { id: "rankings", label: "Rankings", icon: Trophy },
  { id: "trends", label: "Trends", icon: TrendingUp },
  { id: "bbi", label: "BBI Status", icon: Layers },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, isAuthenticated } = useAuthStore();

  // Get initial tab from URL or default to "overview"
  const initialTab = (searchParams.get("tab") as TabId) || "overview";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const [selectedCycle, setSelectedCycle] = useState<number | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<"phase1" | "phase2" | "all">("all");

  // Filter state for reports
  const [filters, setFilters] = useState({
    cycle_id: undefined as number | undefined,
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined,
    governance_area: undefined as string[] | undefined,
    barangay_id: undefined as number[] | undefined,
    status: undefined as string | undefined,
    phase: undefined as "phase1" | "phase2" | undefined,
    page: 1,
    page_size: 50,
  });

  // Auto-generated hook to fetch current user data
  const userQuery = useGetUsersMe();

  // Analytics dashboard data hook
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboardAnalytics(selectedCycle);

  // Reports data hook
  const {
    data: reportsData,
    isLoading: isReportsLoading,
    error: reportsError,
  } = useGetAnalyticsReports({
    cycle_id: filters.cycle_id,
    start_date: filters.start_date,
    end_date: filters.end_date,
    governance_area: filters.governance_area,
    barangay_id: filters.barangay_id,
    status: filters.status,
    page: filters.page,
    page_size: filters.page_size,
  });

  // Update URL when tab changes
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/analytics?${params.toString()}`, { scroll: false });
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
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

    // Check if user has MLGOO_DILG role
    if (userQuery.data && userQuery.data.role !== "MLGOO_DILG") {
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

  // Check RBAC - only MLGOO_DILG can access
  if (user && user.role !== "MLGOO_DILG") {
    return (
      <div className="min-h-screen bg-[var(--background)] p-8">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to access this page. Only MLGOO-DILG
              users can view the analytics dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const isLoading = isDashboardLoading || isReportsLoading;
  const error = dashboardError || reportsError;

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
          <div className="relative overflow-hidden bg-[var(--card)] rounded shadow-lg border border-[var(--border)] p-8">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 dark:from-blue-400/20 dark:to-indigo-400/10 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-500/10 to-pink-500/5 dark:from-purple-400/20 dark:to-pink-400/10 rounded-full translate-y-16 -translate-x-16"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] rounded shadow-md">
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
                        cycle_id: filters.cycle_id,
                        start_date: filters.start_date,
                        end_date: filters.end_date,
                        governance_area: filters.governance_area,
                        barangay_id: filters.barangay_id,
                        status: filters.status,
                      }}
                      reportsData={reportsData}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-[var(--card)] rounded shadow-lg border border-[var(--border)] p-2">
            <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabId)}>
              <TabsList className="w-full flex flex-wrap gap-1 bg-transparent h-auto p-0">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-2 px-4 py-2.5 rounded data-[state=active]:bg-[var(--cityscape-yellow)] data-[state=active]:text-[var(--foreground)] data-[state=active]:shadow-sm transition-all"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* Global Filters */}
          <div className="bg-[var(--card)] rounded shadow-lg border border-[var(--border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="h-5 w-5" style={{ color: "var(--cityscape-yellow)" }} />
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Global Filters
              </h2>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Cycle Selector */}
              <div className="w-full sm:w-64">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wide">
                  Assessment Cycle
                </label>
                <Select
                  value={selectedCycle?.toString() || "all"}
                  onValueChange={(value) => {
                    if (value === "all") {
                      setSelectedCycle(null);
                      setFilters((prev) => ({ ...prev, cycle_id: undefined }));
                    } else {
                      const cycleId = parseInt(value);
                      setSelectedCycle(cycleId);
                      setFilters((prev) => ({ ...prev, cycle_id: cycleId }));
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-[var(--background)] border-[var(--border)] rounded">
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card)] border border-[var(--border)] shadow-xl rounded z-50">
                    <SelectItem
                      value="all"
                      className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                    >
                      All Cycles
                    </SelectItem>
                    <SelectItem
                      value="1"
                      className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                    >
                      Cycle 1 - 2024 Q1
                    </SelectItem>
                    <SelectItem
                      value="2"
                      className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                    >
                      Cycle 2 - 2024 Q2
                    </SelectItem>
                    <SelectItem
                      value="3"
                      className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                    >
                      Cycle 3 - 2024 Q3
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Phase Selector */}
              <div className="w-full sm:w-64">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wide">
                  Assessment Phase
                </label>
                <Select
                  value={selectedPhase}
                  onValueChange={(value: "phase1" | "phase2" | "all") => {
                    setSelectedPhase(value);
                  }}
                >
                  <SelectTrigger className="w-full bg-[var(--background)] border-[var(--border)] rounded">
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card)] border border-[var(--border)] shadow-xl rounded z-50">
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

            {/* Phase Badge Indicator */}
            {selectedPhase !== "all" && (
              <div className="flex items-center gap-2 mt-4">
                <div
                  className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium border ${
                    selectedPhase === "phase1"
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                      : "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                  }`}
                >
                  {selectedPhase === "phase1" ? (
                    <>
                      Phase 1: Table Assessment
                      <span className="ml-2 text-blue-600 dark:text-blue-400 font-normal">
                        (Assessor Role)
                      </span>
                    </>
                  ) : (
                    <>
                      Phase 2: Table Validation
                      <span className="ml-2 text-purple-600 dark:text-purple-400 font-normal">
                        (Validator Role)
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Overview Tab - KPI Cards */}
            {activeTab === "overview" && dashboardData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <ComplianceRateCard data={dashboardData.overall_compliance_rate} />
                  <CompletionStatusCard data={dashboardData.completion_status} />
                  <TopFailedIndicatorsCard data={dashboardData.top_failed_indicators || []} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AreaBreakdownCard data={dashboardData.area_breakdown || []} />
                  <BarangayRankingsCard data={dashboardData.barangay_rankings || []} />
                </div>
              </>
            )}

            {/* Charts Tab - Bar, Pie, Line Charts */}
            {activeTab === "charts" && reportsData && (
              <VisualizationGrid
                data={reportsData}
                isLoading={isReportsLoading}
                showOnly={["bar", "pie", "line"]}
              />
            )}

            {/* Map Tab - Geographic Distribution */}
            {activeTab === "map" && reportsData && (
              <VisualizationGrid
                data={reportsData}
                isLoading={isReportsLoading}
                showOnly={["map"]}
              />
            )}

            {/* Table Tab - Detailed Results */}
            {activeTab === "table" && reportsData && (
              <VisualizationGrid
                data={reportsData}
                isLoading={isReportsLoading}
                showOnly={["table"]}
              />
            )}

            {/* Rankings Tab */}
            {activeTab === "rankings" && dashboardData && (
              <div className="grid grid-cols-1 gap-6">
                <BarangayRankingsCard data={dashboardData.barangay_rankings || []} />
                <TopFailedIndicatorsCard data={dashboardData.top_failed_indicators || []} />
              </div>
            )}

            {/* Trends Tab */}
            {activeTab === "trends" && dashboardData && (
              <TrendChart data={dashboardData.trends || []} />
            )}

            {/* BBI Tab */}
            {activeTab === "bbi" && dashboardData && dashboardData.bbi_functionality && (
              <BBIFunctionalityWidget data={dashboardData.bbi_functionality} />
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
      <div className="relative overflow-hidden bg-[var(--card)] rounded shadow-lg border border-[var(--border)] p-8">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded" />
              <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="bg-[var(--card)] rounded shadow-lg border border-[var(--border)] p-2">
        <div className="flex gap-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded" />
          ))}
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="bg-[var(--card)] rounded shadow-lg border border-[var(--border)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-5 w-5 rounded" />
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
            className="bg-[var(--card)] p-6 rounded shadow-lg border border-[var(--border)] space-y-4"
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
