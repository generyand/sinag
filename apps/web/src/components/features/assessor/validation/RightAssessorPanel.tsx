"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/useAuthStore';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AssessmentDetailsResponse } from '@sinag/shared';
import { FileTextIcon, Info } from 'lucide-react';
import * as React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

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

/**
 * Physical/Financial Accomplishment Auto-Calculator
 *
 * For indicators: 2.1.4, 3.2.3, 4.1.6, 4.3.4, 4.5.6, 4.8.4, 6.1.4
 *
 * Physical: (accomplished / reflected) × 100 → auto YES if ≥50%
 * Financial: (utilized / allocated) × 100 → auto YES if ≥50%
 *
 * CANNOT BE OVERRIDDEN - purely calculation-based
 */
interface AccomplishmentAutoCalculatorProps {
  responseId: number;
  watched: Record<string, any>;
  indicatorCode: string;
  subIndicatorCode: string;
  type: 'physical' | 'financial';
  setValue: (name: string, value: any) => void;
}

function AccomplishmentAutoCalculator({
  responseId,
  watched,
  indicatorCode,
  subIndicatorCode,
  type,
  setValue
}: AccomplishmentAutoCalculatorProps) {
  // Build field keys based on the sub-indicator code pattern
  // e.g., for 2.1.4 physical: 2_1_4_physical_accomplished, 2_1_4_physical_reflected
  const subCode = subIndicatorCode.replace(/\./g, '_');

  const accomplishedKey = `checklist_${responseId}_${subCode}_${type}_accomplished`;
  const reflectedKey = `checklist_${responseId}_${subCode}_${type}_reflected`;
  const utilizedKey = `checklist_${responseId}_${subCode}_${type}_utilized`;
  const allocatedKey = `checklist_${responseId}_${subCode}_${type}_allocated`;

  // Get values from watched form state
  let numerator = 0;
  let denominator = 0;
  let numeratorLabel = '';
  let denominatorLabel = '';
  let formulaLabel = '';

  // Plan name mapping for indicator-specific formulas
  const planNameMap: Record<string, { physical: string; financial: string }> = {
    '2.1.4': { physical: 'BDRRMP', financial: '70% component of BDRRMF' },
    '3.2.3': { physical: 'BPOPS Plan', financial: 'BPOPS Plan' },
    '4.1.6': { physical: 'GAD Plan', financial: 'GAD Plan' },
    '4.3.4': { physical: 'BDP', financial: 'BDP' },
    '4.5.6': { physical: 'BCPC Plan', financial: 'BCPC Plan' },
    '4.8.4': { physical: 'BNAP', financial: 'BNAP' },
    '6.1.4': { physical: 'BESWMP', financial: 'BESWM Plan' },
  };
  const planName = planNameMap[subIndicatorCode]?.[type] || 'Plan';

  if (type === 'physical') {
    numerator = parseFloat(String(watched[accomplishedKey] || '').replace(/,/g, '')) || 0;
    denominator = parseFloat(String(watched[reflectedKey] || '').replace(/,/g, '')) || 0;
    numeratorLabel = 'Accomplished';
    denominatorLabel = `Reflected in ${planName}`;
    formulaLabel = `(Accomplished / Reflected in ${planName}) × 100`;
  } else {
    numerator = parseFloat(String(watched[utilizedKey] || '').replace(/,/g, '')) || 0;
    denominator = parseFloat(String(watched[allocatedKey] || '').replace(/,/g, '')) || 0;
    numeratorLabel = 'Amount Utilized';
    denominatorLabel = 'Amount Allocated';
    formulaLabel = `(Amount Utilized / Amount Allocated for ${planName}) × 100`;
  }

  const percentage = denominator > 0 ? (numerator / denominator) * 100 : 0;
  const hasValues = numerator > 0 || denominator > 0;
  const meetsThreshold = percentage >= 50;

  // Build the assessment field key for auto-setting YES/NO
  // Map sub-indicator codes to their assessment field IDs
  const assessmentFieldMap: Record<string, Record<string, string>> = {
    '2.1.4': { physical: '2_1_4_option_a', financial: '2_1_4_option_b' },
    '3.2.3': { physical: '3_2_3_option_a', financial: '3_2_3_option_b' },
    '4.1.6': { physical: '4_1_6_option_a', financial: '4_1_6_option_b' },
    '4.3.4': { physical: '4_3_4_option_a', financial: '4_3_4_option_b' },
    '4.5.6': { physical: '4_5_6_a', financial: '4_5_6_b' },
    '4.8.4': { physical: '4_8_4_option_a_check', financial: '4_8_4_option_b_check' },
    '6.1.4': { physical: '6_1_4_option_a', financial: '6_1_4_option_b' },
  };

  const assessmentFieldId = assessmentFieldMap[subIndicatorCode]?.[type];
  const yesKey = assessmentFieldId ? `checklist_${responseId}_${assessmentFieldId}_yes` : null;
  const noKey = assessmentFieldId ? `checklist_${responseId}_${assessmentFieldId}_no` : null;

  // Auto-set YES/NO based on calculation - CANNOT BE OVERRIDDEN
  React.useEffect(() => {
    if (!hasValues || !yesKey || !noKey) return;

    if (meetsThreshold) {
      setValue(yesKey, true);
      setValue(noKey, false);
    } else {
      setValue(yesKey, false);
      setValue(noKey, true);
    }
  }, [numerator, denominator, meetsThreshold, hasValues, yesKey, noKey, setValue]);

  if (!hasValues) return null;

  const bgColor = meetsThreshold
    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
    : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
  const textColor = meetsThreshold
    ? 'text-green-800 dark:text-green-300'
    : 'text-red-800 dark:text-red-300';
  const percentageColor = meetsThreshold
    ? 'text-green-900 dark:text-green-200'
    : 'text-red-900 dark:text-red-200';
  const subtextColor = meetsThreshold
    ? 'text-green-700 dark:text-green-400'
    : 'text-red-700 dark:text-red-400';

  return (
    <div className={`mt-3 p-3 border rounded-sm ${bgColor}`}>
      <div className={`text-xs font-medium mb-1 ${textColor}`}>
        {type === 'physical' ? 'Physical Accomplishment Rate' : 'Fund Utilization Rate'}
      </div>
      <div className={`text-lg font-bold ${percentageColor}`}>
        {percentage.toFixed(2)}%
      </div>
      <div className={`text-[11px] mt-1 italic ${subtextColor}`}>
        Formula: {formulaLabel}
      </div>
      <div className={`text-xs font-semibold mt-2 px-2 py-1 rounded inline-block ${
        meetsThreshold
          ? 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100'
          : 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100'
      }`}>
        {meetsThreshold ? '✓ AUTO-YES (≥50%)' : '✗ AUTO-NO (<50%)'}
      </div>
      <div className={`text-[10px] mt-1 ${subtextColor}`}>
        This value is automatically calculated and cannot be overridden.
      </div>
    </div>
  );
}

