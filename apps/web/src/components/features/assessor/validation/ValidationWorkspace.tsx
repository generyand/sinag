"use client";

import { StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import type { AssessmentDetailsResponse } from '@vantage/shared';
import {
  usePostAssessorAssessmentResponsesResponseIdValidate,
  usePostAssessorAssessmentsAssessmentIdFinalize,
  usePostAssessorAssessmentsAssessmentIdRework,
} from '@vantage/shared';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { LeftSubmissionView } from './LeftSubmissionView';
import { MiddleMovFilesPanel } from './MiddleMovFilesPanel';
import { RightAssessorPanel } from './RightAssessorPanel';

interface ValidationWorkspaceProps {
  assessment: AssessmentDetailsResponse;
}

type AnyRecord = Record<string, any>;

export function ValidationWorkspace({ assessment }: ValidationWorkspaceProps) {
  const qc = useQueryClient();
  const validateMut = usePostAssessorAssessmentResponsesResponseIdValidate();
  const reworkMut = usePostAssessorAssessmentsAssessmentIdRework();
  const finalizeMut = usePostAssessorAssessmentsAssessmentIdFinalize();

  const data: AnyRecord = (assessment as unknown as AnyRecord) ?? {};
  const core = (data.assessment as AnyRecord) ?? data;
  const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];
  const assessmentId: number = data.assessment_id ?? core.id ?? 0;
  const reworkCount: number = core.rework_count ?? 0;
  // Prefer assessor payload structure: assessment.blgu_user.barangay.name
  const barangayName: string = (core?.blgu_user?.barangay?.name
    ?? core?.barangay?.name
    ?? core?.barangay_name
    ?? '') as string;
  // Governance area name can be derived from the first response's indicator
  const governanceArea: string = (responses[0]?.indicator?.governance_area?.name
    ?? core?.governance_area?.name
    ?? core?.governance_area_name
    ?? '') as string;
  const cycleYear: string = String(core?.cycle_year ?? core?.year ?? '');
  const statusText: string = core?.status ?? core?.assessment_status ?? '';
  const normalizedStatus = String(statusText || '').toLowerCase();

  const [form, setForm] = React.useState<Record<number, { status?: 'Pass' | 'Fail' | 'Conditional'; publicComment?: string }>>({});

  // Track checklist data separately for each response
  const [checklistData, setChecklistData] = React.useState<Record<string, any>>({});

  // Initialize form with existing validation data from responses
  React.useEffect(() => {
    const initialForm: typeof form = {};
    for (const r of responses) {
      const resp = r as AnyRecord;
      if (resp.validation_status) {
        initialForm[resp.id] = {
          status: resp.validation_status as 'Pass' | 'Fail' | 'Conditional' | undefined,
          publicComment: undefined, // Comments are in feedback_comments, not loaded here
        };
      }
    }
    if (Object.keys(initialForm).length > 0) {
      setForm(initialForm);
    }
  }, [responses]);

  // Count ALL indicators (always 86 total)
  // - Indicators with requires_rework=false are already "completed"
  // - Indicators with requires_rework=true need assessor review
  const hasReworkIndicators = responses.some((r) => (r as AnyRecord).requires_rework === true);
  const reworkMode = hasReworkIndicators || normalizedStatus === 'rework';

  // For bottom counter: Only count indicators requiring review
  const responsesToReview = reworkMode
    ? responses.filter((r) => (r as AnyRecord).requires_rework === true)
    : responses;

  const total = responses.length; // ALWAYS show total (86)

  // Count completed: passed indicators (81) + reviewed reworked indicators (0-5)
  const completed = responses.filter((r) => {
    const resp = r as AnyRecord;
    // Already passed indicators count as completed
    if (!resp.requires_rework) return true;
    // Reworked indicators - check if assessor has reviewed them
    return !!form[r.id]?.status;
  }).length;

  const allReviewed = responsesToReview.length > 0 && responsesToReview.every((r) => !!form[r.id]?.status);
  const anyFail = responses.some((r) => form[r.id]?.status === 'Fail');
  const dirty = Object.keys(form).length > 0;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const missingRequiredComments = responsesToReview.filter((r) => {
    const v = form[r.id];
    if (!v?.status) return false;
    if (v.status === 'Fail' || v.status === 'Conditional') {
      return !(v.publicComment && v.publicComment.trim().length > 0);
    }
    return false;
  }).length;

  const [progressOpen, setProgressOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<number | null>(responses[0]?.id ?? null);

  // Keep expanded id stable if responses change
  React.useEffect(() => {
    if (expandedId == null && responses.length > 0) setExpandedId(responses[0].id);
  }, [responses, expandedId]);

  // Smooth scroll both panels to the active item when expanded changes
  React.useEffect(() => {
    if (!expandedId) return;
    const leftEl = document.querySelector(`[data-left-item-id="${expandedId}"]`);
    const rightEl = document.querySelector(`[data-right-item-id="${expandedId}"]`);
    leftEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    rightEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [expandedId]);

  // Helpers for grouped navigation
  const getSectionKey = React.useCallback((label: string): string => {
    // Extract leading number(s) like "1." or "2.3" → "1" or "2"
    const match = label.match(/^(\d+)/);
    return match ? match[1] : 'Other';
  }, []);

  const sections = React.useMemo(() => {
    const map = new Map<string, { label: string; ids: number[] }>();
    for (const r of responses) {
      const ind = (r.indicator as AnyRecord) ?? {};
      const label = ind?.name || `#${r.indicator_id ?? r.id}`;
      const key = getSectionKey(String(label));
      if (!map.has(key)) map.set(key, { label: key, ids: [] });
      map.get(key)!.ids.push(r.id);
    }
    return Array.from(map.values());
  }, [responses, getSectionKey]);

  const jumpToFirstUnreviewed = () => {
    const target = responses.find((r) => !form[r.id]?.status);
    if (target) setExpandedId(target.id);
  };

  const onSaveDraft = async () => {
    const payloads = responses
      .map((r) => ({ id: r.id as number, v: form[r.id] }))
      .filter((x) => x.v && x.v.status) as { id: number; v: { status: 'Pass' | 'Fail' | 'Conditional'; publicComment?: string } }[];
    if (payloads.length === 0) return;

    await Promise.all(
      payloads.map((p) => {
        // Extract checklist data for this specific response
        const responseChecklistData: Record<string, any> = {};

        // Find all checklist keys for this response
        Object.entries(checklistData).forEach(([key, value]) => {
          // Match pattern: checklist_{responseId}_{itemId}[_yes|_no]
          const match = key.match(/^checklist_(\d+)_(.+)$/);
          if (match && Number(match[1]) === p.id) {
            const itemKey = match[2]; // e.g., "item_123_yes" or "item_123"

            // Convert to assessor_val_ prefix for backend storage
            // Handle YES/NO checkboxes: checklist_123_item_456_yes → assessor_val_item_456_yes
            // Handle regular items: checklist_123_item_456 → assessor_val_item_456
            const backendKey = `assessor_val_${itemKey}`;
            responseChecklistData[backendKey] = value;
          }
        });

        return validateMut.mutateAsync({
          responseId: p.id,
          data: {
            validation_status: p.v.status!,
            public_comment: p.v.publicComment ?? null,
            response_data: Object.keys(responseChecklistData).length > 0 ? responseChecklistData : null,
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

  return (
    <div className="flex flex-col gap-6">
      {/* Persistent Header */}
      <div className="sticky top-0 z-20 bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex items-center justify-between gap-3">
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
                {cycleYear ? ` ${barangayName || governanceArea ? '' : ''}(CY ${cycleYear})` : ''}
              </div>
              <div className="text-xs text-muted-foreground truncate">Barangay - Governance Area Assessment Validation</div>
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
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
        </div>
      </div>
      {/* Sticky Jump-to Indicator Nav (only if multiple indicators) */}
      {responses.length > 1 ? (
        <div className="sticky top-[52px] z-10 bg-card/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-2 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-black/10 bg-white hover:bg-black/5"
                onClick={jumpToFirstUnreviewed}
                disabled={responses.every((r) => !!form[r.id]?.status)}
                title="Jump to first unreviewed indicator"
              >
                First Unreviewed
              </button>
              {responses.map((r) => {
                const indicator = (r.indicator as AnyRecord) ?? {};
                const label = indicator?.name || `#${r.indicator_id ?? r.id}`;
                const active = expandedId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setExpandedId(r.id)}
                    className={
                      `text-xs px-2 py-1 rounded border transition-colors ` +
                      (active
                        ? 'border-transparent'
                        : 'text-foreground border-black/10 hover:bg-black/5')
                    }
                    title={label}
                  >
                    <span className={active ? 'text-[var(--cityscape-accent-foreground)]' : ''} style={active ? { background: 'var(--cityscape-yellow)', borderRadius: 4, padding: '2px 6px' } : undefined}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="w-full overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-[280px,320px,1fr] gap-6">
            {/* Left Panel - Indicator Tree */}
            <div className="rounded-sm shadow-md border border-black/5 overflow-hidden min-w-0 w-full min-h-[600px] bg-white">
              <LeftSubmissionView assessment={assessment} expandedId={expandedId ?? undefined} onToggle={(id) => setExpandedId((curr) => (curr === id ? null : id))} />
            </div>

            {/* Middle Panel - MOV Files */}
            <div className="rounded-sm shadow-md border border-black/5 overflow-hidden min-w-0 w-full min-h-[600px] bg-white">
              <MiddleMovFilesPanel assessment={assessment} expandedId={expandedId ?? undefined} />
            </div>

            {/* Right Panel - MOV Checklist/Validation */}
            <div className="rounded-sm shadow-md border border-black/5 overflow-hidden min-w-0 w-full min-h-[600px] bg-white">
              <RightAssessorPanel
                assessment={assessment}
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
                onChecklistChange={(key, value) => {
                  // Track checklist changes
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

      <div className="sticky bottom-0 z-10 border-t border-black/5 bg-card/80 backdrop-blur">
        <div className="relative mx-auto max-w-7xl px-4 md:px-6 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="absolute inset-x-0 -top-[3px] h-[3px] bg-black/5">
            <div
              className="h-full bg-[var(--cityscape-yellow)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">Indicators Completed: {completed}/{total} {missingRequiredComments > 0 ? `• Missing required comments: ${missingRequiredComments}` : ''}</div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="default"
              type="button"
              onClick={() => setProgressOpen(true)}
              className="w-full sm:w-auto"
            >
              Review Progress
            </Button>
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
                // Enabled if: all reviewed AND reworkCount == 0 AND any Fail AND no missing required comments
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
                // Enabled if: all reviewed AND (no Fail OR reworkCount == 1) AND no missing required comments
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

      {/* Progress Summary */}
      <Dialog open={progressOpen} onOpenChange={setProgressOpen}>
        <DialogContent className="max-w-md bg-white border-0 outline-none focus:outline-none focus-visible:ring-0">
          <DialogHeader>
            <DialogTitle>Review Progress</DialogTitle>
            <DialogDescription>Quick summary before taking final actions.</DialogDescription>
          </DialogHeader>
          <ul className="mt-2 text-sm space-y-1">
            <li>Total indicators: {total}</li>
            <li>Completed: {completed}</li>
            <li>Incomplete: {Math.max(0, total - completed)}</li>
            {reworkMode && <li>Requiring review: {responsesToReview.length}</li>}
            <li>Marked Fail: {responsesToReview.filter((r) => form[r.id]?.status === 'Fail').length}</li>
            <li>Missing required comments: {missingRequiredComments}</li>
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}


