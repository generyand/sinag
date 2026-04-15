"use client";
"use no memo";

// Button validation logic:
// - Save Draft: Always enabled unless action in progress
// - Send for Rework: Enabled when ALL indicators reviewed AND at least one rework toggle is ON
//   (bypasses allReviewed when auto-flagged empty indicators exist from auto-submitted assessments)
// - Approve: Enabled when ALL indicators reviewed AND NO rework toggles are ON
//   (force-enabled when rework cycle is used up - assessor must approve)

import { TreeNavigator } from "@/components/features/assessments/tree-navigation";
import { AutosaveStatusPill } from "@/components/features/shared/AutosaveStatusPill";
import { StatusBadge } from "@/components/shared";
import { ValidationPanelSkeleton } from "@/components/shared/skeletons";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { classifyError } from "@/lib/error-utils";
import { useAuthStore } from "@/store/useAuthStore";
import {
  getGetAssessorAssessmentsAssessmentIdQueryKey,
  useGetAssessorAssessmentsAssessmentId,
  usePostAssessorAssessmentResponsesResponseIdValidate,
  usePostAssessorAssessmentsAssessmentIdFinalize,
  usePostAssessorAssessmentsAssessmentIdRework,
  // Per-area endpoints for area-specific assessors
  usePostAssessorAssessmentsAssessmentIdAreasGovernanceAreaIdApprove,
  usePostAssessorAssessmentsAssessmentIdAreasGovernanceAreaIdRework,
} from "@sinag/shared";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { MiddleMovFilesPanel } from "./MiddleMovFilesPanel";

// Lazy load heavy RightAssessorPanel component (1400+ LOC)
const RightAssessorPanel = dynamic(
  () => import("./RightAssessorPanel").then((mod) => ({ default: mod.RightAssessorPanel })),
  {
    loading: () => <ValidationPanelSkeleton />,
    ssr: false,
  }
);

interface AssessorValidationClientProps {
  assessmentId: number;
}

type AnyRecord = Record<string, any>;
type DraftSaveState = "idle" | "dirty" | "saving" | "saved" | "error";
const AUTOSAVE_DEBOUNCE_MS = 3500;

function upsertValidationFeedbackComment(
  feedbackComments: AnyRecord[],
  comment: string | null
): AnyRecord[] {
  const withoutAssessorValidationComments = feedbackComments.filter((existingComment) => {
    if (existingComment.comment_type !== "validation" || existingComment.is_internal_note) {
      return true;
    }
    const commenterRole = existingComment.assessor?.role?.toLowerCase() || "";
    return commenterRole !== "assessor";
  });

  if (!comment || comment.trim().length === 0) {
    return withoutAssessorValidationComments;
  }

  return [
    {
      id: `local-assessor-validation-${Date.now()}`,
      comment,
      comment_type: "validation",
      is_internal_note: false,
      created_at: new Date().toISOString(),
      assessor: {
        role: "ASSESSOR",
      },
    },
    ...withoutAssessorValidationComments,
  ];
}

