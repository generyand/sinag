"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertTriangle,
    CheckCircle,
    Download,
    FileText,
    MessageSquare,
    Upload,
    XCircle
} from "lucide-react";
import { useState } from "react";
import { MOVPreviewer, TechnicalNotesPanel, ValidationControls } from "./";

interface AssessmentResponseCardProps {
  response: {
    id: number;
    is_completed: boolean;
    requires_rework: boolean;
    validation_status: string | null;
    response_data: any;
    created_at: string;
    updated_at: string;
    indicator: {
      id: number;
      name: string;
      description: string;
      form_schema: any;
      governance_area: {
        id: number;
        name: string;
        area_type: string;
      };
      technical_notes: string;
    };
    movs: Array<{
      id: number;
      filename: string;
      original_filename: string;
      file_size: number;
      content_type: string;
      storage_path: string;
      status: string;
      uploaded_at: string;
    }>;
    feedback_comments: Array<{
      id: number;
      comment: string;
      comment_type: string;
      is_internal_note: boolean;
      created_at: string;
      assessor: {
        id: number;
        name: string;
        email: string;
      } | null;
    }>;
  };
  assessmentId: string;
}

export function AssessmentResponseCard({ response, assessmentId }: AssessmentResponseCardProps) {
  const [showTechnicalNotes, setShowTechnicalNotes] = useState(false);
  const [showMOVs, setShowMOVs] = useState(false);
  const [showValidationForm, setShowValidationForm] = useState(false);

  // Debug logging to verify MOVs data
  console.log('[AssessmentResponseCard] Indicator:', response.indicator.name);
  console.log('[AssessmentResponseCard] MOVs count:', response.movs?.length || 0);
  console.log('[AssessmentResponseCard] MOVs data:', response.movs);

  const getValidationStatusIcon = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "conditional":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getValidationStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "pass":
        return "bg-green-50 text-green-700 border-green-200";
      case "fail":
        return "bg-red-50 text-red-700 border-red-200";
      case "conditional":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{response.indicator.name}</CardTitle>
            <p className="text-sm text-gray-600">
              {response.indicator.governance_area.name} • {response.indicator.governance_area.area_type}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {response.validation_status && (
              <Badge className={`${getValidationStatusColor(response.validation_status)} flex items-center gap-1`}>
                {getValidationStatusIcon(response.validation_status)}
                {response.validation_status}
              </Badge>
            )}
            {response.requires_rework && (
              <Badge variant="destructive">Requires Rework</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <div>
          <h4 className="font-medium text-gray-900">Description</h4>
          <p className="text-sm text-gray-600">{response.indicator.description}</p>
        </div>

        {/* Response Data */}
        {response.response_data && Object.keys(response.response_data).length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900">Response Data</h4>
            <div className="mt-2 rounded-lg bg-gray-50 p-3">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(response.response_data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTechnicalNotes(!showTechnicalNotes)}
          >
            <FileText className="h-4 w-4 mr-2" />
            {showTechnicalNotes ? 'Hide' : 'Show'} Technical Notes
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMOVs(!showMOVs)}
            disabled={response.movs.length === 0}
          >
            <Upload className="h-4 w-4 mr-2" />
            {showMOVs ? 'Hide' : 'Show'} MOVs ({response.movs.length})
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowValidationForm(!showValidationForm)}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {showValidationForm ? 'Hide' : 'Show'} Validation Controls
          </Button>
        </div>

        {/* Technical Notes Panel */}
        {showTechnicalNotes && (
          <TechnicalNotesPanel 
            technicalNotes={response.indicator.technical_notes}
            indicatorName={response.indicator.name}
          />
        )}

        {/* MOVs Panel */}
        {showMOVs && response.movs.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Means of Verification (MOVs)</h4>
            <div className="space-y-2">
              {response.movs.map((mov) => (
                <div key={mov.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">{mov.original_filename}</p>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(mov.file_size)} • {mov.content_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MOVPreviewer mov={mov} />
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Controls */}
        {showValidationForm && (
          <ValidationControls 
            responseId={response.id}
            assessmentId={assessmentId}
            indicatorTitle={response.indicator.name}
            indicatorDescription={response.indicator.description}
            currentValidationStatus={response.validation_status}
            currentPublicComment={response.feedback_comments.find(c => !c.is_internal_note)?.comment || null}
            currentInternalNote={response.feedback_comments.find(c => c.is_internal_note)?.comment || null}
            technicalNotes={response.indicator.technical_notes}
          />
        )}

        {/* Feedback Comments */}
        {response.feedback_comments.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Feedback Comments</h4>
            <div className="space-y-3">
              {response.feedback_comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {comment.assessor?.name || 'Unknown Assessor'}
                      </span>
                      {comment.is_internal_note && (
                        <Badge variant="secondary" className="text-xs">Internal</Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t text-xs text-gray-500">
          <p>Response ID: {response.id}</p>
          <p>Created: {new Date(response.created_at).toLocaleString()}</p>
          <p>Updated: {new Date(response.updated_at).toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}
