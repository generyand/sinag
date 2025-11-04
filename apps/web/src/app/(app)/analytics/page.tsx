'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useGetUsersMe } from '@vantage/shared';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import {
  ComplianceRateCard,
  CompletionStatusCard,
  AreaBreakdownCard,
  TopFailedIndicatorsCard,
  BarangayRankingsCard,
} from '@/components/features/dashboard-analytics';
import { TrendChart } from '@/components/features/dashboard-analytics';

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuthStore();
  const [selectedCycle, setSelectedCycle] = useState<number | null>(null);

  // Auto-generated hook to fetch current user data
  const userQuery = useGetUsersMe();

  // Analytics dashboard data hook with error handling
  const { data, isLoading, error, refetch } = useDashboardAnalytics(selectedCycle);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  // Handle user data fetch success and RBAC check
  useEffect(() => {
    if (userQuery.data && !user) {
      setUser(userQuery.data);
    }

    // Check if user has MLGOO_DILG role
    if (userQuery.data && userQuery.data.role !== 'MLGOO_DILG') {
      // Redirect to unauthorized or home page
      router.replace('/');
    }
  }, [userQuery.data, user, setUser, router]);

  // Show loading if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Check RBAC - only MLGOO_DILG can access
  if (user && user.role !== 'MLGOO_DILG') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access this page. Only MLGOO-DILG users can view the
            analytics dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading skeleton while dashboard data is loading
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DashboardSkeleton />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            Unable to load dashboard data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">
                Comprehensive overview of assessment KPIs and trends
              </p>
            </div>

            {/* Cycle Selector */}
            <div className="w-full sm:w-64">
              <Select
                value={selectedCycle?.toString() || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setSelectedCycle(null);
                  } else {
                    setSelectedCycle(parseInt(value));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cycles</SelectItem>
                  <SelectItem value="1">Cycle 1 - 2024 Q1</SelectItem>
                  <SelectItem value="2">Cycle 2 - 2024 Q2</SelectItem>
                  <SelectItem value="3">Cycle 3 - 2024 Q3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Last Updated Timestamp */}
          {data && (
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleString()}
            </div>
          )}

          {/* Main KPI Cards */}
          {data && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ComplianceRateCard data={data.overall_compliance_rate} />
              <CompletionStatusCard data={data.completion_status} />
              <TopFailedIndicatorsCard data={data.top_failed_indicators || []} />
            </div>
          )}

          {/* Detailed Analytics Sections */}
          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AreaBreakdownCard data={data.area_breakdown || []} />
              <BarangayRankingsCard data={data.barangay_rankings || []} />
            </div>
          )}

          {/* Trend Chart */}
          {data && <TrendChart data={data.trends || []} />}
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
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-full sm:w-64" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>

      {/* Detailed Section Skeleton */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
