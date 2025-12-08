"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useEffectiveYear } from "@/store/useAssessmentYearStore";

export interface AnalyticsFilters {
  year?: number;
  start_date?: string;
  end_date?: string;
  governance_area?: string[];
  barangay_id?: number[];
  status?: string;
  phase?: "phase1" | "phase2";
  page: number;
  page_size: number;
}

export interface AnalyticsFilterState {
  selectedYear: number | null;
  selectedPhase: "phase1" | "phase2" | "all";
  filters: AnalyticsFilters;
}

interface UseAnalyticsFiltersReturn {
  // State
  selectedYear: number | null;
  selectedPhase: "phase1" | "phase2" | "all";
  filters: AnalyticsFilters;

  // Setters
  setSelectedYear: (year: number | null) => void;
  setSelectedPhase: (phase: "phase1" | "phase2" | "all") => void;
  setFilters: (filters: AnalyticsFilters) => void;
  updateFilter: <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => void;

  // Actions
  clearAllFilters: () => void;
  clearYearFilter: () => void;
  clearPhaseFilter: () => void;

  // Computed
  hasActiveFilters: boolean;
  activeFilterCount: number;
  activeFilterLabels: { key: string; label: string; onClear: () => void }[];
}

const DEFAULT_FILTERS: AnalyticsFilters = {
  year: undefined,
  start_date: undefined,
  end_date: undefined,
  governance_area: undefined,
  barangay_id: undefined,
  status: undefined,
  phase: undefined,
  page: 1,
  page_size: 50,
};

/**
 * Custom hook for managing analytics filter state.
 * Centralizes filter logic for the Analytics & Reports page.
 * Uses the global effective year from the assessment year store.
 */
export function useAnalyticsFilters(): UseAnalyticsFiltersReturn {
  const effectiveYear = useEffectiveYear();
  const [selectedYear, setSelectedYearState] = useState<number | null>(null);
  const [selectedPhase, setSelectedPhaseState] = useState<"phase1" | "phase2" | "all">("all");
  const [filters, setFiltersState] = useState<AnalyticsFilters>(DEFAULT_FILTERS);

  // Sync with global effective year on mount and when it changes
  useEffect(() => {
    if (effectiveYear !== null) {
      setSelectedYearState(effectiveYear);
      setFiltersState((prev) => ({
        ...prev,
        year: effectiveYear,
      }));
    }
  }, [effectiveYear]);

  // Set year and sync with filters
  const setSelectedYear = useCallback((year: number | null) => {
    setSelectedYearState(year);
    setFiltersState((prev) => ({
      ...prev,
      year: year ?? undefined,
    }));
  }, []);

  // Set phase and sync with filters
  const setSelectedPhase = useCallback((phase: "phase1" | "phase2" | "all") => {
    setSelectedPhaseState(phase);
    setFiltersState((prev) => ({
      ...prev,
      phase: phase === "all" ? undefined : phase,
    }));
  }, []);

  // Set all filters at once
  const setFilters = useCallback((newFilters: AnalyticsFilters) => {
    setFiltersState(newFilters);
  }, []);

  // Update a single filter key
  const updateFilter = useCallback(
    <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => {
      setFiltersState((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  // Clear all filters (resets to effective year)
  const clearAllFilters = useCallback(() => {
    setSelectedYearState(effectiveYear);
    setSelectedPhaseState("all");
    setFiltersState({
      ...DEFAULT_FILTERS,
      year: effectiveYear ?? undefined,
    });
  }, [effectiveYear]);

  // Clear just the year filter (resets to effective year)
  const clearYearFilter = useCallback(() => {
    setSelectedYearState(effectiveYear);
    setFiltersState((prev) => ({
      ...prev,
      year: effectiveYear ?? undefined,
    }));
  }, [effectiveYear]);

  // Clear just the phase filter
  const clearPhaseFilter = useCallback(() => {
    setSelectedPhaseState("all");
    setFiltersState((prev) => ({
      ...prev,
      phase: undefined,
    }));
  }, []);

  // Check if any filters are active (different from defaults)
  const hasActiveFilters = useMemo(() => {
    const yearDiffers = selectedYear !== effectiveYear;
    return yearDiffers || selectedPhase !== "all";
  }, [selectedYear, effectiveYear, selectedPhase]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedYear !== effectiveYear) count++;
    if (selectedPhase !== "all") count++;
    return count;
  }, [selectedYear, effectiveYear, selectedPhase]);

  // Generate filter labels for display
  const activeFilterLabels = useMemo(() => {
    const labels: { key: string; label: string; onClear: () => void }[] = [];

    if (selectedYear !== null) {
      labels.push({
        key: "year",
        label: `Year: ${selectedYear}`,
        onClear: clearYearFilter,
      });
    }

    if (selectedPhase !== "all") {
      const phaseLabel = selectedPhase === "phase1"
        ? "Phase 1: Table Assessment"
        : "Phase 2: Table Validation";
      labels.push({
        key: "phase",
        label: phaseLabel,
        onClear: clearPhaseFilter,
      });
    }

    return labels;
  }, [selectedYear, selectedPhase, clearYearFilter, clearPhaseFilter]);

  return {
    // State
    selectedYear,
    selectedPhase,
    filters,

    // Setters
    setSelectedYear,
    setSelectedPhase,
    setFilters,
    updateFilter,

    // Actions
    clearAllFilters,
    clearYearFilter,
    clearPhaseFilter,

    // Computed
    hasActiveFilters,
    activeFilterCount,
    activeFilterLabels,
  };
}
