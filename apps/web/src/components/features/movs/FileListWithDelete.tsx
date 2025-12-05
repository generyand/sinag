"use client";

import { useState } from "react";
import { useDeleteMovsFilesFileId, MOVFileResponse } from "@sinag/shared";
import { getGetAssessmentsMyAssessmentQueryKey } from "@sinag/shared/src/generated/endpoints/assessments";
import { useQueryClient } from "@tanstack/react-query";
import { FileList } from "./FileList";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";
import { classifyError } from "@/lib/error-utils";

interface FileListWithDeleteProps {
  files: MOVFileResponse[];
  onPreview?: (file: MOVFileResponse) => void;
  onDownload?: (file: MOVFileResponse) => void;
  canDelete?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  onDeleteSuccess?: (fileId: number) => void;
  movAnnotations?: any[];
  hideHeader?: boolean;
}

/**
 * FileList wrapper that integrates the delete mutation with confirmation dialog
 * and toast notifications.
 *
 * Features:
 * - Confirmation dialog before deletion
 * - Optimistic updates for better UX
 * - Success/error toast notifications
 * - Automatic refetch after successful deletion
 */
export function FileListWithDelete({
  files,
  onPreview,
  onDownload,
  canDelete = false,
  loading = false,
  emptyMessage = "No files uploaded yet",
  onDeleteSuccess,
  movAnnotations = [],
  hideHeader = false,
}: FileListWithDeleteProps) {
  const [fileToDelete, setFileToDelete] = useState<number | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Delete mutation hook
  const deleteMutation = useDeleteMovsFilesFileId({
    mutation: {
      onMutate: (variables) => {
        // Show loading state
        setDeletingFileId(variables.fileId);
      },
      onSuccess: (data, variables) => {
        // Show success toast
        toast.success("File deleted successfully");

        // Close dialog
        setFileToDelete(null);
        setDeletingFileId(null);

        // CRITICAL: Invalidate and refetch assessment query to update progress tracking
        queryClient.invalidateQueries({
          queryKey: getGetAssessmentsMyAssessmentQueryKey(),
          refetchType: 'active',
        });

        // Force immediate refetch
        queryClient.refetchQueries({
          queryKey: getGetAssessmentsMyAssessmentQueryKey(),
        });

        // Notify parent component
        onDeleteSuccess?.(variables.fileId);
      },
      onError: (error: any, variables) => {
        // Show error toast with proper classification
        const errorInfo = classifyError(error);
        toast.error(`${errorInfo.title}: ${errorInfo.message}`);

        // Reset loading state
        setDeletingFileId(null);
      },
    },
  });

  const handleDeleteClick = (fileId: number) => {
    setFileToDelete(fileId);
  };

  const handleConfirmDelete = () => {
    if (fileToDelete !== null) {
      deleteMutation.mutate({ fileId: fileToDelete });
    }
  };

  const handleCancelDelete = () => {
    setFileToDelete(null);
  };

  // Find the file being deleted for dialog display
  const fileToDeleteData = files.find((f) => f.id === fileToDelete);

  // Filter out the file being deleted for optimistic update
  const displayFiles =
    deletingFileId !== null
      ? files.filter((f) => f.id !== deletingFileId)
      : files;

  return (
    <>
      <FileList
        files={displayFiles}
        onDelete={canDelete ? handleDeleteClick : undefined}
        onPreview={onPreview}
        onDownload={onDownload}
        canDelete={canDelete}
        loading={loading}
        emptyMessage={emptyMessage}
        movAnnotations={movAnnotations}
        hideHeader={hideHeader}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={fileToDelete !== null} onOpenChange={handleCancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-900">
                {fileToDeleteData?.file_name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
