"use client";

import { Input } from "@/components/ui/input";
import { useRef, useState } from "react";
import { uploadWithProgress } from "../../lib/api";

interface UploadedFile {
  id: string | number;
  name: string;
  size: number;
  url: string;
}

interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  onUploadComplete?: (files: File[]) => void | Promise<void>;
  onUploadError?: (error: string) => void;
  onDeleteFile?: (fileId: string | number) => void;
  uploadUrl: string;
  disabled?: boolean;
  existingFiles?: UploadedFile[];
  isLoading?: boolean;
}

export default function FileUploader({
  accept = ".mov,.mp4,.avi",
  multiple = false,
  maxSize = 100, // 100MB default
  onUploadComplete,
  onUploadError,
  onDeleteFile,
  uploadUrl,
  disabled = false,
  existingFiles = [],
  isLoading = false,
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      return `File size exceeds ${maxSize}MB limit`;
    }

    if (
      accept &&
      !accept
        .split(",")
        .some((type) => file.name.toLowerCase().endsWith(type.trim()))
    ) {
      return `File type not supported. Accepted types: ${accept}`;
    }

    return null;
  };

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate files
    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      onUploadError?.(errors.join(", "));
      return;
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload files one by one (could be modified to upload in parallel)
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const uploadResult = await uploadWithProgress(uploadUrl, file, {
          onProgress: (progress) => {
            const totalProgress =
              (i * 100 + progress.percentage) / validFiles.length;
            setUploadProgress(Math.round(totalProgress));
          },
        });

        // Add to uploaded files list immediately so it shows up with delete button
        setUploadedFiles((prev) => [...prev, file]);

        // Call onUploadComplete with the file info
        // Parent component is responsible for updating existingFiles
        // Wait for the parent to finish processing
        await onUploadComplete?.([file]);
      }

      // Clear uploaded files after all uploads complete and parent has processed them
      // The files should now appear in existingFiles
      setUploadedFiles([]);
    } catch (error) {
      onUploadError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const triggerFileSelect = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full space-y-4">
      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <div
        className={`relative group border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ease-in-out ${
          isDragOver
            ? "border-[var(--cityscape-yellow)] bg-[var(--cityscape-yellow)]/5 scale-[1.01]"
            : disabled || isUploading
            ? "border-[var(--border)] bg-[var(--muted)] opacity-60"
            : "border-[var(--border)] hover:border-[var(--cityscape-yellow)] hover:bg-[var(--hover)]"
        } ${
          !disabled && !isUploading ? "cursor-pointer" : "cursor-not-allowed"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
      >
        {isUploading ? (
          <div className="space-y-4 py-2">
            <div className="relative mx-auto h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-[var(--border)] opacity-30"></div>
              <div className="absolute inset-0 rounded-full border-4 border-[var(--cityscape-yellow)] border-t-transparent animate-spin"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Uploading files...</p>
              <div className="mt-3 w-full max-w-xs mx-auto bg-[var(--border)] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[var(--cityscape-yellow)] h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-2 font-medium">
                {uploadProgress}% complete
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center transition-colors duration-200 ${isDragOver ? 'bg-[var(--cityscape-yellow)]/20 text-[var(--cityscape-yellow-dark)]' : 'bg-[var(--hover)] text-[var(--text-secondary)] group-hover:text-[var(--cityscape-yellow-dark)] group-hover:bg-[var(--cityscape-yellow)]/10'}`}>
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <p className="text-base font-medium text-[var(--foreground)]">
                <span className="text-[var(--cityscape-yellow-dark)] hover:underline">
                  Click to upload
                </span>{" "}
                or drag and drop
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {accept.replace(/\./g, "").toUpperCase().split(",").join(", ")} files up to {maxSize}MB
                {multiple ? " (multiple allowed)" : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Show existing files */}
      {existingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Uploaded Files
          </h4>
          <div className="grid gap-2">
            {existingFiles.map((file) => (
              <div
                key={file.id}
                className="group flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:border-[var(--cityscape-yellow)]/50 transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded bg-[var(--hover)] flex items-center justify-center text-[var(--text-secondary)]">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-medium text-[var(--foreground)] hover:text-[var(--cityscape-yellow-dark)] truncate transition-colors"
                    >
                      {file.name}
                    </a>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
                {!disabled && !isLoading && onDeleteFile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(file.id);
                    }}
                    className="flex-shrink-0 p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete file"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show newly uploaded files (transient state) */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Processing...
          </h4>
          <div className="grid gap-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--hover)]/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-[var(--foreground)]">{file.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
