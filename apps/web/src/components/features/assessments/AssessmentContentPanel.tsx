"use client";

import { useIndicatorNavigation } from "@/hooks/useIndicatorNavigation";
import { useReworkContext } from "@/hooks/useReworkContext";
import { Assessment, Indicator } from "@/types/assessment";
import { ArrowLeft, FileText } from "lucide-react";
import { useRef } from "react";
import { ReworkAlertBanner } from "../rework";
import { TechNotesPDF } from "../shared/TechNotesPDF";
import { RecursiveIndicator } from "./IndicatorAccordion";
import { TreeNavigator } from "./tree-navigation";

interface AssessmentContentPanelProps {
  assessment: Assessment;
  selectedIndicator: Indicator | null;
  isLocked: boolean;
  updateAssessmentData?: (updater: (data: Assessment) => Assessment) => void;
  onIndicatorSelect?: (indicatorId: string) => void;
  /** Callback to clear indicator selection and go back to list (mobile) */
  onBackToList?: () => void;
  movAnnotations?: Record<number, any[]>;
  dashboardData?: any; // BLGUDashboardResponse for rework context
  /** MOV file IDs flagged by MLGOO for recalibration */
  mlgooFlaggedFileIds?: Array<{ mov_file_id: number; comment?: string | null }>;
}

export function AssessmentContentPanel({
  assessment,
  selectedIndicator,
  isLocked,
  updateAssessmentData,
  onIndicatorSelect,
  onBackToList,
  movAnnotations = {},
  dashboardData,
  mlgooFlaggedFileIds = [],
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
      <div className="h-full flex flex-col bg-[var(--background)]">
        {/* Desktop & Tablet (md+): Centered empty state */}
        <div className="hidden md:flex h-full items-center justify-center p-8">
          <div className="text-center max-w-md w-full">
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

        {/* Mobile only (< md): Show TreeNavigator directly in content area */}
        <div className="md:hidden h-full overflow-hidden">
          <TreeNavigator
            assessment={assessment}
            selectedIndicatorId={null}
            onIndicatorSelect={onIndicatorSelect || (() => {})}
          />
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
      {/* Mobile Back Button - Only show on mobile when indicator is selected */}
      {onBackToList && (
        <div className="md:hidden sticky top-0 z-10 bg-[var(--card)] border-b border-[var(--border)]">
          <button
            onClick={onBackToList}
            className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--hover)] transition-colors active:bg-[var(--hover)]"
            aria-label="Back to indicator list"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Indicators</span>
          </button>
        </div>
      )}

      {/* Scrollable Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Tech Notes PDF - at top, based on governance area */}
          {selectedIndicator?.governanceAreaId && (
            <div className="mb-6">
              <TechNotesPDF
                areaNumber={Number(selectedIndicator.governanceAreaId)}
                areaName={
                  assessment.governanceAreas?.find(
                    (a) => String(a.id) === String(selectedIndicator.governanceAreaId)
                  )?.name
                }
              />
            </div>
          )}

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
              mlgooFlaggedFileIds={mlgooFlaggedFileIds}
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
