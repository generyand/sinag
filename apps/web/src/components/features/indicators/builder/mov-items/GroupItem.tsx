'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { MOVGroupItem } from '@/types/mov-checklist';

/**
 * Group Item Configuration Component
 *
 * Configuration form for group MOV items (logical grouping with OR logic support).
 *
 * Example: "Posted CY 2023 financial documents (any 5 of 7)"
 *
 * Config Fields:
 * - Label (required)
 * - Help Text (optional)
 * - Required toggle
 * - Logic Operator (AND/OR)
 * - Min Required (for OR logic)
 *
 * Note: Children items are managed via nested drag-drop (to be implemented)
 */

interface GroupItemConfigProps {
  item: MOVGroupItem;
  onChange: (updates: Partial<MOVGroupItem>) => void;
}

export function GroupItemConfig({ item, onChange }: GroupItemConfigProps) {
  const handleLogicOperatorChange = (operator: 'AND' | 'OR') => {
    const updates: Partial<MOVGroupItem> = { logic_operator: operator };

    // Set default min_required when switching to OR
    if (operator === 'OR' && !item.min_required) {
      updates.min_required = 1;
    }

    // Clear min_required when switching to AND
    if (operator === 'AND') {
      updates.min_required = undefined;
    }

    onChange(updates);
  };

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="group-label" className="text-xs font-medium">
          Group Label <span className="text-destructive">*</span>
        </Label>
        <Input
          id="group-label"
          value={item.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="e.g., Posted CY 2023 financial documents"
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Describes the group of related items
        </p>
      </div>

      {/* Help Text */}
      <div className="space-y-2">
        <Label htmlFor="group-help" className="text-xs font-medium">
          Help Text (Optional)
        </Label>
        <Textarea
          id="group-help"
          value={item.help_text || ''}
          onChange={(e) => onChange({ help_text: e.target.value })}
          placeholder="Additional guidance for validators"
          className="text-sm min-h-[60px]"
        />
      </div>

      {/* Required Toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="group-required" className="text-xs font-medium">
            Required Group
          </Label>
          <p className="text-[10px] text-muted-foreground">
            This group must be validated
          </p>
        </div>
        <Switch
          id="group-required"
          checked={item.required}
          onCheckedChange={(checked) => onChange({ required: checked })}
        />
      </div>

      {/* Logic Operator */}
      <div className="space-y-2">
        <Label htmlFor="group-operator" className="text-xs font-medium">
          Logic Operator
        </Label>
        <Select
          value={item.logic_operator}
          onValueChange={(value) => handleLogicOperatorChange(value as 'AND' | 'OR')}
        >
          <SelectTrigger id="group-operator" className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-300">
                  AND
                </Badge>
                <span className="text-xs">All children must pass</span>
              </div>
            </SelectItem>
            <SelectItem value="OR">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-300">
                  OR
                </Badge>
                <span className="text-xs">At least N children must pass</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          {item.logic_operator === 'AND'
            ? 'All child items must be validated to pass this group'
            : 'Only some child items need to be validated (specify minimum below)'}
        </p>
      </div>

      {/* Min Required (for OR logic) */}
      {item.logic_operator === 'OR' && (
        <div className="space-y-2">
          <Label htmlFor="group-min-required" className="text-xs font-medium">
            Minimum Required <span className="text-destructive">*</span>
          </Label>
          <Input
            id="group-min-required"
            type="number"
            min={1}
            max={item.children?.length || 10}
            value={item.min_required || 1}
            onChange={(e) => onChange({ min_required: parseInt(e.target.value, 10) })}
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Minimum number of child items that must pass for this group to pass
          </p>
        </div>
      )}

      {/* Children Info */}
      <div className="pt-4 border-t">
        <Label className="text-xs font-medium mb-2 block">Child Items</Label>
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium">
                  {item.children?.length || 0} child item(s)
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Drag other MOV items into this group to add children. Group nesting is supported.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <div className="pt-4 border-t">
        <Label className="text-xs font-medium mb-2 block">Preview</Label>
        <Card
          className={`border-l-4 ${
            item.logic_operator === 'OR'
              ? 'border-l-green-500 bg-green-500/5'
              : 'border-l-blue-500 bg-blue-500/5'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Badge
                variant="outline"
                className={
                  item.logic_operator === 'OR'
                    ? 'bg-green-500/10 text-green-700 border-green-300'
                    : 'bg-blue-500/10 text-blue-700 border-blue-300'
                }
              >
                {item.logic_operator}
              </Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {item.label || 'Group Label'}
                  {item.required && <span className="text-destructive ml-1">*</span>}
                </p>
                {item.help_text && (
                  <p className="text-xs text-muted-foreground mt-1">{item.help_text}</p>
                )}
                {item.logic_operator === 'OR' && item.min_required && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Requires at least {item.min_required} of {item.children?.length || 0} items to pass
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
