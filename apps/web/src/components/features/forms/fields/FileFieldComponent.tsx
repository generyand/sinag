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
  MOVFileResponse,
  getGetAssessmentsMyAssessmentQueryKey,
  getGetBlguDashboardAssessmentIdQueryKey,
  getGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFilesQueryKey,
  getGetMovsFilesFileIdSignedUrlQueryKey,
  useGetAssessmentsMyAssessment,
  useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles,
  useGetMovsFilesFileIdSignedUrl,
  usePostMovsAssessmentsAssessmentIdIndicatorsIndicatorIdUpload,
} from "@sinag/shared";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileIcon, Info, Loader2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
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
  } = useGetMovsFilesFileIdSignedUrl(parseInt(String(file.id), 10), {
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
    // Check if error is a 404 (file not found in storage)
    const errorMessage = error instanceof Error ? error.message : "";
    const is404 =
      errorMessage.includes("404") ||
      errorMessage.toLowerCase().includes("not found") ||
      (error as any)?.response?.status === 404;

    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <FileIcon className="h-16 w-16 text-red-300 mb-4" />
        <p className="text-sm text-red-600 mb-2">Failed to load file</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {is404
            ? "This file is no longer available in storage. It may have been deleted. Please re-upload the file."
            : error instanceof Error
              ? error.message
              : "Unable to generate secure URL"}
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
  reworkComments?: any[]; // Epic 5.0: Added for Hybrid Logic
  updateAssessmentData?: (updater: (data: any) => any) => void; // For immediate UI updates
  /** MOV file IDs flagged by MLGOO for recalibration - these need to be re-uploaded */
  mlgooFlaggedFileIds?: Array<{ mov_file_id: number; comment?: string | null }>;
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
  reworkComments = [],
  updateAssessmentData,
  mlgooFlaggedFileIds = [],
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
  // Use reasonable cache times - invalidation handles updates after mutations
  const { data: assessmentData } = useGetAssessmentsMyAssessment({
    query: {
      enabled: !!assessmentId,
      staleTime: 30 * 1000, // 30 seconds - consistent with useAssessment.ts
      gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
      refetchOnWindowFocus: true,
    } as any,
  } as any);

  // Fetch uploaded files for this indicator
  // IMPORTANT: Use longer cache times to prevent files from "disappearing" on navigation
  // Files will still update via invalidation after uploads/deletes
  const { data: filesResponse, isLoading: isLoadingFiles } =
    useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles(assessmentId, indicatorId, {
      query: {
        enabled: !!assessmentId && !!indicatorId,
        staleTime: 5 * 60 * 1000, // 5 minutes - longer to prevent disappearing files on navigation
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache even when unmounted
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

        // STEP 1: Do optimistic update FIRST for instant UI feedback
        // This must happen BEFORE invalidation to prevent race conditions
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

          // Recursive helper to update indicator in nested tree structure
          // This handles both top-level indicators AND children (e.g., 2.2.3 under 2.2)
          const updateIndicatorInTree = (indicators: any[]): any[] => {
            if (!indicators) return indicators;
            return indicators.map((ind: any) => {
              // Check if this is the target indicator (compare both number and string forms)
              const isTarget =
                ind.id === indicatorId ||
                ind.id === String(indicatorId) ||
                ind.response?.indicator_id === indicatorId;

              if (isTarget) {
                return {
                  ...ind,
                  response: ind.response
                    ? { ...ind.response, is_completed: true, requires_rework: false }
                    : { is_completed: true, requires_rework: false, indicator_id: indicatorId },
                };
              }

              // Recursively check children
              if (ind.children && ind.children.length > 0) {
                return {
                  ...ind,
                  children: updateIndicatorInTree(ind.children),
                };
              }

              return ind;
            });
          };

          // Update nested governance_areas structure (this is what TreeNavigator uses)
          if (updated.governance_areas) {
            updated.governance_areas = updated.governance_areas.map((area: any) => ({
              ...area,
              indicators: updateIndicatorInTree(area.indicators || []),
            }));
          }

          return updated;
        });

        // STEP 2: Update files query cache with the server response
        // This ensures DynamicFormRenderer's completionValidFiles sees the new file immediately
        // We update the cache instead of just invalidating to prevent the optimistic file from disappearing
        const uploadedFile = variables.data.file as File;
        const nowTimestamp = new Date().toISOString();
        const serverFile: MOVFileResponse = {
          id: data?.id || Date.now(),
          assessment_id: assessmentId,
          indicator_id: indicatorId,
          file_name: data?.file_name || uploadedFile.name,
          file_size: data?.file_size || uploadedFile.size,
          file_type: data?.file_type || uploadedFile.type || "application/octet-stream",
          field_id: variables.data.field_id ?? null,
          uploaded_at: data?.uploaded_at || nowTimestamp,
          file_url: data?.file_url || "",
          uploaded_by: data?.uploaded_by || user?.id || 0,
        };

        queryClient.setQueryData(
          getGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFilesQueryKey(
            assessmentId,
            indicatorId
          ),
          (old: any) => {
            if (!old) {
              return { files: [serverFile] };
            }
            // Keep all existing files EXCEPT the temp optimistic file we added in onMutate
            // Temp files have IDs >= 1000000000000 (Date.now() timestamp)
            const existingFiles = (old.files || []).filter((f: any) => {
              const isOptimisticTempFile = f.id >= 1000000000000;
              const isSameFileName = f.file_name === uploadedFile.name;
              // Remove the optimistic temp file for the same filename
              return !(isOptimisticTempFile && isSameFileName);
            });
            return {
              ...old,
              files: [...existingFiles, serverFile],
            };
          }
        );

        queryClient.invalidateQueries({
          queryKey: getGetAssessmentsMyAssessmentQueryKey(),
          refetchType: "active",
        });

        queryClient.invalidateQueries({
          queryKey: getGetBlguDashboardAssessmentIdQueryKey(assessmentId),
          refetchType: "active",
        });

        // STEP 3: Update local assessment state for immediate tree navigation update
        // This includes BOTH the status AND the movFiles array for progress calculation
        if (updateAssessmentData) {
          // Reuse serverFile as the new MOV file entry (already created above in STEP 2)
          const newMovFile = {
            id: serverFile.id,
            file_name: serverFile.file_name,
            file_size: serverFile.file_size,
            file_type: serverFile.file_type,
            field_id: serverFile.field_id,
            uploaded_at: serverFile.uploaded_at,
            file_url: serverFile.file_url,
          };

          updateAssessmentData((prev) => {
            if (!prev || !prev.governanceAreas) return prev;

            // Helper to update indicator status AND movFiles in the tree
            const updateIndicatorStatus = (indicators: any[]): any[] => {
              if (!indicators) return indicators;
              return indicators.map((ind: any) => {
                // Check if this is the target indicator
                if (String(ind.id) === String(indicatorId)) {
                  // Add new file to existing movFiles array
                  const existingMovFiles = ind.movFiles || [];
                  return {
                    ...ind,
                    status: "completed",
                    // CRITICAL: Clear requiresRework when marking as complete
                    // This ensures the merge logic in useAssessment preserves this status
                    requiresRework: false,
                    // Add the new file to movFiles for progress calculation
                    movFiles: [...existingMovFiles, newMovFile],
                  };
                }
                // Recursively check children
                if (ind.children && ind.children.length > 0) {
                  return {
                    ...ind,
                    children: updateIndicatorStatus(ind.children),
                  };
                }
                return ind;
              });
            };

            return {
              ...prev,
              governanceAreas: prev.governanceAreas.map((area: any) => ({
                ...area,
                indicators: updateIndicatorStatus(area.indicators || []),
              })),
            };
          });
        }

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
  // Priority: MLGOO recalibration > Validator calibration > Assessor rework
  const reworkRequestedAt = (assessmentData as any)?.assessment?.rework_requested_at;
  const calibrationRequestedAt = (assessmentData as any)?.assessment?.calibration_requested_at;
  const isMlgooRecalibration = (assessmentData as any)?.assessment?.is_mlgoo_recalibration === true;
  const mlgooRecalibrationRequestedAt = (assessmentData as any)?.assessment
    ?.mlgoo_recalibration_requested_at;

  // Use the most recent applicable timestamp for file separation
  const effectiveReworkTimestamp =
    isMlgooRecalibration && mlgooRecalibrationRequestedAt
      ? mlgooRecalibrationRequestedAt
      : calibrationRequestedAt || reworkRequestedAt;

  // Check if THIS specific indicator requires rework (flagged for calibration)
  // Data structure: governance_areas[].indicators[] with nested children[]
  // Each indicator has .response.requires_rework
  const findIndicatorRequiresRework = (): boolean => {
    const areas = (assessmentData as any)?.governance_areas || [];
    for (const area of areas) {
      const indicators = area.indicators || [];
      for (const ind of indicators) {
        // Check parent indicator
        if (ind.id === indicatorId) {
          return ind.response?.requires_rework === true;
        }
        // Check children (level 3 indicators)
        const children = ind.children || [];
        for (const child of children) {
          if (child.id === indicatorId) {
            return child.response?.requires_rework === true;
          }
        }
      }
    }
    return false;
  };
  const indicatorRequiresRework = findIndicatorRequiresRework();

  // Separate files based on rework timestamp
  const activeFiles = allFiles.filter((f: any) => f.field_id === field.field_id && !f.deleted_at);
  const deletedFiles = allFiles.filter((f: any) => f.field_id === field.field_id && f.deleted_at);

  // During REWORK status, separate old files from new files
  const isReworkStatus = normalizedStatus === "REWORK" || normalizedStatus === "NEEDS_REWORK";

  // Get MLGOO flagged file IDs for this field
  // Use props if available, otherwise fall back to assessment data
  const effectiveMlgooFlaggedFileIds = mlgooFlaggedFileIds?.length > 0
    ? mlgooFlaggedFileIds
    : (assessmentData as any)?.assessment?.mlgoo_recalibration_mov_file_ids || [];

  const mlgooFlaggedFileIdsSet = new Set(
    (effectiveMlgooFlaggedFileIds || []).map((item: any) => String(item.mov_file_id))
  );
  const hasMlgooFlaggedFiles = mlgooFlaggedFileIdsSet.size > 0;

  let previousFiles: any[] = [];
  let newFiles: any[] = [];
  let validOldFiles: any[] = [];

  if (isReworkStatus && effectiveReworkTimestamp) {
    const reworkDate = new Date(effectiveReworkTimestamp);

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

    // Check if this is a calibration rework (validator-initiated)
    // For calibration, we use ONLY the calibration timestamp to determine old vs new files
    // Assessor annotations from previous rework cycle should NOT affect calibration file separation
    const isCalibrationRework =
      !!calibrationRequestedAt && effectiveReworkTimestamp === calibrationRequestedAt;

    // Filter old files based on rework type:
    let invalidOldFiles: any[] = [];

    if (isMlgooRecalibration && hasMlgooFlaggedFiles) {
      // MLGOO RECALIBRATION MODE: MLGOO flagged specific MOV files
      // Files flagged by MLGOO should go to previousFiles (need re-upload)
      // Files NOT flagged by MLGOO are still valid

      // Separate files into flagged (by MLGOO) and non-flagged
      const flaggedFiles = oldFiles.filter((f: any) => mlgooFlaggedFileIdsSet.has(String(f.id)));
      const nonFlaggedFiles = oldFiles.filter((f: any) => !mlgooFlaggedFileIdsSet.has(String(f.id)));

      // Check if BLGU has uploaded replacement files (files uploaded after recalibration request)
      // These replacement files should NOT be flagged files
      const replacementFiles = recentFiles.filter((f: any) => !mlgooFlaggedFileIdsSet.has(String(f.id)));

      if (replacementFiles.length > 0) {
        // BLGU has uploaded replacement files
        // Flagged files go to previous (for reference)
        // Non-flagged old files + recent files are valid
        invalidOldFiles = flaggedFiles;
        validOldFiles = nonFlaggedFiles;
      } else {
        // No replacements yet - flagged files need to be re-uploaded
        invalidOldFiles = flaggedFiles;
        validOldFiles = nonFlaggedFiles;
      }
    } else if (isCalibrationRework) {
      // CALIBRATION MODE: Handle both calibration flags and assessor rework history
      //
      // Key insight: If there are files WITH annotations (rejected) AND files WITHOUT annotations
      // (replacements), the non-annotated files are the valid current files.
      // We identify replacements by checking if a file has NO annotations pointing to it.

      const hasAnnotations = movAnnotations && movAnnotations.length > 0;

      // Get file IDs that have annotations (these are the rejected files)
      const rejectedFileIds = new Set(
        (movAnnotations || []).map((ann: any) => String(ann.mov_file_id))
      );

      // Separate files into rejected (has annotations) and valid (no annotations)
      const rejectedFiles = oldFiles.filter((f: any) => rejectedFileIds.has(String(f.id)));
      const nonRejectedFiles = oldFiles.filter((f: any) => !rejectedFileIds.has(String(f.id)));

      if (hasAnnotations && nonRejectedFiles.length > 0) {
        // There are rejected files AND replacement files exist
        // The non-rejected files are the replacements - show them as valid
        // Hide the rejected files (they've been replaced)
        validOldFiles = nonRejectedFiles;
        invalidOldFiles = []; // Don't show rejected files - they have replacements
      } else if (hasAnnotations && nonRejectedFiles.length === 0 && indicatorRequiresRework) {
        // All files have annotations (rejected) and no replacements yet
        // Show them as "Previous Files" needing re-upload
        invalidOldFiles = oldFiles;
        validOldFiles = [];
      } else if (indicatorRequiresRework && !hasAnnotations) {
        // Indicator flagged but no specific file annotations
        // This is a general rework flag - show all old files as needing attention
        invalidOldFiles = oldFiles;
        validOldFiles = [];
      } else {
        // No flag or no annotations - all files valid
        invalidOldFiles = [];
        validOldFiles = oldFiles;
      }
    } else if (recentFiles.length > 0) {
      // ASSESSOR REWORK MODE with replacements uploaded:
      // BLGU has already uploaded replacement files
      const hasSpecificAnnotations = movAnnotations && movAnnotations.length > 0;
      const hasGeneralComments = reworkComments && reworkComments.length > 0;

      if (hasSpecificAnnotations) {
        // Files WITH annotations were rejected - keep in Previous Files for reference
        // Files WITHOUT annotations were accepted - show them as valid
        invalidOldFiles = oldFiles.filter((f: any) =>
          movAnnotations.some((ann: any) => String(ann.mov_file_id) === String(f.id))
        );
        validOldFiles = oldFiles.filter(
          (f: any) => !movAnnotations.some((ann: any) => String(ann.mov_file_id) === String(f.id))
        );
      } else if (hasGeneralComments || indicatorRequiresRework) {
        // Indicator flagged but no specific annotations - old files were replaced
        // Keep them in "Previous Files" for reference
        invalidOldFiles = oldFiles;
        validOldFiles = [];
      } else {
        // No flag, no annotations - all old files are valid
        invalidOldFiles = [];
        validOldFiles = oldFiles;
      }
    } else {
      // ASSESSOR REWORK MODE: Use hybrid logic with annotations
      const hasIndicatorAnnotations = movAnnotations && movAnnotations.length > 0;
      const hasGeneralComments = reworkComments && reworkComments.length > 0;

      // Check if THIS field has any files with annotations
      const thisFieldHasAnnotatedFiles =
        hasIndicatorAnnotations &&
        oldFiles.some((f: any) =>
          movAnnotations.some((ann: any) => String(ann.mov_file_id) === String(f.id))
        );

      if (hasIndicatorAnnotations) {
        // Case 1: Granular Mode (Annotations exist somewhere in indicator)
        // Only mark THIS field's files as invalid if they have annotations
        // Files in OTHER fields (without annotations) remain VALID
        invalidOldFiles = oldFiles.filter((f: any) =>
          movAnnotations.some((ann: any) => String(ann.mov_file_id) === String(f.id))
        );
        validOldFiles = oldFiles.filter(
          (f: any) => !movAnnotations.some((ann: any) => String(ann.mov_file_id) === String(f.id))
        );
      } else if (hasGeneralComments) {
        // Case 2: Comment-only Mode (General comments without file annotations)
        // ALL old files are invalid - assessor gave general feedback requiring re-upload
        invalidOldFiles = oldFiles;
        validOldFiles = [];
      } else if (indicatorRequiresRework) {
        // Case 3: Manual Flag Mode (Indicator flagged without annotations or comments)
        // This happens when assessor uses "Flag for Rework" toggle without specific feedback
        // ALL old files are invalid - BLGU must re-upload
        invalidOldFiles = oldFiles;
        validOldFiles = [];
      } else {
        // Case 4: No Feedback -> All valid
        invalidOldFiles = [];
        validOldFiles = oldFiles;
      }
    }

    previousFiles = [...deletedFiles, ...invalidOldFiles];
    // Keep new uploads separate from valid old files
    newFiles = recentFiles; // Only files uploaded during this rework cycle
  } else {
    // Not in rework status, show all active files as new
    newFiles = activeFiles;
  }

  const showPreviousFilesAsReference = isReworkStatus && previousFiles.length > 0;

  // Valid old files that don't need re-upload (shown separately during rework)
  const existingValidFiles = isReworkStatus ? validOldFiles : [];
  const showExistingValidFiles = isReworkStatus && existingValidFiles.length > 0;

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

  // Count annotations for this field (include all file types)
  const allDisplayedFiles = [...files, ...existingValidFiles, ...previousFiles];
  const fieldAnnotations = movAnnotations.filter((ann: any) =>
    allDisplayedFiles.some((f) => f.id === ann.mov_file_id)
  );
  const hasAnnotations = fieldAnnotations.length > 0;

  return (
    <div className="space-y-4" id={`file-upload-${field.field_id}`}>
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
          <AlertDescription className="text-orange-900 dark:text-orange-200 space-y-3">
            <p className="font-semibold">Action Required: File Re-upload</p>

            {/* Step-by-step guidance */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded-md border border-orange-200 dark:border-orange-700">
              <p className="text-sm font-medium mb-2 text-orange-800 dark:text-orange-300">
                What you need to do:
              </p>
              <ol className="text-sm space-y-1.5 list-decimal list-inside text-orange-700 dark:text-orange-400">
                <li>Review the assessor&apos;s comments on the highlighted files below</li>
                <li>
                  Click &quot;Preview&quot; or &quot;View feedback&quot; to see annotations on the
                  documents
                </li>
                <li>Upload corrected versions of the flagged files only</li>
                <li>Files without comments are still valid — no need to re-upload them</li>
              </ol>
            </div>

            {/* Summary of files needing re-upload */}
            {previousFiles.filter((f: any) =>
              movAnnotations.some((ann: any) => String(ann.mov_file_id) === String(f.id))
            ).length > 0 && (
              <div className="text-sm">
                <p className="font-medium text-orange-800 dark:text-orange-300 mb-1">
                  Files needing correction (
                  {
                    previousFiles.filter((f: any) =>
                      movAnnotations.some((ann: any) => String(ann.mov_file_id) === String(f.id))
                    ).length
                  }{" "}
                  of {previousFiles.length + files.length}):
                </p>
                <ul className="space-y-1 pl-1">
                  {previousFiles
                    .filter((f: any) =>
                      movAnnotations.some((ann: any) => String(ann.mov_file_id) === String(f.id))
                    )
                    .map((file: any) => {
                      const fileAnns = movAnnotations.filter(
                        (ann: any) => String(ann.mov_file_id) === String(file.id)
                      );
                      return (
                        <li
                          key={file.id}
                          className="flex items-center gap-2 text-orange-700 dark:text-orange-400"
                        >
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="font-medium truncate max-w-[200px]">
                            {file.file_name}
                          </span>
                          <span className="text-orange-600 dark:text-orange-500">
                            — {fileAnns.length} comment{fileAnns.length !== 1 ? "s" : ""}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
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
            <span className={isReworkStatus ? "text-green-600" : ""}>
              {isReworkStatus ? "New Uploads" : "Uploaded Files"}
            </span>
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
            mlgooFlaggedFileIds={effectiveMlgooFlaggedFileIds}
          />
        </section>
      )}

      {/* Existing Valid Files (Old files that don't need re-upload - shown during rework) */}
      {showExistingValidFiles && existingValidFiles.length > 0 && (
        <section className="space-y-2" aria-labelledby={`existing-files-${field.field_id}`}>
          <h4
            id={`existing-files-${field.field_id}`}
            className="flex items-center gap-2 text-sm text-blue-600 font-medium"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Existing Files</span>
            <span className="text-muted-foreground font-normal">
              ({existingValidFiles.length} file{existingValidFiles.length !== 1 ? "s" : ""})
            </span>
          </h4>
          <div className="border-2 border-blue-200 dark:border-blue-800 rounded-md bg-blue-50/30 dark:bg-blue-950/20 p-3">
            <FileList
              files={existingValidFiles}
              onPreview={handlePreview}
              onDownload={handleDownload}
              canDelete={false}
              loading={isLoadingFiles}
              emptyMessage=""
              movAnnotations={movAnnotations}
              hideHeader={true}
              mlgooFlaggedFileIds={effectiveMlgooFlaggedFileIds}
            />
            <p className="text-xs text-blue-600 mt-2 italic">
              These files from your previous submission are still valid. No need to re-upload them.
            </p>
          </div>
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
              mlgooFlaggedFileIds={effectiveMlgooFlaggedFileIds}
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
                          key={ann.id || `ann-${idx}`}
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