export function AssessorValidationClient({ assessmentId }: AssessorValidationClientProps) {
  const { data, isLoading, isError, error, dataUpdatedAt } = useGetAssessorAssessmentsAssessmentId(
    assessmentId,
    {
      query: {
        queryKey: getGetAssessorAssessmentsAssessmentIdQueryKey(assessmentId),
        // CRITICAL: Disable refetchOnWindowFocus to prevent losing unsaved work
        // When user alt-tabs back, we don't want to overwrite their checklist changes
        refetchOnWindowFocus: false,
        refetchOnMount: true, // Still fetch fresh data on initial mount
        staleTime: 5 * 60 * 1000, // 5 minutes - data won't go stale while working
      },
    }
  );
  const qc = useQueryClient();
  const validateMut = usePostAssessorAssessmentResponsesResponseIdValidate();
  const reworkMut = usePostAssessorAssessmentsAssessmentIdRework();
  const finalizeMut = usePostAssessorAssessmentsAssessmentIdFinalize();
  // Per-area mutations for area-specific assessors
  const areaApproveMut = usePostAssessorAssessmentsAssessmentIdAreasGovernanceAreaIdApprove();
  const areaReworkMut = usePostAssessorAssessmentsAssessmentIdAreasGovernanceAreaIdRework();
  const { toast } = useToast();
  const router = useRouter();

  // Get user role to determine workflow behavior
  const { user } = useAuthStore();
  const userRole = user?.role || "";
  const isValidator = userRole === "VALIDATOR";
  const isAssessor = userRole === "ASSESSOR";
  // Get assessor's assigned governance area (for area-specific workflow)
  const assessorAreaId = user?.assessor_area_id ?? null;
  // Flag to detect configuration error (assessor without area assignment)
  const isAssessorWithoutArea = isAssessor && !assessorAreaId;

  // All hooks must be called before any conditional returns
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [form, setForm] = useState<
    Record<number, { status?: "Pass" | "Fail" | "Conditional"; publicComment?: string }>
  >({});
  const [checklistData, setChecklistData] = useState<Record<string, any>>({}); // Store checklist checkbox/input data
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false); // Local loading state instead of relying on mutation
  const isSavingRef = useRef(false); // Prevent multiple concurrent saves
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>("idle");
  const [completedAutosaveCount, setCompletedAutosaveCount] = useState(0);
  const [dirtyResponseIds, setDirtyResponseIds] = useState<number[]>([]);
  const hydratedRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef<Record<number, string>>({});
  const activeSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const isInterceptingNavigationRef = useRef(false);
  const formRef = useRef(form);
  const checklistDataRef = useRef(checklistData);
  const reworkFlagsRef = useRef<Record<number, Set<number>>>({});
  const dirtyResponseIdsRef = useRef(dirtyResponseIds);
  const responsesRef = useRef<AnyRecord[]>([]);

  // Confirmation dialog states
  const [showReworkConfirm, setShowReworkConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  // Mobile tab state: 'indicators' | 'files' | 'validation'
  const [mobileTab, setMobileTab] = useState<"indicators" | "files" | "validation">("indicators");

  // Track rework flags for assessors at FILE level (responseId → Set of movFileIds with annotations)
  // This allows us to track which specific files need re-upload, not just which indicators
  const [reworkFlags, setReworkFlags] = useState<Record<number, Set<number>>>({});

  // Track which indicators were auto-flagged because they have zero MOV files (auto-submitted assessments)
  const [autoFlaggedEmptyIds, setAutoFlaggedEmptyIds] = useState<Set<number>>(new Set());

  // Initialize reworkFlags from API data (flagged_mov_file_ids for file-level tracking + manual flags)
  // Also auto-flag indicators with zero MOV files (from auto-submitted assessments)
  useEffect(() => {
    if (data) {
      const assessment: AnyRecord = (data as unknown as AnyRecord) ?? {};
      const core = (assessment.assessment as AnyRecord) ?? assessment;
      const resps: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];
      const autoSubmitted = !!core.auto_submitted_at;

      const initial: Record<number, Set<number>> = {};
      const emptyIds = new Set<number>();

      resps.forEach((r) => {
        // Use flagged_mov_file_ids for file-level tracking (MOV files where flagged_for_rework=True)
        // NOT annotated_mov_file_ids (which tracks annotations, a different concept)
        const flaggedFileIds: number[] = r.flagged_mov_file_ids || [];

        // Also check for manual rework flag in response_data
        const responseData = r.response_data || {};
        const hasManualReworkFlag = responseData.assessor_manual_rework_flag === true;

        if (flaggedFileIds.length > 0) {
          initial[r.id] = new Set(flaggedFileIds);
        } else if (hasManualReworkFlag) {
          // Manual flag without specific file annotations - create empty set to mark as flagged
          initial[r.id] = new Set();
        }

        // Auto-flag indicators with zero MOV files (auto-submitted assessments with missing uploads)
        const movFiles: any[] = (r.movs as any[]) || [];
        if (autoSubmitted && movFiles.length === 0) {
          initial[r.id] = initial[r.id] || new Set();
          emptyIds.add(r.id);
        }
      });

      setReworkFlags(initial);
      setAutoFlaggedEmptyIds(emptyIds);

      // Auto-set rework comments for empty indicators
      if (emptyIds.size > 0) {
        setForm((prev) => {
          const updated = { ...prev };
          emptyIds.forEach((responseId) => {
            if (!updated[responseId]?.publicComment) {
              updated[responseId] = {
                ...updated[responseId],
                publicComment: "No MOV files uploaded for this indicator.",
              };
            }
          });
          return updated;
        });
      }
    }
  }, [data, dataUpdatedAt]);

  // Callback when rework flag is manually toggled from UI (toggles all files for the indicator)
  // When toggled ON via UI without specific file context, we mark the indicator as flagged with an empty set
  // (the UI will check if set exists OR has items to show as flagged)
  const handleReworkFlagChange = (responseId: number, flagged: boolean) => {
    const nextReworkFlags = { ...reworkFlagsRef.current };
    if (flagged) {
      nextReworkFlags[responseId] = nextReworkFlags[responseId] || new Set();
    } else {
      delete nextReworkFlags[responseId];
    }

    reworkFlagsRef.current = nextReworkFlags;
    syncDirtyStateForResponse(responseId);
    startTransition(() => {
      setReworkFlags(nextReworkFlags);
    });
  };

  // Annotation created/deleted callbacks - no longer update reworkFlags
  // The rework toggle (Save Feedback) is the sole source of truth for progress indicators
  const handleAnnotationCreated = (_responseId: number, _movFileId: number) => {
    // Annotations don't affect progress indicator icons; only the explicit rework toggle does
  };

  const handleAnnotationDeleted = (
    _responseId: number,
    _movFileId: number,
    _remainingCountForFile: number
  ) => {
    // Annotations don't affect progress indicator icons; only the explicit rework toggle does
  };

  // Callback when assessor saves MOV feedback with rework flag - update state for progress indicator
  const handleReworkFlagSaved = (responseId: number, movFileId: number, flagged: boolean) => {
    const nextReworkFlags = { ...reworkFlagsRef.current };
    if (flagged) {
      const newSet = new Set(nextReworkFlags[responseId] || []);
      newSet.add(movFileId);
      nextReworkFlags[responseId] = newSet;
    } else {
      const existingSet = nextReworkFlags[responseId];
      if (existingSet) {
        const newSet = new Set(existingSet);
        newSet.delete(movFileId);
        if (newSet.size === 0) {
          delete nextReworkFlags[responseId];
        } else {
          nextReworkFlags[responseId] = newSet;
        }
      }
    }

    reworkFlagsRef.current = nextReworkFlags;
    syncDirtyStateForResponse(responseId);
    startTransition(() => {
      setReworkFlags(nextReworkFlags);
    });
  };

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

  // Load saved checklist data from response_data when component mounts or data changes
  // Using dataUpdatedAt to detect when data has been refetched (even if reference is same)
  useEffect(() => {
    if (data) {
      const assessment: AnyRecord = (data as unknown as AnyRecord) ?? {};
      const core = (assessment.assessment as AnyRecord) ?? assessment;
      const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];

      const initialChecklistData: Record<string, any> = {};

      // Extract saved checklist data from each response's response_data
      responses.forEach((resp: AnyRecord) => {
        const responseId = resp.id;

        // Load saved checklist data for both first-review and rework responses.
        // For rework responses this preserves the assessor's latest persisted review state
        // after a refetch, matching RightAssessorPanel's hydration behavior.
        const responseData = resp.response_data || {};

        // Find all assessor_val_ and validator_val_ prefixed fields and convert them to checklist format
        // Priority: validator_val_ takes precedence over assessor_val_ (validators override assessors)
        Object.keys(responseData).forEach((key) => {
          let fieldName: string | null = null;
          let prefix: string | null = null;

          if (key.startsWith("validator_val_")) {
            fieldName = key.replace("validator_val_", "");
            prefix = "validator_val_";
          } else if (key.startsWith("assessor_val_")) {
            fieldName = key.replace("assessor_val_", "");
            prefix = "assessor_val_";
          }

          if (fieldName && prefix) {
            // Convert to checklist format: checklist_{responseId}_{fieldName}
            const checklistKey = `checklist_${responseId}_${fieldName}`;

            // Only set if not already set by a higher priority prefix (validator_val_)
            // Since we iterate Object.keys which has no guaranteed order, check if validator_val_ version exists
            const validatorKey = `validator_val_${fieldName}`;
            if (prefix === "assessor_val_" && validatorKey in responseData) {
              // Skip assessor value if validator value exists
              return;
            }
            initialChecklistData[checklistKey] = responseData[key];
          }
        });
      });

      const pendingOrDirtyResponseIds = new Set<number>(dirtyResponseIdsRef.current);
      if (activeSavePromiseRef.current !== null || autoSaveTimerRef.current !== null) {
        responses.forEach((response) => {
          if (response.id in formRef.current || response.id in reworkFlagsRef.current) {
            pendingOrDirtyResponseIds.add(response.id);
          }

          const hasChecklistDraft = Object.keys(checklistDataRef.current).some((key) =>
            key.startsWith(`checklist_${response.id}_`)
          );
          if (hasChecklistDraft) {
            pendingOrDirtyResponseIds.add(response.id);
          }
        });
      }

      pendingOrDirtyResponseIds.forEach((responseId) => {
        Object.keys(checklistDataRef.current).forEach((key) => {
          if (!key.startsWith(`checklist_${responseId}_`)) return;
          initialChecklistData[key] = checklistDataRef.current[key];
        });
      });

      // IMPORTANT: Replace the entire checklistData state (don't merge with old data)
      // This ensures old data for requires_rework indicators is completely cleared
      checklistDataRef.current = initialChecklistData;
      setChecklistData(initialChecklistData);
    }
  }, [data, dataUpdatedAt]);

  // Extract and prepare data (BEFORE conditional returns to maintain hook order)
  const assessment: AnyRecord = (data as unknown as AnyRecord) ?? {};
  const core = (assessment.assessment as AnyRecord) ?? assessment;
  const responses: AnyRecord[] = useMemo(
    () =>
      ((core.responses as AnyRecord[]) ?? []).sort((a: any, b: any) => {
        // Sort by governance_area.id first, then by indicator_code
        const areaA = a.indicator?.governance_area?.id || 999;
        const areaB = b.indicator?.governance_area?.id || 999;
        if (areaA !== areaB) return areaA - areaB;

        // Within same area, sort by indicator_code (e.g., "3.2.1", "3.2.2", "3.2.3")
        const codeA = a.indicator?.indicator_code || "";
        const codeB = b.indicator?.indicator_code || "";
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: "base" });
      }),
    [core.responses]
  );

  const reworkCount: number = core.rework_count ?? 0;
  // Per-area rework tracking: each of the 6 governance areas gets its own independent rework round
  // my_area_rework_used is True only if THIS assessor's area has used its rework round
  const myAreaReworkUsed: boolean = (core.my_area_rework_used ?? false) as boolean;

  // Per-area status for the current assessor's governance area
  // Values: "draft", "submitted", "in_review", "rework", "approved"
  const myAreaStatus: string | null = (core?.my_area_status ?? null) as string | null;

  // Check if the area is "locked" (already sent for rework or approved)
  // When locked, disable Save/Rework/Approve buttons for assessors
  const isAreaLocked: boolean = myAreaStatus === "rework" || myAreaStatus === "approved";

  // Track if any action is in progress to disable all buttons
  // This prevents users from clicking other buttons while an action is processing
  const isAnyActionPending: boolean =
    isSaving ||
    areaApproveMut.isPending ||
    areaReworkMut.isPending ||
    finalizeMut.isPending ||
    reworkMut.isPending;

  // Get timestamps for MOV file separation (new vs old files)
  // For assessors: rework_requested_at shows files uploaded after assessor's previous rework request
  const reworkRequestedAt: string | null = (core?.rework_requested_at ?? null) as string | null;

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
  // Check if this assessment was auto-submitted because BLGU missed the deadline
  const isAutoSubmitted: boolean = !!core?.auto_submitted_at;

  // Per-area approval tracking (for assessor workflow visibility)
  const areaAssessorApproved: Record<string, boolean> = (core?.area_assessor_approved ??
    {}) as Record<string, boolean>;
  const approvedAreasCount = Object.values(areaAssessorApproved).filter(Boolean).length;
  const totalGovernanceAreas = 6; // SGLGB has 6 governance areas

  // Get the assessor's assigned area name (for header display)
  const assessorAreaName: string = useMemo(() => {
    if (!isAssessor || !assessorAreaId) return "";
    // Find the governance area name from the responses
    const areaResponse = responses.find(
      (r: AnyRecord) => r.indicator?.governance_area?.id === assessorAreaId
    );
    return areaResponse?.indicator?.governance_area?.name ?? `Area ${assessorAreaId}`;
  }, [isAssessor, assessorAreaId, responses]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  // NOTE: checklistDataRef is kept in sync manually:
  // - hydration effect (line ~344) sets it when server data arrives
  // - handleChecklistChange sets it on user edits
  // A useEffect sync here would race with the hydration effect and overwrite
  // the ref with stale state before the snapshot hydration sets hydratedRef=true.

  useEffect(() => {
    reworkFlagsRef.current = reworkFlags;
  }, [reworkFlags]);

  useEffect(() => {
    dirtyResponseIdsRef.current = dirtyResponseIds;
  }, [dirtyResponseIds]);

  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  const isMeaningfulChecklistValue = (value: unknown): boolean => {
    if (value === true) return true;
    if (typeof value === "string") return value.trim().length > 0;
    return false;
  };

  const buildAssessorResponseDataSnapshot = (responseId: number): Record<string, any> => {
    const response = responsesRef.current.find((item) => item.id === responseId);
    if (!response) return {};

    const snapshotData: Record<string, any> = {};
    const previousResponseData = (response as AnyRecord).response_data || {};

    Object.keys(checklistDataRef.current).forEach((key) => {
      if (!key.startsWith(`checklist_${responseId}_`)) return;

      const fieldName = key.replace(`checklist_${responseId}_`, "");
      const snapshotKey = `assessor_val_${fieldName}`;
      const currentValue = checklistDataRef.current[key];
      const previousValue = previousResponseData[snapshotKey];

      if (isMeaningfulChecklistValue(currentValue)) {
        snapshotData[snapshotKey] = currentValue;
        return;
      }

      // Preserve explicit clears when a meaningful server value already exists.
      if (previousValue !== undefined && previousValue !== currentValue) {
        snapshotData[snapshotKey] = currentValue;
      }
    });

    const hasManualFlag = responseId in reworkFlagsRef.current;
    if (hasManualFlag) {
      snapshotData.assessor_manual_rework_flag = true;
    } else if (previousResponseData.assessor_manual_rework_flag === true) {
      snapshotData.assessor_manual_rework_flag = false;
    }

    return snapshotData;
  };

  const getResponseSnapshot = (responseId: number): string => {
    const currentForm = formRef.current[responseId];
    const rawComment = currentForm?.publicComment ?? null;
    // Normalize empty/whitespace-only comments to null so they match the server
    // snapshot (the server never stores empty comments in feedback_comments).
    const normalizedComment = rawComment && rawComment.trim().length > 0 ? rawComment : null;

    const responseDataSnapshot = buildAssessorResponseDataSnapshot(responseId);
    const sortedKeys = Object.keys(responseDataSnapshot).sort();
    const sortedResponseData: Record<string, any> = {};
    sortedKeys.forEach((k) => {
      sortedResponseData[k] = responseDataSnapshot[k];
    });

    return JSON.stringify({
      public_comment: normalizedComment,
      response_data: sortedResponseData,
    });
  };

  const getServerSnapshot = (response: AnyRecord): string => {
    const responseData = (response.response_data as Record<string, any>) || {};
    const snapshotData: Record<string, any> = {};

    Object.keys(responseData).forEach((key) => {
      if (!key.startsWith("assessor_val_")) return;
      if (isMeaningfulChecklistValue(responseData[key])) {
        snapshotData[key] = responseData[key];
      }
    });

    if (responseData.assessor_manual_rework_flag === true) {
      snapshotData.assessor_manual_rework_flag = true;
    }

    const sortedKeys = Object.keys(snapshotData).sort();
    const sortedSnapshotData: Record<string, any> = {};
    sortedKeys.forEach((k) => {
      sortedSnapshotData[k] = snapshotData[k];
    });

    const validationComments = ((response.feedback_comments as any[]) || [])
      .filter((fc: any) => {
        if (fc.comment_type !== "validation" || fc.is_internal_note) return false;
        const commenterRole = fc.assessor?.role?.toLowerCase() || "";
        return commenterRole === "assessor";
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

    return JSON.stringify({
      public_comment: validationComments[0]?.comment ?? null,
      response_data: sortedSnapshotData,
    });
  };

  const buildSavePayload = (responseId: number) => {
    const snapshot = getResponseSnapshot(responseId);
    const parsed = JSON.parse(snapshot) as {
      public_comment: string | null;
      response_data?: Record<string, any>;
    };
    const response = responsesRef.current.find((item) => item.id === responseId);
    if (!response) return null;

    return {
      responseId,
      snapshot,
      data: {
        public_comment: parsed.public_comment,
        response_data:
          parsed.response_data && Object.keys(parsed.response_data).length > 0
            ? parsed.response_data
            : undefined,
      },
    };
  };

  const patchCachedAssessmentResponse = (
    responseId: number,
    payload: { public_comment: string | null; response_data?: Record<string, any> }
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
            response_data: nextResponseData,
            feedback_comments: upsertValidationFeedbackComment(
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
    const currentDirtyIds = dirtyResponseIdsRef.current;
    const alreadyDirty = currentDirtyIds.includes(responseId);
    let nextDirtyIds = currentDirtyIds;

    if (nextSnapshot === savedSnapshot) {
      nextDirtyIds = alreadyDirty
        ? currentDirtyIds.filter((id) => id !== responseId)
        : currentDirtyIds;
    } else if (!alreadyDirty) {
      nextDirtyIds = [...currentDirtyIds, responseId];
    }

    dirtyResponseIdsRef.current = nextDirtyIds;
    setDirtyResponseIds(nextDirtyIds);
    setDraftSaveState(nextDirtyIds.length > 0 ? "dirty" : "saved");
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
      if (!completed) {
        return false;
      }

      const remainingResponseIds = uniqueResponseIds.filter((responseId) =>
        dirtyResponseIdsRef.current.includes(responseId)
      );

      if (remainingResponseIds.length === 0) {
        if (!options.quiet && dirtyResponseIdsRef.current.length === 0) {
          setDraftSaveState("saved");
          toast({
            title: "Saved",
            description: "Assessment progress saved",
            duration: 2000,
            className: "bg-green-600 text-white border-none",
          });
        }
        return true;
      }

      return saveResponses(remainingResponseIds, options);
    }

    const savePromise = (async () => {
      isSavingRef.current = true;
      setIsSaving(true);
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
          toast({
            title: "Saved",
            description: "Assessment progress saved",
            duration: 2000,
            className: "bg-green-600 text-white border-none",
          });
        }

        return true;
      } catch (error) {
        console.error("Error saving validation data:", error);
        validateMut.reset();
        setDraftSaveState("error");

        const errorInfo = classifyError(error);
        if (errorInfo.type === "network") {
          toast({
            title: "Unable to save draft",
            description: "Check your internet connection and try again.",
            variant: "destructive",
          });
        } else if (errorInfo.type === "auth") {
          toast({
            title: "Session expired",
            description: "Please log in again to save your work.",
            variant: "destructive",
          });
        } else if (errorInfo.type === "permission") {
          toast({
            title: "Access denied",
            description: "You do not have permission to validate this assessment.",
            variant: "destructive",
          });
        } else {
          toast({
            title: errorInfo.title,
            description: errorInfo.message,
            variant: "destructive",
          });
        }

        return false;
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
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
      if (!completed) {
        return false;
      }
    }

    return saveResponses(dirtyResponseIdsRef.current, options);
  };

  // Transform to match BLGU assessment structure for TreeNavigator
  // Memoize this so it recalculates when checklistData or form changes
  const transformedAssessment = useMemo(() => {
    // Check if this is a rework scenario
    const hasReworkCycle = responses.some((r: any) => r.requires_rework === true);

    return {
      id: assessmentId,
      completedIndicators: responses.filter((r: any) => {
        const localStatus = form[r.id]?.status;

        // For validators: Check if status is Pass
        if (localStatus) {
          return localStatus === "Pass";
        }
        if (r.validation_status === "PASS") {
          return true;
        }

        // Check if assessor has done work on this indicator
        const publicComment = form[r.id]?.publicComment;
        const hasComments = publicComment ? publicComment.trim().length > 0 : false;

        const hasChecklistData = Object.keys(checklistData).some((key) => {
          if (!key.startsWith(`checklist_${r.id}_`)) return false;
          const value = checklistData[key];
          return value === true || (typeof value === "string" && value.trim().length > 0);
        });

        // REWORK SCENARIO: If this assessment has rework indicators
        if (hasReworkCycle) {
          // Indicators with requires_rework=false are already completed (passed in first review)
          if (!r.requires_rework) {
            return true;
          }
          // Indicators with requires_rework=true need assessor work
          return hasComments || hasChecklistData;
        }

        // FRESH ASSESSMENT: Count as completed only if assessor has done work
        return hasComments || hasChecklistData;
      }).length,
      totalIndicators: responses.length, // ALWAYS 86 total indicators
      governanceAreas: responses
        .reduce((acc: any[], resp: any) => {
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

          // Determine status - priority order:
          // 1. Validators' status (Pass/Fail/Conditional)
          // 2. Assessor completed work (checklist/comments) → 'completed'
          // 3. Requires rework but no work done yet → 'needs_rework'
          // 4. Otherwise → 'not_started'
          let status = "not_started";
          const localStatus = form[resp.id]?.status;

          // For validators: Use validation_status (Pass/Fail/Conditional)
          if (localStatus) {
            status =
              localStatus === "Pass"
                ? "completed"
                : localStatus === "Fail"
                  ? "needs_rework"
                  : "not_started";
          } else if (resp.validation_status) {
            status =
              resp.validation_status === "PASS"
                ? "completed"
                : resp.validation_status === "FAIL"
                  ? "needs_rework"
                  : "not_started";
          }
          // For assessors: Check if they've completed their work
          else {
            // CRITICAL: Always check for NEW local data (current session work)
            // But skip OLD persisted data if requires_rework is true

            // Check NEW local checklist data (always, regardless of requires_rework)
            const hasChecklistData = Object.keys(checklistData).some((key) => {
              if (!key.startsWith(`checklist_${resp.id}_`)) return false;
              const value = checklistData[key];
              return value === true || (typeof value === "string" && value.trim().length > 0);
            });

            // Check NEW local comments (always, regardless of requires_rework)
            const hasLocalComments =
              form[resp.id]?.publicComment && form[resp.id]!.publicComment!.trim().length > 0;

            // Check if indicator has new MOV files uploaded after rework request
            // If BLGU uploaded new files, the assessor needs to review them fresh
            const hasNewMovsAfterRework =
              reworkRequestedAt &&
              ((resp.movs as any[]) || []).some((mov: any) => {
                const uploadedAt = mov.uploaded_at;
                if (!uploadedAt) return false;
                return new Date(uploadedAt) > new Date(reworkRequestedAt);
              });

            // Only check OLD persisted data if NOT requiring rework AND no new MOVs uploaded after rework
            let hasPersistedChecklistData = false;
            let hasPersistedComments = false;

            if (!resp.requires_rework && !hasNewMovsAfterRework) {
              // Check backend response_data for persisted checklist data
              // Check both assessor_val_ and validator_val_ prefixes
              const responseData = (resp as AnyRecord).response_data || {};
              hasPersistedChecklistData = Object.keys(responseData).some((key) => {
                if (!key.startsWith("assessor_val_") && !key.startsWith("validator_val_"))
                  return false;
                const value = responseData[key];
                return value === true || (typeof value === "string" && value.trim().length > 0);
              });

              // Check for persisted comments (from first review cycle)
              const feedbackComments = (resp as AnyRecord).feedback_comments || [];
              hasPersistedComments = feedbackComments.some(
                (fc: any) =>
                  fc.comment_type === "validation" &&
                  !fc.is_internal_note &&
                  fc.comment &&
                  fc.comment.trim().length > 0
              );
            }

            // Check if rework flag is toggled ON for this indicator (assessor reviewed it)
            // With file-level tracking, we check if the key exists in the reworkFlags object
            // BUT: If requires_rework is true, the flag was used to SEND for rework - it doesn't mean "completed"
            const hasReworkFlag = resp.id in reworkFlags;

            // IMPORTANT: Indicator needs re-review if:
            // 1. requires_rework is true (assessor flagged it, waiting for BLGU), OR
            // 2. BLGU uploaded new MOVs after rework (needs fresh assessor review)
            const isWaitingForBlgu = resp.requires_rework === true;
            const needsReReview = isWaitingForBlgu || hasNewMovsAfterRework;

            // If indicator needs re-review (requires_rework=true OR has new MOVs after rework),
            // show as needs_rework unless assessor has done NEW work in this session
            if (needsReReview) {
              // Only show as completed if assessor did NEW checklist work after BLGU uploaded
              if (hasChecklistData || hasLocalComments) {
                // Check if any MOV is flagged for rework - show different status
                if (hasReworkFlag) {
                  status = "flagged_for_rework";
                } else {
                  status = "completed";
                }
              } else {
                status = "needs_rework";
              }
            }
            // If NOT waiting for BLGU, check all sources of "completed" work
            else if (
              hasChecklistData ||
              hasLocalComments ||
              hasPersistedComments ||
              hasPersistedChecklistData ||
              hasReworkFlag
            ) {
              // Differentiate between flagged for rework vs completed (BLGU complied)
              if (hasReworkFlag) {
                status = "flagged_for_rework";
              } else {
                status = "completed";
              }
            }
          }

          existingArea.indicators.push({
            id: String(resp.id),
            code: indicator.indicator_code || indicator.code || String(resp.id),
            name: indicator.name || "Unnamed Indicator",
            status: status,
            // Store indicator_id for sorting
            indicator_id: indicator.id || 0,
          });

          return acc;
        }, [])
        .sort((a: any, b: any) => {
          // Sort governance areas by ID (FI=1, DI=2, SA=3, SO=4, BU=5, EN=6)
          return Number(a.id) - Number(b.id);
        })
        .map((area: any) => {
          // Sort indicators by code (e.g., "3.2.1", "3.2.2", "3.2.3") for proper ordering
          area.indicators.sort((a: any, b: any) =>
            a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
          );
          return area;
        }),
    };
  }, [responses, checklistData, form, dataUpdatedAt, reworkFlags, reworkRequestedAt]); // Add dataUpdatedAt to force recalc when data refetches, reworkRequestedAt for new MOV detection

  const total = responses.length;

  // Progress tracking differs by role:
  // - Validators: Must set Pass/Fail/Conditional status for all indicators
  // - Assessors: Progress tracked by checklist review (has any checklist data or comments)
  let reviewed = 0;
  let allReviewed = false;

  if (isValidator) {
    // Validators must set status for all indicators
    const reviewedWithStatus = responses.filter((r) => {
      // Check local form state
      const hasLocalStatus = !!form[r.id]?.status;

      // Check persisted validation_status
      const responseRecord = r as AnyRecord;
      const hasPersistedStatus = !!responseRecord.validation_status;

      return hasLocalStatus || hasPersistedStatus;
    }).length;

    reviewed = reviewedWithStatus;
    allReviewed = total > 0 && reviewed === total;
  } else {
    // Assessors: check if they've reviewed (via checklist, comments, or rework flag)
    const reviewedByAssessor = responses.filter((r) => {
      // Has comments
      const publicComment = form[r.id]?.publicComment;
      const hasComments = publicComment ? publicComment.trim().length > 0 : false;

      // Has checklist data
      const hasChecklistData = Object.keys(checklistData).some((key) => {
        if (!key.startsWith(`checklist_${r.id}_`)) return false;
        const value = checklistData[key];
        return value === true || (typeof value === "string" && value.trim().length > 0);
      });

      // Has rework flag toggled ON (the single source of truth for annotations)
      // With file-level tracking, check if key exists in reworkFlags
      const hasReworkFlag = r.id in reworkFlags;

      return hasComments || hasChecklistData || hasReworkFlag;
    }).length;

    reviewed = reviewedByAssessor;
    allReviewed = total > 0 && reviewed === total;
  }

  // Check if any indicator is marked as Fail (only relevant for validators)
  const anyFail =
    isValidator &&
    responses.some((r) => {
      const localFail = form[r.id]?.status === "Fail";
      const persistedFail = (r as AnyRecord).validation_status === "FAIL";
      return localFail || persistedFail;
    });

  // Check if assessor has any indicators flagged for rework
  // reworkFlags is the single source of truth (initialized from flagged_mov_file_ids, updated via Save Feedback toggle)
  // With file-level tracking, check if key exists in reworkFlags
  const hasIndicatorsFlaggedForRework =
    isAssessor &&
    responses.some((r) => {
      return r.id in reworkFlags;
    });

  // Check if any indicators in the current area were auto-flagged due to empty MOV files
  // Only count as auto-flagged if still present in reworkFlags (assessor may have manually un-toggled)
  const hasAutoFlaggedEmptyIndicators =
    isAssessor && responses.some((r) => autoFlaggedEmptyIds.has(r.id) && r.id in reworkFlags);

  const progressPct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  // Validators must provide comments for Fail/Conditional status
  const missingRequiredComments = isValidator
    ? responses.filter((r) => {
        const v = form[r.id];
        if (!v?.status) return false;
        if (v.status === "Fail" || v.status === "Conditional") {
          return !(v.publicComment && v.publicComment.trim().length > 0);
        }
        return false;
      }).length
    : 0;

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
  }, [responses, dataUpdatedAt]);

  useEffect(() => {
    if (!hydratedRef.current || dirtyResponseIds.length === 0 || isAreaLocked) {
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
  }, [dirtyResponseIds, form, checklistData, reworkFlags, isAreaLocked]);

  useEffect(() => {
    if (!hydratedRef.current || autoFlaggedEmptyIds.size === 0) return;
    autoFlaggedEmptyIds.forEach((responseId) => {
      syncDirtyStateForResponse(responseId);
    });
  }, [autoFlaggedEmptyIds]);

  useEffect(() => {
    const handleDocumentNavigation = (event: MouseEvent) => {
      if (isInterceptingNavigationRef.current) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.href === window.location.href) return;

      const hasPendingChanges =
        dirtyResponseIdsRef.current.length > 0 ||
        activeSavePromiseRef.current !== null ||
        autoSaveTimerRef.current !== null;
      if (!hasPendingChanges) return;

      event.preventDefault();
      isInterceptingNavigationRef.current = true;

      void (async () => {
        const saved = await flushPendingChanges({ quiet: true });
        if (saved) {
          router.push(`${url.pathname}${url.search}${url.hash}`);
        } else {
          isInterceptingNavigationRef.current = false;
        }
      })();
    };

    document.addEventListener("click", handleDocumentNavigation, true);
    return () => {
      document.removeEventListener("click", handleDocumentNavigation, true);
    };
  }, [router]);

  const onSendRework = async () => {
    // For ASSESSORS: Validate that flagged indicators have comments
    if (isAssessor && assessorAreaId) {
      const flaggedResponseIds = Object.keys(reworkFlags);
      const flaggedWithoutComments = flaggedResponseIds.filter((responseId) => {
        const comment = form[Number(responseId)]?.publicComment;
        return !comment || comment.trim().length === 0;
      });

      if (flaggedWithoutComments.length > 0) {
        toast({
          title: "Missing Rework Comments",
          description: `Please add comments to ${flaggedWithoutComments.length} flagged indicator(s) to explain what needs to be fixed.`,
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      // Validate flagged MOV files have assessor notes
      const movsWithoutNotes: string[] = [];

      for (const responseId of Object.keys(reworkFlags)) {
        const response = responses.find((r) => r.id === Number(responseId));
        if (!response) continue;

        const movs = (response.movs as AnyRecord[]) || [];
        for (const mov of movs) {
          if (
            mov.flagged_for_rework === true &&
            (!mov.assessor_notes || !String(mov.assessor_notes).trim())
          ) {
            const indicatorName =
              response.indicator?.indicator_code ||
              response.indicator?.name ||
              `Indicator ${response.indicator_id}`;
            movsWithoutNotes.push(indicatorName);
            break; // One per indicator is enough for the message
          }
        }
      }

      if (movsWithoutNotes.length > 0) {
        toast({
          title: "Missing MOV Notes",
          description: `${movsWithoutNotes.length} indicator(s) have flagged MOV files without notes. Please open each flagged MOV and add notes describing the issue.`,
          variant: "destructive",
          duration: 7000,
        });
        return;
      }
    }

    // Show processing toast
    toast({
      title: "Processing...",
      description: "Compiling and sending assessment for rework...",
      duration: 10000,
    });

    try {
      const saved = await flushPendingChanges({ quiet: true });
      if (!saved) return;

      // For ASSESSORS (area-specific): Use per-area rework endpoint
      // For VALIDATORS (system-wide): Use full rework endpoint
      if (isAssessor && assessorAreaId) {
        // Compile rework comments from flagged indicators
        const flaggedResponseIds = Object.keys(reworkFlags);
        const reworkComments = flaggedResponseIds
          .map((responseId) => {
            const comment = form[Number(responseId)]?.publicComment;
            return comment ? comment.trim() : null;
          })
          .filter(Boolean)
          .join("\n\n");

        await areaReworkMut.mutateAsync({
          assessmentId,
          governanceAreaId: assessorAreaId,
          data: {
            comments: reworkComments,
          },
        });

        toast({
          title: "Area Sent for Rework",
          description: "Your governance area has been sent back to BLGU for rework.",
          duration: 3000,
          className: "bg-orange-600 text-white border-none",
        });
      } else {
        // System-wide rework for validators
        await reworkMut.mutateAsync({ assessmentId });

        toast({
          title: "Sent for Rework",
          description:
            "Assessment has been sent back to BLGU for rework with your feedback comments.",
          duration: 3000,
          className: "bg-orange-600 text-white border-none",
        });
      }

      // Invalidate queries and redirect back to queue
      await qc.invalidateQueries();

      // Redirect to submissions queue after short delay
      setTimeout(() => {
        const redirectPath = isAssessor ? "/assessor/submissions" : "/validator/submissions";
        router.push(redirectPath);
      }, 1500);
    } catch (error) {
      console.error("Error sending for rework:", error);

      // Classify error for better user feedback
      const errorInfo = classifyError(error);

      if (errorInfo.type === "network") {
        toast({
          title: "Unable to send for rework",
          description: "Check your internet connection and try again.",
          variant: "destructive",
        });
      } else if (errorInfo.type === "auth") {
        toast({
          title: "Session expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
      } else if (errorInfo.type === "permission") {
        toast({
          title: "Access denied",
          description: "You do not have permission to send this assessment for rework.",
          variant: "destructive",
        });
      } else if (errorInfo.type === "server") {
        toast({
          title: "Server temporarily unavailable",
          description: "The server is busy. Please wait a moment and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: errorInfo.title,
          description: errorInfo.message,
          variant: "destructive",
        });
      }
    }
  };

  const onFinalize = async () => {
    try {
      // Save draft first (serialized requests to prevent 503 errors)
      const saved = await flushPendingChanges({ quiet: true });
      if (!saved) return;

      // For ASSESSORS (area-specific): Use per-area approve endpoint
      // For VALIDATORS (system-wide): Use full finalize endpoint
      if (isAssessor && assessorAreaId) {
        // Per-area approval for area-specific assessors
        await areaApproveMut.mutateAsync({
          assessmentId,
          governanceAreaId: assessorAreaId,
        });

        toast({
          title: "Area Approved",
          description:
            "Your governance area has been approved. When all 6 areas are approved, the assessment will move to validation.",
          duration: 3000,
          className: "bg-green-600 text-white border-none",
        });
      } else {
        // System-wide finalize for validators
        await finalizeMut.mutateAsync({ assessmentId });

        toast({
          title: "Validation Complete",
          description:
            "Assessment validation has been finalized. This is now the authoritative result.",
          duration: 3000,
          className: "bg-green-600 text-white border-none",
        });
      }

      // Invalidate queries and redirect back to queue
      await qc.invalidateQueries();

      // Redirect to submissions queue after short delay
      setTimeout(() => {
        const redirectPath = isAssessor ? "/assessor/submissions" : "/validator/submissions";
        router.push(redirectPath);
      }, 1500);
    } catch (error) {
      console.error("Error finalizing assessment:", error);

      // Classify error for better user feedback
      const errorInfo = classifyError(error);

      if (errorInfo.type === "network") {
        toast({
          title: "Unable to finalize",
          description: "Check your internet connection and try again.",
          variant: "destructive",
        });
      } else if (errorInfo.type === "auth") {
        toast({
          title: "Session expired",
          description: "Please log in again to finalize.",
          variant: "destructive",
        });
      } else if (errorInfo.type === "server") {
        toast({
          title: "Server temporarily unavailable",
          description: "The server is busy. Please wait a moment and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: errorInfo.title,
          description: errorInfo.message,
          variant: "destructive",
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
    if (checklistDataRef.current[key] === value) return;

    const nextChecklistData = {
      ...checklistDataRef.current,
      [key]: value,
    };

    checklistDataRef.current = nextChecklistData;

    const match = key.match(/^checklist_(\d+)_/);
    if (!match) return;

    syncDirtyStateForResponse(Number(match[1]));
    startTransition(() => {
      setChecklistData(nextChecklistData);
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-muted-foreground">
        Loading assessment…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10 text-sm">
        <div className="rounded-md border p-4">
          <div className="font-medium mb-1">Unable to load assessment</div>
          <div className="text-muted-foreground break-words">
            {String((error as any)?.message || "Please verify access and try again.")}
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
              <Link href={isAssessor ? "/assessor/submissions" : "/validator/submissions"}>
                <ChevronLeft className="h-4 w-4" />
                <span className="font-medium hidden sm:inline">Queue</span>
              </Link>
            </Button>
            <div className="h-6 sm:h-8 w-px bg-border shrink-0" />
            <div className="min-w-0 flex flex-col justify-center flex-1">
              {/* Show assessor's assigned area prominently */}
              {isAssessor && assessorAreaName ? (
                <>
                  <div className="text-xs sm:text-sm font-bold text-foreground truncate leading-tight">
                    {assessorAreaName}
                    <span className="text-muted-foreground font-normal text-[10px] sm:text-xs ml-2">
                      (Your Area)
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight mt-0.5">
                    {barangayName} {cycleYear ? `• CY ${cycleYear}` : ""}
                    <span className="hidden sm:inline">
                      {" "}
                      • {approvedAreasCount}/{totalGovernanceAreas} areas approved
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs sm:text-sm font-bold text-foreground truncate leading-tight">
                    {barangayName}{" "}
                    <span className="text-muted-foreground font-medium mx-1 hidden sm:inline">
                      /
                    </span>{" "}
                    <span className="hidden md:inline">{governanceArea}</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight mt-0.5 hidden sm:block">
                    {isValidator ? "Validator" : "Assessor"} Validation Workspace{" "}
                    {cycleYear ? `• CY ${cycleYear}` : ""}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Per-area progress badge for assessors */}
            {isAssessor && !isAssessorWithoutArea && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs">
                <span className="font-medium">
                  {approvedAreasCount}/{totalGovernanceAreas}
                </span>
                <span className="text-muted-foreground">areas</span>
              </div>
            )}
            {isAutoSubmitted && isAssessor && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 rounded-md text-[10px] font-medium border border-orange-200 dark:border-orange-800">
                <AlertCircle className="h-3 w-3" />
                <span>Missed Deadline</span>
              </div>
            )}
            {statusText ? (
              <div className="scale-75 sm:scale-90 origin-right">
                <StatusBadge status={statusText} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Configuration Error Alert - Assessor without area assignment */}
      {isAssessorWithoutArea && (
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-3">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              Your account is not assigned to a governance area. Please contact your administrator
              to assign you to a specific governance area before you can review assessments.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Auto-submitted alert - BLGU missed the deadline */}
      {isAutoSubmitted && isAssessor && (
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-3">
          <Alert className="border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/30">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertTitle className="text-orange-800 dark:text-orange-300">
              Auto-Submitted — BLGU Missed Deadline
            </AlertTitle>
            <AlertDescription className="text-orange-700 dark:text-orange-400">
              This assessment was automatically submitted because the BLGU did not complete their
              submission before the Phase 1 deadline.
              {hasAutoFlaggedEmptyIndicators && (
                <>
                  {" "}
                  Indicators with no uploaded MOV files have been automatically flagged for rework.
                  {myAreaReworkUsed
                    ? " The rework cycle has been used — please approve this area to send it to the validator."
                    : " You may send this area for rework immediately."}
                </>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

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
                />
              </div>
            )}
            {mobileTab === "files" && (
              <div className="h-full overflow-hidden flex flex-col">
                <MiddleMovFilesPanel
                  assessment={data as any}
                  expandedId={expandedId ?? undefined}
                  reworkRequestedAt={reworkRequestedAt}
                  separationLabel="After Rework"
                  onAnnotationCreated={handleAnnotationCreated}
                  onAnnotationDeleted={handleAnnotationDeleted}
                  onReworkFlagSaved={handleReworkFlagSaved}
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
                  onIndicatorSelect={handleIndicatorSelect}
                  setField={handleFormFieldChange}
                  onChecklistChange={handleChecklistChange}
                  reworkFlags={reworkFlags}
                  onReworkFlagChange={handleReworkFlagChange}
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
                      reworkRequestedAt={reworkRequestedAt}
                      separationLabel="After Rework"
                      onAnnotationCreated={handleAnnotationCreated}
                      onAnnotationDeleted={handleAnnotationDeleted}
                      onReworkFlagSaved={handleReworkFlagSaved}
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
                      onIndicatorSelect={handleIndicatorSelect}
                      setField={handleFormFieldChange}
                      onChecklistChange={handleChecklistChange}
                      reworkFlags={reworkFlags}
                      onReworkFlagChange={handleReworkFlagChange}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop: 3-Column Layout (≥ 1024px) */}
          <div className="hidden lg:flex flex-row h-[calc(100vh-125px)] bg-white border-b border-[var(--border)]">
            {/* Left Panel - Indicator Tree Navigation */}
            <div className="w-[280px] flex-shrink-0 border-r border-[var(--border)] overflow-hidden flex flex-col bg-muted/5">
              <div className="flex-1 overflow-y-auto">
                <TreeNavigator
                  assessment={transformedAssessment as any}
                  selectedIndicatorId={selectedIndicatorId}
                  onIndicatorSelect={handleIndicatorSelect}
                />
              </div>
            </div>

            {/* Middle Panel - MOV Files */}
            <div className="w-[320px] flex-shrink-0 border-r border-[var(--border)] overflow-hidden flex flex-col bg-white">
              <MiddleMovFilesPanel
                assessment={data as any}
                expandedId={expandedId ?? undefined}
                reworkRequestedAt={reworkRequestedAt}
                separationLabel="After Rework"
                onAnnotationCreated={handleAnnotationCreated}
                onAnnotationDeleted={handleAnnotationDeleted}
                onReworkFlagSaved={handleReworkFlagSaved}
              />
            </div>

            {/* Right Panel - MOV Checklist/Validation */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
              <div className="flex-1 overflow-y-auto">
                <RightAssessorPanel
                  assessment={data as any}
                  form={form}
                  expandedId={expandedId ?? undefined}
                  onToggle={(id) => setExpandedId((curr) => (curr === id ? null : id))}
                  onIndicatorSelect={handleIndicatorSelect}
                  setField={handleFormFieldChange}
                  onChecklistChange={handleChecklistChange}
                  reworkFlags={reworkFlags}
                  onReworkFlagChange={handleReworkFlagChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AutosaveStatusPill
        state={draftSaveState}
        completedSaveCount={completedAutosaveCount}
        onRetry={onSaveDraft}
      />

      {/* Bottom Progress Bar */}
      <div className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-card/80 backdrop-blur">
        <div className="relative max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3 flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between">
          <div className="absolute inset-x-0 -top-[3px] h-[3px] bg-black/5">
            <div
              className="h-full bg-[var(--cityscape-yellow)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-[11px] sm:text-xs text-muted-foreground">
            Indicators Reviewed: {reviewed}/{total}
            {missingRequiredComments > 0
              ? ` • Missing required comments: ${missingRequiredComments}`
              : ""}
          </div>
          <div className="flex flex-col sm:flex-row w-full md:w-auto items-stretch sm:items-center gap-2">
            {/* Send for Rework - Assessors only, requires ALL reviewed AND at least one rework toggle ON */}
            {/* When auto-flagged empty indicators exist, bypass allReviewed requirement */}
            {isAssessor && (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setShowReworkConfirm(true)}
                disabled={
                  isAnyActionPending ||
                  isAreaLocked ||
                  (!allReviewed && !hasAutoFlaggedEmptyIndicators) ||
                  !hasIndicatorsFlaggedForRework ||
                  myAreaReworkUsed
                }
                className="w-full sm:w-auto text-[var(--cityscape-accent-foreground)] hover:opacity-90 text-xs sm:text-sm h-9 sm:h-10"
                style={{
                  background:
                    isAnyActionPending ||
                    isAreaLocked ||
                    (!allReviewed && !hasAutoFlaggedEmptyIndicators) ||
                    !hasIndicatorsFlaggedForRework ||
                    myAreaReworkUsed
                      ? "var(--muted)"
                      : "var(--cityscape-yellow)",
                }}
                title={
                  isAnyActionPending
                    ? "An action is in progress. Please wait."
                    : myAreaStatus === "approved"
                      ? "Area is already approved."
                      : myAreaStatus === "rework"
                        ? "Area is already sent for rework. Waiting for BLGU to resubmit."
                        : !allReviewed && !hasAutoFlaggedEmptyIndicators
                          ? "Review all indicators before sending for rework."
                          : !hasIndicatorsFlaggedForRework
                            ? "Toggle 'Send for Rework' on at least one MOV file to enable this button."
                            : myAreaReworkUsed
                              ? "Rework round has already been used for this governance area. Each area is only allowed one rework round."
                              : undefined
                }
              >
                {reworkMut.isPending || areaReworkMut.isPending ? (
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
                    <span className="hidden sm:inline">Compiling...</span>
                    <span className="sm:hidden">Processing...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Compile and Send for Rework</span>
                    <span className="sm:hidden">Send for Rework</span>
                  </>
                )}
              </Button>
            )}

            {/* Send for Rework - Validators, requires at least one FAIL */}
            {isValidator && (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setShowReworkConfirm(true)}
                disabled={isAnyActionPending || !allReviewed || !anyFail || reworkCount !== 0}
                className="w-full sm:w-auto text-[var(--cityscape-accent-foreground)] hover:opacity-90 text-xs sm:text-sm h-9 sm:h-10"
                style={{ background: "var(--cityscape-yellow)" }}
                title={
                  !anyFail && allReviewed
                    ? "At least one indicator must be marked as 'Unmet' to send for rework"
                    : undefined
                }
              >
                {reworkMut.isPending ? (
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
                    <span className="hidden sm:inline">Compiling...</span>
                    <span className="sm:hidden">Processing...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Compile and Send for Rework</span>
                    <span className="sm:hidden">Send for Rework</span>
                  </>
                )}
              </Button>
            )}

            {/* Approve Area - Assessors approve their governance area */}
            {/* When rework cycle is used (myAreaReworkUsed), force-enable approve regardless of review/flag status */}
            {isAssessor && (
              <Button
                size="sm"
                type="button"
                onClick={() => setShowFinalizeConfirm(true)}
                disabled={
                  isAnyActionPending ||
                  isAreaLocked ||
                  (!myAreaReworkUsed && (!allReviewed || hasIndicatorsFlaggedForRework))
                }
                className="w-full sm:w-auto text-white hover:opacity-90 text-xs sm:text-sm h-9 sm:h-10"
                style={{
                  background:
                    isAnyActionPending ||
                    isAreaLocked ||
                    (!myAreaReworkUsed && (!allReviewed || hasIndicatorsFlaggedForRework))
                      ? "var(--muted)"
                      : "var(--success)",
                }}
                title={
                  isAnyActionPending
                    ? "An action is in progress. Please wait."
                    : myAreaStatus === "approved"
                      ? "Area is already approved."
                      : myAreaStatus === "rework"
                        ? "Area is sent for rework. Waiting for BLGU to resubmit."
                        : myAreaReworkUsed
                          ? "Rework cycle completed. Approve to send to validator."
                          : !allReviewed
                            ? "Review all indicators before approving."
                            : hasIndicatorsFlaggedForRework
                              ? "Cannot approve while MOV files are flagged for rework. Remove all rework flags or use 'Compile and Send for Rework' instead."
                              : undefined
                }
              >
                {finalizeMut.isPending || areaApproveMut.isPending ? (
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
                    <span className="hidden sm:inline">Submitting to Validator...</span>
                    <span className="sm:hidden">Submitting...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Approve Area and Send to Validator</span>
                    <span className="sm:hidden">Approve</span>
                  </>
                )}
              </Button>
            )}

            {/* Finalize - Validators, cannot have FAILs on first submission */}
            {isValidator && (
              <Button
                size="sm"
                type="button"
                onClick={() => setShowFinalizeConfirm(true)}
                disabled={isAnyActionPending || !allReviewed || (anyFail && reworkCount === 0)}
                className="w-full sm:w-auto text-white hover:opacity-90 text-xs sm:text-sm h-9 sm:h-10"
                style={{ background: "var(--success)" }}
                title={
                  anyFail && reworkCount === 0
                    ? "Cannot finalize with 'Unmet' indicators. Send for Rework first."
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
                    <span className="hidden sm:inline">Finalizing Validation...</span>
                    <span className="sm:hidden">Finalizing...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Finalize Validation</span>
                    <span className="sm:hidden">Finalize</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog - Send for Rework */}
      <AlertDialog open={showReworkConfirm} onOpenChange={setShowReworkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAssessor ? "Send Area for Rework?" : "Send Assessment for Rework?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAssessor
                ? "This will send your governance area back to BLGU for rework with your feedback. All 6 assessors' rework requests will be compiled into a single rework round for the BLGU to address."
                : "This will send the assessment back to BLGU for rework with your feedback. The BLGU will need to address the issues you've identified before resubmitting."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowReworkConfirm(false);
                onSendRework();
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Yes, Send for Rework
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog - Finalize/Approve */}
      <AlertDialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAssessor ? "Approve Your Governance Area?" : "Finalize Validation?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAssessor
                ? "This will approve your governance area. Once all 6 governance areas are approved by their respective assessors, the assessment will move to the Validator for final validation."
                : "This will complete the validation process. This action is final and cannot be undone."}
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
              {isAssessor ? "Yes, Approve Area" : "Yes, Finalize"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
