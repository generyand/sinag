'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePostIndicatorsBulk,
  usePostIndicatorsDrafts,
  useGetIndicatorsDrafts,
  useGetIndicatorsDraftsDraftId,
  usePutIndicatorsDraftsDraftId,
  useDeleteIndicatorsDraftsDraftId,
  usePostIndicatorsDraftsDraftIdReleaseLock,
  type BulkIndicatorCreate,
  type IndicatorDraftCreate,
  type IndicatorDraftUpdate,
  type IndicatorDraftResponse,
} from '@sinag/shared';

/**
 * Indicator Builder React Query Hooks
 *
 * Convenience wrappers around generated React Query hooks for indicator builder operations.
 * Provides optimistic updates, error handling, and simplified API.
 */

// ============================================================================
// Bulk Create Indicators
// ============================================================================

/**
 * Hook for bulk creating indicators
 *
 * @example
 * const { mutate, isPending } = useBulkCreateIndicators({
 *   onSuccess: (data) => {
 *     console.log('Created indicators:', data);
 *   },
 *   onError: (error) => {
 *     console.error('Failed to create:', error);
 *   }
 * });
 *
 * mutate({
 *   governance_area_id: 1,
 *   indicators: [...]
 * });
 */
export function useBulkCreateIndicators(options?: {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return usePostIndicatorsBulk({
    mutation: {
      onSuccess: (data) => {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['indicators'] });
        queryClient.invalidateQueries({ queryKey: ['governance-areas'] });
        options?.onSuccess?.(data);
      },
      onError: (error: any) => {
        options?.onError?.(error);
      },
    },
  });
}

// ============================================================================
// Draft Management
// ============================================================================

/**
 * Hook for creating a new draft
 *
 * @example
 * const { mutate, isPending } = useCreateDraft({
 *   onSuccess: (draft) => {
 *     console.log('Draft created:', draft.id);
 *   }
 * });
 */
