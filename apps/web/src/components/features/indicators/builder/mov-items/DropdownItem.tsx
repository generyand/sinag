'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MOVDropdownItem, OptionItem } from '@/types/mov-checklist';

/**
 * Dropdown Item Configuration Component
 *
 * Configuration form for dropdown MOV items (dropdown selection with optional multi-select and search).
 *
 * Example: "Select required documents: [Dropdown with 20+ options, searchable]"
 *
 * Config Fields:
 * - Label (required)
 * - Help Text (optional)
 * - Required toggle
 * - Options (list of {label, value} with add/remove)
 * - Allow Multiple toggle
 * - Searchable toggle
 */

interface DropdownItemConfigProps {
  item: MOVDropdownItem;
  onChange: (updates: Partial<MOVDropdownItem>) => void;
}

export function DropdownItemConfig({ item, onChange }: DropdownItemConfigProps) {
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
    if (item.options.length <= 1) {
      alert('Dropdowns must have at least 1 option');
      return;
    }

    const newOptions = item.options.filter((_, i) => i !== index);
    onChange({ options: newOptions });
  };

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="dropdown-label" className="text-xs font-medium">
          Label <span className="text-destructive">*</span>
        </Label>
        <Input
          id="dropdown-label"
          value={item.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="e.g., Select required documents"
          className="text-sm"
        />
      </div>

      {/* Help Text */}
      <div className="space-y-2">
        <Label htmlFor="dropdown-help" className="text-xs font-medium">
          Help Text (Optional)
        </Label>
        <Textarea
          id="dropdown-help"
          value={item.help_text || ''}
          onChange={(e) => onChange({ help_text: e.target.value })}
          placeholder="Additional guidance for validators"
          className="text-sm min-h-[60px]"
        />
      </div>

      {/* Required Toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="dropdown-required" className="text-xs font-medium">
            Required Field
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Validators must select option(s)
          </p>
        </div>
        <Switch
          id="dropdown-required"
          checked={item.required}
          onCheckedChange={(checked) => onChange({ required: checked })}
        />
      </div>

      {/* Allow Multiple Toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="dropdown-multiple" className="text-xs font-medium">
            Allow Multiple Selection
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Enable multi-select dropdown
          </p>
        </div>
        <Switch
          id="dropdown-multiple"
          checked={item.allow_multiple}
          onCheckedChange={(checked) => onChange({ allow_multiple: checked })}
        />
      </div>

      {/* Searchable Toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="dropdown-searchable" className="text-xs font-medium">
            Searchable
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Enable search for large option lists
          </p>
        </div>
        <Switch
          id="dropdown-searchable"
          checked={item.searchable}
          onCheckedChange={(checked) => onChange({ searchable: checked })}
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
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {item.options.map((option, index) => (
            <Card key={index} className="bg-muted/20">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-16">Label:</span>
                    <Input
                      value={option.label}
                      onChange={(e) => handleUpdateOption(index, 'label', e.target.value)}
                      placeholder="e.g., Barangay Budget"
                      className="text-xs h-8 flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-16">Value:</span>
                    <Input
                      value={option.value}
                      onChange={(e) => handleUpdateOption(index, 'value', e.target.value)}
                      placeholder="e.g., barangay_budget"
                      className="text-xs h-8 flex-1 font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                      disabled={item.options.length <= 1}
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
          At least 1 option required. Values must be unique.
        </p>
      </div>

      {/* Preview */}
      <div className="pt-4 border-t">
        <Label className="text-xs font-medium mb-2 block">Preview</Label>
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium flex-1">
                  {item.label || 'Dropdown'}
                  {item.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {item.allow_multiple && (
                  <Badge variant="outline" className="text-[10px] py-0">
                    Multi-select
                  </Badge>
                )}
                {item.searchable && (
                  <Badge variant="outline" className="text-[10px] py-0">
                    Searchable
                  </Badge>
                )}
              </div>
              {item.help_text && (
                <p className="text-xs text-muted-foreground">{item.help_text}</p>
              )}
              <Select disabled>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {item.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {item.options.length} option{item.options.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
