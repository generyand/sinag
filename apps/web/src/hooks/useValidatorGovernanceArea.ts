import { useAuthStore } from "@/store/useAuthStore";

/**
 * Custom hook for Validators.
 *
 * After the workflow restructuring, VALIDATOR is now a system-wide role.
 * Validators review assessments after all 6 governance areas are approved by assessors.
 * They do not have a specific governance area assignment.
 *
 * This hook is kept for backward compatibility but now returns "All Governance Areas"
 * to indicate the system-wide nature of the validator role.
 */
export function useValidatorGovernanceArea() {
  const { user } = useAuthStore();

  const isValidator = user?.role === "VALIDATOR";

  return {
    // Validators are now system-wide - they handle all governance areas
    governanceAreaName: isValidator ? "All Governance Areas" : null,
    governanceAreaCode: null, // No specific area code for system-wide validators
    isLoading: false, // No data fetching needed since validators are system-wide
    error: null,
    governanceAreaId: null, // Validators no longer have area assignments
    isSystemWide: isValidator, // New flag to indicate system-wide scope
  };
}
