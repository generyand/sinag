'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Download, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Conflict Resolution Dialog
 *
 * Handles optimistic locking conflicts when draft versions mismatch.
 * Displays conflict information and resolution options.
 *
 * Features:
 * - Shows conflict timestamp and user
 * - Three resolution options:
 *   1. Keep my changes (overwrite server)
 *   2. Use server version (discard local)
 *   3. View differences (optional for Phase 1)
 * - Clear visual feedback for each option
 */

// ============================================================================
// Types
// ============================================================================

export interface ConflictInfo {
  /** Server draft version */
  serverVersion: number;

  /** Local draft version */
  localVersion: number;

  /** Timestamp when conflict occurred */
  conflictTimestamp: string;

  /** User who made the conflicting change (if available) */
  conflictingUser?: {
    id: number;
    name: string;
    email: string;
  };

  /** Server draft data (for comparison/viewing) */
  serverData?: any;

  /** Local draft data (for comparison/viewing) */
  localData?: any;
}

export interface ConflictResolutionDialogProps {
  /** Whether dialog is open */
  open: boolean;

  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;

  /** Conflict information */
  conflictInfo: ConflictInfo | null;

  /** Callback when user chooses to keep local changes */
  onKeepLocalChanges: () => void;

  /** Callback when user chooses to use server version */
  onUseServerVersion: () => void;

  /** Callback when user wants to view differences (optional) */
  onViewDifferences?: () => void;

  /** Whether showing differences is supported */
  supportsDiffView?: boolean;

  /** Whether an action is currently loading */
  isLoading?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format relative time for conflict timestamp
 */
function formatConflictTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `on ${date.toLocaleString()}`;
  }
}

// ============================================================================
// Component
// ============================================================================

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflictInfo,
  onKeepLocalChanges,
  onUseServerVersion,
  onViewDifferences,
  supportsDiffView = false,
  isLoading = false,
}: ConflictResolutionDialogProps) {
  if (!conflictInfo) return null;

  const conflictTimeFormatted = formatConflictTime(conflictInfo.conflictTimestamp);
  const conflictingUserName = conflictInfo.conflictingUser?.name || 'Another user';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-xl">
                Version Conflict Detected
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                The draft was modified by {conflictingUserName}{' '}
                {conflictTimeFormatted}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Conflict Information */}
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/30 dark:bg-yellow-900/10">
            <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
              What happened?
            </h4>
            <p className="mt-2 text-sm text-yellow-800 dark:text-yellow-200">
              While you were editing this draft, {conflictingUserName} made changes
              to it. Your version (v{conflictInfo.localVersion}) conflicts with the
              server version (v{conflictInfo.serverVersion}).
            </p>
            <p className="mt-2 text-sm text-yellow-800 dark:text-yellow-200">
              Choose how to resolve this conflict:
            </p>
          </div>

          {/* Resolution Options */}
          <div className="space-y-3">
            {/* Option 1: Keep my changes */}
            <button
              onClick={() => {
                onKeepLocalChanges();
                onOpenChange(false);
              }}
              disabled={isLoading}
              className={cn(
                'flex w-full items-start gap-4 rounded-lg border-2 p-4 text-left transition-all',
                'hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
                'border-border bg-background'
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold">Keep my changes</h5>
                <p className="mt-1 text-sm text-muted-foreground">
                  Overwrite the server version with your local changes. The other
                  user's changes will be lost.
                </p>
              </div>
            </button>

            {/* Option 2: Use server version */}
            <button
              onClick={() => {
                onUseServerVersion();
                onOpenChange(false);
              }}
              disabled={isLoading}
              className={cn(
                'flex w-full items-start gap-4 rounded-lg border-2 p-4 text-left transition-all',
                'hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
                'border-border bg-background'
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold">Use server version</h5>
                <p className="mt-1 text-sm text-muted-foreground">
                  Discard your local changes and use the version from the server.
                  Your changes will be lost.
                </p>
              </div>
            </button>

            {/* Option 3: View differences (optional) */}
            {supportsDiffView && onViewDifferences && (
              <button
                onClick={() => {
                  onViewDifferences();
                  // Keep dialog open to show diff view
                }}
                disabled={isLoading}
                className={cn(
                  'flex w-full items-start gap-4 rounded-lg border-2 p-4 text-left transition-all',
                  'hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
                  'border-border bg-background'
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold">View differences</h5>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Compare your changes with the server version side-by-side before
                    deciding.
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Warning Notice */}
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">
              <strong>Important:</strong> Auto-save is paused during conflict
              resolution. Choose an option to continue working.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel (Keep Local Only)
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// Hook for Conflict Handling
// ============================================================================

/**
 * Hook to manage conflict resolution state
 *
 * @example
 * ```tsx
 * const conflict = useConflictResolution({
 *   onResolveKeepLocal: async () => {
 *     await forceUpdateDraft(localData);
 *   },
 *   onResolveUseServer: async () => {
 *     const serverDraft = await fetchLatestDraft();
 *     loadDraft(serverDraft);
 *   },
 * });
 *
 * // In useAutoSave:
 * useAutoSave({
 *   onVersionConflict: () => {
 *     conflict.showConflict({
 *       serverVersion: 5,
 *       localVersion: 4,
 *       conflictTimestamp: new Date().toISOString(),
 *     });
 *   },
 * });
 * ```
 */
export function useConflictResolution({
  onResolveKeepLocal,
  onResolveUseServer,
  onResolveViewDiff,
}: {
  onResolveKeepLocal: () => Promise<void> | void;
  onResolveUseServer: () => Promise<void> | void;
  onResolveViewDiff?: () => void;
}) {
  const [conflictInfo, setConflictInfo] = React.useState<ConflictInfo | null>(null);
  const [isResolving, setIsResolving] = React.useState(false);

  const showConflict = React.useCallback((info: ConflictInfo) => {
    setConflictInfo(info);
  }, []);

  const hideConflict = React.useCallback(() => {
    setConflictInfo(null);
    setIsResolving(false);
  }, []);

  const handleKeepLocal = React.useCallback(async () => {
    setIsResolving(true);
    try {
      await onResolveKeepLocal();
      hideConflict();
    } catch (error) {
      console.error('Failed to keep local changes:', error);
      setIsResolving(false);
    }
  }, [onResolveKeepLocal, hideConflict]);

  const handleUseServer = React.useCallback(async () => {
    setIsResolving(true);
    try {
      await onResolveUseServer();
      hideConflict();
    } catch (error) {
      console.error('Failed to use server version:', error);
      setIsResolving(false);
    }
  }, [onResolveUseServer, hideConflict]);

  const handleViewDiff = React.useCallback(() => {
    onResolveViewDiff?.();
  }, [onResolveViewDiff]);

  return {
    conflictInfo,
    isResolving,
    showConflict,
    hideConflict,
    handleKeepLocal,
    handleUseServer,
    handleViewDiff,
  };
}
