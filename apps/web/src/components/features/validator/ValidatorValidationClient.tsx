"use client";

import { TreeNavigator } from '@/components/features/assessments/tree-navigation';
import { useGetAssessorAssessmentsAssessmentId } from '@vantage/shared';
import { useState, useEffect } from 'react';
import { RightAssessorPanel } from '../assessor/validation/RightAssessorPanel';
import { MiddleMovFilesPanel } from '../assessor/validation/MiddleMovFilesPanel';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePostAssessorAssessmentResponsesResponseIdValidate,
  usePostAssessorAssessmentsAssessmentIdFinalize,
} from '@vantage/shared';
import { toast } from 'sonner';

interface ValidatorValidationClientProps {
  assessmentId: number;
}

type AnyRecord = Record<string, any>;

export function ValidatorValidationClient({ assessmentId }: ValidatorValidationClientProps) {
  const { data, isLoading, isError, error } = useGetAssessorAssessmentsAssessmentId(assessmentId);
  const qc = useQueryClient();
  const validateMut = usePostAssessorAssessmentResponsesResponseIdValidate();
  const finalizeMut = usePostAssessorAssessmentsAssessmentIdFinalize();

  // All hooks must be called before any conditional returns
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<number, { status?: 'Pass' | 'Fail' | 'Conditional'; publicComment?: string }>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
    // Show immediate feedback that the process started
    toast.loading('Finalizing validation...', { id: 'finalize-toast' });

    try {
      // Save any pending changes first
      console.log('Saving draft before finalize...');
      await onSaveDraft();

      // Then finalize
      console.log('Finalizing assessment...');
      const result = await finalizeMut.mutateAsync({ assessmentId }) as { new_status?: string };
      await qc.invalidateQueries();

      // Check if assessment is fully complete or partially validated
      const isFullyComplete = result?.new_status === 'COMPLETED';

      // Dismiss loading toast and show success
      toast.dismiss('finalize-toast');

      if (isFullyComplete) {
        toast.success('✅ Assessment fully validated! All governance areas are complete. The assessment is now ready for MLGOO review.', {
          duration: 5000,
        });
      } else {
        toast.success('✅ Your governance area validation is complete! Other governance areas are still pending validation.', {
          duration: 5000,
        });
      }
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

  const handleIndicatorSelect = (indicatorId: string) => {
    const responseId = parseInt(indicatorId, 10);
    setExpandedId(responseId);
    setSelectedIndicatorId(indicatorId);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card/80 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href="/validator/submissions" className="flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" />
                <span>Submissions Queue</span>
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {barangayName ? `Barangay: ${barangayName}` : ''}
                {barangayName && governanceArea ? ' — ' : ''}
                {governanceArea ? `Governance Area: ${governanceArea}` : ''}
                {cycleYear ? ` (CY ${cycleYear})` : ''}
              </div>
              <div className="text-xs text-muted-foreground truncate">Validator Assessment Review</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusText ? <StatusBadge status={statusText} /> : null}
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onSaveDraft}
              disabled={validateMut.isPending}
            >
              Save as Draft
            </Button>
          </div>
        </div>
      </div>

      {/* Three-Column Layout */}
      <div className="flex-1">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-row gap-6">
            {/* Left Panel - Indicator Tree Navigation */}
            <div className="w-[240px] flex-shrink-0 rounded-sm shadow-md border border-black/5 overflow-hidden min-h-[600px] bg-white">
              <div className="h-full overflow-y-auto">
                <TreeNavigator
                  assessment={transformedAssessment as any}
                  selectedIndicatorId={selectedIndicatorId}
                  onIndicatorSelect={handleIndicatorSelect}
                />
              </div>
            </div>

            {/* Middle Panel - MOV Files */}
            <div className="w-[240px] flex-shrink-0 rounded-sm shadow-md border border-black/5 overflow-hidden min-h-[600px] bg-white">
              <MiddleMovFilesPanel
                assessment={data as any}
                expandedId={expandedId ?? undefined}
              />
            </div>

            {/* Right Panel - MOV Checklist/Validation */}
            <div className="flex-1 rounded-sm shadow-md border border-black/5 overflow-hidden min-h-[600px] bg-white">
              <div className="h-full overflow-y-auto">
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
                />
              </div>
            </div>
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
