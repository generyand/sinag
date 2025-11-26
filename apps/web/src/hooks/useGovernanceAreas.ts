import { useGetLookupsGovernanceAreas } from '@sinag/shared';

/**
 * Custom hook to fetch governance areas for the user management interface.
 * Uses the real API endpoint from the backend.
 *
 * @param options - Optional react-query options
 */
export function useGovernanceAreas(options?: Parameters<typeof useGetLookupsGovernanceAreas>[0]) {
  return useGetLookupsGovernanceAreas(options);
} 