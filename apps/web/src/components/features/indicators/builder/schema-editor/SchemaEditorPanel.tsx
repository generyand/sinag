'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, Clock, Copy, FileText, ChevronLeft, ChevronRight, Keyboard, Clipboard, ClipboardPaste } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIndicatorBuilderStore } from '@/store/useIndicatorBuilderStore';
import { useSchemaNavigation } from '@/hooks/useSchemaNavigation';
import { useAutoSchemaValidation } from '@/hooks/useSchemaValidation';
import { useSchemaCopyPaste } from '@/hooks/useSchemaCopyPaste';
import { FormSchemaBuilder } from '../FormSchemaBuilder';
import { CalculationSchemaBuilder } from '../CalculationSchemaBuilder';
import { RichTextEditor } from '../RichTextEditor';
import { ParentAggregateDashboard } from './ParentAggregateDashboard';
import MOVChecklistBuilder from '../MOVChecklistBuilder';
import { useMOVValidation } from '@/hooks/useMOVValidation';
import { MOVChecklistConfig } from '@/types/mov-checklist';

/**
 * SchemaEditorPanel Component
 *
 * Right-side panel for editing indicator schemas.
 * Provides tabbed interface for Form, Calculation, and Remark schemas.
 *
 * Features:
 * - Tab navigation between schema types
 * - Real-time validation and auto-save status
 * - Empty state when no indicator selected
 * - Integration with existing schema builders
 */

interface SchemaEditorPanelProps {
  indicatorId: string | null;
}

