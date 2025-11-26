'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { IndicatorBuilderWizard } from '@/components/features/indicators/builder';
import { useIndicatorBuilderStore } from '@/store/useIndicatorBuilderStore';
import { useLoadDraft, useReleaseDraftLock } from '@/hooks/useIndicatorBuilder';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/useAuthStore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useGetLookupsGovernanceAreas } from '@sinag/shared';

/**
 * Hierarchical Indicator Builder Page
 *
 * Multi-step wizard for creating hierarchical indicator structures.
 *
 * Features:
 * - Create multiple indicators in a hierarchy (1, 1.1, 1.1.1, etc.)
 * - Visual tree editor with drag-drop
 * - Form schema builder
 * - Calculation schema builder
 * - Draft auto-save and resume
 * - Draft locking for concurrent edit prevention
 *
 * Routes:
 * - /mlgoo/indicators/builder - New indicator set
 * - /mlgoo/indicators/builder?draftId=xxx - Resume existing draft
 * - /mlgoo/indicators/builder?governanceAreaId=xxx - Pre-select governance area
 */
export default function IndicatorBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuthStore();

  // Get URL parameters
  const draftId = searchParams.get('draftId');
  const governanceAreaIdParam = searchParams.get('governanceAreaId');
  const governanceAreaId = governanceAreaIdParam ? parseInt(governanceAreaIdParam) : null;

  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Zustand store actions
  const { initializeTree, loadTree, resetTree } = useIndicatorBuilderStore();

  // Fetch governance areas
  const { data: governanceAreas = [], isLoading: isLoadingGovernanceAreas, error: governanceAreasError } = useGetLookupsGovernanceAreas();

  // Debug: Log governance areas
  React.useEffect(() => {
    if (governanceAreas) {
      console.log('Governance areas loaded:', governanceAreas);
    }
    if (governanceAreasError) {
      console.error('Error loading governance areas:', governanceAreasError);
    }
  }, [governanceAreas, governanceAreasError]);

  // Load draft if draftId is provided
  const {
    data: draft,
    isLoading: isLoadingDraft,
    isError: isDraftError,
    error: draftError,
  } = useLoadDraft(draftId, { enabled: !!draftId });

  // Release lock mutation
  const { mutate: releaseLock } = useReleaseDraftLock();

  /**
   * Initialize the builder
   * - If draftId: load existing draft
   * - If governanceAreaId: initialize with that area
   * - Otherwise: initialize empty
   */
  useEffect(() => {
    if (isInitialized) return;

    if (draftId) {
      // Wait for draft to load
      if (isLoadingDraft) return;

      if (isDraftError) {
        setLoadError(
          (draftError as any)?.message ||
          (draftError as any)?.detail ||
          'Failed to load draft'
        );
        setIsInitialized(true);
        return;
      }

      if (draft) {
        // Check if draft is locked by another user
        if (draft.locked_by_user_id && user && draft.locked_by_user_id !== user.id) {
          setLoadError(`This draft is currently being edited by another user.`);
          setIsInitialized(true);
          return;
        }

        // Load draft into store
        try {
          // Backend stores data as List[Dict[str, Any]], so we get the first element
          // which contains the tree state { nodes, rootIds, ... }
          const treeData = draft.data && draft.data.length > 0 ? draft.data[0] : null;

          if (!treeData) {
            setLoadError('Draft data is empty');
            setIsInitialized(true);
            return;
          }

          loadTree({
            nodes: new Map(Object.entries(treeData.nodes || {})),
            rootIds: Array.isArray(treeData.rootIds) ? treeData.rootIds : [],
            governanceAreaId: draft.governance_area_id,
            creationMode: draft.creation_mode,
            currentStep: draft.current_step,
            draftId: draft.id,
            version: draft.version,
          });
          setIsInitialized(true);

          toast({
            title: 'Draft loaded',
            description: `Resumed: ${draft.title || 'Untitled draft'}`,
          });
        } catch (error) {
          console.error('Failed to parse draft data:', error);
          setLoadError('Failed to parse draft data');
          setIsInitialized(true);
        }
      }
    } else {
      // Initialize new tree
      if (governanceAreaId) {
        initializeTree(governanceAreaId, 'incremental');
      } else {
        initializeTree(0, 'incremental'); // Will require governance area selection in wizard
      }
      setIsInitialized(true);
    }
  }, [
    draftId,
    governanceAreaId,
    draft,
    isLoadingDraft,
    isDraftError,
    draftError,
    isInitialized,
    initializeTree,
    loadTree,
    toast,
  ]);

  /**
   * Cleanup: Release draft lock when leaving page
   */
  useEffect(() => {
    return () => {
      if (draftId) {
        releaseLock({ draftId });
      }
      // Reset tree when unmounting to clean up state
      resetTree();
    };
  }, [draftId, releaseLock, resetTree]);

  /**
   * Handle wizard publish
   */
  const handlePublish = () => {
    toast({
      title: 'Success!',
      description: 'Indicators have been published successfully.',
    });

    // Navigate back to indicators list
    router.push('/mlgoo/indicators');
  };

  /**
   * Handle wizard exit
   */
  const handleExit = () => {
    // Release lock if editing draft
    if (draftId) {
      releaseLock({ draftId });
    }

    // Navigate back
    router.push('/mlgoo/indicators');
  };

  /**
   * Loading state
   */
  if (isLoadingDraft || isLoadingGovernanceAreas) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            {isLoadingDraft ? 'Loading draft...' : 'Loading governance areas...'}
          </p>
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (loadError) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => router.push('/mlgoo/indicators')}>
            Back to Indicators
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setLoadError(null);
              setIsInitialized(false);
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  /**
   * Main render: Wizard
   */
  if (!isInitialized) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Initializing builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-6">
      {Boolean(governanceAreasError) && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Governance Areas</AlertTitle>
          <AlertDescription>
            {String(governanceAreasError)}
          </AlertDescription>
        </Alert>
      )}
      <IndicatorBuilderWizard
        governanceAreas={governanceAreas}
        onPublish={handlePublish}
        onExit={handleExit}
      />
    </div>
  );
}
