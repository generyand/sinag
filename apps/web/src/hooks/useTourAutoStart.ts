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
  const hasTriggeredRef = useRef(false);
  const [hasStartedTour, setHasStartedTour] = useState(false);

  useEffect(() => {
    // Prevent multiple triggers across re-renders
    if (hasTriggeredRef.current) return;

    // Wait for authentication
    if (!isAuthenticated || !user) return;

    // Wait for preferences to load before deciding
    if (isLoading) return;

    // Check BLGU role if required
    if (blguOnly && user.role !== "BLGU_USER") return;

    // Don't start if another tour is running
    if (isRunning) return;

    // Check if we should show the tour
    if (firstTimeOnly && !shouldShowTour(tourName)) return;

    // Mark as triggered immediately to prevent race conditions
    // This prevents double-triggering if the effect runs again before timeout completes
    hasTriggeredRef.current = true;

    // Start the tour after a delay to allow page content to render
    const timer = setTimeout(() => {
      setHasStartedTour(true);
      startTour(tourName);
    }, delay);

    return () => {
      // On cleanup, reset the ref if the timer was cancelled
      // This allows the tour to be re-triggered if the user navigates away and back
      clearTimeout(timer);
      // Only reset if we haven't actually started the tour yet
      if (!hasStartedTour) {
        hasTriggeredRef.current = false;
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
    hasStartedTour,
  ]);

  return {
    hasStartedTour,
  };
}
