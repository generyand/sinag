"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Building,
  CheckCircle,
  XCircle,
  Lightbulb,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from "lucide-react";
import { CapDevStatusBadge } from "../capdev";
import { AnalyticsEmptyState } from "@/components/features/analytics";
import type { BarangayStatusList, BarangayAssessmentStatus } from "@sinag/shared";

type SortField = "barangay_name" | "status" | "compliance_status" | "overall_score";
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

  // Filter and sort barangays
  const filteredBarangays = useMemo(() => {
    if (!data?.barangays) return [];

    let result = data.barangays.filter((barangay: BarangayAssessmentStatus) => {
      const matchesSearch = barangay.barangay_name.toLowerCase().includes(searchTerm.toLowerCase());
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
          comparison = getStatusPriority(a.status) - getStatusPriority(b.status);
          break;
        case "compliance_status":
          const aCompliance = a.compliance_status ?? "";
          const bCompliance = b.compliance_status ?? "";
          comparison = aCompliance.localeCompare(bCompliance);
          break;
        case "overall_score":
          const aScore = a.overall_score ?? -1;
          const bScore = b.overall_score ?? -1;
          comparison = aScore - bScore;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [data?.barangays, searchTerm, statusFilter, sortField, sortDirection]);

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || {
      label: status,
      className: "border border-[var(--border)]",
    };
    return <Badge className={`rounded-sm ${config.className}`}>{config.label}</Badge>;
  };

  const getComplianceBadge = (status: string | null) => {
    if (!status) return null;
    if (status === "PASSED") {
      return (
        <Badge className="bg-green-100 text-green-800 rounded-sm">
          <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
          Passed
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-800 rounded-sm">
        <XCircle className="h-3 w-3 mr-1" aria-hidden="true" />
        Failed
      </Badge>
    );
  };

  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "";
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
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
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" aria-hidden="true" />
          Barangay Assessment Status
        </CardTitle>
        {hasData && (
          <p className="text-sm text-[var(--muted-foreground)]">
            {data.total_count} barangays total
            {filteredBarangays.length !== data.total_count && (
              <span className="ml-1">({filteredBarangays.length} shown)</span>
            )}
          </p>
        )}
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
                        <SortIndicator
                          field="status"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center font-medium hover:text-[var(--foreground)] transition-colors"
                        onClick={() => handleSort("compliance_status")}
                        aria-label={`Sort by compliance, currently ${sortField === "compliance_status" ? sortDirection : "unsorted"}`}
                      >
                        Compliance
                        <SortIndicator
                          field="compliance_status"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center font-medium hover:text-[var(--foreground)] transition-colors"
                        onClick={() => handleSort("overall_score")}
                        aria-label={`Sort by score, currently ${sortField === "overall_score" ? sortDirection : "unsorted"}`}
                      >
                        Score
                        <SortIndicator
                          field="overall_score"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </button>
                    </TableHead>
                    <TableHead>CapDev</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBarangays.map((barangay: BarangayAssessmentStatus) => (
                    <TableRow key={barangay.barangay_id}>
                      <TableCell className="font-medium text-[var(--foreground)]">
                        {barangay.barangay_name}
                      </TableCell>
                      <TableCell>{getStatusBadge(barangay.status)}</TableCell>
                      <TableCell>
                        {barangay.compliance_status ? (
                          getComplianceBadge(barangay.compliance_status)
                        ) : (
                          <span className="text-[var(--muted-foreground)] text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {barangay.overall_score !== null && barangay.overall_score !== undefined ? (
                          <span className={`font-medium ${getScoreColor(barangay.overall_score)}`}>
                            {barangay.overall_score.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-[var(--muted-foreground)] text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {barangay.has_capdev_insights ? (
                          <CapDevStatusBadge status={barangay.capdev_status || "completed"} />
                        ) : (
                          <span className="text-[var(--muted-foreground)] text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {barangay.assessment_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(barangay.assessment_id!)}
                              className="rounded-sm"
                              aria-label={`View details for ${barangay.barangay_name}`}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" aria-hidden="true" />
                              View
                            </Button>
                          )}
                          {barangay.assessment_id &&
                            barangay.has_capdev_insights &&
                            onViewCapDev && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onViewCapDev(barangay.assessment_id!)}
                                className="rounded-sm"
                                aria-label={`View CapDev insights for ${barangay.barangay_name}`}
                              >
                                <Lightbulb className="h-4 w-4 mr-1" aria-hidden="true" />
                                CapDev
                              </Button>
                            )}
                        </div>
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
