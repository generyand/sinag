"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Plus, Info } from "lucide-react";
import { ConditionalRemarkList } from "./ConditionalRemarkList";
import { DefaultTemplateEditor } from "./DefaultTemplateEditor";
import { RemarkPreview } from "./RemarkPreview";

interface RemarkSchema {
  conditional_remarks: ConditionalRemark[];
  default_template: string;
}

interface ConditionalRemark {
  condition: string;
  template: string;
  description?: string;
}

interface RemarkSchemaBuilderProps {
  /** Existing remark schema to load (for editing) */
  initialSchema?: RemarkSchema | null;
  /** Callback when schema changes */
  onChange?: (schema: RemarkSchema | null) => void;
}

/**
 * RemarkSchemaBuilder - Visual builder for creating remark schemas
 *
 * This component provides an interface for MLGOO users to build remark templates
 * that are automatically generated based on assessment results.
 *
 * Features:
 * - Conditional remarks based on Pass/Fail status
 * - Default fallback template
 * - Jinja2 placeholder support
 * - Live preview of generated remarks
 *
 * Architecture:
 * - Uses local state for remark schema (simpler than Zustand for this feature)
 * - Integrates with Jinja2 template rendering on backend
 */
export function RemarkSchemaBuilder({ initialSchema, onChange }: RemarkSchemaBuilderProps) {
  const [schema, setSchema] = useState<RemarkSchema>(
    initialSchema || {
      conditional_remarks: [],
      default_template: "",
    }
  );
  const [isDirty, setIsDirty] = useState(false);

  // Initialize schema on mount
  useEffect(() => {
    if (initialSchema) {
      setSchema(initialSchema);
    }
  }, [initialSchema, setSchema]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      onChange(schema);
    }
  }, [schema, onChange]);

  // Handle adding a new conditional remark
  const handleAddConditionalRemark = () => {
    setSchema((prev) => ({
      ...prev,
      conditional_remarks: [
        ...prev.conditional_remarks,
        {
          condition: "pass",
          template: "",
          description: "",
        },
      ],
    }));
    setIsDirty(true);
  };

  // Handle updating a conditional remark
  const handleUpdateConditionalRemark = (index: number, remark: ConditionalRemark) => {
    setSchema((prev) => ({
      ...prev,
      conditional_remarks: prev.conditional_remarks.map((r, i) => (i === index ? remark : r)),
    }));
    setIsDirty(true);
  };

  // Handle deleting a conditional remark
  const handleDeleteConditionalRemark = (index: number) => {
    setSchema((prev) => ({
      ...prev,
      conditional_remarks: prev.conditional_remarks.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  };

  // Handle updating default template
  const handleUpdateDefaultTemplate = (template: string) => {
    setSchema((prev) => ({
      ...prev,
      default_template: template,
    }));
    setIsDirty(true);
  };

  // Check if schema is valid
  const isSchemaValid = () => {
    return schema.default_template.trim().length > 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Remark Schema Builder</CardTitle>
          <CardDescription>
            Define remark templates that are automatically generated based on assessment results.
            Use Jinja2 placeholders like {`{{ indicator_name }}`} for dynamic content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Conditional remarks are evaluated based on indicator status (Pass/Fail). If no
              condition matches, the default template is used. Supports placeholders:{" "}
              {`{{ indicator_name }}`}, {`{{ status }}`}, and field values.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Conditional Remarks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Conditional Remarks</CardTitle>
            <CardDescription>
              {schema.conditional_remarks.length === 0
                ? "Add conditional remarks for specific Pass/Fail outcomes"
                : `${schema.conditional_remarks.length} conditional remark${
                    schema.conditional_remarks.length === 1 ? "" : "s"
                  } defined`}
            </CardDescription>
          </div>
          <Button onClick={handleAddConditionalRemark} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Conditional Remark
          </Button>
        </CardHeader>
        <CardContent>
          {schema.conditional_remarks.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-muted-foreground">
              No conditional remarks defined. Click "Add Conditional Remark" to create one.
            </div>
          ) : (
            <ConditionalRemarkList
              remarks={schema.conditional_remarks}
              onUpdate={handleUpdateConditionalRemark}
              onDelete={handleDeleteConditionalRemark}
            />
          )}
        </CardContent>
      </Card>

      {/* Default Template */}
      <DefaultTemplateEditor
        template={schema.default_template}
        onChange={handleUpdateDefaultTemplate}
      />

      {/* Validation Status */}
      {!isSchemaValid() && (
        <Alert variant="destructive">
          <AlertDescription>
            Default template is required. This template is used when no conditional remarks match.
          </AlertDescription>
        </Alert>
      )}

      {/* Dirty State Indicator */}
      {isDirty && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>You have unsaved changes.</AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      <RemarkPreview schema={schema} />
    </div>
  );
}
