"use client";

import { FileList } from "@/components/features/movs/FileList";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMovAnnotations } from "@/hooks/useMovAnnotations";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import type { AssessmentDetailsResponse } from "@sinag/shared";
import { FileIcon, Loader2, X } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";

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

/**
 * Inner component that fetches signed URL and renders the appropriate file viewer.
 * Separated to allow conditional rendering with hooks.
 */
function SecureFileContent({
  file,
  annotationsLoading,
  pdfAnnotations,
  imageAnnotations,
  onAddAnnotation,
  onDeleteAnnotation,
}: {
  file: any;
  annotationsLoading: boolean;
  pdfAnnotations: any[];
  imageAnnotations: any[];
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
}

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
  /** Callback when a file is clicked for preview (for mobile tab switching) */
  onFileClick?: () => void;
}

type AnyRecord = Record<string, any>;

export function MiddleMovFilesPanel({
  assessment,
  expandedId,
  calibrationRequestedAt,
  reworkRequestedAt,
  separationLabel = "After Calibration",
  onAnnotationCreated,
  onAnnotationDeleted,
  onFileClick,
}: MiddleMovFilesPanelProps) {
  const data: AnyRecord = (assessment as unknown as AnyRecord) ?? {};
  const core = (data.assessment as AnyRecord) ?? data;
  const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];

  // Find the currently selected response
  const selectedResponse = responses.find((r) => r.id === expandedId);
  const indicator = (selectedResponse?.indicator as AnyRecord) ?? {};
  const indicatorName = indicator?.name || "Select an indicator";

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
        assessment_id: selectedResponse.assessment_id,
        indicator_id: selectedResponse.indicator_id,
        file_name: mov.original_filename || mov.filename || "Unknown file",
        file_url: mov.storage_path || "", // Storage path is the URL to the file
        file_type: mov.content_type || "application/octet-stream",
        file_size: mov.file_size || 0,
        uploaded_by: 0, // Not provided by backend
        uploaded_at: uploadedAt,
        deleted_at: null,
        field_id: mov.field_id || null,
        isNew, // Flag for visual separation in UI
        is_rejected: mov.is_rejected === true, // Flag for rejected files (validator view)
        has_annotations: mov.has_annotations === true, // Flag for files with annotations
      };
    });
  }, [selectedResponse, effectiveTimestamp]);

  // Separate files into:
  // - newFiles: Files uploaded AFTER rework/calibration (replacement files)
  // - acceptedOldFiles: Files uploaded BEFORE but were accepted (no annotations, didn't need re-upload)
  // - rejectedOldFiles: Files uploaded BEFORE and were rejected/replaced
  const { newFiles, acceptedOldFiles, rejectedOldFiles } = React.useMemo(() => {
    if (!effectiveTimestamp) {
      // No separation timestamp - all files are treated as accepted (normal view)
      return { newFiles: [], acceptedOldFiles: movFiles, rejectedOldFiles: [] };
    }

    const newUploads = movFiles.filter((f: any) => f.isNew);
    const oldUploads = movFiles.filter((f: any) => !f.isNew);

    // Check if any old files have explicit rejection flags
    const hasExplicitRejection = oldUploads.some(
      (f: any) => f.is_rejected === true || f.has_annotations === true
    );

    let rejected: any[] = [];
    let accepted: any[] = [];

    if (hasExplicitRejection) {
      // Use is_rejected or has_annotations flag to determine rejection
      rejected = oldUploads.filter(
        (f: any) => f.is_rejected === true || f.has_annotations === true
      );
      accepted = oldUploads.filter(
        (f: any) => f.is_rejected !== true && f.has_annotations !== true
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
  }, [movFiles, effectiveTimestamp]);

  // State for PDF annotation modal
  const [selectedFile, setSelectedFile] = React.useState<any | null>(null);
  const [isAnnotating, setIsAnnotating] = React.useState(false);

  // Use the annotations hook for the selected file
  const {
    annotations,
    isLoading: annotationsLoading,
    createAnnotation,
    deleteAnnotation,
  } = useMovAnnotations(selectedFile?.id || null);

  const handlePreview = (file: any) => {
    // Set selected file for preview (works for both PDF and images)
    setSelectedFile(file);
    setIsAnnotating(true);
    // Call onFileClick callback for mobile tab switching
    onFileClick?.();
  };

  const handleDownload = async (file: any) => {
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
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const closeAnnotationModal = () => {
    setIsAnnotating(false);
    setSelectedFile(null);
  };

  // Transform annotations from backend format to PdfAnnotator format
  const pdfAnnotations = React.useMemo(() => {
    return (
      (annotations as any[])?.map((ann: any) => ({
        id: String(ann.id),
        type: "pdfRect" as const,
        page: ann.page ?? ann.page_number ?? 0, // Backend returns 'page', not 'page_number'
        rect: ann.rect || { x: 0, y: 0, w: 10, h: 10 },
        rects: ann.rects,
        comment: ann.comment || "",
        createdAt: ann.created_at || new Date().toISOString(),
      })) || []
    );
  }, [annotations]);

  // Transform annotations for ImageAnnotator
  const imageAnnotations = React.useMemo(() => {
    return (
      (annotations as any[])?.map((ann: any) => ({
        id: String(ann.id),
        rect: ann.rect || { x: 0, y: 0, w: 10, h: 10 },
        comment: ann.comment || "",
        createdAt: ann.created_at || new Date().toISOString(),
      })) || []
    );
  }, [annotations]);

  const handleAddAnnotation = async (annotation: any) => {
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
  };

  // Wrapper for deleteAnnotation that calls the callback
  const handleDeleteAnnotation = async (annotationId: number) => {
    // Calculate remaining count BEFORE deletion (since annotations state is stale after mutation)
    const currentCount = annotations?.length ?? 0;
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
  };

  // Wrapper for PdfAnnotator's onDelete which passes string ID
  const handleDeleteAnnotationFromPdf = (annotationIdStr: string) => {
    const annotationId = parseInt(annotationIdStr, 10);
    if (!isNaN(annotationId)) {
      handleDeleteAnnotation(annotationId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="h-14 flex items-center px-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileIcon className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100 truncate">
              BLGU Uploaded Files
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
              {indicatorName}
            </p>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
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
          /* Calibration/Rework mode: Show ALL files but highlight new ones */
          /* Combine all files together - new files shown first with highlight, then old files */
          <div className="space-y-4">
            {/* New Files Section - Highlighted (uploaded after rework/calibration request) */}
            {newFiles.length > 0 && (
              <div className="rounded-sm border-2 border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                    New Files ({effectiveLabel})
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                    {newFiles.length} file{newFiles.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <FileList
                  files={newFiles}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  canDelete={false}
                  loading={false}
                  emptyMessage="No new files"
                  movAnnotations={annotations as any[]}
                />
              </div>
            )}

            {/* Existing Files Section - Files from before rework/calibration (accepted files that didn't need re-upload) */}
            {acceptedOldFiles.length > 0 && (
              <div className="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Existing Files
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                    {acceptedOldFiles.length} file{acceptedOldFiles.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <FileList
                  files={acceptedOldFiles}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  canDelete={false}
                  loading={false}
                  emptyMessage="No existing files"
                  movAnnotations={annotations as any[]}
                />
              </div>
            )}

            {/* Previous Files Section - Files that were replaced during rework/calibration (shown for reference) */}
            {rejectedOldFiles.length > 0 && (
              <div className="rounded-sm border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-3 opacity-75">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-red-500 dark:bg-red-400" />
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">
                    Previous Files
                  </span>
                  <span className="text-xs text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-full">
                    {rejectedOldFiles.length} file{rejectedOldFiles.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                  These files were flagged during review and have been replaced with new uploads.
                </p>
                <FileList
                  files={rejectedOldFiles}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  canDelete={false}
                  loading={false}
                  emptyMessage="No previous files"
                  movAnnotations={annotations as any[]}
                />
              </div>
            )}

            {/* No files at all */}
            {newFiles.length === 0 &&
              acceptedOldFiles.length === 0 &&
              rejectedOldFiles.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center p-6">
                  <FileIcon className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No files uploaded for this indicator
                  </p>
                </div>
              )}
          </div>
        ) : (
          /* Normal mode: Show all files */
          <FileList
            files={movFiles}
            onPreview={handlePreview}
            onDownload={handleDownload}
            canDelete={false}
            loading={false}
            emptyMessage="No files uploaded yet"
            movAnnotations={annotations as any[]}
          />
        )}
      </div>

      {/* File Preview Modal (PDF with annotations or Image) */}
      {isAnnotating && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-[85vw] max-w-[1400px] h-[90vh] flex flex-row p-4 overflow-hidden border border-slate-200 dark:border-slate-700">
            {/* Left: File Viewer */}
            <div className="flex-1 flex flex-col min-w-0 mr-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-3">
                <div className="flex-1 min-w-0 mr-4 overflow-hidden">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate cursor-default">
                          {selectedFile.file_name}
                        </h2>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[500px] break-words">
                        <p>{selectedFile.file_name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
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

              {/* File Content - Uses signed URLs for secure access */}
              <div className="flex-1 relative overflow-hidden bg-slate-100 dark:bg-slate-950/50 rounded-sm">
                <SecureFileContent
                  file={selectedFile}
                  annotationsLoading={annotationsLoading}
                  pdfAnnotations={pdfAnnotations}
                  imageAnnotations={imageAnnotations}
                  onAddAnnotation={handleAddAnnotation}
                  onDeleteAnnotation={handleDeleteAnnotationFromPdf}
                />
              </div>
            </div>

            {/* Right: Comments Sidebar - Fixed width, won't shrink */}
            {selectedFile.file_type === "application/pdf" ? (
              // PDF Annotations Sidebar
              <div className="w-72 shrink-0 flex flex-col border-l border-slate-200 dark:border-slate-700 pl-4">
                <h3 className="font-semibold text-sm mb-3 pb-2 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                  Comments ({pdfAnnotations.length})
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3">
                  {pdfAnnotations.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                      No comments yet. Select text to add a highlight with a comment.
                    </div>
                  ) : (
                    pdfAnnotations.map((ann, idx) => (
                      <div
                        key={ann.id}
                        className="p-3 rounded-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <span className="shrink-0 font-bold text-amber-600 dark:text-amber-400 text-sm">
                            #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAnnotation(parseInt(ann.id))}
                            className="ml-auto shrink-0 h-6 w-6 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
                          {ann.comment || "(No comment)"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Page {ann.page + 1}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : selectedFile.file_type?.startsWith("image/") ? (
              // Image Annotations Sidebar
              <div className="w-72 shrink-0 flex flex-col border-l border-slate-200 dark:border-slate-700 pl-4">
                <h3 className="font-semibold text-sm mb-3 pb-2 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                  Annotations ({imageAnnotations.length})
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3">
                  {imageAnnotations.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                      No annotations yet. Draw a rectangle on the image and add a comment.
                    </div>
                  ) : (
                    imageAnnotations.map((ann, idx) => (
                      <div
                        key={ann.id}
                        className="p-3 rounded-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <span className="shrink-0 font-bold text-amber-600 dark:text-amber-400 text-sm">
                            #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAnnotation(parseInt(ann.id))}
                            className="ml-auto shrink-0 h-6 w-6 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {ann.comment || "(No comment)"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
