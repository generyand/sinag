/**
 * 📋 Deadline Override Audit Log Component
 *
 * Comprehensive audit log for tracking deadline extensions.
 * Features:
 * - Detailed table with all override information
 * - Filter controls (barangay, cycle, indicator)
 * - CSV export functionality
 * - Pagination with page size selector
 * - Responsive design
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useDeadlineAuditLog, exportDeadlineOverridesCSV } from "@/hooks/useDeadlineAuditLog";
import { useCycles } from "@/hooks/useCycles";
import { useBarangays } from "@/hooks/useBarangays";
import { useIndicators } from "@/hooks/useIndicators";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Filter,
  Calendar,
  User,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

export function DeadlineAuditLog() {
  const router = useRouter();

  // Get active cycle and data
  const { activeCycle } = useCycles();
  const { data: barangays } = useBarangays();
  const { data: indicators } = useIndicators();

  // Filter state
  const [barangayFilter, setBarangayFilter] = React.useState<number | null>(null);
  const [indicatorFilter, setIndicatorFilter] = React.useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Fetch audit log data
  const { overrides, isLoading } = useDeadlineAuditLog({
    cycleId: activeCycle?.id,
    barangayId: barangayFilter || undefined,
    indicatorId: indicatorFilter || undefined,
  });

  // Paginate overrides
  const paginatedOverrides = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return overrides.slice(startIndex, endIndex);
  }, [overrides, currentPage, pageSize]);

  const totalPages = Math.ceil(overrides.length / pageSize);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Handle page size change
  const handlePageSizeChange = (size: string) => {
    setPageSize(parseInt(size));
    setCurrentPage(1); // Reset to first page
  };

  // Handle CSV export
  const handleExport = () => {
    exportDeadlineOverridesCSV({
      cycleId: activeCycle?.id,
      barangayId: barangayFilter || undefined,
      indicatorId: indicatorFilter || undefined,
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate extension duration
  const calculateExtensionDays = (originalDeadline: string, newDeadline: string) => {
    const original = new Date(originalDeadline);
    const extended = new Date(newDeadline);
    const diff = extended.getTime() - original.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-8">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/40 to-indigo-100/20 rounded-full -translate-y-20 translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/30 to-pink-100/20 rounded-full translate-y-16 -translate-x-16"></div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                Deadline Override{" "}
                <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                  Audit Log
                </span>
              </h1>
              <p className="text-[var(--muted-foreground)] mt-2">
                Complete audit trail of all deadline extensions and modifications
              </p>
              {activeCycle && (
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  Active Cycle: <span className="font-medium">{activeCycle.name}</span> (
                  {activeCycle.year})
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 self-start lg:self-center">
              <Button onClick={() => router.push("/mlgoo/deadlines")} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Status
              </Button>
              <Button onClick={handleExport} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-[var(--muted-foreground)]" />
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Barangay Filter */}
          <div className="space-y-2">
            <Label htmlFor="barangay-filter">Barangay</Label>
            <Select
              value={barangayFilter?.toString() || "all"}
              onValueChange={(value) => setBarangayFilter(value === "all" ? null : parseInt(value))}
            >
              <SelectTrigger id="barangay-filter">
                <SelectValue placeholder="All Barangays" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Barangays</SelectItem>
                {(barangays as any)?.map((barangay: any) => (
                  <SelectItem key={barangay.id} value={barangay.id.toString()}>
                    {barangay.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Indicator Filter */}
          <div className="space-y-2">
            <Label htmlFor="indicator-filter">Indicator</Label>
            <Select
              value={indicatorFilter?.toString() || "all"}
              onValueChange={(value) =>
                setIndicatorFilter(value === "all" ? null : parseInt(value))
              }
            >
              <SelectTrigger id="indicator-filter">
                <SelectValue placeholder="All Indicators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Indicators</SelectItem>
                {indicators?.map((indicator: any) => (
                  <SelectItem key={indicator.id} value={indicator.id.toString()}>
                    {indicator.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--background)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Timestamp
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Created By
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Barangay
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Indicator
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Original Deadline
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    New Deadline
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  Extension
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--cityscape-yellow)]"></div>
                      <span className="text-[var(--muted-foreground)]">Loading audit log...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedOverrides.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
                    <p className="text-[var(--muted-foreground)]">
                      No deadline overrides found
                      {(barangayFilter || indicatorFilter) && " with the selected filters"}.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOverrides.map((override: any) => (
                  <tr
                    key={override.id}
                    className="hover:bg-[var(--background)]/50 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--foreground)]">
                        {formatDate(override.created_at)}
                      </div>
                    </td>

                    {/* Created By */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-[var(--foreground)]">
                        {override.creator_email}
                      </div>
                    </td>

                    {/* Barangay */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-[var(--foreground)]">
                        {override.barangay_name}
                      </div>
                    </td>

                    {/* Indicator */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--foreground)]">
                        {override.indicator_name}
                      </div>
                    </td>

                    {/* Original Deadline */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--foreground)]">
                        {formatDate(override.original_deadline)}
                      </div>
                    </td>

                    {/* New Deadline */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        {formatDate(override.new_deadline)}
                      </div>
                    </td>

                    {/* Extension Duration */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-[var(--foreground)]">
                        +{calculateExtensionDays(override.original_deadline, override.new_deadline)}{" "}
                        days
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--muted-foreground)] max-w-xs truncate">
                        {override.reason}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!isLoading && paginatedOverrides.length > 0 && (
          <div className="px-6 py-4 bg-[var(--background)]/50 border-t border-[var(--border)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Results Info */}
              <div className="text-sm text-[var(--muted-foreground)]">
                Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, overrides.length)}
                </span>{" "}
                of <span className="font-medium">{overrides.length}</span> overrides
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-4">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="page-size" className="text-sm whitespace-nowrap">
                    Rows per page:
                  </Label>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger id="page-size" className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-[var(--foreground)] min-w-[100px] text-center">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
