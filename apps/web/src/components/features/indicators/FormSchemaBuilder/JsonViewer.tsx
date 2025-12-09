"use client";

import { useState } from "react";
import { useFormBuilderStore } from "@/store/useFormBuilderStore";
import { Button } from "@/components/ui/button";
import { Code2, Copy, Check, AlertCircle } from "lucide-react";

/**
 * JsonViewer Component
 *
 * Displays the form schema as formatted JSON with syntax highlighting.
 *
 * Features:
 * - Pretty-printed JSON output
 * - Syntax highlighting with CSS
 * - Copy to clipboard functionality
 * - Validation error display
 * - Read-only view
 */
export function JsonViewer() {
  const { fields } = useFormBuilderStore();
  const [copied, setCopied] = useState(false);

  // Create the form schema object
  const formSchema = {
    fields: fields,
  };

  // Pretty-print JSON
  const jsonString = JSON.stringify(formSchema, null, 2);

  // Validate schema
  const validationErrors: string[] = [];

  // Check for duplicate field IDs
  const fieldIds = fields.map((f) => f.field_id);
  const duplicates = fieldIds.filter((id, index) => fieldIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    validationErrors.push(`Duplicate field IDs: ${[...new Set(duplicates)].join(", ")}`);
  }

  // Check for empty fields
  if (fields.length === 0) {
    validationErrors.push("No fields defined");
  }

  // Check for fields with options
  fields.forEach((field) => {
    if ("options" in field && field.options) {
      if (field.options.length < 2) {
        validationErrors.push(`${field.field_id}: Requires at least 2 options`);
      }
    }
  });

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Code2 className="h-6 w-6 text-gray-700" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">JSON Schema</h3>
            <p className="text-sm text-gray-500">
              Copy this JSON to use in API requests or documentation
            </p>
          </div>
        </div>

        <Button onClick={handleCopy} variant="outline" size="sm" className="gap-2">
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy to Clipboard
            </>
          )}
        </Button>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900">Validation Errors</h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-700">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* JSON Display */}
      <div className="relative rounded-lg border border-gray-200 bg-gray-900">
        {/* Line numbers and code */}
        <div className="overflow-x-auto">
          <pre className="p-4">
            <code className="text-sm font-mono leading-relaxed">
              {jsonString.split("\n").map((line, index) => (
                <div key={index} className="flex">
                  {/* Line number */}
                  <span className="inline-block w-12 flex-shrink-0 select-none text-right pr-4 text-gray-500">
                    {index + 1}
                  </span>
                  {/* Code line with syntax highlighting */}
                  <span
                    className="flex-1"
                    dangerouslySetInnerHTML={{
                      __html: syntaxHighlight(line),
                    }}
                  />
                </div>
              ))}
            </code>
          </pre>
        </div>

        {/* Stats */}
        <div className="border-t border-gray-700 bg-gray-800 px-4 py-2 text-xs text-gray-400">
          <div className="flex items-center justify-between">
            <span>
              {fields.length} field{fields.length !== 1 ? "s" : ""} •{" "}
              {jsonString.split("\n").length} lines • {new Blob([jsonString]).size} bytes
            </span>
            <span>Format: JSON</span>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <strong>Tip:</strong> This JSON can be used with the POST /api/v1/indicators endpoint to
          create an indicator with this form schema.
        </p>
      </div>
    </div>
  );
}

/**
 * Syntax Highlight Helper
 *
 * Applies CSS classes for JSON syntax highlighting.
 */
function syntaxHighlight(json: string): string {
  // Escape HTML
  json = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Apply syntax highlighting
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = "text-yellow-300"; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-blue-300"; // key
        } else {
          cls = "text-green-300"; // string
        }
      } else if (/true|false/.test(match)) {
        cls = "text-purple-300"; // boolean
      } else if (/null/.test(match)) {
        cls = "text-red-300"; // null
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}
