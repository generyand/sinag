"use client";

import { FilePreviewerModal } from "@/components/shared";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAssessorMOVUploadMutation, useAssessorValidationMutation } from "@/hooks/useAssessor";
import { useQueryClient } from "@tanstack/react-query";
import { MOVCreate, ValidationStatus } from "@vantage/shared";
import { AlertTriangle, CheckCircle, Eye, FileText, MessageSquare, Save, Upload, X, XCircle } from "lucide-react";
import { useRef, useState } from "react";

interface ValidationControlsProps {
  responseId: number;
  indicatorTitle: string;
  indicatorDescription: string;
  currentValidationStatus: string | null;
  currentPublicComment: string | null;
  currentInternalNote: string | null;
  technicalNotes?: string;
  assessmentId: string;
}

export function ValidationControls({
  responseId,
  indicatorTitle,
  indicatorDescription,
  currentValidationStatus,
  currentPublicComment,
  currentInternalNote,
  technicalNotes,
  assessmentId,
}: ValidationControlsProps) {
  const [validationStatus, setValidationStatus] = useState(currentValidationStatus || "");
  const [publicComment, setPublicComment] = useState(currentPublicComment || "");
  const [internalNote, setInternalNote] = useState(currentInternalNote || "");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const validationMutation = useAssessorValidationMutation(assessmentId);
  const movUploadMutation = useAssessorMOVUploadMutation(assessmentId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!validationStatus) {
      alert("Please select a validation status");
      return;
    }

    // Validate that public comment is provided for Conditional status
    if (validationStatus === "Conditional" && !publicComment.trim()) {
      alert("Public comment is required for Conditional status");
      return;
    }

    try {
      await validationMutation.mutateAsync({
        responseId,
        data: {
          validation_status: validationStatus as ValidationStatus,
          public_comment: publicComment.trim() || null,
          assessor_remarks: isInternalNote ? internalNote.trim() || null : null,
        },
      });

      // Invalidate the assessment details query to refresh the data
      queryClient.invalidateQueries({ 
        queryKey: ["assessor", "assessment", assessmentId] 
      });

      alert("Validation saved successfully!");
    } catch (error) {
      console.error("Validation save failed:", error);
      alert("Failed to save validation. Please try again.");
    }
  };

  const handleSaveAsDraft = async () => {
    if (!validationStatus) {
      alert("Please select a validation status");
      return;
    }

    try {
      await validationMutation.mutateAsync({
        responseId,
        data: {
          validation_status: validationStatus as ValidationStatus,
          public_comment: publicComment.trim() || null,
          assessor_remarks: isInternalNote ? internalNote.trim() || null : null,
        },
      });

      // Invalidate the assessment details query to refresh the data
      queryClient.invalidateQueries({ 
        queryKey: ["assessor", "assessment", assessmentId] 
      });

      alert("Draft saved successfully!");
    } catch (error) {
      console.error("Draft save failed:", error);
      alert("Failed to save draft. Please try again.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create a preview URL for the selected file
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handlePreviewFile = () => {
    if (selectedFile && previewUrl) {
      setIsPreviewOpen(true);
    }
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    // Clean up the preview URL when closing
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleMOVUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file to upload");
      return;
    }

    try {
      // For now, we'll create a mock storage path since we don't have Supabase integration yet
      // In a real implementation, you would upload to Supabase first and get the storage path
      const mockStoragePath = `movs/${Date.now()}-${selectedFile.name}`;
      
      const movData: MOVCreate = {
        filename: selectedFile.name,
        original_filename: selectedFile.name,
        file_size: selectedFile.size,
        content_type: selectedFile.type,
        storage_path: mockStoragePath,
        response_id: responseId,
      };

      await movUploadMutation.mutateAsync({
        responseId,
        data: {
          ...movData,
          file: selectedFile,
        },
      });

      // Invalidate the assessment details query to refresh the data
      queryClient.invalidateQueries({ 
        queryKey: ["assessor", "assessment", assessmentId] 
      });

      // Clear the selected file
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      alert("MOV uploaded successfully!");
    } catch (error) {
      console.error("MOV upload failed:", error);
      alert("Failed to upload MOV. Please try again.");
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileType = (file: File) => {
    if (file.type.startsWith('image/')) {
      return file.type.split('/')[1]; // e.g., 'jpeg', 'png'
    } else if (file.type === 'application/pdf') {
      return 'pdf';
    } else if (file.type.startsWith('video/')) {
      return file.type.split('/')[1]; // e.g., 'mp4', 'webm'
    } else if (file.type.startsWith('text/')) {
      return 'txt';
    } else {
      // Extract extension from filename as fallback
      const extension = file.name.split('.').pop()?.toLowerCase();
      return extension || 'unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pass":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Fail":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "Conditional":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pass":
        return "text-green-600 bg-green-50 border-green-200";
      case "Fail":
        return "text-red-600 bg-red-50 border-red-200";
      case "Conditional":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <MessageSquare className="h-5 w-5" />
          Validation Controls
        </CardTitle>
        <div className="text-sm text-blue-700">
          <p className="font-medium">{indicatorTitle}</p>
          <p className="text-xs mt-1">{indicatorDescription}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Status Display */}
        {currentValidationStatus && (
          <div className="rounded-lg border p-3 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Current Status:</span>
              <Badge className={getStatusColor(currentValidationStatus)}>
                <div className="flex items-center gap-1">
                  {getStatusIcon(currentValidationStatus)}
                  {currentValidationStatus}
                </div>
              </Badge>
            </div>
            {currentPublicComment && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Public Comment:</span>
                <p className="mt-1">{currentPublicComment}</p>
              </div>
            )}
            {currentInternalNote && (
              <div className="text-xs text-gray-600 mt-2">
                <span className="font-medium">Internal Note:</span>
                <p className="mt-1">{currentInternalNote}</p>
              </div>
            )}
          </div>
        )}

        {/* Technical Notes */}
        {technicalNotes && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="technical-notes" className="border border-blue-200 rounded-lg">
              <AccordionTrigger className="px-3 py-2 hover:no-underline bg-blue-50 rounded-t-lg">
                <div className="flex items-center gap-2 text-left">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Technical Notes</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 py-3 bg-white rounded-b-lg">
                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {technicalNotes}
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Validation Status Selection */}
        <div>
          <Label className="text-sm font-medium">Validation Status *</Label>
          <RadioGroup
            value={validationStatus}
            onValueChange={setValidationStatus}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Pass" id="pass" />
              <Label htmlFor="pass" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Pass
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Fail" id="fail" />
              <Label htmlFor="fail" className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Fail
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Conditional" id="conditional" />
              <Label htmlFor="conditional" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Conditional
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Public Comment */}
        <div>
          <Label htmlFor="public-comment" className="text-sm font-medium">
            Public Comment {validationStatus === "Conditional" && <span className="text-red-500">*</span>}
          </Label>
          <Textarea
            id="public-comment"
            placeholder="Add a public comment for the BLGU..."
            value={publicComment}
            onChange={(e) => setPublicComment(e.target.value)}
            className="mt-2"
            rows={3}
          />
          {validationStatus === "Conditional" && !publicComment.trim() && (
            <p className="text-xs text-red-600 mt-1">
              Public comment is required for Conditional status
            </p>
          )}
        </div>

        {/* Internal Note */}
        <div>
          <Label htmlFor="internal-note" className="text-sm font-medium">
            Internal Note
          </Label>
          <Textarea
            id="internal-note"
            placeholder="Add an internal note for other assessors..."
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            className="mt-2"
            rows={3}
          />
          <div className="flex items-center space-x-2 mt-2">
            <input
              type="checkbox"
              id="is-internal"
              checked={isInternalNote}
              onChange={(e) => setIsInternalNote(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="is-internal" className="text-sm">
              Mark as internal note (only visible to assessors)
            </Label>
          </div>
        </div>

        {/* MOV Upload Section */}
        <div>
          <Label className="text-sm font-medium">Upload MOV (Means of Verification)</Label>
          <div className="mt-2 space-y-3">
            {/* File Input */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={movUploadMutation.isPending}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Select File
              </Button>
              {selectedFile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMOVUpload}
                  disabled={movUploadMutation.isPending}
                  className="flex items-center gap-2 bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                >
                  {movUploadMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload MOV
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Selected File Display */}
            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePreviewFile}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeSelectedFile}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* File Type Info */}
            <p className="text-xs text-gray-500">
              Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF, MP4, MOV, AVI (Max 100MB)
            </p>
          </div>
        </div>

        {/* Save Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-blue-200">
          <Button
            onClick={handleSaveAsDraft}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
            disabled={!validationStatus || validationMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {validationMutation.isPending ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!validationStatus || (validationStatus === "Conditional" && !publicComment.trim()) || validationMutation.isPending}
          >
            Save Validation
          </Button>
        </div>
      </CardContent>

      {/* File Preview Modal */}
      {selectedFile && previewUrl && (
        <FilePreviewerModal
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
          fileUrl={previewUrl}
          fileName={selectedFile.name}
          fileType={getFileType(selectedFile)}
        />
      )}
    </Card>
  );
}
