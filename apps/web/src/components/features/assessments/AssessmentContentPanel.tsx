"use client";

import { useIndicatorNavigation } from "@/hooks/useIndicatorNavigation";
import { useReworkContext } from "@/hooks/useReworkContext";
import { Assessment, Indicator } from "@/types/assessment";
import { FileText } from "lucide-react";
import { useRef } from "react";
import { ReworkAlertBanner } from "../rework";
import { RecursiveIndicator } from "./IndicatorAccordion";

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
      <div className="h-full flex items-center justify-center bg-[var(--background)] p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-[var(--card)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[var(--border)]">
            <FileText className="h-10 w-10 text-[var(--text-secondary)] opacity-50" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">
            Select an Indicator
          </h3>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Choose an indicator from the navigation panel on the left to view its details and
            complete the assessment requirements.
          </p>
        </div>
      </div>
    );
  }

  // Check if indicator needs rework
  // Also check for calibration rework - only calibrated governance areas should be editable
  const isCalibrationRework = dashboardData?.is_calibration_rework === true;
  const calibrationGovernanceAreaIds: string[] = (
    dashboardData?.calibration_governance_areas || []
  ).map((a: any) => String(a.governance_area_id));

  // During calibration rework, lock indicators NOT in calibration areas
  const isLockedDueToCalibration =
    isCalibrationRework &&
    calibrationGovernanceAreaIds.length > 0 &&
    !calibrationGovernanceAreaIds.includes(String(selectedIndicator.governanceAreaId));

  const indicatorLocked =
    isLocked ||
    isLockedDueToCalibration ||
    (assessment.status === "Needs Rework" && !selectedIndicator.requiresRework);

  // Get MOV annotations for the selected indicator
  const indicatorAnnotations = selectedIndicator
    ? movAnnotations[parseInt(selectedIndicator.id)] || []
    : [];

  return (
    <div className="h-full flex flex-col bg-[var(--background)]">
      {/* Scrollable Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Form Content */}
          <div className="space-y-6">
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
            <div className="mt-6">
              <ReworkAlertBanner
                indicator={reworkContext.current_indicator}
                assessmentId={resolvedAssessmentId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
