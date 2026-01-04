"use client";

import { useEffect, useRef, useState } from "react";
import { useTour, TourName } from "@/providers/TourProvider";
import { useAuthStore } from "@/store/useAuthStore";

interface UseTourAutoStartOptions {
  /** The tour to potentially auto-start */
  tourName: TourName;
  /** Whether to only auto-start for first-time users */
  firstTimeOnly?: boolean;
  /** Delay in ms before starting the tour (for page load) */
  delay?: number;
  /** Whether to check for BLGU role */
  blguOnly?: boolean;
}

/**
 * LocalStorage key for tracking tours that have been started.
 * This provides client-side persistence as a fallback when backend
 * mutation might not complete before user closes the tab.
 */
const TOUR_STARTED_KEY = "sinag_tours_started";

/**
 * Check if a tour has been started (localStorage fallback)
 */
function getTourStartedFromStorage(tourName: TourName): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(TOUR_STARTED_KEY);
    if (!stored) return false;
    const tours = JSON.parse(stored) as Record<string, boolean>;
    return tours[tourName] === true;
  } catch {
    return false;
  }
}

/**
 * Mark a tour as started in localStorage (fallback persistence)
 */
function setTourStartedInStorage(tourName: TourName): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(TOUR_STARTED_KEY);
    const tours = stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
    tours[tourName] = true;
    localStorage.setItem(TOUR_STARTED_KEY, JSON.stringify(tours));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Hook to automatically start a tour for first-time users
 * Use this on BLGU pages to trigger the onboarding tour
 *
 * Uses both backend preferences AND localStorage as a fallback to prevent
 * the tour from reappearing when the user closes and reopens the tab
 * before the backend mutation completes.
 *
 * @example
 * // In a BLGU page component
 * useTourAutoStart({ tourName: "dashboard", firstTimeOnly: true, delay: 1000 });
 */
export function useTourAutoStart({
  tourName,
  firstTimeOnly = true,
  delay = 1500,
  blguOnly = true,
}: UseTourAutoStartOptions) {
  const { shouldShowTour, startTour, isRunning, isLoading, isTourCompleted } = useTour();
  const { user, isAuthenticated } = useAuthStore();
  const hasCheckedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasStartedTour, setHasStartedTour] = useState(false);

  useEffect(() => {
    // Prevent multiple checks - this persists across re-renders and page visits
    if (hasCheckedRef.current) return;

    // Wait for authentication
    if (!isAuthenticated || !user) return;

    // Wait for preferences to load before deciding
    if (isLoading) return;

    // Check BLGU role if required
    if (blguOnly && user.role !== "BLGU_USER") return;

    // Don't start if another tour is running
    if (isRunning) return;

    // Mark as checked BEFORE checking shouldShowTour
    // This ensures we only check once per page mount, even if preferences change
    hasCheckedRef.current = true;

    // Check localStorage fallback first - this catches cases where the backend
    // mutation might not have completed before the user closed the tab
    const alreadyStartedLocally = getTourStartedFromStorage(tourName);
    if (alreadyStartedLocally) {
      return;
    }

    // Also check if tour is already completed in backend
    if (isTourCompleted(tourName)) {
      return;
    }

    // Check if we should show the tour based on backend preferences
    const shouldStart = firstTimeOnly ? shouldShowTour(tourName) : true;

    if (!shouldStart) return;

    // Mark as started in localStorage immediately (before the delay)
    // This ensures persistence even if user closes tab during the delay
    setTourStartedInStorage(tourName);

    // Start the tour after a delay to allow page content to render
    timerRef.current = setTimeout(() => {
      setHasStartedTour(true);
      startTour(tourName);
    }, delay);

    return () => {
      // Clear the timer on cleanup
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    isAuthenticated,
    user,
    blguOnly,
    isRunning,
    isLoading,
    firstTimeOnly,
    shouldShowTour,
    isTourCompleted,
    tourName,
    startTour,
    delay,
  ]);

  return {
    hasStartedTour,
  };
}
