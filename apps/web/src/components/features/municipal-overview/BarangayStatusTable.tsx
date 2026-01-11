"use client";

import { AnalyticsEmptyState } from "@/components/features/analytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BarangayAssessmentStatus, BarangayStatusList } from "@sinag/shared";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

interface ExtendedBarangayAssessmentStatus extends BarangayAssessmentStatus {
  governance_areas_passed?: number;
  total_governance_areas?: number;
  pass_count?: number;
  conditional_count?: number;
  total_responses?: number;
}

type SortField = "barangay_name" | "status" | "governance_areas" | "indicators";
type SortDirection = "asc" | "desc";

/**
 * Maps pipeline filter values (from ComplianceSummaryCard) to actual status values.
 * Pipeline uses lowercase_underscored, status uses UPPERCASE.
 */
export const PIPELINE_TO_STATUS_MAP: Record<string, string | string[]> = {
  all: "all",
  not_started: "NO_ASSESSMENT",
  draft: "DRAFT",
  submitted: "SUBMITTED",
  in_review: "IN_REVIEW",
  awaiting_validation: "AWAITING_FINAL_VALIDATION",
  awaiting_approval: "AWAITING_MLGOO_APPROVAL",
  completed: "COMPLETED",
  rework: "REWORK",
  passed: "PASSED", // Special: filters by compliance_status
  failed: "FAILED", // Special: filters by compliance_status
  in_progress: ["DRAFT", "SUBMITTED", "IN_REVIEW", "REWORK", "AWAITING_FINAL_VALIDATION"], // Multiple statuses
};

/** Stalled threshold in days - assessments inactive for longer are considered stalled */
const STALLED_THRESHOLD_DAYS = 14;

interface BarangayStatusTableProps {
  data: BarangayStatusList | null | undefined;
  /** Callback when View CapDev is clicked. Receives assessment_id. */
  onViewCapDev?: (assessmentId: number) => void;
  /** Callback when View Details is clicked. Receives assessment_id. */
  onViewDetails?: (assessmentId: number) => void;
  /** External filter from pipeline (e.g., "not_started", "draft", etc.) */
  pipelineFilter?: string;
  /** Callback when status filter changes */
  onPipelineFilterChange?: (filter: string) => void;
}

/**
 * Status configuration for consistent badge styling.
 * - "No Assessment" uses neutral gray (not alarming - just informational)
 */
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Completed", className: "bg-green-600 text-white" },
  AWAITING_MLGOO_APPROVAL: { label: "Awaiting Approval", className: "bg-yellow-600 text-white" },
  REWORK: { label: "Rework", className: "bg-orange-600 text-white" },
  SUBMITTED: { label: "In Review", className: "bg-blue-600 text-white" },
  IN_REVIEW: { label: "In Review", className: "bg-blue-600 text-white" },
  DRAFT: {
    label: "Draft",
    className: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  },
  NO_ASSESSMENT: {
    label: "No Assessment",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  NO_USER_ASSIGNED: {
    label: "No User",
    className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
  },
};

/**
 * Get status priority for sorting (lower = higher priority).
 */
function getStatusPriority(status: string): number {
  const priorities: Record<string, number> = {
    COMPLETED: 1,
    AWAITING_MLGOO_APPROVAL: 2,
    REWORK: 3,
    IN_REVIEW: 4,
    SUBMITTED: 4,
    DRAFT: 5,
    NO_ASSESSMENT: 6,
    NO_USER_ASSIGNED: 7,
  };
  return priorities[status] ?? 8;
}

// Render sort indicator
const SortIndicator = ({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) => {
  if (sortField !== field) {
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
  }
  return sortDirection === "asc" ? (
    <ArrowUp className="h-3 w-3 ml-1" />
  ) : (
    <ArrowDown className="h-3 w-3 ml-1" />
  );
};

const COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
};

