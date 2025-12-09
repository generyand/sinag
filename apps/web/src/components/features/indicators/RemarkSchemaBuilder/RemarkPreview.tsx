"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface RemarkSchema {
  conditional_remarks: ConditionalRemark[];
  default_template: string;
}

interface ConditionalRemark {
  condition: string;
  template: string;
  description?: string;
}

interface RemarkPreviewProps {
  schema: RemarkSchema;
}

/**
 * RemarkPreview - Preview generated remarks with sample data
 *
 * Features:
 * - Select indicator status (Pass/Fail)
 * - Mock rendering of templates with sample data
 * - Shows which template would be used
 * - Displays rendered output
 */
export function RemarkPreview({ schema }: RemarkPreviewProps) {
  const [status, setStatus] = useState<"pass" | "fail">("pass");

  // Find matching conditional remark
  const matchingRemark = schema.conditional_remarks.find((r) => r.condition === status);

  // Determine which template to use
  const templateToUse = matchingRemark
    ? { source: "conditional", template: matchingRemark.template, condition: status }
    : { source: "default", template: schema.default_template, condition: "none" };

  // Mock render template (simple string replacement for preview)
  const renderTemplate = (template: string): string => {
    if (!template) return "";

    // Sample data for preview
    const sampleData: Record<string, string> = {
      indicator_name: "Sample Indicator Name",
      status: status === "pass" ? "Pass" : "Fail",
      field_name: "[field value would appear here]",
    };

    let rendered = template;
    Object.entries(sampleData).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value);
    });

    return rendered;
  };

  const renderedRemark = renderTemplate(templateToUse.template);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Remark Preview
        </CardTitle>
        <CardDescription>
          See how remarks will be generated based on indicator status
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Selector */}
        <div className="space-y-2">
          <Label htmlFor="preview-status">Indicator Status</Label>
          <Select value={status} onValueChange={(value: "pass" | "fail") => setStatus(value)}>
            <SelectTrigger id="preview-status" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select indicator status to preview the corresponding remark
          </p>
        </div>

        {/* Template Source */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Using template:</span>
          {templateToUse.source === "conditional" ? (
            <Badge variant="default">Conditional ({templateToUse.condition})</Badge>
          ) : (
            <Badge variant="secondary">Default (fallback)</Badge>
          )}
        </div>

        {/* Preview Output */}
        {renderedRemark ? (
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">Generated Remark:</p>
            <p className="text-sm text-blue-800">{renderedRemark}</p>
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              No template available for preview. Please add a default template or conditional
              remark.
            </AlertDescription>
          </Alert>
        )}

        {/* Preview Note */}
        <p className="text-xs text-muted-foreground">
          Note: This is a mock preview with sample data. Actual remarks will use real assessment
          data and field values.
        </p>
      </CardContent>
    </Card>
  );
}
