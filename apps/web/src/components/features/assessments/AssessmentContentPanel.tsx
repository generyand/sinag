"use client";

import { Assessment, Indicator } from "@/types/assessment";
import { FileText } from "lucide-react";
import { RecursiveIndicator } from "./IndicatorAccordion";
import { ReworkCommentsPanel } from "./rework/ReworkCommentsPanel";
import { ReworkAlertBanner } from "../rework";
import { useIndicatorNavigation } from "@/hooks/useIndicatorNavigation";
import { useReworkContext } from "@/hooks/useReworkContext";
import { useRef } from "react";

interface AssessmentContentPanelProps {
  assessment: Assessment;
  selectedIndicator: Indicator | null;
  isLocked: boolean;
  updateAssessmentData?: (updater: (data: Assessment) => Assessment) => void;
  onIndicatorSelect?: (indicatorId: string) => void;
  movAnnotations?: Record<number, any[]>;
  dashboardData?: any; // BLGUDashboardResponse for rework context
}

export function AssessmentContentPanel({
  assessment,
  selectedIndicator,
  isLocked,
  updateAssessmentData,
  onIndicatorSelect,
  movAnnotations = {},
  dashboardData,
}: AssessmentContentPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Navigation hook
  const navigation = useIndicatorNavigation(
    assessment,
    selectedIndicator?.id || null,
    onIndicatorSelect
  );

  const resolvedAssessmentId = Number(assessment.id);

  // Rework context - for showing assessor feedback
  const reworkContext = useReworkContext(
    dashboardData,
    selectedIndicator ? parseInt(selectedIndicator.id) : undefined,
    resolvedAssessmentId
  );

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

  // Get MOV annotations for the selected indicator
  const indicatorAnnotations = selectedIndicator
    ? movAnnotations[parseInt(selectedIndicator.id)] || []
    : [];

  return (
    <div className="h-full flex flex-col bg-[var(--background)]">
      {/* Scrollable Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
              movAnnotations={indicatorAnnotations}
            />
          </div>

          {/* Rework Alert Banner - Shows indicator-specific assessor feedback at the bottom */}
          {reworkContext?.current_indicator && (
            <ReworkAlertBanner
              indicator={reworkContext.current_indicator}
              assessmentId={resolvedAssessmentId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
