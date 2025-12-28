// Custom hooks for indicator management
// Wraps generated React Query hooks with convenience methods

import {
  useGetIndicators,
  useGetIndicatorsIndicatorId,
  usePostIndicators,
  usePutIndicatorsIndicatorId,
  useDeleteIndicatorsIndicatorId,
  useGetIndicatorsIndicatorIdHistory,
  type GetIndicatorsParams,
  type IndicatorCreate,
  type IndicatorUpdate,
} from "@sinag/shared";

/**
 * Hook to fetch list of indicators with optional filters
 */
export function useIndicators(params?: GetIndicatorsParams) {
  return useGetIndicators(params);
}

/**
 * Hook to fetch a single indicator by ID
 */
export function useIndicator(indicatorId: number) {
  return useGetIndicatorsIndicatorId(indicatorId);
}

/**
 * Hook to create a new indicator
 */
export function useCreateIndicatorMutation() {
  return usePostIndicators();
}

/**
 * Hook to update an existing indicator
 */
export function useUpdateIndicatorMutation() {
  return usePutIndicatorsIndicatorId();
}

/**
 * Hook to deactivate (soft delete) an indicator
 */
export function useDeleteIndicatorMutation() {
  return useDeleteIndicatorsIndicatorId();
}

/**
 * Hook to fetch indicator version history
 */
export function useIndicatorHistory(indicatorId: number) {
  return useGetIndicatorsIndicatorIdHistory(indicatorId);
}
