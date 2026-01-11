"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import Joyride, {
  CallBackProps,
  STATUS,
  ACTIONS,
  EVENTS,
  Step,
  TooltipRenderProps,
} from "react-joyride";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { TourTooltip } from "@/components/tour/TourTooltip";
import {
  useGetUsersMePreferences,
  usePostUsersMePreferencesTourTourNameComplete,
  usePostUsersMePreferencesTourSeen,
  usePostUsersMePreferencesTourReset,
  usePatchUsersMePreferencesTourLanguage,
  getGetUsersMePreferencesQueryKey,
} from "@sinag/shared";
import type { UserPreferencesResponse } from "@sinag/shared";

// Tour names
export type TourName = "dashboard" | "assessments" | "indicatorForm" | "rework";

// Language codes for tour content
export type TourLanguage = "en" | "fil" | "ceb";

// Tour state from backend
export interface TourCompletedState {
  dashboard: boolean;
  assessments: boolean;
  indicatorForm: boolean;
  rework: boolean;
}

export interface TourPreferences {
  hasSeenTour: boolean;
  completedTours: TourCompletedState;
  tourLanguage: TourLanguage;
}

// Extended step with navigation support
export interface TourStep extends Step {
  // Navigate to this path when clicking next on this step
  navigateTo?: string;
  // Only show this step on specific paths
  showOnPaths?: string[];
}

interface TourContextType {
  // Current tour state
  isRunning: boolean;
  currentTour: TourName | null;
  currentStepIndex: number;

  // Tour preferences
  preferences: TourPreferences;
  tourLanguage: TourLanguage;

  // Loading states
  isLoading: boolean;
  isMutating: boolean;

  // Actions
  startTour: (tourName: TourName) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  resetAllTours: () => Promise<void>;
  setTourLanguage: (language: TourLanguage) => Promise<void>;
  markTourComplete: (tourName: TourName) => Promise<void>;

  // Helper
  shouldShowTour: (tourName: TourName) => boolean;
  isTourCompleted: (tourName: TourName) => boolean;

  // For registering tour steps
  registerTourSteps: (tourName: TourName, steps: TourStep[]) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}

interface TourProviderProps {
  children: React.ReactNode;
}

const DEFAULT_PREFERENCES: TourPreferences = {
  hasSeenTour: false,
  completedTours: {
    dashboard: false,
    assessments: false,
    indicatorForm: false,
    rework: false,
  },
  tourLanguage: "en",
};

/**
 * Transforms the API response to our internal TourPreferences format.
 * Handles snake_case to camelCase conversion and provides defaults.
 */
function transformApiResponse(data: UserPreferencesResponse | undefined): TourPreferences {
  if (!data?.tour) {
    return DEFAULT_PREFERENCES;
  }

  const tour = data.tour;
  const completedTours = tour.completedTours;

  return {
    hasSeenTour: tour.hasSeenTour ?? false,
    completedTours: {
      dashboard: completedTours?.dashboard ?? false,
      assessments: completedTours?.assessments ?? false,
      // API uses snake_case (indicator_form), we use camelCase
      indicatorForm:
        (completedTours as Record<string, boolean>)?.indicator_form ??
        (completedTours as Record<string, boolean>)?.indicatorForm ??
        false,
      rework: completedTours?.rework ?? false,
    },
    tourLanguage: (tour.tourLanguage as TourLanguage) ?? "en",
  };
}

