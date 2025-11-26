/**
 * ⏰ Deadline Status & Override Management Hook
 *
 * Wraps TanStack Query hooks for deadline status monitoring and override management.
 * Provides convenient interface for:
 * - Fetching deadline status for all barangays
 * - Creating deadline overrides
 * - Querying existing overrides
 * - Exporting override audit logs
 */

import type {
  DeadlineOverrideCreate,
  DeadlineOverrideListResponse,
  DeadlineStatusListResponse
} from '@sinag/shared';
import {
  useGetAdminDeadlinesOverrides,
  useGetAdminDeadlinesStatus,
  usePostAdminDeadlinesOverride
} from '@sinag/shared';

/**
 * Hook for managing deadline status and overrides.
 *
 * @param cycleId - Optional cycle ID to filter deadline status
 * @returns Object containing:
 * - deadlineStatus: List of barangay deadline statuses across all phases
 * - isLoadingStatus: Loading state for deadline status query
 * - statusError: Error from deadline status query
 * - refetchStatus: Function to manually refetch deadline status
 * - createOverride: Mutation function to apply deadline override
 * - isCreatingOverride: Loading state for override creation
 * - overrides: List of deadline overrides (with optional filters)
 * - isLoadingOverrides: Loading state for overrides query
 * - refetchOverrides: Function to manually refetch overrides
 *
 * @example
 * ```tsx
 * const { deadlineStatus, createOverride, isCreatingOverride } = useDeadlines();
 *
 * const handleExtendDeadline = async (data: DeadlineOverrideCreate) => {
 *   await createOverride.mutateAsync(data);
 * };
 * ```
 */
export function useDeadlines(options?: {
  cycleId?: number;
  overrideFilters?: {
    cycle_id?: number;
    barangay_id?: number;
    indicator_id?: number;
  };
}) {
  // Query for deadline status
  const {
    data: deadlineStatusData,
    isLoading: isLoadingStatus,
    error: statusError,
    refetch: refetchStatus,
  } = useGetAdminDeadlinesStatus<DeadlineStatusListResponse>(
    {
      cycle_id: options?.cycleId,
    },
    {
      query: {
        // Refetch every 30 seconds for real-time updates
        refetchInterval: 30000,
      } as any,
    }
  );

  // Mutation for creating deadline override
  const {
    mutate: createOverrideMutate,
    mutateAsync: createOverrideAsync,
    isPending: isCreatingOverride,
    error: createOverrideError,
  } = usePostAdminDeadlinesOverride();

  // Query for deadline overrides
  const {
    data: overridesData,
    isLoading: isLoadingOverrides,
    error: overridesError,
    refetch: refetchOverrides,
  } = useGetAdminDeadlinesOverrides<DeadlineOverrideListResponse>(
    {
      cycle_id: options?.overrideFilters?.cycle_id,
      barangay_id: options?.overrideFilters?.barangay_id,
      indicator_id: options?.overrideFilters?.indicator_id,
    },
    {
      query: {
        // Only fetch if at least one filter is provided or explicitly enabled
        enabled: true,
      } as any,
    }
  );

  return {
    // Deadline status query
    deadlineStatus: deadlineStatusData?.items || [],
    totalBarangays: deadlineStatusData?.total || 0,
    isLoadingStatus,
    statusError,
    refetchStatus,

    // Create override mutation
    createOverride: {
      mutate: createOverrideMutate,
      mutateAsync: createOverrideAsync,
    },
    isCreatingOverride,
    createOverrideError,

    // Overrides query
    overrides: overridesData?.items || [],
    totalOverrides: overridesData?.total || 0,
    isLoadingOverrides,
    overridesError,
    refetchOverrides,
  };
}

/**
 * Type for deadline override form data (used by DeadlineOverrideModal component).
 */
export type DeadlineOverrideFormData = DeadlineOverrideCreate;

/**
 * Helper function to get status color based on deadline status type.
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'submitted_on_time':
      return 'green'; // Green: Submitted on time
    case 'submitted_late':
      return 'blue'; // Blue: Late but submitted
    case 'pending':
      return 'yellow'; // Yellow: Approaching deadline
    case 'overdue':
      return 'red'; // Red: Overdue
    default:
      return 'gray';
  }
}

/**
 * Helper function to get status label for display.
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'submitted_on_time':
      return 'On Time';
    case 'submitted_late':
      return 'Late (Submitted)';
    case 'pending':
      return 'Pending';
    case 'overdue':
      return 'Overdue';
    default:
      return status;
  }
}

/**
 * Helper function to get status badge classes.
 */
export function getStatusBadgeClasses(status: string): string {
  const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
  const color = getStatusColor(status);

  switch (color) {
    case 'green':
      return `${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400`;
    case 'blue':
      return `${baseClasses} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400`;
    case 'yellow':
      return `${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400`;
    case 'red':
      return `${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400`;
    default:
      return `${baseClasses} bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400`;
  }
}
