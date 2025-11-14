'use client';

import React from 'react';
import { useIndicatorBuilderStore } from '@/store/useIndicatorBuilderStore';
import { Button } from '@/components/ui/button';
import type { GovernanceArea } from '@vantage/shared';
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
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Governance Area Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Governance Area</CardTitle>
          <CardDescription>
            Choose the governance area for the indicators you want to create
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedAreaId?.toString()}
            onValueChange={(value) => onAreaChange(parseInt(value, 10))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select governance area" />
            </SelectTrigger>
            <SelectContent>
              {governanceAreas.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  No governance areas available
                </div>
              ) : (
                governanceAreas.map((area) => (
                  <SelectItem key={area.id} value={area.id.toString()}>
                    {area.area_type} - {area.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {/* Debug info */}
          <p className="text-xs text-muted-foreground mt-2">
            {governanceAreas.length} governance area(s) available
          </p>
        </CardContent>
      </Card>

      {/* Creation Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Creation Mode</CardTitle>
          <CardDescription>
            Choose how you want to create indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={creationMode} onValueChange={(v) => onModeChange(v as CreationMode)}>
            <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent">
              <RadioGroupItem value="incremental" id="incremental" />
              <Label htmlFor="incremental" className="flex-1 cursor-pointer">
                <div className="font-semibold">Incremental Creation</div>
                <div className="text-sm text-muted-foreground">
                  Build indicators one at a time with full control
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent opacity-50">
              <RadioGroupItem value="bulk-import" id="bulk-import" disabled />
              <Label htmlFor="bulk-import" className="flex-1 cursor-pointer">
                <div className="font-semibold">Bulk Import (Coming Soon)</div>
                <div className="text-sm text-muted-foreground">
                  Import indicators from JSON or Excel file
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Existing Drafts */}
      {drafts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resume Draft</CardTitle>
            <CardDescription>
              Continue working on a saved draft
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
              >
                <div className="flex-1">
                  <div className="font-medium">{draft.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {draft.indicator_count} indicators • Updated {new Date(draft.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <Button size="sm" onClick={() => onResumeDraft(draft.id)}>
                  Resume
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalIndicators}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="text-3xl font-bold text-green-600">{completeCount}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="text-3xl font-bold text-destructive">{errorCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Errors */}
      {errorCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Validation Errors</CardTitle>
            <CardDescription>
              Fix these errors before publishing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validationErrors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => onSelectNode(error.nodeId)}
                >
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">
                      {nodes.get(error.nodeId)?.name || 'Unknown Indicator'}
                    </div>
                    <div className="text-sm text-muted-foreground">{error.message}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {errorCount === 0 && totalIndicators > 0 && (
        <Card className="border-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-semibold text-lg">Ready to Publish</h3>
                <p className="text-sm text-muted-foreground">
                  All indicators are valid and ready to be published
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
    <div className={cn('flex flex-col h-screen bg-background', className)}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Indicator Builder</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onSaveDraft}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExit}>
                <X className="h-4 w-4 mr-2" />
                Exit
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
              <span className="text-muted-foreground">
                {steps[currentStepIndex].label}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between mt-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;

              return (
                <React.Fragment key={step.id}>
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                      isActive && 'bg-primary text-primary-foreground',
                      !isActive && isCompleted && 'bg-green-100 text-green-700',
                      !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium hidden md:inline">{step.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-px bg-border mx-2" />
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

      {/* Footer */}
      <div className="border-t bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep === 'review' ? (
            <Button
              onClick={handlePublish}
              disabled={!canProceed}
              className="min-w-32"
            >
              <Send className="h-4 w-4 mr-2" />
              Publish
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="min-w-32"
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
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
