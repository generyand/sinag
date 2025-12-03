"use client";

import { useState, useCallback, useMemo } from "react";
import type { SortConfig, SortableColumn, SortDirection } from "../utils/dataTransformers";

export interface SubmissionsFilters {
  searchQuery: string;
  statusFilter: string;
  areaFilter: string;
  assessorFilter: string;
}

interface UseSubmissionsFiltersReturn {
  filters: SubmissionsFilters;
  sortConfig: SortConfig | null;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  setAreaFilter: (area: string) => void;
  setAssessorFilter: (assessor: string) => void;
  handleSort: (key: SortableColumn) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

const DEFAULT_FILTERS: SubmissionsFilters = {
  searchQuery: "",
  statusFilter: "all",
  areaFilter: "all",
  assessorFilter: "all",
};

/**
 * Custom hook for managing submissions filter and sort state.
 */
export function useSubmissionsFilters(): UseSubmissionsFiltersReturn {
  const [filters, setFilters] = useState<SubmissionsFilters>(DEFAULT_FILTERS);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const setStatusFilter = useCallback((status: string) => {
    setFilters((prev) => ({ ...prev, statusFilter: status }));
  }, []);

  const setAreaFilter = useCallback((area: string) => {
    setFilters((prev) => ({ ...prev, areaFilter: area }));
  }, []);

  const setAssessorFilter = useCallback((assessor: string) => {
    setFilters((prev) => ({ ...prev, assessorFilter: assessor }));
  }, []);

  const handleSort = useCallback((key: SortableColumn) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        // Toggle direction if same column
        const newDirection: SortDirection = prev.direction === "asc" ? "desc" : "asc";
        return { key, direction: newDirection };
      }
      // Default to ascending for new column
      return { key, direction: "asc" };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSortConfig(null);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchQuery !== "" ||
      filters.statusFilter !== "all" ||
      filters.areaFilter !== "all" ||
      filters.assessorFilter !== "all"
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery !== "") count++;
    if (filters.statusFilter !== "all") count++;
    if (filters.areaFilter !== "all") count++;
    if (filters.assessorFilter !== "all") count++;
    return count;
  }, [filters]);

  return {
    filters,
    sortConfig,
    setSearchQuery,
    setStatusFilter,
    setAreaFilter,
    setAssessorFilter,
    handleSort,
    clearAllFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}
