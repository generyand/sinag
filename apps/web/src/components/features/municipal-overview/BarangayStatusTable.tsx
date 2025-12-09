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

interface BarangayStatusTableProps {
  data: BarangayStatusList | null | undefined;
  /** Callback when View CapDev is clicked. Receives assessment_id. */
  onViewCapDev?: (assessmentId: number) => void;
  /** Callback when View Details is clicked. Receives assessment_id. */
  onViewDetails?: (assessmentId: number) => void;
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

export function BarangayStatusTable({
  data,
  onViewCapDev,
  onViewDetails,
}: BarangayStatusTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("barangay_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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

    let result = data.barangays
      .map((b) => b as ExtendedBarangayAssessmentStatus)
      .filter((barangay) => {
        const matchesSearch = barangay.barangay_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || barangay.status === statusFilter;
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
  }, [data?.barangays, searchTerm, statusFilter, sortField, sortDirection]);

  const getUnifiedStatusBadge = (barangay: ExtendedBarangayAssessmentStatus) => {
    // Check for Pass/Fail first (Completed)
    if (barangay.status === "COMPLETED") {
      if (barangay.compliance_status === "PASSED") {
        return (
          <Badge className="bg-green-100 text-green-800 rounded-sm hover:bg-green-200 border-0">
            Pass
          </Badge>
        );
      }
      if (barangay.compliance_status === "FAILED") {
        return (
          <Badge className="bg-red-100 text-red-800 rounded-sm hover:bg-red-200 border-0">
            Fail
          </Badge>
        );
      }
    }

    // Default to "In Progress" style for others mostly
    // or map specific statuses
    const label = "In Progress";
    // You might want to distinguish "No Assessment" or "Draft"
    if (barangay.status === "NO_ASSESSMENT" || barangay.status === "NO_USER_ASSIGNED") {
      return (
        <Badge variant="outline" className="text-gray-500 border-gray-300">
          No Data
        </Badge>
      );
    }

    return (
      <Badge className="bg-yellow-100 text-yellow-800 rounded-sm hover:bg-yellow-200 border-0">
        {label}
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
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-sm ${
                    statusFilter === "all"
                      ? "bg-[var(--cityscape-yellow)] text-[var(--foreground)] hover:bg-[var(--cityscape-yellow-dark)]"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "COMPLETED" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("COMPLETED")}
                  className={`rounded-sm ${
                    statusFilter === "COMPLETED"
                      ? "bg-[var(--cityscape-yellow)] text-[var(--foreground)] hover:bg-[var(--cityscape-yellow-dark)]"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  Completed
                </Button>
                <Button
                  variant={statusFilter === "AWAITING_MLGOO_APPROVAL" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("AWAITING_MLGOO_APPROVAL")}
                  className={`rounded-sm ${
                    statusFilter === "AWAITING_MLGOO_APPROVAL"
                      ? "bg-[var(--cityscape-yellow)] text-[var(--foreground)] hover:bg-[var(--cityscape-yellow-dark)]"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  Pending
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="border border-[var(--border)] rounded-sm overflow-hidden">
              <Table>
                <caption className="sr-only">
                  Barangay assessment status table. Click column headers to sort.
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>
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
                    <TableHead>
                      <button
                        className="flex items-center font-medium hover:text-[var(--foreground)] transition-colors"
                        onClick={() => handleSort("status")}
                        aria-label={`Sort by status, currently ${sortField === "status" ? sortDirection : "unsorted"}`}
                      >
                        Status
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Governance Areas Passed</TableHead>
                    <TableHead className="text-right">Indicators Passed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBarangays.map((barangay) => (
                    <TableRow key={barangay.barangay_id}>
                      <TableCell className="font-medium text-[var(--foreground)]">
                        <button
                          onClick={() =>
                            barangay.assessment_id && handleViewDetails(barangay.assessment_id)
                          }
                          className="flex items-center gap-3 hover:bg-accent/50 p-1 -m-1 rounded-md transition-colors w-full text-left group"
                        >
                          <BarangayAvatar name={barangay.barangay_name} />
                          <span className="group-hover:text-primary font-semibold transition-colors">
                            {barangay.barangay_name}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>{getUnifiedStatusBadge(barangay)}</TableCell>
                      <TableCell className="text-right">
                        {barangay.governance_areas_passed !== undefined &&
                        barangay.governance_areas_passed !== null
                          ? `${barangay.governance_areas_passed}/${barangay.total_governance_areas}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {barangay.total_responses
                          ? `${(barangay.pass_count || 0) + (barangay.conditional_count || 0)}/${barangay.total_responses}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredBarangays.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <AnalyticsEmptyState
                          variant="no-barangays"
                          compact
                          description={
                            searchTerm || statusFilter !== "all"
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
