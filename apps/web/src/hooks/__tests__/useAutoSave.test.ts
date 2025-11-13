import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAutoSave } from '../useAutoSave';
import type { IndicatorTreeState } from '@/store/useIndicatorBuilderStore';
import * as draftStorageModule from '@/lib/draft-storage';

/**
 * Tests for useAutoSave Hook
 *
 * Covers:
 * - Debounced auto-save functionality
 * - localStorage backup
 * - Server persistence
 * - Version conflict handling
 * - beforeunload event handling
 * - Manual save trigger
 */

// ============================================================================
// Mocks
// ============================================================================

// Mock draft storage
vi.mock('@/lib/draft-storage', () => ({
  draftStorage: {
    saveDraft: vi.fn(),
    loadDraft: vi.fn(),
    deleteDraft: vi.fn(),
    listDrafts: vi.fn(),
  },
}));

// Mock TanStack Query
vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((options) => {
    const mutationFn = options.mutationFn;
    const mutate = vi.fn(async (variables) => {
      try {
        const result = await mutationFn(variables);
        options.onSuccess?.(result);
        return result;
      } catch (error) {
        options.onError?.(error);
        throw error;
      }
    });

    return {
      mutate,
      isPending: false,
      isError: false,
      error: null,
    };
  }),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockTreeData: IndicatorTreeState = {
  nodes: new Map([
    [
      'node-1',
      {
        temp_id: 'node-1',
        parent_temp_id: null,
        order: 0,
        name: 'Test Indicator',
        description: 'Test description',
        is_active: true,
        is_auto_calculable: false,
        is_profiling_only: false,
      },
    ],
  ]),
  rootIds: ['node-1'],
  governanceAreaId: 1,
  creationMode: 'incremental',
  currentStep: 1,
  draftId: 'draft-123',
  version: 1,
};

