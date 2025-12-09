/**
 * Assessment Year Hook
 *
 * Provides access to assessment year data and year switching functionality.
 * Uses the generated API hooks from @sinag/shared and syncs with the
 * Zustand store for global state management.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useAssessmentYearStore,
  useEffectiveYear,
  useIsActiveYear,
} from "@/store/useAssessmentYearStore";
import { useAuthStore } from "@/store/useAuthStore";

// API base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_V1_URL || "http://localhost:8000/api/v1";

/**
 * Response type for accessible years endpoint
 */
interface AccessibleYearsResponse {
  years: number[];
  active_year: number | null;
  role: string;
}

/**
 * Response type for year details endpoint
 */
interface AssessmentYearResponse {
  id: number;
  year: number;
  assessment_period_start: string;
  assessment_period_end: string;
  phase1_deadline: string | null;
  rework_deadline: string | null;
  phase2_deadline: string | null;
  calibration_deadline: string | null;
  is_active: boolean;
  is_published: boolean;
  description: string | null;
}

/**
 * Query keys for assessment year data
 */
export const assessmentYearKeys = {
  all: ["assessment-year"] as const,
  accessible: () => [...assessmentYearKeys.all, "accessible"] as const,
  details: (year: number) => [...assessmentYearKeys.all, "details", year] as const,
  active: () => [...assessmentYearKeys.all, "active"] as const,
};

/**
 * Fetch accessible years for the current user
 */
async function fetchAccessibleYears(token: string | null): Promise<AccessibleYearsResponse> {
  // Require token for authenticated endpoints
  if (!token) {
    throw new Error("Authentication required to fetch accessible years");
  }

  const response = await fetch(`${API_BASE_URL}/assessment-years/accessible`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`Failed to fetch accessible years: ${response.status} - ${errorBody}`);
  }

  return response.json();
}

/**
 * Fetch year details
 */
async function fetchYearDetails(
  year: number,
  token: string | null
): Promise<AssessmentYearResponse> {
  // Require token for authenticated endpoints
  if (!token) {
    throw new Error("Authentication required to fetch year details");
  }

  const response = await fetch(`${API_BASE_URL}/assessment-years/${year}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`Failed to fetch year ${year} details: ${response.status} - ${errorBody}`);
  }

  return response.json();
}

/**
 * Hook to fetch and manage accessible assessment years
 *
 * This hook:
 * - Fetches years accessible to the current user based on their role
 * - Initializes the global assessment year store
 * - Handles year selection and switching
 *
 * Usage:
 * ```tsx
 * const { years, activeYear, selectedYear, setSelectedYear, isLoading } = useAccessibleYears();
 * ```
 */
export function useAccessibleYears() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const {
    accessibleYears,
    activeYear,
    selectedYear,
    setSelectedYear,
    initialize,
    setLoading,
    setError,
  } = useAssessmentYearStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: assessmentYearKeys.accessible(),
    queryFn: () => fetchAccessibleYears(token),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Consolidated effect to sync query state with store
  // This prevents multiple re-renders from separate effects
  useEffect(() => {
    setLoading(isLoading);

    if (error) {
      setError(error instanceof Error ? error.message : "Failed to fetch years");
    } else if (data) {
      initialize({
        years: data.years,
        activeYear: data.active_year,
      });
    }
  }, [data, isLoading, error, initialize, setLoading, setError]);

  return {
    years: accessibleYears,
    activeYear,
    selectedYear,
    effectiveYear: selectedYear ?? activeYear,
    setSelectedYear,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch details for a specific year
 *
 * Usage:
 * ```tsx
 * const { yearDetails, isLoading } = useYearDetails(2025);
 * ```
 */
export function useYearDetails(year: number | null) {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data, isLoading, error } = useQuery({
    queryKey: assessmentYearKeys.details(year ?? 0),
    queryFn: () => fetchYearDetails(year!, token),
    enabled: isAuthenticated && year !== null,
    staleTime: 5 * 60 * 1000,
  });

  return {
    yearDetails: data,
    isLoading,
    error,
  };
}

/**
 * Hook to get the current effective year with details
 *
 * Combines the effective year from the store with its details.
 *
 * Usage:
 * ```tsx
 * const { year, yearDetails, isActiveYear } = useCurrentYear();
 * ```
 */
export function useCurrentYear() {
  const effectiveYear = useEffectiveYear();
  const isActiveYear = useIsActiveYear();
  const { yearDetails, isLoading, error } = useYearDetails(effectiveYear);

  return {
    year: effectiveYear,
    yearDetails,
    isActiveYear,
    isLoading,
    error,
  };
}

/**
 * Hook for year selector component
 *
 * Provides everything needed to render a year selector dropdown.
 *
 * Usage:
 * ```tsx
 * const { options, value, onChange, isLoading } = useYearSelector();
 *
 * <Select value={value} onValueChange={onChange}>
 *   {options.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
 * </Select>
 * ```
 */
export function useYearSelector() {
  const { years, selectedYear, activeYear, setSelectedYear, isLoading } = useAccessibleYears();

  // Memoize options to prevent unnecessary re-renders
  const options = useMemo(
    () =>
      years.map((year) => ({
        value: year.toString(),
        label: year === activeYear ? `${year} (Current)` : year.toString(),
        isActive: year === activeYear,
      })),
    [years, activeYear]
  );

  const handleChange = useCallback(
    (value: string) => {
      const year = parseInt(value, 10);
      if (!isNaN(year)) {
        setSelectedYear(year);
      }
    },
    [setSelectedYear]
  );

  // Memoize the current value to prevent unnecessary string conversions
  const value = useMemo(
    () => (selectedYear ?? activeYear)?.toString() ?? "",
    [selectedYear, activeYear]
  );

  return {
    options,
    value,
    onChange: handleChange,
    isLoading,
    hasMultipleYears: years.length > 1,
  };
}

// Re-export store hooks for convenience
export { useEffectiveYear, useIsActiveYear };
