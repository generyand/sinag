"use client";

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { classifyError } from "@/lib/error-utils";
import { MOVFileResponse, getGetAssessmentsMyAssessmentQueryKey, useDeleteMovsFilesFileId } from "@sinag/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { FileList } from "./FileList";

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
  /** Assessment ID for optimistic cache updates */
  assessmentId?: number;
  /** Indicator ID for optimistic cache updates */
  indicatorId?: number;
  /** Total required files for this field - if deleting makes count < required, mark incomplete */
  requiredFileCount?: number;
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
  assessmentId,
  indicatorId,
  requiredFileCount = 1,
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

        // OPTIMISTIC UPDATE: Immediately update cached assessment data
        // This ensures the UI updates instantly without waiting for refetch
        if (indicatorId) {
          const remainingFilesCount = files.length - 1; // One file was just deleted
          const isNowIncomplete = remainingFilesCount < requiredFileCount;

          if (isNowIncomplete) {
            // Update the assessment cache to mark this indicator as incomplete
            // CRITICAL: Update BOTH flat responses array AND nested governance_areas structure
            queryClient.setQueryData(
              getGetAssessmentsMyAssessmentQueryKey(),
              (oldData: any) => {
                if (!oldData) return oldData;
                const updated = { ...oldData };

                // Update flat responses array if it exists
                if (updated.assessment?.responses) {
                  updated.assessment = { ...updated.assessment };
                  updated.assessment.responses = updated.assessment.responses.map((r: any) => {
                    if (r.indicator_id === indicatorId) {
                      return { ...r, is_completed: false };
                    }
                    return r;
                  });
                }

                // Update nested governance_areas structure (this is what TreeNavigator uses)
                if (updated.governance_areas) {
                  updated.governance_areas = updated.governance_areas.map((area: any) => ({
                    ...area,
                    indicators: area.indicators?.map((ind: any) => {
                      if (ind.id === indicatorId || ind.response?.indicator_id === indicatorId) {
                        return {
                          ...ind,
                          response: ind.response
                            ? { ...ind.response, is_completed: false }
                            : { is_completed: false },
                        };
                      }
                      return ind;
                    }) || [],
                  }));
                }

                return updated;
              }
            );
          }
        }

        // CRITICAL: Invalidate and refetch assessment query to update progress tracking
        queryClient.invalidateQueries({
          queryKey: getGetAssessmentsMyAssessmentQueryKey(),
          refetchType: 'active',
        });

        // Force immediate refetch
        queryClient.refetchQueries({
          queryKey: getGetAssessmentsMyAssessmentQueryKey(),
        });

        // CRITICAL: Invalidate and REFETCH all MOV files queries to update progress indicators
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            // Match any query that looks like a MOV files query
            return Array.isArray(key) && key.some(
              (k) => typeof k === 'string' && k.includes('/movs/') && k.includes('/files')
            );
          },
        });
        queryClient.refetchQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key.some(
              (k) => typeof k === 'string' && k.includes('/movs/') && k.includes('/files')
            );
          },
        });

        // CRITICAL: Invalidate and REFETCH BLGU dashboard queries to update the COMPLETE badge
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key.some(
              (k) => typeof k === 'string' && k.includes('/blgu-dashboard/')
            );
          },
        });
        queryClient.refetchQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key.some(
              (k) => typeof k === 'string' && k.includes('/blgu-dashboard/')
            );
          },
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
            <AlertDialogDescription asChild>
              <div>
                Are you sure you want to delete{" "}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-medium text-[var(--foreground)] inline-block max-w-[250px] truncate align-bottom cursor-default">
                        {fileToDeleteData?.file_name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[400px] break-words">
                      <p>{fileToDeleteData?.file_name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                ? This action cannot be undone.
              </div>
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
