'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useGetUsersMe } from '@sinag/shared';
import {
  DashboardHeader,
  KPICards,
  MunicipalProgressChart,
  GovernanceAreaBreakdown,
  ReworkStatsCard,
  FailedIndicators,
  AdminDashboardSkeleton
} from '@/components/features/dashboard';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuthStore();
  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>(undefined);

  // Auto-generated hook to fetch current user data
  const userQuery = useGetUsersMe();

  // Admin dashboard data hook (now uses real API)
  // Pass undefined to get data for all cycles, or a specific cycle_id
  const dashboardQuery = useAdminDashboard(selectedCycleId);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  // Handle user data fetch success
  useEffect(() => {
    if (userQuery.data && !user) {
      console.log('User data fetched in dashboard:', userQuery.data);
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
            style={{ borderColor: 'var(--analytics-danger)' }}
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
          <div
            className="mb-4"
            style={{ color: 'var(--analytics-danger)' }}
          >
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
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
              backgroundColor: 'var(--kpi-blue-from)',
              color: 'var(--kpi-blue-text)'
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
    <div className="min-h-screen bg-[var(--background)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <section className="mb-6">
          <DashboardHeader
            municipality={dashboardData.municipality}
            performanceYear={dashboardData.performanceYear}
            assessmentYear={dashboardData.assessmentYear}
            onAssessmentYearChange={(year) => {
              console.log('Year changed:', year);
            }}
          />
        </section>

        {/* KPI Cards Section */}
        <section className="mb-6">
          <KPICards data={dashboardData.kpiData} />
        </section>

        {/* Main Content: Progress Chart + Sidebar */}
        <section className="mb-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Municipal Progress Chart - 8 columns */}
            <div className="xl:col-span-8">
              <MunicipalProgressChart
                data={dashboardData.municipalProgress}
                totalBarangays={dashboardData.totalBarangays}
              />
            </div>

            {/* Sidebar - 4 columns */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              {/* System Status Card */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm p-5">
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">
                  System Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-sm bg-[var(--muted)]/20 border border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full animate-pulse bg-[var(--cityscape-yellow)]" />
                      <span className="text-sm font-medium text-[var(--foreground)]">Live Data</span>
                    </div>
                    <span className="text-xs font-semibold text-[var(--cityscape-yellow)]">
                      ACTIVE
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-sm bg-[var(--muted)]/20 border border-[var(--border)]">
                    <span className="text-sm font-medium text-[var(--foreground)]">Last Updated</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-sm bg-[var(--muted)]/20 border border-[var(--border)]">
                    <span className="text-sm font-medium text-[var(--foreground)]">Auto-refresh</span>
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">30s</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm p-5 flex-1">
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/mlgoo/submissions')}
                    className="w-full text-left p-3 rounded-sm border border-[var(--border)] bg-[var(--muted)]/20 hover:bg-[var(--cityscape-yellow)]/10 hover:border-[var(--cityscape-yellow)] transition-all duration-200"
                  >
                    <div className="font-medium text-[var(--foreground)] text-sm">Review Submissions</div>
                    <div className="text-xs text-[var(--text-secondary)]">Check pending assessments</div>
                  </button>
                  <button
                    onClick={() => router.push('/mlgoo/reports')}
                    className="w-full text-left p-3 rounded-sm border border-[var(--border)] bg-[var(--muted)]/20 hover:bg-[var(--cityscape-yellow)]/10 hover:border-[var(--cityscape-yellow)] transition-all duration-200"
                  >
                    <div className="font-medium text-[var(--foreground)] text-sm">Generate Reports</div>
                    <div className="text-xs text-[var(--text-secondary)]">View analytics & insights</div>
                  </button>
                  <button
                    onClick={() => router.push('/user-management')}
                    className="w-full text-left p-3 rounded-sm border border-[var(--border)] bg-[var(--muted)]/20 hover:bg-[var(--cityscape-yellow)]/10 hover:border-[var(--cityscape-yellow)] transition-all duration-200"
                  >
                    <div className="font-medium text-[var(--foreground)] text-sm">Manage Users</div>
                    <div className="text-xs text-[var(--text-secondary)]">User accounts & permissions</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Governance Area & Rework Stats */}
        <section className="mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GovernanceAreaBreakdown data={dashboardData.areaBreakdown} />
            <ReworkStatsCard data={dashboardData.reworkStats} />
          </div>
        </section>

        {/* Failed Indicators - Full Width */}
        <section>
          <FailedIndicators
            data={dashboardData.failedIndicators}
            totalBarangays={dashboardData.totalBarangays}
          />
        </section>
      </div>
    </div>
  );
}
