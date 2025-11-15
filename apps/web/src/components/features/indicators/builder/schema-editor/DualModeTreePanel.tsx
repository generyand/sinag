'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit2, Check, Navigation, Settings } from 'lucide-react';
import { IndicatorNavigator } from './IndicatorNavigator';
import { IndicatorTreeView } from '../IndicatorTreeView';
import { useIndicatorBuilderStore } from '@/store/useIndicatorBuilderStore';
import { cn } from '@/lib/utils';

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
      return newMode;
    });
  };

  // Sync tree edit mode to store when treeMode changes
  useEffect(() => {
    setTreeEditModeActive(treeMode === 'edit');
  }, [treeMode, setTreeEditModeActive]);

  return (
    <div className="h-full flex flex-col border-r bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 shadow-lg dark:border-gray-700">
      {/* Header with Mode Toggle - Golden Theme */}
      <div className="p-4 border-b bg-white dark:bg-gray-800 dark:border-gray-700 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base tracking-tight dark:text-gray-100">Indicators</h3>
            {/* Mode indicator badge with golden accent */}
            <Badge
              variant={treeMode === 'edit' ? 'default' : 'secondary'}
              className={cn(
                "text-xs px-2 py-1 font-semibold transition-all duration-300",
                treeMode === 'edit' ? "bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-black" : "dark:bg-gray-700 dark:text-gray-300"
              )}
            >
              {treeMode === 'edit' ? (
                <>
                  <Edit2 className="h-3 w-3 mr-1" />
                  Editing
                </>
              ) : (
                <>
                  <Settings className="h-3 w-3 mr-1" />
                  Configuring
                </>
              )}
            </Badge>
          </div>
          <Button
            size="sm"
            variant={treeMode === 'edit' ? 'default' : 'outline'}
            onClick={handleToggleMode}
            className={cn(
              "h-9 text-xs font-semibold transition-all duration-300 hover:scale-105",
              treeMode === 'edit'
                ? "bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706] text-black shadow-md hover:shadow-lg"
                : "border-2 hover:border-[#fbbf24] dark:border-gray-600 dark:text-gray-200"
            )}
          >
            {treeMode === 'edit' ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Done Editing
              </>
            ) : (
              <>
                <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                Edit Structure
              </>
            )}
          </Button>
        </div>

        {/* Enhanced Progress Bar with Golden Gradient */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-600 dark:text-gray-400">Configuration Progress</span>
            <span className="font-bold text-[#fbbf24]">{progress.complete}/{progress.total}</span>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#d97706] h-2.5 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Contextual help text with golden accent */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-gradient-to-r from-[#fbbf24]/5 to-[#f59e0b]/5 dark:from-[#fbbf24]/10 dark:to-[#f59e0b]/10 border border-[#fbbf24]/20 dark:border-[#fbbf24]/30">
          <Navigation className="h-4 w-4 text-[#fbbf24] flex-shrink-0 mt-0.5" />
          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
            {treeMode === 'navigate'
              ? 'Click indicators to configure schemas'
              : 'Add, remove, or reorder indicators'}
          </span>
        </div>
      </div>

      <Separator className="bg-[#fbbf24]/20 dark:bg-[#fbbf24]/30" />

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

      {/* Footer Help Text with Golden Theme */}
      <div className="p-4 border-t bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 dark:border-gray-700">
        <div className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center flex-shrink-0">
            {treeMode === 'navigate' ? (
              <Settings className="h-3.5 w-3.5 text-black" />
            ) : (
              <Edit2 className="h-3.5 w-3.5 text-black" />
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            {treeMode === 'navigate' ? (
              <>
                <strong className="text-[#fbbf24]">Tip:</strong> Click "Edit Structure" to add or reorder indicators
              </>
            ) : (
              <>
                <strong className="text-[#fbbf24]">Edit Mode:</strong> Drag to reorder • Right-click for more actions
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
