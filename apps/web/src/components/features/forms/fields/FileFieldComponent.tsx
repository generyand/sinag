// 📎 File Field Component (Epic 4.0)
// Fully integrated file upload field with MOV upload system

"use client";

import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, Info, X, FileIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

// Dynamically import annotators to avoid SSR issues
const PdfAnnotator = dynamic(() => import('@/components/shared/PdfAnnotator'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[70vh]">Loading PDF viewer...</div>,
});

const ImageAnnotator = dynamic(() => import('@/components/shared/ImageAnnotator'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[70vh]">Loading image viewer...</div>,
});
import type { FileUploadField } from "@vantage/shared";
import {
  useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles,
  usePostMovsAssessmentsAssessmentIdIndicatorsIndicatorIdUpload,
  useGetAssessmentsMyAssessment,
  MOVFileResponse,
  AssessmentStatus,
} from "@vantage/shared";
import { getGetAssessmentsMyAssessmentQueryKey } from "@vantage/shared/src/generated/endpoints/assessments";
import { useAuthStore } from "@/store/useAuthStore";
import { useUploadStore } from "@/store/useUploadStore";
import { FileUpload } from "@/components/features/movs/FileUpload";
import { FileListWithDelete } from "@/components/features/movs/FileListWithDelete";
import { FileList } from "@/components/features/movs/FileList";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

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
      cacheTime: 0,
      staleTime: 0,
    } as any,
  } as any);

  // Fetch uploaded files for this indicator
  const {
    data: filesResponse,
    isLoading: isLoadingFiles,
    refetch: refetchFiles,
  } = useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles(
    assessmentId,
    indicatorId,
    {
      query: {
        enabled: !!assessmentId && !!indicatorId,
      } as any,
    } as any
  );

  // Normalize status for case-insensitive comparison
  const normalizedStatus = ((assessmentData as any)?.assessment?.status || '').toUpperCase();

  // Upload mutation
  const uploadMutation =
    usePostMovsAssessmentsAssessmentIdIndicatorsIndicatorIdUpload({
      mutation: {
        onMutate: () => {
          // Start progress simulation
          setUploadProgress(0);
          setShowSuccess(false);
          setUploadError(null);

          // Simulate progress (since we don't have real upload progress from the API)
          const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90; // Stop at 90% until success
              }
              return prev + 10;
            });
          }, 200);

          return { progressInterval };
        },
        onSuccess: (data, variables, context: any) => {
          // Complete progress
          setUploadProgress(100);
          setShowSuccess(true);

          // Clear the progress interval
          if (context?.progressInterval) {
            clearInterval(context.progressInterval);
          }

          toast.success("File uploaded successfully");

          // Reset and process next file in queue
          setTimeout(() => {
            setUploadError(null);
            setUploadProgress(0);
            setShowSuccess(false);
            setSelectedFile(null);
            refetchFiles();

            // CRITICAL: Invalidate and refetch assessment query to update progress tracking
            queryClient.invalidateQueries({
              queryKey: getGetAssessmentsMyAssessmentQueryKey(),
              refetchType: 'active',
            });

            // Force immediate refetch
            queryClient.refetchQueries({
              queryKey: getGetAssessmentsMyAssessmentQueryKey(),
            });

            // Tell global queue this upload is complete
            completeCurrentUpload();
          }, 1500);
        },
        onError: (error: any, variables, context: any) => {
          // Clear the progress interval
          if (context?.progressInterval) {
            clearInterval(context.progressInterval);
          }

          const errorMessage =
            error?.response?.data?.detail?.message ||
            error?.response?.data?.detail ||
            error?.message ||
            "Failed to upload file";
          setUploadError(errorMessage);
          setUploadProgress(0);
          setSelectedFile(null);
          toast.error(errorMessage);

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
          data: { file: fileToUpload, field_id: field.field_id },
        });
      },
    });
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    uploadMutation.mutate({
      assessmentId,
      indicatorId,
      data: { file: selectedFile },
    });
  };

  const handleDeleteSuccess = () => {
    refetchFiles();
  };

  // State for preview modal (same as assessor view)
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<MOVFileResponse | null>(null);
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
      // Fetch the file as a blob to bypass CORS restrictions on download attribute
      const response = await fetch(file.file_url);
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
      toast.error("Failed to download file");
    }
  };

  // Filter files by field_id to show only files uploaded to this specific field
  const allFiles = filesResponse?.files || [];

  // Get rework timestamp from assessment data
  const reworkRequestedAt = (assessmentData as any)?.assessment?.rework_requested_at;

  // Separate files based on rework timestamp
  const activeFiles = allFiles.filter((f: any) => f.field_id === field.field_id && !f.deleted_at);
  const deletedFiles = allFiles.filter((f: any) => f.field_id === field.field_id && f.deleted_at);

  // During REWORK status, separate old files from new files
  const isReworkStatus = normalizedStatus === 'REWORK' || normalizedStatus === 'NEEDS_REWORK';

  let previousFiles: any[] = [];
  let newFiles: any[] = [];

  if (isReworkStatus && reworkRequestedAt) {
    const reworkDate = new Date(reworkRequestedAt);

    console.log('[FileFieldComponent] Rework filtering debug:', {
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
          comparison: `${uploadDate.getTime()} >= ${reworkDate.getTime()}`
        };
      })
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

    console.log('[FileFieldComponent] Filtered results:', {
      field_id: field.field_id,
      oldFilesCount: oldFiles.length,
      recentFilesCount: recentFiles.length
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
    user?.role === "ASSESSOR" ||
    user?.role === "VALIDATOR" ||
    user?.role === "MLGOO_DILG";

  // Can upload: Only BLGU users, only for DRAFT or REWORK/NEEDS_REWORK status, and not disabled
  const canUpload =
    !disabled &&
    isBLGU &&
    (normalizedStatus === 'DRAFT' ||
      normalizedStatus === 'REWORK' ||
      normalizedStatus === 'NEEDS_REWORK');

  // Can delete: Only BLGU users, only for DRAFT or REWORK/NEEDS_REWORK status, and not disabled
  const canDelete =
    !disabled &&
    isBLGU &&
    (normalizedStatus === 'DRAFT' ||
      normalizedStatus === 'REWORK' ||
      normalizedStatus === 'NEEDS_REWORK');

  // Reason why upload is disabled
  const uploadDisabledReason = !canUpload
    ? normalizedStatus === 'SUBMITTED_FOR_REVIEW' ||
      normalizedStatus === 'VALIDATED' ||
      normalizedStatus === 'SUBMITTED' ||
      normalizedStatus === 'COMPLETED'
      ? "File uploads are disabled for submitted or validated assessments"
      : !isBLGU
      ? "Only BLGU users can upload files"
      : null
    : null;

  // Count annotations for this field
  const fieldAnnotations = movAnnotations.filter((ann: any) =>
    files.some(f => f.id === ann.mov_file_id)
  );
  const hasAnnotations = fieldAnnotations.length > 0;

  return (
    <div className="space-y-4">
      {/* Field Label and Help Text */}
      <div className="space-y-1">
        <Label className="text-sm font-medium text-[var(--text-primary)]">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>

        {field.help_text && (
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">{field.help_text}</p>
        )}
      </div>

      {/* Rework Alert (show if there are annotations on uploaded files) */}
      {hasAnnotations && (normalizedStatus === 'REWORK' || normalizedStatus === 'NEEDS_REWORK') && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <p className="font-medium mb-1">Assessor feedback on your files</p>
            <p className="text-sm">
              The assessor has left {fieldAnnotations.length} comment{fieldAnnotations.length !== 1 ? 's' : ''} on your uploaded files.
              Please review the feedback by clicking the eye icon on each file. You can upload new corrected files and delete old ones as needed.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Instructions (show what documents are needed) */}
      {(field as any).instructions && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="font-medium text-sm text-blue-900 mb-2">Required Documents:</h4>
          <div className="text-sm text-gray-700 whitespace-pre-line">
            {(field as any).instructions}
          </div>
        </div>
      )}

      {/* Permission Info (show if upload is disabled) */}
      {uploadDisabledReason && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">{uploadDisabledReason}</AlertDescription>
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
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            {uploadMutation.isPending
              ? `Uploading...`
              : `${queue.length} file(s) in global queue`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Progress Indicator */}
      {uploadMutation.isPending && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading {selectedFile?.name}...</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {uploadProgress}% complete
          </p>
        </div>
      )}

      {/* Success Indicator */}
      {showSuccess && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            File uploaded successfully! The file will appear in the list below.
          </AlertDescription>
        </Alert>
      )}

      {/* Uploaded Files List (New files during rework, or all files in other statuses) */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            {isReworkStatus && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            <span className={isReworkStatus ? 'text-green-600' : ''}>Uploaded Files</span>
            <span className="text-muted-foreground font-normal">({files.length} file{files.length !== 1 ? 's' : ''} uploaded)</span>
          </div>
          <FileListWithDelete
            files={files}
            onPreview={handlePreview}
            onDownload={handleDownload}
            canDelete={canDelete}
            loading={isLoadingFiles}
            onDeleteSuccess={handleDeleteSuccess}
            movAnnotations={movAnnotations}
            hideHeader={true}
          />
        </div>
      )}

      {/* Previous Files (Old files from before rework + deleted files - shown as reference during rework) */}
      {showPreviousFilesAsReference && previousFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-orange-600 font-medium">
            <AlertCircle className="h-4 w-4" />
            <span>Previous Files</span>
          </div>
          <div className="border-2 border-orange-200 rounded-md bg-orange-50/30 p-3">
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
              These are files from your previous submission. They are shown here so you can review the assessor's feedback.
            </p>
          </div>
        </div>
      )}

      {/* Show message if delete is disabled for submitted/validated assessments */}
      {files.length > 0 &&
        !canDelete &&
        isBLGU &&
        (normalizedStatus === 'SUBMITTED_FOR_REVIEW' ||
          normalizedStatus === 'VALIDATED' ||
          normalizedStatus === 'SUBMITTED' ||
          normalizedStatus === 'COMPLETED') && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Files cannot be deleted after assessment submission. If you need to
              modify files, request the assessment to be sent back for rework.
            </AlertDescription>
          </Alert>
        )}

      {/* File Preview Modal (same as assessor view) */}
      {isPreviewOpen && selectedFileForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-[70vw] h-[90vh] flex flex-row gap-4 p-4">
            {/* Left: File Viewer */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
                <div className="flex-1">
                  <h2 className="text-base font-semibold">{selectedFileForPreview.file_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedFileForPreview.file_type === 'application/pdf'
                      ? 'PDF preview with assessor comments'
                      : 'Image preview with assessor comments'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closePreview}
                  className="shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* File Content */}
              <div className="flex-1" style={{ minHeight: 0 }}>
                {selectedFileForPreview.file_type === 'application/pdf' ? (
                  // PDF Viewer
                  <PdfAnnotator
                    url={selectedFileForPreview.file_url}
                    annotateEnabled={false}
                    annotations={movAnnotations
                      .filter((ann: any) => ann.mov_file_id === selectedFileForPreview.id)
                      .map((ann: any) => ({
                        id: String(ann.id),
                        type: 'pdfRect' as const,
                        page: ann.page_number || 0,
                        rect: ann.rect || { x: 0, y: 0, w: 10, h: 10 },
                        rects: ann.rects,
                        comment: ann.comment || '',
                        createdAt: ann.created_at || new Date().toISOString(),
                      }))}
                    onAdd={() => {}}
                  />
                ) : selectedFileForPreview.file_type?.startsWith('image/') ? (
                  // Image Viewer
                  <ImageAnnotator
                    url={selectedFileForPreview.file_url}
                    annotateEnabled={false}
                    annotations={movAnnotations
                      .filter((ann: any) => ann.mov_file_id === selectedFileForPreview.id)
                      .map((ann: any) => ({
                        id: String(ann.id),
                        rect: ann.rect || { x: 0, y: 0, w: 10, h: 10 },
                        comment: ann.comment || '',
                        createdAt: ann.created_at || new Date().toISOString(),
                      }))}
                    onAdd={() => {}}
                  />
                ) : (
                  // Unsupported file type
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <FileIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Preview not available for this file type
                    </p>
                    <Button
                      onClick={() => window.open(selectedFileForPreview.file_url, "_blank")}
                      variant="outline"
                    >
                      Open in New Tab
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Comments Sidebar */}
            {(selectedFileForPreview.file_type === 'application/pdf' ||
              selectedFileForPreview.file_type?.startsWith('image/')) && (
              <div className="w-80 flex flex-col border-l border-gray-200 pl-4">
                <h3 className="font-semibold text-sm mb-3 pb-2 border-b border-gray-200">
                  Assessor Comments ({movAnnotations.filter((ann: any) => ann.mov_file_id === selectedFileForPreview.id).length})
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3">
                  {movAnnotations.filter((ann: any) => ann.mov_file_id === selectedFileForPreview.id).length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No comments from assessor yet.
                    </div>
                  ) : (
                    movAnnotations
                      .filter((ann: any) => ann.mov_file_id === selectedFileForPreview.id)
                      .map((ann: any, idx: number) => (
                        <div key={ann.id} className="p-3 rounded-sm bg-gray-50 border border-gray-200">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="shrink-0 font-bold text-yellow-600 text-sm">#{idx + 1}</span>
                          </div>
                          <p className="text-sm text-gray-800 leading-relaxed mb-2">{ann.comment || '(No comment)'}</p>
                          {ann.page_number !== undefined && (
                            <p className="text-xs text-gray-500">Page {ann.page_number + 1}</p>
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
