/**
 * ⏰ Deadline Status Dashboard Component
 *
 * Comprehensive dashboard for monitoring barangay submission deadlines across all phases.
 * Features:
 * - Real-time status monitoring with auto-refresh
 * - Color-coded status indicators (green/yellow/red/blue)
 * - Filtering by barangay name and phase
 * - Summary statistics panel
 * - Extend deadline functionality per barangay
 * - Manual refresh capability
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useDeadlines, getStatusBadgeClasses, getStatusLabel } from "@/hooks/useDeadlines";
import { useCycles } from "@/hooks/useCycles";
import { DeadlineOverrideModal } from "./DeadlineOverrideModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  RefreshCw,
  Filter,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";

export function DeadlineStatusDashboard() {
  const router = useRouter();

  // Get active cycle
  const { activeCycle, isLoadingActiveCycle } = useCycles();

  // Get deadline status with real-time updates (auto-refresh every 30s)
  const {
    deadlineStatus,
    totalBarangays,
    isLoadingStatus,
    statusError,
    refetchStatus,
  } = useDeadlines({
    cycleId: activeCycle?.id,
  });

  // Filter state
  const [barangayFilter, setBarangayFilter] = React.useState("");
  const [phaseFilter, setPhaseFilter] = React.useState<string>("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedBarangayId, setSelectedBarangayId] = React.useState<number | undefined>();

  // Manual refresh loading state
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchStatus();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filter deadline status based on search and phase
  const filteredStatus = React.useMemo(() => {
    let filtered = deadlineStatus;

    // Filter by barangay name
    if (barangayFilter) {
      const searchLower = barangayFilter.toLowerCase();
      filtered = filtered.filter((status) =>
        status.barangay_name.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [deadlineStatus, barangayFilter]);

  // Calculate summary statistics
  const statistics = React.useMemo(() => {
    let totalSubmittedOnTime = 0;
    let totalOverdue = 0;
    let totalPending = 0;
    let totalLate = 0;

    deadlineStatus.forEach((status) => {
      // Count by phase filter or all phases
      const phases = phaseFilter === "all"
        ? [status.phase1, status.rework, status.phase2, status.calibration]
        : phaseFilter === "phase1"
        ? [status.phase1]
        : phaseFilter === "rework"
        ? [status.rework]
        : phaseFilter === "phase2"
        ? [status.phase2]
        : [status.calibration];

      phases.forEach((phase) => {
        if (phase.status === "submitted_on_time") totalSubmittedOnTime++;
        if (phase.status === "overdue") totalOverdue++;
        if (phase.status === "pending") totalPending++;
        if (phase.status === "submitted_late") totalLate++;
      });
    });

    return {
      totalSubmittedOnTime,
      totalOverdue,
      totalPending,
      totalLate,
    };
  }, [deadlineStatus, phaseFilter]);

  // Loading state
  if (isLoadingActiveCycle || isLoadingStatus) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--cityscape-yellow)]"></div>
            <span className="ml-3 text-[var(--muted-foreground)]">
              Loading deadline status...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (statusError) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Error Loading Deadline Status</h2>
          </div>
          <p className="text-[var(--muted-foreground)] mt-2">
            Failed to load deadline status. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  // No active cycle state
  if (!activeCycle) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-12">
          <div className="text-center">
            <Calendar className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              No Active Assessment Cycle
            </h3>
            <p className="text-[var(--muted-foreground)]">
              Create an assessment cycle to begin monitoring barangay submission deadlines.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-8">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/40 to-indigo-100/20 rounded-full -translate-y-20 translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/30 to-pink-100/20 rounded-full translate-y-16 -translate-x-16"></div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                Deadline{" "}
                <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                  Monitoring
                </span>
              </h1>
              <p className="text-[var(--muted-foreground)] mt-2">
                Track barangay submission status across all assessment phases
              </p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Active Cycle: <span className="font-medium">{activeCycle.name}</span> ({activeCycle.year})
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 self-start lg:self-center">
              <Button
                onClick={() => router.push("/mlgoo/deadlines/audit")}
                variant="outline"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Audit Log
              </Button>
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* On Time */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Submitted On Time</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {statistics.totalSubmittedOnTime}
              </p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </div>

        {/* Pending */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {statistics.totalPending}
              </p>
            </div>
            <Clock className="w-10 h-10 text-yellow-500 opacity-50" />
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Overdue</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {statistics.totalOverdue}
              </p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-500 opacity-50" />
          </div>
        </div>

        {/* Late but Submitted */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Late (Submitted)</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {statistics.totalLate}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-500 opacity-50" />
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
          {/* Barangay Name Filter */}
          <div className="space-y-2">
            <Label htmlFor="barangay-filter">Barangay Name</Label>
            <Input
              id="barangay-filter"
              type="text"
              placeholder="Search barangay..."
              value={barangayFilter}
              onChange={(e) => setBarangayFilter(e.target.value)}
            />
          </div>

          {/* Phase Filter */}
          <div className="space-y-2">
            <Label htmlFor="phase-filter">Assessment Phase</Label>
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger id="phase-filter">
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Phases</SelectItem>
                <SelectItem value="phase1">Phase 1 (Initial)</SelectItem>
                <SelectItem value="rework">Rework</SelectItem>
                <SelectItem value="phase2">Phase 2 (Final)</SelectItem>
                <SelectItem value="calibration">Calibration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Deadline Status Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--background)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  Barangay
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  Phase 1
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  Rework
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  Phase 2
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  Calibration
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredStatus.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-[var(--muted-foreground)]">
                      {barangayFilter
                        ? "No barangays match your search."
                        : "No deadline status data available."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStatus.map((status) => (
                  <tr
                    key={status.barangay_id}
                    className="hover:bg-[var(--background)]/50 transition-colors"
                  >
                    {/* Barangay Name */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--foreground)]">
                        {status.barangay_name}
                      </div>
                    </td>

                    {/* Phase 1 Status */}
                    <td className="px-6 py-4">
                      <span className={getStatusBadgeClasses(status.phase1.status)}>
                        {getStatusLabel(status.phase1.status)}
                      </span>
                      {status.phase1.submitted_at && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          {(() => {
                            const date = new Date(status.phase1.submitted_at);
                            return isNaN(date.getTime()) ? "" : date.toLocaleDateString();
                          })()}
                        </p>
                      )}
                    </td>

                    {/* Rework Status */}
                    <td className="px-6 py-4">
                      <span className={getStatusBadgeClasses(status.rework.status)}>
                        {getStatusLabel(status.rework.status)}
                      </span>
                      {status.rework.submitted_at && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          {(() => {
                            const date = new Date(status.rework.submitted_at);
                            return isNaN(date.getTime()) ? "" : date.toLocaleDateString();
                          })()}
                        </p>
                      )}
                    </td>

                    {/* Phase 2 Status */}
                    <td className="px-6 py-4">
                      <span className={getStatusBadgeClasses(status.phase2.status)}>
                        {getStatusLabel(status.phase2.status)}
                      </span>
                      {status.phase2.submitted_at && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          {(() => {
                            const date = new Date(status.phase2.submitted_at);
                            return isNaN(date.getTime()) ? "" : date.toLocaleDateString();
                          })()}
                        </p>
                      )}
                    </td>

                    {/* Calibration Status */}
                    <td className="px-6 py-4">
                      <span className={getStatusBadgeClasses(status.calibration.status)}>
                        {getStatusLabel(status.calibration.status)}
                      </span>
                      {status.calibration.submitted_at && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          {(() => {
                            const date = new Date(status.calibration.submitted_at);
                            return isNaN(date.getTime()) ? "" : date.toLocaleDateString();
                          })()}
                        </p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBarangayId(status.barangay_id);
                          setIsModalOpen(true);
                        }}
                        className="text-xs"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Extend
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Count */}
        {filteredStatus.length > 0 && (
          <div className="px-6 py-4 bg-[var(--background)]/50 border-t border-[var(--border)]">
            <p className="text-sm text-[var(--muted-foreground)]">
              Showing <span className="font-medium">{filteredStatus.length}</span> of{" "}
              <span className="font-medium">{totalBarangays}</span> barangays
            </p>
          </div>
        )}
      </div>

      {/* Real-time Update Indicator */}
      <div className="flex items-center justify-center text-xs text-[var(--muted-foreground)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Auto-refreshing every 30 seconds</span>
        </div>
      </div>

      {/* Deadline Override Modal */}
      <DeadlineOverrideModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        preSelectedBarangayId={selectedBarangayId}
        onSuccess={refetchStatus}
      />
    </div>
  );
}
