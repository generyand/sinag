import { useAuthStore } from "@/store/useAuthStore";
import { GovernanceArea } from "@sinag/shared";
import { useGovernanceAreas } from "./useGovernanceAreas";

/**
 * Custom hook to get the assigned governance area for Validators.
 * This is similar to useAssessorGovernanceArea but for validators.
 */
export function useValidatorGovernanceArea() {
  const { user } = useAuthStore();
  const { data: governanceAreasData, isLoading, error } = useGovernanceAreas();

  const getValidatorGovernanceArea = (): { name: string | null; code: string | null } => {
    if (!user || user.role !== "VALIDATOR") {
      return { name: null, code: null };
    }

    if (!user.validator_area_id || !governanceAreasData) {
      return { name: "Unknown Governance Area", code: null };
    }

    const governanceArea = (governanceAreasData as GovernanceArea[]).find(
      (ga: GovernanceArea) => ga.id === user.validator_area_id
    );

    return {
      name: governanceArea?.name || "Unknown Governance Area",
      code: governanceArea?.code || null,
    };
  };

  const areaData = getValidatorGovernanceArea();

  return {
    governanceAreaName: areaData.name,
    governanceAreaCode: areaData.code,
    isLoading,
    error,
    governanceAreaId: user?.validator_area_id,
  };
}
