"use client";

import { TreeNavigator } from '@/components/features/assessments/tree-navigation';
import { StatusBadge } from '@/components/shared';
import { BBIPreviewPanel, BBIPreviewData } from './BBIPreviewPanel';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { useGetAssessorAssessmentsAssessmentId, usePostAssessorAssessmentResponsesResponseIdValidate, usePostAssessorAssessmentsAssessmentIdCalibrate, usePostAssessorAssessmentsAssessmentIdFinalize } from '@sinag/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MiddleMovFilesPanel } from '../assessor/validation/MiddleMovFilesPanel';
import { RightAssessorPanel } from '../assessor/validation/RightAssessorPanel';

interface ValidatorValidationClientProps {
  assessmentId: number;
}

type AnyRecord = Record<string, any>;

/**
 * Sort indicator codes numerically (e.g., 1.1.1, 1.1.2, 1.2.1, etc.)
 */
function sortIndicatorCode(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA !== numB) {
      return numA - numB;
    }
  }
  return 0;
}

export function ValidatorValidationClient({ assessmentId }: ValidatorValidationClientProps) {
  const router = useRouter();
  const { data, isLoading, isError, error } = useGetAssessorAssessmentsAssessmentId(assessmentId);
  const qc = useQueryClient();
  const validateMut = usePostAssessorAssessmentResponsesResponseIdValidate();
  const finalizeMut = usePostAssessorAssessmentsAssessmentIdFinalize();
  const calibrateMut = usePostAssessorAssessmentsAssessmentIdCalibrate();

  // All hooks must be called before any conditional returns
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<number, { status?: 'Pass' | 'Fail' | 'Conditional'; publicComment?: string }>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Store checklist state externally to persist across indicator navigation
  const [checklistState, setChecklistState] = useState<Record<string, any>>({});

  // Get current user for per-area calibration check (must be called before conditional returns)
  const { user: currentUser } = useAuthStore();

  // Set initial expandedId when data loads
  useEffect(() => {
    if (data && expandedId === null) {
      const assessment: AnyRecord = (data as unknown as AnyRecord) ?? {};
      const core = (assessment.assessment as AnyRecord) ?? assessment;
      const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];
      if (responses.length > 0) {
        setExpandedId(responses[0]?.id ?? null);
      }
    }
  }, [data, expandedId]);

  // Initialize form state from database validation_status when data loads
  // This ensures the "Finalize Validation" button is enabled if all indicators are already validated
  useEffect(() => {
    if (data && Object.keys(form).length === 0) {
      const assessment: AnyRecord = (data as unknown as AnyRecord) ?? {};
      const core = (assessment.assessment as AnyRecord) ?? assessment;
      const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];

      const initialForm: Record<number, { status?: 'Pass' | 'Fail' | 'Conditional'; publicComment?: string }> = {};

      for (const resp of responses) {
        // Load validation_status from database if it exists
        const validationStatus = resp.validation_status;
        if (validationStatus) {
          // Map database status to form status
          const status = validationStatus === 'Pass' ? 'Pass'
            : validationStatus === 'Fail' ? 'Fail'
            : validationStatus === 'Conditional' ? 'Conditional'
            : undefined;

          // Load public comment from feedback_comments (latest validation comment)
          const feedbackComments = resp.feedback_comments || [];
          const validationComments = feedbackComments.filter(
            (fc: any) => fc.comment_type === 'validation' && !fc.is_internal_note
          );
          validationComments.sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA; // DESC order
          });
          const publicComment = validationComments[0]?.comment || '';

          if (status) {
            initialForm[resp.id] = { status, publicComment };
          }
        }
      }

      if (Object.keys(initialForm).length > 0) {
        setForm(initialForm);
      }
    }
  }, [data, form]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-muted-foreground">Loading assessment…</div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10 text-sm">
        <div className="rounded-md border p-4">
          <div className="font-medium mb-1">Unable to load assessment</div>
          <div className="text-muted-foreground break-words">
            {String((error as any)?.message || 'Please verify access and try again.')}
          </div>
        </div>
      </div>
    );
  }

  const assessment: AnyRecord = (data as unknown as AnyRecord) ?? {};
  const core = (assessment.assessment as AnyRecord) ?? assessment;
  const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];
  const barangayName: string = (core?.blgu_user?.barangay?.name
    ?? core?.barangay?.name
    ?? core?.barangay_name
    ?? '') as string;
  const governanceArea: string = (responses[0]?.indicator?.governance_area?.name
    ?? core?.governance_area?.name
    ?? core?.governance_area_name
    ?? '') as string;
  const cycleYear: string = String(core?.cycle_year ?? core?.year ?? '');
  const statusText: string = core?.status ?? core?.assessment_status ?? '';

  // Check if THIS validator's area has already been calibrated (per-area limit)
  const validatorAreaId = currentUser?.validator_area_id;
  const calibratedAreaIds: number[] = (core?.calibrated_area_ids ?? []) as number[];
  const calibrationAlreadyUsed = validatorAreaId ? calibratedAreaIds.includes(validatorAreaId) : false;

  // Get timestamp for MOV file separation (new vs old files)
  // Priority: calibration_requested_at > rework_requested_at
  // This helps distinguish files uploaded after rework/calibration request
  const calibrationRequestedAt: string | null = (core?.calibration_requested_at ?? null) as string | null;
  const reworkRequestedAt: string | null = (core?.rework_requested_at ?? null) as string | null;
  // Use calibration timestamp if available, otherwise fall back to rework timestamp
  const filesSeparationTimestamp = calibrationRequestedAt || reworkRequestedAt;

  // Transform to match BLGU assessment structure for TreeNavigator
  const transformedAssessment = {
    id: assessmentId,
    completedIndicators: responses.filter((r: any) => !!form[r.id]?.status).length,
    totalIndicators: responses.length,
    governanceAreas: responses.reduce((acc: any[], resp: any) => {
      const indicator = resp.indicator || {};
      const area = indicator.governance_area || {};
      const areaId = String(area.id || 'unknown');

      let existingArea = acc.find((a: any) => a.id === areaId);
      if (!existingArea) {
        existingArea = {
          id: areaId,
          code: area.code || '',
          name: area.name || 'Unknown Area',
          indicators: [],
        };
        acc.push(existingArea);
      }

      existingArea.indicators.push({
        id: String(resp.id),
        code: indicator.indicator_code || indicator.code || String(resp.id),
        name: indicator.name || 'Unnamed Indicator',
        // For validators: ONLY show completed if validator has made a decision in form state
        // Don't use database validation_status because that's the assessor's decision, not the validator's
        status: form[resp.id]?.status ? 'completed' : 'not_started',
      });

      // Sort indicators by code after adding
      existingArea.indicators.sort((a: any, b: any) => sortIndicatorCode(a.code, b.code));

      return acc;
    }, []),
  };

  const total = responses.length;
  const reviewed = responses.filter((r) => !!form[r.id]?.status).length;
  const allReviewed = total > 0 && reviewed === total;
  const progressPct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  const missingRequiredComments = responses.filter((r) => {
    const v = form[r.id];
    if (!v?.status) return false;
    if (v.status === 'Fail' || v.status === 'Conditional') {
      return !(v.publicComment && v.publicComment.trim().length > 0);
    }
    return false;
  }).length;

  const onSaveDraft = async () => {
    const payloads = responses
      .map((r) => ({ id: r.id as number, v: form[r.id] }))
      .filter((x) => x.v && x.v.status) as { id: number; v: { status: 'Pass' | 'Fail' | 'Conditional'; publicComment?: string } }[];

    if (payloads.length === 0) {
      console.warn('No validation decisions to save');
      toast.info('No changes to save', { duration: 2000 });
      return;
    }

    try {
      // Show loading toast
      toast.loading(`Saving ${payloads.length} validation decision${payloads.length > 1 ? 's' : ''}...`, { id: 'save-draft-toast' });

      console.log('Saving validation decisions:', payloads);
      await Promise.all(
        payloads.map((p) =>
          validateMut.mutateAsync({
            responseId: p.id,
            data: {
              validation_status: p.v.status!,
              public_comment: p.v.publicComment ?? null,
            },
          })
        )
      );
      await qc.invalidateQueries();
      console.log('Validation saved successfully');

      // Dismiss loading and show success
      toast.dismiss('save-draft-toast');
      toast.success(`✅ Saved ${payloads.length} validation decision${payloads.length > 1 ? 's' : ''} as draft`, {
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving validation:', error);
      toast.dismiss('save-draft-toast');
      toast.error('Failed to save draft. Please try again.', { duration: 4000 });
      throw error;
    }
  };

  const onFinalize = async () => {
    // Prevent double-clicking by checking if already in progress
    if (finalizeMut.isPending) {
      console.log('Finalize already in progress, ignoring duplicate click');
      return;
    }

    // Show immediate feedback that the process started
    toast.loading('Finalizing validation...', { id: 'finalize-toast' });

    try {
      // Save any pending changes first
      console.log('Saving draft before finalize...');
      await onSaveDraft();

      // Then finalize
      console.log('Finalizing assessment...');
      const result = await finalizeMut.mutateAsync({ assessmentId }) as {
        new_status?: string;
        already_finalized?: boolean;
      };
      await qc.invalidateQueries();

      // Dismiss loading toast
      toast.dismiss('finalize-toast');

      // Handle already finalized case (idempotent response from backend)
      if (result?.already_finalized) {
        toast.success('✅ Assessment already finalized and awaiting MLGOO approval.', {
          duration: 4000,
        });
        router.push('/validator/submissions');
        return;
      }

      // Check if assessment is fully complete or partially validated
      const isFullyComplete = result?.new_status === 'AWAITING_MLGOO_APPROVAL';

      if (isFullyComplete) {
        toast.success('✅ Assessment fully validated! All governance areas are complete. The assessment is now ready for MLGOO review.', {
          duration: 5000,
        });
      } else {
        toast.success('✅ Your governance area validation is complete! Other governance areas are still pending validation.', {
          duration: 5000,
        });
      }

      // Navigate back to submissions queue after successful finalization
      router.push('/validator/submissions');
    } catch (error: any) {
      console.error('Finalization error:', error);

      // Dismiss loading toast and show error
      toast.dismiss('finalize-toast');

      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to finalize assessment';
      toast.error(`Finalization failed: ${errorMessage}`, {
        duration: 6000,
      });
    }
  };

  const onCalibrate = async () => {
    // Show immediate feedback that the process started
    toast.loading('Submitting for calibration...', { id: 'calibrate-toast' });

    try {
      // Save any pending changes first
      console.log('Saving draft before calibration...');
      await onSaveDraft();

      // Then submit for calibration
      console.log('Submitting for calibration...');
      const result = await calibrateMut.mutateAsync({ assessmentId }) as {
        message?: string;
        governance_area?: string;
        calibrated_indicators_count?: number;
      };
      await qc.invalidateQueries();

      // Dismiss loading toast and show success
      toast.dismiss('calibrate-toast');

      const message = result?.message ||
        `Assessment submitted for calibration. ${result?.calibrated_indicators_count || 0} indicator(s) in ${result?.governance_area || 'your area'} marked for correction.`;

      toast.success(`✅ ${message}`, {
        duration: 5000,
      });

      // Navigate back to submissions queue after successful calibration
      router.push('/validator/submissions');
    } catch (error: any) {
      console.error('Calibration error:', error);

      // Dismiss loading toast and show error
      toast.dismiss('calibrate-toast');

      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to submit for calibration';
      toast.error(`Calibration failed: ${errorMessage}`, {
        duration: 6000,
      });
    }
  };

  const handleIndicatorSelect = (indicatorId: string) => {
    const responseId = parseInt(indicatorId, 10);
    setExpandedId(responseId);
    setSelectedIndicatorId(indicatorId);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1 text-muted-foreground hover:text-foreground px-2">
              <Link href="/validator/submissions">
                <ChevronLeft className="h-4 w-4" />
                <span className="font-medium">Queue</span>
              </Link>
            </Button>
            <div className="h-8 w-px bg-border shrink-0" />
            <div className="min-w-0 flex flex-col justify-center">
              <div className="text-sm font-bold text-foreground truncate leading-tight">
                {barangayName} <span className="text-muted-foreground font-medium mx-1">/</span> {governanceArea}
              </div>
              <div className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                Validator Assessment Review {cycleYear ? `• CY ${cycleYear}` : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {statusText ? <div className="scale-90 origin-right"><StatusBadge status={statusText} /></div> : null}
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onSaveDraft}
              disabled={validateMut.isPending}
              className="ml-2"
            >
              Save as Draft
            </Button>
          </div>
        </div>
      </div>

      {/* Three-Column Layout */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-[1920px] mx-auto">
          <div className="flex flex-row h-[calc(100vh-125px)] bg-white border-b border-[var(--border)]">
            {/* Left Panel - Indicator Tree Navigation */}
            <div className="w-[280px] flex-shrink-0 border-r border-[var(--border)] overflow-hidden flex flex-col bg-muted/5">
              <div className="flex-1 overflow-y-auto">
                <TreeNavigator
                  assessment={transformedAssessment as any}
                  selectedIndicatorId={selectedIndicatorId}
                  onIndicatorSelect={handleIndicatorSelect}
                />
              </div>
            </div>

            {/* Middle Panel - MOV Files */}
            <div className="w-[320px] flex-shrink-0 border-r border-[var(--border)] overflow-hidden flex flex-col bg-white">
              <MiddleMovFilesPanel
                assessment={data as any}
                expandedId={expandedId ?? undefined}
                calibrationRequestedAt={filesSeparationTimestamp}
              />
            </div>

            {/* Right Panel - MOV Checklist/Validation */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
              <div className="flex-1 overflow-y-auto">
                <RightAssessorPanel
                  assessment={data as any}
                  form={form}
                  expandedId={expandedId ?? undefined}
                  onToggle={(id) => setExpandedId((curr) => (curr === id ? null : id))}
                  setField={(id, field, value) => {
                    setForm((prev) => ({
                      ...prev,
                      [id]: {
                      ...prev[id],
                      [field]: value,
                      },
                    }));
                  }}
                  onIndicatorSelect={(indicatorId) => {
                    // Sync the tree navigator selection when navigating via Previous/Next buttons
                    setSelectedIndicatorId(indicatorId);
                  }}
                  checklistState={checklistState}
                  onChecklistChange={(key, value) => {
                    setChecklistState((prev) => ({
                      ...prev,
                      [key]: value,
                    }));
                  }}
                />
              </div>
            </div>
          </div>

          {/* BBI Preview Panel */}
          <div className="mt-4">
            <BBIPreviewPanel data={(data as any)?.bbi_preview as BBIPreviewData} />
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-card/80 backdrop-blur">
        <div className="relative max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="absolute inset-x-0 -top-[3px] h-[3px] bg-black/5">
            <div
              className="h-full bg-[var(--cityscape-yellow)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Indicators Reviewed: {reviewed}/{total}
            {missingRequiredComments > 0 ? ` • Missing required comments: ${missingRequiredComments}` : ''}
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="default"
              type="button"
              onClick={onSaveDraft}
              disabled={validateMut.isPending}
              className="w-full sm:w-auto"
            >
              {validateMut.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save as Draft'
              )}
            </Button>
            <Button
              size="default"
              type="button"
              onClick={onCalibrate}
              disabled={calibrateMut.isPending || calibrationAlreadyUsed}
              className="w-full sm:w-auto text-white hover:opacity-90"
              style={{ background: calibrationAlreadyUsed ? 'var(--muted)' : 'var(--cityscape-yellow)' }}
              title={calibrationAlreadyUsed ? 'Calibration has already been used for your governance area (max 1 per area)' : undefined}
            >
              {calibrateMut.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : calibrationAlreadyUsed ? (
                'Calibration Used'
              ) : (
                'Submit for Calibration'
              )}
            </Button>
            <Button
              size="default"
              type="button"
              onClick={onFinalize}
              disabled={
                !allReviewed ||
                missingRequiredComments > 0 ||
                finalizeMut.isPending
              }
              className="w-full sm:w-auto text-white hover:opacity-90"
              style={{ background: 'var(--success)' }}
            >
              {finalizeMut.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Finalizing...
                </>
              ) : (
                'Finalize Validation'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
