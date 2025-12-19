// 🎨 Dynamic Form Renderer Component
// Renders forms dynamically based on form schema with conditional field visibility

"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { classifyError } from "@/lib/error-utils";
import {
  getSections,
  getVisibleFields,
  isFieldRequired,
  type Section,
} from "@/lib/forms/formSchemaParser";
import { generateValidationSchema } from "@/lib/forms/generateValidationSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FormNotes, FormSchema, FormSchemaFieldsItem, MOVFileResponse } from "@sinag/shared";
import {
  useGetAssessmentsAssessmentIdAnswers,
  useGetAssessmentsMyAssessment,
  useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles,
  usePostAssessmentsAssessmentIdAnswers,
} from "@sinag/shared";
import { AlertCircle, Info } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Control, FieldValues, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { IndicatorNavigationFooter } from "../assessments/IndicatorNavigationFooter";
import { CompletionFeedbackPanel } from "./CompletionFeedbackPanel";
import {
  CheckboxFieldComponent,
  DateFieldComponent,
  FileFieldComponent,
  NumberFieldComponent,
  RadioFieldComponent,
  TextAreaFieldComponent,
  TextFieldComponent,
} from "./fields";

interface DynamicFormRendererProps {
  /** Form schema defining the structure and fields */
  formSchema?: FormSchema | Record<string, unknown>;
  /** Assessment ID for saving responses */
  assessmentId: number;
  /** Indicator ID for saving responses */
  indicatorId: number;
  /** Callback fired after successful save */
  onSaveSuccess?: () => void;
  /** Callback fired when indicator completion status changes */
  onIndicatorComplete?: (indicatorId: number, isComplete: boolean) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Epic 5.0: Locked state - disables form editing when assessment is submitted */
  isLocked?: boolean;
  /** Epic 5.0: MOV annotations for this indicator (for rework workflow) */
  movAnnotations?: any[];
  /** Epic 5.0: Rework comments for this indicator from dashboard (assessor feedback) */
  reworkComments?: any[];
  /** Epic 5.0: MOV file IDs flagged by MLGOO for recalibration - these need to be re-uploaded */
  mlgooFlaggedFileIds?: Array<{ mov_file_id: number; comment?: string | null }>;
  /** Navigation: Current indicator code */
  currentCode?: string;
  /** Navigation: Current position in the assessment */
  currentPosition?: number;
  /** Navigation: Total number of indicators */
  totalIndicators?: number;
  /** Navigation: Has previous indicator */
  hasPrevious?: boolean;
  /** Navigation: Has next indicator */
  hasNext?: boolean;
  /** Navigation: Go to previous indicator */
  onPrevious?: () => void;
  /** Navigation: Go to next indicator */
  onNext?: () => void;
  /** Callback to update assessment data for immediate UI updates */
  updateAssessmentData?: (updater: (data: any) => any) => void;
}

