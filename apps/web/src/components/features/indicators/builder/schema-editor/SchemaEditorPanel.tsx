'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, Clock, Eye, FileText, ChevronLeft, ChevronRight, Keyboard, Info, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIndicatorBuilderStore } from '@/store/useIndicatorBuilderStore';
import { useSchemaNavigation } from '@/hooks/useSchemaNavigation';
import { useMOVValidation } from '@/hooks/useMOVValidation';
import { BasicInfoTab } from './BasicInfoTab';
import { CalculationTab } from './CalculationTab';
import { PreviewTab } from './PreviewTab';
import MOVChecklistBuilder from '../MOVChecklistBuilder';
import { ParentAggregateDashboard } from './ParentAggregateDashboard';
import { MOVChecklistConfig } from '@/types/mov-checklist';

/**
 * SchemaEditorPanel Component
 *
 * Right-side panel for editing indicator properties.
 * Provides tabbed interface per indicator-builder-specification.md lines 1714-1738:
 * 1. Basic Info Tab - Code, name, description, parent, display order
 * 2. Calculation Tab - auto_calc_method, logical_operator, selection_mode, BBI association
 * 3. MOV Checklist Tab - Structured JSONB checklist for validator verification
 * 4. Preview Tab - Live preview of BLGU/Validator views
 *
 * Features:
 * - Tab navigation between property types
 * - Real-time validation and auto-save status
 * - Empty state when no indicator selected
 * - Parent aggregate dashboard for parent indicators
 */

interface SchemaEditorPanelProps {
  indicatorId: string | null;
}

