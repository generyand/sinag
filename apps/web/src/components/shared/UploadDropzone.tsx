"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: FileList | File[]) => void;
  className?: string;
  hint?: string;
}

export function UploadDropzone({
  accept,
  multiple = true,
  disabled,
  onFiles,
  className,
  hint,
}: UploadDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isOver, setIsOver] = React.useState(false);

  const handleBrowse = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    onFiles(e.target.files);
    e.target.value = ""; // reset so same file can be selected again
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    if (disabled) return;
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length) onFiles(files);
  };

  return (
    <div
      onClick={handleBrowse}
      onDragOver={(e) => {
        e.preventDefault();
        if (disabled) return;
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={onDrop}
      role="button"
      aria-disabled={disabled}
      className={cn(
        "w-full border border-[var(--border)] rounded-sm p-4 text-sm cursor-pointer select-none",
        "bg-[var(--card)] hover:bg-[var(--hover)] transition-colors",
        isOver && "bg-[var(--cityscape-yellow)]/10 border-[var(--cityscape-yellow)]",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[var(--text-secondary)]">
          Drag & drop files here, or <span className="underline">browse</span>
        </div>
        {hint && <div className="text-xs text-[var(--text-secondary)]">{hint}</div>}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}
