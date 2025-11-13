'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, XCircle } from 'lucide-react';
import { MOVCurrencyInputItem } from '@/types/mov-checklist';

/**
 * Currency Input Item Configuration Component
 *
 * Configuration form for currency input MOV items (PHP monetary values with threshold validation).
 *
 * Example: "Annual budget amount (threshold: ₱500,000 for 'Passed')"
 *
 * Validation Logic:
 * - value >= threshold → "Passed"
 * - min_value <= value < threshold → "Considered"
 * - value < min_value → "Failed"
 *
 * Config Fields:
 * - Label (required)
 * - Help Text (optional)
 * - Required toggle
 * - Min Value (optional)
 * - Max Value (optional)
 * - Threshold (optional - for "Considered" status)
 * - Currency Code (PHP only)
 */

interface CurrencyInputItemConfigProps {
  item: MOVCurrencyInputItem;
  onChange: (updates: Partial<MOVCurrencyInputItem>) => void;
}

export function CurrencyInputItemConfig({ item, onChange }: CurrencyInputItemConfigProps) {
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="currency-label" className="text-xs font-medium">
          Label <span className="text-destructive">*</span>
        </Label>
        <Input
          id="currency-label"
          value={item.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="e.g., Annual budget amount"
          className="text-sm"
        />
      </div>

      {/* Help Text */}
      <div className="space-y-2">
        <Label htmlFor="currency-help" className="text-xs font-medium">
          Help Text (Optional)
        </Label>
        <Textarea
          id="currency-help"
          value={item.help_text || ''}
          onChange={(e) => onChange({ help_text: e.target.value })}
          placeholder="Additional guidance for validators"
          className="text-sm min-h-[60px]"
        />
      </div>

      {/* Required Toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="currency-required" className="text-xs font-medium">
            Required Field
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Validators must provide a value
          </p>
        </div>
        <Switch
          id="currency-required"
          checked={item.required}
          onCheckedChange={(checked) => onChange({ required: checked })}
        />
      </div>

      {/* Min Value */}
      <div className="space-y-2">
        <Label htmlFor="currency-min" className="text-xs font-medium">
          Minimum Value (Optional)
        </Label>
        <Input
          id="currency-min"
          type="number"
          step="0.01"
          value={item.min_value ?? ''}
          onChange={(e) => onChange({ min_value: e.target.value ? parseFloat(e.target.value) : undefined })}
          placeholder="0.00"
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Values below this are marked as "Failed"
        </p>
      </div>

      {/* Threshold */}
      <div className="space-y-2">
        <Label htmlFor="currency-threshold" className="text-xs font-medium">
          Threshold (Optional)
        </Label>
        <Input
          id="currency-threshold"
          type="number"
          step="0.01"
          value={item.threshold ?? ''}
          onChange={(e) => onChange({ threshold: e.target.value ? parseFloat(e.target.value) : undefined })}
          placeholder="0.00"
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Values at or above threshold are "Passed". Values between min and threshold are "Considered"
        </p>
      </div>

      {/* Max Value */}
      <div className="space-y-2">
        <Label htmlFor="currency-max" className="text-xs font-medium">
          Maximum Value (Optional)
        </Label>
        <Input
          id="currency-max"
          type="number"
          step="0.01"
          value={item.max_value ?? ''}
          onChange={(e) => onChange({ max_value: e.target.value ? parseFloat(e.target.value) : undefined })}
          placeholder="0.00"
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Values above this are rejected
        </p>
      </div>

      {/* Validation Logic Explanation */}
      {(item.min_value !== undefined || item.threshold !== undefined) && (
        <div className="pt-4 border-t">
          <Label className="text-xs font-medium mb-2 block">Validation Logic</Label>
          <Card className="bg-muted/20">
            <CardContent className="p-3 space-y-2">
              {item.threshold !== undefined && (
                <div className="flex items-start gap-2 text-xs">
                  <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <span className="font-medium text-green-700">Passed:</span>
                    <span className="text-muted-foreground ml-1">
                      ≥ {formatCurrency(item.threshold)}
                    </span>
                  </div>
                </div>
              )}
              {item.min_value !== undefined && item.threshold !== undefined && (
                <div className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <span className="font-medium text-yellow-700">Considered:</span>
                    <span className="text-muted-foreground ml-1">
                      {formatCurrency(item.min_value)} to &lt; {formatCurrency(item.threshold)}
                    </span>
                  </div>
                </div>
              )}
              {item.min_value !== undefined && (
                <div className="flex items-start gap-2 text-xs">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-medium text-red-700">Failed:</span>
                    <span className="text-muted-foreground ml-1">
                      &lt; {formatCurrency(item.min_value)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview */}
      <div className="pt-4 border-t">
        <Label className="text-xs font-medium mb-2 block">Preview</Label>
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {item.label || 'Currency Input'}
                {item.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {item.help_text && (
                <p className="text-xs text-muted-foreground">{item.help_text}</p>
              )}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-300">
                  ₱ PHP
                </Badge>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="text-sm flex-1"
                  disabled
                />
              </div>
              {(item.min_value !== undefined || item.max_value !== undefined) && (
                <p className="text-[10px] text-muted-foreground">
                  {item.min_value !== undefined && `Min: ${formatCurrency(item.min_value)}`}
                  {item.min_value !== undefined && item.max_value !== undefined && ' • '}
                  {item.max_value !== undefined && `Max: ${formatCurrency(item.max_value)}`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
