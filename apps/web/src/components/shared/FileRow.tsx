"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

interface FileRowProps {
  name: string;
  size?: number;
  section?: string;
  onDelete?: () => Promise<void> | void;
  onPreview?: () => void;
  onDownload?: () => void;
  disabled?: boolean;
}

export function FileRow({
  name,
  size,
  section,
  onDelete,
  onPreview,
  onDownload,
  disabled,
}: FileRowProps) {
  const readableSize =
    typeof size === "number" ? `${(size / 1024 / 1024).toFixed(1)} MB` : undefined;

  return (
    <div className="flex items-center justify-between text-xs py-1">
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate max-w-[220px]" title={name}>
          {name}
        </span>
        {readableSize && <span className="text-[var(--text-secondary)]">({readableSize})</span>}
        {section && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] border border-[var(--border)] text-[var(--text-secondary)]">
            {section}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onPreview && (
          <Button variant="outline" size="sm" disabled={disabled} onClick={onPreview}>
            Preview
          </Button>
        )}
        {onDownload && (
          <Button variant="outline" size="sm" disabled={disabled} onClick={onDownload}>
            Download
          </Button>
        )}
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            disabled={disabled}
            onClick={() => void onDelete()}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
