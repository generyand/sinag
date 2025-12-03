"use client";

import { useState, useCallback, useMemo } from "react";

export interface AnalyticsFilters {
  cycle_id?: number;
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
  selectedCycle: number | null;
  selectedPhase: "phase1" | "phase2" | "all";
  filters: AnalyticsFilters;
}

interface UseAnalyticsFiltersReturn {
  // State
  selectedCycle: number | null;
  selectedPhase: "phase1" | "phase2" | "all";
  filters: AnalyticsFilters;

  // Setters
  setSelectedCycle: (cycleId: number | null) => void;
  setSelectedPhase: (phase: "phase1" | "phase2" | "all") => void;
  setFilters: (filters: AnalyticsFilters) => void;
  updateFilter: <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => void;

  // Actions
  clearAllFilters: () => void;
  clearCycleFilter: () => void;
  clearPhaseFilter: () => void;

  // Computed
  hasActiveFilters: boolean;
  activeFilterCount: number;
  activeFilterLabels: { key: string; label: string; onClear: () => void }[];
}

const DEFAULT_FILTERS: AnalyticsFilters = {
  cycle_id: undefined,
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
 */
export function useAnalyticsFilters(): UseAnalyticsFiltersReturn {
  const [selectedCycle, setSelectedCycleState] = useState<number | null>(null);
  const [selectedPhase, setSelectedPhaseState] = useState<"phase1" | "phase2" | "all">("all");
  const [filters, setFiltersState] = useState<AnalyticsFilters>(DEFAULT_FILTERS);

  // Set cycle and sync with filters
  const setSelectedCycle = useCallback((cycleId: number | null) => {
    setSelectedCycleState(cycleId);
    setFiltersState((prev) => ({
      ...prev,
      cycle_id: cycleId ?? undefined,
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

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSelectedCycleState(null);
    setSelectedPhaseState("all");
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Clear just the cycle filter
  const clearCycleFilter = useCallback(() => {
    setSelectedCycleState(null);
    setFiltersState((prev) => ({
      ...prev,
      cycle_id: undefined,
    }));
  }, []);

  // Clear just the phase filter
  const clearPhaseFilter = useCallback(() => {
    setSelectedPhaseState("all");
    setFiltersState((prev) => ({
      ...prev,
      phase: undefined,
    }));
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return selectedCycle !== null || selectedPhase !== "all";
  }, [selectedCycle, selectedPhase]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCycle !== null) count++;
    if (selectedPhase !== "all") count++;
    return count;
  }, [selectedCycle, selectedPhase]);

  // Generate filter labels for display
  const activeFilterLabels = useMemo(() => {
    const labels: { key: string; label: string; onClear: () => void }[] = [];

    if (selectedCycle !== null) {
      labels.push({
        key: "cycle",
        label: `Cycle: ${selectedCycle}`,
        onClear: clearCycleFilter,
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
  }, [selectedCycle, selectedPhase, clearCycleFilter, clearPhaseFilter]);

  return {
    // State
    selectedCycle,
    selectedPhase,
    filters,

    // Setters
    setSelectedCycle,
    setSelectedPhase,
    setFilters,
    updateFilter,

    // Actions
    clearAllFilters,
    clearCycleFilter,
    clearPhaseFilter,

    // Computed
    hasActiveFilters,
    activeFilterCount,
    activeFilterLabels,
  };
}
