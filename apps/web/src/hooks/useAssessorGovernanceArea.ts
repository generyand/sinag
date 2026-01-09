import { useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { GovernanceArea } from "@sinag/shared";
import { useGovernanceAreas } from "./useGovernanceAreas";

/**
 * Custom hook to get the assigned governance area for Area Assessors.
 * This is similar to useUserBarangay but for assessors.
 */
export function useAssessorGovernanceArea() {
  const { user } = useAuthStore();
  const { data: governanceAreasData, isLoading, error } = useGovernanceAreas();

  // Memoize the governance area name calculation
  const governanceAreaName = useMemo(() => {
    if (!user || user.role !== "ASSESSOR") {
      return null;
    }

    if (!user.assessor_area_id || !governanceAreasData) {
      return null;
    }

    const governanceArea = (governanceAreasData as GovernanceArea[]).find(
      (ga: GovernanceArea) => ga.id === user.assessor_area_id
    );

    return governanceArea?.name || null;
  }, [user, governanceAreasData]);

  return {
    governanceAreaName,
    isLoading,
    error,
    governanceAreaId: user?.assessor_area_id,
  };
}
