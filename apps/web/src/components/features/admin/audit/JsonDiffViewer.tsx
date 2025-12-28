"use client";

import { Badge } from "@/components/ui/badge";
import * as React from "react";

interface JsonDiffViewerProps {
  changes: Record<string, unknown>;
}

/**
 * JsonDiffViewer Component
 *
 * Displays JSON changes from audit logs in a readable format.
 * Highlights before/after values with color-coding for easy comparison.
 *
 * Features:
 * - Nested object rendering
 * - Array diff display
 * - Color-coded change indicators
 * - Collapsible nested structures
 */
export function JsonDiffViewer({ changes }: JsonDiffViewerProps) {
  /**
   * Render a single field change
   */
  const renderFieldChange = (key: string, value: unknown): React.ReactElement => {
    // Handle before/after format
    if (value && typeof value === "object" && "before" in value && "after" in value) {
      const change = value as { before: unknown; after: unknown };
      return (
        <div key={key} className="space-y-2">
          <div className="font-medium text-sm flex items-center gap-2">
            <span className="text-foreground">{key}</span>
            <Badge variant="outline" className="text-xs">
              Modified
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
            {/* Before value */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase">Before</div>
              <div
                className="p-3 rounded-md border-l-4"
                style={{
                  backgroundColor: "var(--analytics-danger-bg)",
                  borderLeftColor: "var(--analytics-danger)",
                }}
              >
                <code className="text-xs">{formatValue(change.before)}</code>
              </div>
            </div>

            {/* After value */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase">After</div>
              <div
                className="p-3 rounded-md border-l-4"
                style={{
                  backgroundColor: "var(--analytics-success-bg)",
                  borderLeftColor: "var(--analytics-success)",
                }}
              >
                <code className="text-xs">{formatValue(change.after)}</code>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Handle added fields
    if (value && typeof value === "object" && "added" in value) {
      const addedValue = (value as { added: unknown }).added;
      return (
        <div key={key} className="space-y-2">
          <div className="font-medium text-sm flex items-center gap-2">
            <span className="text-foreground">{key}</span>
            <Badge
              variant="outline"
              style={{
                backgroundColor: "var(--analytics-success-bg)",
                color: "var(--analytics-success-text)",
                borderColor: "var(--analytics-success-border)",
              }}
            >
              Added
            </Badge>
          </div>
          <div
            className="p-3 rounded-md border-l-4 ml-4"
            style={{
              backgroundColor: "var(--analytics-success-bg)",
              borderLeftColor: "var(--analytics-success)",
            }}
          >
            <code className="text-xs">{formatValue(addedValue)}</code>
          </div>
        </div>
      );
    }

    // Handle removed fields
    if (value && typeof value === "object" && "removed" in value) {
      const removedValue = (value as { removed: unknown }).removed;
      return (
        <div key={key} className="space-y-2">
          <div className="font-medium text-sm flex items-center gap-2">
            <span className="text-foreground">{key}</span>
            <Badge
              variant="outline"
              style={{
                backgroundColor: "var(--analytics-danger-bg)",
                color: "var(--analytics-danger-text)",
                borderColor: "var(--analytics-danger-border)",
              }}
            >
              Removed
            </Badge>
          </div>
          <div
            className="p-3 rounded-md border-l-4 ml-4"
            style={{
              backgroundColor: "var(--analytics-danger-bg)",
              borderLeftColor: "var(--analytics-danger)",
            }}
          >
            <code className="text-xs">{formatValue(removedValue)}</code>
          </div>
        </div>
      );
    }

    // Handle nested objects (recursive)
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return (
        <div key={key} className="space-y-2">
          <div className="font-medium text-sm text-foreground">{key}</div>
          <div className="pl-4 space-y-3 border-l-2 border-muted">
            {Object.entries(value as Record<string, unknown>).map(([nestedKey, nestedValue]) =>
              renderFieldChange(nestedKey, nestedValue)
            )}
          </div>
        </div>
      );
    }

    // Default: just show the value
    return (
      <div key={key} className="space-y-2">
        <div className="font-medium text-sm text-foreground">{key}</div>
        <div className="p-3 rounded-md bg-muted ml-4">
          <code className="text-xs">{formatValue(value)}</code>
        </div>
      </div>
    );
  };

  /**
   * Format a value for display
   */
  const formatValue = (value: unknown): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return `"${value}"`;
    if (typeof value === "boolean") return value.toString();
    if (typeof value === "number") return value.toString();
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]";
      return `[\n${value.map((v) => `  ${formatValue(v)}`).join(",\n")}\n]`;
    }
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  // Handle empty changes
  if (!changes || Object.keys(changes).length === 0) {
    return <div className="p-6 text-center text-muted-foreground">No changes recorded</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 pb-4 border-b">
        <h4 className="font-semibold text-sm">Change Details</h4>
        <Badge variant="outline" className="text-xs">
          {Object.keys(changes).length} field{Object.keys(changes).length !== 1 ? "s" : ""} modified
        </Badge>
      </div>

      <div className="space-y-6">
        {Object.entries(changes).map(([key, value]) => renderFieldChange(key, value))}
      </div>

      {/* Raw JSON view (collapsible) */}
      <details className="pt-4 border-t">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          View Raw JSON
        </summary>
        <div className="mt-3 p-4 bg-muted rounded-md overflow-x-auto">
          <pre className="text-xs font-mono">{JSON.stringify(changes, null, 2)}</pre>
        </div>
      </details>
    </div>
  );
}