/**
 * Computed % Allocation for BDRRMF (Indicator 2.1.3)
 * Formula: (Amount of BDRRMF / Estimated revenue from regular sources) × 100
 */
function ComputedBDRRMFPercentage({ responseId, watched }: { responseId: number; watched: Record<string, any> }) {
  const estimatedRevenueKey = `checklist_${responseId}_2_1_3_estimated_revenue`;
  const bdrrmfAmountKey = `checklist_${responseId}_2_1_3_bdrrmf_amount`;

  const estimatedRevenue = parseFloat(String(watched[estimatedRevenueKey] || '').replace(/,/g, '')) || 0;
  const bdrrmfAmount = parseFloat(String(watched[bdrrmfAmountKey] || '').replace(/,/g, '')) || 0;

  const percentage = estimatedRevenue > 0 ? (bdrrmfAmount / estimatedRevenue) * 100 : 0;
  const hasValues = estimatedRevenue > 0 || bdrrmfAmount > 0;

  if (!hasValues) return null;

  return (
    <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-sm">
      <div className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
        % Allocation for BDRRMF
      </div>
      <div className="text-lg font-bold text-green-900 dark:text-green-200">
        {percentage.toFixed(2)}%
      </div>
      <div className="text-[11px] text-green-700 dark:text-green-400 mt-1 italic">
        Formula: (Amount of BDRRMF / Estimated revenue from regular sources) × 100
      </div>
    </div>
  );
}

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

/**
 * Assessor Checklist History Modal (Validator View)
 *
 * Shows validators what the assessor checked/filled during Phase 1 validation
 */
interface AssessorChecklistHistoryModalProps {
  response: AnyRecord;
  indicator: AnyRecord;
}

