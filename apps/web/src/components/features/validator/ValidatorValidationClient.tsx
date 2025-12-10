"use client";

import { TreeNavigator } from "@/components/features/assessments/tree-navigation";
import { StatusBadge } from "@/components/shared";
import { ValidationPanelSkeleton } from "@/components/shared/skeletons";
import { BBIPreviewPanel, BBIPreviewData } from "./BBIPreviewPanel";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import {
  useGetAssessorAssessmentsAssessmentId,
  usePostAssessorAssessmentResponsesResponseIdValidate,
  usePostAssessorAssessmentsAssessmentIdCalibrate,
  usePostAssessorAssessmentsAssessmentIdFinalize,
} from "@sinag/shared";
import { useQueryClient } from "@tanstack/react-query";
import { classifyError } from "@/lib/error-utils";
import { ChevronLeft, ClipboardCheck } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MiddleMovFilesPanel } from "../assessor/validation/MiddleMovFilesPanel";

// Lazy load heavy RightAssessorPanel component (1400+ LOC)
const RightAssessorPanel = dynamic(
  () =>
    import("../assessor/validation/RightAssessorPanel").then((mod) => ({
      default: mod.RightAssessorPanel,
    })),
  {
    loading: () => <ValidationPanelSkeleton />,
    ssr: false,
  }
);

interface ValidatorValidationClientProps {
  assessmentId: number;
}

type AnyRecord = Record<string, any>;

/**
 * Sort indicator codes numerically (e.g., 1.1.1, 1.1.2, 1.2.1, etc.)
 */
function sortIndicatorCode(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA !== numB) {
      return numA - numB;
    }
  }
  return 0;
}

