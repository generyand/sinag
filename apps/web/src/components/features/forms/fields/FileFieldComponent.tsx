// 📎 File Field Component (Epic 4.0)
// Fully integrated file upload field with MOV upload system

"use client";

import { FileList } from "@/components/features/movs/FileList";
import { FileListWithDelete } from "@/components/features/movs/FileListWithDelete";
import { FileUpload } from "@/components/features/movs/FileUpload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { classifyError } from "@/lib/error-utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useUploadStore } from "@/store/useUploadStore";
import type { FileUploadField } from "@sinag/shared";
import {
  getGetAssessmentsMyAssessmentQueryKey,
  getGetBlguDashboardAssessmentIdQueryKey,
  getGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFilesQueryKey,
  getGetMovsFilesFileIdSignedUrlQueryKey,
  MOVFileResponse,
  useGetAssessmentsMyAssessment,
  useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles,
  usePostMovsAssessmentsAssessmentIdIndicatorsIndicatorIdUpload,
  useGetMovsFilesFileIdSignedUrl,
} from "@sinag/shared";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileIcon, Info, Loader2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

// Dynamically import annotators to avoid SSR issues
const PdfAnnotator = dynamic(() => import("@/components/shared/PdfAnnotator"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[70vh]">Loading PDF viewer...</div>
  ),
});

const ImageAnnotator = dynamic(() => import("@/components/shared/ImageAnnotator"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[70vh]">Loading image viewer...</div>
  ),
});

/**
 * Secure file preview component that fetches signed URL before rendering.
 * This ensures files from private buckets can be accessed securely.
 */
