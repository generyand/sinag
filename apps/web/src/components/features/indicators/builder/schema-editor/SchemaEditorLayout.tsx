'use client';

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIndicatorBuilderStore } from '@/store/useIndicatorBuilderStore';
import { useSchemaNavigation } from '@/hooks/useSchemaNavigation';
import { useAutoSaveDelta } from '@/hooks/useAutoSaveDelta';
import { DualModeTreePanel } from './DualModeTreePanel';
import { SchemaEditorPanel } from './SchemaEditorPanel';

/**
 * SchemaEditorLayout Component
 *
 * Main container for the split-pane schema configuration interface.
 * Provides persistent tree view + schema editor with responsive layout.
 *
 * Layout:
 * - Desktop/Tablet (≥768px): 30/70 split pane (tree left, editor right)
 * - Mobile (<768px): Drawer for tree + full-width editor
 *
 * Features:
 * - Click-to-switch navigation between indicators
 * - Progress tracking in tree footer
 * - Status icons (complete, incomplete, error, current)
 * - Auto-save on indicator switch
 */
export function SchemaEditorLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Get state from Zustand store
  const tree = useIndicatorBuilderStore(state => state.tree);
  const currentSchemaIndicatorId = useIndicatorBuilderStore(
    state => state.currentSchemaIndicatorId
  );
  const getSchemaProgress = useIndicatorBuilderStore(
    state => state.getSchemaProgress
  );
  const autoSave = useIndicatorBuilderStore(state => state.autoSave);
  const markSchemaSaved = useIndicatorBuilderStore(state => state.markSchemaSaved);
  const isTreeEditModeActive = useIndicatorBuilderStore(state => state.isTreeEditModeActive);

  const progress = getSchemaProgress();

  // Delta-based auto-save (paused during tree edit mode)
  const { isSaving, saveNow, pendingCount } = useAutoSaveDelta({
    draftId: tree.draftId,
    data: tree,
    dirtyIndicatorIds: autoSave.dirtySchemas,
    version: tree.version,
    onDirtyClear: (indicatorIds) => {
      // Clear dirty flags after successful save
      indicatorIds.forEach(id => markSchemaSaved(id));
    },
    onVersionUpdate: (newVersion) => {
      // Update version in store after save
      // TODO: Add updateVersion action to Zustand store
      console.log('[Auto-save] Version updated to:', newVersion);
    },
    onSaveSuccess: () => {
      console.log('[Auto-save] Delta save successful');
    },
    onSaveError: (error) => {
      console.error('[Auto-save] Delta save failed:', error);
    },
    debounceMs: 3000,
    // Disable auto-save when actively editing tree structure
    enabled: !isTreeEditModeActive,
  });

  // Enable keyboard navigation
  const {
    goToNext,
    goToPrevious,
    hasNext,
    hasPrevious,
    navigateTo,
  } = useSchemaNavigation({
    enabled: true,
    onNavigate: () => {
      setMobileNavOpen(false); // Close mobile drawer on navigation
    },
    onSave: () => {
      // Trigger immediate save on Ctrl+S
      saveNow();
    },
  });

  const handleNavigate = (indicatorId: string) => {
    navigateTo(indicatorId);
  };

  return (
    <>
      {/* Desktop/Tablet: Split Pane Layout */}
      <div className="hidden md:grid md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr] gap-4 h-full">
        {/* Left Panel: Dual-Mode Tree (Navigate + Edit) */}
        <DualModeTreePanel
          currentIndicatorId={currentSchemaIndicatorId}
          onNavigate={handleNavigate}
        />

        {/* Right Panel: Schema Editor */}
        <div className="overflow-hidden">
          <SchemaEditorPanel indicatorId={currentSchemaIndicatorId} />
        </div>
      </div>

      {/* Mobile: Drawer + Editor Layout */}
      <div className="flex flex-col md:hidden h-full">
        {/* Header with drawer trigger */}
        <div className="flex items-center justify-between gap-2 p-4 border-b bg-muted/20 shrink-0">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4 mr-2" />
                Indicators ({progress.complete}/{progress.total})
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
              <DualModeTreePanel
                currentIndicatorId={currentSchemaIndicatorId}
                onNavigate={handleNavigate}
              />
            </SheetContent>
          </Sheet>

          {/* Auto-save status (mobile) */}
          {pendingCount > 0 && (
            <div className="text-xs text-muted-foreground">
              {isSaving ? 'Saving...' : `${pendingCount} unsaved`}
            </div>
          )}
        </div>

        {/* Editor panel (full width on mobile) */}
        <div className="flex-1 overflow-hidden">
          <SchemaEditorPanel indicatorId={currentSchemaIndicatorId} />
        </div>
      </div>
    </>
  );
}
