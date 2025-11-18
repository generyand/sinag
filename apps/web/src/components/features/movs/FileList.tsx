"use client";

import { File, Trash2, Download, Eye, FileText, Image, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { MOVFileResponse } from "@vantage/shared";

interface FileListProps {
  files: MOVFileResponse[];
  onDelete?: (fileId: number) => void;
  onPreview?: (file: MOVFileResponse) => void;
  onDownload?: (file: MOVFileResponse) => void;
  canDelete?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) {
    return <Image className="h-5 w-5" />;
  }
  if (fileType.includes("pdf")) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (fileType.includes("word") || fileType.includes("document")) {
    return <FileText className="h-5 w-5 text-blue-500" />;
  }
  if (fileType.includes("sheet") || fileType.includes("excel")) {
    return <FileText className="h-5 w-5 text-green-500" />;
  }
  if (fileType.startsWith("video/")) {
    return <FileIcon className="h-5 w-5 text-purple-500" />;
  }
  return <FileIcon className="h-5 w-5" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList({
  files,
  onDelete,
  onPreview,
  onDownload,
  canDelete = false,
  loading = false,
  emptyMessage = "No files uploaded yet",
}: FileListProps) {
  if (loading) {
    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-[var(--hover)] animate-pulse rounded-lg"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          <div className="text-center py-8 px-4 rounded-lg bg-[var(--card)] border border-dashed border-[var(--border)]">
            <File className="mx-auto h-12 w-12 text-[var(--text-secondary)] opacity-50 mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pb-3">
        <CardTitle className="text-base font-semibold">Uploaded Files</CardTitle>
        <CardDescription>
          {files.length} file{files.length !== 1 ? "s" : ""} uploaded
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--hover)] transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                {/* File Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getFileIcon(file.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.file_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(file.uploaded_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {onPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onPreview(file)}
                      title="Preview file"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onDownload && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDownload(file)}
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && onDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(file.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
