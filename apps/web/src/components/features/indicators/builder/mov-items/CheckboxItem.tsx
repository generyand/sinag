'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MOVCheckboxItem } from '@/types/mov-checklist';

/**
 * Checkbox Item Configuration Component
 *
 * Configuration form for checkbox MOV items (simple yes/no verification).
 *
 * Example: "BFR signed and stamped by C/M Accountant"
 *
 * Config Fields:
 * - Label (required)
 * - Help Text (optional)
 * - Required toggle
 * - Default Value (checked/unchecked)
 */

interface CheckboxItemConfigProps {
  item: MOVCheckboxItem;
  onChange: (updates: Partial<MOVCheckboxItem>) => void;
}

export function CheckboxItemConfig({ item, onChange }: CheckboxItemConfigProps) {
  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="checkbox-label" className="text-xs font-medium">
          Label <span className="text-destructive">*</span>
        </Label>
        <Input
          id="checkbox-label"
          value={item.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="e.g., BFR signed by C/M Accountant"
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          The label displayed to validators during assessment
        </p>
      </div>

      {/* Help Text */}
      <div className="space-y-2">
        <Label htmlFor="checkbox-help" className="text-xs font-medium">
          Help Text (Optional)
        </Label>
        <Textarea
          id="checkbox-help"
          value={item.help_text || ''}
          onChange={(e) => onChange({ help_text: e.target.value })}
          placeholder="Additional guidance for validators"
          className="text-sm min-h-[60px]"
        />
        <p className="text-[10px] text-muted-foreground">
          Provide context or instructions for validators
        </p>
      </div>

      {/* Required Toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="checkbox-required" className="text-xs font-medium">
            Required Field
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Validators must complete this item
          </p>
        </div>
        <Switch
          id="checkbox-required"
          checked={item.required}
          onCheckedChange={(checked) => onChange({ required: checked })}
        />
      </div>

      {/* Default Value Toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="checkbox-default" className="text-xs font-medium">
            Default Value
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Pre-checked by default
          </p>
        </div>
        <Switch
          id="checkbox-default"
          checked={item.default_value}
          onCheckedChange={(checked) => onChange({ default_value: checked })}
        />
      </div>

      {/* Preview */}
      <div className="pt-4 border-t">
        <Label className="text-xs font-medium mb-2 block">Preview</Label>
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={item.default_value}
                readOnly
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {item.label || 'Checkbox Label'}
                  {item.required && <span className="text-destructive ml-1">*</span>}
                </p>
                {item.help_text && (
                  <p className="text-xs text-muted-foreground mt-1">{item.help_text}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