export function SchemaEditorPanel({ indicatorId }: SchemaEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<'basic_info' | 'calculation' | 'mov_checklist' | 'preview'>('basic_info');
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  const getNodeById = useIndicatorBuilderStore(state => state.getNodeById);
  const updateNode = useIndicatorBuilderStore(state => state.updateNode);
  const tree = useIndicatorBuilderStore(state => state.tree);
  const autoSave = useIndicatorBuilderStore(state => state.autoSave);
  const markSchemaDirty = useIndicatorBuilderStore(state => state.markSchemaDirty);

  // Parent/leaf detection
  const isLeafIndicator = useIndicatorBuilderStore(state => state.isLeafIndicator);
  const getParentStatusInfo = useIndicatorBuilderStore(state => state.getParentStatusInfo);
  const getDescendantLeavesOf = useIndicatorBuilderStore(state => state.getDescendantLeavesOf);
  const navigateToIndicator = useIndicatorBuilderStore(state => state.navigateToIndicator);
  const navigateToNextIncomplete = useIndicatorBuilderStore(state => state.navigateToNextIncomplete);

  const indicator = indicatorId ? getNodeById(indicatorId) : null;
  const isSaving = indicatorId ? autoSave.savingSchemas.has(indicatorId) : false;
  const lastSaved = indicatorId ? autoSave.lastSaved.get(indicatorId) : null;

  const isLeaf = indicatorId ? isLeafIndicator(indicatorId) : false;
  const parentStatus = indicatorId && !isLeaf ? getParentStatusInfo(indicatorId) : null;
  const leafIndicators = indicatorId && !isLeaf ? getDescendantLeavesOf(indicatorId) : [];

  // Navigation hook for keyboard shortcuts and prev/next
  const {
    goToNext,
    goToPrevious,
    hasNext,
    hasPrevious,
  } = useSchemaNavigation({ enabled: true });

  // MOV Checklist validation
  const movChecklistConfig = indicator?.mov_checklist_items as unknown as MOVChecklistConfig | undefined;
  const movValidation = useMOVValidation(movChecklistConfig);
  const movChecklistComplete = movChecklistConfig?.items && movChecklistConfig.items.length > 0 && movValidation.isValid;

  // Get available parents (all nodes except self and descendants)
  const availableParents = React.useMemo(() => {
    if (!indicator) return [];
    const parents: Array<{ id: string; code: string; name: string }> = [];
    tree.nodes.forEach((node, id) => {
      if (id !== indicatorId && id !== indicator.parent_temp_id) {
        // Exclude self; TODO: also exclude descendants to prevent circular references
        parents.push({
          id,
          code: node.code || '',
          name: node.name,
        });
      }
    });
    return parents;
  }, [indicator, indicatorId, tree.nodes]);

  // TODO: Fetch available BBIs from API
  const availableBBIs = React.useMemo(() => {
    // Placeholder: In production, fetch from API
    return [
      { id: 1, code: 'BDRRMC', name: 'Barangay Disaster Risk Reduction and Management Committee' },
      { id: 2, code: 'BADAC', name: 'Barangay Anti-Drug Abuse Council' },
      { id: 3, code: 'BPOC', name: 'Barangay Peace and Order Committee' },
      { id: 4, code: 'LT', name: 'Lupong Tagapamayapa' },
      { id: 5, code: 'VAW', name: 'Barangay Violence Against Women Desk' },
      { id: 6, code: 'BDC', name: 'Barangay Development Council' },
      { id: 7, code: 'BCPC', name: 'Barangay Council for the Protection of Children' },
      { id: 8, code: 'BNC', name: 'Barangay Nutrition Committee' },
      { id: 9, code: 'BESWMC', name: 'Barangay Ecological Solid Waste Management Committee' },
    ];
  }, []);

  // Check if indicator has children
  const hasChildren = React.useMemo(() => {
    if (!indicator) return false;
    let childCount = 0;
    tree.nodes.forEach((node) => {
      if (node.parent_temp_id === indicatorId) childCount++;
    });
    return childCount > 0;
  }, [indicator, indicatorId, tree.nodes]);

  // Reset to basic_info tab when indicator changes
  useEffect(() => {
    setActiveTab('basic_info');
  }, [indicatorId]);

  // Show empty state if no indicator selected
  if (!indicatorId || !indicator) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center max-w-md space-y-6 animate-in fade-in duration-500">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center shadow-2xl">
            <FileText className="h-12 w-12 text-black" />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">No Indicator Selected</h3>
            <p className="text-base text-muted-foreground dark:text-gray-400 leading-relaxed">
              Select an indicator from the tree navigator to configure its properties.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show parent aggregate dashboard for parent indicators
  if (!isLeaf && parentStatus) {
    return (
      <ParentAggregateDashboard
        indicator={indicator}
        parentStatus={parentStatus}
        leafIndicators={leafIndicators}
        onNavigateToIndicator={navigateToIndicator}
        onNavigateToNextIncomplete={navigateToNextIncomplete}
      />
    );
  }

  // Format last saved time
  const getLastSavedText = () => {
    if (!lastSaved) return 'Not saved';
    const seconds = Math.floor((Date.now() - lastSaved) / 1000);
    if (seconds < 5) return 'Saved just now';
    if (seconds < 60) return `Saved ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Saved ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `Saved ${hours}h ago`;
  };

  // Handle updates with dirty marking
  const handleUpdate = (updates: Partial<typeof indicator>) => {
    if (indicatorId) {
      updateNode(indicatorId, updates);
      markSchemaDirty(indicatorId);
    }
  };

  const handleMOVChecklistChange = (config: MOVChecklistConfig) => {
    if (indicatorId) {
      updateNode(indicatorId, { mov_checklist_items: config as unknown as Record<string, any> });
      markSchemaDirty(indicatorId);
    }
  };

  // Tab completion status
  const basicInfoComplete = !!(indicator.name && indicator.description);
  // TODO: Update when spec-aligned calculation properties are added to IndicatorNode
  const calculationComplete = indicator.is_auto_calculable !== undefined;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header with Golden Theme */}
      <div className="shrink-0 border-b bg-white dark:bg-gray-800 dark:border-gray-700 shadow-md p-5 space-y-4">
        {/* Indicator Title */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {indicator.code && (
                <Badge
                  variant="outline"
                  className="font-mono text-xs shrink-0 bg-gradient-to-r from-[#fbbf24]/10 to-[#f59e0b]/10 dark:from-[#fbbf24]/20 dark:to-[#f59e0b]/20 border-[#fbbf24] text-[#b45309] dark:text-[#fbbf24] font-bold px-2 py-1"
                >
                  {indicator.code}
                </Badge>
              )}
              <h2 className="text-xl font-extrabold tracking-tight truncate text-gray-900 dark:text-gray-100">{indicator.name}</h2>
            </div>
            {indicator.description && (
              <p className="text-sm text-muted-foreground dark:text-gray-400 line-clamp-2 leading-relaxed">
                {indicator.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4 shrink-0">
            <TabsTrigger value="basic_info" className="flex items-center gap-2 data-[state=active]:text-[#b45309] dark:data-[state=active]:text-[#fbbf24]">
              <Info className="h-3 w-3" />
              Basic Info
              {basicInfoComplete && <Check className="h-3 w-3 text-green-600 dark:text-green-400" />}
            </TabsTrigger>
            <TabsTrigger value="calculation" className="flex items-center gap-2 data-[state=active]:text-[#b45309] dark:data-[state=active]:text-[#fbbf24]">
              <Calculator className="h-3 w-3" />
              Calculation
              {calculationComplete && <Check className="h-3 w-3 text-green-600 dark:text-green-400" />}
            </TabsTrigger>
            <TabsTrigger value="mov_checklist" className="flex items-center gap-2 data-[state=active]:text-[#b45309] dark:data-[state=active]:text-[#fbbf24]">
              <FileText className="h-3 w-3" />
              MOV Checklist
              {movChecklistComplete && <Check className="h-3 w-3 text-green-600 dark:text-green-400" />}
              {!movValidation.isValid && movChecklistConfig?.items && movChecklistConfig.items.length > 0 && (
                <Badge variant="destructive" className="text-[10px] py-0">
                  {movValidation.errors.length}
                </Badge>
              )}
              {movValidation.warnings.length > 0 && movChecklistConfig?.items && movChecklistConfig.items.length > 0 && movValidation.isValid && (
                <Badge variant="outline" className="text-[10px] py-0 bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-600">
                  {movValidation.warnings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2 data-[state=active]:text-[#b45309] dark:data-[state=active]:text-[#fbbf24]">
              <Eye className="h-3 w-3" />
              Preview
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="basic_info" className="h-full mt-0 overflow-auto">
              {activeTab === 'basic_info' && (
                <BasicInfoTab
                  indicator={indicator}
                  availableParents={availableParents}
                  onUpdate={handleUpdate}
                />
              )}
            </TabsContent>

            <TabsContent value="calculation" className="h-full mt-0 overflow-auto">
              {activeTab === 'calculation' && (
                <CalculationTab
                  indicator={indicator}
                  availableBBIs={availableBBIs}
                  hasChildren={hasChildren}
                  onUpdate={handleUpdate}
                />
              )}
            </TabsContent>

            <TabsContent value="mov_checklist" className="h-full mt-0 overflow-hidden">
              {activeTab === 'mov_checklist' && (
                <MOVChecklistBuilder
                  value={movChecklistConfig}
                  onChange={handleMOVChecklistChange}
                  className="h-full"
                />
              )}
            </TabsContent>

            <TabsContent value="preview" className="h-full mt-0 overflow-auto">
              {activeTab === 'preview' && (
                <PreviewTab indicator={indicator} />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Footer with Golden Theme */}
      <div className="shrink-0 border-t bg-white dark:bg-gray-800 dark:border-gray-700 shadow-lg p-4 space-y-3">
        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="default"
              onClick={goToPrevious}
              disabled={!hasPrevious}
              title="Previous indicator (↑ or Alt+←)"
              className="border-2 hover:border-[#fbbf24] transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold dark:border-gray-600 dark:text-gray-200"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={goToNext}
              disabled={!hasNext}
              title="Next indicator (↓ or Alt+→)"
              className="border-2 hover:border-[#fbbf24] transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold dark:border-gray-600 dark:text-gray-200"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="default"
              onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
              title="Show keyboard shortcuts"
              className="text-xs hover:bg-[#fbbf24]/10 dark:hover:bg-[#fbbf24]/20 transition-all duration-300 dark:text-gray-200"
            >
              <Keyboard className="h-4 w-4 mr-1" />
              <span className="hidden md:inline font-semibold">Shortcuts</span>
            </Button>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        {showKeyboardShortcuts && (
          <div className="text-xs bg-gradient-to-r from-[#fbbf24]/5 to-[#f59e0b]/5 dark:from-[#fbbf24]/10 dark:to-[#f59e0b]/10 border border-[#fbbf24]/20 dark:border-[#fbbf24]/30 rounded-lg p-3 space-y-2">
            <div className="font-bold text-[#b45309] dark:text-[#fbbf24] mb-2">Keyboard Shortcuts:</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-gray-300">
              <div><kbd className="px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 rounded border border-[#fbbf24]/30 text-[10px] font-mono">↑</kbd> Previous indicator</div>
              <div><kbd className="px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 rounded border border-[#fbbf24]/30 text-[10px] font-mono">↓</kbd> Next indicator</div>
              <div><kbd className="px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 rounded border border-[#fbbf24]/30 text-[10px] font-mono">Ctrl/Cmd+N</kbd> Next incomplete</div>
              <div><kbd className="px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 rounded border border-[#fbbf24]/30 text-[10px] font-mono">Esc</kbd> Unfocus editor</div>
            </div>
          </div>
        )}

        {/* Status Row with Golden Accents */}
        <div className="flex items-center justify-between pt-2 border-t dark:border-gray-700">
          {/* Auto-save Status */}
          <div className="flex items-center gap-2 text-xs">
            {isSaving ? (
              <>
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center">
                  <Clock className="h-3 w-3 text-black animate-spin" />
                </div>
                <span className="font-semibold text-[#b45309] dark:text-[#fbbf24]">Saving...</span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span className="font-semibold text-green-700 dark:text-green-500">{getLastSavedText()}</span>
              </>
            )}
          </div>

          {/* MOV Validation Status */}
          <div className="flex items-center gap-2 text-xs">
            {movValidation.errors.length > 0 || movValidation.warnings.length > 0 ? (
              <>
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <AlertCircle className="h-3 w-3 text-white" />
                </div>
                <span className="font-semibold text-amber-700 dark:text-amber-500">
                  {movValidation.errors.length > 0 && `${movValidation.errors.length} error${movValidation.errors.length > 1 ? 's' : ''}`}
                  {movValidation.errors.length > 0 && movValidation.warnings.length > 0 && ', '}
                  {movValidation.warnings.length > 0 && `${movValidation.warnings.length} warning${movValidation.warnings.length > 1 ? 's' : ''}`}
                </span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span className="font-semibold text-green-700 dark:text-green-500">No errors</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}