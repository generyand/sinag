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
  form: Record<number, { status?: LocalStatus; publicComment?: string }>;
  setField: (responseId: number, field: 'status' | 'publicComment', value: string) => void;
  expandedId?: number | null;
  onToggle?: (responseId: number) => void;
  onIndicatorSelect?: (indicatorId: string) => void;
  // Optional: External checklist state for persistence (if parent wants to track it)
  checklistState?: Record<string, any>;
  onChecklistChange?: (key: string, value: any) => void;
}

type AnyRecord = Record<string, any>;

type LocalStatus = 'Pass' | 'Fail' | 'Conditional' | undefined;

export function RightAssessorPanel({ assessment, form, setField, expandedId, onToggle, onIndicatorSelect, checklistState, onChecklistChange }: RightAssessorPanelProps) {
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

    // Initialize response-level data (status and comments)
    for (const r of responses) {
      const key = String(r.id);

      // CRITICAL: For indicators requiring rework, do NOT load old comments from first review cycle
      // Only load comments if NOT requiring rework
      let publicComment = '';
      if (!(r as AnyRecord).requires_rework) {
        // Load public comment from feedback_comments array (get LATEST comment, not first)
        const feedbackComments = (r as AnyRecord).feedback_comments || [];
        const validationComments = feedbackComments.filter((fc: any) => fc.comment_type === 'validation' && !fc.is_internal_note);
        // Sort by created_at DESC to get the latest comment
        validationComments.sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // DESC order
        });
        const publicFeedback = validationComments[0];
        publicComment = publicFeedback?.comment || form[r.id]?.publicComment || '';
      }

      // Load validation status from database
      // For validators: ONLY load from validation_status (database), ignore form state
      // For assessors: use form state only (no validation_status field)
      let status: LocalStatus = undefined;
      if (isValidator) {
        // Validators: load ONLY from database validation_status
        if ((r as AnyRecord).validation_status) {
          const dbStatus = String((r as AnyRecord).validation_status);
          // Database stores capitalized values: 'Pass', 'Fail', 'Conditional'
          status = (dbStatus === 'Pass' ? 'Pass' : dbStatus === 'Fail' ? 'Fail' : dbStatus === 'Conditional' ? 'Conditional' : undefined) as LocalStatus;
        }
        // If validation_status is null, status remains undefined (not reviewed)
      } else {
        // Assessors: use form state
        status = form[r.id]?.status;
      }

      obj[key] = {
        status,
        publicComment,
      };

      // Initialize checklist data from response_data
      // IMPORTANT: ALWAYS load assessor validation data (assessor_val_ prefix), regardless of requires_rework status
      // This allows the assessor to see their progress during rework review cycle
      const responseData = (r as AnyRecord).response_data || {};
      const indicator = (r.indicator as AnyRecord) ?? {};
      const checklistItems = (indicator?.checklist_items as any[]) || [];

      // Load existing checklist values from response_data (with "assessor_val_" prefix)
      // This applies to BOTH:
      // 1. Indicators from first review (requires_rework=false) - load old validation data
      // 2. Indicators during rework (requires_rework=true) - load NEW validation work
      // NOTE: Form state (useForm) is the source of truth for checklist data during the session
      // defaultValues only initialize once on mount, subsequent changes are tracked in form state
      checklistItems.forEach((item: any) => {
        const itemKey = `checklist_${r.id}_${item.item_id}`;

        if (item.item_type === 'assessment_field') {
          // YES/NO checkboxes
          const yesKey = `assessor_val_${item.item_id}_yes`;
          const noKey = `assessor_val_${item.item_id}_no`;
          obj[`${itemKey}_yes`] = responseData[yesKey] ?? false;
          obj[`${itemKey}_no`] = responseData[noKey] ?? false;
        } else if (item.item_type === 'document_count' || item.requires_document_count) {
          // Input fields
          obj[itemKey] = responseData[`assessor_val_${item.item_id}`] ?? '';
        } else if (item.item_type !== 'info_text') {
          // Regular checkboxes
          obj[itemKey] = responseData[`assessor_val_${item.item_id}`] ?? false;
        }
      });
    }

    return obj as ResponsesForm;
  }, [responses]);

  const { control, register, formState } = useForm<ResponsesForm>({
    resolver: zodResolver(ResponsesSchema),
    defaultValues,
    mode: 'onChange',
  });

  // Helper function to calculate automatic status based on checklist
  const calculateAutomaticStatus = React.useCallback((responseId: number, checklistData: Record<string, any>): LocalStatus | null => {
    const response = responses.find(r => r.id === responseId);
    if (!response) return null;

    const indicator = (response.indicator as AnyRecord) ?? {};
    const checklistItems = (indicator?.checklist_items as any[]) || [];
    const validationRule = indicator?.validation_rule || 'ALL_ITEMS_REQUIRED';

    if (checklistItems.length === 0) return null;

    // Filter out non-validatable items (info_text, etc.)
    const validatableItems = checklistItems.filter((item: any) =>
      item.item_type !== 'info_text' && !item.mov_description?.startsWith('Note:')
    );

    if (validatableItems.length === 0) return null;

    // Count checked/filled items
    let checkedCount = 0;
    let totalRequired = 0;

    for (const item of validatableItems) {
      const itemKey = `checklist_${responseId}_${item.item_id}`;

      // For document_count or calculation_field, check if value is provided
      if (item.item_type === 'document_count' || item.item_type === 'calculation_field' || item.requires_document_count) {
        const value = checklistData[itemKey];
        if (value && String(value).trim() !== '') {
          checkedCount++;
        }
        if (item.required || validationRule === 'ALL_ITEMS_REQUIRED') {
          totalRequired++;
        }
      }
      // For assessment_field (YES/NO), check if either YES or NO is selected
      else if (item.item_type === 'assessment_field') {
        const yesValue = checklistData[`${itemKey}_yes`];
        const noValue = checklistData[`${itemKey}_no`];
        if (yesValue === true) {
          checkedCount++;
        }
        if (item.required || validationRule === 'ALL_ITEMS_REQUIRED') {
          totalRequired++;
        }
      }
      // Regular checkbox item
      else {
        if (checklistData[itemKey] === true) {
          checkedCount++;
        }
        if (item.required || validationRule === 'ALL_ITEMS_REQUIRED') {
          totalRequired++;
        }
      }
    }

    // Apply validation logic
    if (validationRule === 'ALL_ITEMS_REQUIRED') {
      // All required items must be checked
      return checkedCount >= totalRequired ? 'Pass' : 'Fail';
    } else if (validationRule === 'ANY_ITEM_REQUIRED') {
      // At least one item must be checked
      return checkedCount > 0 ? 'Pass' : 'Fail';
    }

    return null;
  }, [responses]);

  // Track manual overrides separately
  const [manualOverrides, setManualOverrides] = React.useState<Record<number, boolean>>({});

  // Sync RHF state upward so footer logic remains accurate
  const watched = useWatch({ control });
  React.useEffect(() => {
    Object.entries(watched || {}).forEach(([key, v]) => {
      const id = Number(key);
      if (!Number.isFinite(id)) {
        // This is checklist data (not a response ID)
        // Sync checklist changes to parent
        if (onChecklistChange) {
          onChecklistChange(key, v);
        }
        return;
      }
      const val = v as { status?: LocalStatus; publicComment?: string };

      // IMPORTANT: Only sync status if it's a truthy value to avoid clearing existing state
      // When val.status is undefined (from form defaultValues), we should NOT overwrite
      // the parent's form state which may already have a value from user interaction
      if (val.status && val.status !== form[id]?.status) {
        setField(id, 'status', val.status);
      }
      // For comments, also check for actual value to avoid unnecessary clears
      if (val.publicComment !== undefined && val.publicComment !== form[id]?.publicComment) {
        setField(id, 'publicComment', val.publicComment || '');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched]);

  // DISABLED: Auto-calculation for validators
  // Validators should manually decide Met/Unmet based on assessor's work, not auto-calculate from checklist
  // Only assessors need auto-calculation since they're the ones filling the checklist
  // React.useEffect(() => {
  //   if (!isValidator || !expandedId) return;
  //   // Don't auto-update if this indicator has been manually overridden
  //   if (manualOverrides[expandedId]) return;
  //   const checklistData = watched || {};
  //   const autoStatus = calculateAutomaticStatus(expandedId, checklistData);
  //   if (autoStatus && form[expandedId]?.status !== autoStatus) {
  //     setField(expandedId, 'status', autoStatus);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [watched, expandedId, isValidator, manualOverrides]);

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
                                            value={field.value as any}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                            ref={field.ref}
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
                                                checked={field.value as any}
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
                                                checked={field.value as any}
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
                                            value={field.value as any}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                            ref={field.ref}
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
                                          checked={field.value as any}
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

                  {/* Processing of Results Section (Validators Only) */}
                  {isValidator && (() => {
                    // Check if indicator has consideration condition
                    const indicator = (r as AnyRecord).indicator as AnyRecord | undefined;
                    const remarkSchema = indicator?.remark_schema as AnyRecord | undefined;
                    const conditionalRemarks = (remarkSchema?.conditional_remarks as AnyRecord[]) || [];
                    const hasConsideration = conditionalRemarks.some(
                      (cr) => cr.condition?.toLowerCase() === 'considered' || cr.condition?.toLowerCase() === 'conditional'
                    );

                    // Calculate automatic status (DISABLED for validators - they make manual decisions)
                    const checklistData = watched || {};
                    const autoStatus = isValidator ? null : calculateAutomaticStatus(r.id, checklistData);
                    const isManualOverride = manualOverrides[r.id] || false;
                    const currentStatus = form[r.id]?.status;

                    // Validators use Met/Unmet/Considered
                    const statuses: Array<{value: LocalStatus; label: string}> = [
                      { value: 'Pass', label: 'Met' },
                      { value: 'Fail', label: 'Unmet' },
                    ];

                    // Only add "Considered" if indicator has consideration condition
                    if (hasConsideration) {
                      statuses.push({ value: 'Conditional', label: 'Considered' });
                    }

                    return (
                      <div className="border border-black/10 rounded-sm bg-muted/10 p-3 space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-wide bg-purple-100 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 px-3 py-2 rounded border border-purple-200 dark:border-purple-800">
                          PHASE 2: FINAL VALIDATION
                        </div>

                        {/* Automatic Result Display */}
                        {autoStatus && (
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-sm p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-medium text-blue-900 dark:text-blue-200">
                                Automatic Result:
                              </div>
                              <div className={`text-xs font-semibold px-2 py-1 rounded ${
                                autoStatus === 'Pass'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {autoStatus === 'Pass' ? 'Met' : 'Unmet'}
                              </div>
                            </div>
                            <div className="text-[11px] text-blue-700 dark:text-blue-300 italic">
                              Based on checklist validation. You can override this result below if needed.
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="text-xs font-medium">
                            {isManualOverride && !isValidator && (
                              <span className="text-orange-600 dark:text-orange-400 mr-1">⚠️ Manual Override: </span>
                            )}
                            Met all the minimum requirements on {indicatorLabel}?
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {statuses.map(({ value, label }) => {
                              const active = currentStatus === value;
                              const isAutoRecommended = autoStatus === value && !isManualOverride;
                              const cls = active
                                ? value === 'Pass'
                                  ? 'text-white hover:opacity-90'
                                  : value === 'Fail'
                                    ? 'text-white hover:opacity-90'
                                    : 'text-[var(--cityscape-accent-foreground)] hover:opacity-90'
                                : '';
                              const style = active
                                ? value === 'Pass'
                                  ? { background: 'var(--success)' }
                                  : value === 'Fail'
                                    ? { background: 'var(--destructive, #ef4444)' }
                                    : { background: 'var(--cityscape-yellow)' }
                                : undefined;
                              return (
                                <Button
                                  key={value}
                                  type="button"
                                  variant={active ? 'default' : 'outline'}
                                  size="sm"
                                  className={cls}
                                  style={style}
                                  onClick={() => {
                                    setField(r.id, 'status', value as string);
                                    // Mark as manual override if different from auto status
                                    if (value !== autoStatus) {
                                      setManualOverrides(prev => ({ ...prev, [r.id]: true }));
                                    } else {
                                      setManualOverrides(prev => ({ ...prev, [r.id]: false }));
                                    }
                                  }}
                                >
                                  {label}
                                  {isAutoRecommended && <span className="ml-1">✓</span>}
                                </Button>
                              );
                            })}
                          </div>
                          {isManualOverride && !isValidator && (
                            <div className="text-[11px] text-orange-600 dark:text-orange-400 flex items-center gap-1">
                              <span>You have manually overridden the automatic result.</span>
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-[11px] text-blue-600 dark:text-blue-400 underline"
                                onClick={() => {
                                  if (autoStatus) {
                                    setField(r.id, 'status', autoStatus);
                                    setManualOverrides(prev => ({ ...prev, [r.id]: false }));
                                  }
                                }}
                              >
                                Reset to automatic
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Role-Specific Information Message */}
                  {isAssessor ? (
                    <div className="border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 rounded-sm p-3">
                      <div className="text-xs text-blue-800 dark:text-blue-300">
                        <div className="font-semibold mb-1">ℹ️ Phase 1: Table Assessment</div>
                        <div>Review checklists and provide feedback comments on areas needing improvement. If deficiencies are found, document them and send for Rework (one-time only). If everything is acceptable, proceed to finalize.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800 rounded-sm p-3">
                      <div className="text-xs text-purple-800 dark:text-purple-300">
                        <div className="font-semibold mb-1">ℹ️ Phase 2: Table Validation</div>
                        <div>Review checklists and assessor notes, then set final Met/Unmet/Considered status. This is the authoritative validation result that determines compliance.</div>
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

                  {/* Show assessor remarks for validators (read-only display) */}
                  {isValidator && (() => {
                    const resp = r as AnyRecord;
                    const remarks = resp.assessor_remarks as string | undefined;
                    if (remarks) {
                      return (
                        <div className="space-y-1">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Remarks from Assessor
                          </div>
                          <div className="text-sm p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                            {remarks}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="pt-2 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const prev = responses[idx - 1];
                        if (prev) {
                          onToggle?.(prev.id);
                          onIndicatorSelect?.(String(prev.id));
                        }
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
                        if (next) {
                          onToggle?.(next.id);
                          onIndicatorSelect?.(String(next.id));
                        }
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


