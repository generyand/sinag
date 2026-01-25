"use client";

// TODO: TEMPORARY CHANGES - Remove before production
// The following button validations have been temporarily disabled for testing:
// - Save Draft: isAreaLocked check removed
// - Send for Rework: hasIndicatorsFlaggedForRework, myAreaReworkUsed, isAreaLocked checks removed
// - Approve: allReviewed, isAreaLocked checks removed
// See lines ~1443, ~1463, ~1570 for the specific changes

import { TreeNavigator } from "@/components/features/assessments/tree-navigation";
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
import { useEffect, useMemo, useRef, useState } from "react";
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

  // Confirmation dialog states
  const [showReworkConfirm, setShowReworkConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  // Mobile tab state: 'indicators' | 'files' | 'validation'
  const [mobileTab, setMobileTab] = useState<"indicators" | "files" | "validation">("indicators");

  // Track rework flags for assessors at FILE level (responseId → Set of movFileIds with annotations)
  // This allows us to track which specific files need re-upload, not just which indicators
  const [reworkFlags, setReworkFlags] = useState<Record<number, Set<number>>>({});

  // Initialize reworkFlags from API data (annotated_mov_file_ids for file-level tracking + manual flags)
  useEffect(() => {
    if (data) {
      const assessment: AnyRecord = (data as unknown as AnyRecord) ?? {};
      const core = (assessment.assessment as AnyRecord) ?? assessment;
      const resps: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];

      const initial: Record<number, Set<number>> = {};
      resps.forEach((r) => {
        // Use annotated_mov_file_ids for file-level tracking (array of MOV file IDs with annotations)
        const annotatedFileIds: number[] = r.annotated_mov_file_ids || [];

        // Also check for manual rework flag in response_data
        const responseData = r.response_data || {};
        const hasManualReworkFlag = responseData.assessor_manual_rework_flag === true;

        if (annotatedFileIds.length > 0) {
          initial[r.id] = new Set(annotatedFileIds);
        } else if (hasManualReworkFlag) {
          // Manual flag without specific file annotations - create empty set to mark as flagged
          initial[r.id] = new Set();
        }
      });
      setReworkFlags(initial);
      console.log(
        "[AssessorValidationClient] Initialized reworkFlags from API (file-level + manual):",
        initial
      );
    }
  }, [data]);

  // Callback when rework flag is manually toggled from UI (toggles all files for the indicator)
  // When toggled ON via UI without specific file context, we mark the indicator as flagged with an empty set
  // (the UI will check if set exists OR has items to show as flagged)
  const handleReworkFlagChange = (responseId: number, flagged: boolean) => {
    console.log("[AssessorValidationClient] handleReworkFlagChange (manual):", responseId, flagged);
    setReworkFlags((prev) => {
      if (flagged) {
        // Keep existing set if any, or create empty set to mark as "manually flagged"
        return { ...prev, [responseId]: prev[responseId] || new Set() };
      } else {
        // Remove the entry entirely when toggled off
        const { [responseId]: _, ...rest } = prev;
        return rest;
      }
    });
  };

  // Callback when assessor creates an annotation - add file to rework set
  const handleAnnotationCreated = (responseId: number, movFileId: number) => {
    console.log(
      "[AssessorValidationClient] handleAnnotationCreated - adding file to flag:",
      responseId,
      "movFileId:",
      movFileId
    );
    setReworkFlags((prev) => {
      const existingSet = prev[responseId] || new Set();
      const newSet = new Set(existingSet);
      newSet.add(movFileId);
      return { ...prev, [responseId]: newSet };
    });
  };

  // Callback when assessor deletes an annotation - remove file from set if no annotations remain for that file
  const handleAnnotationDeleted = (
    responseId: number,
    movFileId: number,
    remainingCountForFile: number
  ) => {
    console.log(
      "[AssessorValidationClient] handleAnnotationDeleted:",
      responseId,
      "movFileId:",
      movFileId,
      "remaining:",
      remainingCountForFile
    );
    if (remainingCountForFile === 0) {
      setReworkFlags((prev) => {
        const existingSet = prev[responseId];
        if (!existingSet) return prev;

        const newSet = new Set(existingSet);
        newSet.delete(movFileId);

        // If set is now empty, remove the entry entirely
        if (newSet.size === 0) {
          const { [responseId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [responseId]: newSet };
      });
    }
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

        console.log(`[useEffect] Processing response ${responseId}:`, {
          requires_rework: resp.requires_rework,
          validation_status: resp.validation_status,
          has_response_data: !!resp.response_data,
          user_role: userRole,
        });

        // CRITICAL: Skip loading checklist data for indicators requiring rework (ASSESSOR only)
        // - ASSESSOR: These indicators need fresh/clean checklists for assessor to review
        // - VALIDATOR: Validators need to see the assessor's checklist work (don't skip)
        if (resp.requires_rework && !isValidator) {
          console.log(
            `[useEffect] ⚠️  Skipping checklist data load for response ${responseId} (requires_rework=true, user is ASSESSOR)`
          );
          return; // Don't load any checklist data for this indicator
        }

        if (resp.requires_rework && isValidator) {
          console.log(
            `[useEffect] ✓ Loading checklist data for response ${responseId} (requires_rework=true, user is VALIDATOR)`
          );
        }

        // For indicators that passed (requires_rework=false), load their old checklist data
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
            console.log(
              `[useEffect] ✓ Loading data for response ${responseId}: ${checklistKey} = ${responseData[key]} (from ${prefix})`
            );
          }
        });
      });

      console.log(
        "[useEffect] Final checklist data to load (dataUpdatedAt=" + dataUpdatedAt + "):",
        initialChecklistData
      );

      // IMPORTANT: Replace the entire checklistData state (don't merge with old data)
      // This ensures old data for requires_rework indicators is completely cleared
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

  // Check if area has been successfully approved (to disable buttons after success)
  const isAreaApproved: boolean = myAreaStatus === "approved";

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

            console.log(`[Status Calc] Response ${resp.id}:`, {
              requires_rework: resp.requires_rework,
              isWaitingForBlgu,
              hasNewMovsAfterRework,
              needsReReview,
              hasChecklistData,
              hasLocalComments,
              hasPersistedComments,
              hasPersistedChecklistData,
              hasReworkFlag,
            });

            // If indicator needs re-review (requires_rework=true OR has new MOVs after rework),
            // show as needs_rework unless assessor has done NEW work in this session
            if (needsReReview) {
              // Only show as completed if assessor did NEW checklist work after BLGU uploaded
              if (hasChecklistData || hasLocalComments) {
                status = "completed";
                console.log(
                  `[Status Calc] Response ${resp.id} → 'completed' (new work on rework indicator)`
                );
              } else {
                status = "needs_rework";
                console.log(
                  `[Status Calc] Response ${resp.id} → 'needs_rework' (needs assessor re-review)`
                );
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
              status = "completed";
              console.log(`[Status Calc] Response ${resp.id} → 'completed' (green checkmark)`);
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

  // Conditional returns AFTER all hooks to maintain hook order
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
  // reworkFlags is the single source of truth (initialized from annotated_mov_file_ids, updated via toggle/annotations)
  // With file-level tracking, check if key exists in reworkFlags
  const hasIndicatorsFlaggedForRework =
    isAssessor &&
    responses.some((r) => {
      return r.id in reworkFlags;
    });

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
    console.log("========================================");
    console.log("[onSaveDraft] SAVE DRAFT CLICKED");
    console.log("[onSaveDraft] Current checklistData state:", checklistData);
    console.log("[onSaveDraft] Current form state:", form);
    console.log("[onSaveDraft] Total responses:", responses.length);
    console.log("========================================");

    // Prevent concurrent saves
    if (isSavingRef.current) {
      console.log("[onSaveDraft] Save already in progress, ignoring duplicate call");
      return;
    }

    // Get all responses that have ANY data to save (status for validators, checklist/comments for all)
    const responsesToSave = responses.filter((r) => {
      const formData = form[r.id];

      // Has validation status (Pass/Fail/Conditional) - ONLY for validators
      const hasStatus = isValidator && !!formData?.status;

      // Has checklist data
      const hasChecklistData = Object.keys(checklistData).some((key) => {
        if (!key.startsWith(`checklist_${r.id}_`)) return false;
        const value = checklistData[key];
        return value === true || (typeof value === "string" && value.trim().length > 0);
      });

      // Has comments
      const hasComments = formData?.publicComment && formData.publicComment.trim().length > 0;

      // Has manual rework flag (assessor only) - current local state
      const hasReworkFlag = isAssessor && r.id in reworkFlags;

      // Check if indicator HAD a manual rework flag before (needs to be cleared if toggled off)
      const responseData = (r as AnyRecord).response_data || {};
      const hadManualReworkFlag = isAssessor && responseData.assessor_manual_rework_flag === true;
      const needsToClearReworkFlag = hadManualReworkFlag && !hasReworkFlag;

      console.log(
        `[onSaveDraft] Response ${r.id}: hasStatus=${hasStatus}, hasChecklistData=${hasChecklistData}, hasComments=${hasComments}, hasReworkFlag=${hasReworkFlag}, needsToClearReworkFlag=${needsToClearReworkFlag}`
      );

      return (
        hasStatus || hasChecklistData || hasComments || hasReworkFlag || needsToClearReworkFlag
      );
    });

    const allResponseIds = new Set(responsesToSave.map((r) => r.id));

    console.log("[onSaveDraft] Responses to save:", allResponseIds.size);
    console.log("[onSaveDraft] Response IDs:", Array.from(allResponseIds));

    if (allResponseIds.size === 0) {
      console.log("[onSaveDraft] No data to save, exiting");
      return;
    }

    // Set both state and ref to prevent race conditions
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      // Serialize requests to prevent overwhelming the backend
      // Previously used Promise.all() which caused 503 errors due to connection pool exhaustion
      const responseIdsArray = Array.from(allResponseIds);

      for (let i = 0; i < responseIdsArray.length; i++) {
        const responseId = responseIdsArray[i];
        const formData = form[responseId];

        console.log(
          `[onSaveDraft] Processing response ${responseId} (${i + 1}/${responseIdsArray.length})`
        );
        console.log(`[onSaveDraft] Form data for ${responseId}:`, formData);

        // Extract checklist data for this response
        const responseChecklistData: Record<string, any> = {};
        Object.keys(checklistData).forEach((key) => {
          if (key.startsWith(`checklist_${responseId}_`)) {
            // Remove the checklist_${responseId}_ prefix to get the field name
            // For assessment_field items, keep the _yes/_no suffix
            const fieldName = key.replace(`checklist_${responseId}_`, "");

            // PREFIX based on user role:
            // - Validators use "validator_val_" prefix (compliance service checks this)
            // - Assessors use "assessor_val_" prefix
            const prefix = isValidator ? "validator_val_" : "assessor_val_";
            const prefixedFieldName = `${prefix}${fieldName}`;
            responseChecklistData[prefixedFieldName] = checklistData[key];
            console.log(
              `[onSaveDraft] Extracted checklist: ${key} -> ${prefixedFieldName} = ${checklistData[key]}`
            );
          }
        });

        // Add or clear manual rework flag in response_data (assessor only)
        if (isAssessor) {
          const currentResponse = responses.find((r) => r.id === responseId);
          const prevResponseData = (currentResponse as AnyRecord)?.response_data || {};
          const hadManualFlag = prevResponseData.assessor_manual_rework_flag === true;
          const hasManualFlag = responseId in reworkFlags;

          if (hasManualFlag) {
            responseChecklistData["assessor_manual_rework_flag"] = true;
            console.log(`[onSaveDraft] Setting manual rework flag TRUE for response ${responseId}`);
          } else if (hadManualFlag) {
            // Explicitly clear the flag
            responseChecklistData["assessor_manual_rework_flag"] = false;
            console.log(`[onSaveDraft] Clearing manual rework flag for response ${responseId}`);
          }
        }

        const payloadData = {
          // Convert to uppercase to match backend ValidationStatus enum (PASS, FAIL, CONDITIONAL)
          validation_status:
            isValidator && formData?.status
              ? (formData.status.toUpperCase() as "PASS" | "FAIL" | "CONDITIONAL")
              : undefined,
          public_comment: formData?.publicComment ?? null,
          response_data:
            Object.keys(responseChecklistData).length > 0 ? responseChecklistData : undefined,
        };

        console.log(`[onSaveDraft] Payload for response ${responseId}:`, payloadData);

        await validateMut.mutateAsync({
          responseId: responseId,
          data: payloadData,
        });
      }

      console.log("[onSaveDraft] All saves completed successfully");

      // Invalidate queries to refresh UI
      console.log("[onSaveDraft] Invalidating queries to refresh UI...");
      await qc.invalidateQueries({ queryKey: ["assessor", "assessments", assessmentId] });

      // Show success toast
      toast({
        title: "Saved",
        description: "Validation progress saved successfully",
        duration: 2000,
        className: "bg-green-600 text-white border-none",
      });
    } catch (error) {
      console.error("Error saving validation data:", error);
      // Reset mutation state to allow retry
      validateMut.reset();

      // Classify error for better user feedback
      const errorInfo = classifyError(error);

      // Show error toast with specific error type and message
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
    } finally {
      // CRITICAL: Always reset loading state, whether success or error
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

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
    }

    // Show processing toast
    toast({
      title: "Processing...",
      description: "Compiling and sending assessment for rework...",
      duration: 10000,
    });

    try {
      await onSaveDraft();

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
      await onSaveDraft();

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
            {statusText ? (
              <div className="scale-75 sm:scale-90 origin-right">
                <StatusBadge status={statusText} />
              </div>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onSaveDraft}
              disabled={isSaving || isAssessorWithoutArea || (isAssessor && isAreaLocked)}
              className="text-xs sm:text-sm px-2 sm:px-4"
              title={
                isAssessor && isAreaLocked
                  ? myAreaStatus === "rework"
                    ? "Area is sent for rework. Waiting for BLGU to resubmit."
                    : "Area is already reviewed and approved."
                  : undefined
              }
            >
              <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save as Draft"}</span>
              <span className="sm:hidden">Save</span>
            </Button>
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
                  setField={(id, field, value) => {
                    setForm((prev) => ({
                      ...prev,
                      [id]: {
                        ...prev[id],
                        [field]: value,
                      },
                    }));
                  }}
                  onChecklistChange={(key, value) => {
                    console.log("[onChecklistChange] Checkbox changed:", { key, value });
                    setChecklistData((prev) => {
                      const newData = {
                        ...prev,
                        [key]: value,
                      };
                      console.log("[onChecklistChange] Updated checklistData:", newData);
                      return newData;
                    });
                  }}
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
                      setField={(id, field, value) => {
                        setForm((prev) => ({
                          ...prev,
                          [id]: {
                            ...prev[id],
                            [field]: value,
                          },
                        }));
                      }}
                      onChecklistChange={(key, value) => {
                        console.log("[onChecklistChange] Checkbox changed:", { key, value });
                        setChecklistData((prev) => {
                          const newData = {
                            ...prev,
                            [key]: value,
                          };
                          console.log("[onChecklistChange] Updated checklistData:", newData);
                          return newData;
                        });
                      }}
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
                  setField={(id, field, value) => {
                    setForm((prev) => ({
                      ...prev,
                      [id]: {
                        ...prev[id],
                        [field]: value,
                      },
                    }));
                  }}
                  onChecklistChange={(key, value) => {
                    console.log("[onChecklistChange] Checkbox changed:", { key, value });
                    setChecklistData((prev) => {
                      const newData = {
                        ...prev,
                        [key]: value,
                      };
                      console.log("[onChecklistChange] Updated checklistData:", newData);
                      return newData;
                    });
                  }}
                  reworkFlags={reworkFlags}
                  onReworkFlagChange={handleReworkFlagChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

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
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onSaveDraft}
              disabled={isAnyActionPending || isAreaApproved}
              className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10"
              title={
                isAssessor && isAreaLocked
                  ? myAreaStatus === "rework"
                    ? "Area is sent for rework. Waiting for BLGU to resubmit."
                    : "Area is already reviewed and approved."
                  : undefined
              }
            >
              {isSaving ? (
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
                  <span className="hidden sm:inline">Saving Progress...</span>
                  <span className="sm:hidden">Saving...</span>
                </>
              ) : (
                "Save as Draft"
              )}
            </Button>
            {/* Send for Rework - Assessors only, requires comments */}
            {isAssessor && (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setShowReworkConfirm(true)}
                disabled={isAnyActionPending || isAreaApproved}
                className="w-full sm:w-auto text-[var(--cityscape-accent-foreground)] hover:opacity-90 text-xs sm:text-sm h-9 sm:h-10"
                style={{ background: "var(--cityscape-yellow)" }}
                title={
                  isAreaLocked
                    ? myAreaStatus === "rework"
                      ? "Area is already sent for rework. Waiting for BLGU to resubmit."
                      : "Area is already reviewed and approved."
                    : myAreaReworkUsed
                      ? "Rework round has already been used for this governance area. Each area is only allowed one rework round."
                      : !hasIndicatorsFlaggedForRework
                        ? "Toggle 'Flag for Rework' on at least one indicator to send for rework"
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
            {isAssessor && (
              <Button
                size="sm"
                type="button"
                onClick={() => setShowFinalizeConfirm(true)}
                disabled={isAnyActionPending || isAreaApproved || hasIndicatorsFlaggedForRework}
                className="w-full sm:w-auto text-white hover:opacity-90 text-xs sm:text-sm h-9 sm:h-10"
                style={{
                  background: hasIndicatorsFlaggedForRework ? "var(--muted)" : "var(--success)",
                }}
                title={
                  hasIndicatorsFlaggedForRework
                    ? "Cannot approve area while indicators are flagged for rework. Remove all rework flags or use 'Compile and Send for Rework' instead."
                    : isAreaLocked
                      ? myAreaStatus === "rework"
                        ? "Area is sent for rework. Waiting for BLGU to resubmit."
                        : "Area is already reviewed and approved."
                      : !allReviewed
                        ? "Review all indicators before approving"
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
