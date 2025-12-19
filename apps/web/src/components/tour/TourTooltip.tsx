"use client";

import { TooltipRenderProps } from "react-joyride";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourTooltipProps extends TooltipRenderProps {
  totalSteps: number;
  currentStep: number;
  language: "en" | "fil" | "ceb";
}

// Translations for UI elements
const translations = {
  en: {
    step: "Step",
    of: "of",
    skip: "Skip tour",
    back: "Back",
    next: "Next",
    finish: "Finish",
    close: "Close",
  },
  fil: {
    step: "Hakbang",
    of: "ng",
    skip: "Laktawan",
    back: "Bumalik",
    next: "Susunod",
    finish: "Tapos na",
    close: "Isara",
  },
  ceb: {
    step: "Lakang",
    of: "sa",
    skip: "Laktaw",
    back: "Balik",
    next: "Sunod",
    finish: "Human na",
    close: "Sirad-i",
  },
};

export function TourTooltip({
  backProps,
  closeProps,
  continuous,
  index,
  isLastStep,
  primaryProps,
  skipProps,
  step,
  tooltipProps,
  totalSteps,
  currentStep,
  language,
}: TourTooltipProps) {
  const t = translations[language];

  return (
    <div
      {...tooltipProps}
      className={cn(
        "bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700",
        "max-w-sm sm:max-w-md w-full sm:w-auto p-0 overflow-hidden",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        // Ensure tooltip doesn't overflow viewport
        "mx-2 sm:mx-0"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {t.step} {currentStep + 1} {t.of} {totalSteps}
          </span>
        </div>
        <button
          {...closeProps}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={t.close}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="p-4">
        {step.title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {step.title}
          </h3>
        )}
        <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {step.content}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        {/* Skip button (subtle) */}
        <button
          {...skipProps}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline-offset-4 hover:underline transition-colors"
        >
          {t.skip}
        </button>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {index > 0 && (
            <Button {...backProps} variant="outline" size="sm" className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              {t.back}
            </Button>
          )}
          {continuous && (
            <Button {...primaryProps} size="sm" className="gap-1">
              {isLastStep ? t.finish : t.next}
              {!isLastStep && <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
