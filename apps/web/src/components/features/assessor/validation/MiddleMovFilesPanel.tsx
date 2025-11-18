"use client";

import * as React from 'react';
import type { AssessmentDetailsResponse } from '@vantage/shared';
import { FileList } from '@/components/features/movs/FileList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileIcon } from 'lucide-react';

interface MiddleMovFilesPanelProps {
  assessment: AssessmentDetailsResponse;
  expandedId?: number | null;
}

type AnyRecord = Record<string, any>;

export function MiddleMovFilesPanel({ assessment, expandedId }: MiddleMovFilesPanelProps) {
  const data: AnyRecord = (assessment as unknown as AnyRecord) ?? {};
  const core = (data.assessment as AnyRecord) ?? data;
  const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];

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

  // Get MOV files from the selected response
  const movFiles = React.useMemo(() => {
    if (!selectedResponse) return [];

    // MOV files are in the 'movs' array according to the schema
    const files = (selectedResponse.movs as AnyRecord[]) ?? [];

    // Transform to MOVFileResponse format
    return files.map((mov: AnyRecord) => {
      // MOV files have a nested 'file' object
      const fileData = mov.file || mov;

      return {
        id: fileData.id || mov.id,
        assessment_id: fileData.assessment_id || mov.assessment_id,
        indicator_id: fileData.indicator_id || mov.indicator_id,
        file_name: fileData.file_name || fileData.filename || 'Unknown file',
        file_url: fileData.file_url || fileData.url || '',
        file_type: fileData.file_type || fileData.type || 'application/octet-stream',
        file_size: fileData.file_size || fileData.size || 0,
        uploaded_by: fileData.uploaded_by || 0,
        uploaded_at: fileData.uploaded_at || fileData.created_at || new Date().toISOString(),
        deleted_at: fileData.deleted_at || null,
        field_id: fileData.field_id || null,
      };
    });
  }, [selectedResponse]);

  const handlePreview = (file: any) => {
    window.open(file.file_url, "_blank");
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
          />
        )}
      </div>
    </div>
  );
}
