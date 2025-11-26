'use client';

import React from 'react';
import { useIndicatorBuilderStore } from '@/store/useIndicatorBuilderStore';
import { Button } from '@/components/ui/button';
import type { GovernanceArea } from '@sinag/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
import {
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  GitBranch,
  Settings,
  Send,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SchemaEditorLayout } from './schema-editor';

/**
 * Indicator Builder Wizard Component
 *
 * Multi-step wizard for creating hierarchical indicators with draft auto-save.
 *
 * Steps:
 * 1. Select Mode - Choose governance area and creation mode
 * 2. Build Structure - Create indicator hierarchy with tree editor
 * 3. Configure Schemas - Define form and calculation schemas
 * 4. Review & Publish - Validate and submit indicators
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type WizardStep = 'select-mode' | 'build-and-configure' | 'review';
export type CreationMode = 'incremental' | 'bulk-import';

interface Draft {
  id: string;
  title: string;
  governance_area_id: number;
  updated_at: string;
  status: string;
  indicator_count: number;
}

interface IndicatorBuilderWizardProps {
  /** Available governance areas */
  governanceAreas?: GovernanceArea[];

  /** User's existing drafts */
  drafts?: Draft[];

  /** Callback when draft is saved */
  onSaveDraft?: () => void;

  /** Callback when wizard is exited */
  onExit?: () => void;

  /** Callback when indicators are published */
  onPublish?: () => void;

  /** Custom class name */
  className?: string;
}

// ============================================================================
// Step Components
// ============================================================================

/**
 * Step 1: Select Mode
 */
interface SelectModeStepProps {
  governanceAreas: GovernanceArea[];
  drafts: Draft[];
  selectedAreaId: number | null;
  creationMode: CreationMode;
  onAreaChange: (id: number) => void;
  onModeChange: (mode: CreationMode) => void;
  onResumeDraft: (draftId: string) => void;
}

