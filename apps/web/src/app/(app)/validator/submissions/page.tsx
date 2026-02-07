"use client";

import { KPICards, SubmissionsFilters, SubmissionsTable } from "@/components/features/submissions";
import { useAssessorQueue } from "@/hooks/useAssessor";
import { useAssessorGovernanceArea } from "@/hooks/useAssessorGovernanceArea";
import {
  BarangaySubmission,
  SubmissionsData,
  SubmissionsFilter,
  SubmissionsKPI,
  UnifiedStatus,
} from "@/types/submissions";
import { AssessorQueueItem, useGetAssessorStats } from "@sinag/shared";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

/**
 * Maps API data to unified status for validator dashboard.
 *
 * Logic (similar to assessor but adapted for validator context):
 * 1. If global_status = "VALIDATED" or "COMPLETED" → "reviewed"
 * 2. If submission_type = "rework_pending" → "sent_for_rework"
 * 3. If submission_type = "rework_resubmission":
 *    - re_review_progress = 0 → "awaiting_re_review"
 *    - re_review_progress > 0 → "re_assessment_in_progress"
 * 4. Otherwise:
 *    - area_progress = 0 → "awaiting_assessment"
 *    - area_progress > 0 → "assessment_in_progress"
 */
function mapToUnifiedStatus(item: AssessorQueueItem): UnifiedStatus {
  const globalStatus = item.global_status?.toUpperCase();

  // Check if already reviewed/validated (validator completed)
  if (globalStatus === "VALIDATED" || globalStatus === "COMPLETED") {
    return "reviewed";
  }

  // Check submission type for rework states
  if (item.submission_type === "rework_pending") {
    return "sent_for_rework";
  }

  if (item.submission_type === "rework_resubmission") {
    // Re-submission from BLGU - check re-review progress
    const reReviewProgress = item.re_review_progress ?? 0;
    if (reReviewProgress === 0) {
      return "awaiting_re_review";
    }
    return "re_assessment_in_progress";
  }

  // First submission - check area progress
  const areaProgress = item.area_progress ?? 0;
  if (areaProgress === 0) {
    return "awaiting_assessment";
  }
  return "assessment_in_progress";
}