export function DynamicFormRenderer({
  formSchema,
  assessmentId,
  indicatorId,
  onSaveSuccess,
  onIndicatorComplete,
  isLoading = false,
  isLocked = false,
  movAnnotations = [],
  reworkComments = [],
  mlgooFlaggedFileIds = [],
  currentCode,
  currentPosition,
  totalIndicators,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  updateAssessmentData,
}: DynamicFormRendererProps) {
  // Generate validation schema from form schema
  const validationSchema = useMemo(() => {
    return generateValidationSchema(formSchema);
  }, [formSchema]);

  // Load saved responses
  const { data: savedResponses, isLoading: isLoadingSaved } = useGetAssessmentsAssessmentIdAnswers(
    assessmentId,
    { indicator_id: indicatorId },
    {
      query: {
        enabled: !!assessmentId && !!indicatorId,
      } as any,
    } as any
  );

  // Load uploaded files for this indicator (for progress tracking)
  // IMPORTANT: Use longer cache times to prevent files from "disappearing" on navigation
  const { data: filesResponse } = useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles(
    assessmentId,
    indicatorId,
    {
      query: {
        enabled: !!assessmentId && !!indicatorId,
        staleTime: 5 * 60 * 1000, // 5 minutes - consistent with FileFieldComponent
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache even when unmounted
      } as any,
    } as any
  );

  // Fetch assessment details to get status and rework timestamp
  // Use reasonable cache times - invalidation will handle updates after mutations
  const { data: myAssessmentData } = useGetAssessmentsMyAssessment({
    query: {
      staleTime: 30 * 1000, // 30 seconds - consistent with useAssessment.ts
      gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
      refetchOnWindowFocus: true,
    } as any,
  } as any);

  // Get rework status and timestamp
  const assessmentData = myAssessmentData as any;
  const normalizedStatus = (assessmentData?.assessment?.status || "").toUpperCase();
  const isReworkStatus = normalizedStatus === "REWORK" || normalizedStatus === "NEEDS_REWORK";
  const reworkRequestedAt = assessmentData?.assessment?.rework_requested_at;
  const calibrationRequestedAt = assessmentData?.assessment?.calibration_requested_at;

  // Epic 5.0: Support for MLGOO Recalibration
  // If this is a recalibration, we need to use a different timestamp for filtering files
  const isMlgooRecalibration = (assessmentData as any)?.assessment?.is_mlgoo_recalibration === true;
  const mlgooRecalibrationRequestedAt = (assessmentData as any)?.assessment
    ?.mlgoo_recalibration_requested_at;

  const effectiveReworkTimestamp =
    isMlgooRecalibration && mlgooRecalibrationRequestedAt
      ? mlgooRecalibrationRequestedAt
      : calibrationRequestedAt || reworkRequestedAt;

  // Get backend's is_completed and requires_rework values for this indicator
  // IMPORTANT: This must come before indicatorRequiresRework since it depends on backendRequiresRework
  const { backendIsCompleted, backendRequiresRework } = useMemo(() => {
    if (!assessmentData?.governance_areas || !indicatorId) {
      return { backendIsCompleted: null, backendRequiresRework: false };
    }

    for (const area of assessmentData.governance_areas) {
      if (!area.indicators) continue;
      for (const ind of area.indicators) {
        if (String(ind.id) === String(indicatorId)) {
          const isCompleted = ind.response?.is_completed === true || ind.is_completed === true;
          const requiresRework =
            ind.response?.requires_rework === true || ind.requires_rework === true;
          return { backendIsCompleted: isCompleted, backendRequiresRework: requiresRework };
        }
        if (ind.children) {
          for (const child of ind.children) {
            if (String(child.id) === String(indicatorId)) {
              const isCompleted =
                child.response?.is_completed === true || child.is_completed === true;
              const requiresRework =
                child.response?.requires_rework === true || child.requires_rework === true;
              return { backendIsCompleted: isCompleted, backendRequiresRework: requiresRework };
            }
          }
        }
      }
    }
    return { backendIsCompleted: null, backendRequiresRework: false };
  }, [assessmentData, indicatorId]);

  // Check if THIS specific indicator requires rework
  // Sources (in order of reliability):
  // 1. Backend's requires_rework flag (most reliable - set by assessor_service when sending for rework)
  // 2. Rework comments from dashboard API (text feedback from assessor)
  // 3. MOV annotations (highlight/comments on files)
  // Indicators WITHOUT feedback should keep their completion status unchanged
  const indicatorRequiresRework = useMemo(() => {
    // Check backend's requires_rework flag first (most reliable)
    if (backendRequiresRework) {
      return true;
    }

    // Check reworkComments prop (from dashboard API)
    if (reworkComments && reworkComments.length > 0) {
      return true;
    }

    // Check MOV annotations passed as prop
    if (movAnnotations && movAnnotations.length > 0) {
      return true;
    }

    // No feedback found - this indicator doesn't require rework
    return false;
  }, [backendRequiresRework, movAnnotations, reworkComments]);

  // Get active uploaded files (not deleted)
  const uploadedFiles = useMemo(() => {
    const allFiles = (filesResponse?.files || []) as MOVFileResponse[];
    return allFiles.filter((f) => !f.deleted_at);
  }, [filesResponse]);

  // Get MLGOO flagged file IDs - use props if available, otherwise fall back to assessment data
  const effectiveMlgooFlaggedFileIds = useMemo(() => {
    if (mlgooFlaggedFileIds && mlgooFlaggedFileIds.length > 0) {
      return mlgooFlaggedFileIds;
    }
    return (assessmentData as any)?.assessment?.mlgoo_recalibration_mov_file_ids || [];
  }, [mlgooFlaggedFileIds, assessmentData]);

  const mlgooFlaggedFileIdsSet = useMemo(() => {
    return new Set(
      (effectiveMlgooFlaggedFileIds || []).map((item: any) => String(item.mov_file_id))
    );
  }, [effectiveMlgooFlaggedFileIds]);

  // Get files that count towards completion (filtered by rework timestamp ONLY if indicator requires rework)
  // Indicators WITHOUT assessor feedback keep all their files (no need to re-upload)
  // Indicators WITH assessor feedback (requires_rework=true) must have files uploaded AFTER rework
  // MLGOO-flagged files are always excluded from completion count
  const completionValidFiles = useMemo(() => {
    // First, filter out MLGOO-flagged files - they should never count towards completion
    let validFiles = uploadedFiles;
    if (isMlgooRecalibration && mlgooFlaggedFileIdsSet.size > 0) {
      validFiles = uploadedFiles.filter(
        (file: MOVFileResponse) => !mlgooFlaggedFileIdsSet.has(String(file.id))
      );
    }

    // Only apply rework timestamp filtering if:
    // 1. Assessment is in rework status
    // 2. We have a rework timestamp (or recalibration timestamp)
    // 3. THIS specific indicator requires rework (has assessor feedback)
    if (!isReworkStatus || !effectiveReworkTimestamp || !indicatorRequiresRework) {
      return validFiles;
    }

    const reworkDate = new Date(effectiveReworkTimestamp);

    // Check for feedback types (Hybrid Logic)
    const hasSpecificAnnotations = movAnnotations && movAnnotations.length > 0;
    const hasGeneralComments = reworkComments && reworkComments.length > 0;

    // Check if this is calibration mode (timestamps are same or calibration exists)
    const isCalibrationMode = !!calibrationRequestedAt;

    // Get file IDs that have annotations (rejected files)
    const rejectedFileIds = new Set(
      (movAnnotations || []).map((ann: any) => String(ann.mov_file_id))
    );

    // During calibration, we need special handling:
    // - Files WITH annotations (rejected during assessor rework) should NOT count
    // - Files WITHOUT annotations (accepted during assessor rework) SHOULD count
    // - New files uploaded after rework SHOULD count
    if (isCalibrationMode && hasSpecificAnnotations) {
      return validFiles.filter((file: MOVFileResponse) => {
        if (!file.uploaded_at) return false;
        const uploadDate = new Date(file.uploaded_at);

        // New files (after effective rework timestamp) are always valid
        if (uploadDate >= reworkDate) {
          return true;
        }

        // Old files: only valid if NOT annotated (not rejected)
        return !rejectedFileIds.has(String(file.id));
      });
    }

    // Standard rework mode (assessor rework)
    return validFiles.filter((file: MOVFileResponse) => {
      if (!file.uploaded_at) return false;
      const uploadDate = new Date(file.uploaded_at);

      // If it's a new file (uploaded during rework), it's valid
      if (uploadDate >= reworkDate) {
        return true;
      }

      // If it's an old file (uploaded before rework):

      // 1. PRIORITY: If backend says requires_rework=true, invalidate ALL old files
      // The backend flag is authoritative - it means the assessor explicitly flagged this indicator
      // This takes priority over frontend annotation/comment detection
      if (backendRequiresRework) {
        return false;
      }

      // 2. If specific annotations exist, we trust them (Granular Mode)
      // Only invalidate the specifically annotated files
      if (hasSpecificAnnotations) {
        const isThisFileAnnotated = movAnnotations.some(
          (ann: any) => String(ann.mov_file_id) === String(file.id)
        );
        return !isThisFileAnnotated; // Keep clean files
      }

      // 3. If NO annotations but general comments exist (Strict Mode)
      // Invalidate ALL old files because the feedback is general
      if (hasGeneralComments) {
        return false;
      }

      // 4. If indicatorRequiresRework is true from other sources but we reach here
      // This shouldn't happen, but fallback to keeping the file
      return true;
    });
  }, [
    uploadedFiles,
    isReworkStatus,
    effectiveReworkTimestamp,
    indicatorRequiresRework,
    backendRequiresRework,
    movAnnotations,
    isMlgooRecalibration,
    mlgooFlaggedFileIdsSet,
    reworkComments,
    calibrationRequestedAt,
  ]);

  // Calculate indicator completion status based on uploaded files
  // IMPORTANT: For indicators WITHOUT feedback during rework, trust backend's is_completed value
  // Only recalculate for indicators that HAVE feedback and need rework
  const isIndicatorComplete = useMemo(() => {
    // If in rework status but this indicator has NO feedback, trust backend's value
    // This prevents field_id mismatch issues from incorrectly marking indicators incomplete
    if (isReworkStatus && !indicatorRequiresRework && backendIsCompleted !== null) {
      return backendIsCompleted;
    }

    if (!formSchema) return false;

    // Extract fields from either root-level "fields" or nested "sections[].fields"
    let fields: FormSchemaFieldsItem[] = [];

    if (formSchema && "fields" in formSchema && Array.isArray(formSchema.fields)) {
      fields = formSchema.fields as FormSchemaFieldsItem[];
    } else if (
      formSchema &&
      "sections" in formSchema &&
      Array.isArray((formSchema as any).sections)
    ) {
      const sections = (formSchema as any).sections as Array<{ fields?: FormSchemaFieldsItem[] }>;
      fields = sections.flatMap((section) => section.fields || []);
    }

    if (fields.length === 0) return false;

    const validationRule = (formSchema as any).validation_rule || "ALL_ITEMS_REQUIRED";
    const isOrLogic =
      validationRule === "ANY_ITEM_REQUIRED" || validationRule === "OR_LOGIC_AT_LEAST_1_REQUIRED";
    const isSharedPlusOrLogic = validationRule === "SHARED_PLUS_OR_LOGIC";
    const isAnyOptionGroupRequired = validationRule === "ANY_OPTION_GROUP_REQUIRED";

    // Get fields to track for completion
    const requiredFields =
      isOrLogic || isSharedPlusOrLogic || isAnyOptionGroupRequired
        ? fields.filter((field) => field.field_type === "file_upload")
        : fields.filter((field) => isFieldRequired(field));

    // Helper function to check if a field is filled
    // Uses completionValidFiles which is filtered by rework timestamp during rework status
    const isFieldFilled = (field: FormSchemaFieldsItem): boolean => {
      const isFileField = field.field_type === "file_upload";
      if (isFileField) {
        return completionValidFiles.some(
          (file: MOVFileResponse) => file.field_id === field.field_id && !file.deleted_at
        );
      }
      return false; // Non-file fields handled elsewhere
    };

    // For ANY_OPTION_GROUP_REQUIRED (e.g., 1.6.1 with Options 1, 2, 3)
    if (isAnyOptionGroupRequired) {
      const optionGroups: Record<string, FormSchemaFieldsItem[]> = {};
      requiredFields.forEach((field) => {
        const optionGroup = (field as any).option_group;
        if (optionGroup) {
          if (!optionGroups[optionGroup]) {
            optionGroups[optionGroup] = [];
          }
          optionGroups[optionGroup].push(field);
        }
      });

      // REWORK SPECIAL CASE for OR-logic: Only require rejected files to be replaced
      // if they're in the option group being used. If another option is complete, that's valid.
      if (indicatorRequiresRework && movAnnotations && movAnnotations.length > 0) {
        const allFiles = (filesResponse?.files || []) as MOVFileResponse[];
        const rejectedFileIds = new Set(movAnnotations.map((ann: any) => String(ann.mov_file_id)));

        // Find fields that have rejected files (without valid replacements)
        const rejectedFieldIdsWithoutReplacement = new Set<string>();
        allFiles.forEach((file: MOVFileResponse) => {
          if (file.field_id && rejectedFileIds.has(String(file.id)) && !file.deleted_at) {
            const hasValidReplacement = completionValidFiles.some(
              (f: MOVFileResponse) => f.field_id === file.field_id && !f.deleted_at
            );
            if (!hasValidReplacement) {
              rejectedFieldIdsWithoutReplacement.add(file.field_id);
            }
          }
        });

        // Check if ANY option group is complete without unresolved rejections
        for (const [groupName, groupFields] of Object.entries(optionGroups)) {
          const groupFieldIds = new Set(groupFields.map((f) => f.field_id));
          const groupHasUnresolvedRejections = [...rejectedFieldIdsWithoutReplacement].some(
            (fieldId) => groupFieldIds.has(fieldId)
          );

          // Skip this group if it has unresolved rejections
          if (groupHasUnresolvedRejections) {
            continue;
          }

          // Check if this group is complete (internal OR vs AND logic)
          const hasInternalOr =
            groupName.includes("Option 3") ||
            groupName.includes("OPTION 3") ||
            groupName.toLowerCase().includes("option 3");

          if (hasInternalOr) {
            if (groupFields.some((field) => isFieldFilled(field))) {
              return true;
            }
          } else {
            if (groupFields.every((field) => isFieldFilled(field))) {
              return true;
            }
          }
        }
        return false;
      }

      // Standard logic: Check if at least one complete option group exists
      for (const [groupName, groupFields] of Object.entries(optionGroups)) {
        const hasInternalOr =
          groupName.includes("Option 3") ||
          groupName.includes("OPTION 3") ||
          groupName.toLowerCase().includes("option 3");

        if (hasInternalOr) {
          if (groupFields.some((field) => isFieldFilled(field))) {
            return true; // At least one field in Option 3 is filled
          }
        } else {
          if (groupFields.every((field) => isFieldFilled(field))) {
            return true; // All fields in this option are filled
          }
        }
      }
      return false;
    }

    // For SHARED+OR logic (e.g., 4.1.6) - uses completion_group (not option_group)
    if (isSharedPlusOrLogic) {
      const sharedFields: FormSchemaFieldsItem[] = [];
      const optionAFields: FormSchemaFieldsItem[] = [];
      const optionBFields: FormSchemaFieldsItem[] = [];

      requiredFields.forEach((field) => {
        const completionGroup = (field as any).option_group || (field as any).completion_group;
        if (completionGroup === "shared") {
          sharedFields.push(field);
        } else if (completionGroup === "option_a") {
          optionAFields.push(field);
        } else if (completionGroup === "option_b") {
          optionBFields.push(field);
        }
      });

      // REWORK SPECIAL CASE for SHARED+OR: For shared fields, ALL rejections must be addressed.
      // For option fields, only rejections in the chosen option need to be addressed.
      if (indicatorRequiresRework && movAnnotations && movAnnotations.length > 0) {
        const allFiles = (filesResponse?.files || []) as MOVFileResponse[];
        const rejectedFileIds = new Set(movAnnotations.map((ann: any) => String(ann.mov_file_id)));

        // Find fields that have rejected files (without valid replacements)
        const rejectedFieldIdsWithoutReplacement = new Set<string>();
        allFiles.forEach((file: MOVFileResponse) => {
          if (file.field_id && rejectedFileIds.has(String(file.id)) && !file.deleted_at) {
            const hasValidReplacement = completionValidFiles.some(
              (f: MOVFileResponse) => f.field_id === file.field_id && !f.deleted_at
            );
            if (!hasValidReplacement) {
              rejectedFieldIdsWithoutReplacement.add(file.field_id);
            }
          }
        });

        // Check shared fields - ALL unresolved rejections must be fixed
        const sharedFieldIds = new Set(sharedFields.map((f) => f.field_id));
        const sharedHasUnresolvedRejections = [...rejectedFieldIdsWithoutReplacement].some(
          (fieldId) => sharedFieldIds.has(fieldId)
        );
        if (sharedHasUnresolvedRejections) {
          return false; // Shared fields have unresolved rejections
        }

        // Check if shared fields are complete
        const sharedComplete =
          sharedFields.length > 0 ? sharedFields.every((field) => isFieldFilled(field)) : true;
        if (!sharedComplete) {
          return false;
        }

        // Check options - at least one option must be complete without unresolved rejections
        const optionAFieldIds = new Set(optionAFields.map((f) => f.field_id));
        const optionBFieldIds = new Set(optionBFields.map((f) => f.field_id));

        const optionAHasUnresolvedRejections = [...rejectedFieldIdsWithoutReplacement].some(
          (fieldId) => optionAFieldIds.has(fieldId)
        );
        const optionBHasUnresolvedRejections = [...rejectedFieldIdsWithoutReplacement].some(
          (fieldId) => optionBFieldIds.has(fieldId)
        );

        const optionAHasUpload =
          !optionAHasUnresolvedRejections && optionAFields.some((field) => isFieldFilled(field));
        const optionBHasUpload =
          !optionBHasUnresolvedRejections && optionBFields.some((field) => isFieldFilled(field));

        return optionAHasUpload || optionBHasUpload;
      }

      // Standard logic: SHARED: all must be filled
      const sharedComplete =
        sharedFields.length > 0 ? sharedFields.every((field) => isFieldFilled(field)) : true;

      // OPTION: at least one of option_a or option_b must have an upload
      const optionAHasUpload = optionAFields.some((field) => isFieldFilled(field));
      const optionBHasUpload = optionBFields.some((field) => isFieldFilled(field));
      const optionComplete = optionAHasUpload || optionBHasUpload;

      return sharedComplete && optionComplete;
    }

    // For OR logic
    if (isOrLogic) {
      const groups: Record<string, FormSchemaFieldsItem[]> = {};
      requiredFields.forEach((field) => {
        const optionGroup = (field as any).option_group || field.field_id;
        if (!groups[optionGroup]) {
          groups[optionGroup] = [];
        }
        groups[optionGroup].push(field);
      });

      // REWORK SPECIAL CASE for OR-logic: For OR-logic indicators (e.g., PHYSICAL OR FINANCIAL),
      // BLGU only needs to satisfy ONE option. If an option group is complete AND doesn't have
      // any rejected files needing replacement, it's valid. We don't require ALL rejected files
      // to be replaced - only the ones in the option group being used.
      if (indicatorRequiresRework && movAnnotations && movAnnotations.length > 0) {
        const allFiles = (filesResponse?.files || []) as MOVFileResponse[];
        const rejectedFileIds = new Set(movAnnotations.map((ann: any) => String(ann.mov_file_id)));

        // Find fields that have rejected files (without valid replacements)
        const rejectedFieldIdsWithoutReplacement = new Set<string>();
        allFiles.forEach((file: MOVFileResponse) => {
          if (file.field_id && rejectedFileIds.has(String(file.id)) && !file.deleted_at) {
            // Check if this rejected field has a valid replacement
            const hasValidReplacement = completionValidFiles.some(
              (f: MOVFileResponse) => f.field_id === file.field_id && !f.deleted_at
            );
            if (!hasValidReplacement) {
              rejectedFieldIdsWithoutReplacement.add(file.field_id);
            }
          }
        });

        // For OR logic during rework: Check if ANY option group is:
        // 1. Fully filled (all fields have files), AND
        // 2. None of its fields have unresolved rejected files
        for (const [, groupFields] of Object.entries(groups)) {
          const groupFieldIds = new Set(groupFields.map((f) => f.field_id));
          const groupHasUnresolvedRejections = [...rejectedFieldIdsWithoutReplacement].some(
            (fieldId) => groupFieldIds.has(fieldId)
          );

          // Skip this group if it has unresolved rejections
          if (groupHasUnresolvedRejections) {
            continue;
          }

          // Check if all fields in this group are filled
          if (groupFields.every((field) => isFieldFilled(field))) {
            return true; // This group is complete without any unresolved rejections
          }
        }
        return false; // No group is both complete and free of unresolved rejections
      }

      // Standard OR logic: Check if at least one complete group is filled
      for (const [, groupFields] of Object.entries(groups)) {
        if (groupFields.every((field) => isFieldFilled(field))) {
          return true;
        }
      }
      return false;
    }

    // Standard AND logic - all required file upload fields must be filled
    // REWORK SPECIAL CASE: If there are rejected files that haven't been replaced, not complete
    if (indicatorRequiresRework && movAnnotations && movAnnotations.length > 0) {
      const allFiles = (filesResponse?.files || []) as MOVFileResponse[];
      const rejectedFileIds = new Set(movAnnotations.map((ann: any) => String(ann.mov_file_id)));
      const rejectedFieldIds = new Set<string>();
      allFiles.forEach((file: MOVFileResponse) => {
        if (file.field_id && rejectedFileIds.has(String(file.id)) && !file.deleted_at) {
          rejectedFieldIds.add(file.field_id);
        }
      });
      for (const fieldId of rejectedFieldIds) {
        const hasValidReplacement = completionValidFiles.some(
          (file: MOVFileResponse) => file.field_id === fieldId && !file.deleted_at
        );
        if (!hasValidReplacement) {
          return false;
        }
      }
    }

    return requiredFields.every((field) => {
      if (field.field_type === "file_upload") {
        return isFieldFilled(field);
      }
      return true; // Non-file fields are handled by form validation
    });
  }, [
    formSchema,
    completionValidFiles,
    isReworkStatus,
    indicatorRequiresRework,
    backendIsCompleted,
    movAnnotations,
    filesResponse,
  ]);

  // Track previous completion status to avoid infinite loops
  const prevCompleteRef = useRef<boolean | null>(null);

  // Check if we have the necessary data to calculate completion
  // Don't notify until assessmentData has loaded (contains governance_areas with indicator response data)
  const hasRequiredData = Boolean(assessmentData?.governance_areas);

  // Notify parent when completion status changes (only when it actually changes)
  useEffect(() => {
    // Don't call callback until we have the required data
    // This prevents premature "completed" status when backendRequiresRework hasn't loaded yet
    if (!hasRequiredData) {
      return;
    }

    // Only call callback if completion status actually changed
    if (prevCompleteRef.current !== isIndicatorComplete) {
      prevCompleteRef.current = isIndicatorComplete;
      if (onIndicatorComplete) {
        onIndicatorComplete(indicatorId, isIndicatorComplete);
      }
    }
  }, [
    indicatorId,
    isIndicatorComplete,
    onIndicatorComplete,
    hasRequiredData,
    backendRequiresRework,
  ]);

  // Transform saved responses to default values
  const defaultValues = useMemo(() => {
    if (!savedResponses?.responses) return {};

    const values: Record<string, unknown> = {};
    savedResponses.responses.forEach((response) => {
      values[response.field_id] = response.value;
    });
    return values;
  }, [savedResponses]);

  // Initialize React Hook Form
  const methods = useForm({
    mode: "onChange",
    resolver: zodResolver(validationSchema),
    defaultValues,
  });

  const { watch, control, formState, reset, handleSubmit } = methods;

  // Reset form when default values change (when loading saved responses or switching indicators)
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  // Save mutation
  const saveMutation = usePostAssessmentsAssessmentIdAnswers();

  // Handle form submission
  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      // Transform form data to API format
      const responses = Object.entries(data)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([field_id, value]) => ({
          field_id,
          value,
        }));

      await saveMutation.mutateAsync({
        assessmentId,
        data: { responses },
        params: { indicator_id: indicatorId },
      });

      toast.success("Responses saved successfully");
      onSaveSuccess?.();
    } catch (error) {
      const errorInfo = classifyError(error);

      // Show appropriate error message based on error type
      if (errorInfo.type === "network") {
        toast.error("Unable to save responses", {
          description: "Check your internet connection and try again. Your work is still here.",
        });
      } else if (errorInfo.type === "validation") {
        toast.error("Could not save responses", {
          description: errorInfo.message || "Please check your entries and try again.",
        });
      } else if (errorInfo.type === "auth") {
        toast.error("Session expired", {
          description: "Please log in again to save your work.",
        });
      } else {
        toast.error("Failed to save responses", {
          description: "Please try again. If the problem persists, contact your MLGOO-DILG.",
        });
      }
      console.error("Save error:", error);
    }
  };

  // Watch all form values for conditional field visibility
  const formValues = watch();

  // Parse sections from form schema
  const sections = useMemo(() => {
    if (!formSchema) return [];
    return getSections(formSchema);
  }, [formSchema]);

  // Render loading state
  if (isLoading || isLoadingSaved || !formSchema) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Render error state for invalid schema
  if (sections.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load form. The form schema is invalid or empty.
          <br />
          Please contact support if this problem persists.
        </AlertDescription>
      </Alert>
    );
  }

  // Show navigation controls
  const showNavigation = currentPosition && totalIndicators && (hasPrevious || hasNext);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Navigation Header - Removed in favor of footer */}

        {/* Completion Feedback Panel */}
        <CompletionFeedbackPanel
          formValues={formValues}
          formSchema={formSchema}
          assessmentId={assessmentId}
          indicatorId={indicatorId}
          completionValidFiles={completionValidFiles}
          movAnnotations={movAnnotations}
          allFiles={(filesResponse?.files || []) as MOVFileResponse[]}
          indicatorRequiresRework={indicatorRequiresRework}
        />

        {/* Notes Section - Display before form fields so users see requirements before uploading */}
        {formSchema && "notes" in formSchema && formSchema.notes && (
          <NotesSection notes={formSchema.notes as FormNotes} />
        )}

        {/* Form Sections */}
        {sections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            formSchema={formSchema}
            formValues={formValues}
            control={control as any}
            errors={formState.errors}
            assessmentId={assessmentId}
            indicatorId={indicatorId}
            isLocked={isLocked}
            movAnnotations={movAnnotations}
            reworkComments={reworkComments}
            uploadedFiles={uploadedFiles}
            completionValidFiles={completionValidFiles}
            updateAssessmentData={updateAssessmentData}
            mlgooFlaggedFileIds={mlgooFlaggedFileIds}
          />
        ))}

        {/* Secondary Notes Section - Display after form fields */}
        {formSchema && "secondary_notes" in formSchema && formSchema.secondary_notes && (
          <NotesSection notes={formSchema.secondary_notes as FormNotes} />
        )}

        {/* Hidden Submit Button for Testing */}
        <button
          type="submit"
          className="sr-only"
          aria-label="Save"
          disabled={saveMutation.isPending}
        >
          Save
        </button>

        {/* Navigation Footer */}
        {showNavigation && (
          <div className="pt-6 mt-6">
            <IndicatorNavigationFooter
              currentCode={currentCode}
              currentPosition={currentPosition}
              totalIndicators={totalIndicators}
              hasPrevious={hasPrevious || false}
              hasNext={hasNext || false}
              onPrevious={onPrevious || (() => {})}
              onNext={onNext || (() => {})}
              isLocked={isLocked}
            />
          </div>
        )}
      </form>
    </FormProvider>
  );
}