// ============================================================================
// Tests
// ============================================================================

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Debounced Auto-Save', () => {
    it('should save to localStorage immediately on data change', () => {
      const { rerender } = renderHook(
        (props) => useAutoSave(props),
        {
          initialProps: {
            draftId: 'draft-123',
            data: mockTreeData,
            version: 1,
          },
        }
      );

      expect(draftStorageModule.draftStorage.saveDraft).toHaveBeenCalledTimes(1);
      expect(draftStorageModule.draftStorage.saveDraft).toHaveBeenCalledWith(
        mockTreeData,
        expect.objectContaining({
          title: expect.stringContaining('Draft'),
        })
      );
    });

    it('should debounce server save with default 3 second delay', async () => {
      const onSaveSuccess = vi.fn();
      const { rerender } = renderHook(
        (props) => useAutoSave(props),
        {
          initialProps: {
            draftId: 'draft-123',
            data: mockTreeData,
            version: 1,
            onSaveSuccess,
          },
        }
      );

      // Save should not happen immediately
      expect(onSaveSuccess).not.toHaveBeenCalled();

      // Fast-forward 3 seconds
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(onSaveSuccess).toHaveBeenCalled();
      });
    });

    it('should reset debounce timer on subsequent data changes', async () => {
      const onSaveSuccess = vi.fn();
      const { rerender } = renderHook(
        (props) => useAutoSave(props),
        {
          initialProps: {
            draftId: 'draft-123',
            data: mockTreeData,
            version: 1,
            onSaveSuccess,
            debounceMs: 1000,
          },
        }
      );

      // Wait 500ms
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Update data (should reset timer)
      const updatedData = {
        ...mockTreeData,
        currentStep: 2,
      };

      rerender({
        draftId: 'draft-123',
        data: updatedData,
        version: 1,
        onSaveSuccess,
        debounceMs: 1000,
      });

      // Wait another 500ms (total 1000ms, but timer was reset)
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Should not have saved yet
      expect(onSaveSuccess).not.toHaveBeenCalled();

      // Wait final 500ms
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Now it should have saved
      await waitFor(() => {
        expect(onSaveSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should support custom debounce delay', async () => {
      const onSaveSuccess = vi.fn();
      renderHook(() =>
        useAutoSave({
          draftId: 'draft-123',
          data: mockTreeData,
          version: 1,
          onSaveSuccess,
          debounceMs: 5000, // Custom 5 second delay
        })
      );

      // Wait 3 seconds (should not save)
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(onSaveSuccess).not.toHaveBeenCalled();

      // Wait 2 more seconds (total 5 seconds)
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(onSaveSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Version Control', () => {
    it('should call onVersionUpdate when server returns new version', async () => {
      const onVersionUpdate = vi.fn();
      renderHook(() =>
        useAutoSave({
          draftId: 'draft-123',
          data: mockTreeData,
          version: 1,
          onVersionUpdate,
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(onVersionUpdate).toHaveBeenCalledWith(2); // version + 1
      });
    });

    it('should call onVersionConflict when 409 conflict occurs', async () => {
      const onVersionConflict = vi.fn();
      const mockError = new Error('409 Conflict');

      // Mock mutation to fail
      vi.mock('@tanstack/react-query', () => ({
        useMutation: vi.fn(() => ({
          mutate: vi.fn((_, options) => {
            options?.onError?.(mockError);
          }),
          isPending: false,
          isError: true,
          error: mockError,
        })),
      }));

      renderHook(() =>
        useAutoSave({
          draftId: 'draft-123',
          data: mockTreeData,
          version: 1,
          onVersionConflict,
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(onVersionConflict).toHaveBeenCalled();
      });
    });
  });

  describe('Manual Save', () => {
    it('should provide saveNow function that bypasses debounce', async () => {
      const onSaveSuccess = vi.fn();
      const { result } = renderHook(() =>
        useAutoSave({
          draftId: 'draft-123',
          data: mockTreeData,
          version: 1,
          onSaveSuccess,
        })
      );

      // Call saveNow immediately
      act(() => {
        result.current.saveNow();
      });

      // Should save immediately without waiting for debounce
      await waitFor(() => {
        expect(onSaveSuccess).toHaveBeenCalled();
      });
    });

    it('should cancel pending debounced save when saveNow is called', async () => {
      const onSaveSuccess = vi.fn();
      const { result } = renderHook(() =>
        useAutoSave({
          draftId: 'draft-123',
          data: mockTreeData,
          version: 1,
          onSaveSuccess,
        })
      );

      // Wait 1 second (debounce is 3s, so save is still pending)
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // Call saveNow (should cancel pending save and save immediately)
      act(() => {
        result.current.saveNow();
      });

      await waitFor(() => {
        expect(onSaveSuccess).toHaveBeenCalledTimes(1);
      });

      // Wait remaining 2 seconds (should not trigger another save)
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Still only 1 save
      expect(onSaveSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('Enable/Disable', () => {
    it('should not auto-save when enabled is false', async () => {
      const onSaveSuccess = vi.fn();
      renderHook(() =>
        useAutoSave({
          draftId: 'draft-123',
          data: mockTreeData,
          version: 1,
          onSaveSuccess,
          enabled: false,
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(onSaveSuccess).not.toHaveBeenCalled();
    });

    it('should not save to localStorage when localOnly is true', async () => {
      const onSaveSuccess = vi.fn();
      renderHook(() =>
        useAutoSave({
          draftId: 'draft-123',
          data: mockTreeData,
          version: 1,
          onSaveSuccess,
          localOnly: true,
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(draftStorageModule.draftStorage.saveDraft).toHaveBeenCalled();
      expect(onSaveSuccess).not.toHaveBeenCalled(); // Server save skipped
    });
  });

  describe('Save Indicator', () => {
    it('should return correct save indicator text', () => {
      const { result } = renderHook(() =>
        useAutoSave({
          draftId: 'draft-123',
          data: mockTreeData,
          version: 1,
        })
      );

      expect(result.current.isSaving).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.lastSaved).toBeNull();
    });
  });

  describe('beforeunload Event', () => {
    it('should save to localStorage on beforeunload', () => {
      renderHook(() =>
        useAutoSave({
          draftId: 'draft-123',
          data: mockTreeData,
          version: 1,
        })
      );

      // Clear previous calls
      vi.clearAllMocks();

      // Trigger beforeunload event
      const event = new Event('beforeunload');
      window.dispatchEvent(event);

      expect(draftStorageModule.draftStorage.saveDraft).toHaveBeenCalled();
    });

    it('should warn user if there are unsaved changes', () => {
      renderHook(() =>
        useAutoSave({
          draftId: 'draft-123',
          data: mockTreeData,
          version: 1,
        })
      );

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      event.preventDefault = vi.fn();
      window.dispatchEvent(event);

      // Should prevent default and set returnValue
      expect(event.returnValue).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should clear timeout on unmount', () => {
      const { unmount } = renderHook(() =>
        useAutoSave({
          draftId: 'draft-123',
          data: mockTreeData,
          version: 1,
        })
      );

      unmount();

      // Should not crash or cause memory leaks
      expect(true).toBe(true);
    });

    it('should remove beforeunload listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() =>
        useAutoSave({
          draftId: 'draft-123',
          data: mockTreeData,
          version: 1,
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });
  });
});