const BarangayAvatar = ({ name }: { name: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const colorClass = getAvatarColor(name);

  return (
    <div
      className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${colorClass}`}
    >
      {initials}
    </div>
  );
};

/** Approximate number of rows visible in the 400px scroll container */
const VISIBLE_ROWS_THRESHOLD = 7;

export function BarangayStatusTable({
  data,
  onViewCapDev,
  onViewDetails,
  pipelineFilter,
  onPipelineFilterChange,
}: BarangayStatusTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("barangay_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  // Use external pipeline filter if provided, otherwise use internal state
  const effectiveFilter = pipelineFilter ?? internalStatusFilter;

  // Handler for filter changes - uses external callback if provided
  const handleFilterChange = useCallback(
    (filter: string) => {
      if (onPipelineFilterChange) {
        onPipelineFilterChange(filter);
      } else {
        setInternalStatusFilter(filter);
      }
    },
    [onPipelineFilterChange]
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setIsScrolledToBottom((prev) => (prev !== atBottom ? atBottom : prev));
  }, []);

  const hasData = (data?.barangays?.length ?? 0) > 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort barangays
  const filteredBarangays = useMemo(() => {
    if (!data?.barangays) return [];

    // Map pipeline filter to actual status value(s)
    const mappedFilter = PIPELINE_TO_STATUS_MAP[effectiveFilter] ?? effectiveFilter;

    let result = data.barangays
      .map((b) => b as ExtendedBarangayAssessmentStatus)
      .filter((barangay) => {
        const matchesSearch = barangay.barangay_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

        // Handle different filter types
        let matchesStatus = false;
        if (effectiveFilter === "all" || mappedFilter === "all") {
          matchesStatus = true;
        } else if (effectiveFilter === "passed") {
          // Filter by compliance_status for passed
          matchesStatus = barangay.compliance_status === "PASSED";
        } else if (effectiveFilter === "failed") {
          // Filter by compliance_status for failed
          matchesStatus = barangay.compliance_status === "FAILED";
        } else if (effectiveFilter === "stalled") {
          // Stalled: assessments submitted > 14 days ago that aren't completed
          if (barangay.submitted_at && barangay.status !== "COMPLETED") {
            const submittedDate = new Date(barangay.submitted_at);
            const daysSinceSubmission = Math.floor(
              (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            matchesStatus = daysSinceSubmission > STALLED_THRESHOLD_DAYS;
          } else {
            matchesStatus = false;
          }
        } else if (Array.isArray(mappedFilter)) {
          // Multiple status values (e.g., in_progress)
          matchesStatus = mappedFilter.includes(barangay.status);
        } else {
          // Single status value
          matchesStatus = barangay.status === mappedFilter;
        }

        return matchesSearch && matchesStatus;
      });

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "barangay_name":
          comparison = a.barangay_name.localeCompare(b.barangay_name);
          break;
        case "status":
          // Simplified priority: Pass/Fail (1), In Progress (2), Others (3)
          // For now reusing getStatusPriority but it might need tweaking for merged status
          comparison = getStatusPriority(a.status) - getStatusPriority(b.status);
          break;
        case "governance_areas":
          comparison = (a.governance_areas_passed || 0) - (b.governance_areas_passed || 0);
          break;
        case "indicators":
          const aInd = (a.pass_count || 0) + (a.conditional_count || 0);
          const bInd = (b.pass_count || 0) + (b.conditional_count || 0);
          comparison = aInd - bInd;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [data?.barangays, searchTerm, effectiveFilter, sortField, sortDirection]);

  const getUnifiedStatusBadge = (barangay: ExtendedBarangayAssessmentStatus) => {
    // Backend now only sets compliance_status when status === COMPLETED
    // So we can trust compliance_status directly for Pass/Fail
    if (barangay.compliance_status === "PASSED") {
      return (
        <Badge className="bg-green-100 text-green-800 rounded-sm hover:bg-green-200 border-0">
          Pass
        </Badge>
      );
    }
    if (barangay.compliance_status === "FAILED") {
      return (
        <Badge className="bg-red-100 text-red-800 rounded-sm hover:bg-red-200 border-0">Fail</Badge>
      );
    }

    // All other cases are "In Progress" or "No Data"
    if (barangay.status === "NO_ASSESSMENT" || barangay.status === "NO_USER_ASSIGNED") {
      return (
        <Badge variant="outline" className="text-gray-500 border-gray-300">
          No Data
        </Badge>
      );
    }

    // Default: In Progress (includes DRAFT, SUBMITTED, IN_REVIEW, REWORK, etc.)
    return (
      <Badge className="bg-yellow-100 text-yellow-800 rounded-sm hover:bg-yellow-200 border-0">
        In Progress
      </Badge>
    );
  };

  // Handle view details - navigate to submission detail
  const handleViewDetails = useCallback(
    (assessmentId: number) => {
      if (onViewDetails) {
        onViewDetails(assessmentId);
      } else {
        router.push(`/mlgoo/submissions/${assessmentId}`);
      }
    },
    [onViewDetails, router]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Assessment Data</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Detailed assessment results for all barangays
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <AnalyticsEmptyState variant="no-barangays" />
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]"
                  aria-hidden="true"
                />
                <Input
                  placeholder="Search barangays..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 rounded-sm"
                  aria-label="Search barangays"
                />
              </div>
              <div className="flex gap-2" role="group" aria-label="Status filter">
                <Button
                  variant={effectiveFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange("all")}
                  className={`rounded-sm ${
                    effectiveFilter === "all"
                      ? "bg-[var(--cityscape-yellow)] text-[var(--foreground)] hover:bg-[var(--cityscape-yellow-dark)]"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  All
                </Button>
                <Button
                  variant={effectiveFilter === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange("completed")}
                  className={`rounded-sm ${
                    effectiveFilter === "completed"
                      ? "bg-[var(--cityscape-yellow)] text-[var(--foreground)] hover:bg-[var(--cityscape-yellow-dark)]"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  Completed
                </Button>
                <Button
                  variant={effectiveFilter === "awaiting_approval" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange("awaiting_approval")}
                  className={`rounded-sm ${
                    effectiveFilter === "awaiting_approval"
                      ? "bg-[var(--cityscape-yellow)] text-[var(--foreground)] hover:bg-[var(--cityscape-yellow-dark)]"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  Pending
                </Button>
              </div>
            </div>

            {/* Results count */}
            <div className="text-sm text-[var(--muted-foreground)] mb-2">
              Showing <span className="font-medium">{filteredBarangays.length}</span> of{" "}
              <span className="font-medium">{data?.barangays?.length ?? 0}</span> barangays
            </div>

            {/* Scrollable Table Container */}
            <div className="relative">
              <div
                className="h-[300px] sm:h-[400px] overflow-auto border border-[var(--border)] rounded-sm"
                role="group"
                aria-label="Assessment data table showing status and progress for each barangay"
                // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                tabIndex={0}
                onScroll={handleScroll}
              >
                <Table>
                  <caption className="sr-only">
                    Barangay assessment status table. Click column headers to sort. Use arrow keys
                    to scroll within the table.
                  </caption>
                  <TableHeader className="sticky top-0 z-10 bg-[var(--card)] shadow-[0_1px_0_0_var(--border)]">
                    <TableRow>
                      <TableHead className="bg-[var(--card)]">
                        <button
                          className="flex items-center font-medium hover:text-[var(--foreground)] transition-colors"
                          onClick={() => handleSort("barangay_name")}
                          aria-label={`Sort by barangay name, currently ${sortField === "barangay_name" ? sortDirection : "unsorted"}`}
                        >
                          Barangay
                          <SortIndicator
                            field="barangay_name"
                            sortField={sortField}
                            sortDirection={sortDirection}
                          />
                        </button>
                      </TableHead>
                      <TableHead className="bg-[var(--card)]">
                        <button
                          className="flex items-center font-medium hover:text-[var(--foreground)] transition-colors"
                          onClick={() => handleSort("status")}
                          aria-label={`Sort by status, currently ${sortField === "status" ? sortDirection : "unsorted"}`}
                        >
                          Status
                          <SortIndicator
                            field="status"
                            sortField={sortField}
                            sortDirection={sortDirection}
                          />
                        </button>
                      </TableHead>
                      <TableHead className="text-right bg-[var(--card)]">
                        Governance Areas Passed
                      </TableHead>
                      <TableHead className="text-right bg-[var(--card)]">
                        Indicators Passed
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBarangays.map((barangay) => (
                      <TableRow key={barangay.barangay_id} className="h-14">
                        <TableCell className="font-medium text-[var(--foreground)]">
                          <button
                            onClick={() =>
                              barangay.assessment_id && handleViewDetails(barangay.assessment_id)
                            }
                            disabled={!barangay.assessment_id}
                            aria-disabled={!barangay.assessment_id}
                            className={`flex items-center gap-3 p-1 -m-1 rounded-md transition-colors w-full text-left group ${
                              barangay.assessment_id
                                ? "hover:bg-accent/50 cursor-pointer"
                                : "cursor-default opacity-75"
                            }`}
                          >
                            <BarangayAvatar name={barangay.barangay_name} />
                            <span
                              className={`font-semibold transition-colors ${
                                barangay.assessment_id ? "group-hover:text-primary" : ""
                              }`}
                            >
                              {barangay.barangay_name}
                            </span>
                          </button>
                        </TableCell>
                        <TableCell>{getUnifiedStatusBadge(barangay)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {barangay.governance_areas_passed !== undefined &&
                          barangay.governance_areas_passed !== null
                            ? `${barangay.governance_areas_passed}/${barangay.total_governance_areas}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {barangay.total_responses
                            ? `${(barangay.pass_count || 0) + (barangay.conditional_count || 0)}/${barangay.total_responses}`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredBarangays.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <AnalyticsEmptyState
                            variant="no-barangays"
                            compact
                            description={
                              searchTerm || effectiveFilter !== "all"
                                ? "No barangays match your search or filter criteria."
                                : undefined
                            }
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Scroll indicator gradient - shows when more content below */}
              {!isScrolledToBottom && filteredBarangays.length > VISIBLE_ROWS_THRESHOLD && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--card)] to-transparent pointer-events-none rounded-b-sm"
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Live region for screen readers */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {searchTerm || effectiveFilter !== "all"
                ? `Filtered to ${filteredBarangays.length} of ${data?.barangays?.length ?? 0} barangays`
                : `${filteredBarangays.length} barangays displayed`}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
