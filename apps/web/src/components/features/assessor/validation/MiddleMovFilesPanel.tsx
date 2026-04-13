"use client";
"use no memo";

import { FileList } from "@/components/features/movs/FileList";
import { FileUpload } from "@/components/features/movs/FileUpload";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMovAnnotations } from "@/hooks/useMovAnnotations";
import { cn } from "@/lib/utils";
import { fetchSignedUrl, useSignedUrl } from "@/hooks/useSignedUrl";
import { useAuthStore } from "@/store/useAuthStore";
import type { AssessmentDetailsResponse, MOVFileResponse } from "@sinag/shared";
import {
  getGetAssessorAssessmentsAssessmentIdQueryKey,
  getGetAssessorMovsMovFileIdFeedbackQueryKey,
  useDeleteMovsFilesFileId,
  usePostMovsAssessmentsAssessmentIdIndicatorsIndicatorIdUpload,
  useGetAssessorMovsMovFileIdFeedback,
  usePatchAssessorMovsMovFileIdFeedback,
} from "@sinag/shared";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileIcon, Loader2, LocateFixed, Save, Upload, X } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";
import { toast } from "sonner";

// Dynamically import PdfAnnotator to avoid SSR issues
const PdfAnnotator = dynamic(() => import("@/components/shared/PdfAnnotator"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[70vh]">Loading PDF viewer...</div>
  ),
});

// Dynamically import ImageAnnotator to avoid SSR issues
const ImageAnnotator = dynamic(() => import("@/components/shared/ImageAnnotator"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[70vh]">Loading image viewer...</div>
  ),
});

function hasAssessorFileFeedback(file: AnyRecord): boolean {
  return (
    Boolean(file.assessor_notes && String(file.assessor_notes).trim()) ||
    file.flagged_for_rework === true ||
    file.has_annotations === true ||
    file.is_rejected === true
  );
}

function hasValidatorFileFeedback(file: AnyRecord): boolean {
  return (
    Boolean(file.validator_notes && String(file.validator_notes).trim()) ||
    file.flagged_for_calibration === true
  );
}

function getUploadedAtMs(file: AnyRecord): number {
  const timestamp = file.uploaded_at ? new Date(String(file.uploaded_at)).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function groupValidatorFilesForDisplay(files: AnyRecord[]): {
  newFiles: AnyRecord[];
  acceptedOldFiles: AnyRecord[];
  rejectedOldFiles: AnyRecord[];
} {
  const newFiles: AnyRecord[] = [];
  const acceptedOldFiles: AnyRecord[] = [];
  const rejectedOldFiles: AnyRecord[] = [];

  for (const file of files) {
    const uploadedAt = getUploadedAtMs(file);
    const hasNewerUpload = files.some((candidate) => getUploadedAtMs(candidate) > uploadedAt);
    const hasAssessorFeedback = hasAssessorFileFeedback(file);
    const hasValidatorFeedback = hasValidatorFileFeedback(file);

    if (hasValidatorFeedback) {
      if (hasNewerUpload) {
        rejectedOldFiles.push(file);
      } else {
        acceptedOldFiles.push(file);
      }
      continue;
    }

    if (hasAssessorFeedback) {
      rejectedOldFiles.push(file);
      continue;
    }

    if (file.isNew) {
      newFiles.push(file);
    } else {
      acceptedOldFiles.push(file);
    }
  }

  return { newFiles, acceptedOldFiles, rejectedOldFiles };
}

/**
 * Inner component that fetches signed URL and renders the appropriate file viewer.
 * Separated to allow conditional rendering with hooks.
 */
const SecureFileContent = React.memo(function SecureFileContent({
  file,
  annotationsLoading,
  pdfAnnotations,
  imageAnnotations,
  focusAnnotationId,
  focusRequestNonce,
  onAddAnnotation,
  onDeleteAnnotation,
}: {
  file: any;
  annotationsLoading: boolean;
  pdfAnnotations: any[];
  imageAnnotations: any[];
  focusAnnotationId?: string | null;
  focusRequestNonce?: number;
  onAddAnnotation: (annotation: any) => void;
  onDeleteAnnotation?: (id: string) => void;
}) {
  const { signedUrl, isLoading: urlLoading, error: urlError, refetch } = useSignedUrl(file?.id);

  if (urlLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm text-muted-foreground">Loading file...</p>
      </div>
    );
  }

  if (urlError || !signedUrl) {
    // Check if error is a 404 (file not found in storage)
    const errorMessage = urlError?.message || "";
    const is404 =
      errorMessage.includes("404") ||
      errorMessage.toLowerCase().includes("not found") ||
      (urlError as any)?.response?.status === 404;

    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <FileIcon className="h-16 w-16 text-red-400 mb-4" />
        <p className="text-sm text-red-600 mb-2">Failed to load file</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {is404
            ? "This file is no longer available in storage. It may have been deleted."
            : urlError?.message || "Unable to generate secure URL"}
        </p>
        {!is404 && (
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        )}
      </div>
    );
  }

  // At this point, signedUrl is guaranteed to be a string (non-null)
  // TypeScript doesn't narrow the type correctly after the early return,
  // so we use a type assertion here
  const url = signedUrl as string;

  if (file.file_type === "application/pdf") {
    if (annotationsLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading annotations...</p>
        </div>
      );
    }
    return (
      <PdfAnnotator
        url={url}
        annotateEnabled={true}
        annotations={pdfAnnotations}
        focusAnnotationId={focusAnnotationId ?? undefined}
        focusRequestNonce={focusRequestNonce}
        onAdd={onAddAnnotation}
        onDelete={onDeleteAnnotation}
      />
    );
  }

  if (file.file_type?.startsWith("image/")) {
    if (annotationsLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading annotations...</p>
        </div>
      );
    }
    return (
      <ImageAnnotator
        url={url}
        annotateEnabled={true}
        annotations={imageAnnotations}
        focusAnnotationId={focusAnnotationId ?? undefined}
        focusRequestNonce={focusRequestNonce}
        onAdd={onAddAnnotation}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <FileIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <p className="text-sm text-muted-foreground mb-4">Preview not available for this file type</p>
      <Button onClick={() => window.open(url, "_blank")} variant="outline">
        Open in New Tab
      </Button>
    </div>
  );
});