export function TourProvider({ children }: TourProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  // Tour state
  const [isRunning, setIsRunning] = useState(false);
  const [currentTour, setCurrentTour] = useState<TourName | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Registered tour steps
  const [tourStepsRegistry, setTourStepsRegistry] = useState<Record<TourName, TourStep[]>>({
    dashboard: [],
    assessments: [],
    indicatorForm: [],
    rework: [],
  });

  // Fetch preferences using generated hook
  // Use a longer staleTime to prevent unnecessary refetches
  // The cache will be explicitly invalidated when preferences are updated
  const { data: preferencesData, isLoading } = useGetUsersMePreferences({
    query: {
      queryKey: getGetUsersMePreferencesQueryKey(),
      enabled: isAuthenticated,
      staleTime: 30 * 60 * 1000, // 30 minutes - preferences don't change often
      gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
      refetchOnMount: "always", // Always refetch on mount to ensure fresh data
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    },
  });

  // Transform API response to internal format
  const preferences = useMemo(() => transformApiResponse(preferencesData), [preferencesData]);

  // Mutation hooks with cache invalidation
  const markTourCompleteMutation = usePostUsersMePreferencesTourTourNameComplete({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUsersMePreferencesQueryKey() });
      },
    },
  });

  const markTourSeenMutation = usePostUsersMePreferencesTourSeen({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUsersMePreferencesQueryKey() });
      },
    },
  });

  const resetToursMutation = usePostUsersMePreferencesTourReset({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUsersMePreferencesQueryKey() });
      },
    },
  });

  const setLanguageMutation = usePatchUsersMePreferencesTourLanguage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUsersMePreferencesQueryKey() });
      },
    },
  });

  // Combined mutation loading state
  const isMutating =
    markTourCompleteMutation.isPending ||
    markTourSeenMutation.isPending ||
    resetToursMutation.isPending ||
    setLanguageMutation.isPending;

  // Get current steps filtered by path
  const currentSteps = useMemo(() => {
    if (!currentTour) return [];
    const steps = tourStepsRegistry[currentTour] || [];

    // Filter steps by current path if showOnPaths is specified
    return steps.filter((step) => {
      if (!step.showOnPaths || step.showOnPaths.length === 0) return true;
      return step.showOnPaths.some((path) => pathname.startsWith(path));
    });
  }, [currentTour, tourStepsRegistry, pathname]);

  // Register tour steps
  const registerTourSteps = useCallback((tourName: TourName, steps: TourStep[]) => {
    setTourStepsRegistry((prev) => ({
      ...prev,
      [tourName]: steps,
    }));
  }, []);

  // Start a tour
  const startTour = useCallback((tourName: TourName) => {
    setCurrentTour(tourName);
    setCurrentStepIndex(0);
    setIsRunning(true);
  }, []);

  // Stop the tour
  const stopTour = useCallback(() => {
    setIsRunning(false);
    setCurrentTour(null);
    setCurrentStepIndex(0);
  }, []);

  // Navigate to next step
  const nextStep = useCallback(() => {
    if (currentStepIndex < currentSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStepIndex, currentSteps.length]);

  // Navigate to previous step
  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  // Skip tour (mark as complete so it doesn't show again)
  // User can manually restart tour via TourHelpButton if needed
  const skipTour = useCallback(async () => {
    const tourToMark = currentTour;
    stopTour();
    try {
      if (tourToMark) {
        // Mark the specific tour as complete to prevent it from showing again
        await markTourCompleteMutation.mutateAsync({ tourName: tourToMark });
      } else {
        // Fallback: at least mark as seen
        await markTourSeenMutation.mutateAsync();
      }
    } catch (error) {
      console.error("Failed to mark tour as skipped:", error);
    }
  }, [stopTour, currentTour, markTourCompleteMutation, markTourSeenMutation]);

  // Mark a specific tour as complete
  const markTourComplete = useCallback(
    async (tourName: TourName) => {
      try {
        await markTourCompleteMutation.mutateAsync({ tourName });
      } catch (error) {
        console.error("Failed to mark tour as complete:", error);
      }
    },
    [markTourCompleteMutation]
  );

  // Reset all tours
  const resetAllTours = useCallback(async () => {
    try {
      await resetToursMutation.mutateAsync();
    } catch (error) {
      console.error("Failed to reset tours:", error);
    }
  }, [resetToursMutation]);

  // Set tour language
  const setTourLanguage = useCallback(
    async (language: TourLanguage) => {
      try {
        await setLanguageMutation.mutateAsync({ params: { language } });
      } catch (error) {
        console.error("Failed to set tour language:", error);
      }
    },
    [setLanguageMutation]
  );

  // Check if should show tour (first time user)
  const shouldShowTour = useCallback(
    (tourName: TourName) => {
      return !preferences.hasSeenTour || !preferences.completedTours[tourName];
    },
    [preferences]
  );

  // Check if tour is completed
  const isTourCompleted = useCallback(
    (tourName: TourName) => {
      return preferences.completedTours[tourName];
    },
    [preferences]
  );

  // Handle Joyride callbacks
  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { action, index, status, type, step } = data;
      const tourStep = step as TourStep;

      // Handle finished or skipped
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        if (status === STATUS.FINISHED && currentTour) {
          markTourComplete(currentTour);
        } else if (status === STATUS.SKIPPED) {
          skipTour();
        }
        stopTour();
        return;
      }

      // Handle step changes
      if (type === EVENTS.STEP_AFTER) {
        // Check if we need to navigate
        if (action === ACTIONS.NEXT && tourStep.navigateTo) {
          // Navigate to the next page
          router.push(tourStep.navigateTo);
          // Increment step after navigation
          setCurrentStepIndex(index + 1);
        } else if (action === ACTIONS.NEXT) {
          nextStep();
        } else if (action === ACTIONS.PREV) {
          prevStep();
        }
      }

      // Handle close
      if (action === ACTIONS.CLOSE) {
        skipTour();
      }
    },
    [currentTour, markTourComplete, skipTour, stopTour, router, nextStep, prevStep]
  );

  // Custom tooltip renderer
  const tooltipComponent = useCallback(
    (props: TooltipRenderProps) => (
      <TourTooltip
        {...props}
        totalSteps={currentSteps.length}
        currentStep={currentStepIndex}
        language={preferences.tourLanguage}
      />
    ),
    [currentSteps.length, currentStepIndex, preferences.tourLanguage]
  );

  const contextValue = useMemo(
    () => ({
      isRunning,
      currentTour,
      currentStepIndex,
      preferences,
      tourLanguage: preferences.tourLanguage,
      isLoading,
      isMutating,
      startTour,
      stopTour,
      nextStep,
      prevStep,
      skipTour,
      resetAllTours,
      setTourLanguage,
      markTourComplete,
      shouldShowTour,
      isTourCompleted,
      registerTourSteps,
    }),
    [
      isRunning,
      currentTour,
      currentStepIndex,
      preferences,
      isLoading,
      isMutating,
      startTour,
      stopTour,
      nextStep,
      prevStep,
      skipTour,
      resetAllTours,
      setTourLanguage,
      markTourComplete,
      shouldShowTour,
      isTourCompleted,
      registerTourSteps,
    ]
  );

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      {isRunning && currentSteps.length > 0 && (
        <Joyride
          steps={currentSteps}
          stepIndex={currentStepIndex}
          run={isRunning}
          continuous
          showProgress
          showSkipButton
          disableOverlayClose
          spotlightClicks={false}
          spotlightPadding={8}
          scrollToFirstStep
          scrollOffset={100}
          disableScrolling={false}
          disableScrollParentFix={false}
          callback={handleJoyrideCallback}
          tooltipComponent={tooltipComponent}
          floaterProps={{
            disableAnimation: false,
            options: {
              // Better positioning to avoid viewport edges
              preventOverflow: {
                boundariesElement: "viewport",
                padding: 8,
              },
            },
          }}
          styles={{
            options: {
              primaryColor: "#2563eb",
              zIndex: 10000,
              arrowColor: "#ffffff",
              backgroundColor: "#ffffff",
              overlayColor: "rgba(0, 0, 0, 0.6)",
              textColor: "#1f2937",
              spotlightShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
            },
            spotlight: {
              borderRadius: 12,
            },
            overlay: {
              backgroundColor: "rgba(0, 0, 0, 0.6)",
            },
            // Override default tooltip styles to ensure proper mobile positioning
            tooltip: {
              maxWidth: "100%",
            },
            tooltipContainer: {
              textAlign: "left",
            },
          }}
          locale={{
            back:
              preferences.tourLanguage === "en"
                ? "Back"
                : preferences.tourLanguage === "fil"
                  ? "Bumalik"
                  : "Balik",
            close:
              preferences.tourLanguage === "en"
                ? "Close"
                : preferences.tourLanguage === "fil"
                  ? "Isara"
                  : "Sirad-i",
            last:
              preferences.tourLanguage === "en"
                ? "Finish"
                : preferences.tourLanguage === "fil"
                  ? "Tapos"
                  : "Human",
            next:
              preferences.tourLanguage === "en"
                ? "Next"
                : preferences.tourLanguage === "fil"
                  ? "Susunod"
                  : "Sunod",
            skip:
              preferences.tourLanguage === "en"
                ? "Skip"
                : preferences.tourLanguage === "fil"
                  ? "Laktawan"
                  : "Laktaw",
          }}
        />
      )}
    </TourContext.Provider>
  );
}
