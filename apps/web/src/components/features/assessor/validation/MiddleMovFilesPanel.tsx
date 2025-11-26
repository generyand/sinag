"use client";

import * as React from 'react';
import type { AssessmentDetailsResponse } from '@vantage/shared';
import { FileList } from '@/components/features/movs/FileList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMovAnnotations } from '@/hooks/useMovAnnotations';
import dynamic from 'next/dynamic';

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
}

type AnyRecord = Record<string, any>;

export function MiddleMovFilesPanel({ assessment, expandedId }: MiddleMovFilesPanelProps) {
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

  // Get MOV files from the selected response
  const movFiles = React.useMemo(() => {
    if (!selectedResponse) return [];

    // MOV files are in the 'movs' array according to the backend schema
    const files = (selectedResponse.movs as AnyRecord[]) ?? [];

    console.log('[MiddleMovFilesPanel] Raw MOVs from response:', files);

    // Transform backend MOV format to FileList component format
    // Backend sends: { id, filename, original_filename, file_size, content_type, storage_path, status, uploaded_at }
    return files.map((mov: AnyRecord) => {
      const transformed = {
        id: mov.id,
        assessment_id: selectedResponse.assessment_id,
        indicator_id: selectedResponse.indicator_id,
        file_name: mov.original_filename || mov.filename || 'Unknown file',
        file_url: mov.storage_path || '', // Storage path is the URL to the file
        file_type: mov.content_type || 'application/octet-stream',
        file_size: mov.file_size || 0,
        uploaded_by: 0, // Not provided by backend
        uploaded_at: mov.uploaded_at || new Date().toISOString(),
        deleted_at: null,
        field_id: mov.field_id || null,
      };

      console.log('[MiddleMovFilesPanel] Transformed MOV:', { original: mov, transformed });

      return transformed;
    });
  }, [selectedResponse]);

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
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <FileIcon className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold">BLGU Uploaded Files</h3>
            <p className="text-xs text-muted-foreground">{indicatorName}</p>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedResponse ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <FileIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Select an indicator from the left panel to view uploaded files
            </p>
          </div>
        ) : movFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <FileIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No files uploaded for this indicator
            </p>
          </div>
        ) : (
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
