'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MOVTextInputItem } from '@/types/mov-checklist';

/**
 * Text Input Item Configuration Component
 *
 * Configuration form for text input MOV items (free text fields with optional regex validation).
 *
 * Example: "Barangay Resolution Number"
 *
 * Config Fields:
 * - Label (required)
 * - Help Text (optional)
 * - Required toggle
 * - Placeholder (optional)
 * - Max Length (optional)
 * - Validation Pattern (optional regex)
 */

interface TextInputItemConfigProps {
  item: MOVTextInputItem;
  onChange: (updates: Partial<MOVTextInputItem>) => void;
}

export function TextInputItemConfig({ item, onChange }: TextInputItemConfigProps) {
  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="text-label" className="text-xs font-medium">
          Label <span className="text-destructive">*</span>
        </Label>
        <Input
          id="text-label"
          value={item.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="e.g., Barangay Resolution Number"
          className="text-sm"
        />
      </div>

      {/* Help Text */}
      <div className="space-y-2">
        <Label htmlFor="text-help" className="text-xs font-medium">
          Help Text (Optional)
        </Label>
        <Textarea
          id="text-help"
          value={item.help_text || ''}
          onChange={(e) => onChange({ help_text: e.target.value })}
          placeholder="Additional guidance for validators"
          className="text-sm min-h-[60px]"
        />
      </div>

      {/* Required Toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="text-required" className="text-xs font-medium">
            Required Field
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Validators must provide text
          </p>
        </div>
        <Switch
          id="text-required"
          checked={item.required}
          onCheckedChange={(checked) => onChange({ required: checked })}
        />
      </div>

      {/* Placeholder */}
      <div className="space-y-2">
        <Label htmlFor="text-placeholder" className="text-xs font-medium">
          Placeholder (Optional)
        </Label>
        <Input
          id="text-placeholder"
          value={item.placeholder || ''}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          placeholder="e.g., Enter resolution number..."
          className="text-sm"
          maxLength={200}
        />
        <p className="text-[10px] text-muted-foreground">
          Hint text shown when input is empty
        </p>
      </div>

      {/* Max Length */}
      <div className="space-y-2">
        <Label htmlFor="text-maxlength" className="text-xs font-medium">
          Maximum Length (Optional)
        </Label>
        <Input
          id="text-maxlength"
          type="number"
          min={1}
          max={10000}
          value={item.max_length ?? ''}
          onChange={(e) => onChange({ max_length: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          placeholder="e.g., 100"
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Maximum number of characters allowed (1-10,000)
        </p>
      </div>

      {/* Validation Pattern (Regex) */}
      <div className="space-y-2">
        <Label htmlFor="text-pattern" className="text-xs font-medium">
          Validation Pattern (Optional)
        </Label>
        <Input
          id="text-pattern"
          value={item.validation_pattern || ''}
          onChange={(e) => onChange({ validation_pattern: e.target.value })}
          placeholder="e.g., ^BR-\\d{4}-\\d{4}$"
          className="text-sm font-mono"
        />
        <p className="text-[10px] text-muted-foreground">
          Regular expression pattern (regex) for validation. Example: ^BR-\d{'{4}'}-\d{'{4}'}$ for "BR-2023-0001"
        </p>
      </div>

      {/* Preview */}
      <div className="pt-4 border-t">
        <Label className="text-xs font-medium mb-2 block">Preview</Label>
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {item.label || 'Text Input'}
                {item.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {item.help_text && (
                <p className="text-xs text-muted-foreground">{item.help_text}</p>
              )}
              <Input
                type="text"
                placeholder={item.placeholder || 'Enter text...'}
                maxLength={item.max_length}
                className="text-sm"
                disabled
              />
              {item.max_length && (
                <p className="text-[10px] text-muted-foreground">
                  Maximum {item.max_length} characters
                </p>
              )}
              {item.validation_pattern && (
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] py-0 font-mono">
                    Pattern: {item.validation_pattern}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