function SecureFilePreview({ file, annotations }: { file: MOVFileResponse; annotations: any[] }) {
  const {
    data: signedUrlData,
    isLoading,
    error,
    refetch,
  } = useGetMovsFilesFileIdSignedUrl(file.id, {
    query: {
      queryKey: getGetMovsFilesFileIdSignedUrlQueryKey(file.id),
      staleTime: 1000 * 60 * 30, // Cache for 30 minutes
      retry: 2,
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">Loading file...</p>
        </div>
      </div>
    );
  }

  const signedUrl = signedUrlData?.signed_url;

  if (error || !signedUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <FileIcon className="h-16 w-16 text-red-300 mb-4" />
        <p className="text-sm text-red-600 mb-2">Failed to load file</p>
        <p className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Unable to generate secure URL"}
        </p>
        <Button variant="outline" onClick={() => refetch()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  // At this point, signedUrl is guaranteed to be a string (non-null)
  // TypeScript doesn't narrow the type correctly after the early return,
  // so we use a type assertion here
  const url = signedUrl as string;

  if (file.file_type === "application/pdf") {
    return (
      <PdfAnnotator
        url={url}
        annotateEnabled={false}
        annotations={annotations
          .filter((ann: any) => ann.mov_file_id === file.id)
          .map((ann: any) => ({
            id: String(ann.id),
            type: "pdfRect" as const,
            page: ann.page_number || 0,
            rect: ann.rect || { x: 0, y: 0, w: 10, h: 10 },
            rects: ann.rects,
            comment: ann.comment || "",
            createdAt: ann.created_at || new Date().toISOString(),
          }))}
        onAdd={() => {}}
      />
    );
  }

  if (file.file_type?.startsWith("image/")) {
    return (
      <ImageAnnotator
        url={url}
        annotateEnabled={false}
        annotations={annotations
          .filter((ann: any) => ann.mov_file_id === file.id)
          .map((ann: any) => ({
            id: String(ann.id),
            rect: ann.rect || { x: 0, y: 0, w: 10, h: 10 },
            comment: ann.comment || "",
            createdAt: ann.created_at || new Date().toISOString(),
          }))}
        onAdd={() => {}}
      />
    );
  }

  // Unsupported file type
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <FileIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <p className="text-sm text-muted-foreground mb-4">Preview not available for this file type</p>
    </div>
  );
}

interface FileFieldComponentProps {
  field: FileUploadField;
  assessmentId: number;
  indicatorId: number;
  disabled?: boolean;
  movAnnotations?: any[];
}

/**
 * File upload field component integrated with MOV upload system.
 *
 * Features:
 * - Drag-and-drop file upload
 * - File validation (type, size)
 * - File list display with actions
 * - Delete functionality with confirmation
 * - Automatic refetch after operations
 *
 * Integrated in Epic 4.0: MOV Upload System
 */
export function FileFieldComponent({
  field,
  assessmentId,
  indicatorId,
  disabled = false,
  movAnnotations = [],
}: FileFieldComponentProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Ref to track progress interval for cleanup on unmount
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  // Get current user from auth store
  const { user } = useAuthStore();

  // Get global upload queue
  const { addToQueue, completeCurrentUpload, currentUpload, queue } = useUploadStore();

  // Get query client for invalidating queries
  const queryClient = useQueryClient();

  // Fetch assessment details to check status
  const { data: assessmentData } = useGetAssessmentsMyAssessment({
    query: {
      enabled: !!assessmentId,
      gcTime: 0, // Don't cache - always fresh
      staleTime: 0,
    } as any,
  } as any);

  // Fetch uploaded files for this indicator
  const { data: filesResponse, isLoading: isLoadingFiles } =
    useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles(assessmentId, indicatorId, {
      query: {
        enabled: !!assessmentId && !!indicatorId,
        staleTime: 10 * 1000, // 10 seconds - short for quick invalidation after uploads
        refetchOnWindowFocus: true, // Refresh when user returns to tab
      } as any,
    } as any);

  // Normalize status for case-insensitive comparison
  const normalizedStatus = ((assessmentData as any)?.assessment?.status || "").toUpperCase();

  // Upload mutation with optimistic updates for instant UI feedback
  const uploadMutation = usePostMovsAssessmentsAssessmentIdIndicatorsIndicatorIdUpload({
    mutation: {
      onMutate: async (variables) => {
        // Start progress simulation
        setUploadProgress(0);
        setShowSuccess(false);
        setUploadError(null);

        // Clear any existing interval before creating a new one
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }

        // Simulate progress (since we don't have real upload progress from the API)
        // Store in ref for cleanup on unmount
        progressIntervalRef.current = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
              }
              return 90; // Stop at 90% until success
            }
            return prev + 10;
          });
        }, 200);

        // OPTIMISTIC UPDATE: Cancel any outgoing refetches to prevent overwriting
        await queryClient.cancelQueries({
          queryKey: getGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFilesQueryKey(
            assessmentId,
            indicatorId
          ),
        });

        // Snapshot current files data for potential rollback
        const previousFiles = queryClient.getQueryData(
          getGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFilesQueryKey(
            assessmentId,
            indicatorId
          )
        );

        // Optimistically add the new file to the list with all required fields
        const file = variables.data.file as File;
        const optimisticFile: MOVFileResponse = {
          id: Date.now(), // Temporary ID - will be replaced by server response
          assessment_id: assessmentId,
          indicator_id: indicatorId,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type || "application/octet-stream", // Fallback for unknown types
          field_id: variables.data.field_id ?? null,
          uploaded_at: new Date().toISOString(),
          file_url: "", // Will be set by server
          uploaded_by: user?.id ?? 0,
        };

        queryClient.setQueryData(
          getGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFilesQueryKey(
            assessmentId,
            indicatorId
          ),
          (old: any) => ({
            ...old,
            files: [...(old?.files || []), optimisticFile],
          })
        );

        return { previousFiles };
      },
      onSuccess: (data, variables, context: any) => {
        // Complete progress
        setUploadProgress(100);
        setShowSuccess(true);

        // Clear the progress interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }

        toast.success("File uploaded successfully");

        // IMMEDIATE: Invalidate queries - refetchType: 'active' triggers refetch automatically
        // No need for separate refetchQueries calls
        queryClient.invalidateQueries({
          queryKey: getGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFilesQueryKey(
            assessmentId,
            indicatorId
          ),
          refetchType: "active",
        });

        queryClient.invalidateQueries({
          queryKey: getGetAssessmentsMyAssessmentQueryKey(),
          refetchType: "active",
        });

        queryClient.invalidateQueries({
          queryKey: getGetBlguDashboardAssessmentIdQueryKey(assessmentId),
          refetchType: "active",
        });

        // Optimistically mark this indicator as completed in cached assessment data
        // CRITICAL: Update BOTH flat responses array AND nested governance_areas structure
        queryClient.setQueryData(getGetAssessmentsMyAssessmentQueryKey(), (old: any) => {
          if (!old) return old;
          const updated = { ...old };

          // Update flat responses array if it exists
          if (updated.assessment?.responses) {
            updated.assessment = { ...updated.assessment };
            updated.assessment.responses = updated.assessment.responses.map((resp: any) => {
              if (resp.indicator_id === indicatorId) {
                return { ...resp, is_completed: true, requires_rework: false };
              }
              return resp;
            });
          }

          // Update nested governance_areas structure (this is what TreeNavigator uses)
          if (updated.governance_areas) {
            updated.governance_areas = updated.governance_areas.map((area: any) => ({
              ...area,
              indicators:
                area.indicators?.map((ind: any) => {
                  if (ind.id === indicatorId || ind.response?.indicator_id === indicatorId) {
                    return {
                      ...ind,
                      response: ind.response
                        ? { ...ind.response, is_completed: true, requires_rework: false }
                        : { is_completed: true, requires_rework: false },
                    };
                  }
                  return ind;
                }) || [],
            }));
          }

          return updated;
        });

        // Reset UI state after a brief success display
        setTimeout(() => {
          setUploadError(null);
          setUploadProgress(0);
          setShowSuccess(false);
          setSelectedFile(null);

          // Tell global queue this upload is complete
          completeCurrentUpload();
        }, 1000);
      },
      onError: (error: any, variables, context: any) => {
        // Clear the progress interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }

        // ROLLBACK: Restore previous files data on error
        if (context?.previousFiles) {
          queryClient.setQueryData(
            getGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFilesQueryKey(
              assessmentId,
              indicatorId
            ),
            context.previousFiles
          );
        }

        const errorInfo = classifyError(error);
        const displayMessage = `${errorInfo.title}: ${errorInfo.message}`;

        setUploadError(displayMessage);
        setUploadProgress(0);
        setSelectedFile(null);
        toast.error(displayMessage);

        // Tell global queue this upload failed, move to next
        completeCurrentUpload();
      },
    },
  });

  const handleFileSelect = (file: File) => {
    // Add to global upload queue
    addToQueue({
      file,
      fieldId: field.field_id,
      assessmentId,
      indicatorId,
      onUpload: (fileToUpload) => {
        // This will be called when it's this file's turn to upload
        setSelectedFile(fileToUpload);
        setUploadError(null);

        uploadMutation.mutate({
          assessmentId,
          indicatorId,
          data: { file: fileToUpload, field_id: field.field_id, field_label: field.label },
        });
      },
    });
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  const handleDeleteSuccess = () => {
    // Invalidate queries to trigger refetch - consistent with upload success pattern
    queryClient.invalidateQueries({
      queryKey: getGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFilesQueryKey(
        assessmentId,
        indicatorId
      ),
      refetchType: "active",
    });
  };

  // State for preview modal (same as assessor view)
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<MOVFileResponse | null>(
    null
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreview = (file: MOVFileResponse) => {
    setSelectedFileForPreview(file);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setSelectedFileForPreview(null);
  };

  const handleDownload = async (file: MOVFileResponse) => {
    try {
      // First fetch a signed URL for secure access
      const signedUrlResponse = await fetch(`/api/v1/movs/files/${file.id}/signed-url`, {
        credentials: "include",
      });
      if (!signedUrlResponse.ok) {
        throw new Error("Failed to get download URL");
      }
      const { signed_url } = await signedUrlResponse.json();

      // Then fetch the file using the signed URL
      const response = await fetch(signed_url);
      const blob = await response.blob();

      // Create a blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);

      toast.success("File downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      const errorInfo = classifyError(error);
      toast.error(`${errorInfo.title}: ${errorInfo.message}`);
    }
  };

  // Filter files by field_id to show only files uploaded to this specific field
  const allFiles = filesResponse?.files || [];

  // Get rework timestamp from assessment data
  // For MLGOO RE-calibration, use mlgoo_recalibration_requested_at instead
  const reworkRequestedAt = (assessmentData as any)?.assessment?.rework_requested_at;
  const isMlgooRecalibration = (assessmentData as any)?.assessment?.is_mlgoo_recalibration === true;
  const mlgooRecalibrationRequestedAt = (assessmentData as any)?.assessment
    ?.mlgoo_recalibration_requested_at;

  // Use MLGOO recalibration timestamp if it's an MLGOO recalibration, otherwise use regular rework timestamp
  const effectiveReworkTimestamp =
    isMlgooRecalibration && mlgooRecalibrationRequestedAt
      ? mlgooRecalibrationRequestedAt
      : reworkRequestedAt;

  // Separate files based on rework timestamp
  const activeFiles = allFiles.filter((f: any) => f.field_id === field.field_id && !f.deleted_at);
  const deletedFiles = allFiles.filter((f: any) => f.field_id === field.field_id && f.deleted_at);

  // During REWORK status, separate old files from new files
  const isReworkStatus = normalizedStatus === "REWORK" || normalizedStatus === "NEEDS_REWORK";

  let previousFiles: any[] = [];
  let newFiles: any[] = [];

  if (isReworkStatus && effectiveReworkTimestamp) {
    const reworkDate = new Date(effectiveReworkTimestamp);

    console.log("[FileFieldComponent] Rework filtering debug:", {
      field_id: field.field_id,
      reworkRequestedAt,
      reworkDate: reworkDate.toISOString(),
      reworkDateTime: reworkDate.getTime(),
      activeFilesCount: activeFiles.length,
      activeFiles: activeFiles.map((f: any) => {
        const uploadDate = new Date(f.uploaded_at);
        return {
          id: f.id,
          name: f.file_name,
          uploaded_at: f.uploaded_at,
          uploadDate: uploadDate.toISOString(),
          uploadDateTime: uploadDate.getTime(),
          timeDiff: uploadDate.getTime() - reworkDate.getTime(),
          isAfterRework: uploadDate >= reworkDate,
          comparison: `${uploadDate.getTime()} >= ${reworkDate.getTime()}`,
        };
      }),
    });

    // Files uploaded BEFORE rework was requested are "old" (from before rework)
    const oldFiles = activeFiles.filter((f: any) => {
      const uploadDate = new Date(f.uploaded_at);
      return uploadDate < reworkDate;
    });

    // Files uploaded AFTER rework was requested are "new" (during rework)
    const recentFiles = activeFiles.filter((f: any) => {
      const uploadDate = new Date(f.uploaded_at);
      return uploadDate >= reworkDate;
    });

    console.log("[FileFieldComponent] Filtered results:", {
      field_id: field.field_id,
      oldFilesCount: oldFiles.length,
      recentFilesCount: recentFiles.length,
    });

    previousFiles = [...deletedFiles, ...oldFiles];
    newFiles = recentFiles;
  } else {
    // Not in rework status, show all active files as new
    newFiles = activeFiles;
  }

  const showPreviousFilesAsReference = isReworkStatus && previousFiles.length > 0;

  // Only show new files in the main upload section during rework
  const files = newFiles;

  // Permission checks
  const isBLGU = user?.role === "BLGU_USER";
  const isAssessorOrValidator =
    user?.role === "ASSESSOR" || user?.role === "VALIDATOR" || user?.role === "MLGOO_DILG";

  // Can upload: Only BLGU users, only for DRAFT or REWORK/NEEDS_REWORK status, and not disabled
  const canUpload =
    !disabled &&
    isBLGU &&
    (normalizedStatus === "DRAFT" ||
      normalizedStatus === "REWORK" ||
      normalizedStatus === "NEEDS_REWORK");

  // Can delete: Only BLGU users, only for DRAFT or REWORK/NEEDS_REWORK status, and not disabled
  const canDelete =
    !disabled &&
    isBLGU &&
    (normalizedStatus === "DRAFT" ||
      normalizedStatus === "REWORK" ||
      normalizedStatus === "NEEDS_REWORK");

  // Reason why upload is disabled
  const uploadDisabledReason = !canUpload
    ? normalizedStatus === "SUBMITTED_FOR_REVIEW" ||
      normalizedStatus === "VALIDATED" ||
      normalizedStatus === "SUBMITTED" ||
      normalizedStatus === "COMPLETED"
      ? "File uploads are disabled for submitted or validated assessments"
      : !isBLGU
        ? "Only BLGU users can upload files"
        : null
    : null;

  // Count annotations for this field
  const fieldAnnotations = movAnnotations.filter((ann: any) =>
    files.some((f) => f.id === ann.mov_file_id)
  );
  const hasAnnotations = fieldAnnotations.length > 0;

  return (
    <div className="space-y-4">
      {/* Field Label and Help Text */}
      <div className="space-y-1">
        <Label
          htmlFor={`file-upload-${field.field_id}`}
          className="text-sm font-medium text-[var(--text-primary)]"
        >
          {field.label}
          {field.required && (
            <span className="text-red-500 ml-1" aria-hidden="true">
              *
            </span>
          )}
          {field.required && <span className="sr-only">(required)</span>}
        </Label>

        {field.help_text && (
          <p
            id={`file-help-${field.field_id}`}
            className="text-sm text-[var(--text-secondary)] whitespace-pre-line"
          >
            {field.help_text}
          </p>
        )}
      </div>

      {/* Field-level Notes (shown between label and upload area) */}
      {(field as any).field_notes && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                {(field as any).field_notes.title}
              </p>
              <ul className="space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
                {(field as any).field_notes.items?.map((item: any, index: number) => (
                  <li key={index} className="flex gap-2">
                    {item.label && <span className="font-medium flex-shrink-0">{item.label}</span>}
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Rework Alert (show if there are annotations on uploaded files) */}
      {hasAnnotations && (normalizedStatus === "REWORK" || normalizedStatus === "NEEDS_REWORK") && (
        <Alert
          className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30"
          role="alert"
        >
          <AlertCircle
            className="h-4 w-4 text-orange-600 dark:text-orange-400"
            aria-hidden="true"
          />
          <AlertDescription className="text-orange-900 dark:text-orange-200">
            <p className="font-medium mb-1">Assessor feedback on your files</p>
            <p className="text-sm dark:text-orange-300">
              The assessor has left {fieldAnnotations.length} comment
              {fieldAnnotations.length !== 1 ? "s" : ""} on your uploaded files. Please review the
              feedback by clicking the eye icon on each file. You can upload new corrected files and
              delete old ones as needed.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Instructions (show what documents are needed) */}
      {(field as any).instructions && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 rounded-md">
          <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">
            Required Documents:
          </h4>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {(field as any).instructions}
          </div>
        </div>
      )}

      {/* Permission Info (show if upload is disabled) */}
      {uploadDisabledReason && (
        <Alert
          className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
          role="status"
        >
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <AlertDescription className="text-blue-900 dark:text-blue-200">
            {uploadDisabledReason}
          </AlertDescription>
        </Alert>
      )}

      {/* File Upload Component (only show if user can upload) */}
      {canUpload && (
        <div className="mb-4">
          <FileUpload
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            selectedFile={selectedFile}
            disabled={uploadMutation.isPending}
            error={uploadError}
          />
        </div>
      )}

      {/* Queue Status (show when files are queued) */}
      {(currentUpload || queue.length > 0) && currentUpload?.fieldId === field.field_id && (
        <Alert
          className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
          role="status"
          aria-live="polite"
        >
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <AlertDescription className="text-blue-900 dark:text-blue-200">
            {uploadMutation.isPending ? `Uploading...` : `${queue.length} file(s) in global queue`}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Progress Indicator */}
      {uploadMutation.isPending && (
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Uploading {selectedFile?.name}...</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{uploadProgress}% complete</p>
        </div>
      )}

      {/* Success Indicator */}
      {showSuccess && (
        <Alert
          className="border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-950/30"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            File uploaded successfully! The file will appear in the list below.
          </AlertDescription>
        </Alert>
      )}

      {/* Uploaded Files List (New files during rework, or all files in other statuses) */}
      {files.length > 0 && (
        <section className="space-y-4 mt-6" aria-labelledby={`uploaded-files-${field.field_id}`}>
          <h4
            id={`uploaded-files-${field.field_id}`}
            className="flex items-center gap-2 text-sm font-medium mb-3"
          >
            {isReworkStatus && (
              <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
            )}
            <span className={isReworkStatus ? "text-green-600" : ""}>Uploaded Files</span>
            <span className="text-muted-foreground font-normal">
              ({files.length} file{files.length !== 1 ? "s" : ""} uploaded)
            </span>
          </h4>
          <FileListWithDelete
            files={files}
            onPreview={handlePreview}
            onDownload={handleDownload}
            canDelete={canDelete}
            loading={isLoadingFiles}
            onDeleteSuccess={handleDeleteSuccess}
            movAnnotations={movAnnotations}
            hideHeader={true}
            assessmentId={assessmentId}
            indicatorId={indicatorId}
            requiredFileCount={field.required ? 1 : 0}
          />
        </section>
      )}

      {/* Previous Files (Old files from before rework + deleted files - shown as reference during rework) */}
      {showPreviousFilesAsReference && previousFiles.length > 0 && (
        <section className="space-y-2" aria-labelledby={`previous-files-${field.field_id}`}>
          <h4
            id={`previous-files-${field.field_id}`}
            className="flex items-center gap-2 text-sm text-orange-600 font-medium"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span>Previous Files</span>
          </h4>
          <div className="border-2 border-orange-200 dark:border-orange-800 rounded-md bg-orange-50/30 dark:bg-orange-950/20 p-3">
            <FileList
              files={previousFiles}
              onPreview={handlePreview}
              onDownload={handleDownload}
              canDelete={false}
              loading={isLoadingFiles}
              emptyMessage=""
              movAnnotations={movAnnotations}
              hideHeader={true}
            />
            <p className="text-xs text-orange-600 mt-2 italic">
              These are files from your previous submission. They are shown here so you can review
              the assessor's feedback.
            </p>
          </div>
        </section>
      )}

      {/* Show message if delete is disabled for submitted/validated assessments */}
      {files.length > 0 &&
        !canDelete &&
        isBLGU &&
        (normalizedStatus === "SUBMITTED_FOR_REVIEW" ||
          normalizedStatus === "VALIDATED" ||
          normalizedStatus === "SUBMITTED" ||
          normalizedStatus === "COMPLETED") && (
          <Alert
            className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
            role="status"
          >
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <AlertDescription className="text-blue-900 dark:text-blue-200">
              Files cannot be deleted after assessment submission. If you need to modify files,
              request the assessment to be sent back for rework.
            </AlertDescription>
          </Alert>
        )}

      {/* File Preview Modal (same as assessor view) */}
      {isPreviewOpen && selectedFileForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[var(--card)] rounded-lg shadow-xl w-[70vw] h-[90vh] flex flex-row gap-4 p-4">
            {/* Left: File Viewer */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-3">
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-[var(--foreground)]">
                    {selectedFileForPreview.file_name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedFileForPreview.file_type === "application/pdf"
                      ? "PDF preview with assessor comments"
                      : "Image preview with assessor comments"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={closePreview} className="shrink-0">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* File Content - Uses SecureFilePreview for secure access */}
              <div className="flex-1" style={{ minHeight: 0 }}>
                <SecureFilePreview file={selectedFileForPreview} annotations={movAnnotations} />
              </div>
            </div>

            {/* Right: Comments Sidebar */}
            {(selectedFileForPreview.file_type === "application/pdf" ||
              selectedFileForPreview.file_type?.startsWith("image/")) && (
              <div className="w-80 flex flex-col border-l border-gray-200 dark:border-gray-700 pl-4">
                <h3 className="font-semibold text-sm mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 text-[var(--foreground)]">
                  Assessor Comments (
                  {
                    movAnnotations.filter(
                      (ann: any) => ann.mov_file_id === selectedFileForPreview.id
                    ).length
                  }
                  )
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3">
                  {movAnnotations.filter(
                    (ann: any) => ann.mov_file_id === selectedFileForPreview.id
                  ).length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No comments from assessor yet.
                    </div>
                  ) : (
                    movAnnotations
                      .filter((ann: any) => ann.mov_file_id === selectedFileForPreview.id)
                      .map((ann: any, idx: number) => (
                        <div
                          key={ann.id}
                          className="p-3 rounded-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <span className="shrink-0 font-bold text-yellow-600 dark:text-yellow-400 text-sm">
                              #{idx + 1}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-2">
                            {ann.comment || "(No comment)"}
                          </p>
                          {ann.page_number !== undefined && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Page {ann.page_number + 1}
                            </p>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