interface MiddleMovFilesPanelProps {
  assessment: AssessmentDetailsResponse;
  expandedId?: number | null;
  /** Optional: Timestamp when calibration was requested (Validator calibration) */
  calibrationRequestedAt?: string | null;
  /** Optional: Timestamp when rework was requested (Assessor rework) */
  reworkRequestedAt?: string | null;
  /** Optional: Label for the separation section (e.g., "After Calibration" or "After Rework") */
  separationLabel?: string;
  /** Callback when an annotation is added (for auto-toggling calibration flag) */
  onAnnotationCreated?: (responseId: number, movFileId: number) => void;
  /** Callback when an annotation is deleted (for checking if calibration flag should be removed) */
  onAnnotationDeleted?: (
    responseId: number,
    movFileId: number,
    remainingCountForFile: number
  ) => void;
  /** Callback when rework flag is saved (for updating progress indicator) */
  onReworkFlagSaved?: (responseId: number, movFileId: number, flagged: boolean) => void;
  /** Callback when validator toggles calibration flag (validators only) */
  onCalibrationFlagChange?: (responseId: number, flagged: boolean) => void;
  /** Callback while validator MOV note/flag edits make one open file need attention */
  onMovAttentionChange?: (responseId: number, movFileId: number, hasAttention: boolean) => void;
}

type AnyRecord = Record<string, any>;

type UploadFieldOption = {
  fieldId: string;
  label: string;
};

function extractFileUploadFields(formSchema: AnyRecord): UploadFieldOption[] {
  const fields: AnyRecord[] = [];

  if (Array.isArray(formSchema?.fields)) {
    fields.push(...formSchema.fields);
  }

  if (Array.isArray(formSchema?.sections)) {
    for (const section of formSchema.sections) {
      if (Array.isArray(section?.fields)) {
        fields.push(...section.fields);
      }
    }
  }

  return fields
    .filter((field) => field?.field_type === "file_upload" && typeof field?.field_id === "string")
    .map((field) => ({
      fieldId: field.field_id,
      label:
        typeof field?.label === "string" && field.label.trim().length > 0
          ? field.label
          : field.field_id,
    }));
}

function sortFilesByUploadedAtDesc<T extends { uploaded_at?: string | null }>(files: T[]): T[] {
  return [...files].sort((a, b) => {
    const aTime = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
    const bTime = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
    return bTime - aTime;
  });
}

function patchMovFeedbackInAssessmentCache(
  queryClient: ReturnType<typeof useQueryClient>,
  assessmentId: number,
  movFileId: number,
  feedback: AnyRecord
) {
  if (assessmentId <= 0) return;

  const queryKey = getGetAssessorAssessmentsAssessmentIdQueryKey(assessmentId);

  queryClient.setQueryData(queryKey, (current: unknown) => {
    if (!current || typeof current !== "object") return current;

    const root = current as AnyRecord;
    const core = (root.assessment as AnyRecord | undefined) ?? root;
    const responses = Array.isArray(core.responses) ? core.responses : null;
    if (!responses) return current;

    let didUpdateMov = false;
    const nextResponses = responses.map((response: AnyRecord) => {
      const movs = Array.isArray(response.movs) ? response.movs : null;
      if (!movs) return response;

      const nextMovs = movs.map((mov: AnyRecord) => {
        if (Number(mov.id) !== movFileId) return mov;

        didUpdateMov = true;
        return {
          ...mov,
          assessor_notes:
            feedback.assessor_notes !== undefined ? feedback.assessor_notes : mov.assessor_notes,
          flagged_for_rework:
            feedback.flagged_for_rework !== undefined
              ? feedback.flagged_for_rework
              : mov.flagged_for_rework,
          validator_notes:
            feedback.validator_notes !== undefined ? feedback.validator_notes : mov.validator_notes,
          flagged_for_calibration:
            feedback.flagged_for_calibration !== undefined
              ? feedback.flagged_for_calibration
              : mov.flagged_for_calibration,
        };
      });

      return didUpdateMov ? { ...response, movs: nextMovs } : response;
    });

    if (!didUpdateMov) return current;

    const nextCore = { ...core, responses: nextResponses };
    return root.assessment ? { ...root, assessment: nextCore } : nextCore;
  });

  void queryClient.invalidateQueries({ queryKey, refetchType: "active" });
}

function ReviewFileSection({
  title,
  files,
  badgeClassName,
  titleClassName,
  containerClassName,
  description,
  movAnnotations,
  onPreview,
  onDownload,
  canDelete = false,
  onDelete,
  deletingFileId = null,
  downloadingFileId = null,
}: {
  title: string;
  files: MOVFileResponse[];
  badgeClassName?: string;
  titleClassName?: string;
  containerClassName: string;
  description?: string;
  movAnnotations: any[];
  onPreview: (file: MOVFileResponse) => void;
  onDownload: (file: MOVFileResponse) => void;
  canDelete?: boolean | ((file: MOVFileResponse) => boolean);
  onDelete?: (fileId: number) => void;
  deletingFileId?: number | null;
  downloadingFileId?: number | null;
}) {
  const sortedFiles = React.useMemo(() => sortFilesByUploadedAtDesc(files), [files]);

  if (sortedFiles.length === 0) {
    return null;
  }

  return (
    <div className={containerClassName}>
      <div className="flex items-center gap-2 mb-3">
        <span className={titleClassName}>{title}</span>
        <span className={badgeClassName}>
          {sortedFiles.length} file{sortedFiles.length !== 1 ? "s" : ""}
        </span>
      </div>

      <FileList
        files={sortedFiles}
        onPreview={onPreview}
        onDownload={onDownload}
        canDelete={canDelete}
        onDelete={onDelete}
        deletingFileId={deletingFileId}
        downloadingFileId={downloadingFileId}
        loading={false}
        emptyMessage=""
        movAnnotations={movAnnotations}
      />

      {description && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{description}</p>
      )}
    </div>
  );
}

