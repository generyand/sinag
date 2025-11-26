'use client';

import { type CalculationRule } from '@/store/useCalculationRuleStore';
import type { FormSchema } from '@sinag/shared';
import { FieldSelector } from './FieldSelector';
import { OperatorSelector } from './OperatorSelector';
import { ValueInput } from './ValueInput';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface RuleConfigFormProps {
  rule: CalculationRule;
  formSchema?: FormSchema | null;
  onChange: (updatedRule: CalculationRule) => void;
}

/**
 * RuleConfigForm - Dynamic form for configuring calculation rules
 *
 * Renders different form fields based on the rule type.
 * Each rule type has specific configuration requirements.
 */
export function RuleConfigForm({ rule, formSchema, onChange }: RuleConfigFormProps) {
  const ruleType = rule.rule_type;

  // Common: Description field (all rule types support it)
  const renderDescriptionField = () => (
    <div className="space-y-2">
      <Label htmlFor="description">Description (Optional)</Label>
      <Textarea
        id="description"
        placeholder="Human-readable description of this rule"
        value={rule.description || ''}
        onChange={(e) => onChange({ ...rule, description: e.target.value || undefined })}
        rows={2}
      />
      <p className="text-xs text-muted-foreground">
        Helpful explanation for other users reviewing this rule
      </p>
    </div>
  );

  switch (ruleType) {
    case 'PERCENTAGE_THRESHOLD':
      return (
        <div className="space-y-4">
          <h3 className="font-semibold">Configure Percentage Threshold Rule</h3>

          {/* Field Selector */}
          <FieldSelector
            fieldId={rule.field_id}
            formSchema={formSchema}
            fieldTypes={['number_input']}
            onChange={(fieldId) => onChange({ ...rule, field_id: fieldId })}
          />

          {/* Operator Selector */}
          <OperatorSelector
            operator={rule.operator}
            operators={['>=', '>', '<=', '<', '==']}
            onChange={(operator) => onChange({ ...rule, operator } as any)}
          />

          {/* Threshold Input */}
          <div className="space-y-2">
            <Label htmlFor="threshold">Threshold (%)</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={rule.threshold}
              onChange={(e) =>
                onChange({ ...rule, threshold: parseFloat(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Percentage value between 0 and 100
            </p>
          </div>

          {renderDescriptionField()}
        </div>
      );

    case 'COUNT_THRESHOLD':
      return (
        <div className="space-y-4">
          <h3 className="font-semibold">Configure Count Threshold Rule</h3>

          {/* Field Selector */}
          <FieldSelector
            fieldId={rule.field_id}
            formSchema={formSchema}
            fieldTypes={['checkbox_group']}
            onChange={(fieldId) => onChange({ ...rule, field_id: fieldId })}
          />

          {/* Operator Selector */}
          <OperatorSelector
            operator={rule.operator}
            operators={['>=', '>', '<=', '<', '==']}
            onChange={(operator) => onChange({ ...rule, operator } as any)}
          />

          {/* Threshold Input */}
          <div className="space-y-2">
            <Label htmlFor="threshold">Threshold (Count)</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              step="1"
              value={rule.threshold}
              onChange={(e) =>
                onChange({ ...rule, threshold: parseInt(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Number of checkboxes that must be selected
            </p>
          </div>

          {renderDescriptionField()}
        </div>
      );

    case 'MATCH_VALUE':
      return (
        <div className="space-y-4">
          <h3 className="font-semibold">Configure Match Value Rule</h3>

          {/* Field Selector */}
          <FieldSelector
            fieldId={rule.field_id}
            formSchema={formSchema}
            fieldTypes={['text_input', 'text_area', 'radio_button', 'number_input']}
            onChange={(fieldId) => onChange({ ...rule, field_id: fieldId })}
          />

          {/* Operator Selector */}
          <OperatorSelector
            operator={rule.operator}
            operators={['==', '!=', 'contains', 'not_contains']}
            onChange={(operator) => onChange({ ...rule, operator } as any)}
          />

          {/* Expected Value Input */}
          <ValueInput
            value={rule.expected_value}
            onChange={(value) => onChange({ ...rule, expected_value: value })}
          />

          {renderDescriptionField()}
        </div>
      );

    case 'BBI_FUNCTIONALITY_CHECK':
      return (
        <div className="space-y-4">
          <h3 className="font-semibold">Configure BBI Functionality Check Rule</h3>

          {/* BBI ID Input */}
          <div className="space-y-2">
            <Label htmlFor="bbi-id">BBI ID</Label>
            <Input
              id="bbi-id"
              type="number"
              min="1"
              step="1"
              value={rule.bbi_id}
              onChange={(e) => onChange({ ...rule, bbi_id: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              ID of the Basic Business Infrastructure to check (Epic 4)
            </p>
          </div>

          {/* Expected Status Selector */}
          <div className="space-y-2">
            <Label htmlFor="expected-status">Expected Status</Label>
            <select
              id="expected-status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={rule.expected_status}
              onChange={(e) =>
                onChange({
                  ...rule,
                  expected_status: e.target.value as 'Functional' | 'Non-Functional',
                })
              }
            >
              <option value="Functional">Functional</option>
              <option value="Non-Functional">Non-Functional</option>
            </select>
            <p className="text-xs text-muted-foreground">
              BBI must have this status for the rule to pass
            </p>
          </div>

          {renderDescriptionField()}
        </div>
      );

    default:
      return (
        <div className="text-sm text-muted-foreground">
          Unknown rule type: {ruleType}
        </div>
      );
  }
}
