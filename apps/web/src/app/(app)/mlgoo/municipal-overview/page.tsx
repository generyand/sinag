'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useGetMunicipalOverviewDashboard } from '@sinag/shared';
import {
  ComplianceSummaryCard,
  GovernanceAreaPerformanceCard,
  TopFailingIndicatorsCard,
  AggregatedCapDevCard,
  BarangayStatusTable,
} from '@/components/features/municipal-overview';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MunicipalOverviewPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  // Fetch dashboard data using generated hook
  const {
    data: dashboard,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetMunicipalOverviewDashboard();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  // Check for MLGOO role
  useEffect(() => {
    if (user && user.role !== 'MLGOO_DILG') {
      router.replace('/');
    }
  }, [user, router]);

  const handleViewCapDev = (assessmentId: number) => {
    // Navigate to the assessment's CapDev view
    router.push(`/mlgoo/assessments/${assessmentId}?tab=capdev`);
  };

  // Loading state
  if (!isAuthenticated || isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load municipal overview data.'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => refetch()} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>
            Municipal overview data is not available. Please ensure assessments have been completed.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Municipal Performance Overview</h1>
            <p className="text-gray-500">
              Comprehensive view of SGLGB compliance across all barangays
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Compliance Summary - Full Width */}
      <ComplianceSummaryCard data={dashboard.compliance_summary} />

      {/* Two Column Layout for Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GovernanceAreaPerformanceCard data={dashboard.governance_area_performance} />
        <TopFailingIndicatorsCard data={dashboard.top_failing_indicators} />
      </div>

      {/* Aggregated CapDev Insights */}
      <AggregatedCapDevCard data={dashboard.capdev_summary} />

      {/* Barangay Status Table - Full Width */}
      <BarangayStatusTable
        data={dashboard.barangay_statuses}
        onViewCapDev={handleViewCapDev}
      />

      {/* Footer with generation timestamp */}
      <p className="text-xs text-gray-400 text-right">
        Dashboard generated: {new Date(dashboard.generated_at).toLocaleString()}
        {dashboard.assessment_cycle && ` | Cycle: ${dashboard.assessment_cycle}`}
      </p>
    </div>
  );
}
