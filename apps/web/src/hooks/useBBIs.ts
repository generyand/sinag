// Custom hooks for BBI (Barangay-based Institutions) management
// Wraps generated React Query hooks with convenience methods

import {
  getBbis,
  getBbis$BbiId,
  usePostBbis,
  usePutBbisBbiId,
  useDeleteBbisBbiId,
  usePostBbisTestCalculation,
  type GetBbisParams,
  type BBICreate,
  type BBIUpdate,
  type TestBBICalculationRequest,
} from '@sinag/shared';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch list of BBIs with optional filters
 */
export function useBBIs(params?: GetBbisParams) {
  return useQuery({
    queryKey: ['bbis', params],
    queryFn: () => getBbis(params),
  });
}

/**
 * Hook to fetch a single BBI by ID
 */
export function useBBI(bbiId: number) {
  return useQuery({
    queryKey: ['bbis', bbiId],
    queryFn: () => getBbis$BbiId(bbiId),
  });
}

/**
 * Hook to create a new BBI
 */
export function useCreateBBIMutation() {
  return usePostBbis();
}

/**
 * Hook to update an existing BBI
 */
export function useUpdateBBIMutation() {
  return usePutBbisBbiId();
}

/**
 * Hook to deactivate (soft delete) a BBI
 */
export function useDeleteBBIMutation() {
  return useDeleteBbisBbiId();
}

/**
 * Hook to test BBI calculation logic
 */
export function useTestBBICalculationMutation() {
  return usePostBbisTestCalculation();
}
