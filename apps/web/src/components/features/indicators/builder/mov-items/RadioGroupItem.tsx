'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2 } from 'lucide-react';
import { MOVRadioGroupItem, OptionItem } from '@/types/mov-checklist';

/**
 * Radio Group Item Configuration Component
 *
 * Configuration form for radio group MOV items (single selection from options).
 *
 * Example: "Type of business permit: [New, Renewal, Amendment]"
 *
 * Config Fields:
 * - Label (required)
 * - Help Text (optional)
 * - Required toggle
 * - Options (list of {label, value} with add/remove)
 * - Default Value (optional)
 */

interface RadioGroupItemConfigProps {
  item: MOVRadioGroupItem;
  onChange: (updates: Partial<MOVRadioGroupItem>) => void;
}

export function RadioGroupItemConfig({ item, onChange }: RadioGroupItemConfigProps) {
  const handleAddOption = () => {
    const newOption: OptionItem = {
      label: `Option ${item.options.length + 1}`,
      value: `option${item.options.length + 1}`,
    };

    onChange({
      options: [...item.options, newOption],
    });
  };

  const handleUpdateOption = (index: number, field: 'label' | 'value', value: string) => {
    const newOptions = [...item.options];
    newOptions[index] = {
      ...newOptions[index],
      [field]: value,
    };

    onChange({ options: newOptions });
  };

  const handleRemoveOption = (index: number) => {
    if (item.options.length <= 2) {
      alert('Radio groups must have at least 2 options');
      return;
    }

    const newOptions = item.options.filter((_, i) => i !== index);
    onChange({ options: newOptions });
  };

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="radio-label" className="text-xs font-medium">
          Label <span className="text-destructive">*</span>
        </Label>
        <Input
          id="radio-label"
          value={item.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="e.g., Type of business permit"
          className="text-sm"
        />
      </div>

      {/* Help Text */}
      <div className="space-y-2">
        <Label htmlFor="radio-help" className="text-xs font-medium">
          Help Text (Optional)
        </Label>
        <Textarea
          id="radio-help"
          value={item.help_text || ''}
          onChange={(e) => onChange({ help_text: e.target.value })}
          placeholder="Additional guidance for validators"
          className="text-sm min-h-[60px]"
        />
      </div>

      {/* Required Toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="radio-required" className="text-xs font-medium">
            Required Field
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Validators must select an option
          </p>
        </div>
        <Switch
          id="radio-required"
          checked={item.required}
          onCheckedChange={(checked) => onChange({ required: checked })}
        />
      </div>

      {/* Options */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">
            Options <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Option
          </Button>
        </div>
        <div className="space-y-2">
          {item.options.map((option, index) => (
            <Card key={index} className="bg-muted/20">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-16">Label:</span>
                    <Input
                      value={option.label}
                      onChange={(e) => handleUpdateOption(index, 'label', e.target.value)}
                      placeholder="e.g., New"
                      className="text-xs h-8 flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-16">Value:</span>
                    <Input
                      value={option.value}
                      onChange={(e) => handleUpdateOption(index, 'value', e.target.value)}
                      placeholder="e.g., new"
                      className="text-xs h-8 flex-1 font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                      disabled={item.options.length <= 2}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          At least 2 options required. Values must be unique.
        </p>
      </div>

      {/* Default Value */}
      <div className="space-y-2">
        <Label htmlFor="radio-default" className="text-xs font-medium">
          Default Value (Optional)
        </Label>
        <Input
          id="radio-default"
          value={item.default_value || ''}
          onChange={(e) => onChange({ default_value: e.target.value || undefined })}
          placeholder="Enter option value..."
          className="text-sm font-mono"
          list="radio-options-list"
        />
        <datalist id="radio-options-list">
          {item.options.map((opt) => (
            <option key={opt.value} value={opt.value} />
          ))}
        </datalist>
        <p className="text-[10px] text-muted-foreground">
          Pre-selected option value
        </p>
      </div>

      {/* Preview */}
      <div className="pt-4 border-t">
        <Label className="text-xs font-medium mb-2 block">Preview</Label>
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {item.label || 'Radio Group'}
                {item.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {item.help_text && (
                <p className="text-xs text-muted-foreground">{item.help_text}</p>
              )}
              <RadioGroup defaultValue={item.default_value} disabled className="space-y-2">
                {item.options.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`preview-${option.value}`} />
                    <Label
                      htmlFor={`preview-${option.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
