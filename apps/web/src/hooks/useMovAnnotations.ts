"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAssessorMovsMovFileIdAnnotations,
  usePostAssessorMovsMovFileIdAnnotations,
  usePatchAssessorAnnotationsAnnotationId,
  useDeleteAssessorAnnotationsAnnotationId,
  type AnnotationCreate,
  type AnnotationUpdate
} from "@vantage/shared";

/**
 * Hook for managing MOV file annotations with database persistence
 */
export function useMovAnnotations(movFileId: number | null) {
  const queryClient = useQueryClient();

  // Fetch annotations for the MOV file
  const { data: annotationsData, isLoading, error } = useGetAssessorMovsMovFileIdAnnotations(
    movFileId ?? 0,
    {
      query: {
        enabled: movFileId != null && movFileId > 0,
      },
    } as any
  );

  // Create annotation mutation
  const createMutation = usePostAssessorMovsMovFileIdAnnotations({
    mutation: {
      onSuccess: () => {
        // Invalidate and refetch annotations for this MOV
        if (movFileId) {
          queryClient.invalidateQueries({
            queryKey: [`http://localhost:8000/api/v1/assessor/movs/${movFileId}/annotations`],
          });
        }
      },
    },
  });

  // Update annotation mutation
  const updateMutation = usePatchAssessorAnnotationsAnnotationId({
    mutation: {
      onSuccess: () => {
        // Invalidate and refetch annotations for this MOV
        if (movFileId) {
          queryClient.invalidateQueries({
            queryKey: [`http://localhost:8000/api/v1/assessor/movs/${movFileId}/annotations`],
          });
        }
      },
    },
  });

  // Delete annotation mutation
  const deleteMutation = useDeleteAssessorAnnotationsAnnotationId({
    mutation: {
      onSuccess: () => {
        // Invalidate and refetch annotations for this MOV
        if (movFileId) {
          queryClient.invalidateQueries({
            queryKey: [`http://localhost:8000/api/v1/assessor/movs/${movFileId}/annotations`],
          });
        }
      },
    },
  });

  // Helper functions
  const createAnnotation = async (annotation: AnnotationCreate) => {
    if (!movFileId) return;
    await createMutation.mutateAsync({
      movFileId,
      data: annotation,
    });
  };

  const updateAnnotation = async (annotationId: number, update: AnnotationUpdate) => {
    await updateMutation.mutateAsync({
      annotationId,
      data: update,
    });
  };

  const deleteAnnotation = async (annotationId: number) => {
    await deleteMutation.mutateAsync({
      annotationId,
    });
  };

  return {
    annotations: annotationsData ?? [],
    isLoading,
    error,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
