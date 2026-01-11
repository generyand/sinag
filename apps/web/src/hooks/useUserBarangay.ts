import { useMemo } from "react";
import { useBarangays } from "./useBarangays";
import { useAuthStore } from "@/store/useAuthStore";
import { Barangay } from "@sinag/shared";

/**
 * Custom hook to get the user's assigned barangay name.
 * Fetches all barangays and finds the one matching the user's barangay_id.
 *
 * TODO: Consider creating a dedicated endpoint GET /api/v1/users/me/barangay
 * to avoid fetching all barangays just to get one name.
 */
export function useUserBarangay() {
  const { user } = useAuthStore();
  const { data: barangaysData, isLoading, error } = useBarangays();

  // Memoize the barangay name calculation to avoid recalculating on every render
  const barangayName = useMemo(() => {
    if (!user?.barangay_id || !barangaysData) {
      return null;
    }

    const barangay = (barangaysData as Barangay[]).find((b: Barangay) => b.id === user.barangay_id);

    return barangay?.name || null;
  }, [user?.barangay_id, barangaysData]);

  return {
    barangayName,
    isLoading,
    error,
    barangayId: user?.barangay_id,
  };
}
