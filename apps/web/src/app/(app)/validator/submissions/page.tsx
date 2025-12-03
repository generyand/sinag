'use client';

import { KPICards, SubmissionsFilters, SubmissionsTable } from '@/components/features/submissions';
import { useAssessorQueue } from '@/hooks/useAssessor';
import { useAssessorGovernanceArea } from '@/hooks/useAssessorGovernanceArea';
import { BarangaySubmission, SubmissionsData, SubmissionsFilter, SubmissionsKPI } from '@/types/submissions';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useGetAssessorStats } from '@sinag/shared';

// Map API status to UI areaStatus for VALIDATORS
function mapStatusToAreaStatus(status: string): BarangaySubmission['areaStatus'] {
  const normalizedStatus = status.toLowerCase();

  // For validators, AWAITING_FINAL_VALIDATION means awaiting their review
  if (normalizedStatus === 'awaiting_final_validation') {
    return 'awaiting_review';
  }

  if (normalizedStatus.includes('rework')) {
    return 'needs_rework';
  }

  // VALIDATED or COMPLETED means validator finished
  if (normalizedStatus === 'validated' || normalizedStatus === 'completed') {
    return 'validated';
  }

  return 'in_progress';
}

// Map API status to UI overallStatus
function mapStatusToOverallStatus(status: string): BarangaySubmission['overallStatus'] {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes('submitted') || normalizedStatus.includes('review')) {
    return 'submitted';
  }
  if (normalizedStatus.includes('rework')) {
    return 'needs_rework';
  }
  if (normalizedStatus.includes('validated')) {
    return 'validated';
  }
  if (normalizedStatus.includes('draft')) {
    return 'draft';
  }
  return 'under_review';
}

export default function ValidatorSubmissionsPage() {
  const router = useRouter();
  const { governanceAreaName, isLoading: governanceAreaLoading } = useAssessorGovernanceArea();
  const { data: queueData, isLoading: queueLoading, error: queueError } = useAssessorQueue();
  const { data: statsData } = useGetAssessorStats();

  const [filters, setFilters] = useState<SubmissionsFilter>({
    search: '',
    status: []
  });

  // Transform API data to UI shape
  const submissionsData: SubmissionsData | null = useMemo(() => {
    if (!queueData || queueLoading) return null;

    // Map queue items to BarangaySubmission
    const submissions: BarangaySubmission[] = queueData.map((item) => ({
      id: item.assessment_id.toString(),
      barangayName: item.barangay_name || 'Unknown',
      areaProgress: 0, // Not provided by API, default to 0
      areaStatus: mapStatusToAreaStatus(item.status),
      overallStatus: mapStatusToOverallStatus(item.status),
      lastUpdated: item.updated_at,
    }));

    // Calculate KPIs from queue data and stats
    const kpi: SubmissionsKPI = {
      awaitingReview: submissions.filter(s => s.areaStatus === 'awaiting_review').length,
      inRework: submissions.filter(s => s.areaStatus === 'needs_rework').length,
      validated: (statsData as { validated_count?: number })?.validated_count ?? 0, // Use stats endpoint for accurate count
      avgReviewTime: 0, // Not provided by API, default to 0
    };

    return {
      kpi,
      submissions,
      governanceArea: governanceAreaName || 'Unknown',
    };
  }, [queueData, queueLoading, governanceAreaName, statsData]);

  // Filter submissions based on search and status
  const filteredSubmissions = useMemo(() => {
    if (!submissionsData) return [];

    let filtered = submissionsData.submissions;

    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(submission =>
        submission.barangayName.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(submission =>
        filters.status.includes(submission.areaStatus)
      );
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
            {queueError ? 'Failed to load submissions queue. Please try again later.' : 'No submissions data available.'}
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
          <h2 id="validation-overview-title" className="text-lg font-semibold text-[var(--foreground)] mb-1">
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
          <h2 id="filter-search-title" className="text-lg font-semibold text-[var(--foreground)] mb-1">
            Filter & Search
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Find specific submissions quickly
          </p>
        </header>
        <SubmissionsFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </section>

      {/* Enhanced Main Submissions Data Table */}
      <section
        className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm overflow-hidden"
        aria-labelledby="submissions-table-title"
      >
        <header className="px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--card)] to-[var(--muted)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="submissions-table-title" className="text-lg font-semibold text-[var(--foreground)]">
                Barangay Submissions
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="flex items-center space-x-2" role="status" aria-live="polite">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true"></div>
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
            <div className="mx-auto h-16 w-16 text-[var(--text-muted)] mb-6 bg-[var(--muted)] rounded-sm flex items-center justify-center" aria-hidden="true">
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
                ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                : 'When barangays submit their assessments for your governance area, they will appear here for validation.'}
            </p>
            {(filters.search || filters.status.length > 0) && (
              <button
                onClick={() => handleFiltersChange({ search: '', status: [] })}
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