// ============================================================================
// Section Renderer Component
// ============================================================================

interface SectionRendererProps {
  section: Section;
  formSchema: FormSchema | Record<string, unknown>;
  formValues: Record<string, unknown>;
  control: Control<FieldValues>;
  errors: ReturnType<typeof useForm>["formState"]["errors"];
  assessmentId: number;
  indicatorId: number;
  isLocked: boolean;
  movAnnotations: any[];
  reworkComments: any[]; // Epic 5.0: Added for Hybrid Logic
  uploadedFiles: MOVFileResponse[];
  /** Files that count towards completion (filtered by rework timestamp if in rework status) */
  completionValidFiles: MOVFileResponse[];
  updateAssessmentData?: (updater: (data: any) => any) => void;
  /** MOV file IDs flagged by MLGOO for recalibration */
  mlgooFlaggedFileIds?: Array<{ mov_file_id: number; comment?: string | null }>;
}

/**
 * Groups fields by their option_group attribute.
 * Returns null if no option groups are detected (flat form).
 */
interface OptionGroup {
  name: string;
  label: string;
  fields: FormSchemaFieldsItem[];
  fieldNotes?: { title?: string; items?: { label?: string; text: string }[] } | null;
}

function groupFieldsByOptionGroup(fields: FormSchemaFieldsItem[]): OptionGroup[] | null {
  // Check if any field has option_group
  const hasOptionGroups = fields.some((field) => "option_group" in field && field.option_group);

  if (!hasOptionGroups) {
    return null;
  }

  const groups: OptionGroup[] = [];
  let currentGroup: OptionGroup | null = null;

  for (const field of fields) {
    const optionGroup = "option_group" in field ? (field.option_group as string | null) : null;

    if (optionGroup) {
      // Field belongs to an option group
      if (!currentGroup || currentGroup.name !== optionGroup) {
        // Start a new group
        currentGroup = {
          name: optionGroup,
          label: optionGroup,
          fields: [],
        };
        groups.push(currentGroup);
      }

      // Check if this is a section_header - use its label and field_notes
      if (field.field_type === "section_header") {
        currentGroup.label = field.label;
        currentGroup.fieldNotes = (field as any).field_notes || null;
      } else {
        // Add non-header fields to the group
        currentGroup.fields.push(field);
      }
    } else {
      // Field without option_group (like main OR separators between groups)
      // Skip these as accordion separation handles the visual break
      // Exception: if we're not in a group yet, don't skip
      if (!currentGroup && field.field_type !== "info_text") {
        // This is a standalone field before any groups
        // For now, skip - could add ungrouped handling if needed
      }
      // Otherwise, skip OR separators between groups
    }
  }

  // Filter out groups with no actual upload fields
  return groups.filter((g) => g.fields.length > 0);
}

