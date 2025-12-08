"use client";

import { FileList } from "@/components/features/movs/FileList";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMovAnnotations } from "@/hooks/useMovAnnotations";
import type { AssessmentDetailsResponse } from "@sinag/shared";
import { FileIcon, X } from "lucide-react";
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

interface MiddleMovFilesPanelProps {
  assessment: AssessmentDetailsResponse;
  expandedId?: number | null;
  /** Optional: Timestamp when calibration was requested (Validator calibration) */
  calibrationRequestedAt?: string | null;
  /** Optional: Timestamp when rework was requested (Assessor rework) */
  reworkRequestedAt?: string | null;
  /** Optional: Label for the separation section (e.g., "After Calibration" or "After Rework") */
  separationLabel?: string;
}

type AnyRecord = Record<string, any>;

export function MiddleMovFilesPanel({
  assessment,
  expandedId,
  calibrationRequestedAt,
  reworkRequestedAt,
  separationLabel = "After Calibration",
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
        id: mov.id,
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
      };
    });
  }, [selectedResponse, effectiveTimestamp, effectiveLabel]);

  // Separate files into new (after rework/calibration) and old (before)
  const { newFiles, oldFiles } = React.useMemo(() => {
    if (!effectiveTimestamp) {
      // No separation timestamp - all files are treated as "old" (normal view)
      return { newFiles: [], oldFiles: movFiles };
    }
    return {
      newFiles: movFiles.filter((f) => f.isNew),
      oldFiles: movFiles.filter((f) => !f.isNew),
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
  };

  const handleDownload = async (file: any) => {
    try {
      const response = await fetch(file.file_url);
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
    } catch (error) {
      console.error("[MiddleMovFilesPanel] Failed to create annotation:", error);
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
          /* Calibration/Rework mode: Show files in two sections based on effective timestamp */
          <div className="space-y-4">
            {/* New Files Section - Highlighted (only show if there are new files) */}
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

            {/* Old Files Section */}
            {oldFiles.length > 0 && (
              <div className="rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Previous Files
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                    {oldFiles.length} file{oldFiles.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <FileList
                  files={oldFiles}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  canDelete={false}
                  loading={false}
                  emptyMessage="No previous files"
                  movAnnotations={annotations as any[]}
                />
              </div>
            )}

            {/* If no files in either category */}
            {newFiles.length === 0 && oldFiles.length === 0 && (
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

              {/* File Content */}
              <div className="flex-1" style={{ minHeight: 0 }}>
                {selectedFile.file_type === "application/pdf" ? (
                  // PDF Viewer with Annotations
                  annotationsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Loading annotations...</p>
                    </div>
                  ) : (
                    <PdfAnnotator
                      url={selectedFile.file_url}
                      annotateEnabled={true}
                      annotations={pdfAnnotations}
                      onAdd={handleAddAnnotation}
                    />
                  )
                ) : selectedFile.file_type?.startsWith("image/") ? (
                  // Image Viewer with Annotations
                  annotationsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Loading annotations...</p>
                    </div>
                  ) : (
                    <ImageAnnotator
                      url={selectedFile.file_url}
                      annotateEnabled={true}
                      annotations={imageAnnotations}
                      onAdd={handleAddAnnotation}
                    />
                  )
                ) : (
                  // Unsupported file type
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <FileIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Preview not available for this file type
                    </p>
                    <Button
                      onClick={() => window.open(selectedFile.file_url, "_blank")}
                      variant="outline"
                    >
                      Open in New Tab
                    </Button>
                  </div>
                )}
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
                            onClick={() => deleteAnnotation(parseInt(ann.id))}
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
                            onClick={() => deleteAnnotation(parseInt(ann.id))}
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