export function useCreateDraft(options?: {
  onSuccess?: (data: IndicatorDraftResponse) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return usePostIndicatorsDrafts({
    mutation: {
      onSuccess: (data) => {
        // Optimistically update the drafts list
        queryClient.setQueryData(['indicator-drafts'], (old: IndicatorDraftResponse[] = []) => {
          return [...old, data];
        });

        // Also invalidate to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['indicator-drafts'] });
        options?.onSuccess?.(data);
      },
      onError: (error: any) => {
        options?.onError?.(error);
      },
    },
  });
}

/**
 * Hook for saving an existing draft
 *
 * Handles version conflicts (409 errors) gracefully
 *
 * @example
 * const { mutate, isPending } = useSaveDraft({
 *   onSuccess: (draft) => {
 *     console.log('Draft saved:', draft.version);
 *   },
 *   onConflict: (error) => {
 *     alert('Draft was modified by another user');
 *   }
 * });
 */
export function useSaveDraft(options?: {
  onSuccess?: (data: IndicatorDraftResponse) => void;
  onError?: (error: Error) => void;
  onConflict?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return usePutIndicatorsDraftsDraftId({
    mutation: {
      onSuccess: (data) => {
        // Optimistically update the draft in the list
        queryClient.setQueryData(['indicator-drafts'], (old: IndicatorDraftResponse[] = []) => {
          return old.map((draft) => (draft.id === data.id ? data : draft));
        });

        // Update single draft query
        queryClient.setQueryData(['indicator-draft', data.id], data);

        // Invalidate to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['indicator-drafts'] });
        queryClient.invalidateQueries({ queryKey: ['indicator-draft', data.id] });

        options?.onSuccess?.(data);
      },
      onError: (error: any) => {
        // Check for version conflict (409)
        if (error?.response?.status === 409) {
          options?.onConflict?.(error);
        } else {
          options?.onError?.(error);
        }
      },
    },
  });
}

/**
 * Hook for fetching user's drafts
 *
 * @example
 * const { data: drafts, isLoading } = useUserDrafts();
 */
export function useUserDrafts(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const result = useGetIndicatorsDrafts(undefined, {
    query: {
      enabled: options?.enabled ?? true,
      ...(options?.refetchInterval && { refetchInterval: options.refetchInterval }),
    } as any,
  });

  return result;
}

/**
 * Hook for loading a specific draft
 *
 * @example
 * const { data: draft, isLoading } = useLoadDraft(draftId);
 */
export function useLoadDraft(
  draftId: string | null,
  options?: {
    enabled?: boolean;
  }
) {
  return useGetIndicatorsDraftsDraftId(
    draftId || '', // Empty string as fallback
    {
      query: {
        enabled: (options?.enabled ?? true) && !!draftId,
      } as any,
    }
  );
}

/**
 * Hook for deleting a draft
 *
 * @example
 * const { mutate: deleteDraft } = useDeleteDraft({
 *   onSuccess: () => {
 *     console.log('Draft deleted');
 *   }
 * });
 *
 * deleteDraft(draftId);
 */
export function useDeleteDraft(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useDeleteIndicatorsDraftsDraftId({
    mutation: {
      onSuccess: (_, variables) => {
        const deletedDraftId = variables.draftId;

        // Optimistically remove from list
        queryClient.setQueryData(['indicator-drafts'], (old: IndicatorDraftResponse[] = []) => {
          return old.filter((draft) => draft.id !== deletedDraftId);
        });

        // Remove single draft cache
        queryClient.removeQueries({ queryKey: ['indicator-draft', deletedDraftId] });

        // Invalidate to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['indicator-drafts'] });

        options?.onSuccess?.();
      },
      onError: (error: any) => {
        options?.onError?.(error);
      },
    },
  });
}

/**
 * Hook for releasing a draft lock
 *
 * @example
 * const { mutate: releaseLock } = useReleaseDraftLock();
 *
 * releaseLock(draftId);
 */
export function useReleaseDraftLock(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return usePostIndicatorsDraftsDraftIdReleaseLock({
    mutation: {
      onSuccess: (_, draftId) => {
        // Invalidate draft queries to refetch lock status
        queryClient.invalidateQueries({ queryKey: ['indicator-drafts'] });
        queryClient.invalidateQueries({ queryKey: ['indicator-draft', draftId] });

        options?.onSuccess?.();
      },
      onError: (error: any) => {
        options?.onError?.(error);
      },
    },
  });
}

// ============================================================================
// Composite Hooks
// ============================================================================

/**
 * Hook that combines draft save with auto-save functionality
 *
 * @example
 * const { saveNow, isSaving } = useAutoSaveDraft({
 *   draftId: 'abc-123',
 *   onSave: (draft) => console.log('Saved', draft.version),
 * });
 */
export function useAutoSaveDraft({
  draftId,
  enabled = true,
  onSave,
  onError,
}: {
  draftId: string | null;
  enabled?: boolean;
  onSave?: (draft: IndicatorDraftResponse) => void;
  onError?: (error: Error) => void;
}) {
  const saveMutation = useSaveDraft({
    onSuccess: onSave,
    onError: onError,
  });

  const saveNow = useCallback(
    (payload: Omit<IndicatorDraftUpdate, 'version'> & { version: number }) => {
      if (!draftId || !enabled) return;

      saveMutation.mutate({
        draftId,
        data: payload,
      });
    },
    [draftId, enabled, saveMutation]
  );

  return {
    saveNow,
    isSaving: saveMutation.isPending,
    isError: saveMutation.isError,
    error: saveMutation.error,
  };
}

/**
 * Hook for exporting draft data as JSON
 *
 * @example
 * const { exportDraft } = useExportDraft();
 *
 * exportDraft(draftId, 'my-indicators.json');
 */
export function useExportDraft() {
  const { data: drafts } = useUserDrafts();

  const exportDraft = useCallback(
    (draftId: string, filename?: string) => {
      const draft = drafts?.find((d) => d.id === draftId);
      if (!draft) {
        console.error('Draft not found:', draftId);
        return;
      }

      const dataStr = JSON.stringify(draft, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `indicator-draft-${draftId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    },
    [drafts]
  );

  return { exportDraft };
}
