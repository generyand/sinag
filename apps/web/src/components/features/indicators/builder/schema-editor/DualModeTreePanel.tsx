'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit2, Check, Navigation, Settings } from 'lucide-react';
import { IndicatorNavigator } from './IndicatorNavigator';
import { IndicatorTreeView } from '../IndicatorTreeView';
import { useIndicatorBuilderStore } from '@/store/useIndicatorBuilderStore';

/**
 * DualModeTreePanel Component
 *
 * Supports two modes with contextual smart defaulting:
 * - Navigate Mode: Read-only tree with status icons for schema configuration
 * - Edit Mode: Full tree editing with add/delete/reorder/drag-drop
 *
 * Default mode selection:
 * - Empty tree → Edit Mode (ready to add indicators immediately)
 * - Populated tree → Navigate Mode (ready to configure schemas)
 *
 * This allows users to quickly switch between navigating indicators
 * and editing the tree structure without leaving the schema configuration screen.
 */

interface DualModeTreePanelProps {
  currentIndicatorId: string | null;
  onNavigate: (indicatorId: string) => void;
}

export function DualModeTreePanel({ currentIndicatorId, onNavigate }: DualModeTreePanelProps) {
  const tree = useIndicatorBuilderStore(state => state.tree);
  const getSchemaProgress = useIndicatorBuilderStore(state => state.getSchemaProgress);
  const setTreeEditModeActive = useIndicatorBuilderStore(state => state.setTreeEditModeActive);
  const progress = getSchemaProgress();

  /**
   * Contextual smart defaulting:
   * - Empty tree → Edit Mode (ready to add)
   * - Populated tree → Navigate Mode (ready to configure)
   */
  const determineInitialMode = (): 'navigate' | 'edit' => {
    return tree.nodes.size === 0 ? 'edit' : 'navigate';
  };

  const [treeMode, setTreeMode] = useState<'navigate' | 'edit'>(determineInitialMode);

  // Sync tree edit mode state to store after mount (not during render)
  useEffect(() => {
    const initialMode = determineInitialMode();
    // Use setTimeout to defer store update until after render
    const timer = setTimeout(() => {
      setTreeEditModeActive(initialMode === 'edit');
    }, 0);
    return () => clearTimeout(timer);
  }, []); // Run once on mount

  const handleToggleMode = () => {
    setTreeMode(prev => {
      const newMode = prev === 'navigate' ? 'edit' : 'navigate';
      // Notify store to pause/resume auto-save
      setTreeEditModeActive(newMode === 'edit');
      return newMode;
    });
  };

  return (
    <div className="h-full flex flex-col border-r bg-muted/20">
      {/* Header with Mode Toggle */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Indicators</h3>
            {/* Mode indicator badge */}
            <Badge
              variant={treeMode === 'edit' ? 'default' : 'secondary'}
              className="text-[10px] px-1.5 py-0.5"
            >
              {treeMode === 'edit' ? (
                <>
                  <Edit2 className="h-2.5 w-2.5 mr-1" />
                  Editing
                </>
              ) : (
                <>
                  <Settings className="h-2.5 w-2.5 mr-1" />
                  Configuring
                </>
              )}
            </Badge>
          </div>
          <Button
            size="sm"
            variant={treeMode === 'edit' ? 'default' : 'outline'}
            onClick={handleToggleMode}
            className="h-8 text-xs"
          >
            {treeMode === 'edit' ? (
              <>
                <Check className="h-3 w-3 mr-1.5" />
                Done Editing
              </>
            ) : (
              <>
                <Edit2 className="h-3 w-3 mr-1.5" />
                Edit Structure
              </>
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Configuration Progress</span>
            <span className="font-medium">{progress.complete}/{progress.total}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Contextual help text */}
        <div className="text-xs text-muted-foreground">
          {treeMode === 'navigate'
            ? 'Click indicators to configure schemas'
            : 'Add, remove, or reorder indicators'}
        </div>
      </div>

      <Separator />

      {/* Tree View - Switches between modes */}
      <div className="flex-1 overflow-hidden">
        {treeMode === 'navigate' ? (
          <IndicatorNavigator
            currentIndicatorId={currentIndicatorId}
            onNavigate={onNavigate}
          />
        ) : (
          <div className="h-full p-4">
            <IndicatorTreeView height="100%" />
          </div>
        )}
      </div>

      {/* Footer Help Text */}
      <div className="p-3 border-t bg-muted/50">
        <p className="text-xs text-muted-foreground">
          {treeMode === 'navigate' ? (
            <>
              <strong>Tip:</strong> Click "Edit Structure" to add or reorder indicators
            </>
          ) : (
            <>
              <strong>Edit Mode:</strong> Drag to reorder • Right-click for more actions
            </>
          )}
        </p>
      </div>
    </div>
  );
}
