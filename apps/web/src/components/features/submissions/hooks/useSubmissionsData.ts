"use client";

import { useMemo } from "react";
import { useGetAssessmentsList, AssessmentStatus } from "@sinag/shared";
import {
  transformAssessmentsToUI,
  filterSubmissionsBySearch,
  sortSubmissions,
  type SubmissionUIModel,
  type SortConfig,
} from "../utils/dataTransformers";
import { FILTER_TO_API_STATUS } from "../utils/statusConfig";

interface UseSubmissionsDataOptions {
  statusFilter: string;
  searchQuery: string;
  sortConfig: SortConfig | null;
  year?: number;
}

interface UseSubmissionsDataReturn {
  submissions: SubmissionUIModel[];
  filteredSubmissions: SubmissionUIModel[];
  isLoading: boolean;
  error: Error | null;
  totalCount: number;
  completedCount: number;
}

/**
 * Custom hook for fetching and managing submissions data.
 * Handles API fetching, data transformation, filtering, and sorting.
 */
export function useSubmissionsData({
  statusFilter,
  searchQuery,
  sortConfig,
  year,
}: UseSubmissionsDataOptions): UseSubmissionsDataReturn {
  // Convert UI filter to API status
  const apiStatusFilter = useMemo(() => {
    if (statusFilter === "all") {
      return undefined;
    }
    return FILTER_TO_API_STATUS[statusFilter] as AssessmentStatus | undefined;
  }, [statusFilter]);

  // Fetch data from API
  const {
    data: apiData,
    isLoading,
    error,
  } = useGetAssessmentsList({
    assessment_status: apiStatusFilter,
    year: year,
  });

  // Transform API data to UI models
  const submissions = useMemo((): SubmissionUIModel[] => {
    if (!apiData) return [];

    return transformAssessmentsToUI(apiData as any[]);
  }, [apiData]);

  // Apply client-side filtering and sorting
  const filteredSubmissions = useMemo(() => {
    let result = filterSubmissionsBySearch(submissions, searchQuery);
    result = sortSubmissions(result, sortConfig);
    return result;
  }, [submissions, searchQuery, sortConfig]);

  // Calculate stats
  const completedCount = useMemo(() => {
    return submissions.filter(
      (s) => s.currentStatus === "Validated" || s.currentStatus === "Completed"
    ).length;
  }, [submissions]);

  return {
    submissions,
    filteredSubmissions,
    isLoading,
    error: error as Error | null,
    totalCount: submissions.length,
    completedCount,
  };
}