export function MiddleMovFilesPanel({
  assessment,
  expandedId,
  calibrationRequestedAt,
  reworkRequestedAt,
  separationLabel = "After Calibration",
  onAnnotationCreated,
  onAnnotationDeleted,
  onReworkFlagSaved,
  onCalibrationFlagChange,
  onMovAttentionChange,
}: MiddleMovFilesPanelProps) {
  const { user } = useAuthStore();
  const isValidator = user?.role === "VALIDATOR";
  const queryClient = useQueryClient();

  const data: AnyRecord = (assessment as unknown as AnyRecord) ?? {};
  const core = (data.assessment as AnyRecord) ?? data;
  const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];
  const assessmentId = Number(core?.id ?? 0);
  const assessmentStatus = String(core?.status ?? "").toUpperCase();

  // Find the currently selected response
  const selectedResponse = responses.find((r) => r.id === expandedId);
  const indicator = (selectedResponse?.indicator as AnyRecord) ?? {};
  const selectedIndicatorId = Number(selectedResponse?.indicator_id ?? indicator?.id ?? 0);
  const indicatorName = indicator?.name || "Select an indicator";
  const uploadFieldOptions = React.useMemo(
    () => extractFileUploadFields((indicator?.form_schema as AnyRecord) ?? {}),
    [indicator?.form_schema]
  );
  const [selectedUploadFieldId, setSelectedUploadFieldId] = React.useState<string | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = React.useState<File | null>(null);
  const [isUploadPanelOpen, setIsUploadPanelOpen] = React.useState(false);
  const [pendingDeleteFileId, setPendingDeleteFileId] = React.useState<number | null>(null);
  const [deletingValidatorFileId, setDeletingValidatorFileId] = React.useState<number | null>(null);
  const [downloadingFileId, setDownloadingFileId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (uploadFieldOptions.length === 1) {
      setSelectedUploadFieldId(uploadFieldOptions[0]?.fieldId ?? null);
      return;
    }

    if (
      selectedUploadFieldId &&
      uploadFieldOptions.some((option) => option.fieldId === selectedUploadFieldId)
    ) {
      return;
    }

    setSelectedUploadFieldId(uploadFieldOptions[0]?.fieldId ?? null);
  }, [selectedUploadFieldId, uploadFieldOptions]);

  React.useEffect(() => {
    setSelectedUploadFile(null);
    setIsUploadPanelOpen(false);
    setPendingDeleteFileId(null);
    setDeletingValidatorFileId(null);
    setDownloadingFileId(null);
  }, [expandedId]);

  const validatorUploadMutation = usePostMovsAssessmentsAssessmentIdIndicatorsIndicatorIdUpload({
    mutation: {
      onSuccess: () => {
        const uploadedFileName = selectedUploadFile?.name;
        setSelectedUploadFile(null);
        setIsUploadPanelOpen(false);
        toast.success(
          uploadedFileName
            ? `Uploaded ${uploadedFileName} on behalf of the barangay`
            : "Validator file uploaded"
        );
        if (assessmentId > 0) {
          queryClient.invalidateQueries({
            queryKey: getGetAssessorAssessmentsAssessmentIdQueryKey(assessmentId),
            refetchType: "active",
          });
        }
      },
      onError: (error: any) => {
        toast.error(error?.message || "Failed to upload validator file");
      },
    },
  });
  const deleteValidatorMovMutation = useDeleteMovsFilesFileId({
    mutation: {
      onSuccess: () => {
        setDeletingValidatorFileId(null);
        setPendingDeleteFileId(null);
        toast.success("Validator upload removed");
        if (assessmentId > 0) {
          queryClient.invalidateQueries({
            queryKey: getGetAssessorAssessmentsAssessmentIdQueryKey(assessmentId),
            refetchType: "active",
          });
        }
      },
      onError: (error: any) => {
        setDeletingValidatorFileId(null);
        toast.error(error?.message || "Failed to remove validator file");
      },
    },
  });

  // Determine the appropriate timestamp for file separation based on indicator context
  // - If indicator was calibrated (validation_status is null AND calibration happened), use calibrationRequestedAt
  // - Otherwise, use reworkRequestedAt for assessor rework separation
  const { effectiveTimestamp, effectiveLabel } = React.useMemo(() => {
    if (!selectedResponse) {
      return { effectiveTimestamp: null, effectiveLabel: separationLabel };
    }

    // Check if this indicator was part of calibration (validation_status was cleared)
    // If calibrationRequestedAt exists and this indicator has null validation_status, it was likely calibrated
    const wasCalibrated = calibrationRequestedAt && selectedResponse.validation_status === null;

    if (wasCalibrated) {
      return { effectiveTimestamp: calibrationRequestedAt, effectiveLabel: "After Calibration" };
    } else if (reworkRequestedAt) {
      return { effectiveTimestamp: reworkRequestedAt, effectiveLabel: "After Rework" };
    }

    return { effectiveTimestamp: null, effectiveLabel: separationLabel };
  }, [selectedResponse, calibrationRequestedAt, reworkRequestedAt, separationLabel]);

  // Get MOV files from the selected response with isNew flag for calibration separation
  const movFiles = React.useMemo(() => {
    if (!selectedResponse) return [];

    // MOV files are in the 'movs' array according to the backend schema
    const files = (selectedResponse.movs as AnyRecord[]) ?? [];

    // Parse effective timestamp for comparison
    const separationDate = effectiveTimestamp ? new Date(effectiveTimestamp) : null;

    // Transform backend MOV format to FileList component format
    // Backend sends: { id, filename, original_filename, file_size, content_type, storage_path, status, uploaded_at }
    return files.map((mov: AnyRecord) => {
      const uploadedAt = mov.uploaded_at || new Date().toISOString();
      const uploadDate = new Date(uploadedAt);

      // File is "new" if it was uploaded AFTER the separation timestamp
      const isNew = separationDate ? uploadDate > separationDate : false;

      return {
        id: parseInt(String(mov.id), 10),
        assessment_id: Number(selectedResponse.assessment_id ?? assessmentId),
        indicator_id: Number(selectedResponse.indicator_id ?? indicator?.id ?? selectedIndicatorId),
        file_name: mov.original_filename || mov.filename || "Unknown file",
        file_url: mov.storage_path || "", // Storage path is the URL to the file
        file_type: mov.content_type || "application/octet-stream",
        file_size: mov.file_size || 0,
        uploaded_by: Number(mov.uploaded_by ?? 0),
        uploaded_at: uploadedAt,
        deleted_at: null,
        field_id: mov.field_id || null,
        isNew, // Flag for visual separation in UI
        is_rejected: mov.is_rejected === true, // Flag for rejected files (validator view)
        has_annotations: mov.has_annotations === true, // Flag for files with annotations
        assessor_notes: mov.assessor_notes || null,
        flagged_for_rework: mov.flagged_for_rework === true,
        validator_notes: mov.validator_notes || null,
        flagged_for_calibration: mov.flagged_for_calibration === true,
        upload_origin: mov.upload_origin || "unknown",
      };
    });
  }, [assessmentId, effectiveTimestamp, indicator?.id, selectedIndicatorId, selectedResponse]);

  const hasReviewerNotes = React.useCallback(
    (file: AnyRecord) =>
      isValidator
        ? Boolean(file.validator_notes && String(file.validator_notes).trim())
        : Boolean(file.assessor_notes && String(file.assessor_notes).trim()),
    [isValidator]
  );

  const hasReviewerFlag = React.useCallback(
    (file: AnyRecord) =>
      isValidator ? file.flagged_for_calibration === true : file.flagged_for_rework === true,
    [isValidator]
  );

  // State for PDF annotation modal
  const [selectedFile, setSelectedFile] = React.useState<any | null>(null);
  const [isAnnotating, setIsAnnotating] = React.useState(false);
  const [focusAnnotationId, setFocusAnnotationId] = React.useState<string | null>(null);
  const [focusRequestNonce, setFocusRequestNonce] = React.useState(0);

  // Use the annotations hook for the selected file
  const {
    annotations,
    isLoading: annotationsLoading,
    createAnnotation,
    deleteAnnotation,
  } = useMovAnnotations(selectedFile?.id || null);

  // State for per-MOV reviewer feedback
  const [movNotes, setMovNotes] = React.useState("");
  const [movFlagged, setMovFlagged] = React.useState(false);
  const [feedbackDirty, setFeedbackDirty] = React.useState(false);

  // Fetch existing feedback when a file is selected
  const movFileId = selectedFile?.id || 0;
  const { data: feedbackData, isLoading: feedbackLoading } = useGetAssessorMovsMovFileIdFeedback(
    movFileId,
    {
      query: {
        queryKey: getGetAssessorMovsMovFileIdFeedbackQueryKey(movFileId),
        enabled: !!selectedFile?.id && isAnnotating,
        staleTime: 0, // Always refetch when opening
      },
    }
  );

  // Update feedback mutation (assessor only)
  const updateFeedbackMutation = usePatchAssessorMovsMovFileIdFeedback({
    mutation: {
      onSuccess: (_data, variables) => {
        toast.success("Feedback saved");
        setFeedbackDirty(false);
        patchMovFeedbackInAssessmentCache(
          queryClient,
          assessmentId,
          variables.movFileId,
          variables.data as AnyRecord
        );
        const flaggedValue = isValidator
          ? (variables.data as AnyRecord).flagged_for_calibration
          : (variables.data as AnyRecord).flagged_for_rework;

        // Notify parent about flag change for progress indicator update
        if (expandedId && onReworkFlagSaved) {
          onReworkFlagSaved(expandedId, variables.movFileId, flaggedValue ?? false);
        }
        if (isValidator && expandedId && onCalibrationFlagChange) {
          onCalibrationFlagChange(expandedId, flaggedValue ?? false);
        }
      },
      onError: (error: any) => {
        toast.error(error?.message || "Failed to save feedback");
      },
    },
  });

  // Sync local state with fetched data
  React.useEffect(() => {
    if (feedbackData) {
      const nextNotes = isValidator
        ? ((feedbackData as AnyRecord).validator_notes as string) || ""
        : ((feedbackData as AnyRecord).assessor_notes as string) || "";
      const nextFlagged = isValidator
        ? Boolean((feedbackData as AnyRecord).flagged_for_calibration)
        : Boolean((feedbackData as AnyRecord).flagged_for_rework);
      setMovNotes(nextNotes);
      setMovFlagged(nextFlagged);
      setFeedbackDirty(false);
    }
  }, [feedbackData, isValidator]);

  // Reset feedback state when closing modal
  React.useEffect(() => {
    if (!isAnnotating) {
      setMovNotes("");
      setMovFlagged(false);
      setFeedbackDirty(false);
    }
  }, [isAnnotating]);

  React.useEffect(() => {
    if (!isValidator || !expandedId || !selectedFile?.id || !onMovAttentionChange) return;

    const currentResponseId = expandedId;
    const currentMovFileId = selectedFile.id;
    const hasAttention = movFlagged || movNotes.trim().length > 0;

    onMovAttentionChange(currentResponseId, currentMovFileId, hasAttention);

    return () => {
      onMovAttentionChange(currentResponseId, currentMovFileId, false);
    };
  }, [movNotes, movFlagged, isValidator, expandedId, selectedFile?.id, onMovAttentionChange]);

  // Auto-toggle flag when notes are added
  const handleNotesChange = (value: string) => {
    setMovNotes(value);
    setFeedbackDirty(true);
    // Auto-enable flag when notes are added (if not already enabled)
    if (value.trim() && !movFlagged) {
      setMovFlagged(true);
      if (isValidator && expandedId && onCalibrationFlagChange) {
        onCalibrationFlagChange(expandedId, true);
      }
    }
  };

  const handleFlagChange = (checked: boolean) => {
    setMovFlagged(checked);
    setFeedbackDirty(true);
    if (isValidator && expandedId && onCalibrationFlagChange) {
      onCalibrationFlagChange(expandedId, checked);
    }
  };

  const handleSaveFeedback = () => {
    if (!selectedFile?.id) return;
    updateFeedbackMutation.mutate({
      movFileId: selectedFile.id,
      data: {
        assessor_notes: isValidator ? undefined : movNotes,
        flagged_for_rework: isValidator ? undefined : movFlagged,
        validator_notes: isValidator ? movNotes : undefined,
        flagged_for_calibration: isValidator ? movFlagged : undefined,
      },
    });
  };

  const handlePreview = (file: any) => {
    // Set selected file for preview (works for both PDF and images)
    // The modal opens on top of the current view without any tab navigation
    setSelectedFile(file);
    setIsAnnotating(true);
    setFocusAnnotationId(null);
    setFocusRequestNonce(0);
  };

  const handleDownload = async (file: MOVFileResponse) => {
    try {
      setDownloadingFileId(file.id);
      const signedUrl = await fetchSignedUrl(file.id);

      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success(`Downloaded ${file.file_name}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    } finally {
      setDownloadingFileId(null);
    }
  };

  const closeAnnotationModal = () => {
    setIsAnnotating(false);
    setSelectedFile(null);
    setFocusAnnotationId(null);
    setFocusRequestNonce(0);
  };

  const handleFocusAnnotation = React.useCallback((annotationId: string) => {
    setFocusAnnotationId(annotationId);
    setFocusRequestNonce((current) => current + 1);
  }, []);

  // Transform annotations from backend format to PdfAnnotator format
  const safeAnnotations = Array.isArray(annotations) ? annotations : [];
  const pdfAnnotations = React.useMemo(() => {
    return safeAnnotations.map((ann: any) => ({
      id: String(ann.id),
      type: "pdfRect" as const,
      page: ann.page ?? ann.page_number ?? 0, // Backend returns 'page', not 'page_number'
      rect: ann.rect || { x: 0, y: 0, w: 10, h: 10 },
      rects: ann.rects,
      comment: ann.comment || "",
      createdAt: ann.created_at || new Date().toISOString(),
    }));
  }, [safeAnnotations]);

  // Transform annotations for ImageAnnotator
  const imageAnnotations = React.useMemo(() => {
    return safeAnnotations.map((ann: any) => ({
      id: String(ann.id),
      rect: ann.rect || { x: 0, y: 0, w: 10, h: 10 },
      comment: ann.comment || "",
      createdAt: ann.created_at || new Date().toISOString(),
    }));
  }, [safeAnnotations]);

  const handleAddAnnotation = React.useCallback(
    async (annotation: any) => {
      if (!selectedFile?.id) return;

      console.log("[MiddleMovFilesPanel] handleAddAnnotation called, expandedId:", expandedId);

      try {
        // For images, annotation won't have a 'page' property
        const isImageAnnotation = !("page" in annotation);

        await createAnnotation({
          mov_file_id: selectedFile.id,
          annotation_type: isImageAnnotation ? "imageRect" : "pdfRect",
          page: annotation.page ?? 0,
          rect: annotation.rect,
          rects: annotation.rects || undefined,
          comment: annotation.comment || "",
        });

        // Notify parent that annotation was created (for auto-toggling rework/calibration flag)
        console.log(
          "[MiddleMovFilesPanel] Annotation created, calling onAnnotationCreated:",
          expandedId,
          "movFileId:",
          selectedFile.id
        );
        if (expandedId && onAnnotationCreated && selectedFile?.id) {
          onAnnotationCreated(expandedId, selectedFile.id);
        } else {
          console.warn(
            "[MiddleMovFilesPanel] Cannot notify parent - expandedId:",
            expandedId,
            "selectedFile.id:",
            selectedFile?.id,
            "onAnnotationCreated:",
            !!onAnnotationCreated
          );
        }
      } catch (error) {
        console.error("[MiddleMovFilesPanel] Failed to create annotation:", error);
      }
    },
    [selectedFile?.id, expandedId, onAnnotationCreated, createAnnotation]
  );

  // Wrapper for deleteAnnotation that calls the callback
  const handleDeleteAnnotation = React.useCallback(
    async (annotationId: number) => {
      // Calculate remaining count BEFORE deletion (since annotations state is stale after mutation)
      const currentCount = Array.isArray(annotations) ? annotations.length : 0;
      const remainingCountForFile = Math.max(0, currentCount - 1);

      console.log(
        "[MiddleMovFilesPanel] handleDeleteAnnotation - annotationId:",
        annotationId,
        "expandedId:",
        expandedId,
        "movFileId:",
        selectedFile?.id,
        "currentCount:",
        currentCount,
        "willHaveRemaining:",
        remainingCountForFile
      );

      try {
        await deleteAnnotation(annotationId);
        console.log("[MiddleMovFilesPanel] Annotation deleted successfully");

        // Notify parent that annotation was deleted (with file-level tracking)
        if (expandedId && onAnnotationDeleted && selectedFile?.id) {
          console.log(
            "[MiddleMovFilesPanel] Calling onAnnotationDeleted with movFileId:",
            selectedFile.id,
            "remaining:",
            remainingCountForFile
          );
          onAnnotationDeleted(expandedId, selectedFile.id, remainingCountForFile);
        } else {
          console.warn(
            "[MiddleMovFilesPanel] Cannot notify parent - expandedId:",
            expandedId,
            "selectedFile.id:",
            selectedFile?.id,
            "onAnnotationDeleted:",
            !!onAnnotationDeleted
          );
        }
      } catch (error) {
        console.error("[MiddleMovFilesPanel] Failed to delete annotation:", error);
      }
    },
    [safeAnnotations.length, expandedId, selectedFile?.id, deleteAnnotation, onAnnotationDeleted]
  );

  // Wrapper for PdfAnnotator's onDelete which passes string ID
  const handleDeleteAnnotationFromPdf = React.useCallback(
    (annotationIdStr: string) => {
      const annotationId = parseInt(annotationIdStr, 10);
      if (!isNaN(annotationId)) {
        handleDeleteAnnotation(annotationId);
      }
    },
    [handleDeleteAnnotation]
  );

  const normalPreviousFiles = React.useMemo(
    () =>
      sortFilesByUploadedAtDesc(
        movFiles.filter((file) => hasReviewerNotes(file) || hasReviewerFlag(file))
      ),
    [movFiles, hasReviewerNotes, hasReviewerFlag]
  );

  const barangayFiles = React.useMemo(
    () =>
      sortFilesByUploadedAtDesc(
        movFiles.filter((file) => (file as AnyRecord).upload_origin !== "validator")
      ),
    [movFiles]
  );
  const validatorFiles = React.useMemo(
    () =>
      sortFilesByUploadedAtDesc(
        movFiles.filter((file) => (file as AnyRecord).upload_origin === "validator")
      ),
    [movFiles]
  );
  // Separate files into:
  // - newFiles: Files uploaded AFTER rework/calibration (replacement files)
  // - acceptedOldFiles: Files uploaded BEFORE but were accepted (no annotations, didn't need re-upload)
  // - rejectedOldFiles: Files uploaded BEFORE and were rejected/replaced
  const { newFiles, acceptedOldFiles, rejectedOldFiles } = React.useMemo(() => {
    if (!effectiveTimestamp) {
      // No separation timestamp - all files are treated as accepted (normal view)
      return { newFiles: [], acceptedOldFiles: movFiles, rejectedOldFiles: [] };
    }

    if (isValidator) {
      return groupValidatorFilesForDisplay(barangayFiles);
    }

    const newUploads = movFiles.filter((f: any) => f.isNew);
    const oldUploads = movFiles.filter((f: any) => !f.isNew);

    // Check if any old files have explicit rejection/note flags
    const hasExplicitRejection = oldUploads.some(
      (f: any) =>
        f.is_rejected === true ||
        f.has_annotations === true ||
        hasReviewerFlag(f) ||
        hasReviewerNotes(f)
    );

    let rejected: any[] = [];
    let accepted: any[] = [];

    if (hasExplicitRejection) {
      // Use is_rejected, has_annotations, or flagged_for_rework flag to determine rejection
      rejected = oldUploads.filter(
        (f: any) =>
          f.is_rejected === true ||
          f.has_annotations === true ||
          hasReviewerFlag(f) ||
          hasReviewerNotes(f)
      );
      accepted = oldUploads.filter(
        (f: any) =>
          f.is_rejected !== true &&
          f.has_annotations !== true &&
          !hasReviewerFlag(f) &&
          !hasReviewerNotes(f)
      );
    } else {
      // No explicit rejection flags on any old files
      // Even if there are new uploads, old files without annotations should remain as accepted
      // Only files with explicit rejection/annotation flags should go to PREVIOUS FILES
      rejected = [];
      accepted = oldUploads;
    }

    return {
      newFiles: newUploads,
      acceptedOldFiles: accepted,
      rejectedOldFiles: rejected,
    };
  }, [barangayFiles, movFiles, effectiveTimestamp, hasReviewerFlag, hasReviewerNotes, isValidator]);
  const validatorUploadStatuses = new Set(["SUBMITTED", "AWAITING_FINAL_VALIDATION"]);
  const isValidatorUploadStage = validatorUploadStatuses.has(assessmentStatus);
  const canValidatorUpload =
    isValidator &&
    isValidatorUploadStage &&
    selectedIndicatorId > 0 &&
    uploadFieldOptions.length > 0;

  const canDeleteValidatorFile = React.useCallback(
    (file: MOVFileResponse) =>
      isValidator &&
      isValidatorUploadStage &&
      file.upload_origin === "validator" &&
      Number(file.uploaded_by ?? 0) === Number(user?.id ?? 0),
    [isValidatorUploadStage, isValidator, user?.id]
  );

  const handleDeleteValidatorFile = React.useCallback((fileId: number) => {
    setPendingDeleteFileId(fileId);
  }, []);

  const confirmDeleteValidatorFile = React.useCallback(() => {
    if (pendingDeleteFileId === null) {
      return;
    }

    setDeletingValidatorFileId(pendingDeleteFileId);
    deleteValidatorMovMutation.mutate({ fileId: pendingDeleteFileId });
  }, [deleteValidatorMovMutation, pendingDeleteFileId]);
  const selectedUploadField = uploadFieldOptions.find(
    (option) => option.fieldId === selectedUploadFieldId
  );
  const uploadingFileName = validatorUploadMutation.isPending
    ? (selectedUploadFile?.name ?? null)
    : null;

  const handleValidatorFileSelect = React.useCallback(
    (file: File) => {
      if (selectedIndicatorId <= 0 || !selectedUploadFieldId) {
        toast.error("Select a target upload field first");
        return;
      }

      setSelectedUploadFile(file);
      validatorUploadMutation.mutate({
        assessmentId,
        indicatorId: selectedIndicatorId,
        data: {
          file,
          field_id: selectedUploadFieldId,
          field_label: selectedUploadField?.label ?? selectedUploadFieldId,
        },
      });
    },
    [
      assessmentId,
      selectedIndicatorId,
      selectedUploadFieldId,
      selectedUploadField,
      validatorUploadMutation,
    ]
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="h-14 flex items-center px-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileIcon className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100 truncate">
              Indicator Files
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
              {indicatorName}
            </p>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
        {selectedResponse && isValidator && (
          <div className="mb-4 rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  <Upload className="h-3.5 w-3.5" />
                  Upload on Behalf of Barangay
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Optional. Add supporting evidence for this indicator only when needed.
                </p>
              </div>
              {canValidatorUpload ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 text-xs cursor-pointer disabled:cursor-wait"
                  disabled={validatorUploadMutation.isPending}
                  onClick={() => setIsUploadPanelOpen((current) => !current)}
                >
                  {validatorUploadMutation.isPending
                    ? "Uploading..."
                    : isUploadPanelOpen
                      ? "Hide"
                      : "Add file"}
                </Button>
              ) : null}
            </div>

            {canValidatorUpload && isUploadPanelOpen ? (
              <div className="space-y-3 rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/40 p-3">
                {uploadingFileName ? (
                  <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200">
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                    <div className="min-w-0">
                      <p className="font-semibold">Uploading validator evidence</p>
                      <p className="mt-0.5 text-[11px] leading-5 text-blue-700/90 dark:text-blue-200/90">
                        {uploadingFileName}
                        {selectedUploadField?.label
                          ? ` is being attached to ${selectedUploadField.label}.`
                          : " is being attached to the selected file field."}
                      </p>
                    </div>
                  </div>
                ) : null}

                {uploadFieldOptions.length > 1 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600 dark:text-slate-400">
                      Target field
                    </Label>
                    <Select
                      value={selectedUploadFieldId ?? undefined}
                      onValueChange={setSelectedUploadFieldId}
                      disabled={validatorUploadMutation.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select file field" />
                      </SelectTrigger>
                      <SelectContent>
                        {uploadFieldOptions.map((option) => (
                          <SelectItem key={option.fieldId} value={option.fieldId}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <FileUpload
                  onFileSelect={handleValidatorFileSelect}
                  onFileRemove={() => setSelectedUploadFile(null)}
                  selectedFile={selectedUploadFile}
                  isUploading={validatorUploadMutation.isPending}
                  disabled={!selectedUploadFieldId || validatorUploadMutation.isPending}
                  className="space-y-2"
                />

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs cursor-pointer disabled:cursor-not-allowed"
                    disabled={validatorUploadMutation.isPending}
                    onClick={() => {
                      setSelectedUploadFile(null);
                      setIsUploadPanelOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {!isValidatorUploadStage
                  ? "Validator uploads are available while the assessment is submitted or awaiting final validation."
                  : uploadFieldOptions.length === 0
                    ? "This indicator has no file upload field to attach validator evidence to."
                    : validatorUploadMutation.isPending
                      ? "Uploading validator evidence now. The files list will refresh automatically once the upload finishes."
                      : "Expand this action only when you need to add supporting evidence on behalf of the barangay."}
              </p>
            )}
          </div>
        )}

        {!selectedResponse ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 dark:text-slate-500">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
              <FileIcon className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              No Indicator Selected
            </p>
            <p className="text-xs max-w-[180px]">
              Select an indicator from the left panel to view uploaded files
            </p>
          </div>
        ) : movFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 dark:text-slate-500">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
              <FileIcon className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              No Files Uploaded
            </p>
            <p className="text-xs max-w-[180px]">
              There are no files uploaded for this indicator yet
            </p>
          </div>
        ) : effectiveTimestamp ? (
          <div className="space-y-4">
            {newFiles.length > 0 && (
              <ReviewFileSection
                title={`Latest File (${effectiveLabel})`}
                files={newFiles}
                titleClassName="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide"
                badgeClassName="text-xs text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full"
                containerClassName="rounded-sm border-2 border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3"
                description={`Uploads made ${effectiveLabel.toLowerCase()} remain visible here.`}
                movAnnotations={safeAnnotations}
                onPreview={handlePreview}
                onDownload={handleDownload}
                downloadingFileId={downloadingFileId}
              />
            )}

            {acceptedOldFiles.length > 0 && (
              <ReviewFileSection
                title="Existing File"
                files={acceptedOldFiles}
                titleClassName="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide"
                badgeClassName="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full"
                containerClassName="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3"
                description="Accepted uploads from earlier submissions remain visible for reference."
                movAnnotations={safeAnnotations}
                onPreview={handlePreview}
                onDownload={handleDownload}
              />
            )}

            {rejectedOldFiles.length > 0 && (
              <ReviewFileSection
                title="Previous File"
                files={rejectedOldFiles}
                titleClassName="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide"
                badgeClassName="text-xs text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-full"
                containerClassName="rounded-sm border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-3 opacity-75"
                description="These files were flagged during review and replaced with newer uploads."
                movAnnotations={safeAnnotations}
                onPreview={handlePreview}
                onDownload={handleDownload}
              />
            )}

            {validatorFiles.length > 0 && (
              <ReviewFileSection
                title="Validator Uploads"
                files={validatorFiles}
                titleClassName="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide"
                badgeClassName="text-xs text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full"
                containerClassName="rounded-sm border border-blue-200 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-950/20 p-3"
                description="Files uploaded by validators are kept separate from barangay evidence."
                movAnnotations={safeAnnotations}
                onPreview={handlePreview}
                onDownload={handleDownload}
                canDelete={canDeleteValidatorFile}
                onDelete={handleDeleteValidatorFile}
                deletingFileId={deletingValidatorFileId}
                downloadingFileId={downloadingFileId}
              />
            )}

            {/* No files at all */}
            {newFiles.length === 0 &&
              acceptedOldFiles.length === 0 &&
              rejectedOldFiles.length === 0 &&
              validatorFiles.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center p-6">
                  <FileIcon className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No files uploaded for this indicator
                  </p>
                </div>
              )}
          </div>
        ) : (
          <div className="space-y-4">
            <ReviewFileSection
              title="Barangay Uploads"
              files={barangayFiles}
              titleClassName="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide"
              badgeClassName="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full"
              containerClassName="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3"
              description="Barangay uploads remain visible in this section."
              movAnnotations={safeAnnotations}
              onPreview={handlePreview}
              onDownload={handleDownload}
              downloadingFileId={downloadingFileId}
            />
            {validatorFiles.length > 0 && (
              <ReviewFileSection
                title="Validator Uploads"
                files={validatorFiles}
                titleClassName="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide"
                badgeClassName="text-xs text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full"
                containerClassName="rounded-sm border border-blue-200 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-950/20 p-3"
                description="Files uploaded by validators are kept separate from barangay evidence."
                movAnnotations={safeAnnotations}
                onPreview={handlePreview}
                onDownload={handleDownload}
                canDelete={canDeleteValidatorFile}
                onDelete={handleDeleteValidatorFile}
                deletingFileId={deletingValidatorFileId}
                downloadingFileId={downloadingFileId}
              />
            )}
            {normalPreviousFiles.length > 0 && (
              <ReviewFileSection
                title="Previous File"
                files={normalPreviousFiles}
                titleClassName="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide"
                badgeClassName="text-xs text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-full"
                containerClassName="rounded-sm border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-3 opacity-75"
                description="These files remain available for review because they have reviewer notes or flags."
                movAnnotations={safeAnnotations}
                onPreview={handlePreview}
                onDownload={handleDownload}
                downloadingFileId={downloadingFileId}
              />
            )}
          </div>
        )}
      </div>

      {/* File Preview Modal (PDF with annotations or Image) */}
      {isAnnotating && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          {/* Mobile: Full screen, Desktop: Centered modal */}
          <div className="bg-white dark:bg-slate-900 rounded-none md:rounded-lg shadow-xl w-full md:w-[85vw] md:max-w-[1400px] h-full md:h-[90vh] flex flex-col p-3 md:p-4 overflow-hidden md:border border-slate-200 dark:border-slate-700">
            {/* Header - Always visible */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-3 shrink-0">
              <div className="flex-1 min-w-0 mr-4 overflow-hidden">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h2 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100 truncate cursor-default">
                        {selectedFile.file_name}
                      </h2>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[500px] break-words">
                      <p>{selectedFile.file_name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">
                  {selectedFile.file_type === "application/pdf"
                    ? "Select text to add highlight and comment"
                    : "Image preview"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeAnnotationModal}
                className="shrink-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content Area - Responsive layout */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              {/* File Viewer - Full width on mobile, flexible on desktop */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0 md:mr-4">
                <div className="flex-1 relative overflow-hidden bg-slate-100 dark:bg-slate-950/50 rounded-sm">
                  <SecureFileContent
                    file={selectedFile}
                    annotationsLoading={annotationsLoading}
                    pdfAnnotations={pdfAnnotations}
                    imageAnnotations={imageAnnotations}
                    focusAnnotationId={focusAnnotationId}
                    focusRequestNonce={focusRequestNonce}
                    onAddAnnotation={handleAddAnnotation}
                    onDeleteAnnotation={handleDeleteAnnotationFromPdf}
                  />
                </div>
              </div>

              {/* Comments Sidebar - Hidden on mobile, visible on desktop */}
              {(selectedFile.file_type === "application/pdf" ||
                selectedFile.file_type?.startsWith("image/")) && (
                <div
                  key={`sidebar-${selectedFile.id}`}
                  className="hidden md:flex w-80 shrink-0 flex-col border-l border-slate-200 dark:border-slate-700 pl-4"
                >
                  {/* Reviewer Feedback Section */}
                  <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-sm mb-3 text-slate-900 dark:text-slate-100">
                      MOV Notes
                    </h3>

                    {feedbackLoading ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Textarea
                            id="assessor-notes"
                            placeholder="Describe the specific issue with this file (e.g., missing signature, incorrect date, or blurry scan)..."
                            value={movNotes}
                            onChange={(e) => handleNotesChange(e.target.value)}
                            className="min-h-[80px] text-sm resize-none"
                          />
                        </div>

                        {/* Role-specific Toggle */}
                        <div
                          className={`flex items-center justify-between p-3 rounded-md border ${
                            movFlagged
                              ? "bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle
                              className={`h-4 w-4 ${movFlagged ? "text-orange-500" : "text-slate-400"}`}
                            />
                            <Label
                              htmlFor="flag-rework"
                              className={`text-sm font-medium cursor-pointer ${
                                movFlagged
                                  ? "text-orange-700 dark:text-orange-300"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {isValidator ? "Flag for Calibration" : "Flag for Rework"}
                            </Label>
                          </div>
                          <Switch
                            id="flag-rework"
                            checked={movFlagged}
                            onCheckedChange={handleFlagChange}
                            className={`${
                              movFlagged
                                ? "data-[state=checked]:bg-orange-500"
                                : "data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-600"
                            }`}
                          />
                        </div>

                        {movFlagged && (
                          <p className="text-xs text-orange-600 dark:text-orange-400">
                            {isValidator
                              ? "This MOV will be marked for BLGU calibration."
                              : "This MOV will be marked for BLGU rework."}
                          </p>
                        )}

                        {/* Save Button */}
                        <Button
                          onClick={handleSaveFeedback}
                          disabled={!feedbackDirty || updateFeedbackMutation.isPending}
                          size="sm"
                          className="w-full"
                        >
                          {updateFeedbackMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Feedback
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Annotations Section */}
                  <h3 className="font-semibold text-sm mb-3 pb-2 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                    {selectedFile.file_type === "application/pdf" ? "Comments" : "Annotations"} (
                    {selectedFile.file_type === "application/pdf"
                      ? pdfAnnotations.length
                      : imageAnnotations.length}
                    )
                  </h3>
                  <div className="flex-1 space-y-3 overflow-y-auto pr-3">
                    {selectedFile.file_type === "application/pdf" ? (
                      // PDF Annotations
                      pdfAnnotations.length === 0 ? (
                        <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                          No comments yet. Select text to add a highlight with a comment.
                        </div>
                      ) : (
                        pdfAnnotations.map((ann, idx) => (
                          <div
                            key={ann.id}
                            role="button"
                            tabIndex={0}
                            aria-pressed={focusAnnotationId === ann.id}
                            className={cn(
                              "relative rounded-sm border bg-slate-50 p-3 transition-colors duration-200 dark:bg-slate-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
                              focusAnnotationId === ann.id
                                ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/10"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-100/70 dark:hover:border-slate-600 dark:hover:bg-slate-700/60"
                            )}
                            onClick={() => handleFocusAnnotation(ann.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleFocusAnnotation(ann.id);
                              }
                            }}
                          >
                            <div className="group flex w-full min-w-0 items-start gap-3 pr-6 text-left">
                              <div
                                className={cn(
                                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-colors duration-200",
                                  focusAnnotationId === ann.id
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                    : "bg-slate-100 text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-700 dark:bg-slate-700 dark:text-slate-300 dark:group-hover:bg-amber-900/30 dark:group-hover:text-amber-300"
                                )}
                              >
                                <LocateFixed className="h-4 w-4" aria-hidden="true" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center gap-2 text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
                                  <span>Locate comment</span>
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px]",
                                      focusAnnotationId === ann.id
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                        : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                    )}
                                  >
                                    #{idx + 1}
                                  </span>
                                </div>
                                <p className="mb-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                  {ann.comment || "(No comment)"}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Page {ann.page + 1}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteAnnotation(parseInt(ann.id));
                              }}
                              aria-label="Delete comment"
                              className="absolute -right-2 -top-2 z-10 h-6 w-6 shrink-0 rounded-full border border-slate-200 bg-white p-0 text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))
                      )
                    ) : // Image Annotations
                    imageAnnotations.length === 0 ? (
                      <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                        No annotations yet. Draw a rectangle on the image and add a comment.
                      </div>
                    ) : (
                      imageAnnotations.map((ann, idx) => (
                        <div
                          key={ann.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={focusAnnotationId === ann.id}
                          className={cn(
                            "relative rounded-sm border bg-slate-50 p-3 transition-colors duration-200 dark:bg-slate-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
                            focusAnnotationId === ann.id
                              ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/10"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-100/70 dark:hover:border-slate-600 dark:hover:bg-slate-700/60"
                          )}
                          onClick={() => handleFocusAnnotation(ann.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleFocusAnnotation(ann.id);
                            }
                          }}
                        >
                          <div className="group flex w-full min-w-0 items-start gap-3 pr-6 text-left">
                            <div
                              className={cn(
                                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-colors duration-200",
                                focusAnnotationId === ann.id
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                  : "bg-slate-100 text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-700 dark:bg-slate-700 dark:text-slate-300 dark:group-hover:bg-amber-900/30 dark:group-hover:text-amber-300"
                              )}
                            >
                              <LocateFixed className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2 text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
                                <span>Locate annotation</span>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px]",
                                    focusAnnotationId === ann.id
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                  )}
                                >
                                  #{idx + 1}
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                {ann.comment || "(No comment)"}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteAnnotation(parseInt(ann.id));
                            }}
                            aria-label="Delete annotation"
                            className="absolute -right-2 -top-2 z-10 h-6 w-6 shrink-0 rounded-full border border-slate-200 bg-white p-0 text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={pendingDeleteFileId !== null}
        onClose={() => setPendingDeleteFileId(null)}
        onConfirm={confirmDeleteValidatorFile}
        title="Remove validator upload?"
        message="This will remove the validator-uploaded file from the assessment evidence list. Barangay uploads will remain unchanged."
        confirmText="Remove file"
        pendingText="Removing..."
        cancelText="Cancel"
        variant="danger"
        isPending={deleteValidatorMovMutation.isPending}
      />
    </div>
  );
}
