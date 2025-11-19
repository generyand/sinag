"use client";

import { TreeNavigator } from '@/components/features/assessments/tree-navigation';
import { useGetAssessorAssessmentsAssessmentId } from '@vantage/shared';
import { useState, useEffect } from 'react';
import { RightAssessorPanel } from './RightAssessorPanel';
import { MiddleMovFilesPanel } from './MiddleMovFilesPanel';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePostAssessorAssessmentResponsesResponseIdValidate,
  usePostAssessorAssessmentsAssessmentIdFinalize,
  usePostAssessorAssessmentsAssessmentIdRework,
} from '@vantage/shared';

interface AssessorValidationClientProps {
  assessmentId: number;
}

type AnyRecord = Record<string, any>;

export function AssessorValidationClient({ assessmentId }: AssessorValidationClientProps) {
  const { data, isLoading, isError, error } = useGetAssessorAssessmentsAssessmentId(assessmentId);
  const qc = useQueryClient();
  const validateMut = usePostAssessorAssessmentResponsesResponseIdValidate();
  const reworkMut = usePostAssessorAssessmentsAssessmentIdRework();
  const finalizeMut = usePostAssessorAssessmentsAssessmentIdFinalize();

  // All hooks must be called before any conditional returns
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<number, { status?: 'Pass' | 'Fail' | 'Conditional'; publicComment?: string }>>({});
  const [checklistData, setChecklistData] = useState<Record<string, any>>({});  // Store checklist checkbox/input data
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
  const reworkCount: number = core.rework_count ?? 0;
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
    completedIndicators: responses.filter((r: any) => {
      // Check local form state first, fall back to backend validation_status
      const localStatus = form[r.id]?.status;
      if (localStatus) {
        return localStatus === 'Pass';
      }
      return r.validation_status === 'PASS';
    }).length,
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

      // Determine status from local form state first, then backend validation_status
      let status = 'not_started';
      const localStatus = form[resp.id]?.status;
      if (localStatus) {
        status = localStatus === 'Pass' ? 'completed' : (localStatus === 'Fail' ? 'needs_rework' : 'not_started');
      } else if (resp.validation_status) {
        status = resp.validation_status === 'PASS' ? 'completed' : (resp.validation_status === 'FAIL' ? 'needs_rework' : 'not_started');
      }

      existingArea.indicators.push({
        id: String(resp.id),
        code: indicator.indicator_code || indicator.code || String(resp.id),
        name: indicator.name || 'Unnamed Indicator',
        status: status,
        // Store indicator_id for sorting
        indicator_id: indicator.id || 0,
      });

      return acc;
    }, []).map((area: any) => {
      // Sort indicators by indicator_id (ascending order)
      area.indicators.sort((a: any, b: any) => a.indicator_id - b.indicator_id);
      return area;
    }),
  };

  const total = responses.length;
  const reviewed = responses.filter((r) => !!form[r.id]?.status).length;
  const allReviewed = total > 0 && reviewed === total;
  const anyFail = responses.some((r) => form[r.id]?.status === 'Fail');
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
    console.log('=== SAVE AS DRAFT DEBUG ===');
    console.log('Current checklistData:', checklistData);
    console.log('Current form:', form);

    // Get responses with validation status (validators)
    const responsesWithStatus = responses
      .map((r) => ({ id: r.id as number, v: form[r.id] }))
      .filter((x) => x.v && x.v.status);

    // Get responses with checklist data or comments (assessors)
    const responsesWithData = responses.filter(r => {
      const hasChecklistData = Object.keys(checklistData).some(key => key.startsWith(`checklist_${r.id}_`));
      const hasComments = form[r.id]?.publicComment && form[r.id]!.publicComment!.trim().length > 0;
      return hasChecklistData || hasComments;
    });

    console.log('Responses with status:', responsesWithStatus);
    console.log('Responses with data:', responsesWithData);

    // Combine unique response IDs
    const allResponseIds = new Set([
      ...responsesWithStatus.map(p => p.id),
      ...responsesWithData.map(r => r.id)
    ]);

    console.log('All response IDs to save:', Array.from(allResponseIds));

    if (allResponseIds.size === 0) {
      console.log('No responses to save!');
      return;
    }

    // Save all responses
    await Promise.all(
      Array.from(allResponseIds).map((responseId) => {
        const formData = form[responseId];

        // Extract checklist data for this response
        const responseChecklistData: Record<string, any> = {};
        Object.keys(checklistData).forEach(key => {
          if (key.startsWith(`checklist_${responseId}_`)) {
            // Remove the checklist_${responseId}_ prefix to get the field name
            // For assessment_field items, keep the _yes/_no suffix
            const fieldName = key.replace(`checklist_${responseId}_`, '');
            responseChecklistData[fieldName] = checklistData[key];
          }
        });

        console.log(`Response ${responseId} checklist data:`, responseChecklistData);
        console.log(`Response ${responseId} payload:`, {
          validation_status: formData?.status,
          public_comment: formData?.publicComment,
          response_data: responseChecklistData
        });

        return validateMut.mutateAsync({
          responseId: responseId,
          data: {
            validation_status: formData?.status ?? undefined,  // Optional - only validators set this
            public_comment: formData?.publicComment ?? null,
            response_data: Object.keys(responseChecklistData).length > 0 ? responseChecklistData : undefined,
          },
        });
      })
    );

    await qc.invalidateQueries();
  };

  const onSendRework = async () => {
    await onSaveDraft();
    await reworkMut.mutateAsync({ assessmentId });
    await qc.invalidateQueries();
  };

  const onFinalize = async () => {
    await onSaveDraft();
    await finalizeMut.mutateAsync({ assessmentId });
    await qc.invalidateQueries();
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
              <Link href="/assessor/submissions" className="flex items-center gap-1">
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
              <div className="text-xs text-muted-foreground truncate">Assessor Validation Workspace</div>
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
                  onIndicatorSelect={handleIndicatorSelect}
                  setField={(id, field, value) => {
                    setForm((prev) => ({
                      ...prev,
                      [id]: {
                        ...prev[id],
                        [field]: value,
                      },
                    }));
                  }}
                  onChecklistChange={(key, value) => {
                    setChecklistData((prev) => ({
                      ...prev,
                      [key]: value,
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
              Save as Draft
            </Button>
            <Button
              variant="secondary"
              size="default"
              type="button"
              onClick={onSendRework}
              disabled={
                !allReviewed ||
                reworkCount !== 0 ||
                !anyFail ||
                missingRequiredComments > 0 ||
                reworkMut.isPending
              }
              className="w-full sm:w-auto text-[var(--cityscape-accent-foreground)] hover:opacity-90"
              style={{ background: 'var(--cityscape-yellow)' }}
            >
              Compile and Send for Rework
            </Button>
            <Button
              size="default"
              type="button"
              onClick={onFinalize}
              disabled={
                !allReviewed ||
                missingRequiredComments > 0 ||
                finalizeMut.isPending ||
                (reworkCount === 0 && anyFail)
              }
              className="w-full sm:w-auto text-white hover:opacity-90"
              style={{ background: 'var(--success)' }}
            >
              Finalize Validation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


