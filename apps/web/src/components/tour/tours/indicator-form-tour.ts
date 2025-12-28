import type { TourStep, TourLanguage } from "@/providers/TourProvider";
import { indicatorFormTourTranslations, getStepTranslation } from "../tour-translations";

/**
 * Generate indicator form tour steps with translations
 * @param language - Current tour language
 * @returns Array of tour steps for the indicator form
 */
export function getIndicatorFormTourSteps(language: TourLanguage): TourStep[] {
  return [
    // Step 1: Breadcrumb Navigation
    {
      target: '[data-tour="breadcrumb"]',
      content: getStepTranslation(indicatorFormTourTranslations.breadcrumb, language).content,
      title: getStepTranslation(indicatorFormTourTranslations.breadcrumb, language).title,
      placement: "bottom",
      disableBeacon: true,
      showOnPaths: ["/blgu/assessment/"],
    },
    // Step 2: Technical Notes
    {
      target: '[data-tour="technical-notes"]',
      content: getStepTranslation(indicatorFormTourTranslations.technicalNotes, language).content,
      title: getStepTranslation(indicatorFormTourTranslations.technicalNotes, language).title,
      placement: "bottom",
      showOnPaths: ["/blgu/assessment/"],
    },
    // Step 3: Form Fields
    {
      target: '[data-tour="form-fields"]',
      content: getStepTranslation(indicatorFormTourTranslations.formFields, language).content,
      title: getStepTranslation(indicatorFormTourTranslations.formFields, language).title,
      placement: "top",
      showOnPaths: ["/blgu/assessment/"],
    },
    // Step 4: MOV Upload
    {
      target: '[data-tour="mov-upload"]',
      content: getStepTranslation(indicatorFormTourTranslations.movUpload, language).content,
      title: getStepTranslation(indicatorFormTourTranslations.movUpload, language).title,
      placement: "top",
      showOnPaths: ["/blgu/assessment/"],
    },
    // Step 5: Save Button
    {
      target: '[data-tour="save-button"]',
      content: getStepTranslation(indicatorFormTourTranslations.saveButton, language).content,
      title: getStepTranslation(indicatorFormTourTranslations.saveButton, language).title,
      placement: "top",
      showOnPaths: ["/blgu/assessment/"],
    },
    // Step 6: Tour Complete
    {
      target: "body",
      content: getStepTranslation(indicatorFormTourTranslations.tourComplete, language).content,
      title: getStepTranslation(indicatorFormTourTranslations.tourComplete, language).title,
      placement: "center",
      showOnPaths: ["/blgu/assessment/"],
    },
  ];
}