/**
 * Check if a specific field has an uploaded file
 * Uses the actual uploaded files from API, not form values
 */
function hasFileUploaded(field: FormSchemaFieldsItem, uploadedFiles: MOVFileResponse[]): boolean {
  if (field.field_type !== "file_upload") return false;
  // Check if there's any file uploaded for this field_id
  return uploadedFiles.some((f) => f.field_id === field.field_id);
}

/**
 * Check if an option group is complete based on its requirements
 * - Option 1: ALL file uploads must have files (a AND b)
 * - Option 2: The single file upload must have files
 * - Option 3: ANY file upload must have files (a OR b - internal OR logic)
 */
function isOptionGroupComplete(
  group: { name: string; label: string; fields: FormSchemaFieldsItem[] },
  uploadedFiles: MOVFileResponse[]
): boolean {
  const fileUploadFields = group.fields.filter((f) => f.field_type === "file_upload");

  if (fileUploadFields.length === 0) return false;

  // Check if this is Option 3 (has internal OR logic)
  const hasInternalOr = group.name.includes("Option 3") || group.name.includes("OPTION 3");

  if (hasInternalOr) {
    // Option 3: ANY file upload must have files (internal OR)
    return fileUploadFields.some((field) => hasFileUploaded(field, uploadedFiles));
  } else {
    // Option 1 & 2: ALL file uploads must have files
    return fileUploadFields.every((field) => hasFileUploaded(field, uploadedFiles));
  }
}

