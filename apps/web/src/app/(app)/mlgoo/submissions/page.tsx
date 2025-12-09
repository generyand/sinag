"use client";

import { YearSelector } from "@/components/features/assessment-year/YearSelector";
import {
  ActiveFilterPills,
  STATUS_FILTER_OPTIONS,
  SubmissionsEmptyState,
  SubmissionsMobileList,
  SubmissionsSkeleton,
  getProgressBarColor,
  getStatusConfig,
  useSubmissionsData,
  useSubmissionsFilters,
  type SortableColumn,
  type SubmissionUIModel,
} from "@/components/features/submissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffectiveYear } from "@/store/useAssessmentYearStore";
import { useAuthStore } from "@/store/useAuthStore";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  Filter,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AdminSubmissionsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const effectiveYear = useEffectiveYear();

  // Use custom hooks for filter and data management
  const {
    filters,
    sortConfig,
    setSearchQuery,
    setStatusFilter,
    clearAllFilters,
    handleSort,
    hasActiveFilters,
  } = useSubmissionsFilters();

  const { filteredSubmissions, isLoading, error, totalCount, completedCount } = useSubmissionsData({
    statusFilter: filters.statusFilter,
    searchQuery: filters.searchQuery,
    sortConfig,
    year: effectiveYear ?? undefined,
  });

  // Show loading if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    const errorResponse = (error as { response?: { status?: number } })?.response;
    const isForbidden = errorResponse?.status === 403;
    const isUnauthorized = errorResponse?.status === 401;

    const errorTitle = isForbidden
      ? "Access Denied"
      : isUnauthorized
        ? "Authentication Required"
        : "Failed to Load Assessments";

    const errorMessage = isForbidden
      ? "You need MLGOO/DILG admin privileges to access this page. Please log in with an admin account (e.g., admin@sinag.com)."
      : isUnauthorized
        ? "Please log in to access this page."
        : error?.message || "An unexpected error occurred";

    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-8">
          <div className="text-center">
            {isForbidden ? (
              <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            ) : (
              <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            )}
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">{errorTitle}</h2>
            <p className="text-[var(--muted-foreground)] mb-4">{errorMessage}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-white"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleViewDetails = (submission: SubmissionUIModel) => {
    router.push(`/mlgoo/submissions/${submission.id}`);
  };

  const handleSendReminder = (submission: SubmissionUIModel) => {
    toast.success(`Reminder sent to ${submission.barangayName}`);
  };

  // Get sort icon for a column
  const getSortIcon = (column: SortableColumn) => {
    if (sortConfig?.key !== column) {
      return <ChevronDown className="h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // Get aria-sort value for a column
  const getAriaSort = (column: SortableColumn): "none" | "ascending" | "descending" => {
    if (sortConfig?.key !== column) return "none";
    return sortConfig.direction === "asc" ? "ascending" : "descending";
  };

  // Show skeleton while loading
  if (isLoading) {
    return <SubmissionsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-6 sm:p-8">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/20 to-indigo-100/10 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/15 to-pink-100/10 rounded-full translate-y-16 -translate-x-16"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                    Assessment{" "}
                    <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                      Submissions
                    </span>
                  </h1>
                </div>

                {/* Year Selector + Quick Stats */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
                  <div className="w-full sm:w-auto">
                    <YearSelector showLabel showIcon />
                  </div>
                  <div className="flex gap-4 sm:contents">
                    <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)] flex-1 sm:flex-none sm:min-w-[100px]">
                      <div className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                        {totalCount}
                      </div>
                      <div className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                        Submissions
                      </div>
                    </div>
                    <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)] flex-1 sm:flex-none sm:min-w-[100px]">
                      <div className="text-2xl sm:text-3xl font-bold text-green-600">
                        {completedCount}
                      </div>
                      <div className="text-[10px] sm:text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                        Completed
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Filter className="h-5 w-5 text-[var(--cityscape-yellow)]" />
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Filters & Search</h2>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Search Section */}
              <div className="flex-1 max-w-md">
                <div className="space-y-2">
                  <label
                    htmlFor="barangay-search"
                    className="block text-sm font-medium text-[var(--foreground)]"
                  >
                    Search
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-[var(--muted-foreground)]" />
                    </div>
                    <Input
                      id="barangay-search"
                      type="text"
                      placeholder="Search by Barangay Name"
                      value={filters.searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search by Barangay Name"
                      className="pl-10 h-10 bg-[var(--background)] border-[var(--border)] rounded-sm focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="status-filter"
                      className="block text-sm font-medium text-[var(--foreground)]"
                    >
                      Filter by Status
                    </label>
                    <Select value={filters.statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger
                        id="status-filter"
                        className="h-10 bg-[var(--background)] border-[var(--border)] rounded-sm focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 transition-all duration-200"
                      >
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border border-[var(--border)] shadow-xl rounded-sm z-50">
                        {STATUS_FILTER_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
            {/* Active Filter Pills */}
            <ActiveFilterPills
              searchQuery={filters.searchQuery}
              statusFilter={filters.statusFilter}
              totalCount={totalCount}
              filteredCount={filteredSubmissions.length}
              onClearSearch={() => setSearchQuery("")}
              onClearStatus={() => setStatusFilter("all")}
              onClearAll={clearAllFilters}
              hasActiveFilters={hasActiveFilters}
            />

            {filteredSubmissions.length === 0 ? (
              <SubmissionsEmptyState
                searchQuery={filters.searchQuery}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearAllFilters}
              />
            ) : (
              <>
                {/* Mobile Card View */}
                <SubmissionsMobileList
                  submissions={filteredSubmissions}
                  onView={handleViewDetails}
                  onRemind={handleSendReminder}
                />

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full" role="table">
                    <caption className="sr-only">
                      Assessment submissions with filterable columns for barangay name, progress,
                      status, validators, and last updated date
                    </caption>
                    <thead className="bg-[var(--muted)]/20 border-b border-[var(--border)]">
                      <tr role="row">
                        <th
                          role="columnheader"
                          aria-sort={getAriaSort("barangayName")}
                          className="px-6 py-4 text-left cursor-pointer hover:bg-[var(--muted)]/30 transition-colors"
                          onClick={() => handleSort("barangayName")}
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                            Barangay Name
                            {getSortIcon("barangayName")}
                          </div>
                        </th>
                        <th
                          role="columnheader"
                          aria-sort={getAriaSort("overallProgress")}
                          className="px-6 py-4 text-left cursor-pointer hover:bg-[var(--muted)]/30 transition-colors"
                          onClick={() => handleSort("overallProgress")}
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                            Overall Progress
                            {getSortIcon("overallProgress")}
                          </div>
                        </th>
                        <th
                          role="columnheader"
                          aria-sort={getAriaSort("currentStatus")}
                          className="px-6 py-4 text-left cursor-pointer hover:bg-[var(--muted)]/30 transition-colors"
                          onClick={() => handleSort("currentStatus")}
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                            Current Status
                            {getSortIcon("currentStatus")}
                          </div>
                        </th>
                        <th role="columnheader" className="px-6 py-4 text-left">
                          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                            Validators
                          </div>
                        </th>
                        <th
                          role="columnheader"
                          aria-sort={getAriaSort("lastUpdated")}
                          className="px-6 py-4 text-left cursor-pointer hover:bg-[var(--muted)]/30 transition-colors"
                          onClick={() => handleSort("lastUpdated")}
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                            Last Updated
                            {getSortIcon("lastUpdated")}
                          </div>
                        </th>
                        <th role="columnheader" className="px-6 py-4 text-left">
                          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                            Actions
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredSubmissions.map((submission) => {
                        const statusConfig = getStatusConfig(submission.currentStatus);
                        const StatusIcon = statusConfig.icon;
                        const progressColor = getProgressBarColor(submission.overallProgress);

                        return (
                          <tr
                            key={submission.id}
                            className="hover:bg-[var(--cityscape-yellow)]/5 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-[var(--foreground)]">
                                {submission.barangayName}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex-1 bg-[var(--border)] rounded-sm h-4 min-w-[100px]"
                                  role="progressbar"
                                  aria-valuenow={submission.overallProgress}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-label={`Progress: ${submission.overallProgress}%`}
                                >
                                  <div
                                    className="h-4 rounded-sm transition-all duration-300"
                                    style={{
                                      backgroundColor: progressColor,
                                      width: `${submission.overallProgress}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-[var(--foreground)] min-w-[40px]">
                                  {submission.overallProgress}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div
                                id={`status-${submission.id}`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium"
                                style={{
                                  backgroundColor: statusConfig.bgColor,
                                  color: statusConfig.textColor,
                                }}
                              >
                                <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                {submission.currentStatus}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {submission.assignedValidators.length > 0 ? (
                                  submission.assignedValidators.map((validator) => (
                                    <div
                                      key={validator.id}
                                      role="img"
                                      aria-label={`Validator: ${validator.name}`}
                                      title={validator.name}
                                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm"
                                    >
                                      {validator.avatar}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-sm text-[var(--muted-foreground)] italic">
                                    No validators yet
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-[var(--muted-foreground)]">
                                {submission.lastUpdated}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleViewDetails(submission)}
                                  aria-label={`View details for ${submission.barangayName}`}
                                  aria-describedby={`status-${submission.id}`}
                                  className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-white rounded-sm font-medium transition-all duration-200"
                                >
                                  <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendReminder(submission)}
                                  aria-label={`Send reminder to ${submission.barangayName}`}
                                  title="Send a reminder email to the barangay to complete their submission"
                                  className="bg-[var(--background)] hover:bg-[var(--cityscape-yellow)]/10 hover:border-[var(--cityscape-yellow)] border-[var(--border)] text-[var(--foreground)] rounded-sm font-medium transition-all duration-200"
                                >
                                  <Send className="h-4 w-4 mr-1" aria-hidden="true" />
                                  Remind
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Live region for accessibility announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading
          ? "Loading submissions..."
          : `Showing ${filteredSubmissions.length} of ${totalCount} submissions`}
      </div>
    </div>
  );
}
