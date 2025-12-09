import { useGetLookupsBarangays } from "@sinag/shared";

/**
 * Custom hook to fetch barangays for the user management interface.
 * Uses the real API endpoint from the backend.
 *
 * @param options - Optional react-query options
 */
export function useBarangays(options?: Parameters<typeof useGetLookupsBarangays>[0]) {
  return useGetLookupsBarangays(options);
}
