import type { TourStep, TourLanguage } from "@/providers/TourProvider";
import { dashboardTourTranslations, getStepTranslation } from "../tour-translations";

/**
 * Generate dashboard tour steps with translations
 * @param language - Current tour language
 * @returns Array of tour steps for the dashboard
 */
export function getDashboardTourSteps(language: TourLanguage): TourStep[] {
  return [
    // Step 1: Welcome (no target - centered modal)
    {
      target: "body",
      content: getStepTranslation(dashboardTourTranslations.welcome, language).content,
      title: getStepTranslation(dashboardTourTranslations.welcome, language).title,
      placement: "center",
      disableBeacon: true,
      showOnPaths: ["/blgu/dashboard"],
    },
    // Step 2: Assessment Progress - shows overall progress percentage
    {
      target: '[data-tour="assessment-progress"]',
      content: getStepTranslation(dashboardTourTranslations.assessmentProgress, language).content,
      title: getStepTranslation(dashboardTourTranslations.assessmentProgress, language).title,
      placement: "right",
      showOnPaths: ["/blgu/dashboard"],
    },
    // Step 3: Phase Timeline (auto placement adjusts for mobile/desktop)
    // Note: Year Selector step removed because the component only renders when multiple years exist
    {
      target: '[data-tour="phase-timeline"]',
      content: getStepTranslation(dashboardTourTranslations.phaseTimeline, language).content,
      title: getStepTranslation(dashboardTourTranslations.phaseTimeline, language).title,
      placement: "auto",
      showOnPaths: ["/blgu/dashboard"],
    },
    // Step 4: Phase 1 Section - left placement works better for large cards
    {
      target: '[data-tour="phase-1-section"]',
      content: getStepTranslation(dashboardTourTranslations.phase1Section, language).content,
      title: getStepTranslation(dashboardTourTranslations.phase1Section, language).title,
      placement: "left",
      showOnPaths: ["/blgu/dashboard"],
    },
    // Step 5: Completion Metrics - top to avoid overlapping with content below
    {
      target: '[data-tour="completion-metrics"]',
      content: getStepTranslation(dashboardTourTranslations.completionMetrics, language).content,
      title: getStepTranslation(dashboardTourTranslations.completionMetrics, language).title,
      placement: "top",
      showOnPaths: ["/blgu/dashboard"],
    },
    // Step 6: Submit Button - bottom to show tooltip below button
    {
      target: '[data-tour="submit-button"]',
      content: getStepTranslation(dashboardTourTranslations.submitButton, language).content,
      title: getStepTranslation(dashboardTourTranslations.submitButton, language).title,
      placement: "bottom",
      showOnPaths: ["/blgu/dashboard"],
    },
    // Step 7: Navigate to Assessments (transition step)
    {
      target: '[data-tour="submit-button"]',
      content: getStepTranslation(dashboardTourTranslations.navigateToAssessments, language)
        .content,
      title: getStepTranslation(dashboardTourTranslations.navigateToAssessments, language).title,
      placement: "bottom",
      showOnPaths: ["/blgu/dashboard"],
      navigateTo: "/blgu/assessments",
    },
  ];
}
