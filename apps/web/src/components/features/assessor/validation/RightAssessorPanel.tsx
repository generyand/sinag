"use client";

import * as React from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AssessmentDetailsResponse } from '@vantage/shared';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';

interface RightAssessorPanelProps {
  assessment: AssessmentDetailsResponse;
  form: Record<number, { status?: LocalStatus; publicComment?: string; internalNote?: string; assessorRemarks?: string }>;
  setField: (responseId: number, field: 'status' | 'publicComment' | 'internalNote' | 'assessorRemarks', value: string) => void;
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

  // Zod schema: require publicComment when status is Fail/Conditional
  const ResponseSchema = z
    .object({
      status: z.enum(['Pass', 'Fail', 'Conditional']).optional(),
      publicComment: z.string().optional(),
      internalNote: z.string().optional(),
      assessorRemarks: z.string().optional(),
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
        assessorRemarks: form[r.id]?.assessorRemarks,
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
      const val = v as { status?: LocalStatus; publicComment?: string; internalNote?: string; assessorRemarks?: string };
      if (val.status !== form[id]?.status) setField(id, 'status', String(val.status || ''));
      if (val.publicComment !== form[id]?.publicComment) setField(id, 'publicComment', val.publicComment || '');
      if (val.internalNote !== form[id]?.internalNote) setField(id, 'internalNote', val.internalNote || '');
      if (val.assessorRemarks !== form[id]?.assessorRemarks) setField(id, 'assessorRemarks', val.assessorRemarks || '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched]);

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

                  {/* Checklist Items with Interactive Controls */}
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
                        <div className="p-3 space-y-3">
                          {checklistItems.map((item: any, itemIdx: number) => {
                            const itemKey = `checklist_${r.id}_${item.item_id}`;
                            const prevItem = itemIdx > 0 ? checklistItems[itemIdx - 1] : null;
                            const showGroupHeader = item.group_name && item.group_name !== prevItem?.group_name;

                            return (
                              <div key={item.id || itemIdx} className="space-y-2">
                                {/* Group Header */}
                                {showGroupHeader && (
                                  <div className="text-xs font-semibold uppercase tracking-wide text-foreground mt-3 mb-1 pb-1 border-b border-border">
                                    {item.group_name}
                                  </div>
                                )}

                                {(item.item_type === 'document_count' || item.requires_document_count) ? (
                                  // Document count input item (no checkbox, just description + input)
                                  <div className="space-y-2">
                                    {item.mov_description && (
                                      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded px-3 py-2">
                                        <div className="text-xs text-orange-800 dark:text-orange-300 italic">
                                          {item.mov_description}
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex items-start gap-2">
                                      <Controller
                                        name={itemKey as any}
                                        control={control}
                                        render={({ field }) => (
                                          <Input
                                            id={itemKey}
                                            type="text"
                                            placeholder="Enter count"
                                            {...field}
                                            className="h-9 text-sm w-32 flex-shrink-0"
                                          />
                                        )}
                                      />
                                      <span className="text-xs text-foreground leading-relaxed">
                                        {item.label}
                                      </span>
                                    </div>
                                  </div>
                                ) : item.item_type === 'info_text' ? (
                                  // Instructional text (no input control)
                                  <div className="text-xs text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded px-3 py-2">
                                    {item.label}
                                    {item.mov_description && item.mov_description !== item.label && (
                                      <div className="text-[11px] text-blue-700 dark:text-blue-300 italic mt-1">{item.mov_description}</div>
                                    )}
                                  </div>
                                ) : item.item_type === 'assessment_field' ? (
                                  // YES/NO radio buttons for validator assessment
                                  <div className="space-y-2">
                                    <div className="flex items-start gap-3">
                                      <div className="flex gap-4">
                                        <Controller
                                          name={`${itemKey}_yes` as any}
                                          control={control}
                                          render={({ field }) => (
                                            <div className="flex items-center gap-1">
                                              <Checkbox
                                                id={`${itemKey}_yes`}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                              />
                                              <Label htmlFor={`${itemKey}_yes`} className="text-xs font-medium cursor-pointer">
                                                YES
                                              </Label>
                                            </div>
                                          )}
                                        />
                                        <Controller
                                          name={`${itemKey}_no` as any}
                                          control={control}
                                          render={({ field }) => (
                                            <div className="flex items-center gap-1">
                                              <Checkbox
                                                id={`${itemKey}_no`}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                              />
                                              <Label htmlFor={`${itemKey}_no`} className="text-xs font-medium cursor-pointer">
                                                NO
                                              </Label>
                                            </div>
                                          )}
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-xs font-medium text-foreground">
                                          {item.label}
                                        </div>
                                        {item.mov_description && (
                                          <div className="text-[11px] text-muted-foreground italic mt-0.5">
                                            {item.mov_description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : item.item_type === 'calculation_field' ? (
                                  // Calculation/input field
                                  <div className="space-y-2">
                                    {item.mov_description && (
                                      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded px-3 py-2">
                                        <div className="text-xs text-orange-800 dark:text-orange-300 italic">
                                          {item.mov_description}
                                        </div>
                                      </div>
                                    )}
                                    <div className="space-y-1">
                                      <Label htmlFor={itemKey} className="text-xs font-medium text-foreground">
                                        {item.label}
                                      </Label>
                                      <Controller
                                        name={itemKey as any}
                                        control={control}
                                        render={({ field }) => (
                                          <Input
                                            id={itemKey}
                                            type="text"
                                            placeholder="Enter value"
                                            {...field}
                                            className="h-9 text-sm"
                                          />
                                        )}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  // Regular checkbox item
                                  <div className="flex items-start gap-2">
                                    <Controller
                                      name={itemKey as any}
                                      control={control}
                                      render={({ field }) => (
                                        <Checkbox
                                          id={itemKey}
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                          className="mt-0.5"
                                        />
                                      )}
                                    />
                                    <div className="flex-1">
                                      <Label htmlFor={itemKey} className="text-xs font-medium text-foreground cursor-pointer leading-relaxed">
                                        {item.required && validationRule === 'ALL_ITEMS_REQUIRED' && (
                                          <span className="text-red-600 mr-1">*</span>
                                        )}
                                        {item.label}
                                      </Label>
                                      {item.mov_description && (
                                        <div className="text-[11px] text-muted-foreground italic mt-1">
                                          {item.mov_description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* VALIDATOR ONLY: Processing of Results Section */}
                  {isValidator && (
                    <div className="border border-black/10 rounded-sm bg-muted/10 p-3 space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide bg-yellow-100 dark:bg-yellow-950/30 text-yellow-900 dark:text-yellow-200 px-3 py-2 rounded border border-yellow-200 dark:border-yellow-800">
                        PROCESSING OF RESULTS
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-medium">Met all the minimum requirements on {indicatorLabel}?</div>
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

                  {/* Assessor Remarks for Validator */}
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Assessor Remarks for Validator (DILG-only)
                    </div>
                    <Textarea
                      {...register(`${key}.assessorRemarks` as const)}
                      placeholder={isAssessor ? "Add remarks for the validator to review..." : "Remarks from assessor"}
                      readOnly={isValidator}
                      disabled={isValidator}
                      className={isValidator ? 'bg-muted cursor-not-allowed' : ''}
                    />
                    {isAssessor && (
                      <div className="text-[11px] text-muted-foreground italic">
                        These remarks will be visible to validators during final validation
                      </div>
                    )}
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