export function SchemaEditorPanel({ indicatorId }: SchemaEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'calculation' | 'remark' | 'mov_checklist'>('form');
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  const getNodeById = useIndicatorBuilderStore(state => state.getNodeById);
  const updateNode = useIndicatorBuilderStore(state => state.updateNode);
  const schemaStatus = useIndicatorBuilderStore(state => state.schemaStatus);
  const autoSave = useIndicatorBuilderStore(state => state.autoSave);
  const markSchemaDirty = useIndicatorBuilderStore(state => state.markSchemaDirty);

  // NEW: Leaf detection and parent status (Phase 6)
  const isLeafIndicator = useIndicatorBuilderStore(state => state.isLeafIndicator);
  const getParentStatusInfo = useIndicatorBuilderStore(state => state.getParentStatusInfo);
  const getDescendantLeavesOf = useIndicatorBuilderStore(state => state.getDescendantLeavesOf);
  const navigateToIndicator = useIndicatorBuilderStore(state => state.navigateToIndicator);
  const navigateToNextIncomplete = useIndicatorBuilderStore(state => state.navigateToNextIncomplete);

  const indicator = indicatorId ? getNodeById(indicatorId) : null;
  const status = indicatorId ? schemaStatus.get(indicatorId) : null;
  const isSaving = indicatorId ? autoSave.savingSchemas.has(indicatorId) : false;
  const lastSaved = indicatorId ? autoSave.lastSaved.get(indicatorId) : null;

  // NEW: Check if indicator is a leaf (Phase 6)
  const isLeaf = indicatorId ? isLeafIndicator(indicatorId) : false;
  const parentStatus = indicatorId && !isLeaf ? getParentStatusInfo(indicatorId) : null;
  const leafIndicators = indicatorId && !isLeaf ? getDescendantLeavesOf(indicatorId) : [];

  // Navigation hook for keyboard shortcuts and prev/next
  const {
    goToNext,
    goToPrevious,
    goToNextIncomplete,
    hasNext,
    hasPrevious,
    hasNextIncomplete,
  } = useSchemaNavigation({ enabled: true });

  // Validation hook - runs automatically on schema changes (debounced 500ms)
  const { errors, errorCount, warningCount, isValid } = useAutoSchemaValidation(indicatorId, 500);

  // Copy/paste hook with keyboard shortcuts (Ctrl+Shift+C/V)
  const { copy, paste, canPaste, copiedFrom } = useSchemaCopyPaste({
    indicatorId,
    activeTab,
  });

  // Reset to form tab when indicator changes
  useEffect(() => {
    setActiveTab('form');
  }, [indicatorId]);

  // Show empty state if no indicator selected
  if (!indicatorId || !indicator) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-4">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">No Indicator Selected</h3>
            <p className="text-sm text-muted-foreground">
              Select an indicator from the tree navigator to configure its schemas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // NEW: Show parent aggregate dashboard for parent indicators (Phase 6)
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

  // Handle schema updates with dirty marking
  const handleFormSchemaChange = (schema: any) => {
    if (indicatorId) {
      updateNode(indicatorId, { form_schema: schema });
      markSchemaDirty(indicatorId);
    }
  };

  const handleCalculationSchemaChange = (schema: any) => {
    if (indicatorId) {
      updateNode(indicatorId, { calculation_schema: schema });
      markSchemaDirty(indicatorId);
    }
  };

  const handleRemarkSchemaChange = (html: string) => {
    if (indicatorId) {
      updateNode(indicatorId, { remark_schema: { html } as Record<string, any> });
      markSchemaDirty(indicatorId);
    }
  };

  const handleMOVChecklistChange = (config: MOVChecklistConfig) => {
    if (indicatorId) {
      updateNode(indicatorId, { mov_checklist_items: config as unknown as Record<string, any> });
      markSchemaDirty(indicatorId);
    }
  };

  // Extract form fields for calculation builder
  const formFields = indicator.form_schema?.fields || [];

  // MOV Checklist validation
  const movChecklistConfig = indicator.mov_checklist_items as unknown as MOVChecklistConfig | undefined;
  const movValidation = useMOVValidation(movChecklistConfig);
  const movChecklistComplete = movChecklistConfig?.items && movChecklistConfig.items.length > 0 && movValidation.isValid;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b bg-muted/20 p-4 space-y-3">
        {/* Indicator Title */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {indicator.code && (
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {indicator.code}
                </Badge>
              )}
              <h2 className="text-lg font-semibold truncate">{indicator.name}</h2>
            </div>
            {indicator.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {indicator.description}
              </p>
            )}
          </div>

          {/* Action Buttons: Copy/Paste */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={copy}
              title={`Copy ${activeTab} schema (Ctrl+Shift+C)`}
            >
              <Clipboard className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={paste}
              disabled={!canPaste}
              title={
                canPaste
                  ? `Paste ${activeTab} schema from ${copiedFrom} (Ctrl+Shift+V)`
                  : copiedFrom
                  ? `Cannot paste ${copiedFrom.split(' (')[1]?.replace(')', '')} schema into ${activeTab} tab`
                  : 'No schema copied (Ctrl+Shift+C to copy)'
              }
            >
              <ClipboardPaste className="h-4 w-4 mr-1" />
              Paste
            </Button>
          </div>
        </div>

        {/* Tab Completion Status */}
        <div className="flex items-center gap-3">
          <TabCompletionBadge
            label="Form"
            isComplete={status?.formComplete || false}
            isActive={activeTab === 'form'}
            onClick={() => setActiveTab('form')}
          />
          <TabCompletionBadge
            label="Calculation"
            isComplete={status?.calculationComplete || false}
            isActive={activeTab === 'calculation'}
            onClick={() => setActiveTab('calculation')}
          />
          <TabCompletionBadge
            label="Remark"
            isComplete={status?.remarkComplete || false}
            isActive={activeTab === 'remark'}
            onClick={() => setActiveTab('remark')}
          />
          <TabCompletionBadge
            label="MOV Checklist"
            isComplete={movChecklistComplete || false}
            isActive={activeTab === 'mov_checklist'}
            onClick={() => setActiveTab('mov_checklist')}
            validationBadge={
              !movValidation.isValid && movChecklistConfig?.items && movChecklistConfig.items.length > 0 ? (
                <Badge variant="destructive" className="text-[10px] py-0 ml-1">
                  {movValidation.errors.length}
                </Badge>
              ) : movValidation.warnings.length > 0 && movChecklistConfig?.items && movChecklistConfig.items.length > 0 ? (
                <Badge variant="outline" className="text-[10px] py-0 ml-1 bg-yellow-500/10 text-yellow-700 border-yellow-300">
                  {movValidation.warnings.length}
                </Badge>
              ) : undefined
            }
          />
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4 shrink-0">
            <TabsTrigger value="form" className="flex items-center gap-2">
              Form Schema
              {status?.formComplete && <Check className="h-3 w-3 text-green-600" />}
            </TabsTrigger>
            <TabsTrigger value="calculation" className="flex items-center gap-2">
              Calculation Schema
              {status?.calculationComplete && <Check className="h-3 w-3 text-green-600" />}
            </TabsTrigger>
            <TabsTrigger value="remark" className="flex items-center gap-2">
              Remark Template
              {status?.remarkComplete && <Check className="h-3 w-3 text-green-600" />}
            </TabsTrigger>
            <TabsTrigger value="mov_checklist" className="flex items-center gap-2">
              MOV Checklist
              {movChecklistComplete && <Check className="h-3 w-3 text-green-600" />}
              {!movValidation.isValid && movChecklistConfig?.items && movChecklistConfig.items.length > 0 && (
                <Badge variant="destructive" className="text-[10px] py-0">
                  {movValidation.errors.length}
                </Badge>
              )}
              {movValidation.warnings.length > 0 && movChecklistConfig?.items && movChecklistConfig.items.length > 0 && movValidation.isValid && (
                <Badge variant="outline" className="text-[10px] py-0 bg-yellow-500/10 text-yellow-700 border-yellow-300">
                  {movValidation.warnings.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden px-4 pb-4">
            <TabsContent value="form" className="h-full mt-4 overflow-auto">
              <FormSchemaBuilder
                value={indicator.form_schema as unknown as any}
                onChange={handleFormSchemaChange}
                className="h-full"
              />
            </TabsContent>

            <TabsContent value="calculation" className="h-full mt-4 overflow-auto">
              <CalculationSchemaBuilder
                value={indicator.calculation_schema as unknown as any}
                formFields={formFields}
                onChange={handleCalculationSchemaChange}
                className="h-full"
              />
            </TabsContent>

            <TabsContent value="remark" className="h-full mt-4 overflow-auto">
              <RichTextEditor
                value={(indicator.remark_schema as any)?.html || ''}
                onChange={handleRemarkSchemaChange}
                placeholder="Enter remark template for this indicator..."
                minHeight={400}
                className="h-full"
              />
            </TabsContent>

            <TabsContent value="mov_checklist" className="h-full mt-4 overflow-hidden">
              <MOVChecklistBuilder
                value={movChecklistConfig}
                onChange={handleMOVChecklistChange}
                className="h-full"
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t bg-muted/20 p-3 space-y-2">
        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevious}
              disabled={!hasPrevious}
              title="Previous indicator (↑ or Alt+←)"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNext}
              disabled={!hasNext}
              title="Next indicator (↓ or Alt+→)"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
              title="Show keyboard shortcuts"
              className="text-xs"
            >
              <Keyboard className="h-3 w-3 mr-1" />
              <span className="hidden md:inline">Shortcuts</span>
            </Button>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        {showKeyboardShortcuts && (
          <div className="text-xs bg-muted/50 rounded p-2 space-y-1">
            <div className="font-semibold mb-1">Keyboard Shortcuts:</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <div><kbd className="px-1 py-0.5 bg-background rounded border text-[10px]">↑</kbd> Previous indicator</div>
              <div><kbd className="px-1 py-0.5 bg-background rounded border text-[10px]">↓</kbd> Next indicator</div>
              <div><kbd className="px-1 py-0.5 bg-background rounded border text-[10px]">Ctrl/Cmd+N</kbd> Next incomplete</div>
              <div><kbd className="px-1 py-0.5 bg-background rounded border text-[10px]">Ctrl/Cmd+Shift+C</kbd> Copy schema</div>
              <div><kbd className="px-1 py-0.5 bg-background rounded border text-[10px]">Ctrl/Cmd+Shift+V</kbd> Paste schema</div>
              <div><kbd className="px-1 py-0.5 bg-background rounded border text-[10px]">Esc</kbd> Unfocus editor</div>
            </div>
          </div>
        )}

        {/* Status Row */}
        <div className="flex items-center justify-between">
          {/* Auto-save Status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isSaving ? (
              <>
                <Clock className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-green-600" />
                <span>{getLastSavedText()}</span>
              </>
            )}
          </div>

          {/* Validation Status */}
          <div className="flex items-center gap-2 text-xs">
            {errorCount > 0 || warningCount > 0 ? (
              <>
                <AlertCircle className="h-3 w-3 text-amber-600" />
                <span className="text-amber-600">
                  {errorCount > 0 && `${errorCount} error${errorCount > 1 ? 's' : ''}`}
                  {errorCount > 0 && warningCount > 0 && ', '}
                  {warningCount > 0 && `${warningCount} warning${warningCount > 1 ? 's' : ''}`}
                </span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-green-600" />
                <span className="text-green-600">No errors</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tab Completion Badge Component
 * Shows completion status for each schema type
 */
interface TabCompletionBadgeProps {
  label: string;
  isComplete: boolean;
  isActive: boolean;
  onClick: () => void;
  validationBadge?: React.ReactNode;
}

function TabCompletionBadge({ label, isComplete, isActive, onClick, validationBadge }: TabCompletionBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
        isActive && 'bg-primary text-primary-foreground',
        !isActive && 'hover:bg-accent'
      )}
    >
      <span className="font-medium">{label}</span>
      {isComplete ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30" />
      )}
      {validationBadge}
    </button>
  );
}