export function ValidatorValidationClient({ assessmentId }: ValidatorValidationClientProps) {
  const router = useRouter();
  const { data, isLoading, isError, error } = useGetAssessorAssessmentsAssessmentId(assessmentId);
  const qc = useQueryClient();
  const validateMut = usePostAssessorAssessmentResponsesResponseIdValidate();
  const finalizeMut = usePostAssessorAssessmentsAssessmentIdFinalize();
  const calibrateMut = usePostAssessorAssessmentsAssessmentIdCalibrate();

  // All hooks must be called before any conditional returns
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [form, setForm] = useState<
    Record<number, { status?: "Pass" | "Fail" | "Conditional"; publicComment?: string }>
  >({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Store checklist state externally to persist across indicator navigation
  const [checklistState, setChecklistState] = useState<Record<string, any>>({});
  // Store calibration flag state (which indicators are flagged for calibration)
  const [calibrationFlags, setCalibrationFlags] = useState<Record<number, boolean>>({});

  // Get current user for per-area calibration check (must be called before conditional returns)
  const { user: currentUser } = useAuthStore();

  // Set initial expandedId when data loads
  useEffect(() => {
    if (data && expandedId === null) {
      const assessment: AnyRecord = (data as unknown as AnyRecord) ?? {};
      const core = (assessment.assessment as AnyRecord) ?? assessment;
      const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];
      if (responses.length > 0) {
        setExpandedId(responses[0]?.id ?? null);
      }
    }
  }, [data, expandedId]);

  // Initialize form state from database validation_status when data loads
  // This ensures the "Finalize Validation" button is enabled if all indicators are already validated
  useEffect(() => {
    if (data && Object.keys(form).length === 0) {
      const assessment: AnyRecord = (data as unknown as AnyRecord) ?? {};
      const core = (assessment.assessment as AnyRecord) ?? assessment;
      const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];

      const initialForm: Record<
        number,
        { status?: "Pass" | "Fail" | "Conditional"; publicComment?: string }
      > = {};

      for (const resp of responses) {
        // Load validation_status from database if it exists
        const validationStatus = resp.validation_status;

        if (validationStatus) {
          // Map database status (uppercase: PASS, FAIL, CONDITIONAL) to form status (title case: Pass, Fail, Conditional)
          const upperStatus = String(validationStatus).toUpperCase();
          const status =
            upperStatus === "PASS"
              ? "Pass"
              : upperStatus === "FAIL"
                ? "Fail"
                : upperStatus === "CONDITIONAL"
                  ? "Conditional"
                  : undefined;

          // Load public comment from feedback_comments (latest validation comment from validators only)
          const feedbackComments = resp.feedback_comments || [];
          const validationComments = feedbackComments.filter((fc: any) => {
            if (fc.comment_type !== "validation" || fc.is_internal_note) return false;
            // Only load comments from validators, not assessors
            const commenterRole = fc.assessor?.role?.toLowerCase() || "";
            return commenterRole === "validator";
          });
          validationComments.sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA; // DESC order
          });
          const publicComment = validationComments[0]?.comment || "";

          // Load entry if we have status OR comment (comment can be saved without status)
          if (status || publicComment) {
            initialForm[resp.id] = { status, publicComment };
          }
        }
      }

      if (Object.keys(initialForm).length > 0) {
        setForm(initialForm);
      }
    }
  }, [data, form]);

  // Initialize checklist state from database response_data when data loads
  useEffect(() => {
    if (data && Object.keys(checklistState).length === 0) {
      const assessment: AnyRecord = (data as unknown as AnyRecord) ?? {};
      const core = (assessment.assessment as AnyRecord) ?? assessment;
      const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];

      const initialChecklistState: Record<string, any> = {};

      for (const resp of responses) {
        const responseId = resp.id;
        const responseData = resp.response_data || {};

        // Load validator checklist data (validator_val_ prefix)
        Object.keys(responseData).forEach((key) => {
          if (key.startsWith("validator_val_")) {
            // Convert to checklist format: validator_val_item_123 → checklist_{responseId}_item_123
            const fieldName = key.replace("validator_val_", "");
            const checklistKey = `checklist_${responseId}_${fieldName}`;
            initialChecklistState[checklistKey] = responseData[key];
          }
        });
      }

      if (Object.keys(initialChecklistState).length > 0) {
        console.log("[Validator] Loading saved checklist state:", initialChecklistState);
        setChecklistState(initialChecklistState);
      }
    }
  }, [data, checklistState]);

  // Initialize calibration flags from database when data loads
  useEffect(() => {
    if (data && Object.keys(calibrationFlags).length === 0) {
      const assessment: AnyRecord = (data as unknown as AnyRecord) ?? {};
      const core = (assessment.assessment as AnyRecord) ?? assessment;
      const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];

      const initialFlags: Record<number, boolean> = {};

      for (const resp of responses) {
        // Debug: log the flagged_for_calibration value from each response
        console.log(
          `[Init] Response ${resp.id}: flagged_for_calibration =`,
          resp.flagged_for_calibration
        );
        // Load flagged_for_calibration from database
        if (resp.flagged_for_calibration === true) {
          initialFlags[resp.id] = true;
        }
      }

      if (Object.keys(initialFlags).length > 0) {
        console.log("[Validator] Loading saved calibration flags:", initialFlags);
        setCalibrationFlags(initialFlags);
      }
    }
  }, [data, calibrationFlags]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-muted-foreground">
        Loading assessment…
      </div>
    );
  }

  if (isError || !data) {
    const errorInfo = classifyError(error);
    const isNetworkError = errorInfo.type === "network";

    return (
      <div className="mx-auto max-w-7xl px-6 py-10 text-sm">
        <div
          className={`rounded-md border p-4 ${isNetworkError ? "border-orange-200 bg-orange-50" : "border-red-200 bg-red-50"}`}
        >
          <div
            className={`font-medium mb-1 ${isNetworkError ? "text-orange-700" : "text-red-700"}`}
          >
            {errorInfo.title}
          </div>
          <div className={`${isNetworkError ? "text-orange-600" : "text-red-600"}`}>
            {errorInfo.message}
          </div>
        </div>
      </div>
    );
  }

  const assessment: AnyRecord = (data as unknown as AnyRecord) ?? {};
  const core = (assessment.assessment as AnyRecord) ?? assessment;
  const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];
  const barangayName: string = (core?.blgu_user?.barangay?.name ??
    core?.barangay?.name ??
    core?.barangay_name ??
    "") as string;
  const governanceArea: string = (responses[0]?.indicator?.governance_area?.name ??
    core?.governance_area?.name ??
    core?.governance_area_name ??
    "") as string;
  const cycleYear: string = String(core?.cycle_year ?? core?.year ?? "");
  const statusText: string = core?.status ?? core?.assessment_status ?? "";

  // Check if THIS validator's area has already been calibrated (per-area limit)
  const validatorAreaId = currentUser?.validator_area_id;
  const calibratedAreaIds: number[] = (core?.calibrated_area_ids ?? []) as number[];
  const calibrationAlreadyUsed = validatorAreaId
    ? calibratedAreaIds.includes(validatorAreaId)
    : false;

  // Get timestamps for MOV file separation (new vs old files)
  // These are passed to MiddleMovFilesPanel which determines per-indicator which timestamp to use
  const calibrationRequestedAt: string | null = (core?.calibration_requested_at ?? null) as
    | string
    | null;
  const reworkRequestedAt: string | null = (core?.rework_requested_at ?? null) as string | null;
  // Default label (MiddleMovFilesPanel will override based on indicator context)
  const separationLabel = calibrationRequestedAt ? "After Calibration" : "After Rework";

  // Helper: Check if a response has any checklist items checked by the validator
  const hasChecklistItemsChecked = (responseId: number): boolean => {
    return Object.keys(checklistState).some(
      (key) => key.startsWith(`checklist_${responseId}_`) && checklistState[key] === true
    );
  };

  // Helper: Check if an indicator is "reviewed" (checklist items checked OR flagged for calibration)
  const isIndicatorReviewed = (responseId: number): boolean => {
    return hasChecklistItemsChecked(responseId) || calibrationFlags[responseId] === true;
  };

  // Transform to match BLGU assessment structure for TreeNavigator
  const transformedAssessment = {
    id: assessmentId,
    completedIndicators: responses.filter((r: any) => isIndicatorReviewed(r.id)).length,
    totalIndicators: responses.length,
    governanceAreas: responses.reduce((acc: any[], resp: any) => {
      const indicator = resp.indicator || {};
      const area = indicator.governance_area || {};
      const areaId = String(area.id || "unknown");
      const areaName = area.name || "Unknown Area";
      // Generate 2-letter code from area name for logo lookup (e.g., "Financial Administration" -> "FI")
      const areaCode = areaName.substring(0, 2).toUpperCase();

      let existingArea = acc.find((a: any) => a.id === areaId);
      if (!existingArea) {
        existingArea = {
          id: areaId,
          code: areaCode,
          name: areaName,
          indicators: [],
        };
        acc.push(existingArea);
      }

      existingArea.indicators.push({
        id: String(resp.id),
        code: indicator.indicator_code || indicator.code || String(resp.id),
        name: indicator.name || "Unnamed Indicator",
        // For validators: Show completed if checklist items checked OR flagged for calibration
        status: isIndicatorReviewed(resp.id) ? "completed" : "not_started",
      });

      // Sort indicators by code after adding
      existingArea.indicators.sort((a: any, b: any) => sortIndicatorCode(a.code, b.code));

      return acc;
    }, []),
  };

  const total = responses.length;
  // For validators: "reviewed" means checklist items checked OR flagged for calibration
  const reviewed = responses.filter((r) => isIndicatorReviewed(r.id as number)).length;
  const allReviewed = total > 0 && reviewed === total;
  const progressPct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  const onSaveDraft = async () => {
    // Build payloads that include validation status, checklist data, AND calibration flag
    const payloads = responses
      .map((r) => {
        const responseId = r.id as number;
        const formData = form[responseId];
        const flaggedForCalibration = calibrationFlags[responseId] ?? false;

        // Extract checklist data for this response
        const responseChecklistData: Record<string, any> = {};
        Object.keys(checklistState).forEach((key) => {
          if (key.startsWith(`checklist_${responseId}_`)) {
            // Convert to validator_val_ prefix for storage
            const fieldName = key.replace(`checklist_${responseId}_`, "");
            const prefixedFieldName = `validator_val_${fieldName}`;
            responseChecklistData[prefixedFieldName] = checklistState[key];
          }
        });

        const hasStatus = formData && formData.status;
        const hasChecklistData = Object.keys(responseChecklistData).length > 0;
        const hasComment =
          formData && formData.publicComment && formData.publicComment.trim().length > 0;
        const hasCalibrationFlag = flaggedForCalibration === true;

        // Include in payload if has status OR has checklist data OR has comment OR has calibration flag
        if (hasStatus || hasChecklistData || hasComment || hasCalibrationFlag) {
          return {
            id: responseId,
            v: formData,
            checklistData: responseChecklistData,
            flaggedForCalibration,
          };
        }
        return null;
      })
      .filter(
        (
          x
        ): x is {
          id: number;
          v: { status?: "Pass" | "Fail" | "Conditional"; publicComment?: string } | undefined;
          checklistData: Record<string, any>;
          flaggedForCalibration: boolean;
        } => x !== null
      );

    if (payloads.length === 0) {
      console.warn("No validation decisions to save");
      toast.info("No changes to save", { duration: 2000 });
      return;
    }

    try {
      // Show loading toast
      toast.loading(
        `Saving ${payloads.length} validation decision${payloads.length > 1 ? "s" : ""}...`,
        { id: "save-draft-toast" }
      );

      await Promise.all(
        payloads.map((p) => {
          console.log(
            `[SaveDraft] Response ${p.id}: flagged_for_calibration = ${p.flaggedForCalibration}`
          );
          return validateMut.mutateAsync({
            responseId: p.id,
            data: {
              // Convert to uppercase to match backend ValidationStatus enum (PASS, FAIL, CONDITIONAL)
              validation_status: p.v?.status
                ? (p.v.status.toUpperCase() as "PASS" | "FAIL" | "CONDITIONAL")
                : undefined,
              public_comment: p.v?.publicComment ?? null,
              // Include checklist data in response_data
              response_data: Object.keys(p.checklistData).length > 0 ? p.checklistData : undefined,
              // Include calibration flag
              flagged_for_calibration: p.flaggedForCalibration,
            },
          });
        })
      );
      // Invalidate all queries to force refetch with updated response_data
      await qc.invalidateQueries();

      // Dismiss loading and show success
      toast.dismiss("save-draft-toast");
      toast.success(
        `✅ Saved ${payloads.length} validation decision${payloads.length > 1 ? "s" : ""} as draft`,
        {
          duration: 3000,
        }
      );
    } catch (error) {
      console.error("Error saving validation:", error);
      toast.dismiss("save-draft-toast");

      const errorInfo = classifyError(error);
      if (errorInfo.type === "network") {
        toast.error("Unable to save draft", {
          description: "Check your internet connection and try again.",
          duration: 5000,
        });
      } else if (errorInfo.type === "auth") {
        toast.error("Session expired", {
          description: "Please log in again to save your work.",
          duration: 5000,
        });
      } else {
        toast.error("Failed to save draft", {
          description: "Please try again. If the problem persists, contact your MLGOO-DILG.",
          duration: 5000,
        });
      }
      throw error;
    }
  };

  const onFinalize = async () => {
    // Prevent double-clicking by checking if already in progress
    if (finalizeMut.isPending) {
      console.log("Finalize already in progress, ignoring duplicate click");
      return;
    }

    // Show immediate feedback that the process started
    toast.loading("Finalizing validation...", { id: "finalize-toast" });

    try {
      // Save any pending changes first
      console.log("Saving draft before finalize...");
      await onSaveDraft();

      // Then finalize
      console.log("Finalizing assessment...");
      const result = (await finalizeMut.mutateAsync({ assessmentId })) as {
        new_status?: string;
        already_finalized?: boolean;
      };
      await qc.invalidateQueries();

      // Dismiss loading toast
      toast.dismiss("finalize-toast");

      // Handle already finalized case (idempotent response from backend)
      if (result?.already_finalized) {
        toast.success("✅ Assessment already finalized and awaiting MLGOO approval.", {
          duration: 4000,
        });
        router.push("/validator/submissions");
        return;
      }

      // Check if assessment is fully complete or partially validated
      const isFullyComplete = result?.new_status === "AWAITING_MLGOO_APPROVAL";

      if (isFullyComplete) {
        toast.success(
          "✅ Assessment fully validated! All governance areas are complete. The assessment is now ready for MLGOO review.",
          {
            duration: 5000,
          }
        );
      } else {
        toast.success(
          "✅ Your governance area validation is complete! Other governance areas are still pending validation.",
          {
            duration: 5000,
          }
        );
      }

      // Navigate back to submissions queue after successful finalization
      router.push("/validator/submissions");
    } catch (error: any) {
      console.error("Finalization error:", error);
      toast.dismiss("finalize-toast");

      const errorInfo = classifyError(error);
      if (errorInfo.type === "network") {
        toast.error("Unable to finalize validation", {
          description:
            "Check your internet connection and try again. Your progress has been saved.",
          duration: 6000,
        });
      } else if (errorInfo.type === "auth") {
        toast.error("Session expired", {
          description: "Please log in again to complete finalization.",
          duration: 6000,
        });
      } else if (errorInfo.type === "validation") {
        toast.error("Cannot finalize validation", {
          description: errorInfo.message,
          duration: 6000,
        });
      } else {
        toast.error("Finalization failed", {
          description: "Please try again. If the problem persists, contact your MLGOO-DILG.",
          duration: 6000,
        });
      }
    }
  };

  const onCalibrate = async () => {
    // Show immediate feedback that the process started
    toast.loading("Submitting for calibration...", { id: "calibrate-toast" });

    try {
      // Save any pending changes first
      await onSaveDraft();

      // Then submit for calibration
      const result = (await calibrateMut.mutateAsync({ assessmentId })) as {
        message?: string;
        governance_area?: string;
        calibrated_indicators_count?: number;
      };
      await qc.invalidateQueries();

      // Dismiss loading toast and show success
      toast.dismiss("calibrate-toast");

      const message =
        result?.message ||
        `Assessment submitted for calibration. ${result?.calibrated_indicators_count || 0} indicator(s) in ${result?.governance_area || "your area"} marked for correction.`;

      toast.success(`✅ ${message}`, {
        duration: 5000,
      });

      // Navigate back to submissions queue after successful calibration
      router.push("/validator/submissions");
    } catch (error: any) {
      console.error("Calibration error:", error);
      toast.dismiss("calibrate-toast");

      const errorInfo = classifyError(error);
      if (errorInfo.type === "network") {
        toast.error("Unable to submit for calibration", {
          description: "Check your internet connection and try again.",
          duration: 6000,
        });
      } else if (errorInfo.type === "auth") {
        toast.error("Session expired", {
          description: "Please log in again to submit for calibration.",
          duration: 6000,
        });
      } else if (errorInfo.type === "validation") {
        toast.error("Cannot submit for calibration", {
          description: errorInfo.message,
          duration: 6000,
        });
      } else {
        toast.error("Calibration request failed", {
          description: "Please try again. If the problem persists, contact your MLGOO-DILG.",
          duration: 6000,
        });
      }
    }
  };

  const handleIndicatorSelect = (indicatorId: string) => {
    const responseId = parseInt(indicatorId, 10);
    setExpandedId(responseId);
    setSelectedIndicatorId(indicatorId);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1920px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="shrink-0 gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <Link href="/validator/submissions">
                <ChevronLeft className="h-4 w-4" />
                <span className="font-medium">Queue</span>
              </Link>
            </Button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
            <div className="min-w-0 flex flex-col justify-center">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
                {barangayName}{" "}
                <span className="text-slate-400 dark:text-slate-500 font-normal mx-1">/</span>{" "}
                <span className="text-slate-700 dark:text-slate-300">{governanceArea}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                Validator Assessment Review {cycleYear ? `· CY ${cycleYear}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {statusText ? (
              <div className="scale-90 origin-right">
                <StatusBadge status={statusText} />
              </div>
            ) : null}
            <Button
              asChild
              variant="default"
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Link href={`/validator/submissions/${assessmentId}/compliance`}>
                <ClipboardCheck className="h-4 w-4" />
                Compliance Overview
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onSaveDraft}
              disabled={validateMut.isPending}
              className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Save as Draft
            </Button>
          </div>
        </div>
      </div>

      {/* Three-Column Layout */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-[1920px] mx-auto">
          <div className="flex flex-row h-[calc(100vh-125px)] bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
            {/* Left Panel - Indicator Tree Navigation */}
            <div className="w-[280px] flex-shrink-0 border-r border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">
              <div className="flex-1 overflow-y-auto">
                <TreeNavigator
                  assessment={transformedAssessment as any}
                  selectedIndicatorId={selectedIndicatorId}
                  onIndicatorSelect={handleIndicatorSelect}
                />
              </div>
            </div>

            {/* Middle Panel - MOV Files */}
            <div className="w-[320px] flex-shrink-0 border-r border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">
              <MiddleMovFilesPanel
                assessment={data as any}
                expandedId={expandedId ?? undefined}
                calibrationRequestedAt={calibrationRequestedAt}
                reworkRequestedAt={reworkRequestedAt}
                separationLabel={separationLabel}
                onAnnotationCreated={(responseId) => {
                  // Auto-enable calibration flag when annotation is added
                  setCalibrationFlags((prev) => ({
                    ...prev,
                    [responseId]: true,
                  }));
                }}
                onAnnotationDeleted={(responseId, remainingCount) => {
                  // Auto-disable calibration flag when ALL annotations are removed
                  if (remainingCount === 0) {
                    setCalibrationFlags((prev) => ({
                      ...prev,
                      [responseId]: false,
                    }));
                  }
                }}
              />
            </div>

            {/* Right Panel - MOV Checklist/Validation */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">
              <div className="flex-1 overflow-y-auto">
                <RightAssessorPanel
                  assessment={data as any}
                  form={form}
                  expandedId={expandedId ?? undefined}
                  onToggle={(id) => setExpandedId((curr) => (curr === id ? null : id))}
                  setField={(id, field, value) => {
                    setForm((prev) => ({
                      ...prev,
                      [id]: {
                        ...prev[id],
                        [field]: value,
                      },
                    }));
                  }}
                  onIndicatorSelect={(indicatorId) => {
                    // Sync the tree navigator selection when navigating via Previous/Next buttons
                    setSelectedIndicatorId(indicatorId);
                  }}
                  checklistState={checklistState}
                  onChecklistChange={(key, value) => {
                    setChecklistState((prev) => ({
                      ...prev,
                      [key]: value,
                    }));
                  }}
                  calibrationFlags={calibrationFlags}
                  onCalibrationFlagChange={(responseId, flagged) => {
                    setCalibrationFlags((prev) => ({
                      ...prev,
                      [responseId]: flagged,
                    }));
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: BBI Preview + Progress Bar */}
      <div className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-card/95 backdrop-blur">
        {/* BBI Preview Panel - Now prominently placed above progress bar */}
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <BBIPreviewPanel data={(data as any)?.bbi_preview as BBIPreviewData} />
        </div>

        {/* Progress Bar */}
        <div className="relative max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="absolute inset-x-0 -top-[3px] h-[3px] bg-black/5">
            <div
              className="h-full bg-[var(--cityscape-yellow)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Indicators Reviewed: {reviewed}/{total}
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="default"
              type="button"
              onClick={onSaveDraft}
              disabled={validateMut.isPending}
              className="w-full sm:w-auto"
            >
              {validateMut.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 inline-block"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                "Save as Draft"
              )}
            </Button>
            <Button
              size="default"
              type="button"
              onClick={onCalibrate}
              disabled={
                calibrateMut.isPending ||
                calibrationAlreadyUsed ||
                !Object.values(calibrationFlags).some((v) => v === true)
              }
              className="w-full sm:w-auto text-white hover:opacity-90"
              style={{
                background:
                  calibrationAlreadyUsed || !Object.values(calibrationFlags).some((v) => v === true)
                    ? "var(--muted)"
                    : "var(--cityscape-yellow)",
              }}
              title={
                calibrationAlreadyUsed
                  ? "Calibration has already been used for your governance area (max 1 per area)"
                  : !Object.values(calibrationFlags).some((v) => v === true)
                    ? "Flag at least one indicator for calibration using the toggle"
                    : undefined
              }
            >
              {calibrateMut.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Submitting...
                </>
              ) : calibrationAlreadyUsed ? (
                "Calibration Used"
              ) : (
                "Submit for Calibration"
              )}
            </Button>
            <Button
              size="default"
              type="button"
              onClick={onFinalize}
              disabled={!allReviewed || finalizeMut.isPending}
              className="w-full sm:w-auto text-white hover:opacity-90"
              style={{ background: "var(--success)" }}
            >
              {finalizeMut.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Finalizing...
                </>
              ) : (
                "Finalize Validation"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
