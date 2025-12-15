import type { TourStep, TourLanguage } from "@/providers/TourProvider";
import { reworkTourTranslations, getStepTranslation } from "../tour-translations";

/**
 * Generate rework tour steps with translations
 * This tour is only shown when assessment status is REWORK
 * @param language - Current tour language
 * @returns Array of tour steps for the rework workflow
 */
export function getReworkTourSteps(language: TourLanguage): TourStep[] {
  return [
    // Step 1: Rework Alert Banner
    {
      target: '[data-tour="rework-alert"]',
      content: getStepTranslation(reworkTourTranslations.reworkAlert, language).content,
      title: getStepTranslation(reworkTourTranslations.reworkAlert, language).title,
      placement: "bottom",
      disableBeacon: true,
      showOnPaths: ["/blgu/dashboard", "/blgu/rework-summary"],
    },
    // Step 2: AI Summary Panel
    {
      target: '[data-tour="ai-summary-panel"]',
      content: getStepTranslation(reworkTourTranslations.aiSummaryPanel, language).content,
      title: getStepTranslation(reworkTourTranslations.aiSummaryPanel, language).title,
      placement: "top",
      showOnPaths: ["/blgu/dashboard", "/blgu/rework-summary"],
    },
    // Step 3: Rework Indicators List
    {
      target: '[data-tour="rework-indicators-list"]',
      content: getStepTranslation(reworkTourTranslations.reworkIndicatorsList, language).content,
      title: getStepTranslation(reworkTourTranslations.reworkIndicatorsList, language).title,
      placement: "top",
      showOnPaths: ["/blgu/dashboard", "/blgu/rework-summary"],
    },
    // Step 4: Priority Actions
    {
      target: '[data-tour="priority-actions"]',
      content: getStepTranslation(reworkTourTranslations.priorityActions, language).content,
      title: getStepTranslation(reworkTourTranslations.priorityActions, language).title,
      placement: "top",
      showOnPaths: ["/blgu/rework-summary"],
    },
    // Step 5: Start Fixing Button
    {
      target: '[data-tour="start-fixing-button"]',
      content: getStepTranslation(reworkTourTranslations.startFixingButton, language).content,
      title: getStepTranslation(reworkTourTranslations.startFixingButton, language).title,
      placement: "top",
      showOnPaths: ["/blgu/dashboard", "/blgu/rework-summary"],
    },
  ];
}
