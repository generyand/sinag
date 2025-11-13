'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';
import { MOVDateInputItem } from '@/types/mov-checklist';

/**
 * Date Input Item Configuration Component
 *
 * Configuration form for date input MOV items (date fields with grace period handling).
 *
 * Example: "Appropriation Ordinance approval date (grace period: 90 days)"
 *
 * Validation Logic:
 * - date on or before deadline → "Passed"
 * - date within grace period → "Considered"
 * - date after grace period → "Failed"
 *
 * Config Fields:
 * - Label (required)
 * - Help Text (optional)
 * - Required toggle
 * - Min Date (optional)
 * - Max Date (optional - deadline)
 * - Grace Period Days (optional)
 * - Enable Considered Status toggle
 */

interface DateInputItemConfigProps {
  item: MOVDateInputItem;
  onChange: (updates: Partial<MOVDateInputItem>) => void;
}

export function DateInputItemConfig({ item, onChange }: DateInputItemConfigProps) {
  const handleConsideredStatusChange = (enabled: boolean) => {
    const updates: Partial<MOVDateInputItem> = {
      considered_status_enabled: enabled,
    };

    // Set default grace period when enabling
    if (enabled && !item.grace_period_days) {
      updates.grace_period_days = 30;
    }

    // Clear grace period when disabling
    if (!enabled) {
      updates.grace_period_days = undefined;
    }

    onChange(updates);
  };

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="date-label" className="text-xs font-medium">
          Label <span className="text-destructive">*</span>
        </Label>
        <Input
          id="date-label"
          value={item.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="e.g., Appropriation Ordinance approval date"
          className="text-sm"
        />
      </div>

      {/* Help Text */}
      <div className="space-y-2">
        <Label htmlFor="date-help" className="text-xs font-medium">
          Help Text (Optional)
        </Label>
        <Textarea
          id="date-help"
          value={item.help_text || ''}
          onChange={(e) => onChange({ help_text: e.target.value })}
          placeholder="Additional guidance for validators"
          className="text-sm min-h-[60px]"
        />
      </div>

      {/* Required Toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="date-required" className="text-xs font-medium">
            Required Field
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Validators must provide a date
          </p>
        </div>
        <Switch
          id="date-required"
          checked={item.required}
          onCheckedChange={(checked) => onChange({ required: checked })}
        />
      </div>

      {/* Min Date */}
      <div className="space-y-2">
        <Label htmlFor="date-min" className="text-xs font-medium">
          Minimum Date (Optional)
        </Label>
        <Input
          id="date-min"
          type="date"
          value={item.min_date || ''}
          onChange={(e) => onChange({ min_date: e.target.value || undefined })}
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Earliest acceptable date
        </p>
      </div>

      {/* Max Date (Deadline) */}
      <div className="space-y-2">
        <Label htmlFor="date-max" className="text-xs font-medium">
          Maximum Date / Deadline (Optional)
        </Label>
        <Input
          id="date-max"
          type="date"
          value={item.max_date || ''}
          onChange={(e) => onChange({ max_date: e.target.value || undefined })}
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Latest acceptable date (deadline)
        </p>
      </div>

      {/* Enable Considered Status Toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="date-considered" className="text-xs font-medium">
            Enable "Considered" Status
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Allow grace period after deadline
          </p>
        </div>
        <Switch
          id="date-considered"
          checked={item.considered_status_enabled}
          onCheckedChange={handleConsideredStatusChange}
        />
      </div>

      {/* Grace Period Days (shown when considered status enabled) */}
      {item.considered_status_enabled && (
        <div className="space-y-2">
          <Label htmlFor="date-grace" className="text-xs font-medium">
            Grace Period (Days) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="date-grace"
            type="number"
            min={0}
            max={365}
            value={item.grace_period_days ?? ''}
            onChange={(e) => onChange({ grace_period_days: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            placeholder="e.g., 90"
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Number of days after deadline where status is "Considered" instead of "Failed"
          </p>
        </div>
      )}

      {/* Validation Logic Explanation */}
      {item.max_date && item.considered_status_enabled && item.grace_period_days !== undefined && (
        <div className="pt-4 border-t">
          <Label className="text-xs font-medium mb-2 block">Validation Logic</Label>
          <Card className="bg-muted/20">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <span className="font-medium text-green-700">Passed:</span>
                  <span className="text-muted-foreground ml-1">
                    On or before {item.max_date}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <span className="font-medium text-yellow-700">Considered:</span>
                  <span className="text-muted-foreground ml-1">
                    Within {item.grace_period_days} days after {item.max_date}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <span className="font-medium text-red-700">Failed:</span>
                  <span className="text-muted-foreground ml-1">
                    More than {item.grace_period_days} days after {item.max_date}
                  </span>
                </div>
              </div>
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
                {item.label || 'Date Input'}
                {item.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {item.help_text && (
                <p className="text-xs text-muted-foreground">{item.help_text}</p>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="text-sm flex-1"
                  disabled
                />
              </div>
              {(item.min_date || item.max_date) && (
                <p className="text-[10px] text-muted-foreground">
                  {item.min_date && `From: ${item.min_date}`}
                  {item.min_date && item.max_date && ' • '}
                  {item.max_date && `Until: ${item.max_date}`}
                </p>
              )}
              {item.considered_status_enabled && item.grace_period_days && (
                <Badge variant="outline" className="text-[10px] py-0 bg-yellow-500/10 text-yellow-700 border-yellow-300">
                  {item.grace_period_days} day grace period
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
