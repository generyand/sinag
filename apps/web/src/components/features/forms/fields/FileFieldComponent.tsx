// 📎 File Field Component (Epic 4.0)
// Fully integrated file upload field with MOV upload system

"use client";

import { useState } from "react";
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
import { useAuthStore } from "@/store/useAuthStore";
import { FileUpload } from "@/components/features/movs/FileUpload";
import { FileListWithDelete } from "@/components/features/movs/FileListWithDelete";
import toast from "react-hot-toast";

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

          // Reset after showing success
          setTimeout(() => {
            setSelectedFile(null);
            setUploadError(null);
            setUploadProgress(0);
            setShowSuccess(false);
            refetchFiles();
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
          toast.error(errorMessage);
        },
      },
    });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadError(null);
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

  const handleDownload = (file: MOVFileResponse) => {
    // Create a temporary link and trigger download
    const link = document.createElement("a");
    link.href = file.file_url;
    link.download = file.file_name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const files = filesResponse?.files || [];

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

      {/* Upload Button (only show when file is selected and not uploading) */}
      {selectedFile && !uploadMutation.isPending && !showSuccess && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            className="px-6 py-2.5 bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow)]/90 text-gray-900 font-semibold rounded-md shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Upload File
          </button>
        </div>
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
