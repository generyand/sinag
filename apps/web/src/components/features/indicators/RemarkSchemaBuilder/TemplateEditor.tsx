"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface TemplateEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * TemplateEditor - Textarea with placeholder insertion support
 *
 * Features:
 * - Textarea for template editing
 * - Quick-insert buttons for common placeholders
 * - Placeholder reference guide
 * - Character counter
 */
export function TemplateEditor({ label, value, onChange, placeholder }: TemplateEditorProps) {
  // Available placeholders
  const placeholders = [
    { key: "indicator_name", description: "Name of the indicator" },
    { key: "status", description: "Pass or Fail status" },
    { key: "field_name", description: "Value from a form field (replace field_name)" },
  ];

  // Insert placeholder at cursor position
  const handleInsertPlaceholder = (key: string) => {
    const placeholder = `{{ ${key} }}`;
    onChange(value + placeholder);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="template">{label}</Label>
        <span className="text-xs text-muted-foreground">{value.length} / 2000 characters</span>
      </div>

      <Textarea
        id="template"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        maxLength={2000}
        className="font-mono text-sm"
      />

      {/* Quick Insert Placeholders */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Quick Insert Placeholders:</p>
        <div className="flex flex-wrap gap-2">
          {placeholders.map((p) => (
            <Button
              key={p.key}
              variant="outline"
              size="sm"
              onClick={() => handleInsertPlaceholder(p.key)}
              className="text-xs"
            >
              <FileText className="mr-1 h-3 w-3" />
              {`{{ ${p.key} }}`}
            </Button>
          ))}
        </div>
      </div>

      {/* Placeholder Reference */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs font-semibold mb-2">Available Placeholders:</p>
        <div className="space-y-1">
          {placeholders.map((p) => (
            <div key={p.key} className="flex items-start gap-2 text-xs">
              <Badge variant="secondary" className="font-mono">
                {`{{ ${p.key} }}`}
              </Badge>
              <span className="text-muted-foreground">{p.description}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          To use field values, replace field_name with the actual field ID from the form schema.
        </p>
      </div>
    </div>
  );
}
