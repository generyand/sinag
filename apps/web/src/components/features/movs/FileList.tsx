"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MOVFileResponse,
  getGetMovsFilesFileIdSignedUrlQueryKey,
  useGetMovsFilesFileIdSignedUrl,
} from "@sinag/shared";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  File,
  FileIcon,
  FileText,
  Image,
  Loader2,
  MessageSquare,
  StickyNote,
  RotateCw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useState } from "react";

// Dynamically import annotators to avoid SSR issues
const PdfAnnotator = dynamic(() => import("@/components/shared/PdfAnnotator"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading PDF viewer...</div>,
});

const ImageAnnotator = dynamic(() => import("@/components/shared/ImageAnnotator"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">Loading image viewer...</div>
  ),
});

interface FileListProps {
  files: MOVFileResponse[];
  onDelete?: (fileId: number) => void;
  onPreview?: (file: MOVFileResponse) => void;
  onDownload?: (file: MOVFileResponse) => void;
  onRotate?: (fileId: number) => void;
  canDelete?: boolean;
  canRotate?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  movAnnotations?: any[];
  hideHeader?: boolean;
  /** MOV file IDs flagged by MLGOO for recalibration - these need to be re-uploaded */
  mlgooFlaggedFileIds?: Array<{ mov_file_id: number; comment?: string | null }>;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) {
    return <Image className="h-5 w-5" />;
  }
  if (fileType.includes("pdf")) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (fileType.includes("word") || fileType.includes("document")) {
    return <FileText className="h-5 w-5 text-blue-500" />;
  }
  if (fileType.includes("sheet") || fileType.includes("excel")) {
    return <FileText className="h-5 w-5 text-green-500" />;
  }
  if (fileType.startsWith("video/")) {
    return <FileIcon className="h-5 w-5 text-purple-500" />;
  }
  return <FileIcon className="h-5 w-5" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Component that fetches a signed URL and renders the appropriate file viewer.
 * This ensures secure, time-limited access to MOV files stored in private buckets.
 */
