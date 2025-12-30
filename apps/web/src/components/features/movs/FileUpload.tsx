"use client";

import { Upload, X, FileIcon, AlertCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ALLOWED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "video/mp4": [".mp4"],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile: File | null;
  disabled?: boolean;
  error?: string | null;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  disabled = false,
  error = null,
  className,
}: FileUploadProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setValidationError(null);

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors?.[0]?.code === "file-too-large") {
          setValidationError(`File size exceeds 50MB limit. Please select a smaller file.`);
        } else if (rejection.errors?.[0]?.code === "file-invalid-type") {
          setValidationError(`Invalid file type. Allowed types: PDF, DOCX, XLSX, JPG, PNG, MP4`);
        } else {
          setValidationError(`File rejected: ${rejection.errors?.[0]?.message}`);
        }
        return;
      }

      // Handle accepted files (now supporting multiple)
      if (acceptedFiles.length > 0) {
        // Process each file
        for (const file of acceptedFiles) {
          // Additional validation
          if (file.size > MAX_FILE_SIZE) {
            setValidationError(
              `File ${file.name} size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 50MB limit`
            );
            continue; // Skip this file but process others
          }

          onFileSelect(file);
        }
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    disabled,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValidationError(null);
    onFileRemove();
  };

  const displayError = error || validationError;

  return (
    <div className={cn("w-full space-y-3", className)}>
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={cn(
            "border-4 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 min-h-[200px] flex flex-col items-center justify-center",
            isDragActive
              ? "border-blue-500 bg-blue-50 scale-[1.02] shadow-lg"
              : "border-blue-300 hover:border-blue-500 hover:bg-blue-50/50 bg-blue-50/20",
            disabled &&
              "opacity-50 cursor-not-allowed hover:border-[var(--border)] hover:bg-transparent",
            displayError && "border-red-500 bg-red-50"
          )}
        >
          <input {...getInputProps()} />
          <Upload
            className={cn(
              "mx-auto h-20 w-20 mb-6 transition-colors",
              isDragActive ? "text-blue-600" : "text-blue-500"
            )}
            strokeWidth={2.5}
          />
          <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {isDragActive ? (
              "Drop files here"
            ) : (
              <>
                Click here to upload files
              </>
            )}
          </p>
          <p className="text-base text-blue-600 font-medium mb-3">
            or drag and drop your files here
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-2 bg-white/80 px-4 py-2 rounded-lg border border-gray-200">
            Accepted: PDF, Word, Excel, Images (JPG, PNG), Videos (MP4)<br/>
            Maximum size: 50MB per file
          </p>
        </div>
      ) : (
        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FileIcon className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!disabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="flex-shrink-0 ml-2 hover:bg-red-50 hover:text-red-600"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {displayError && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
