"use client";

/**
 * Review History Hooks
 *
 * Wrapper hooks for the review history API endpoints.
 * Provides a cleaner interface for fetching completed assessment reviews.
 */

import {
  useGetAssessorHistory,
  useGetAssessorHistoryAssessmentId,
  type GetAssessorHistoryParams,
} from "@sinag/shared";

export interface ReviewHistoryFilters {
  search?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  outcome?: "PASSED" | "FAILED" | null;
  year?: number | null;
}

export interface UseReviewHistoryParams {
  page?: number;
  pageSize?: number;
  filters?: ReviewHistoryFilters;
  enabled?: boolean;
}

/**
 * Hook for fetching paginated review history list.
 *
 * Returns completed assessments that the current user has reviewed:
 * - Assessors: Assessments where reviewed_by matches the current user
 * - Validators: Completed assessments in their governance area
 */
export function useReviewHistory({
  page = 1,
  pageSize = 20,
  filters = {},
  enabled = true,
}: UseReviewHistoryParams = {}) {
  // Build query params
  const params: GetAssessorHistoryParams = {
    page,
    page_size: pageSize,
  };

  // Add filters
  if (filters.year) {
    params.year = filters.year;
  }
  if (filters.dateFrom) {
    params.date_from = filters.dateFrom.toISOString();
  }
  if (filters.dateTo) {
    params.date_to = filters.dateTo.toISOString();
  }
  if (filters.outcome) {
    params.outcome = filters.outcome;
  }

  return useGetAssessorHistory(params, {
    query: {
      enabled,
      staleTime: 30000, // 30 seconds
    } as any,
  });
}

export interface UseReviewHistoryDetailParams {
  assessmentId: number;
  enabled?: boolean;
}

/**
 * Hook for fetching detailed per-indicator decisions for a specific assessment.
 *
 * Used when user expands a row to see inline indicator details.
 * Only enabled when assessmentId is provided and enabled is true.
 */
export function useReviewHistoryDetail({
  assessmentId,
  enabled = true,
}: UseReviewHistoryDetailParams) {
  return useGetAssessorHistoryAssessmentId(assessmentId, {
    query: {
      enabled: enabled && assessmentId > 0,
      staleTime: 60000, // 1 minute - detail data doesn't change often
    } as any,
  });
}
