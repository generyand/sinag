"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDeleteMOV, useUpdateIndicatorAnswer, useUploadMOV } from "@/hooks/useAssessment";
import { cn } from "@/lib/utils";
import { showError } from "@/lib/toast";
import { ComplianceAnswer, Indicator } from "@/types/assessment";
import { AlertTriangle, FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

interface IndicatorFormProps {
  indicator: Indicator;
  isLocked: boolean;
}

export function IndicatorForm({ indicator, isLocked }: IndicatorFormProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateAnswerMutation = useUpdateIndicatorAnswer();
  const uploadMOVMutation = useUploadMOV();
  const deleteMOVMutation = useDeleteMOV();

  const handleAnswerChange = (answer: ComplianceAnswer) => {
    if (isLocked) return;
    updateAnswerMutation.mutate({
      responseId: parseInt(indicator.id),
      data: { response_data: { compliance: answer } },
    });
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0 || isLocked) return;

    Array.from(files).forEach((file) => {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
      ];
      if (!allowedTypes.includes(file.type)) {
        showError("Invalid file type", {
          description: "Please upload only PDF, DOC, DOCX, JPG, or PNG files.",
        });
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        showError("File too large", {
          description: "File size must be less than 10MB.",
        });
        return;
      }

      uploadMOVMutation.mutate({
        responseId: parseInt(indicator.id),
        data: {
          filename: file.name,
          original_filename: file.name,
          file_size: file.size,
          content_type: file.type,
          storage_path: URL.createObjectURL(file),
          response_id: parseInt(indicator.id),
        },
      });
    });
  };

  const handleDeleteFile = (fileId: string) => {
    if (isLocked) return;
    deleteMOVMutation.mutate({
      movId: typeof fileId === "string" ? parseInt(fileId) : fileId,
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Indicator Description */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-4 mt-5">
        <h3 className="font-semibold text-[var(--foreground)] mb-2">Indicator Description</h3>
        <p className="text-[var(--text-secondary)]">{indicator.description}</p>
      </div>

      {/* Technical Notes */}
      <div className="bg-[var(--cityscape-yellow)]/10 border border-[var(--cityscape-yellow)]/20 rounded-sm p-4">
        <h3 className="font-semibold text-[var(--foreground)] mb-2">Technical Notes</h3>
        <p className="text-[var(--text-secondary)] text-sm">{indicator.technicalNotes}</p>
      </div>

      {/* Assessor's Remarks (Conditional) */}
      {indicator.assessorComment && (
        <Card className="border-[var(--cityscape-yellow)]/30 bg-[var(--cityscape-yellow)]/10 rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-[var(--cityscape-yellow)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--foreground)] mb-2">
                  Assessor&apos;s Comment for Rework
                </h3>
                <p className="text-[var(--text-secondary)]">{indicator.assessorComment}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Input */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--foreground)]">Compliance Assessment</h3>
        <RadioGroup
          value={indicator.complianceAnswer || ""}
          onValueChange={handleAnswerChange}
          disabled={isLocked}
          className="space-y-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id={`${indicator.id}-yes`} />
            <Label
              htmlFor={`${indicator.id}-yes`}
              className="text-sm font-medium text-[var(--foreground)]"
            >
              Yes - We comply with this requirement
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id={`${indicator.id}-no`} />
            <Label
              htmlFor={`${indicator.id}-no`}
              className="text-sm font-medium text-[var(--foreground)]"
            >
              No - We do not comply with this requirement
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="na" id={`${indicator.id}-na`} />
            <Label
              htmlFor={`${indicator.id}-na`}
              className="text-sm font-medium text-[var(--foreground)]"
            >
              N/A - This requirement is not applicable to our barangay
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* MOV Uploader (Conditional) */}
      {indicator.complianceAnswer === "yes" && (
        <div className="space-y-4">
          <h3 className="font-semibold text-[var(--foreground)]">Means of Verification (MOV)</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Please upload supporting documents to verify your compliance. Accepted formats: PDF,
            DOC, DOCX, JPG, PNG (Max 10MB per file)
          </p>

          {/* File Upload Area */}
          <div
            role="region"
            aria-label="File drop zone"
            className={cn(
              "border-2 border-dashed rounded-sm p-6 text-center transition-colors",
              dragActive
                ? "border-[var(--cityscape-yellow)] bg-[var(--cityscape-yellow)]/5"
                : "border-[var(--border)] hover:border-[var(--cityscape-yellow)]/60",
              isLocked && "opacity-50 cursor-not-allowed"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              disabled={isLocked}
            />

            <Upload className="h-8 w-8 text-[var(--text-secondary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              Drag and drop files here, or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLocked}
                className="text-[var(--cityscape-yellow)] hover:text-[var(--cityscape-yellow-dark)] underline disabled:opacity-50"
              >
                click to browse
              </button>
            </p>
            <p className="text-xs text-[var(--text-secondary)]">Maximum file size: 10MB</p>
          </div>

          {/* Upload Progress */}
          {uploadMOVMutation.isPending && (
            <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--cityscape-yellow)]"></div>
              <span>Uploading file...</span>
            </div>
          )}

          {/* Uploaded Files List */}
          {indicator.movFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-[var(--foreground)]">Uploaded Files</h4>
              <div className="space-y-2">
                {indicator.movFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-[var(--hover)] border border-[var(--border)] rounded-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-[var(--text-secondary)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{file.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {formatFileSize(file.size)} • Uploaded{" "}
                          {file.uploadedAt ? formatDate(file.uploadedAt) : "Just now"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(file.url, "_blank")}
                        disabled={isLocked}
                        className="border-[var(--border)] hover:bg-[var(--hover)]"
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={isLocked || deleteMOVMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-[var(--border)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
      {updateAnswerMutation.isPending && (
        <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--cityscape-yellow)]"></div>
          <span>Saving changes...</span>
        </div>
      )}

      {deleteMOVMutation.isPending && (
        <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--cityscape-yellow)]"></div>
          <span>Deleting file...</span>
        </div>
      )}
    </div>
  );
}
