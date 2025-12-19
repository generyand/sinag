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
 * Hook to automatically start a tour for first-time users
 * Use this on BLGU pages to trigger the onboarding tour
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
  const { shouldShowTour, startTour, isRunning, isLoading } = useTour();
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

    // Check if we should show the tour
    const shouldStart = firstTimeOnly ? shouldShowTour(tourName) : true;

    if (!shouldStart) return;

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
    tourName,
    startTour,
    delay,
  ]);

  return {
    hasStartedTour,
  };
}
