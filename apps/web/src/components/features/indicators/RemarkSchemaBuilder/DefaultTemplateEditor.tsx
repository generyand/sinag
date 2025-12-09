"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateEditor } from "./TemplateEditor";

interface DefaultTemplateEditorProps {
  template: string;
  onChange: (template: string) => void;
}

/**
 * DefaultTemplateEditor - Editor for default/fallback remark template
 *
 * This template is used when no conditional remarks match the indicator status.
 * Required field - always needs a value.
 */
export function DefaultTemplateEditor({ template, onChange }: DefaultTemplateEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Default Remark Template</CardTitle>
        <CardDescription>
          This template is used when no conditional remarks match. Required fallback for all cases.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TemplateEditor
          label="Default Template (Required)"
          value={template}
          onChange={onChange}
          placeholder="Enter default remark template. Example: {{ indicator_name }} assessment is under review."
        />
      </CardContent>
    </Card>
  );
}
