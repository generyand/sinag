"use client";

import { FileList } from '@/components/features/movs/FileList';
import { Button } from '@/components/ui/button';
import { useMovAnnotations } from '@/hooks/useMovAnnotations';
import type { AssessmentDetailsResponse } from '@sinag/shared';
import { FileIcon, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import * as React from 'react';

// Dynamically import PdfAnnotator to avoid SSR issues
const PdfAnnotator = dynamic(() => import('@/components/shared/PdfAnnotator'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[70vh]">Loading PDF viewer...</div>,
});

// Dynamically import ImageAnnotator to avoid SSR issues
const ImageAnnotator = dynamic(() => import('@/components/shared/ImageAnnotator'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-[70vh]">Loading image viewer...</div>,
});

interface MiddleMovFilesPanelProps {
  assessment: AssessmentDetailsResponse;
  expandedId?: number | null;
  /** Optional: Timestamp when calibration was requested, used to separate old vs new files */
  calibrationRequestedAt?: string | null;
}

type AnyRecord = Record<string, any>;

export function MiddleMovFilesPanel({ assessment, expandedId, calibrationRequestedAt }: MiddleMovFilesPanelProps) {
  const data: AnyRecord = (assessment as unknown as AnyRecord) ?? {};
  const core = (data.assessment as AnyRecord) ?? data;
  const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];

  // Debug: Log the assessment data structure
  console.log('[MiddleMovFilesPanel] Raw assessment data:', assessment);
  console.log('[MiddleMovFilesPanel] Extracted responses count:', responses.length);
  if (responses.length > 0) {
    console.log('[MiddleMovFilesPanel] First response sample:', responses[0]);
  }

  // Find the currently selected response
  const selectedResponse = responses.find((r) => r.id === expandedId);
  const indicator = (selectedResponse?.indicator as AnyRecord) ?? {};
  const indicatorName = indicator?.name || 'Select an indicator';

  // Debug logging
  console.log('[MiddleMovFilesPanel] Debug:', {
    expandedId,
    selectedResponse: selectedResponse ? 'found' : 'not found',
    responseId: selectedResponse?.id,
    indicatorName,
    hasMOVs: selectedResponse?.movs ? 'yes' : 'no',
    movCount: selectedResponse?.movs?.length || 0,
  });

  // Additional debug: log the full selectedResponse structure
  if (selectedResponse) {
    console.log('[MiddleMovFilesPanel] Full selectedResponse:', selectedResponse);
    console.log('[MiddleMovFilesPanel] Keys in selectedResponse:', Object.keys(selectedResponse));
  }

  // Get MOV files from the selected response with isNew flag for calibration separation
  const movFiles = React.useMemo(() => {
    if (!selectedResponse) return [];

    // MOV files are in the 'movs' array according to the backend schema
    const files = (selectedResponse.movs as AnyRecord[]) ?? [];

    console.log('[MiddleMovFilesPanel] Raw MOVs from response:', files);
    console.log('[MiddleMovFilesPanel] calibrationRequestedAt:', calibrationRequestedAt);

    // Parse calibration timestamp for comparison
    const calibrationDate = calibrationRequestedAt ? new Date(calibrationRequestedAt) : null;

    // Transform backend MOV format to FileList component format
    // Backend sends: { id, filename, original_filename, file_size, content_type, storage_path, status, uploaded_at }
    return files.map((mov: AnyRecord) => {
      const uploadedAt = mov.uploaded_at || new Date().toISOString();
      const uploadDate = new Date(uploadedAt);

      // File is "new" if it was uploaded AFTER the calibration request
      const isNew = calibrationDate ? uploadDate > calibrationDate : false;

      const transformed = {
        id: mov.id,
        assessment_id: selectedResponse.assessment_id,
        indicator_id: selectedResponse.indicator_id,
        file_name: mov.original_filename || mov.filename || 'Unknown file',
        file_url: mov.storage_path || '', // Storage path is the URL to the file
        file_type: mov.content_type || 'application/octet-stream',
        file_size: mov.file_size || 0,
        uploaded_by: 0, // Not provided by backend
        uploaded_at: uploadedAt,
        deleted_at: null,
        field_id: mov.field_id || null,
        isNew, // Flag for visual separation in UI
      };

      console.log('[MiddleMovFilesPanel] Transformed MOV:', { original: mov, transformed, isNew });

      return transformed;
    });
  }, [selectedResponse, calibrationRequestedAt]);

  // Separate files into new (after calibration) and old (before calibration)
  const { newFiles, oldFiles } = React.useMemo(() => {
    if (!calibrationRequestedAt) {
      // No calibration - all files are treated as "old" (normal view)
      return { newFiles: [], oldFiles: movFiles };
    }
    return {
      newFiles: movFiles.filter((f) => f.isNew),
      oldFiles: movFiles.filter((f) => !f.isNew),
    };
  }, [movFiles, calibrationRequestedAt]);

  // State for PDF annotation modal
  const [selectedFile, setSelectedFile] = React.useState<any | null>(null);
  const [isAnnotating, setIsAnnotating] = React.useState(false);

  // Use the annotations hook for the selected file
  const {
    annotations,
    isLoading: annotationsLoading,
    createAnnotation,
    deleteAnnotation,
  } = useMovAnnotations(selectedFile?.id || null);

  const handlePreview = (file: any) => {
    // Set selected file for preview (works for both PDF and images)
    setSelectedFile(file);
    setIsAnnotating(true);
  };

  const handleDownload = async (file: any) => {
    try {
      const response = await fetch(file.file_url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const closeAnnotationModal = () => {
    setIsAnnotating(false);
    setSelectedFile(null);
  };

  // Transform annotations from backend format to PdfAnnotator format
  const pdfAnnotations = React.useMemo(() => {
    return (annotations as any[])?.map((ann: any) => ({
      id: String(ann.id),
      type: 'pdfRect' as const,
      page: ann.page ?? ann.page_number ?? 0,  // Backend returns 'page', not 'page_number'
      rect: ann.rect || { x: 0, y: 0, w: 10, h: 10 },
      rects: ann.rects,
      comment: ann.comment || '',
      createdAt: ann.created_at || new Date().toISOString(),
    })) || [];
  }, [annotations]);

  // Transform annotations for ImageAnnotator
  const imageAnnotations = React.useMemo(() => {
    return (annotations as any[])?.map((ann: any) => ({
      id: String(ann.id),
      rect: ann.rect || { x: 0, y: 0, w: 10, h: 10 },
      comment: ann.comment || '',
      createdAt: ann.created_at || new Date().toISOString(),
    })) || [];
  }, [annotations]);

  const handleAddAnnotation = async (annotation: any) => {
    if (!selectedFile?.id) return;

    try {
      // For images, annotation won't have a 'page' property
      const isImageAnnotation = !('page' in annotation);

      await createAnnotation({
        mov_file_id: selectedFile.id,
        annotation_type: isImageAnnotation ? 'imageRect' : 'pdfRect',
        page: annotation.page ?? 0,
        rect: annotation.rect,
        rects: annotation.rects || undefined,
        comment: annotation.comment || '',
      });
    } catch (error) {
      console.error('[MiddleMovFilesPanel] Failed to create annotation:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      {/* Header */}
      <div className="h-14 flex items-center px-3 border-b border-[var(--border)] bg-muted/5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground truncate">BLGU Uploaded Files</h3>
            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{indicatorName}</p>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedResponse ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground/60">
            <div className="bg-muted/10 p-4 rounded-full mb-4">
              <FileIcon className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium text-foreground/80 mb-1">No Indicator Selected</p>
            <p className="text-xs max-w-[180px]">
              Select an indicator from the left panel to view uploaded files
            </p>
          </div>
        ) : movFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground/60">
            <div className="bg-muted/10 p-4 rounded-full mb-4">
              <FileIcon className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium text-foreground/80 mb-1">No Files Uploaded</p>
            <p className="text-xs max-w-[180px]">
              There are no files uploaded for this indicator yet
            </p>
          </div>
        ) : calibrationRequestedAt ? (
          /* Calibration/Rework mode: Show files in two sections */
          <div className="space-y-4">
            {/* New Files Section - Highlighted (only show if there are new files) */}
            {newFiles.length > 0 && (
              <div className="rounded-md border-2 border-green-500 bg-green-50/50 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    New Files (After Calibration)
                  </span>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    {newFiles.length} file{newFiles.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <FileList
                  files={newFiles}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  canDelete={false}
                  loading={false}
                  emptyMessage="No new files"
                  movAnnotations={annotations as any[]}
                />
              </div>
            )}

            {/* Old Files Section */}
            {oldFiles.length > 0 && (
              <div className="rounded-md border border-gray-200 bg-gray-50/50 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Previous Files
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                    {oldFiles.length} file{oldFiles.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <FileList
                  files={oldFiles}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  canDelete={false}
                  loading={false}
                  emptyMessage="No previous files"
                  movAnnotations={annotations as any[]}
                />
              </div>
            )}

            {/* If no files in either category */}
            {newFiles.length === 0 && oldFiles.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center p-6">
                <FileIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No files uploaded for this indicator
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Normal mode: Show all files */
          <FileList
            files={movFiles}
            onPreview={handlePreview}
            onDownload={handleDownload}
            canDelete={false}
            loading={false}
            emptyMessage="No files uploaded yet"
            movAnnotations={annotations as any[]}
          />
        )}
      </div>

      {/* File Preview Modal (PDF with annotations or Image) */}
      {isAnnotating && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-[70vw] h-[90vh] flex flex-row gap-4 p-4">
            {/* Left: File Viewer */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
                <div className="flex-1">
                  <h2 className="text-base font-semibold">{selectedFile.file_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedFile.file_type === 'application/pdf'
                      ? 'Select text to add highlight and comment'
                      : 'Image preview'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeAnnotationModal}
                  className="shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* File Content */}
              <div className="flex-1" style={{ minHeight: 0 }}>
                {selectedFile.file_type === 'application/pdf' ? (
                  // PDF Viewer with Annotations
                  annotationsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Loading annotations...</p>
                    </div>
                  ) : (
                    <PdfAnnotator
                      url={selectedFile.file_url}
                      annotateEnabled={true}
                      annotations={pdfAnnotations}
                      onAdd={handleAddAnnotation}
                    />
                  )
                ) : selectedFile.file_type?.startsWith('image/') ? (
                  // Image Viewer with Annotations
                  annotationsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Loading annotations...</p>
                    </div>
                  ) : (
                    <ImageAnnotator
                      url={selectedFile.file_url}
                      annotateEnabled={true}
                      annotations={imageAnnotations}
                      onAdd={handleAddAnnotation}
                    />
                  )
                ) : (
                  // Unsupported file type
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <FileIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Preview not available for this file type
                    </p>
                    <Button
                      onClick={() => window.open(selectedFile.file_url, "_blank")}
                      variant="outline"
                    >
                      Open in New Tab
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Comments Sidebar */}
            {selectedFile.file_type === 'application/pdf' ? (
              // PDF Annotations Sidebar
              <div className="w-80 flex flex-col border-l border-gray-200 pl-4">
                <h3 className="font-semibold text-sm mb-3 pb-2 border-b border-gray-200">
                  Comments ({pdfAnnotations.length})
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3">
                  {pdfAnnotations.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No comments yet. Select text to add a highlight with a comment.
                    </div>
                  ) : (
                    pdfAnnotations.map((ann, idx) => (
                      <div key={ann.id} className="p-3 rounded-sm bg-gray-50 border border-gray-200">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="shrink-0 font-bold text-yellow-600 text-sm">#{idx + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAnnotation(parseInt(ann.id))}
                            className="ml-auto shrink-0 h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed mb-2">{ann.comment || '(No comment)'}</p>
                        <p className="text-xs text-gray-500">Page {ann.page + 1}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : selectedFile.file_type?.startsWith('image/') ? (
              // Image Annotations Sidebar
              <div className="w-80 flex flex-col border-l border-gray-200 pl-4">
                <h3 className="font-semibold text-sm mb-3 pb-2 border-b border-gray-200">
                  Annotations ({imageAnnotations.length})
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3">
                  {imageAnnotations.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No annotations yet. Draw a rectangle on the image and add a comment.
                    </div>
                  ) : (
                    imageAnnotations.map((ann, idx) => (
                      <div key={ann.id} className="p-3 rounded-sm bg-gray-50 border border-gray-200">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="shrink-0 font-bold text-yellow-600 text-sm">#{idx + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAnnotation(parseInt(ann.id))}
                            className="ml-auto shrink-0 h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed">{ann.comment || '(No comment)'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