function SelectModeStep({
  governanceAreas,
  drafts,
  selectedAreaId,
  creationMode,
  onAreaChange,
  onModeChange,
  onResumeDraft,
}: SelectModeStepProps) {
  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-in fade-in duration-500">
      {/* Governance Area Selection */}
      <Card className="group relative overflow-hidden shadow-xl rounded-2xl border-[var(--border)] bg-[var(--card)] transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 hover:border-[#F7B520]/30">
        {/* Gradient accent bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#d97706] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-extrabold tracking-tight flex items-center gap-3 text-[var(--foreground)]">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
              <Settings className="h-6 w-6 text-black" />
            </div>
            Select Governance Area
          </CardTitle>
          <CardDescription className="text-base text-[var(--text-muted)]">
            Choose the governance area for the indicators you want to create
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedAreaId?.toString()}
            onValueChange={(value) => onAreaChange(parseInt(value, 10))}
          >
            <SelectTrigger className="h-12 rounded-lg border-2 hover:border-[#F7B520] transition-colors duration-300 border-[var(--border)] bg-[var(--input)] text-[var(--foreground)]">
              <SelectValue placeholder="Select governance area" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--card)] border-[var(--border)]">
              {governanceAreas.length === 0 ? (
                <div className="p-2 text-sm text-[var(--text-muted)]">
                  No governance areas available
                </div>
              ) : (
                governanceAreas.map((area) => (
                  <SelectItem key={area.id} value={area.id.toString()} className="text-[var(--foreground)] focus:bg-[var(--hover)]">
                    {area.area_type} - {area.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedAreaId && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[#f59e0b]" />
              <span className="font-medium text-[#f59e0b]">Governance area selected</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Creation Mode Selection */}
      <Card className="group relative overflow-hidden shadow-xl rounded-2xl border-[var(--border)] bg-[var(--card)] transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 hover:border-[#F7B520]/30">
        {/* Gradient accent bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#f59e0b] via-[#d97706] to-[#b45309] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-extrabold tracking-tight flex items-center gap-3 text-[var(--foreground)]">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
              <GitBranch className="h-6 w-6 text-black" />
            </div>
            Creation Mode
          </CardTitle>
          <CardDescription className="text-base text-[var(--text-muted)]">
            Choose how you want to create indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={creationMode} onValueChange={(v) => onModeChange(v as CreationMode)}>
            <div className={cn(
              "relative overflow-hidden flex items-center space-x-4 p-6 border-2 rounded-xl cursor-pointer transition-all duration-300",
              creationMode === 'incremental'
                ? "border-[#F7B520] bg-gradient-to-br from-[#F7B520]/10 to-[#f59e0b]/5 shadow-lg scale-[1.02]"
                : "border-[var(--border)] hover:border-[#F7B520]/50 hover:shadow-md hover:scale-[1.01]"
            )}>
              <RadioGroupItem value="incremental" id="incremental" className="h-5 w-5" />
              <Label htmlFor="incremental" className="flex-1 cursor-pointer text-[var(--foreground)]">
                <div className="font-bold text-lg mb-1">Incremental Creation</div>
                <div className="text-sm text-[var(--text-muted)]">
                  Build indicators one at a time with full control
                </div>
              </Label>
              {creationMode === 'incremental' && (
                <CheckCircle2 className="h-6 w-6 text-[#F7B520] animate-in zoom-in duration-300" />
              )}
            </div>
            <div className="relative overflow-hidden flex items-center space-x-4 p-6 border-2 rounded-xl opacity-50 cursor-not-allowed border-[var(--border)] bg-[var(--hover)]">
              <RadioGroupItem value="bulk-import" id="bulk-import" disabled className="h-5 w-5" />
              <Label htmlFor="bulk-import" className="flex-1 text-[var(--foreground)]">
                <div className="font-bold text-lg mb-1">Bulk Import</div>
                <div className="text-sm text-[var(--text-muted)]">
                  Import indicators from JSON or Excel file
                </div>
              </Label>
              <Badge variant="secondary" className="text-xs bg-[var(--hover)] text-[var(--foreground)]">Coming Soon</Badge>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Existing Drafts */}
      {drafts.length > 0 && (
        <Card className="group relative overflow-hidden shadow-xl rounded-2xl border-[var(--border)] bg-[var(--card)] transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 hover:border-[#F7B520]/30">
          {/* Gradient accent bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#d97706] via-[#b45309] to-[#92400e] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-extrabold tracking-tight flex items-center gap-3 text-[var(--foreground)]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#d97706] to-[#b45309] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <FileText className="h-6 w-6 text-white" />
              </div>
              Resume Draft
            </CardTitle>
            <CardDescription className="text-base text-[var(--text-muted)]">
              Continue working on a saved draft
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="group/draft flex items-center justify-between p-4 border-2 rounded-xl hover:border-[#F7B520] hover:shadow-md transition-all duration-300 hover:scale-[1.02] bg-[var(--card)] border-[var(--border)]"
              >
                <div className="flex-1">
                  <div className="font-bold text-lg mb-1 group-hover/draft:text-[#F7B520] transition-colors duration-300 text-[var(--foreground)]">
                    {draft.title}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {draft.indicator_count} indicators
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated {new Date(draft.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={() => onResumeDraft(draft.id)}
                  className="bg-gradient-to-r from-[#F7B520] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706] text-black font-bold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  Resume
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Step 2: Build & Configure (Combined)
 *
 * This step combines tree structure building with full indicator configuration.
 * Users can add/edit/reorder indicators while simultaneously configuring their properties.
 */
function BuildAndConfigureStep() {
  return <SchemaEditorLayout />;
}


/**
 * Step 4: Review & Publish
 */
interface ReviewStepProps {
  validationErrors: Array<{ nodeId: string; message: string }>;
  onSelectNode: (nodeId: string) => void;
}

function ReviewStep({ validationErrors, onSelectNode }: ReviewStepProps) {
  const nodes = useIndicatorBuilderStore((state) => state.tree.nodes);

  const totalIndicators = nodes.size;
  const errorCount = validationErrors.length;
  const completeCount = totalIndicators - errorCount;

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* Summary Cards with Gradient Accents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="group relative overflow-hidden shadow-xl rounded-2xl border-[var(--border)] bg-[var(--card)] transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#F7B520] to-[#f59e0b]" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F7B520] to-[#f59e0b] flex items-center justify-center shadow-lg">
                <FileText className="h-6 w-6 text-black" />
              </div>
              <div className="text-4xl font-black text-[#F7B520]">{totalIndicators}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden shadow-xl rounded-2xl border-[var(--border)] bg-[var(--card)] transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div className="text-4xl font-black text-green-600">{completeCount}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden shadow-xl rounded-2xl border-[var(--border)] bg-[var(--card)] transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-red-600" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-4xl font-black text-red-600">{errorCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Errors */}
      {errorCount > 0 && (
        <Card className="relative overflow-hidden shadow-xl rounded-2xl border-red-200 bg-red-50/30">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-red-600" />
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold tracking-tight flex items-center gap-3 text-[var(--foreground)]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              Validation Errors
            </CardTitle>
            <CardDescription className="text-base text-[var(--text-muted)]">
              Fix these errors before publishing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validationErrors.map((error, index) => (
                <div
                  key={index}
                  className="group/error flex items-start gap-3 p-4 border-2 rounded-xl hover:border-[#F7B520] hover:shadow-md transition-all duration-300 cursor-pointer bg-[var(--card)] border-[var(--border)] hover:scale-[1.01]"
                  onClick={() => onSelectNode(error.nodeId)}
                >
                  <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-lg mb-1 group-hover/error:text-[#F7B520] transition-colors duration-300 text-[var(--foreground)]">
                      {nodes.get(error.nodeId)?.name || 'Unknown Indicator'}
                    </div>
                    <div className="text-sm text-[var(--text-muted)]">{error.message}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[var(--text-muted)] flex-shrink-0 group-hover/error:text-[#F7B520] transition-colors duration-300" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {errorCount === 0 && totalIndicators > 0 && (
        <Card className="relative overflow-hidden shadow-2xl rounded-2xl border-[#F7B520] bg-gradient-to-br from-[#F7B520]/10 via-[#f59e0b]/5 to-transparent animate-in zoom-in duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#F7B520] via-[#f59e0b] to-[#d97706]" />
          <CardContent className="pt-8 pb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F7B520] to-[#f59e0b] flex items-center justify-center shadow-xl animate-pulse">
                <CheckCircle2 className="h-10 w-10 text-black" />
              </div>
              <div className="flex-1">
                <h3 className="text-3xl font-black text-[#F7B520] mb-2 tracking-tight">Ready to Publish</h3>
                <p className="text-base text-[var(--text-muted)]">
                  All indicators are valid and ready to be published to the system
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Main Wizard Component
// ============================================================================

export function IndicatorBuilderWizard({
  governanceAreas = [],
  drafts = [],
  onSaveDraft,
  onExit,
  onPublish,
  className = '',
}: IndicatorBuilderWizardProps) {
  const [currentStep, setCurrentStep] = React.useState<WizardStep>('select-mode');
  const [selectedAreaId, setSelectedAreaId] = React.useState<number | null>(null);
  const [creationMode, setCreationMode] = React.useState<CreationMode>('incremental');
  const [showExitDialog, setShowExitDialog] = React.useState(false);

  const selectedNodeId = useIndicatorBuilderStore((state) => state.selectedNodeId);
  const selectNode = useIndicatorBuilderStore((state) => state.selectNode);
  const nodes = useIndicatorBuilderStore((state) => state.tree.nodes);
  const storeGovernanceAreaId = useIndicatorBuilderStore((state) => state.tree.governanceAreaId);
  const setGovernanceAreaId = useIndicatorBuilderStore((state) => state.setGovernanceAreaId);

  // Sync selectedAreaId with store on mount (for URL params or loaded drafts)
  React.useEffect(() => {
    if (storeGovernanceAreaId && storeGovernanceAreaId > 0 && selectedAreaId === null) {
      setSelectedAreaId(storeGovernanceAreaId);
    }
  }, [storeGovernanceAreaId, selectedAreaId]);

  // Wizard steps configuration
  const steps: Array<{ id: WizardStep; label: string; icon: any }> = [
    { id: 'select-mode', label: 'Select Mode', icon: GitBranch },
    { id: 'build-and-configure', label: 'Build & Configure', icon: Settings },
    { id: 'review', label: 'Review & Publish', icon: Send },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Validation
  const validationErrors = React.useMemo(() => {
    const errors: Array<{ nodeId: string; message: string }> = [];
    nodes.forEach((node: any, nodeId: string) => {
      if (!node.name || node.name.trim().length < 3) {
        errors.push({ nodeId, message: 'Name is required (min 3 characters)' });
      }
      if (!node.description) {
        errors.push({ nodeId, message: 'Description is required' });
      }
    });
    return errors;
  }, [nodes]);

  const canProceed = React.useMemo(() => {
    switch (currentStep) {
      case 'select-mode':
        return selectedAreaId !== null;
      case 'build-and-configure':
        return nodes.size > 0; // At least one indicator must exist
      case 'review':
        return validationErrors.length === 0;
      default:
        return false;
    }
  }, [currentStep, selectedAreaId, nodes.size, validationErrors.length]);

  const handleNext = () => {
    // When leaving select-mode step, update the governance area in the store
    if (currentStep === 'select-mode' && selectedAreaId !== null) {
      setGovernanceAreaId(selectedAreaId);
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handlePublish = () => {
    if (validationErrors.length === 0) {
      onPublish?.();
    }
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const handleResumeDraft = (draftId: string) => {
    // Load draft logic would go here
    console.log('Resume draft:', draftId);
    setCurrentStep('build-and-configure');
  };

  return (
    <div className={cn('flex flex-col h-screen bg-[var(--background)]', className)}>
      {/* Header with Golden Theme */}
      <div className="border-b bg-[var(--card)] shadow-lg border-[var(--border)]">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F7B520] to-[#f59e0b] flex items-center justify-center shadow-xl">
                <Settings className="h-8 w-8 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">Indicator Builder</h1>
                <p className="text-sm text-[var(--text-muted)]">Create and configure hierarchical indicators</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={onSaveDraft}
                className="border-2 border-[#F7B520] hover:bg-[#F7B520] hover:text-black transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg font-semibold bg-transparent text-[var(--foreground)]"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                variant="ghost"
                size="default"
                onClick={handleExit}
                className="hover:bg-[var(--hover)] transition-all duration-300 hover:scale-105 text-[var(--foreground)]"
              >
                <X className="h-4 w-4 mr-2" />
                Exit
              </Button>
            </div>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-[#F7B520]">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
              <span className="text-base font-semibold text-[var(--text-secondary)]">
                {steps[currentStepIndex].label}
              </span>
            </div>
            <div className="relative">
              <div className="h-3 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F7B520] via-[#f59e0b] to-[#d97706] transition-all duration-700 ease-out shadow-md"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Step Indicators with Golden Theme */}
          <div className="flex items-center justify-between mt-5 gap-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;

              return (
                <React.Fragment key={step.id}>
                  <div
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 shadow-md',
                      isActive && 'bg-gradient-to-r from-[#F7B520] to-[#f59e0b] text-black scale-105 shadow-lg',
                      !isActive && isCompleted && 'bg-gradient-to-r from-green-400 to-green-600 text-white',
                      !isActive && !isCompleted && 'bg-[var(--hover)] text-[var(--text-muted)]'
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive && "animate-pulse")} />
                    <span className="text-sm font-bold hidden md:inline">{step.label}</span>
                    {isCompleted && <CheckCircle2 className="h-4 w-4 ml-1" />}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "flex-1 h-1 rounded-full mx-2 transition-colors duration-500",
                      isCompleted ? "bg-gradient-to-r from-green-400 to-green-600" : "bg-[var(--border)]"
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {currentStep === 'select-mode' && (
          <SelectModeStep
            governanceAreas={governanceAreas}
            drafts={drafts}
            selectedAreaId={selectedAreaId}
            creationMode={creationMode}
            onAreaChange={setSelectedAreaId}
            onModeChange={setCreationMode}
            onResumeDraft={handleResumeDraft}
          />
        )}

        {currentStep === 'build-and-configure' && (
          <BuildAndConfigureStep />
        )}

        {currentStep === 'review' && (
          <ReviewStep
            validationErrors={validationErrors}
            onSelectNode={(nodeId) => {
              selectNode(nodeId);
              setCurrentStep('build-and-configure');
            }}
          />
        )}
      </div>

      {/* Footer with Golden Theme */}
      <div className="border-t bg-[var(--card)] shadow-lg px-6 py-5 border-[var(--border)]">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="border-2 hover:border-[#F7B520] transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold text-[var(--foreground)] border-[var(--border)]"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Back
          </Button>

          {currentStep === 'review' ? (
            <Button
              onClick={handlePublish}
              disabled={!canProceed}
              size="lg"
              className={cn(
                "min-w-40 font-bold shadow-lg transition-all duration-300",
                canProceed
                  ? "bg-gradient-to-r from-[#F7B520] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706] text-black hover:scale-105 hover:shadow-xl"
                  : "opacity-50 cursor-not-allowed"
              )}
            >
              <Send className="h-5 w-5 mr-2" />
              Publish Indicators
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              size="lg"
              className={cn(
                "min-w-40 font-bold shadow-lg transition-all duration-300",
                canProceed
                  ? "bg-gradient-to-r from-[#F7B520] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706] text-black hover:scale-105 hover:shadow-xl"
                  : "opacity-50 cursor-not-allowed"
              )}
            >
              Continue
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Indicator Builder?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress has been auto-saved. You can resume this draft later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onExit?.()}>
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
