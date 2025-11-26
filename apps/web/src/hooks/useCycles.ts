/**
 * 🔄 Assessment Cycles Custom Hook
 *
 * Wraps TanStack Query hooks for assessment cycle management.
 * Provides convenient interface for:
 * - Fetching active cycle
 * - Creating new cycles
 * - Updating existing cycles
 */

import {
  useGetAdminCyclesActive,
  usePostAdminCycles,
  usePutAdminCyclesCycleId,
} from '@sinag/shared';
import type {
  AssessmentCycleCreate,
  AssessmentCycleUpdate,
  AssessmentCycleResponse,
} from '@sinag/shared';

/**
 * Hook for managing assessment cycles.
 *
 * @returns Object containing:
 * - activeCycle: Current active cycle data
 * - isLoadingActiveCycle: Loading state for active cycle query
 * - activeCycleError: Error from active cycle query
 * - createCycle: Mutation function to create a new cycle
 * - isCreatingCycle: Loading state for create mutation
 * - updateCycle: Mutation function to update a cycle
 * - isUpdatingCycle: Loading state for update mutation
 * - refetchActiveCycle: Function to manually refetch active cycle
 *
 * @example
 * ```tsx
 * const { activeCycle, createCycle, isCreatingCycle } = useCycles();
 *
 * const handleCreateCycle = async (data: AssessmentCycleCreate) => {
 *   await createCycle.mutateAsync(data);
 * };
 * ```
 */
export function useCycles() {
  // Query for active cycle
  const {
    data: activeCycle,
    isLoading: isLoadingActiveCycle,
    error: activeCycleError,
    refetch: refetchActiveCycle,
  } = useGetAdminCyclesActive<AssessmentCycleResponse>();

  // Mutation for creating a new cycle
  const {
    mutate: createCycleMutate,
    mutateAsync: createCycleAsync,
    isPending: isCreatingCycle,
    error: createCycleError,
  } = usePostAdminCycles();

  // Mutation for updating a cycle
  const {
    mutate: updateCycleMutate,
    mutateAsync: updateCycleAsync,
    isPending: isUpdatingCycle,
    error: updateCycleError,
  } = usePutAdminCyclesCycleId();

  return {
    // Active cycle query
    activeCycle,
    isLoadingActiveCycle,
    activeCycleError,
    refetchActiveCycle,

    // Create cycle mutation
    createCycle: {
      mutate: createCycleMutate,
      mutateAsync: createCycleAsync,
    },
    isCreatingCycle,
    createCycleError,

    // Update cycle mutation
    updateCycle: {
      mutate: updateCycleMutate,
      mutateAsync: updateCycleAsync,
    },
    isUpdatingCycle,
    updateCycleError,
  };
}

/**
 * Type for cycle form data (used by CycleForm component).
 * Extends AssessmentCycleCreate for creating new cycles.
 */
export type CycleFormData = AssessmentCycleCreate;

/**
 * Type for cycle update form data.
 * Extends AssessmentCycleUpdate with cycle_id for updating.
 */
export type CycleUpdateFormData = AssessmentCycleUpdate & {
  cycle_id: number;
};
