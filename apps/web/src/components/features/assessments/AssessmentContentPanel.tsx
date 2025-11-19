"use client";

import { Assessment, Indicator } from "@/types/assessment";
import { FileText } from "lucide-react";
import { RecursiveIndicator } from "./IndicatorAccordion";
import { ReworkCommentsPanel } from "./rework/ReworkCommentsPanel";
import { IndicatorNavigationFooter } from "./IndicatorNavigationFooter";
import { useIndicatorNavigation } from "@/hooks/useIndicatorNavigation";
import { useRef } from "react";

interface AssessmentContentPanelProps {
  assessment: Assessment;
  selectedIndicator: Indicator | null;
  isLocked: boolean;
  updateAssessmentData?: (updater: (data: Assessment) => Assessment) => void;
  onIndicatorSelect?: (indicatorId: string) => void;
}

export function AssessmentContentPanel({
  assessment,
  selectedIndicator,
  isLocked,
  updateAssessmentData,
  onIndicatorSelect,
}: AssessmentContentPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Navigation hook
  const navigation = useIndicatorNavigation(
    assessment,
    selectedIndicator?.id || null,
    onIndicatorSelect
  );

  const resolvedAssessmentId = Number(assessment.id);

  // Show empty state if no indicator selected
  if (!selectedIndicator) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--background)]">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-[var(--hover)] rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-[var(--text-secondary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            Select an Indicator
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Choose an indicator from the navigation panel to view and complete the assessment form.
          </p>
        </div>
      </div>
    );
  }

  // Check if indicator needs rework
  const indicatorLocked =
    isLocked ||
    (assessment.status === "Needs Rework" && !selectedIndicator.requiresRework);

  return (
    <div className="h-full flex flex-col bg-[var(--background)]">
      {/* Scrollable Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Rework Comments (if applicable) */}
          {selectedIndicator.status === "needs_rework" &&
            selectedIndicator.assessorComment &&
            Number.isFinite(resolvedAssessmentId) && (
              <ReworkCommentsPanel assessmentId={resolvedAssessmentId} />
            )}

          {/* Form Content */}
          <div className="pb-8">
            <RecursiveIndicator
              indicator={selectedIndicator}
              isLocked={indicatorLocked}
              updateAssessmentData={updateAssessmentData}
              currentCode={navigation.current?.indicator.code}
              currentPosition={navigation.position}
              totalIndicators={navigation.total}
              hasPrevious={navigation.hasPrevious}
              hasNext={navigation.hasNext}
              onPrevious={navigation.navigatePrevious}
              onNext={navigation.navigateNext}
              level={0}
            />
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <IndicatorNavigationFooter
        currentCode={navigation.current?.indicator.code}
        currentPosition={navigation.position}
        totalIndicators={navigation.total}
        hasPrevious={navigation.hasPrevious}
        hasNext={navigation.hasNext}
        onPrevious={navigation.navigatePrevious}
        onNext={navigation.navigateNext}
        isLocked={isLocked}
      />
    </div>
  );
}
