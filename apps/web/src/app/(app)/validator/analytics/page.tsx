"use client";

import { useState, useMemo } from "react";
import {
  AssessorData,
  SystemicWeakness,
} from "@/components/features/analytics/AssessorAnalyticsTypes";
import { useAssessorAnalytics } from "@/hooks/useAssessor";
import { useValidatorGovernanceArea } from "@/hooks/useValidatorGovernanceArea";
import {
  GlobalFilter,
  PerformanceOverviewWidget,
  PerformanceHotspotsWidget,
  WorkflowMetricsWidget,
  WeaknessDetailModal,
  AnalyticsSkeleton,
} from "@/components/features/analytics";
import { BarChart3 } from "lucide-react";

export default function ValidatorAnalyticsPage() {
  const [selectedWeakness, setSelectedWeakness] = useState<SystemicWeakness | null>(null);
  const [showWeaknessModal, setShowWeaknessModal] = useState(false);

  const { governanceAreaName, isLoading: governanceAreaLoading } = useValidatorGovernanceArea();
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useAssessorAnalytics();

  // Map API response to UI shape (must be called unconditionally to preserve hook order)
  const validatorData = useMemo<AssessorData | null>(() => {
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
            {analyticsError
              ? "Failed to load analytics data. Please try again later."
              : "No analytics data available."}
          </p>
        </div>
      </div>
    );
  }

  // validatorData will be non-null after loading completes and if no error occurred
  if (!validatorData) {
    return null;
  }

  return (
    <main className="space-y-6" role="main" aria-label="Validator Analytics Dashboard">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-6">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/10 to-pink-500/5 rounded-full translate-y-12 -translate-x-12"></div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] rounded-sm shadow-md">
            <BarChart3 className="h-6 w-6 text-[var(--foreground)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              {governanceAreaName || "Governance Area"}{" "}
              <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                Analytics
              </span>
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Performance insights for barangays in your assigned governance area
            </p>
          </div>
        </div>
      </div>

      {/* Assessment Period Filter */}
      <GlobalFilter data={validatorData} />

      {/* Analytics Widgets */}
      <div className="space-y-6">
        <PerformanceOverviewWidget data={validatorData} />
        <PerformanceHotspotsWidget data={validatorData} onWeaknessClick={handleWeaknessClick} />
        <WorkflowMetricsWidget data={validatorData} />
      </div>

      {/* Weakness Detail Modal */}
      <WeaknessDetailModal
        weakness={selectedWeakness}
        data={validatorData}
        isOpen={showWeaknessModal}
        onClose={handleCloseModal}
      />
    </main>
  );
}
