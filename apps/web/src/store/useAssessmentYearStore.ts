import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Assessment year state interface for the global year store
 *
 * This store manages the currently selected assessment year across the app.
 * It persists the user's year selection and provides the year context
 * for all assessment-related queries.
 */
interface AssessmentYearState {
  /** Currently selected assessment year (e.g., 2025) */
  selectedYear: number | null;
  /** List of years accessible to the current user */
  accessibleYears: number[];
  /** The active year from the system (may differ from selected) */
  activeYear: number | null;
  /** Whether year data is being loaded */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;

  /** Set the selected assessment year */
  setSelectedYear: (year: number) => void;
  /** Set the list of accessible years */
  setAccessibleYears: (years: number[]) => void;
  /** Set the active year from the system */
  setActiveYear: (year: number | null) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Initialize state from API response */
  initialize: (data: { years: number[]; activeYear: number | null }) => void;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Zustand store for managing global assessment year state
 *
 * This store:
 * - Persists the user's selected year in localStorage
 * - Provides the year context for all assessment-related API calls
 * - Handles year switching across the application
 * - Falls back to the active year if no selection is made
 *
 * Usage:
 * ```tsx
 * const { selectedYear, setSelectedYear } = useAssessmentYearStore();
 *
 * // Get the effective year (selected or active)
 * const effectiveYear = selectedYear ?? activeYear;
 *
 * // Pass to API hooks
 * useGetAssessmentsMyAssessment({ year: effectiveYear });
 * ```
 */
export const useAssessmentYearStore = create<AssessmentYearState>()(
  persist(
    (set, get) => ({
      selectedYear: null,
      accessibleYears: [],
      activeYear: null,
      isLoading: false,
      error: null,

      setSelectedYear: (year) => {
        const { accessibleYears } = get();
        // Only set if the year is accessible
        if (accessibleYears.includes(year)) {
          set({ selectedYear: year, error: null });
        }
      },

      setAccessibleYears: (years) => {
        // Atomic update to prevent race conditions
        set((state) => ({
          accessibleYears: years,
          // If current selection is not in new list, reset to null
          selectedYear:
            state.selectedYear && years.includes(state.selectedYear) ? state.selectedYear : null,
        }));
      },

      setActiveYear: (year) => set({ activeYear: year }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      initialize: ({ years, activeYear }) => {
        const { selectedYear } = get();

        // Update accessible years and active year
        set({
          accessibleYears: years,
          activeYear,
          isLoading: false,
          error: null,
        });

        // If no year selected, or selected year is no longer accessible,
        // default to active year
        if (!selectedYear || !years.includes(selectedYear)) {
          set({ selectedYear: activeYear });
        }
      },

      reset: () =>
        set({
          selectedYear: null,
          accessibleYears: [],
          activeYear: null,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: "assessment-year-storage",
      version: 1,
      // Only persist the selected year, not the full state
      partialize: (state) => ({
        selectedYear: state.selectedYear,
      }),
    }
  )
);

/**
 * Hook to get the effective assessment year
 *
 * Returns the selected year if set, otherwise falls back to the active year.
 * This is the year that should be used for all assessment-related queries.
 */
export function useEffectiveYear(): number | null {
  const { selectedYear, activeYear } = useAssessmentYearStore();
  return selectedYear ?? activeYear;
}

/**
 * Hook to check if the current year is the active year
 *
 * Useful for determining if the user is viewing historical data
 * vs the current assessment period.
 */
export function useIsActiveYear(): boolean {
  const { selectedYear, activeYear } = useAssessmentYearStore();
  if (!activeYear) return false;
  return (selectedYear ?? activeYear) === activeYear;
}