function AssessorChecklistHistoryModal({ response, indicator }: AssessorChecklistHistoryModalProps) {
  const responseData = (response.response_data as Record<string, any>) || {};
  const checklistItems = (indicator?.checklist_items as any[]) || [];
  const indicatorLabel = indicator?.name || `Indicator #${response.indicator_id}`;

  if (checklistItems.length === 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <FileTextIcon className="h-4 w-4" />
          View Assessor's History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 rounded-sm">
        <DialogHeader>
          <DialogTitle>Assessor's Checklist History</DialogTitle>
          <div className="text-sm text-muted-foreground">
            {indicatorLabel}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-2">
          <div className="space-y-4">
            {/* Group items by group_name if available */}
            {(() => {
              const groupedItems: Record<string, any[]> = {};
              const ungroupedItems: any[] = [];

              checklistItems.forEach((item) => {
                if (item.group_name) {
                  if (!groupedItems[item.group_name]) {
                    groupedItems[item.group_name] = [];
                  }
                  groupedItems[item.group_name].push(item);
                } else {
                  ungroupedItems.push(item);
                }
              });

              return (
                <>
                  {/* Render ungrouped items first */}
                  {ungroupedItems.length > 0 && (
                    <div className="space-y-3">
                      {ungroupedItems.map((item, idx) => (
                        <ChecklistItemHistory
                          key={item.id || idx}
                          item={item}
                          responseData={responseData}
                        />
                      ))}
                    </div>
                  )}

                  {/* Render grouped items */}
                  {Object.entries(groupedItems).map(([groupName, items]) => (
                    <div key={groupName} className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-foreground pb-1 border-b border-border">
                        {groupName}
                      </div>
                      {items.map((item, idx) => (
                        <ChecklistItemHistory
                          key={item.id || idx}
                          item={item}
                          responseData={responseData}
                        />
                      ))}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Individual checklist item display for history modal
 */
interface ChecklistItemHistoryProps {
  item: any;
  responseData: Record<string, any>;
}

function ChecklistItemHistory({ item, responseData }: ChecklistItemHistoryProps) {
  // Skip info_text items (they're not filled by assessors)
  if (item.item_type === 'info_text') {
    return null;
  }

  const itemId = item.item_id;

  // Determine the value(s) from response_data using assessor_val_ prefix
  let displayValue: React.ReactNode = null;
  let statusBadge: React.ReactNode = null;

  if (item.item_type === 'assessment_field') {
    // YES/NO checkbox fields
    const yesKey = `assessor_val_${itemId}_yes`;
    const noKey = `assessor_val_${itemId}_no`;
    const yesValue = responseData[yesKey] === true;
    const noValue = responseData[noKey] === true;

    if (yesValue) {
      statusBadge = (
        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          YES
        </span>
      );
    } else if (noValue) {
      statusBadge = (
        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          NO
        </span>
      );
    } else {
      statusBadge = (
        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          Not filled
        </span>
      );
    }
  } else if (item.item_type === 'document_count' || item.requires_document_count || item.item_type === 'calculation_field') {
    // Input fields (document count or calculation)
    const valueKey = `assessor_val_${itemId}`;
    const value = responseData[valueKey];

    // Filter out empty values and boolean false (which may be stored as string "false")
    const isValidValue = value && String(value).trim() !== '' && String(value).trim() !== 'false' && value !== false;
    if (isValidValue) {
      displayValue = (
        <span className="inline-flex items-center px-2 py-1 rounded-sm text-sm font-medium bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
          {String(value)}
        </span>
      );
    } else {
      displayValue = (
        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          Not filled
        </span>
      );
    }
  } else {
    // Regular checkbox item
    const checkboxKey = `assessor_val_${itemId}`;
    const isChecked = responseData[checkboxKey] === true;

    statusBadge = isChecked ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        Checked
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        Unchecked
      </span>
    );
  }

  return (
    <div className="border border-border rounded-sm p-3 bg-muted/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm font-medium text-foreground">
            {item.label}
          </div>
          {item.mov_description && item.mov_description !== item.label && (
            <div className="text-xs text-muted-foreground italic mt-1">
              {item.mov_description}
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          {statusBadge || displayValue}
        </div>
      </div>
    </div>
  );
}

export function RightAssessorPanel({ assessment, form, setField, expandedId, onToggle, onIndicatorSelect, checklistState, onChecklistChange }: RightAssessorPanelProps) {
  const data: AnyRecord = (assessment as unknown as AnyRecord) ?? {};
  const core = (data.assessment as AnyRecord) ?? data;
  const rawResponses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];

  // Sort responses by indicator code for consistent navigation
  const responses = React.useMemo(() => {
    return [...rawResponses].sort((a, b) => {
      const codeA = a.indicator?.indicator_code || a.indicator?.code || '';
      const codeB = b.indicator?.indicator_code || b.indicator?.code || '';
      return sortIndicatorCode(codeA, codeB);
    });
  }, [rawResponses]);

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
      const responseData = (r as AnyRecord).response_data || {};
      const indicator = (r.indicator as AnyRecord) ?? {};
      const checklistItems = (indicator?.checklist_items as any[]) || [];

      // VALIDATORS: Start with a CLEAN checklist (don't load assessor's data)
      // Validators do their own independent review - they shouldn't see assessor's checklist
      // ASSESSORS: Load existing validation data (assessor_val_ prefix)
      if (isValidator) {
        // Validators get empty checklist - they start fresh
        // Use validator_val_ prefix for their own data
        checklistItems.forEach((item: any) => {
          const itemKey = `checklist_${r.id}_${item.item_id}`;

          if (item.item_type === 'assessment_field') {
            // YES/NO checkboxes - start unchecked
            const yesKey = `validator_val_${item.item_id}_yes`;
            const noKey = `validator_val_${item.item_id}_no`;
            obj[`${itemKey}_yes`] = responseData[yesKey] ?? false;
            obj[`${itemKey}_no`] = responseData[noKey] ?? false;
          } else if (item.item_type === 'document_count' || item.item_type === 'calculation_field' || item.item_type === 'date_input' || item.requires_document_count) {
            // Input fields (document count, calculation, or date) - start empty
            // Convert false/boolean to empty string (legacy data may have false stored)
            const rawValue = responseData[`validator_val_${item.item_id}`];
            obj[itemKey] = (rawValue === false || rawValue === 'false' || rawValue == null) ? '' : rawValue;
          } else if (item.item_type !== 'info_text') {
            // Regular checkboxes - start unchecked
            obj[itemKey] = responseData[`validator_val_${item.item_id}`] ?? false;
          }
        });
      } else {
        // Assessors: Load existing validation data (assessor_val_ prefix)
        // This applies to BOTH:
        // 1. Indicators from first review (requires_rework=false) - load old validation data
        // 2. Indicators during rework (requires_rework=true) - load NEW validation work
        checklistItems.forEach((item: any) => {
          const itemKey = `checklist_${r.id}_${item.item_id}`;

          if (item.item_type === 'assessment_field') {
            // YES/NO checkboxes
            const yesKey = `assessor_val_${item.item_id}_yes`;
            const noKey = `assessor_val_${item.item_id}_no`;
            obj[`${itemKey}_yes`] = responseData[yesKey] ?? false;
            obj[`${itemKey}_no`] = responseData[noKey] ?? false;
          } else if (item.item_type === 'document_count' || item.item_type === 'calculation_field' || item.item_type === 'date_input' || item.requires_document_count) {
            // Input fields (document count, calculation, or date)
            // Convert false/boolean to empty string (legacy data may have false stored)
            const rawValue = responseData[`assessor_val_${item.item_id}`];
            obj[itemKey] = (rawValue === false || rawValue === 'false' || rawValue == null) ? '' : rawValue;
          } else if (item.item_type !== 'info_text') {
            // Regular checkboxes
            obj[itemKey] = responseData[`assessor_val_${item.item_id}`] ?? false;
          }
        });
      }
    }

    return obj as ResponsesForm;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses, isValidator, JSON.stringify(responses.map(r => (r as AnyRecord).response_data))]);

  const { control, register, formState, setValue, reset } = useForm<ResponsesForm>({
    resolver: zodResolver(ResponsesSchema),
    defaultValues,
    mode: 'onChange',
  });

  // Reset form when defaultValues change (e.g., after save and refetch)
  // This ensures the form reflects the latest data from the API
  React.useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // Helper function to check if an item is filled/checked
  const isItemFilled = (item: any, itemKey: string, checklistData: Record<string, any>): boolean => {
    // For document_count or calculation_field, check if value is provided
    if (item.item_type === 'document_count' || item.item_type === 'calculation_field' || item.requires_document_count) {
      const value = checklistData[itemKey];
      return value && String(value).trim() !== '';
    }
    // For assessment_field (YES/NO), check if YES is selected
    else if (item.item_type === 'assessment_field') {
      const yesValue = checklistData[`${itemKey}_yes`];
      return yesValue === true;
    }
    // Regular checkbox item
    else {
      return checklistData[itemKey] === true;
    }
  };

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

    // Check if this indicator uses option_group (OR logic between groups)
    const hasOptionGroups = validatableItems.some((item: any) => item.option_group);

    if (hasOptionGroups) {
      // Group items by option_group
      const groups: Record<string, any[]> = {};
      const ungroupedItems: any[] = [];

      for (const item of validatableItems) {
        if (item.option_group) {
          if (!groups[item.option_group]) {
            groups[item.option_group] = [];
          }
          groups[item.option_group].push(item);
        } else {
          ungroupedItems.push(item);
        }
      }

      // Check if ALL ungrouped items are filled (these are required regardless)
      for (const item of ungroupedItems) {
        const itemKey = `checklist_${responseId}_${item.item_id}`;
        if (!isItemFilled(item, itemKey, checklistData)) {
          return 'Fail'; // Required ungrouped item not filled
        }
      }

      // For OR logic: at least ONE option group must be complete
      // Option 1 & 2: ALL items in group must be filled
      // Option 3: ANY item in group must be filled (internal OR logic)
      const groupNames = Object.keys(groups);
      if (groupNames.length > 0) {
        let anyGroupComplete = false;

        for (const groupName of groupNames) {
          const groupItems = groups[groupName];

          // Check if this group has internal OR logic (Option 3)
          // Option 3 typically has multiple file upload items where either one satisfies
          const hasInternalOr = groupName.includes('Option 3') || groupName.includes('OPTION 3');

          let groupComplete = false;

          if (hasInternalOr) {
            // Internal OR: ANY item filled = group complete
            for (const item of groupItems) {
              const itemKey = `checklist_${responseId}_${item.item_id}`;
              if (isItemFilled(item, itemKey, checklistData)) {
                groupComplete = true;
                break;
              }
            }
          } else {
            // Standard: ALL items must be filled
            groupComplete = true;
            for (const item of groupItems) {
              const itemKey = `checklist_${responseId}_${item.item_id}`;
              if (!isItemFilled(item, itemKey, checklistData)) {
                groupComplete = false;
                break;
              }
            }
          }

          if (groupComplete) {
            anyGroupComplete = true;
            break; // One complete group is enough for OR logic
          }
        }

        return anyGroupComplete ? 'Pass' : 'Fail';
      }

      return 'Pass'; // No grouped items, and all ungrouped items are filled
    }

    // Standard validation (no option groups)
    let checkedCount = 0;
    let totalRequired = 0;

    for (const item of validatableItems) {
      const itemKey = `checklist_${responseId}_${item.item_id}`;

      if (isItemFilled(item, itemKey, checklistData)) {
        checkedCount++;
      }
      if (item.required || validationRule === 'ALL_ITEMS_REQUIRED') {
        totalRequired++;
      }
    }

    // Apply validation logic
    if (validationRule === 'ALL_ITEMS_REQUIRED') {
      // All required items must be checked
      return checkedCount >= totalRequired ? 'Pass' : 'Fail';
    } else if (validationRule === 'ANY_ITEM_REQUIRED' || validationRule === 'OR_LOGIC_AT_LEAST_1_REQUIRED') {
      // At least one item must be checked
      return checkedCount > 0 ? 'Pass' : 'Fail';
    }

    // Default: if at least one item is checked, pass
    return checkedCount > 0 ? 'Pass' : null;
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
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center px-3 border-b border-[var(--border)] bg-muted/5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileTextIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground truncate">
            {isValidator ? 'Validator Controls' : 'Assessor Controls'}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
        {responses.length === 0 ? (
          <div className="text-sm text-muted-foreground">No indicators found.</div>
        ) : expandedId == null ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground/60 min-h-[400px]">
            <div className="bg-muted/10 p-4 rounded-full mb-4">
              <FileTextIcon className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium text-foreground/80 mb-1">No Indicator Selected</p>
            <p className="text-xs max-w-[200px]">
              Select an indicator from the left panel to begin validation
            </p>
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
            // Get notes from form_schema (used for composition notes, considerations, etc.)
            const formSchemaNotes = (indicator?.form_schema as AnyRecord)?.notes as { title?: string; items?: Array<{ label?: string; text?: string }> } | null;
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

                  {/* Form Schema Notes (composition notes, considerations, etc.) */}
                  {formSchemaNotes && formSchemaNotes.items && formSchemaNotes.items.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-sm p-3">
                      <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-2">
                        {formSchemaNotes.title || 'Note:'}
                      </div>
                      <div className="space-y-0.5">
                        {formSchemaNotes.items.map((noteItem, noteIdx) => {
                          // Check if this is a sub-item (label starts with spaces)
                          const isSubItem = noteItem.label?.startsWith('   ');
                          // Check if this is a section header (no label, bold text)
                          const isSectionHeader = !noteItem.label && noteItem.text && !noteItem.text.match(/^\d+\./);
                          // Check if empty line (spacer)
                          const isEmpty = !noteItem.label && !noteItem.text;

                          if (isEmpty) {
                            return <div key={noteIdx} className="h-2" />;
                          }

                          return (
                            <div
                              key={noteIdx}
                              className={`text-xs text-amber-800 dark:text-amber-300 ${isSubItem ? 'pl-4' : ''} ${isSectionHeader ? 'font-semibold mt-2' : ''}`}
                            >
                              {noteItem.label && (
                                <span className="font-medium mr-1">
                                  {noteItem.label.trim()}
                                </span>
                              )}
                              {noteItem.text}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Checklist Items with Interactive Controls */}
                  {(() => {
                    const checklistItems = (indicator?.checklist_items as any[]) || [];
                    const validationRule = indicator?.validation_rule || 'ALL_ITEMS_REQUIRED';
                    const indicatorCode = indicator?.indicator_code || indicator?.code || '';

                    if (checklistItems.length === 0) return null;

                    // Helper to render a single checklist item
                    const renderChecklistItem = (item: any, itemIdx: number) => {
                      const itemKey = `checklist_${r.id}_${item.item_id}`;
                      const prevItem = itemIdx > 0 ? checklistItems[itemIdx - 1] : null;
                      const showGroupHeader = item.group_name && item.group_name !== prevItem?.group_name;

                      return (
                        <React.Fragment key={item.id || itemIdx}>
                        <div className="space-y-2">
                          {/* Group Header (only for non-accordion mode) */}
                          {showGroupHeader && !item.option_group && (
                            <div className="text-xs font-semibold uppercase tracking-wide text-foreground mt-3 mb-1 pb-1 border-b border-border">
                              {item.group_name}
                            </div>
                          )}

                          {item.item_type === 'section_header' ? (
                            // Section header - skip in accordion mode (handled by accordion title)
                            null
                          ) : item.item_type === 'date_input' ? (
                            // Date input field for approval dates
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
                                      type="date"
                                      value={field.value as any}
                                      onChange={field.onChange}
                                      onBlur={field.onBlur}
                                      name={field.name}
                                      ref={field.ref}
                                      className="h-9 text-sm w-40 flex-shrink-0"
                                    />
                                  )}
                                />
                                <span className="text-xs text-foreground leading-relaxed">
                                  {item.label}
                                </span>
                              </div>
                            </div>
                          ) : (item.item_type === 'document_count' || item.requires_document_count) ? (
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
                                      placeholder={item.label?.toLowerCase().includes('hazard') ? 'Enter Type of Hazard' : 'Enter count'}
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
                            item.label === 'OR' ? (
                              // OR separator - special styling
                              <div className="flex items-center gap-3 my-2">
                                <div className="flex-1 h-px bg-orange-300 dark:bg-orange-700" />
                                <span className="text-sm font-bold text-orange-600 dark:text-orange-400 px-2">OR</span>
                                <div className="flex-1 h-px bg-orange-300 dark:bg-orange-700" />
                              </div>
                            ) : (
                              // Regular info text
                              <div className="text-xs text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded px-3 py-2">
                                {item.label}
                                {item.mov_description && item.mov_description !== item.label && (
                                  <div className="text-[11px] text-blue-700 dark:text-blue-300 italic mt-1">{item.mov_description}</div>
                                )}
                              </div>
                            )
                          ) : item.item_type === 'assessment_field' ? (
                            // YES/NO radio buttons for validator assessment (mutually exclusive)
                            (() => {
                              // Check if this is an auto-calculated field that should be read-only
                              const autoCalcIndicators = ['2.1.4', '3.2.3', '4.1.6', '4.3.4', '4.5.6', '4.8.4', '6.1.4'];
                              const autoCalcFieldIds = [
                                // Physical option fields
                                '2_1_4_option_a', '3_2_3_option_a', '4_1_6_option_a', '4_3_4_option_a',
                                '4_5_6_a', '4_8_4_option_a_check', '6_1_4_option_a',
                                // Financial option fields
                                '2_1_4_option_b', '3_2_3_option_b', '4_1_6_option_b', '4_3_4_option_b',
                                '4_5_6_b', '4_8_4_option_b_check', '6_1_4_option_b',
                              ];
                              const isAutoCalculated = autoCalcIndicators.includes(indicatorCode) &&
                                autoCalcFieldIds.includes(item.item_id);

                              return (
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
                                              disabled={isAutoCalculated}
                                              onCheckedChange={(checked) => {
                                                if (isAutoCalculated) return; // Prevent manual change
                                                field.onChange(checked);
                                                // If YES is checked, uncheck NO (mutually exclusive)
                                                if (checked) {
                                                  setValue(`${itemKey}_no` as any, false as any);
                                                }
                                              }}
                                              className={isAutoCalculated ? 'opacity-60' : ''}
                                            />
                                            <Label
                                              htmlFor={`${itemKey}_yes`}
                                              className={`text-xs font-medium ${isAutoCalculated ? 'text-muted-foreground' : 'cursor-pointer'}`}
                                            >
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
                                              disabled={isAutoCalculated}
                                              onCheckedChange={(checked) => {
                                                if (isAutoCalculated) return; // Prevent manual change
                                                field.onChange(checked);
                                                // If NO is checked, uncheck YES (mutually exclusive)
                                                if (checked) {
                                                  setValue(`${itemKey}_yes` as any, false as any);
                                                }
                                              }}
                                              className={isAutoCalculated ? 'opacity-60' : ''}
                                            />
                                            <Label
                                              htmlFor={`${itemKey}_no`}
                                              className={`text-xs font-medium ${isAutoCalculated ? 'text-muted-foreground' : 'cursor-pointer'}`}
                                            >
                                              NO
                                            </Label>
                                          </div>
                                        )}
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-xs font-medium text-foreground">
                                        {item.label}
                                        {isAutoCalculated && (
                                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-normal">
                                            Auto-calculated
                                          </span>
                                        )}
                                      </div>
                                      {/* MOV descriptions removed - redundant with label */}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()
                          ) : item.item_type === 'calculation_field' ? (
                            // Calculation/input field with optional mov_description box
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
                                      placeholder="Enter value"
                                      value={field.value as any}
                                      onChange={field.onChange}
                                      onBlur={field.onBlur}
                                      name={field.name}
                                      ref={field.ref}
                                      className="h-9 text-sm w-24 flex-shrink-0"
                                    />
                                  )}
                                />
                                <span className="text-xs text-foreground leading-relaxed">
                                  {item.label}
                                </span>
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
                                {/* MOV descriptions removed - redundant with label */}
                              </div>
                            </div>
                          )}

                          {/* Field Notes (CONSIDERATION, etc.) - rendered below each checklist item */}
                          {item.field_notes && item.field_notes.items && item.field_notes.items.length > 0 && (
                            <div className="ml-6 mt-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-sm p-3">
                              <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
                                {item.field_notes.title || 'Note:'}
                              </div>
                              <div className="space-y-1">
                                {item.field_notes.items.map((noteItem: any, noteIdx: number) => (
                                  <div key={noteIdx} className="text-xs text-amber-800 dark:text-amber-300">
                                    {noteItem.label && (
                                      <span className="font-medium mr-1">{noteItem.label}</span>
                                    )}
                                    {noteItem.text}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Computed % Allocation for BDRRMF (Indicator 2.1.3) */}
                        {indicatorCode === '2.1.3' && item.item_id === '2_1_3_bdrrmf_amount' && (
                          <ComputedBDRRMFPercentage
                            responseId={r.id}
                            watched={watched}
                          />
                        )}

                        {/* Auto-calculated Physical/Financial Accomplishment for specific indicators */}
                        {/* Physical: show after physical_reflected field */}
                        {['2.1.4', '3.2.3', '4.1.6', '4.3.4', '4.5.6', '4.8.4', '6.1.4'].includes(indicatorCode) &&
                          item.item_id?.endsWith('_physical_reflected') && (
                          <AccomplishmentAutoCalculator
                            responseId={r.id}
                            watched={watched}
                            indicatorCode={indicatorCode}
                            subIndicatorCode={indicatorCode}
                            type="physical"
                            setValue={setValue}
                          />
                        )}

                        {/* Financial: show after financial_allocated field */}
                        {['2.1.4', '3.2.3', '4.1.6', '4.3.4', '4.5.6', '4.8.4', '6.1.4'].includes(indicatorCode) &&
                          item.item_id?.endsWith('_financial_allocated') && (
                          <AccomplishmentAutoCalculator
                            responseId={r.id}
                            watched={watched}
                            indicatorCode={indicatorCode}
                            subIndicatorCode={indicatorCode}
                            type="financial"
                            setValue={setValue}
                          />
                        )}
                        </React.Fragment>
                      );
                    };

                    // Check if this indicator uses option groups (for accordion rendering)
                    const hasOptionGroups = checklistItems.some((item: any) => item.option_group);

                    // Group items by option_group for accordion rendering
                    interface OptionGroupData {
                      name: string;
                      label: string;
                      items: any[];
                    }

                    const groupedByOptionGroup = (): OptionGroupData[] | null => {
                      if (!hasOptionGroups) return null;

                      const groups: OptionGroupData[] = [];
                      let currentGroup: OptionGroupData | null = null;

                      for (const item of checklistItems) {
                        // Skip OR separators between option groups (accordion handles this visually)
                        if (item.item_type === 'info_text' && item.label === 'OR' && !item.option_group) {
                          continue;
                        }

                        if (item.option_group) {
                          // Check if we need to start a new group
                          if (!currentGroup || currentGroup.name !== item.option_group) {
                            // Find the section header for this group to use as label
                            const sectionHeader = checklistItems.find(
                              (i: any) => i.option_group === item.option_group && i.item_type === 'section_header'
                            );
                            currentGroup = {
                              name: item.option_group,
                              label: sectionHeader?.label || item.option_group,
                              items: []
                            };
                            groups.push(currentGroup);
                          }
                          // Add item to current group (excluding section headers from content)
                          if (item.item_type !== 'section_header') {
                            currentGroup.items.push(item);
                          }
                        }
                      }

                      return groups.length > 0 ? groups : null;
                    };

                    const optionGroups = groupedByOptionGroup();

                    return (
                      <div className="border border-[var(--border)] rounded-sm bg-card">
                        <div className="px-3 py-2 border-b border-[var(--border)] bg-muted/5">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
                              Validation Checklist
                              {(validationRule === 'ANY_ITEM_REQUIRED' || validationRule === 'ANY_OPTION_GROUP_REQUIRED') && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 font-normal normal-case dark:bg-yellow-900/30 dark:text-yellow-200">
                                  OR Logic: At least 1 required
                                </span>
                              )}
                            </div>
                            {/* Assessor Checklist History Button (Validators Only) */}
                            {isValidator && (
                              <AssessorChecklistHistoryModal
                                response={r as AnyRecord}
                                indicator={indicator}
                              />
                            )}
                          </div>
                        </div>

                        {/* Option Groups with Accordion */}
                        {optionGroups ? (
                          <div className="p-3">
                            {/* Info alert */}
                            <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                              <Info className="h-4 w-4 text-blue-600" />
                              <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
                                <strong>Choose ONE option</strong> that applies to your barangay's situation. You only need to validate one option.
                              </AlertDescription>
                            </Alert>

                            <Accordion type="single" collapsible className="space-y-3">
                              {optionGroups.map((group) => (
                                  <AccordionItem
                                    key={group.name}
                                    value={group.name}
                                    className="border border-gray-200 rounded-lg overflow-hidden bg-card"
                                  >
                                    <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
                                      <span className="font-medium text-sm text-left">{group.label}</span>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-3 pt-3 pb-4">
                                      <div className="space-y-3">
                                        {group.items.map((item: any, idx: number) => renderChecklistItem(item, idx))}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                              ))}
                            </Accordion>
                          </div>
                        ) : (
                          // Default flat rendering (no option groups)
                          <div className="p-3 space-y-3">
                            {checklistItems.map((item: any, itemIdx: number) => renderChecklistItem(item, itemIdx))}
                          </div>
                        )}
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

                    // Calculate automatic status based on checklist completion
                    // ENABLED for validators: shows suggestion with lighter colors, but requires click to confirm
                    const checklistData = watched || {};
                    const autoStatus = calculateAutomaticStatus(r.id, checklistData);
                    const isManualOverride = manualOverrides[r.id] || false;
                    const currentStatus = form[r.id]?.status;
                    // For validators: suggestion is shown with lighter color until they click to confirm
                    const hasSuggestion = isValidator && autoStatus && !currentStatus;

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
                              const isSuggested = hasSuggestion && autoStatus === value;
                              const isAutoRecommended = autoStatus === value && !isManualOverride && currentStatus;

                              // Determine button style based on state:
                              // 1. Active (clicked): Full color
                              // 2. Suggested (not clicked yet): Light color to hint recommendation
                              // 3. Default: Outline
                              let cls = '';
                              let style: React.CSSProperties | undefined = undefined;
                              let variant: 'default' | 'outline' = 'outline';

                              if (active) {
                                // Full color when actively selected
                                variant = 'default';
                                cls = value === 'Pass' || value === 'Fail'
                                  ? 'text-white hover:opacity-90'
                                  : 'text-[var(--cityscape-accent-foreground)] hover:opacity-90';
                                style = value === 'Pass'
                                  ? { background: 'var(--success)' }
                                  : value === 'Fail'
                                    ? { background: 'var(--destructive, #ef4444)' }
                                    : { background: 'var(--cityscape-yellow)' };
                              } else if (isSuggested) {
                                // Light color for suggestion (validator hasn't clicked yet)
                                variant = 'outline';
                                cls = value === 'Pass'
                                  ? 'border-green-400 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-700'
                                  : value === 'Fail'
                                    ? 'border-red-400 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-700'
                                    : 'border-yellow-400 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-700';
                              }

                              return (
                                <Button
                                  key={value}
                                  type="button"
                                  variant={variant}
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
                                  {isSuggested && <span className="ml-1 text-xs">(suggested)</span>}
                                  {isAutoRecommended && <span className="ml-1">✓</span>}
                                </Button>
                              );
                            })}
                          </div>
                          {hasSuggestion && (
                            <div className="text-[11px] text-muted-foreground italic mt-1">
                              Suggestion based on checklist. Click to confirm or choose a different option.
                            </div>
                          )}
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
                      {isValidator ? "Validator's Findings" : "Assessor's Notes"}
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
    </div>
  );
}