function SecureFileViewer({
  file,
  annotations,
  annotateEnabled = false,
  onAdd,
}: {
  file: MOVFileResponse;
  annotations: any[];
  annotateEnabled?: boolean;
  onAdd?: (annotation: any) => void;
}) {
  const {
    data: signedUrlData,
    isLoading,
    error,
    refetch,
  } = useGetMovsFilesFileIdSignedUrl(parseInt(String(file.id), 10), {
    query: {
      queryKey: getGetMovsFilesFileIdSignedUrlQueryKey(file.id),
      staleTime: 1000 * 60 * 30, // Cache for 30 minutes (URL valid for 1 hour)
      retry: 2,
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">Loading file...</p>
        </div>
      </div>
    );
  }

  if (error || !signedUrlData?.signed_url) {
    return (
      <div className="flex items-center justify-center p-8 h-[60vh]">
        <div className="text-center text-red-500">
          <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Failed to load file</p>
          <p className="text-sm mt-2 text-muted-foreground">
            {error instanceof Error ? error.message : "Unable to generate secure URL"}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const signedUrl = signedUrlData.signed_url;

  // PDF files
  if (file.file_type.includes("pdf")) {
    return (
      <PdfAnnotator
        url={signedUrl}
        annotateEnabled={annotateEnabled}
        annotations={annotations.map((ann: any) => ({
          id: String(ann.id),
          type: "pdfRect" as const,
          page: ann.page_number || 0,
          rect: ann.rect || { x: 0, y: 0, w: 10, h: 10 },
          rects: ann.rects,
          comment: ann.comment || "",
          createdAt: ann.created_at || new Date().toISOString(),
        }))}
        onAdd={onAdd || (() => {})}
      />
    );
  }

  // Image files
  if (file.file_type.startsWith("image/")) {
    return (
      <ImageAnnotator
        url={signedUrl}
        annotateEnabled={annotateEnabled}
        annotations={annotations.map((ann: any) => ({
          id: String(ann.id),
          rect: ann.rect || { x: 0, y: 0, w: 10, h: 10 },
          comment: ann.comment || "",
          createdAt: ann.created_at || new Date().toISOString(),
        }))}
        onAdd={onAdd || (() => {})}
      />
    );
  }

  // Other file types
  return (
    <div className="p-8 text-center text-gray-500">
      <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Preview is only available for PDF and image files.</p>
      <p className="text-sm mt-2">Please download the file to view it.</p>
    </div>
  );
}

// Export SecureFileViewer for use in other components
export { SecureFileViewer };

export function FileList({
  files,
  onDelete,
  onPreview,
  onDownload,
  onRotate,
  canDelete = false,
  canRotate = false,
  loading = false,
  emptyMessage = "No files uploaded yet",
  movAnnotations = [],
  hideHeader = false,
  mlgooFlaggedFileIds = [],
}: FileListProps) {
  const [viewAnnotationsDialog, setViewAnnotationsDialog] = useState<{
    open: boolean;
    file: MOVFileResponse | null;
    annotations: any[];
  }>({
    open: false,
    file: null,
    annotations: [],
  });

  // Helper function to get annotations for a specific file
  const getAnnotationsForFile = (fileId: number) => {
    return movAnnotations.filter((ann: any) => ann.mov_file_id === fileId);
  };

  // Helper function to check if file is flagged by MLGOO and get comment
  const getMlgooFlaggedInfo = (fileId: number) => {
    const flagged = mlgooFlaggedFileIds.find((f) => f.mov_file_id === fileId);
    return flagged
      ? { isFlagged: true, comment: flagged.comment }
      : { isFlagged: false, comment: null };
  };

  // Handler to open annotation viewer
  const handleViewAnnotations = (file: MOVFileResponse) => {
    const annotations = getAnnotationsForFile(file.id);
    setViewAnnotationsDialog({
      open: true,
      file,
      annotations,
    });
  };

  // Handler to close annotation viewer
  const handleCloseAnnotations = () => {
    setViewAnnotationsDialog({
      open: false,
      file: null,
      annotations: [],
    });
  };

  // Override the preview handler to show annotations in modal instead
  const handlePreviewClick = (file: MOVFileResponse) => {
    const annotations = getAnnotationsForFile(file.id);

    // If onPreview callback is provided (like in assessor view), always use it
    if (onPreview) {
      onPreview(file);
      return;
    }

    // Otherwise, if file has annotations OR is PDF/image, show in modal with annotator
    if (
      annotations.length > 0 ||
      file.file_type.includes("pdf") ||
      file.file_type.startsWith("image/")
    ) {
      setViewAnnotationsDialog({
        open: true,
        file,
        annotations,
      });
    }
  };
  if (loading) {
    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[var(--hover)] animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          <div className="text-center py-8 px-4 rounded-lg bg-[var(--card)] border border-dashed border-[var(--border)]">
            <File className="mx-auto h-12 w-12 text-[var(--text-secondary)] opacity-50 mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-none shadow-none bg-transparent">
        {!hideHeader && (
          <CardHeader className="px-0 pb-3">
            <CardTitle className="text-base font-semibold">Uploaded Files</CardTitle>
            <CardDescription>
              {files.length} file{files.length !== 1 ? "s" : ""} uploaded
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="p-0">
          <div className="space-y-2">
            {files.map((file) => {
              const fileAnnotations = getAnnotationsForFile(file.id);
              const hasAnnotations = fileAnnotations.length > 0;
              const mlgooFlagged = getMlgooFlaggedInfo(file.id);
              const hasAssessorNotes = !!(file.assessor_notes && file.assessor_notes.trim());
              const needsReupload = hasAnnotations || mlgooFlagged.isFlagged;

              return (
                <div
                  key={file.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    mlgooFlagged.isFlagged
                      ? "border-2 border-red-400 bg-red-50/70 dark:border-red-500 dark:bg-red-950/30"
                      : hasAnnotations
                        ? "border-2 border-orange-400 bg-orange-50/70 dark:border-orange-500 dark:bg-orange-950/30"
                        : hasAssessorNotes
                          ? "border-2 border-yellow-400 bg-yellow-50/70 dark:border-yellow-500 dark:bg-yellow-950/30"
                          : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--hover)]"
                  )}
                >
                  {/* File Info Header */}
                  <div className="flex items-start gap-3 mb-3">
                    {/* Status indicator icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {mlgooFlagged.isFlagged ? (
                        <AlertCircle
                          className="h-5 w-5 text-red-600 dark:text-red-400"
                          aria-label="File flagged by MLGOO for re-upload"
                        />
                      ) : hasAnnotations ? (
                        <AlertCircle
                          className="h-5 w-5 text-orange-600 dark:text-orange-400"
                          aria-label="File needs re-upload"
                        />
                      ) : hasAssessorNotes ? (
                        <AlertTriangle
                          className="h-5 w-5 text-yellow-600 dark:text-yellow-400"
                          aria-label="File has assessor notes"
                        />
                      ) : (
                        <CheckCircle2
                          className="h-5 w-5 text-green-600 dark:text-green-400"
                          aria-label="File is valid"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p
                                className={cn(
                                  "text-sm truncate max-w-[200px] cursor-default",
                                  hasAnnotations
                                    ? "font-semibold text-orange-900 dark:text-orange-100"
                                    : hasAssessorNotes
                                      ? "font-semibold text-yellow-900 dark:text-yellow-100"
                                      : "font-medium text-[var(--text-primary)]"
                                )}
                              >
                                {file.file_name}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[400px] break-words">
                              <p>{file.file_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {mlgooFlagged.isFlagged && (
                          <Badge
                            variant="outline"
                            className="text-xs shrink-0 border-red-500 bg-red-100 text-red-700 dark:border-red-600 dark:bg-red-900/50 dark:text-red-300"
                          >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            MLGOO Flagged
                          </Badge>
                        )}
                        {hasAnnotations && !mlgooFlagged.isFlagged && (
                          <Badge
                            variant="outline"
                            className="text-xs shrink-0 border-orange-500 bg-orange-100 text-orange-700 dark:border-orange-600 dark:bg-orange-900/50 dark:text-orange-300"
                          >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Re-upload needed
                          </Badge>
                        )}
                        {hasAssessorNotes && !mlgooFlagged.isFlagged && !hasAnnotations && (
                          <Badge
                            variant="outline"
                            className="text-xs shrink-0 border-yellow-500 bg-yellow-100 text-yellow-700 dark:border-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-300"
                          >
                            <StickyNote className="h-3 w-3 mr-1" />
                            Has Notes
                          </Badge>
                        )}
                      </div>
                      {/* MLGOO flagged comment */}
                      {mlgooFlagged.isFlagged && mlgooFlagged.comment && (
                        <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300 mt-1 bg-red-50 dark:bg-red-950/30 p-2 rounded border border-red-200 dark:border-red-800">
                          <MessageSquare
                            className="h-3.5 w-3.5 mt-0.5 flex-shrink-0"
                            aria-hidden="true"
                          />
                          <span className="italic">&quot;{mlgooFlagged.comment}&quot;</span>
                        </div>
                      )}
                      {/* MLGOO flagged without specific comment - show generic instruction */}
                      {mlgooFlagged.isFlagged && !mlgooFlagged.comment && (
                        <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300 mt-1">
                          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>This file was flagged by MLGOO for re-upload</span>
                        </div>
                      )}
                      {/* Assessor notes display */}
                      {hasAssessorNotes && (
                        <div className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-300 mt-1 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded border border-yellow-200 dark:border-yellow-800">
                          <StickyNote
                            className="h-3.5 w-3.5 mt-0.5 flex-shrink-0"
                            aria-hidden="true"
                          />
                          <div>
                            <span className="font-medium">Assessor Note: </span>
                            <span className="italic">&quot;{file.assessor_notes}&quot;</span>
                          </div>
                        </div>
                      )}
                      {/* Annotation count and view feedback link */}
                      {hasAnnotations && (
                        <div className="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-300 mt-1">
                          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            {fileAnnotations.length} assessor{" "}
                            {fileAnnotations.length === 1 ? "comment" : "comments"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePreviewClick(file)}
                            className="underline hover:no-underline font-medium"
                          >
                            View feedback
                          </button>
                        </div>
                      )}
                      <div
                        className={cn(
                          "flex items-center gap-2 text-xs mt-1",
                          hasAnnotations
                            ? "text-orange-600/80 dark:text-orange-400/80"
                            : hasAssessorNotes
                              ? "text-yellow-600/80 dark:text-yellow-400/80"
                              : "text-muted-foreground"
                        )}
                      >
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>•</span>
                        <span>
                          {file.uploaded_at
                            ? formatDistanceToNow(new Date(file.uploaded_at), {
                                addSuffix: true,
                              })
                            : "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div
                    className={cn(
                      "flex items-center gap-1 pt-2 border-t",
                      mlgooFlagged.isFlagged
                        ? "border-red-300 dark:border-red-700"
                        : hasAnnotations
                          ? "border-orange-300 dark:border-orange-700"
                          : hasAssessorNotes
                            ? "border-yellow-300 dark:border-yellow-700"
                            : "border-[var(--border)]"
                    )}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewClick(file)}
                      title="Preview file"
                      className={
                        mlgooFlagged.isFlagged
                          ? "text-red-700 hover:text-red-900 hover:bg-red-100 dark:text-red-300 dark:hover:text-red-100"
                          : hasAnnotations
                            ? "text-orange-700 hover:text-orange-900 hover:bg-orange-100 dark:text-orange-300 dark:hover:text-orange-100"
                            : ""
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canRotate && onRotate && file.file_type.startsWith("image/") && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRotate(file.id)}
                        title="Rotate image 90° clockwise"
                        className={
                          mlgooFlagged.isFlagged
                            ? "text-red-700 hover:text-red-900 hover:bg-red-100 dark:text-red-300 dark:hover:text-red-100"
                            : hasAnnotations
                              ? "text-orange-700 hover:text-orange-900 hover:bg-orange-100 dark:text-orange-300 dark:hover:text-orange-100"
                              : ""
                        }
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    )}
                    {onDownload && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDownload(file)}
                        title="Download file"
                        className={
                          mlgooFlagged.isFlagged
                            ? "text-red-700 hover:text-red-900 hover:bg-red-100 dark:text-red-300 dark:hover:text-red-100"
                            : hasAnnotations
                              ? "text-orange-700 hover:text-orange-900 hover:bg-orange-100 dark:text-orange-300 dark:hover:text-orange-100"
                              : ""
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && onDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(file.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Annotation Viewer Dialog */}
      <Dialog open={viewAnnotationsDialog.open} onOpenChange={handleCloseAnnotations}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              {viewAnnotationsDialog.file?.file_name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-row gap-4">
            {/* Left: File Viewer */}
            <div className="flex-1 overflow-auto bg-white">
              {viewAnnotationsDialog.file && (
                <SecureFileViewer
                  file={viewAnnotationsDialog.file}
                  annotations={viewAnnotationsDialog.annotations}
                  annotateEnabled={false}
                />
              )}
            </div>

            {/* Right: Notes & Comments Sidebar */}
            {viewAnnotationsDialog.file &&
              (viewAnnotationsDialog.file.file_type?.includes("pdf") ||
                viewAnnotationsDialog.file.file_type?.startsWith("image/")) && (
                <div className="w-72 flex flex-col border-l border-gray-200 dark:border-gray-700 pl-4 shrink-0">
                  {/* MOV Notes Section */}
                  {viewAnnotationsDialog.file.assessor_notes &&
                    viewAnnotationsDialog.file.assessor_notes.trim() && (
                      <div className="mb-4">
                        <h3 className="font-semibold text-sm mb-2 pb-2 border-b border-gray-200 dark:border-gray-700 text-[var(--foreground)] flex items-center gap-1.5">
                          <StickyNote className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          MOV Notes
                        </h3>
                        <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
                          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                            {viewAnnotationsDialog.file.assessor_notes}
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Assessor Comments Section */}
                  <h3 className="font-semibold text-sm mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 text-[var(--foreground)]">
                    Assessor Comments ({viewAnnotationsDialog.annotations.length})
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {viewAnnotationsDialog.annotations.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No comments from assessor yet.
                      </div>
                    ) : (
                      viewAnnotationsDialog.annotations.map((ann: any, idx: number) => (
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
        </DialogContent>
      </Dialog>
    </>
  );
}
