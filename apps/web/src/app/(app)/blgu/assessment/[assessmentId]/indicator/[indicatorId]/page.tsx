// 📝 Dynamic Form Page
// Renders assessment indicator form with dynamic schema-driven fields

"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  MessageSquare,
  FileText,
} from "lucide-react";
import { DynamicFormRenderer } from "@/components/features/forms/DynamicFormRenderer";
import { LockedStateBanner } from "@/components/features/assessments";
import { ReworkAlertBanner, ReworkProgressTracker } from "@/components/features/rework";
import { useReworkContext } from "@/hooks/useReworkContext";
import {
  useGetIndicatorsIndicatorIdFormSchema,
  useGetIndicatorsIndicatorId,
  useGetBlguDashboardAssessmentId,
} from "@sinag/shared";

export default function IndicatorFormPage() {
  const params = useParams();

  // Extract route parameters
  const assessmentId = Number(params.assessmentId);
  const indicatorId = Number(params.indicatorId);

  // Fetch indicator metadata for title and description
  const {
    data: indicatorData,
    isLoading: isLoadingIndicator,
    isError: isErrorIndicator,
    refetch: refetchIndicator,
  } = useGetIndicatorsIndicatorId(indicatorId, {
    query: {
      enabled: !!indicatorId,
    } as any,
  });

  // Fetch form schema for the indicator
  const {
    data: formSchemaData,
    isLoading: isLoadingSchema,
    isError: isErrorSchema,
    refetch: refetchSchema,
  } = useGetIndicatorsIndicatorIdFormSchema(indicatorId, {
    query: {
      enabled: !!indicatorId,
    } as any,
  });

  // Epic 5.0: Fetch assessment status for locked state
  const { data: dashboardData, isLoading: isLoadingDashboard } = useGetBlguDashboardAssessmentId(
    assessmentId,
    undefined,
    {
      query: {
        enabled: !!assessmentId,
      } as any,
    }
  );

  // Determine if assessment is locked (SUBMITTED, IN_REVIEW, AWAITING_FINAL_VALIDATION, COMPLETED)
  const isStatusLocked =
    dashboardData?.status &&
    [
      "SUBMITTED",
      "IN_REVIEW",
      "AWAITING_FINAL_VALIDATION",
      "COMPLETED",
      "SUBMITTED_FOR_REVIEW",
    ].includes(dashboardData.status);

  // Calibration rework lock - only calibrated governance areas should be editable
  const isCalibrationRework = (dashboardData as any)?.is_calibration_rework === true;
  const calibrationGovernanceAreaIds: number[] = (
    (dashboardData as any)?.calibration_governance_areas || []
  ).map((a: any) => Number(a.governance_area_id));
  const indicatorGovernanceAreaId = indicatorData?.governance_area_id;

  // During calibration rework, lock indicators NOT in calibration areas
  const isLockedDueToCalibration =
    isCalibrationRework &&
    calibrationGovernanceAreaIds.length > 0 &&
    indicatorGovernanceAreaId !== undefined &&
    !calibrationGovernanceAreaIds.includes(Number(indicatorGovernanceAreaId));

  const isLocked = isStatusLocked || isLockedDueToCalibration;

  // Epic 5.0: Rework workflow context
  const reworkContext = useReworkContext(dashboardData as any, indicatorId, assessmentId);

  // Get MOV annotations for this indicator (available for all non-DRAFT assessments)
  const movAnnotations = dashboardData?.mov_annotations_by_indicator?.[indicatorId] || [];

  // Epic 5.0: Get rework comments for this indicator (if in rework status)
  // Filter from dashboard's rework_comments array - these are the assessor's text feedback
  const reworkComments = (dashboardData?.rework_comments || []).filter(
    (comment: any) => comment.indicator_id === indicatorId
  );
  const movNotes = dashboardData?.mov_notes_by_indicator?.[indicatorId] || [];

  // Epic 5.0: Get MLGOO flagged MOV file IDs (for MLGOO recalibration workflow)
  const mlgooFlaggedFileIds: Array<{ mov_file_id: number; comment?: string | null }> =
    (dashboardData as any)?.mlgoo_recalibration_mov_file_ids || [];

  const currentAreaStatus = ((dashboardData as any)?.area_assessor_status || []).find(
    (area: any) => Number(area.governance_area_id) === Number(indicatorGovernanceAreaId)
  );
  const areaIsInRework = currentAreaStatus?.status === "rework";
  const hasIndicatorMovFeedback =
    movAnnotations.length > 0 || reworkComments.length > 0 || movNotes.length > 0;
  const reworkCount = Number((dashboardData as any)?.rework_count ?? 0);
  const dashboardStatus = String((dashboardData as any)?.status || "").toUpperCase();
  const isGlobalReworkStatus = dashboardStatus === "REWORK" || dashboardStatus === "NEEDS_REWORK";
  const isPerAreaReworkMode = reworkCount === 0;

  // Per-area workflow: allow MOV re-upload even before global status becomes REWORK
  // when the current area is already sent back for rework and this indicator has MOV feedback.
  const allowPerAreaReworkUpload =
    areaIsInRework && hasIndicatorMovFeedback && (isPerAreaReworkMode || isGlobalReworkStatus);

  // Handle save success - could redirect or show confirmation
  const handleSaveSuccess = () => {
    // Could add additional logic here if needed
    // For now, the DynamicFormRenderer handles the toast notification
  };

  // Loading state
  if (isLoadingIndicator || isLoadingSchema || isLoadingDashboard) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>

        {/* Form Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // Error state for indicator metadata
  if (isErrorIndicator) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Unable to load indicator information. Please try again.</span>
            <Button variant="outline" size="sm" onClick={() => refetchIndicator()} className="ml-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>

        <div className="mt-6">
          <Button variant="outline" asChild>
            <Link href="/blgu/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Error state for form schema
  if (isErrorSchema) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Unable to load form. Please try again.</span>
            <Button variant="outline" size="sm" onClick={() => refetchSchema()} className="ml-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>

        <div className="mt-6">
          <Button variant="outline" asChild>
            <Link href="/blgu/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const indicator = indicatorData;
  const formSchema = formSchemaData?.form_schema;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Epic 5.0: Locked State Banner */}
      {dashboardData?.status && (
        <div className="mb-6">
          <LockedStateBanner
            status={dashboardData.status as any}
            reworkCount={dashboardData.rework_count}
          />
        </div>
      )}

      {/* Header with Navigation */}
      <div className="space-y-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/blgu/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link
            href={`/blgu/assessment/${assessmentId}`}
            className="hover:text-foreground transition-colors"
          >
            Assessment
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">
            {indicator?.name || `Indicator ${indicatorId}`}
          </span>
        </div>

        {/* Back Button */}
        <Button variant="outline" asChild>
          <Link href="/blgu/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        {/* Page Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {indicator?.name || "Assessment Form"}
          </h1>
          {indicator?.description && (
            <p className="text-muted-foreground">{indicator.description}</p>
          )}

          {/* Profiling Only Badge - Dynamic based on indicator data */}
          {indicator?.is_profiling_only && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 w-fit">
              <BarChart3 className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                For Profiling Only — This indicator is for data collection purposes and does not
                affect your barangay&apos;s pass/fail status.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Epic 5.0: Rework Alert Banner - Shows assessor feedback during rework workflow */}
      {reworkContext?.from_rework && reworkContext.current_indicator && (
        <ReworkAlertBanner
          indicator={reworkContext.current_indicator}
          assessmentId={assessmentId}
        />
      )}

      {/* Assessor Feedback Notice - Shows when annotations exist outside rework workflow */}
      {!reworkContext?.from_rework && movAnnotations.length > 0 && (
        <Alert className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
          <MessageSquare className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200 space-y-1">
            <p className="font-medium">Assessor Feedback Available</p>
            <p className="text-sm">
              The assessor has provided{" "}
              <span className="font-medium">
                {movAnnotations.length} annotation{movAnnotations.length !== 1 ? "s" : ""}
              </span>{" "}
              on this indicator&apos;s MOV files. Review the annotated files below.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Dynamic Form */}
      {formSchema ? (
        <DynamicFormRenderer
          formSchema={formSchema}
          assessmentId={assessmentId}
          indicatorId={indicatorId}
          onSaveSuccess={handleSaveSuccess}
          isLocked={isLocked || false}
          allowPerAreaReworkUpload={allowPerAreaReworkUpload}
          movAnnotations={movAnnotations}
          reworkComments={reworkComments}
          mlgooFlaggedFileIds={mlgooFlaggedFileIds}
        />
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No form schema available for this indicator. Please contact support.
          </AlertDescription>
        </Alert>
      )}

      {/* Epic 5.0: Rework Progress Tracker - Navigation bar for rework workflow */}
      {reworkContext?.from_rework && (
        <ReworkProgressTracker progress={reworkContext.progress} assessmentId={assessmentId} />
      )}
    </div>
  );
}
