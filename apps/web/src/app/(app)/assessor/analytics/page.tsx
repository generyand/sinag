"use client";

import { useState, useMemo } from "react";
import { AssessorData, SystemicWeakness } from "@/components/features/analytics/AssessorAnalyticsTypes";
import { useAssessorAnalytics } from "@/hooks/useAssessor";
import { useAssessorGovernanceArea } from "@/hooks/useAssessorGovernanceArea";
import {
  GlobalFilter,
  PerformanceOverviewWidget,
  PerformanceHotspotsWidget,
  WorkflowMetricsWidget,
  WeaknessDetailModal,
  AnalyticsSkeleton,
} from "@/components/features/analytics";

export default function AssessorAnalyticsPage() {
  const [selectedWeakness, setSelectedWeakness] = useState<SystemicWeakness | null>(null);
  const [showWeaknessModal, setShowWeaknessModal] = useState(false);
  
  const { governanceAreaName, isLoading: governanceAreaLoading } = useAssessorGovernanceArea();
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useAssessorAnalytics();

  // Map API response to UI shape (must be called unconditionally to preserve hook order)
  const assessorData = useMemo<AssessorData | null>(() => {
    if (!analyticsData) return null;
    const governanceArea = analyticsData.governance_area_name || governanceAreaName || "Unknown";
    return {
      name: governanceArea,
      assignedBarangays: analyticsData.overview.total_assessed,
      assessmentPeriod: analyticsData.assessment_period || "SGLGB 2024",
      performance: {
        totalAssessed: analyticsData.overview.total_assessed,
        passed: analyticsData.overview.passed,
        failed: analyticsData.overview.failed,
        passRate: analyticsData.overview.pass_rate,
      },
      systemicWeaknesses: analyticsData.hotspots.map((hotspot) => ({
        indicator: hotspot.indicator,
        failedCount: hotspot.failed_count,
        barangays: hotspot.barangays,
      })),
      workflowMetrics: {
        avgTimeToFirstReview: analyticsData.workflow.avg_time_to_first_review,
        avgReworkCycleTime: analyticsData.workflow.avg_rework_cycle_time,
        totalReviewed: analyticsData.workflow.total_reviewed,
        reworkRate: analyticsData.workflow.rework_rate,
      },
    };
  }, [analyticsData, governanceAreaName]);

  const handleWeaknessClick = (weakness: SystemicWeakness) => {
    setSelectedWeakness(weakness);
    setShowWeaknessModal(true);
  };

  const handleCloseModal = () => {
    setShowWeaknessModal(false);
    setSelectedWeakness(null);
  };

  // Show loading if either the page is loading or analytics is loading
  if (analyticsLoading || governanceAreaLoading) {
    return <AnalyticsSkeleton />;
  }

  // Show error state
  if (analyticsError || !analyticsData) {
    return (
      <div className="space-y-8">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            Error Loading Analytics
          </h2>
          <p className="text-[var(--text-secondary)]">
            {analyticsError ? 'Failed to load analytics data. Please try again later.' : 'No analytics data available.'}
          </p>
        </div>
      </div>
    );
  }

  // assessorData will be non-null after loading completes and if no error occurred
  // TypeScript needs explicit check or assertion
  if (!assessorData) {
    return null;
  }

  return (
    <main className="space-y-8" role="main" aria-label="Assessor Analytics Dashboard">
      <GlobalFilter data={assessorData} />

      <div className="mt-6 space-y-6">
        <PerformanceOverviewWidget data={assessorData} />
        <PerformanceHotspotsWidget data={assessorData} onWeaknessClick={handleWeaknessClick} />
        <WorkflowMetricsWidget data={assessorData} />
      </div>

      <WeaknessDetailModal
        weakness={selectedWeakness}
        data={assessorData}
        isOpen={showWeaknessModal}
        onClose={handleCloseModal}
      />
    </main>
  );
}
