"use client";

import { TreeNavigator } from "@/components/features/assessments/tree-navigation";
import { AutosaveStatusPill } from "@/components/features/shared/AutosaveStatusPill";
import { StatusBadge } from "@/components/shared";
import { ValidationPanelSkeleton } from "@/components/shared/skeletons";
import { BBIPreviewPanel, BBIPreviewData } from "./BBIPreviewPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  getGetAssessorAssessmentsAssessmentIdQueryKey,
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
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { toast } from "sonner";
import { MiddleMovFilesPanel } from "../assessor/validation/MiddleMovFilesPanel";
import { getValidatorIndicatorProgress, hasExistingValidationStatus } from "./validator-progress";

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
type DraftSaveState = "idle" | "dirty" | "saving" | "saved" | "error";
const AUTOSAVE_DEBOUNCE_MS = 3500;

function upsertValidatorValidationFeedbackComment(
  feedbackComments: AnyRecord[],
  comment: string | null
): AnyRecord[] {
  const withoutValidatorValidationComments = feedbackComments.filter((existingComment) => {
    if (existingComment.comment_type !== "validation" || existingComment.is_internal_note) {
      return true;
    }
    const commenterRole = existingComment.assessor?.role?.toLowerCase() || "";
    return commenterRole !== "validator";
  });

  if (!comment || comment.trim().length === 0) {
    return withoutValidatorValidationComments;
  }

  return [
    {
      id: `local-validator-validation-${Date.now()}`,
      comment,
      comment_type: "validation",
      is_internal_note: false,
      created_at: new Date().toISOString(),
      assessor: {
        role: "VALIDATOR",
      },
    },
    ...withoutValidatorValidationComments,
  ];
}

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
  const { data, isLoading, isError, error } = useGetAssessorAssessmentsAssessmentId(assessmentId, {
    query: {
      queryKey: getGetAssessorAssessmentsAssessmentIdQueryKey(assessmentId),
      // CRITICAL: Disable refetchOnWindowFocus to prevent losing unsaved work
      // When user alt-tabs back, we don't want to overwrite their validation changes
      refetchOnWindowFocus: false,
      refetchOnMount: true, // Still fetch fresh data on initial mount
      staleTime: 5 * 60 * 1000, // 5 minutes - data won't go stale while working
    },
  });
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
  const [movAttentionByResponse, setMovAttentionByResponse] = useState<
    Record<number, Record<number, boolean>>
  >({});
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>("idle");
  const [completedAutosaveCount, setCompletedAutosaveCount] = useState(0);
  const [dirtyResponseIds, setDirtyResponseIds] = useState<number[]>([]);
  const hydratedRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef<Record<number, string>>({});
  const isSavingRef = useRef(false);
  const activeSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const formRef = useRef(form);
  const checklistStateRef = useRef(checklistState);
  const calibrationFlagsRef = useRef(calibrationFlags);
  const dirtyResponseIdsRef = useRef(dirtyResponseIds);
  const responsesRef = useRef<AnyRecord[]>([]);

  // Confirmation dialog states
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showCalibrationConfirm, setShowCalibrationConfirm] = useState(false);

  // Mobile tab state: 'indicators' | 'files' | 'validation'
  const [mobileTab, setMobileTab] = useState<"indicators" | "files" | "validation">("indicators");

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

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    checklistStateRef.current = checklistState;
  }, [checklistState]);

  useEffect(() => {
    calibrationFlagsRef.current = calibrationFlags;
  }, [calibrationFlags]);

  useEffect(() => {
    dirtyResponseIdsRef.current = dirtyResponseIds;
  }, [dirtyResponseIds]);

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

  const assessment: AnyRecord = (data as unknown as AnyRecord) ?? {};
  const core = (assessment.assessment as AnyRecord) ?? assessment;
  const responsesSource = core.responses as AnyRecord[] | undefined;
  const responses: AnyRecord[] = useMemo(() => responsesSource ?? [], [responsesSource]);
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

  // Per-area calibration tracking: each governance area can only be calibrated ONCE
  // calibrated_area_ids contains the IDs of areas that have already been calibrated
  // Type-safe extraction: ensure array of numbers (handles potential string/number mismatches from JSON)
  const calibratedAreaIds: number[] = ((core?.calibrated_area_ids ?? []) as (number | string)[])
    .map(Number)
    .filter((n) => !isNaN(n));
  // Check if ALL 6 governance areas have been calibrated (no more areas left to calibrate)
  const TOTAL_GOVERNANCE_AREAS = 6;
  const allAreasCalibrated: boolean = calibratedAreaIds.length >= TOTAL_GOVERNANCE_AREAS;

  // Get timestamps for MOV file separation (new vs old files)
  // These are passed to MiddleMovFilesPanel which determines per-indicator which timestamp to use
  const calibrationRequestedAt: string | null = (core?.calibration_requested_at ?? null) as
    | string
    | null;
  const reworkRequestedAt: string | null = (core?.rework_requested_at ?? null) as string | null;
  // Default label (MiddleMovFilesPanel will override based on indicator context)
  const separationLabel = calibrationRequestedAt ? "After Calibration" : "After Rework";
  const isPostCalibrationReview = Boolean(calibrationRequestedAt);

  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  const getProgressForResponse = (response: AnyRecord) =>
    getValidatorIndicatorProgress(response, {
      checklistState,
      localMovAttentionByFileId: movAttentionByResponse[response.id] ?? {},
      strictChecklistRequired: isPostCalibrationReview,
    });

  // Transform to match BLGU assessment structure for TreeNavigator
  const transformedAssessment = {
    id: assessmentId,
    completedIndicators: responses.filter(
      (r: AnyRecord) => getProgressForResponse(r).status === "completed"
    ).length,
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
        status: getProgressForResponse(resp).status,
        hasMovNotes: getProgressForResponse(resp).hasMovNotes,
      });

      // Sort indicators by code after adding
      existingArea.indicators.sort((a: any, b: any) => sortIndicatorCode(a.code, b.code));

      return acc;
    }, []),
  };

  const total = responses.length;
  const reviewed = responses.filter((r) => getProgressForResponse(r).status === "completed").length;
  const progressPct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  // Check if ALL responses have validation_status confirmed (via Compliance Overview)
  // This is required before finalization - validators must confirm each indicator status
  const confirmedCount = responses.filter((r) => hasExistingValidationStatus(r)).length;
  const allConfirmed = total > 0 && confirmedCount === total;

  const getResponseSnapshot = (responseId: number): string => {
    const formData = formRef.current[responseId];
    const responseChecklistData: Record<string, any> = {};

    Object.keys(checklistStateRef.current).forEach((key) => {
      if (!key.startsWith(`checklist_${responseId}_`)) return;
      const fieldName = key.replace(`checklist_${responseId}_`, "");
      responseChecklistData[`validator_val_${fieldName}`] = checklistStateRef.current[key];
    });

    const sortedKeys = Object.keys(responseChecklistData).sort();
    const sortedChecklistData: Record<string, any> = {};
    sortedKeys.forEach((k) => {
      sortedChecklistData[k] = responseChecklistData[k];
    });

    const rawComment = formData?.publicComment ?? null;
    const normalizedComment = rawComment && rawComment.trim().length > 0 ? rawComment : null;

    return JSON.stringify({
      validation_status: formData?.status
        ? (formData.status.toUpperCase() as "PASS" | "FAIL" | "CONDITIONAL")
        : null,
      public_comment: normalizedComment,
      response_data: sortedChecklistData,
      flagged_for_calibration: calibrationFlagsRef.current[responseId] ?? false,
    });
  };

  const getServerSnapshot = (response: AnyRecord): string => {
    const validationComments = ((response.feedback_comments as any[]) || [])
      .filter((fc: any) => {
        if (fc.comment_type !== "validation" || fc.is_internal_note) return false;
        const commenterRole = fc.assessor?.role?.toLowerCase() || "";
        return commenterRole === "validator";
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

    const responseData = (response.response_data as Record<string, any>) || {};
    const snapshotData: Record<string, any> = {};
    Object.keys(responseData).forEach((key) => {
      if (!key.startsWith("validator_val_")) return;
      snapshotData[key] = responseData[key];
    });

    const sortedKeys = Object.keys(snapshotData).sort();
    const sortedSnapshotData: Record<string, any> = {};
    sortedKeys.forEach((k) => {
      sortedSnapshotData[k] = snapshotData[k];
    });

    return JSON.stringify({
      validation_status: response.validation_status ?? null,
      public_comment: validationComments[0]?.comment ?? null,
      response_data: sortedSnapshotData,
      flagged_for_calibration: response.flagged_for_calibration === true,
    });
  };

  const buildSavePayload = (responseId: number) => {
    const snapshot = getResponseSnapshot(responseId);
    const parsed = JSON.parse(snapshot) as {
      validation_status: "PASS" | "FAIL" | "CONDITIONAL" | null;
      public_comment: string | null;
      response_data?: Record<string, any>;
      flagged_for_calibration: boolean;
    };
    const response = responsesRef.current.find((item) => item.id === responseId);
    if (!response) return null;

    return {
      responseId,
      snapshot,
      data: {
        validation_status: parsed.validation_status ?? undefined,
        public_comment: parsed.public_comment,
        response_data:
          parsed.response_data && Object.keys(parsed.response_data).length > 0
            ? parsed.response_data
            : undefined,
        flagged_for_calibration: parsed.flagged_for_calibration,
      },
    };
  };

  const patchCachedAssessmentResponse = (
    responseId: number,
    payload: {
      validation_status?: "PASS" | "FAIL" | "CONDITIONAL";
      public_comment: string | null;
      response_data?: Record<string, any>;
      flagged_for_calibration: boolean;
    }
  ) => {
    qc.setQueryData(
      getGetAssessorAssessmentsAssessmentIdQueryKey(assessmentId),
      (current: AnyRecord | undefined) => {
        if (!current) return current;

        const assessmentData = (current.assessment as AnyRecord) ?? current;
        const currentResponses = (assessmentData.responses as AnyRecord[]) ?? [];

        const nextResponses = currentResponses.map((response) => {
          if (response.id !== responseId) return response;

          const nextResponseData = {
            ...((response.response_data as Record<string, any>) || {}),
            ...(payload.response_data || {}),
          };

          if (payload.response_data) {
            Object.entries(payload.response_data).forEach(([key, value]) => {
              if (value === null || value === undefined || value === "" || value === false) {
                delete nextResponseData[key];
              }
            });
          }

          return {
            ...response,
            validation_status: payload.validation_status ?? response.validation_status,
            flagged_for_calibration: payload.flagged_for_calibration,
            response_data: nextResponseData,
            feedback_comments: upsertValidatorValidationFeedbackComment(
              ((response.feedback_comments as AnyRecord[]) || []).map((comment) => ({
                ...comment,
              })),
              payload.public_comment
            ),
          };
        });

        if ("assessment" in current) {
          return {
            ...current,
            assessment: {
              ...assessmentData,
              responses: nextResponses,
            },
          };
        }

        return {
          ...assessmentData,
          responses: nextResponses,
        };
      }
    );
  };

  const syncDirtyStateForResponse = (responseId: number) => {
    if (!hydratedRef.current) return;

    const nextSnapshot = getResponseSnapshot(responseId);
    const savedSnapshot = lastSavedSnapshotRef.current[responseId] ?? JSON.stringify({});

    setDirtyResponseIds((prev) => {
      const alreadyDirty = prev.includes(responseId);
      let next = prev;
      if (nextSnapshot === savedSnapshot) {
        next = alreadyDirty ? prev.filter((id) => id !== responseId) : prev;
      } else {
        next = alreadyDirty ? prev : [...prev, responseId];
      }
      dirtyResponseIdsRef.current = next;
      return next;
    });
    setDraftSaveState(nextSnapshot === savedSnapshot ? "saved" : "dirty");
  };

  const saveResponses = async (
    responseIds: number[],
    options: { quiet?: boolean } = {}
  ): Promise<boolean> => {
    const uniqueResponseIds = [...new Set(responseIds)];
    if (uniqueResponseIds.length === 0) {
      if (!options.quiet) {
        setDraftSaveState("saved");
      }
      return true;
    }

    if (activeSavePromiseRef.current) {
      const completed = await activeSavePromiseRef.current;
      if (!completed) return false;

      const remainingResponseIds = uniqueResponseIds.filter((responseId) =>
        dirtyResponseIdsRef.current.includes(responseId)
      );

      if (remainingResponseIds.length === 0) {
        if (!options.quiet && dirtyResponseIdsRef.current.length === 0) {
          setDraftSaveState("saved");
        }
        return true;
      }

      return saveResponses(remainingResponseIds, options);
    }

    let savePromise!: Promise<boolean>;
    savePromise = (async () => {
      isSavingRef.current = true;
      setDraftSaveState("saving");
      let savedPayloadCount = 0;

      try {
        for (const responseId of uniqueResponseIds) {
          const payload = buildSavePayload(responseId);
          if (!payload) continue;

          await validateMut.mutateAsync({
            responseId: payload.responseId,
            data: payload.data,
          });
          savedPayloadCount += 1;

          patchCachedAssessmentResponse(responseId, payload.data);
          lastSavedSnapshotRef.current[responseId] = payload.snapshot;
          setDirtyResponseIds((prev) => {
            const currentSnapshot = getResponseSnapshot(responseId);
            const shouldKeepDirty = currentSnapshot !== payload.snapshot;
            const hasDirtyEntry = prev.includes(responseId);
            let next = prev;

            if (shouldKeepDirty) {
              next = hasDirtyEntry ? prev : [...prev, responseId];
            } else if (hasDirtyEntry) {
              next = prev.filter((id) => id !== responseId);
            }

            dirtyResponseIdsRef.current = next;
            return next;
          });
        }

        await qc.invalidateQueries({
          queryKey: getGetAssessorAssessmentsAssessmentIdQueryKey(assessmentId),
          exact: true,
        });

        if (savedPayloadCount > 0) {
          setCompletedAutosaveCount((count) => count + 1);
        }
        setDraftSaveState(dirtyResponseIdsRef.current.length > 0 ? "dirty" : "saved");

        if (!options.quiet && dirtyResponseIdsRef.current.length === 0) {
          toast.success("Assessment progress saved", { duration: 2500 });
        }

        return true;
      } catch (error) {
        console.error("Error saving validation:", error);
        setDraftSaveState("error");

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

        return false;
      } finally {
        isSavingRef.current = false;
        if (activeSavePromiseRef.current === savePromise) {
          activeSavePromiseRef.current = null;
        }
      }
    })();

    activeSavePromiseRef.current = savePromise;
    return savePromise;
  };

  const flushPendingChanges = async (options: { quiet?: boolean } = {}): Promise<boolean> => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (activeSavePromiseRef.current) {
      const completed = await activeSavePromiseRef.current;
      if (!completed) return false;
    }

    return saveResponses(dirtyResponseIdsRef.current, options);
  };

  const onSaveDraft = async () => {
    await flushPendingChanges();
  };

  useEffect(() => {
    const nextSnapshots: Record<number, string> = {};
    let nextDirtyIds = [...dirtyResponseIdsRef.current];

    responses.forEach((response) => {
      const serverSnapshot = getServerSnapshot(response);
      const isDirty = nextDirtyIds.includes(response.id);

      if (isDirty) {
        const localSnapshot = getResponseSnapshot(response.id);
        if (serverSnapshot === localSnapshot) {
          nextSnapshots[response.id] = serverSnapshot;
          nextDirtyIds = nextDirtyIds.filter((id) => id !== response.id);
        } else {
          // Preserve optimistic dirty state across this hydration
          nextSnapshots[response.id] = lastSavedSnapshotRef.current[response.id] ?? serverSnapshot;
        }
      } else {
        nextSnapshots[response.id] = serverSnapshot;
      }
    });

    lastSavedSnapshotRef.current = nextSnapshots;
    hydratedRef.current = true;

    // Only update state if dirty IDs actually changed
    if (
      nextDirtyIds.length !== dirtyResponseIdsRef.current.length ||
      !nextDirtyIds.every((id, i) => id === dirtyResponseIdsRef.current[i])
    ) {
      dirtyResponseIdsRef.current = nextDirtyIds;
      setDirtyResponseIds(nextDirtyIds);
    }

    setDraftSaveState(nextDirtyIds.length > 0 ? "dirty" : "idle");
  }, [responses]);

  useEffect(() => {
    if (!hydratedRef.current || dirtyResponseIds.length === 0) {
      return;
    }

    setDraftSaveState("dirty");
    autoSaveTimerRef.current = setTimeout(() => {
      void saveResponses(dirtyResponseIds, { quiet: true });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [dirtyResponseIds, form, checklistState, calibrationFlags]);

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
      const saved = await flushPendingChanges({ quiet: true });
      if (!saved) return;

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
      } else if (errorInfo.type === "server") {
        toast.error("Server temporarily unavailable", {
          description: "The server is busy. Please wait a moment and try again.",
          duration: 6000,
        });
      } else if (errorInfo.type === "validation") {
        // Check if the error is about unreviewed indicators
        const isUnreviewedError =
          errorInfo.message?.toLowerCase().includes("unreviewed") ||
          errorInfo.message?.toLowerCase().includes("validation_status");

        if (isUnreviewedError) {
          toast.error("Please complete the Compliance Overview first", {
            description:
              "You must review and confirm all indicator statuses in the Compliance Overview before finalizing.",
            duration: 6000,
          });
        } else {
          toast.error("Cannot finalize validation", {
            description: errorInfo.message,
            duration: 6000,
          });
        }
      } else {
        toast.error("Finalization failed", {
          description: "Please try again. If the problem persists, contact your MLGOO-DILG.",
          duration: 6000,
        });
      }
    }
  };

  const onCalibrate = async () => {
    // Validate flagged indicators have comments
    const flaggedResponseIds = Object.entries(calibrationFlags)
      .filter(([, flagged]) => flagged === true)
      .map(([id]) => Number(id));

    const flaggedWithoutComments = flaggedResponseIds.filter((responseId) => {
      const comment = form[responseId]?.publicComment;
      return !comment || comment.trim().length === 0;
    });

    if (flaggedWithoutComments.length > 0) {
      toast.error("Missing Calibration Comments", {
        description: `${flaggedWithoutComments.length} flagged indicator(s) are missing comments. Please add a comment to each flagged indicator explaining what needs to be corrected.`,
        duration: 7000,
      });
      return;
    }

    // Show immediate feedback that the process started
    toast.loading("Submitting for calibration...", { id: "calibrate-toast" });

    try {
      // Save any pending changes first
      const saved = await flushPendingChanges({ quiet: true });
      if (!saved) return;

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
      } else if (errorInfo.type === "server") {
        toast.error("Server temporarily unavailable", {
          description: "The server is busy. Please wait a moment and try again.",
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
    // On mobile, auto-switch to files tab when indicator is selected
    if (window.innerWidth < 768) {
      setMobileTab("files");
    }
  };

  const handleFormFieldChange = (
    responseId: number,
    field: "status" | "publicComment",
    value: string
  ) => {
    const currentEntry = formRef.current[responseId] ?? {};
    if (currentEntry[field] === value) return;

    const nextForm = {
      ...formRef.current,
      [responseId]: {
        ...currentEntry,
        [field]: value,
      },
    };

    formRef.current = nextForm;
    syncDirtyStateForResponse(responseId);
    startTransition(() => {
      setForm(nextForm);
    });
  };

  const handleChecklistChange = (key: string, value: any) => {
    if (checklistStateRef.current[key] === value) return;

    const nextChecklistState = {
      ...checklistStateRef.current,
      [key]: value,
    };

    checklistStateRef.current = nextChecklistState;

    const match = key.match(/^checklist_(\d+)_/);
    if (!match) return;

    syncDirtyStateForResponse(Number(match[1]));
    startTransition(() => {
      setChecklistState(nextChecklistState);
    });
  };

  const handleCalibrationFlagChange = (responseId: number, flagged: boolean) => {
    if (calibrationFlagsRef.current[responseId] === flagged) return;

    const nextCalibrationFlags = {
      ...calibrationFlagsRef.current,
      [responseId]: flagged,
    };

    calibrationFlagsRef.current = nextCalibrationFlags;
    syncDirtyStateForResponse(responseId);
    startTransition(() => {
      setCalibrationFlags(nextCalibrationFlags);
    });
  };

  const handleMovAttentionChange = useCallback(
    (responseId: number, movFileId: number, hasAttention: boolean) => {
      setMovAttentionByResponse((prev) => ({
        ...prev,
        [responseId]: {
          ...(prev[responseId] ?? {}),
          [movFileId]: hasAttention,
        },
      }));
    },
    []
  );

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

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1 text-muted-foreground hover:text-foreground px-1.5 sm:px-2"
            >
              <Link href="/validator/submissions">
                <ChevronLeft className="h-4 w-4" />
                <span className="font-medium hidden sm:inline">Queue</span>
              </Link>
            </Button>
            <div className="h-6 sm:h-8 w-px bg-border shrink-0" />
            <div className="min-w-0 flex flex-col justify-center flex-1">
              <div className="text-xs sm:text-sm font-bold text-foreground truncate leading-tight">
                {barangayName}{" "}
                <span className="text-muted-foreground font-medium mx-1 hidden sm:inline">/</span>{" "}
                <span className="hidden md:inline">{governanceArea}</span>
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight mt-0.5 hidden sm:block">
                Validator Assessment Review {cycleYear ? `· CY ${cycleYear}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {statusText ? (
              <div className="scale-75 sm:scale-90 origin-right">
                <StatusBadge status={statusText} />
              </div>
            ) : null}
            <Button
              variant="default"
              size="sm"
              className="gap-1 sm:gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-2 sm:px-4"
              disabled={draftSaveState === "saving"}
              onClick={async () => {
                // Save draft first, then navigate to compliance overview
                const saved = await flushPendingChanges({ quiet: true });
                if (!saved) return;
                router.push(`/validator/submissions/${assessmentId}/compliance`);
              }}
            >
              <ClipboardCheck className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Compliance Overview</span>
              <span className="sm:hidden">Compliance</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation (< 768px) */}
      <div className="md:hidden sticky top-[56px] z-10 bg-background border-b border-border">
        <div className="flex">
          <button
            onClick={() => setMobileTab("indicators")}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              mobileTab === "indicators" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Indicators
            {mobileTab === "indicators" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setMobileTab("files")}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              mobileTab === "files" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Files
            {mobileTab === "files" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setMobileTab("validation")}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              mobileTab === "validation" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Validation
            {mobileTab === "validation" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Responsive Layout */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-[1920px] mx-auto">
          {/* Mobile: Single Panel with Tabs (< 768px) */}
          <div className="md:hidden h-[calc(100vh-168px)] bg-white">
            {mobileTab === "indicators" && (
              <div className="h-full overflow-y-auto bg-muted/5">
                <TreeNavigator
                  assessment={transformedAssessment as any}
                  selectedIndicatorId={selectedIndicatorId}
                  onIndicatorSelect={handleIndicatorSelect}
                  movAttentionVariant="danger"
                />
              </div>
            )}
            {mobileTab === "files" && (
              <div className="h-full overflow-hidden flex flex-col">
                <MiddleMovFilesPanel
                  assessment={data as any}
                  expandedId={expandedId ?? undefined}
                  calibrationRequestedAt={calibrationRequestedAt}
                  reworkRequestedAt={reworkRequestedAt}
                  separationLabel={separationLabel}
                  onReworkFlagSaved={(responseId, _movFileId, flagged) => {
                    handleCalibrationFlagChange(responseId, flagged);
                  }}
                  onAnnotationCreated={(responseId) => {
                    // Auto-enable calibration flag when annotation is added
                    handleCalibrationFlagChange(responseId, true);
                  }}
                  onAnnotationDeleted={(responseId, _movFileId, remainingCount) => {
                    // Auto-disable calibration flag when ALL annotations are removed
                    if (remainingCount === 0) {
                      handleCalibrationFlagChange(responseId, false);
                    }
                  }}
                  onMovAttentionChange={handleMovAttentionChange}
                />
              </div>
            )}
            {mobileTab === "validation" && (
              <div className="h-full overflow-y-auto">
                <RightAssessorPanel
                  assessment={data as any}
                  form={form}
                  expandedId={expandedId ?? undefined}
                  onToggle={(id) => setExpandedId((curr) => (curr === id ? null : id))}
                  setField={handleFormFieldChange}
                  onIndicatorSelect={(indicatorId) => {
                    // Sync the tree navigator selection when navigating via Previous/Next buttons
                    setSelectedIndicatorId(indicatorId);
                  }}
                  checklistState={checklistState}
                  onChecklistChange={handleChecklistChange}
                />
              </div>
            )}
          </div>

          {/* Tablet: 2-Column Layout (768px - 1024px) */}
          <div className="hidden md:flex lg:hidden h-[calc(100vh-125px)] bg-white border-b border-[var(--border)]">
            {/* Left Sidebar - Indicators */}
            <div className="w-[240px] flex-shrink-0 border-r border-[var(--border)] overflow-hidden flex flex-col bg-muted/5">
              <div className="flex-1 overflow-y-auto">
                <TreeNavigator
                  assessment={transformedAssessment as any}
                  selectedIndicatorId={selectedIndicatorId}
                  onIndicatorSelect={handleIndicatorSelect}
                  movAttentionVariant="danger"
                />
              </div>
            </div>

            {/* Right Content - Files + Validation Tabs */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab Bar */}
              <div className="flex border-b border-border bg-muted/30">
                <button
                  onClick={() => setMobileTab("files")}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                    mobileTab === "files"
                      ? "text-foreground bg-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Files
                  {mobileTab === "files" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setMobileTab("validation")}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                    mobileTab === "validation"
                      ? "text-foreground bg-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Validation
                  {mobileTab === "validation" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden bg-white">
                {mobileTab === "files" && (
                  <div className="h-full overflow-hidden flex flex-col">
                    <MiddleMovFilesPanel
                      assessment={data as any}
                      expandedId={expandedId ?? undefined}
                      calibrationRequestedAt={calibrationRequestedAt}
                      reworkRequestedAt={reworkRequestedAt}
                      separationLabel={separationLabel}
                      onReworkFlagSaved={(responseId, _movFileId, flagged) => {
                        handleCalibrationFlagChange(responseId, flagged);
                      }}
                      onAnnotationCreated={(responseId) => {
                        // Auto-enable calibration flag when annotation is added
                        handleCalibrationFlagChange(responseId, true);
                      }}
                      onAnnotationDeleted={(responseId, _movFileId, remainingCount) => {
                        // Auto-disable calibration flag when ALL annotations are removed
                        if (remainingCount === 0) {
                          handleCalibrationFlagChange(responseId, false);
                        }
                      }}
                      onMovAttentionChange={handleMovAttentionChange}
                    />
                  </div>
                )}
                {mobileTab === "validation" && (
                  <div className="h-full overflow-y-auto">
                    <RightAssessorPanel
                      assessment={data as any}
                      form={form}
                      expandedId={expandedId ?? undefined}
                      onToggle={(id) => setExpandedId((curr) => (curr === id ? null : id))}
                      setField={handleFormFieldChange}
                      onIndicatorSelect={(indicatorId) => {
                        // Sync the tree navigator selection when navigating via Previous/Next buttons
                        setSelectedIndicatorId(indicatorId);
                      }}
                      checklistState={checklistState}
                      onChecklistChange={handleChecklistChange}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop: 3-Column Layout (≥ 1024px) */}
          <div className="hidden lg:flex flex-row h-[calc(100vh-125px)] bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
            {/* Left Panel - Indicator Tree Navigation */}
            <div className="w-[280px] flex-shrink-0 border-r border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">
              <div className="flex-1 overflow-y-auto">
                <TreeNavigator
                  assessment={transformedAssessment as any}
                  selectedIndicatorId={selectedIndicatorId}
                  onIndicatorSelect={handleIndicatorSelect}
                  movAttentionVariant="danger"
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
                onReworkFlagSaved={(responseId, _movFileId, flagged) => {
                  handleCalibrationFlagChange(responseId, flagged);
                }}
                onAnnotationCreated={(responseId) => {
                  // Auto-enable calibration flag when annotation is added
                  handleCalibrationFlagChange(responseId, true);
                }}
                onAnnotationDeleted={(responseId, _movFileId, remainingCount) => {
                  // Auto-disable calibration flag when ALL annotations are removed
                  if (remainingCount === 0) {
                    handleCalibrationFlagChange(responseId, false);
                  }
                }}
                onMovAttentionChange={handleMovAttentionChange}
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
                  setField={handleFormFieldChange}
                  onIndicatorSelect={(indicatorId) => {
                    // Sync the tree navigator selection when navigating via Previous/Next buttons
                    setSelectedIndicatorId(indicatorId);
                  }}
                  checklistState={checklistState}
                  onChecklistChange={handleChecklistChange}
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
        <div className="relative max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3 flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between">
          <div className="absolute inset-x-0 -top-[3px] h-[3px] bg-black/5">
            <div
              className="h-full bg-[var(--cityscape-yellow)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-[11px] sm:text-xs text-muted-foreground">
            Indicators Reviewed: {reviewed}/{total}
          </div>
          <div className="flex flex-col sm:flex-row w-full md:w-auto items-stretch sm:items-center gap-2">
            <Button
              size="sm"
              type="button"
              onClick={() => setShowCalibrationConfirm(true)}
              disabled={calibrateMut.isPending}
              className="w-full sm:w-auto text-[var(--cityscape-accent-foreground)] hover:opacity-90 text-xs sm:text-sm h-9 sm:h-10"
              style={{
                background: "var(--cityscape-yellow)",
              }}
              title={
                allAreasCalibrated
                  ? "All governance areas have already been calibrated (max 1 calibration per area)"
                  : !Object.values(calibrationFlags).some((v) => v === true)
                    ? "Flag at least one indicator for calibration using the toggle in the MOV viewer"
                    : calibratedAreaIds.length > 0
                      ? `${calibratedAreaIds.length} area(s) already calibrated. Only flag indicators from uncalibrated areas.`
                      : undefined
              }
            >
              {calibrateMut.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-1.5 h-3 w-3 sm:h-4 sm:w-4 inline-block"
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
                  <span className="hidden sm:inline">Submitting...</span>
                  <span className="sm:hidden">Processing...</span>
                </>
              ) : allAreasCalibrated ? (
                <>
                  <span className="hidden sm:inline">All Areas Calibrated</span>
                  <span className="sm:hidden">All Used</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Submit for Calibration</span>
                  <span className="sm:hidden">Calibration</span>
                </>
              )}
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={() => {
                // Check if any indicators are flagged for calibration
                const hasCalibrationFlags = Object.values(calibrationFlags).some((v) => v === true);
                if (hasCalibrationFlags) {
                  toast.warning("Cannot finalize with calibration flags", {
                    description:
                      "Remove all calibration flags or use 'Submit for Calibration' instead.",
                    duration: 5000,
                  });
                  return;
                }
                // Check if compliance overview is completed (all validation_status confirmed)
                if (!allConfirmed) {
                  toast.warning("Complete Compliance Overview", {
                    description: `${confirmedCount}/${total} indicators confirmed`,
                    duration: 5000,
                    action: {
                      label: "Open",
                      onClick: async () => {
                        const saved = await flushPendingChanges({ quiet: true });
                        if (!saved) return;
                        router.push(`/validator/submissions/${assessmentId}/compliance`);
                      },
                    },
                  });
                  return;
                }
                setShowFinalizeConfirm(true);
              }}
              disabled={
                finalizeMut.isPending || Object.values(calibrationFlags).some((v) => v === true)
              }
              className="w-full sm:w-auto text-white hover:opacity-90 text-xs sm:text-sm h-9 sm:h-10"
              style={{
                background: Object.values(calibrationFlags).some((v) => v === true)
                  ? "var(--muted)"
                  : allConfirmed
                    ? "var(--success)"
                    : "var(--muted)",
              }}
              title={
                Object.values(calibrationFlags).some((v) => v === true)
                  ? "Cannot finalize while indicators are flagged for calibration. Remove all calibration flags or use 'Submit for Calibration' instead."
                  : !allConfirmed
                    ? `Complete Compliance Overview first (${confirmedCount}/${total} confirmed)`
                    : undefined
              }
            >
              {finalizeMut.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-1.5 h-3 w-3 sm:h-4 sm:w-4 inline-block"
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
                  <span className="hidden sm:inline">Finalizing...</span>
                  <span className="sm:hidden">Processing...</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Finalize Validation</span>
                  <span className="sm:hidden">Finalize</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <AutosaveStatusPill
        state={draftSaveState}
        completedSaveCount={completedAutosaveCount}
        onRetry={onSaveDraft}
      />

      {/* Confirmation Dialog - Submit for Calibration */}
      <AlertDialog open={showCalibrationConfirm} onOpenChange={setShowCalibrationConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit for Calibration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the flagged indicators back to BLGU for calibration. The BLGU will need
              to address the issues and resubmit. Note: Calibration can only be used once per
              governance area.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCalibrationConfirm(false);
                onCalibrate();
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Yes, Submit for Calibration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog - Finalize Validation */}
      <AlertDialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Validation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will complete the validation for your assigned governance area and send the
              assessment for MLGOO approval. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowFinalizeConfirm(false);
                onFinalize();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Yes, Finalize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
