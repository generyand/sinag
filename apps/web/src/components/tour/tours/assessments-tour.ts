import type { TourStep, TourLanguage } from "@/providers/TourProvider";
import { assessmentsTourTranslations, getStepTranslation } from "../tour-translations";

/**
 * Generate assessments page tour steps with translations
 * @param language - Current tour language
 * @returns Array of tour steps for the assessments page
 */
export function getAssessmentsTourSteps(language: TourLanguage): TourStep[] {
  return [
    // Step 1: Assessment Header
    {
      target: '[data-tour="assessment-header"]',
      content: getStepTranslation(assessmentsTourTranslations.assessmentHeader, language).content,
      title: getStepTranslation(assessmentsTourTranslations.assessmentHeader, language).title,
      placement: "bottom",
      disableBeacon: true,
      showOnPaths: ["/blgu/assessments"],
    },
    // Step 2: Tree Navigator (desktop)
    {
      target: '[data-tour="tree-navigator"]',
      content: getStepTranslation(assessmentsTourTranslations.treeNavigator, language).content,
      title: getStepTranslation(assessmentsTourTranslations.treeNavigator, language).title,
      placement: "right",
      showOnPaths: ["/blgu/assessments"],
    },
    // Step 3: Indicator Status Icons
    {
      target: '[data-tour="indicator-status"]',
      content: getStepTranslation(assessmentsTourTranslations.indicatorStatus, language).content,
      title: getStepTranslation(assessmentsTourTranslations.indicatorStatus, language).title,
      placement: "right",
      showOnPaths: ["/blgu/assessments"],
    },
    // Step 4: Content Panel
    {
      target: '[data-tour="content-panel"]',
      content: getStepTranslation(assessmentsTourTranslations.contentPanel, language).content,
      title: getStepTranslation(assessmentsTourTranslations.contentPanel, language).title,
      placement: "left",
      showOnPaths: ["/blgu/assessments"],
    },
    // Step 5: Mobile Navigation Button (shown on mobile)
    {
      target: '[data-tour="mobile-nav-button"]',
      content: getStepTranslation(assessmentsTourTranslations.mobileNavButton, language).content,
      title: getStepTranslation(assessmentsTourTranslations.mobileNavButton, language).title,
      placement: "top",
      showOnPaths: ["/blgu/assessments"],
    },
    // Step 6: Navigate to Indicator Form (transition step)
    {
      target: '[data-tour="content-panel"]',
      content: getStepTranslation(assessmentsTourTranslations.navigateToIndicator, language)
        .content,
      title: getStepTranslation(assessmentsTourTranslations.navigateToIndicator, language).title,
      placement: "left",
      showOnPaths: ["/blgu/assessments"],
      // Note: Navigation will be handled dynamically based on selected indicator
    },
  ];
}
