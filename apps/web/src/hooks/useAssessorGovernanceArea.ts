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

  const getAssessorGovernanceArea = () => {
    if (!user || user.role !== "ASSESSOR") {
      return null;
    }

    if (!user.validator_area_id || !governanceAreasData) {
      return "Unknown Governance Area";
    }

    const governanceArea = (governanceAreasData as GovernanceArea[]).find(
      (ga: GovernanceArea) => ga.id === user.validator_area_id
    );

    return governanceArea?.name || "Unknown Governance Area";
  };

  return {
    governanceAreaName: getAssessorGovernanceArea(),
    isLoading,
    error,
    governanceAreaId: user?.validator_area_id,
  };
}
