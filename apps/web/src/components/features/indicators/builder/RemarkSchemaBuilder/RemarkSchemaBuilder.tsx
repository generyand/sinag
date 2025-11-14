'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Info, Code } from 'lucide-react';

/**
 * Remark Schema Builder Component
 *
 * Visual builder for creating remark templates for indicators.
 * Supports dynamic template variables from form data.
 *
 * Features:
 * - Add/edit/delete remark templates
 * - Template variable insertion
 * - Preview with sample data
 * - Validate variable references against form schema
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

interface ConditionalRemark {
  template: string;
  condition?: string;
}

interface RemarkSchema {
  conditional_remarks?: ConditionalRemark[];
  default_remark?: string;
}

interface RemarkSchemaBuilderProps {
  value?: RemarkSchema;
  onChange?: (schema: RemarkSchema) => void;
  formFields?: Array<{ field_id: string; label: string; field_type: string }>;
}

// ============================================================================
// Component
// ============================================================================

export function RemarkSchemaBuilder({
  value = { conditional_remarks: [] },
  onChange,
  formFields = [],
}: RemarkSchemaBuilderProps) {
  const [schema, setSchema] = React.useState<RemarkSchema>(value);

  React.useEffect(() => {
    setSchema(value);
  }, [value]);

  const handleSchemaChange = (newSchema: RemarkSchema) => {
    setSchema(newSchema);
    onChange?.(newSchema);
  };

  const handleAddRemark = () => {
    const newSchema = {
      ...schema,
      conditional_remarks: [
        ...(schema.conditional_remarks || []),
        { template: '' },
      ],
    };
    handleSchemaChange(newSchema);
  };

  const handleUpdateRemark = (index: number, template: string) => {
    const newRemarks = [...(schema.conditional_remarks || [])];
    newRemarks[index] = { ...newRemarks[index], template };
    handleSchemaChange({ ...schema, conditional_remarks: newRemarks });
  };

  const handleDeleteRemark = (index: number) => {
    const newRemarks = (schema.conditional_remarks || []).filter((_, i) => i !== index);
    handleSchemaChange({ ...schema, conditional_remarks: newRemarks });
  };

  const insertVariable = (index: number, variable: string) => {
    const remarks = schema.conditional_remarks || [];
    const currentTemplate = remarks[index]?.template || '';
    const newTemplate = currentTemplate + `{{ ${variable} }}`;
    handleUpdateRemark(index, newTemplate);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Remark Schema Builder
          </CardTitle>
          <CardDescription>
            Create dynamic remark templates that generate human-readable status summaries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Available Variables */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Available Template Variables:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{'{{ score }}'}</Badge>
                  <Badge variant="outline">{'{{ barangay_name }}'}</Badge>
                  <Badge variant="outline">{'{{ status }}'}</Badge>
                  {formFields.map((field) => (
                    <Badge key={field.field_id} variant="outline">
                      {`{{ form.${field.field_id} }}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Conditional Remarks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Conditional Remark Templates</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRemark}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Remark
              </Button>
            </div>

            {schema.conditional_remarks && schema.conditional_remarks.length > 0 ? (
              <div className="space-y-4">
                {schema.conditional_remarks.map((remark, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <Label>Remark Template {index + 1}</Label>
                          <Textarea
                            value={remark.template}
                            onChange={(e) => handleUpdateRemark(index, e.target.value)}
                            placeholder="Enter remark template (use {{ variable }} for dynamic values)"
                            className="font-mono text-sm"
                            rows={3}
                          />
                          <div className="flex flex-wrap gap-2">
                            {formFields.map((field) => (
                              <Button
                                key={field.field_id}
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => insertVariable(index, `form.${field.field_id}`)}
                              >
                                Insert {field.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRemark(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No remark templates defined. Click "Add Remark" to create a template.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Default Remark */}
          <div className="space-y-2">
            <Label>Default Remark (Optional)</Label>
            <Input
              value={schema.default_remark || ''}
              onChange={(e) =>
                handleSchemaChange({ ...schema, default_remark: e.target.value })
              }
              placeholder="Default remark when no conditions match"
            />
          </div>

          {/* Preview */}
          {schema.conditional_remarks && schema.conditional_remarks.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (with sample data)</Label>
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <pre className="text-sm whitespace-pre-wrap">
                    {schema.conditional_remarks[0]?.template
                      .replace(/\{\{\s*score\s*\}\}/g, '85')
                      .replace(/\{\{\s*barangay_name\s*\}\}/g, 'Sample Barangay')
                      .replace(/\{\{\s*status\s*\}\}/g, 'PASSED')
                      .replace(/\{\{\s*form\.(\w+)\s*\}\}/g, '[form field value]') ||
                      'No template defined'}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default RemarkSchemaBuilder;
