"use client";

import * as React from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AssessmentDetailsResponse } from '@vantage/shared';
import { usePostAssessorAssessmentResponsesResponseIdMovsUpload } from '@vantage/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';

interface RightAssessorPanelProps {
  assessment: AssessmentDetailsResponse;
  form: Record<number, { status?: LocalStatus; publicComment?: string; internalNote?: string }>;
  setField: (responseId: number, field: 'status' | 'publicComment' | 'internalNote', value: string) => void;
  expandedId?: number | null;
  onToggle?: (responseId: number) => void;
}

type AnyRecord = Record<string, any>;

type LocalStatus = 'Pass' | 'Fail' | 'Conditional' | undefined;

export function RightAssessorPanel({ assessment, form, setField, expandedId, onToggle }: RightAssessorPanelProps) {
  const data: AnyRecord = (assessment as unknown as AnyRecord) ?? {};
  const core = (data.assessment as AnyRecord) ?? data;
  const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];

  // Get user role to determine permissions
  const { user } = useAuthStore();
  const userRole = user?.role || '';
  const isValidator = userRole === 'VALIDATOR';
  const isAssessor = userRole === 'ASSESSOR';

  const uploadMovMutation = usePostAssessorAssessmentResponsesResponseIdMovsUpload();

  // Zod schema: require publicComment when status is Fail/Conditional
  const ResponseSchema = z
    .object({
      status: z.enum(['Pass', 'Fail', 'Conditional']).optional(),
      publicComment: z.string().optional(),
      internalNote: z.string().optional(),
    })
    .refine(
      (val) => {
        if (!val.status) return true;
        if (val.status === 'Fail' || val.status === 'Conditional') {
          return !!val.publicComment && val.publicComment.trim().length > 0;
        }
        return true;
      },
      {
        message: 'Required for Fail or Conditional',
        path: ['publicComment'],
      }
    );

  const ResponsesSchema = z.record(z.string(), ResponseSchema);

  type ResponsesForm = z.infer<typeof ResponsesSchema>;

  const defaultValues: ResponsesForm = React.useMemo(() => {
    const obj: AnyRecord = {};
    for (const r of responses) {
      const key = String(r.id);
      obj[key] = {
        status: form[r.id]?.status,
        publicComment: form[r.id]?.publicComment,
        internalNote: form[r.id]?.internalNote,
      };
    }
    return obj as ResponsesForm;
  }, [responses, form]);

  const { control, register, formState } = useForm<ResponsesForm>({
    resolver: zodResolver(ResponsesSchema),
    defaultValues,
    mode: 'onChange',
  });

  // Sync RHF state upward so footer logic remains accurate
  const watched = useWatch({ control });
  React.useEffect(() => {
    Object.entries(watched || {}).forEach(([key, v]) => {
      const id = Number(key);
      if (!Number.isFinite(id)) return;
      const val = v as { status?: LocalStatus; publicComment?: string; internalNote?: string };
      if (val.status !== form[id]?.status) setField(id, 'status', String(val.status || ''));
      if (val.publicComment !== form[id]?.publicComment) setField(id, 'publicComment', val.publicComment || '');
      if (val.internalNote !== form[id]?.internalNote) setField(id, 'internalNote', val.internalNote || '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched]);

  const handleUpload = async (responseId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadMovMutation.mutateAsync({
        responseId,
        data: { file, filename: file.name },
      });
      // In a later step we'll refetch and show newly uploaded MOVs on the left
    } catch {
      // Ignore for now; footer flow will handle toasts later
    }
  };

  return (
    <div className="p-4">
      <div className="text-sm text-muted-foreground mb-3">
        {isValidator ? 'Validator Controls' : 'Assessor Controls'}
      </div>
      <div className="space-y-4">
        {responses.length === 0 ? (
          <div className="text-sm text-muted-foreground">No indicators found.</div>
        ) : expandedId == null ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-sm">Select an indicator from the left panel to begin validation</div>
          </div>
        ) : (
          (() => {
            // Show ONLY the selected indicator
            const r = responses.find((resp) => resp.id === expandedId);
            if (!r) return null;

            const idx = responses.findIndex((resp) => resp.id === expandedId);
            const indicator = (r.indicator as AnyRecord) ?? {};
            const indicatorLabel = indicator?.name || `Indicator #${r.indicator_id ?? idx + 1}`;
            const techNotes = indicator?.technical_notes || indicator?.notes || null;
            const key = String(r.id);
            const errorsFor = (formState.errors as AnyRecord)?.[key]?.publicComment;

            return (
              <div key={r.id ?? idx} className="rounded-sm bg-card shadow-md border border-black/5 overflow-hidden" data-right-item-id={r.id}>
                <div className="px-3 py-3 text-lg font-semibold rounded-t-sm"
                  style={{ background: 'var(--cityscape-yellow)', color: 'var(--cityscape-accent-foreground)' }}>
                  {indicatorLabel}
                </div>
                {/* Content is always visible when indicator is selected */}
                {(
                <div className="p-3 space-y-4">
                  {techNotes ? (
                    <div className="text-xs text-muted-foreground bg-muted/30 rounded-sm p-2">
                      <div className="font-medium mb-1">Technical Notes</div>
                      <div className="whitespace-pre-wrap">{String(techNotes)}</div>
                    </div>
                  ) : null}

                  {/* Checklist Items */}
                  {(() => {
                    const checklistItems = (indicator?.checklist_items as any[]) || [];
                    const validationRule = indicator?.validation_rule || 'ALL_ITEMS_REQUIRED';

                    if (checklistItems.length === 0) return null;

                    return (
                      <div className="border border-black/10 rounded-sm bg-muted/10">
                        <div className="px-3 py-2 border-b border-black/10 bg-muted/30">
                          <div className="text-xs font-semibold uppercase tracking-wide">
                            Validation Checklist
                            {validationRule === 'ANY_ITEM_REQUIRED' && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 font-normal normal-case">
                                OR Logic: At least 1 required
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          {checklistItems.map((item: any, itemIdx: number) => (
                            <div key={item.id || itemIdx} className="text-xs border-l-2 border-muted pl-2">
                              <div className="font-medium text-foreground">
                                {item.required && validationRule === 'ALL_ITEMS_REQUIRED' && (
                                  <span className="text-red-600 mr-1">*</span>
                                )}
                                {item.label}
                              </div>
                              {item.mov_description && (
                                <div className="text-muted-foreground mt-0.5 text-[11px] italic">
                                  {item.mov_description}
                                </div>
                              )}
                              {item.requires_document_count && (
                                <div className="text-[10px] mt-1 text-blue-600">
                                  ℹ️ Requires input field (date/count/amount)
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* VALIDATOR ONLY: Validation Status Buttons */}
                  {isValidator && (
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Validation Status</div>
                      <div className="flex items-center gap-2">
                        {(['Pass', 'Fail', 'Conditional'] as LocalStatus[]).map((s) => {
                          const active = form[r.id]?.status === s;
                          const base = 'size-sm';
                          const cls = active
                            ? s === 'Pass'
                              ? 'text-white hover:opacity-90'
                              : s === 'Fail'
                                ? 'text-white hover:opacity-90'
                                : 'text-[var(--cityscape-accent-foreground)] hover:opacity-90'
                            : '';
                          const style = active
                            ? s === 'Pass'
                              ? { background: 'var(--success)' }
                              : s === 'Fail'
                                ? { background: 'var(--destructive, #ef4444)' }
                                : { background: 'var(--cityscape-yellow)' }
                            : undefined;
                          return (
                            <Button
                              key={s}
                              type="button"
                              variant={active ? 'default' : 'outline'}
                              size="sm"
                              className={cls}
                              style={style}
                              onClick={() => setField(r.id, 'status', s as string)}
                            >
                              {s}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ASSESSOR ONLY: Information Message */}
                  {isAssessor && (
                    <div className="border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 rounded-sm p-3">
                      <div className="text-xs text-blue-800 dark:text-blue-300">
                        <div className="font-semibold mb-1">ℹ️ Assessor Note</div>
                        <div>As an assessor, you can review submissions and provide feedback. Only validators can mark indicators as Pass/Fail/Conditional.</div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {isValidator ? "Validator's Findings (Visible to BLGU)" : "Assessor's Notes (Visible to BLGU)"}
                    </div>
                    <Textarea
                      {...register(`${key}.publicComment` as const)}
                      placeholder="Provide clear, actionable feedback for BLGU to address for rework."
                      className={errorsFor ? 'border-red-500' : undefined}
                    />
                    {errorsFor ? (
                      <div className="text-xs text-red-600">{String(errorsFor.message || 'Required for Fail or Conditional')}</div>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Internal Notes (DILG-only)</div>
                    <Textarea
                      {...register(`${key}.internalNote` as const)}
                      placeholder="Internal notes for DILG only"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Upload "Pahabol" Documents (by {isValidator ? 'Validator' : 'Assessor'})
                    </div>
                    <Input type="file" onChange={(e) => handleUpload(r.id, e)} />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const prev = responses[idx - 1];
                        if (prev) onToggle?.(prev.id);
                      }}
                      disabled={idx === 0}
                    >
                      Previous Indicator
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const next = responses[idx + 1];
                        if (next) onToggle?.(next.id);
                      }}
                      disabled={idx === responses.length - 1}
                    >
                      Next Indicator
                    </Button>
                  </div>
                </div>
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}


