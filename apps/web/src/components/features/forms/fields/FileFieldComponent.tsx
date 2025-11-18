// 📎 File Field Component (Epic 4.0)
// Fully integrated file upload field with MOV upload system

"use client";

import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, Info } from "lucide-react";
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
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

interface FileFieldComponentProps {
  field: FileUploadField;
  assessmentId: number;
  indicatorId: number;
  disabled?: boolean;
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

  const handlePreview = (file: MOVFileResponse) => {
    // Open file in new tab
    window.open(file.file_url, "_blank");
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
  const files = allFiles.filter((f: any) => f.field_id === field.field_id);

  // Permission checks
  const assessmentStatus = (assessmentData as any)?.assessment?.status;
  const isBLGU = user?.role === "BLGU_USER";
  const isAssessorOrValidator =
    user?.role === "ASSESSOR" ||
    user?.role === "VALIDATOR" ||
    user?.role === "MLGOO_DILG";

  // Can upload: Only BLGU users, only for DRAFT or NEEDS_REWORK status, and not disabled
  const canUpload =
    !disabled &&
    isBLGU &&
    (assessmentStatus === AssessmentStatus.DRAFT ||
      assessmentStatus === AssessmentStatus.NEEDS_REWORK);

  // Can delete: Only BLGU users, only for DRAFT or NEEDS_REWORK status, and not disabled
  const canDelete =
    !disabled &&
    isBLGU &&
    (assessmentStatus === AssessmentStatus.DRAFT ||
      assessmentStatus === AssessmentStatus.NEEDS_REWORK);

  // Reason why upload is disabled
  const uploadDisabledReason = !canUpload
    ? assessmentStatus === AssessmentStatus.SUBMITTED_FOR_REVIEW ||
      assessmentStatus === AssessmentStatus.VALIDATED
      ? "File uploads are disabled for submitted or validated assessments"
      : !isBLGU
      ? "Only BLGU users can upload files"
      : null
    : null;

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

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <FileListWithDelete
          files={files}
          onPreview={handlePreview}
          onDownload={handleDownload}
          canDelete={canDelete}
          loading={isLoadingFiles}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}

      {/* Show message if delete is disabled for submitted/validated assessments */}
      {files.length > 0 &&
        !canDelete &&
        isBLGU &&
        (assessmentStatus === AssessmentStatus.SUBMITTED_FOR_REVIEW ||
          assessmentStatus === AssessmentStatus.VALIDATED) && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Files cannot be deleted after assessment submission. If you need to
              modify files, request the assessment to be sent back for rework.
            </AlertDescription>
          </Alert>
        )}
    </div>
  );
}
