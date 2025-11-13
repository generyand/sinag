'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MOVAssessmentItem } from '@/types/mov-checklist';

/**
 * Assessment Item Configuration Component
 *
 * Configuration form for assessment MOV items (YES/NO radio for validator judgment).
 *
 * Semantically different from RadioGroupItem - used for validator's assessment
 * of compliance rather than data collection.
 *
 * Example: "BDRRMC is organized and functional (Assessor judgment)"
 *
 * Config Fields:
 * - Label (required)
 * - Help Text (optional)
 * - Required toggle
 * - Assessment Type (YES_NO | COMPLIANT_NON_COMPLIANT)
 */

interface AssessmentItemConfigProps {
  item: MOVAssessmentItem;
  onChange: (updates: Partial<MOVAssessmentItem>) => void;
}

export function AssessmentItemConfig({ item, onChange }: AssessmentItemConfigProps) {
  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="space-y-2">
        <Label htmlFor="assessment-label" className="text-xs font-medium">
          Label <span className="text-destructive">*</span>
        </Label>
        <Input
          id="assessment-label"
          value={item.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="e.g., BDRRMC is organized and functional"
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          The statement or question being assessed
        </p>
      </div>

      {/* Help Text */}
      <div className="space-y-2">
        <Label htmlFor="assessment-help" className="text-xs font-medium">
          Help Text (Optional)
        </Label>
        <Textarea
          id="assessment-help"
          value={item.help_text || ''}
          onChange={(e) => onChange({ help_text: e.target.value })}
          placeholder="Criteria or guidance for making this assessment"
          className="text-sm min-h-[60px]"
        />
        <p className="text-[10px] text-muted-foreground">
          Provide criteria or guidance for validators to make this judgment
        </p>
      </div>

      {/* Required Toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md border bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="assessment-required" className="text-xs font-medium">
            Required Field
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Validators must make an assessment
          </p>
        </div>
        <Switch
          id="assessment-required"
          checked={item.required}
          onCheckedChange={(checked) => onChange({ required: checked })}
        />
      </div>

      {/* Assessment Type */}
      <div className="space-y-2">
        <Label htmlFor="assessment-type" className="text-xs font-medium">
          Assessment Type
        </Label>
        <Select
          value={item.assessment_type}
          onValueChange={(value) => onChange({ assessment_type: value as 'YES_NO' | 'COMPLIANT_NON_COMPLIANT' })}
        >
          <SelectTrigger id="assessment-type" className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="YES_NO">
              <div className="flex flex-col items-start">
                <span className="font-medium">YES / NO</span>
                <span className="text-xs text-muted-foreground">Simple yes or no judgment</span>
              </div>
            </SelectItem>
            <SelectItem value="COMPLIANT_NON_COMPLIANT">
              <div className="flex flex-col items-start">
                <span className="font-medium">COMPLIANT / NON-COMPLIANT</span>
                <span className="text-xs text-muted-foreground">Compliance assessment</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          Determines the options shown to validators
        </p>
      </div>

      {/* Preview */}
      <div className="pt-4 border-t">
        <Label className="text-xs font-medium mb-2 block">Preview</Label>
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {item.label || 'Assessment Statement'}
                {item.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {item.help_text && (
                <p className="text-xs text-muted-foreground">{item.help_text}</p>
              )}
              <RadioGroup disabled className="space-y-2">
                {item.assessment_type === 'YES_NO' ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="preview-yes" />
                      <Label htmlFor="preview-yes" className="text-sm font-normal cursor-pointer">
                        YES
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="preview-no" />
                      <Label htmlFor="preview-no" className="text-sm font-normal cursor-pointer">
                        NO
                      </Label>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="compliant" id="preview-compliant" />
                      <Label htmlFor="preview-compliant" className="text-sm font-normal cursor-pointer">
                        COMPLIANT
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="non-compliant" id="preview-non-compliant" />
                      <Label htmlFor="preview-non-compliant" className="text-sm font-normal cursor-pointer">
                        NON-COMPLIANT
                      </Label>
                    </div>
                  </>
                )}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
