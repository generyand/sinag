'use client';

import { useCalculationRuleStore } from '@/store/useCalculationRuleStore';
import type { ConditionGroup, FormSchema } from '@sinag/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import { RuleSelector } from './RuleSelector';

interface ConditionGroupItemProps {
  group: ConditionGroup;
  groupIndex: number;
  formSchema?: FormSchema | null;
}

/**
 * ConditionGroupItem - Renders a single condition group with its rules
 *
 * Features:
 * - AND/OR operator selection
 * - Add/remove rules
 * - Visual representation of rule logic
 * - Delete entire group
 * - Supports nesting (rules can be AND_ALL or OR_ANY which contain nested rules)
 */
export function ConditionGroupItem({
  group,
  groupIndex,
  formSchema,
}: ConditionGroupItemProps) {
  const {
    updateConditionGroup,
    deleteConditionGroup,
    addRuleToGroup,
    deleteRuleFromGroup,
  } = useCalculationRuleStore();

  // Handle operator change
  const handleOperatorChange = (operator: 'AND' | 'OR') => {
    updateConditionGroup(groupIndex, { operator });
  };

  // Handle delete group
  const handleDeleteGroup = () => {
    if (confirm('Are you sure you want to delete this condition group?')) {
      deleteConditionGroup(groupIndex);
    }
  };

  // Handle delete rule
  const handleDeleteRule = (ruleIndex: number) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      deleteRuleFromGroup(groupIndex, ruleIndex);
    }
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">
          Condition Group {groupIndex + 1}
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* Operator Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Combine rules with:</span>
            <Select
              value={group.operator}
              onValueChange={(value: 'AND' | 'OR') => handleOperatorChange(value)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">
                  <Badge variant="secondary">AND</Badge>
                </SelectItem>
                <SelectItem value="OR">
                  <Badge variant="secondary">OR</Badge>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delete Group Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteGroup}
            className="text-red-600 hover:bg-red-100 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Rules List */}
        {group.rules.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white text-sm text-muted-foreground">
            No rules defined. Click "Add Rule" to create your first rule.
          </div>
        ) : (
          <div className="space-y-3">
            {group.rules.map((rule, ruleIndex) => (
              <div key={ruleIndex}>
                {/* Operator Badge between rules */}
                {ruleIndex > 0 && (
                  <div className="flex items-center justify-center py-2">
                    <Separator className="flex-1" />
                    <Badge
                      variant={group.operator === 'AND' ? 'secondary' : 'default'}
                      className="mx-3"
                    >
                      {group.operator}
                    </Badge>
                    <Separator className="flex-1" />
                  </div>
                )}

                {/* Rule Card */}
                <Card className="border border-gray-200 bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Rule Display */}
                      <div className="flex-1">
                        <RuleDisplay rule={rule} formSchema={formSchema} />
                      </div>

                      {/* Delete Rule Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRule(ruleIndex)}
                        className="text-red-600 hover:bg-red-100 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Add Rule Section */}
        <div className="mt-4">
          <RuleSelector
            onAddRule={(rule) => addRuleToGroup(groupIndex, rule)}
            formSchema={formSchema}
          />
        </div>

        {/* Help Text */}
        {group.rules.length > 1 && (
          <p className="mt-3 text-sm text-muted-foreground text-center">
            {group.operator === 'AND'
              ? 'All rules in this group must be true'
              : 'At least one rule in this group must be true'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * RuleDisplay - Displays a human-readable representation of a rule
 */
function RuleDisplay({
  rule,
  formSchema,
}: {
  rule: any;
  formSchema?: FormSchema | null;
}) {
  const ruleType = rule.rule_type;

  // Helper to get field label from form_schema
  const getFieldLabel = (fieldId: string): string => {
    if (!formSchema) return fieldId;
    const field = (formSchema as any).input_fields?.find((f: any) => f.field_id === fieldId);
    return field?.label || fieldId;
  };

  switch (ruleType) {
    case 'PERCENTAGE_THRESHOLD':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Percentage Threshold</Badge>
          </div>
          <p className="text-sm">
            <span className="font-medium">{getFieldLabel(rule.field_id)}</span>{' '}
            <span className="text-muted-foreground">{rule.operator}</span>{' '}
            <span className="font-medium">{rule.threshold}%</span>
          </p>
          {rule.description && (
            <p className="text-xs text-muted-foreground">{rule.description}</p>
          )}
        </div>
      );

    case 'COUNT_THRESHOLD':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Count Threshold</Badge>
          </div>
          <p className="text-sm">
            Count of <span className="font-medium">{getFieldLabel(rule.field_id)}</span>{' '}
            <span className="text-muted-foreground">{rule.operator}</span>{' '}
            <span className="font-medium">{rule.threshold}</span>
          </p>
          {rule.description && (
            <p className="text-xs text-muted-foreground">{rule.description}</p>
          )}
        </div>
      );

    case 'MATCH_VALUE':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Match Value</Badge>
          </div>
          <p className="text-sm">
            <span className="font-medium">{getFieldLabel(rule.field_id)}</span>{' '}
            <span className="text-muted-foreground">{rule.operator}</span>{' '}
            <span className="font-medium">"{rule.expected_value}"</span>
          </p>
          {rule.description && (
            <p className="text-xs text-muted-foreground">{rule.description}</p>
          )}
        </div>
      );

    case 'BBI_FUNCTIONALITY_CHECK':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">BBI Functionality Check</Badge>
          </div>
          <p className="text-sm">
            BBI #{rule.bbi_id} status is{' '}
            <span className="font-medium">{rule.expected_status}</span>
          </p>
          {rule.description && (
            <p className="text-xs text-muted-foreground">{rule.description}</p>
          )}
        </div>
      );

    case 'AND_ALL':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">All Conditions Must Pass (AND)</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Contains {rule.conditions?.length || 0} nested conditions
          </p>
          {rule.description && (
            <p className="text-xs text-muted-foreground">{rule.description}</p>
          )}
        </div>
      );

    case 'OR_ANY':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Any Condition Must Pass (OR)</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Contains {rule.conditions?.length || 0} nested conditions
          </p>
          {rule.description && (
            <p className="text-xs text-muted-foreground">{rule.description}</p>
          )}
        </div>
      );

    default:
      return (
        <div className="space-y-1">
          <Badge variant="outline">Unknown Rule Type</Badge>
          <p className="text-sm text-muted-foreground">Type: {ruleType}</p>
        </div>
      );
  }
}
