/**
 * 📋 Deadline Audit Log Hook
 *
 * Custom hook for managing deadline override audit logs.
 * Wraps TanStack Query hooks for querying and exporting override history.
 */

import type { DeadlineOverrideListResponse } from "@sinag/shared";
import { useGetAdminDeadlinesOverrides } from "@sinag/shared";

interface UseDeadlineAuditLogOptions {
  cycleId?: number;
  barangayId?: number;
  indicatorId?: number;
}

/**
 * Hook for querying deadline override audit logs.
 *
 * @param options - Filter options (cycle_id, barangay_id, indicator_id)
 * @returns Object containing:
 * - overrides: List of deadline override records
 * - totalOverrides: Total count of matching overrides
 * - isLoading: Loading state
 * - error: Error from query
 * - refetch: Function to manually refetch data
 *
 * @example
 * ```tsx
 * const { overrides, isLoading } = useDeadlineAuditLog({
 *   cycleId: activeCycle?.id,
 * });
 * ```
 */
export function useDeadlineAuditLog(options?: UseDeadlineAuditLogOptions) {
  const {
    data: overridesData,
    isLoading,
    error,
    refetch,
  } = useGetAdminDeadlinesOverrides<DeadlineOverrideListResponse>(
    {
      cycle_id: options?.cycleId,
      barangay_id: options?.barangayId,
      indicator_id: options?.indicatorId,
    },
    {
      query: {
        // Always enabled - will return empty list if no filters match
        enabled: true,
      } as any,
    }
  );

  return {
    overrides: overridesData?.items || [],
    totalOverrides: overridesData?.total || 0,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Helper function to trigger CSV export download.
 *
 * @param filters - Optional filters (cycle_id, barangay_id, indicator_id)
 */
export function exportDeadlineOverridesCSV(filters?: UseDeadlineAuditLogOptions) {
  const params = new URLSearchParams();

  if (filters?.cycleId) {
    params.append("cycle_id", filters.cycleId.toString());
  }
  if (filters?.barangayId) {
    params.append("barangay_id", filters.barangayId.toString());
  }
  if (filters?.indicatorId) {
    params.append("indicator_id", filters.indicatorId.toString());
  }

  const url = `/api/v1/admin/deadlines/overrides/export?${params.toString()}`;

  // Create a temporary link and trigger download
  const link = document.createElement("a");
  link.href = url;
  link.download = `deadline_overrides_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