export default function ValidatorSubmissionsPage() {
  const router = useRouter();
  const { governanceAreaName, isLoading: governanceAreaLoading } = useAssessorGovernanceArea();
  const { data: queueData, isLoading: queueLoading, error: queueError } = useAssessorQueue();
  const { data: statsData } = useGetAssessorStats();

  const [filters, setFilters] = useState<SubmissionsFilter>({
    search: "",
    status: [],
  });

  // Transform API data to UI shape
  const submissionsData: SubmissionsData | null = useMemo(() => {
    if (!queueData || queueLoading) return null;

    // Map queue items to BarangaySubmission
    // UPDATED: Now uses unified status (combining areaStatus and overallStatus)
    const submissions: BarangaySubmission[] = queueData.map((item) => ({
      id: item.assessment_id.toString(),
      barangayName: item.barangay_name || "Unknown",
      areaProgress: item.area_progress ?? 0, // Progress from API
      unifiedStatus: mapToUnifiedStatus(item),
      reReviewProgress: item.re_review_progress,
      lastUpdated: item.updated_at,
      submissionType: item.submission_type as BarangaySubmission["submissionType"],
      globalStatus: item.global_status,
    }));

    // Calculate KPIs from queue data and stats
    // Updated to use unified status values
    const kpi: SubmissionsKPI = {
      awaitingReview: submissions.filter(
        (s) => s.unifiedStatus === "awaiting_assessment" || s.unifiedStatus === "awaiting_re_review"
      ).length,
      // inRework tracks items sent for rework or being re-assessed (excludes awaiting_re_review to avoid double-counting)
      inRework: submissions.filter(
        (s) =>
          s.unifiedStatus === "sent_for_rework" || s.unifiedStatus === "re_assessment_in_progress"
      ).length,
      validated:
        (statsData as { validated_count?: number })?.validated_count ??
        submissions.filter((s) => s.unifiedStatus === "reviewed").length,
      avgReviewTime: 0, // Not provided by API, default to 0
    };

    return {
      kpi,
      submissions,
      governanceArea: governanceAreaName || "Unknown",
    };
  }, [queueData, queueLoading, governanceAreaName, statsData]);

  // Filter submissions based on search and status
  const filteredSubmissions = useMemo(() => {
    if (!submissionsData) return [];

    let filtered = submissionsData.submissions;

    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter((submission) =>
        submission.barangayName.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply status filter using unified status
    if (filters.status.length > 0) {
      filtered = filtered.filter((submission) => filters.status.includes(submission.unifiedStatus));
    }

    return filtered;
  }, [submissionsData, filters]);

  const handleSubmissionClick = (submission: BarangaySubmission) => {
    // Navigate to the validator assessment validation page
    router.push(`/validator/submissions/${submission.id}/validation`);
  };

  const handleFiltersChange = (newFilters: SubmissionsFilter) => {
    setFilters(newFilters);
  };

  // Show loading if governance area or queue is loading
  if (governanceAreaLoading || queueLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-[var(--muted)] rounded-sm w-1/3 mb-2"></div>
          <div className="h-6 bg-[var(--muted)] rounded-sm w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-[var(--muted)] rounded-sm animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (queueError || !submissionsData) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            Error Loading Submissions
          </h2>
          <p className="text-[var(--text-secondary)]">
            {queueError
              ? "Failed to load submissions queue. Please try again later."
              : "No submissions data available."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="space-y-6" role="main" aria-label="Validator Submissions Dashboard">
      {/* KPI Row with enhanced styling */}
      <section
        className="bg-gradient-to-r from-[var(--card)] to-[var(--card)] border border-[var(--border)] rounded-sm p-6 shadow-sm"
        aria-labelledby="validation-overview-title"
      >
        <header className="mb-4">
          <h2
            id="validation-overview-title"
            className="text-lg font-semibold text-[var(--foreground)] mb-1"
          >
            Validation Overview
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Your current validation workload and progress summary
          </p>
        </header>
        <KPICards kpi={submissionsData.kpi} />
      </section>

      {/* Enhanced Filtering & Search Bar */}
      <section
        className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6 shadow-sm"
        aria-labelledby="filter-search-title"
      >
        <header className="mb-4">
          <h2
            id="filter-search-title"
            className="text-lg font-semibold text-[var(--foreground)] mb-1"
          >
            Filter & Search
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">Find specific submissions quickly</p>
        </header>
        <SubmissionsFilters filters={filters} onFiltersChange={handleFiltersChange} />
      </section>

      {/* Enhanced Main Submissions Data Table */}
      <section
        className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm overflow-hidden"
        aria-labelledby="submissions-table-title"
      >
        <header className="px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--card)] to-[var(--muted)]">
          <div className="flex items-center justify-between">
            <div>
              <h2
                id="submissions-table-title"
                className="text-lg font-semibold text-[var(--foreground)]"
              >
                Barangay Submissions
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}{" "}
                found
              </p>
            </div>
            <div className="flex items-center space-x-2" role="status" aria-live="polite">
              <div
                className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                aria-hidden="true"
              ></div>
              <span className="text-xs text-[var(--text-muted)]">Live updates</span>
            </div>
          </div>
        </header>

        {filteredSubmissions.length > 0 ? (
          <SubmissionsTable
            submissions={filteredSubmissions}
            onSubmissionClick={handleSubmissionClick}
          />
        ) : (
          <div className="text-center py-16 px-6" role="status" aria-label="No submissions found">
            <div
              className="mx-auto h-16 w-16 text-[var(--text-muted)] mb-6 bg-[var(--muted)] rounded-sm flex items-center justify-center"
              aria-hidden="true"
            >
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">
              No submissions found
            </h3>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
              {filters.search || filters.status.length > 0
                ? "Try adjusting your search or filter criteria to find what you're looking for."
                : "When barangays submit their assessments for your governance area, they will appear here for validation."}
            </p>
            {(filters.search || filters.status.length > 0) && (
              <button
                onClick={() => handleFiltersChange({ search: "", status: [] })}
                className="mt-4 px-4 py-2 text-sm bg-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] rounded-sm hover:bg-[var(--cityscape-yellow-dark)] transition-colors duration-200"
                aria-label="Clear all search filters"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* Live region for accessibility announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Showing {filteredSubmissions.length} of {submissionsData.submissions.length} submissions
      </div>
    </main>
  );
}
