/**
 * Assessment Years CRUD Hook
 *
 * Wraps TanStack Query hooks for assessment year management.
 * Provides convenient interface for:
 * - Listing all assessment years
 * - Creating new years
 * - Updating existing years
 * - Activating/deactivating years
 * - Publishing/unpublishing years
 */

import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAssessmentYears,
  useGetAssessmentYearsActive,
  usePostAssessmentYears,
  usePatchAssessmentYearsYear,
  useDeleteAssessmentYearsYear,
  usePostAssessmentYearsYearActivate,
  usePostAssessmentYearsYearDeactivate,
  usePostAssessmentYearsYearPublish,
  usePostAssessmentYearsYearUnpublish,
  getGetAssessmentYearsQueryKey,
  getGetAssessmentYearsActiveQueryKey,
} from "@sinag/shared";
import type {
  AssessmentYearCreate,
  AssessmentYearUpdate,
  AssessmentYearResponse,
  AssessmentYearListResponse,
} from "@sinag/shared";

/**
 * Form data type for creating/updating assessment years
 */
export interface AssessmentYearFormData {
  year: number;
  assessment_period_start: string; // ISO datetime string
  assessment_period_end: string;
  phase1_deadline: string | null;
  rework_deadline: string | null;
  phase2_deadline: string | null;
  calibration_deadline: string | null;
  description?: string | null;
}

/**
 * Hook for managing assessment years (MLGOO only).
 *
 * @returns Object containing:
 * - years: List of all assessment years
 * - activeYear: Currently active year
 * - isLoading: Loading state for queries
 * - mutations for create, update, delete, activate, deactivate, publish, unpublish
 *
 * @example
 * ```tsx
 * const { years, activeYear, createYear, activateYear } = useAssessmentYears();
 *
 * const handleCreate = async (data: AssessmentYearFormData) => {
 *   await createYear.mutateAsync({ data: transformFormData(data) });
 * };
 * ```
 */
export function useAssessmentYears() {
  const queryClient = useQueryClient();

  // Query for all years
  const {
    data: yearsData,
    isLoading: isLoadingYears,
    error: yearsError,
    refetch: refetchYears,
  } = useGetAssessmentYears<AssessmentYearListResponse>();

  // Query for active year
  const {
    data: activeYear,
    isLoading: isLoadingActiveYear,
    error: activeYearError,
    refetch: refetchActiveYear,
  } = useGetAssessmentYearsActive<AssessmentYearResponse>();

  // Invalidate all year queries
  const invalidateYearQueries = () => {
    queryClient.invalidateQueries({ queryKey: getGetAssessmentYearsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAssessmentYearsActiveQueryKey() });
  };

  // Create mutation
  const createMutation = usePostAssessmentYears({
    mutation: {
      onSuccess: () => {
        invalidateYearQueries();
      },
    },
  });

  // Update mutation
  const updateMutation = usePatchAssessmentYearsYear({
    mutation: {
      onSuccess: () => {
        invalidateYearQueries();
      },
    },
  });

  // Delete mutation
  const deleteMutation = useDeleteAssessmentYearsYear({
    mutation: {
      onSuccess: () => {
        invalidateYearQueries();
      },
    },
  });

  // Activate mutation
  const activateMutation = usePostAssessmentYearsYearActivate({
    mutation: {
      onSuccess: () => {
        invalidateYearQueries();
      },
    },
  });

  // Deactivate mutation
  const deactivateMutation = usePostAssessmentYearsYearDeactivate({
    mutation: {
      onSuccess: () => {
        invalidateYearQueries();
      },
    },
  });

  // Publish mutation
  const publishMutation = usePostAssessmentYearsYearPublish({
    mutation: {
      onSuccess: () => {
        invalidateYearQueries();
      },
    },
  });

  // Unpublish mutation
  const unpublishMutation = usePostAssessmentYearsYearUnpublish({
    mutation: {
      onSuccess: () => {
        invalidateYearQueries();
      },
    },
  });

  return {
    // Query data
    years: yearsData?.years ?? [],
    activeYearNumber: yearsData?.active_year ?? null,
    activeYear,
    isLoading: isLoadingYears || isLoadingActiveYear,
    isLoadingYears,
    isLoadingActiveYear,
    yearsError,
    activeYearError,
    refetchYears,
    refetchActiveYear,

    // Create
    createYear: {
      mutate: createMutation.mutate,
      mutateAsync: createMutation.mutateAsync,
    },
    isCreatingYear: createMutation.isPending,
    createYearError: createMutation.error,

    // Update
    updateYear: {
      mutate: updateMutation.mutate,
      mutateAsync: updateMutation.mutateAsync,
    },
    isUpdatingYear: updateMutation.isPending,
    updateYearError: updateMutation.error,

    // Delete
    deleteYear: {
      mutate: deleteMutation.mutate,
      mutateAsync: deleteMutation.mutateAsync,
    },
    isDeletingYear: deleteMutation.isPending,
    deleteYearError: deleteMutation.error,

    // Activate
    activateYear: {
      mutate: activateMutation.mutate,
      mutateAsync: activateMutation.mutateAsync,
    },
    isActivatingYear: activateMutation.isPending,
    activateYearError: activateMutation.error,

    // Deactivate
    deactivateYear: {
      mutate: deactivateMutation.mutate,
      mutateAsync: deactivateMutation.mutateAsync,
    },
    isDeactivatingYear: deactivateMutation.isPending,
    deactivateYearError: deactivateMutation.error,

    // Publish
    publishYear: {
      mutate: publishMutation.mutate,
      mutateAsync: publishMutation.mutateAsync,
    },
    isPublishingYear: publishMutation.isPending,
    publishYearError: publishMutation.error,

    // Unpublish
    unpublishYear: {
      mutate: unpublishMutation.mutate,
      mutateAsync: unpublishMutation.mutateAsync,
    },
    isUnpublishingYear: unpublishMutation.isPending,
    unpublishYearError: unpublishMutation.error,
  };
}

/**
 * Helper to transform form data to API format
 */
export function transformFormToApiData(formData: AssessmentYearFormData): AssessmentYearCreate {
  return {
    year: formData.year,
    assessment_period_start: formData.assessment_period_start,
    assessment_period_end: formData.assessment_period_end,
    phase1_deadline: formData.phase1_deadline || undefined,
    rework_deadline: formData.rework_deadline || undefined,
    phase2_deadline: formData.phase2_deadline || undefined,
    calibration_deadline: formData.calibration_deadline || undefined,
    description: formData.description || undefined,
  };
}

/**
 * Helper to transform API response to form data
 */
export function transformApiToFormData(apiData: AssessmentYearResponse): AssessmentYearFormData {
  // Convert ISO strings to datetime-local format (YYYY-MM-DDTHH:mm)
  const toDatetimeLocal = (isoString: string | null | undefined): string => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      // Format as YYYY-MM-DDTHH:mm (datetime-local input format)
      return date.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  return {
    year: apiData.year,
    assessment_period_start: toDatetimeLocal(apiData.assessment_period_start),
    assessment_period_end: toDatetimeLocal(apiData.assessment_period_end),
    phase1_deadline: toDatetimeLocal(apiData.phase1_deadline) || null,
    rework_deadline: toDatetimeLocal(apiData.rework_deadline) || null,
    phase2_deadline: toDatetimeLocal(apiData.phase2_deadline) || null,
    calibration_deadline: toDatetimeLocal(apiData.calibration_deadline) || null,
    description: apiData.description ?? null,
  };
}