/**
 * Get the required count display for an option group
 * Returns something like "0/2" for Option 1 or "0/1" for Option 2/3
 */
function getOptionGroupProgress(
  group: { name: string; label: string; fields: FormSchemaFieldsItem[] },
  uploadedFiles: MOVFileResponse[]
): { current: number; required: number; isComplete: boolean } {
  const fileUploadFields = group.fields.filter((f) => f.field_type === "file_upload");

  if (fileUploadFields.length === 0) {
    return { current: 0, required: 0, isComplete: true };
  }

  const uploadedCount = fileUploadFields.filter((field) =>
    hasFileUploaded(field, uploadedFiles)
  ).length;

  // Check if this is Option 3 (has internal OR logic)
  const hasInternalOr = group.name.includes("Option 3") || group.name.includes("OPTION 3");

  if (hasInternalOr) {
    // Option 3: Only need 1 of the files (internal OR)
    return {
      current: Math.min(uploadedCount, 1),
      required: 1,
      isComplete: uploadedCount >= 1,
    };
  } else {
    // Option 1 & 2: Need all files
    return {
      current: uploadedCount,
      required: fileUploadFields.length,
      isComplete: uploadedCount >= fileUploadFields.length,
    };
  }
}

function SectionRenderer({
  section,
  formSchema,
  formValues,
  control,
  errors,
  assessmentId,
  indicatorId,
  isLocked,
  movAnnotations,
  reworkComments,
  // uploadedFiles is kept in props for potential future UI use (showing all files)
  // but for completion tracking we use completionValidFiles (filtered by rework)
  completionValidFiles,
  updateAssessmentData,
  mlgooFlaggedFileIds = [],
}: SectionRendererProps) {
  // Get visible fields for this section based on conditional logic
  const visibleFields = useMemo(() => {
    return getVisibleFields(formSchema, section.id, formValues);
  }, [formSchema, section.id, formValues]);

  // Check if fields should be grouped by option_group
  const optionGroups = useMemo(() => {
    return groupFieldsByOptionGroup(visibleFields);
  }, [visibleFields]);

  const validationRule = (formSchema as any).validation_rule;
  // Use accordion based on validation rule (mainly for 1.6.1)
  const useAccordionUI =
    (formSchema as any)?.use_accordion_ui ?? validationRule === "ANY_OPTION_GROUP_REQUIRED";

  // Don't render empty sections
  if (visibleFields.length === 0) {
    return null;
  }

  // Helper: Get user-friendly section title
  const getFriendlyTitle = (title: string) => {
    if (title === "Form Fields" || title === "Assessment Form") {
      return {
        title: "Upload Requirements",
        description: "Please upload the required documents below to complete this indicator.",
      };
    }
    return { title, description: section.description };
  };

  const { title: friendlyTitle, description: friendlyDescription } = getFriendlyTitle(
    section.title
  );

  // Render with accordion if option groups detected AND accordion UI is enabled
  if (optionGroups && optionGroups.length > 0 && useAccordionUI) {
    // Calculate overall completion: need at least 1 option group complete
    // Use completionValidFiles which is filtered by rework timestamp during rework status
    const completedGroups = optionGroups.filter((group) =>
      isOptionGroupComplete(group, completionValidFiles)
    ).length;
    const overallComplete = completedGroups >= 1;

    return (
      <div className="mb-10 last:mb-0">
        <div className="mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {friendlyTitle}
              </h2>
              {friendlyDescription && (
                <p className="text-base text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-4xl">
                  {friendlyDescription}
                </p>
              )}
            </div>
            {/* Overall completion indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border shrink-0 ${
                overallComplete
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                  : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
              }`}
            >
              <span>Required:</span>
              <span className="font-bold">{overallComplete ? "1" : "0"}/1 Option</span>
            </div>
          </div>
        </div>

        <div>
          {/* Info alert for OR logic */}
          <Alert className="mb-6 border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              <strong>Select ONE option</strong> that applies to your barangay&apos;s situation. You
              only need to upload documents for the option that matches your case.
            </AlertDescription>
          </Alert>

          {/* Accordion for option groups */}
          <Accordion type="single" collapsible className="space-y-4">
            {optionGroups.map((group) => {
              // Use completionValidFiles which is filtered by rework timestamp during rework status
              const progress = getOptionGroupProgress(group, completionValidFiles);

              return (
                <AccordionItem
                  key={group.name}
                  value={group.name}
                  className={`border rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shadow-sm transition-all ${
                    progress.isComplete
                      ? "border-green-200 dark:border-green-900"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-zinc-50 dark:hover:bg-zinc-800/50 [&[data-state=open]]:bg-zinc-50 dark:[&[data-state=open]]:bg-zinc-800/50">
                    <div className="flex items-center justify-between w-full pr-4 gap-4">
                      <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100 text-left">
                        {group.label}
                      </span>
                      {/* Progress indicator for this option */}
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                          progress.isComplete
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50"
                            : "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                        }`}
                      >
                        {progress.current}/{progress.required} uploaded
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pt-6 pb-8 bg-white dark:bg-zinc-900">
                    {/* Section Header Field Notes (e.g., Important notes for this option) */}
                    {group.fieldNotes &&
                      group.fieldNotes.items &&
                      group.fieldNotes.items.length > 0 && (
                        <div className="mb-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                          <div className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
                            {group.fieldNotes.title || "Note:"}
                          </div>
                          <div className="space-y-1">
                            {group.fieldNotes.items.map(
                              (noteItem: any, noteIdx: number) => (
                                <div
                                  key={noteIdx}
                                  className="text-sm text-amber-800 dark:text-amber-300"
                                >
                                  {noteItem.label && (
                                    <span className="font-medium">
                                      {noteItem.label}:{" "}
                                    </span>
                                  )}
                                  {noteItem.text}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    <div className="space-y-10">
                      {group.fields.map((field) => (
                        <FieldRenderer
                          key={field.field_id}
                          field={field}
                          control={control as any}
                          error={errors[field.field_id]?.message as string | undefined}
                          assessmentId={assessmentId}
                          indicatorId={indicatorId}
                          isLocked={isLocked}
                          movAnnotations={movAnnotations}
                          reworkComments={reworkComments}
                          updateAssessmentData={updateAssessmentData}
                          mlgooFlaggedFileIds={mlgooFlaggedFileIds}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    );
  }

  // Default flat rendering (no option groups)
  return (
    <div className="mb-10 last:mb-0">
      <div className="mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            {friendlyTitle}
          </h2>
          {friendlyDescription && (
            <p className="text-base text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-4xl">
              {friendlyDescription}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {visibleFields.map((field) => {
          // Determine if this field should be wrapped (inputs) or standout (headers/info)
          const isInput = !["section_header", "info_text"].includes(field.field_type);
          const Wrapper = isInput ? "div" : "div";
          const wrapperClasses = isInput
            ? "p-6 border border-[var(--border)] rounded-xl bg-[var(--card)] shadow-sm space-y-4 transition-all hover:shadow-md"
            : "py-2";

          return (
            <Wrapper key={field.field_id} className={wrapperClasses}>
              <FieldRenderer
                field={field}
                control={control as any}
                error={errors[field.field_id]?.message as string | undefined}
                assessmentId={assessmentId}
                indicatorId={indicatorId}
                isLocked={isLocked}
                movAnnotations={movAnnotations}
                reworkComments={reworkComments}
                updateAssessmentData={updateAssessmentData}
                mlgooFlaggedFileIds={mlgooFlaggedFileIds}
              />
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Field Renderer Component
// ============================================================================

interface FieldRendererProps {
  field: FormSchemaFieldsItem;
  control: Control<FieldValues>;
  error?: string;
  assessmentId: number;
  indicatorId: number;
  isLocked: boolean;
  movAnnotations: any[];
  reworkComments: any[]; // Epic 5.0: Added for Hybrid Logic
  updateAssessmentData?: (updater: (data: any) => any) => void;
  /** MOV file IDs flagged by MLGOO for recalibration */
  mlgooFlaggedFileIds?: Array<{ mov_file_id: number; comment?: string | null }>;
}

function FieldRenderer({
  field,
  control,
  error,
  assessmentId,
  indicatorId,
  isLocked,
  movAnnotations,
  reworkComments,
  updateAssessmentData,
  mlgooFlaggedFileIds = [],
}: FieldRendererProps) {
  // Render appropriate field component based on field type
  switch (field.field_type) {
    case "section_header":
      // Render section header for grouped options (e.g., "OPTION A - For MRF:")
      return (
        <div className="pt-4 pb-2 border-b border-[var(--border)]">
          <h3 className="text-base font-semibold text-[var(--foreground)]">{field.label}</h3>
          {field.description && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{field.description}</p>
          )}
        </div>
      );

    case "info_text":
      // Render info text (e.g., "OR" separator) with full-width lines
      return (
        <div className="flex items-center justify-center py-4 my-2">
          <div className="flex items-center gap-4 w-full">
            <div className="h-px flex-1 bg-orange-500" />
            <span className="text-sm font-semibold text-orange-500 uppercase px-2">
              {field.label}
            </span>
            <div className="h-px flex-1 bg-orange-500" />
          </div>
        </div>
      );

    case "text_input":
      return (
        <TextFieldComponent
          {...({
            field,
            control,
            name: field.field_id,
            error,
            disabled: isLocked,
          } as any)}
        />
      );

    case "number_input":
      return (
        <NumberFieldComponent
          {...({
            field,
            control,
            name: field.field_id,
            error,
            disabled: isLocked,
          } as any)}
        />
      );

    case "text_area":
      return (
        <TextAreaFieldComponent
          {...({
            field,
            control,
            name: field.field_id,
            error,
            disabled: isLocked,
          } as any)}
        />
      );

    case "radio_button":
      return (
        <RadioFieldComponent
          {...({
            field,
            control,
            name: field.field_id,
            error,
            disabled: isLocked,
          } as any)}
        />
      );

    case "checkbox_group":
      return (
        <CheckboxFieldComponent
          {...({
            field,
            control,
            name: field.field_id,
            error,
            disabled: isLocked,
          } as any)}
        />
      );

    case "date_picker":
      return (
        <DateFieldComponent
          {...({
            field,
            control,
            name: field.field_id,
            error,
            disabled: isLocked,
          } as any)}
        />
      );

    case "file_upload":
      return (
        <FileFieldComponent
          field={field}
          assessmentId={assessmentId}
          indicatorId={indicatorId}
          disabled={isLocked}
          movAnnotations={movAnnotations}
          reworkComments={reworkComments}
          updateAssessmentData={updateAssessmentData}
          mlgooFlaggedFileIds={mlgooFlaggedFileIds}
        />
      );

    default:
      // Unknown field type - render placeholder
      return (
        <Alert>
          <AlertDescription>Unknown field type: {field.field_type}</AlertDescription>
        </Alert>
      );
  }
}

// ============================================================================
// Notes Section Component
// ============================================================================

interface NotesSectionProps {
  notes: FormNotes;
}

function NotesSection({ notes }: NotesSectionProps) {
  // Helper to determine indentation level based on label prefix spaces
  const getIndentLevel = (label?: string): number => {
    if (!label) return 0;
    const leadingSpaces = label.match(/^(\s*)/)?.[1]?.length || 0;
    // Every 3 spaces = 1 indent level
    return Math.floor(leadingSpaces / 3);
  };

  // Helper to check if this is a section header (like "Minimum Composition of the BADAC Committees:")
  const isSectionHeader = (item: { label?: string; text: string }): boolean => {
    return !item.label && item.text.length > 0 && item.text.endsWith(":");
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-2">
          <p className="font-semibold text-blue-900 dark:text-blue-100">{notes.title}</p>
          <ul className="space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
            {notes.items.map((item, index) => {
              const indentLevel = getIndentLevel(item.label);
              const trimmedLabel = item.label?.trim();
              const isHeader = isSectionHeader(item);

              // Empty line spacer
              if (!item.label && !item.text) {
                return <li key={index} className="h-2" />;
              }

              return (
                <li
                  key={index}
                  className="flex gap-2"
                  style={{ marginLeft: `${indentLevel * 1.5}rem` }}
                >
                  {trimmedLabel && (
                    <span className="font-medium flex-shrink-0">{trimmedLabel}</span>
                  )}
                  <span className={isHeader ? "font-semibold mt-2" : ""}>{item.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
