"use client";

import { PageHeader } from "@/components/shared";
import { useAssessorAssessmentDetails } from "@/hooks/useAssessor";
import { AlertCircle, CheckCircle, Clock, FileText, MessageSquare, Upload } from "lucide-react";
import { useParams } from "next/navigation";
import { AssessmentDetailsSkeleton, AssessmentResponseCard, AssessmentWorkflowButtons } from "./";

export default function AssessmentValidationPage() {
  const params = useParams();
  const assessmentId = params.id as string;

  const { data, isLoading, error, refetch } = useAssessorAssessmentDetails(assessmentId);

  if (isLoading) {
    return <AssessmentDetailsSkeleton />;
  }

  if (error || !data?.success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Error Loading Assessment</h1>
        </div>
        <p className="mt-2 text-gray-600">
          {data?.message || "Failed to load assessment details. Please try again."}
        </p>
      </div>
    );
  }

  const assessment = data.assessment as any;

  // Debug logging to verify assessment data structure
  console.log("[AssessmentValidationPage] Full data:", data);
  console.log("[AssessmentValidationPage] Assessment:", assessment);
  console.log("[AssessmentValidationPage] Responses count:", assessment.responses?.length || 0);
  if (assessment.responses && assessment.responses.length > 0) {
    console.log("[AssessmentValidationPage] First response MOVs:", assessment.responses[0].movs);
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "submitted_for_review":
        return <Clock className="h-4 w-4" />;
      case "validated":
        return <CheckCircle className="h-4 w-4" />;
      case "needs_rework":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "submitted_for_review":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "validated":
        return "text-green-600 bg-green-50 border-green-200";
      case "needs_rework":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title={`Assessment Review - ${assessment.blgu_user.name}`}
        description={`Reviewing assessment for ${assessment.blgu_user.barangay?.name || "Unknown Barangay"}`}
      />

      {/* Assessment Overview */}
      <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Assessment Overview</h2>
            <p className="text-gray-600">
              Submitted by {assessment.blgu_user.name} ({assessment.blgu_user.email})
            </p>
          </div>
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${getStatusColor(assessment.status)}`}
          >
            {getStatusIcon(assessment.status)}
            <span className="font-medium capitalize">{assessment.status.replace(/_/g, " ")}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Total Responses</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{assessment.responses.length}</p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Total MOVs</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {assessment.responses.reduce(
                (total: number, response: any) => total + response.movs.length,
                0
              )}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Feedback Comments</span>
            </div>
            <p className="mt-1 text-2xl font-bold">
              {assessment.responses.reduce(
                (total: number, response: any) => total + response.feedback_comments.length,
                0
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>Created:</strong> {new Date(assessment.created_at).toLocaleDateString()}
          </p>
          <p>
            <strong>Last Updated:</strong> {new Date(assessment.updated_at).toLocaleDateString()}
          </p>
          {assessment.submitted_at && (
            <p>
              <strong>Submitted:</strong> {new Date(assessment.submitted_at).toLocaleDateString()}
            </p>
          )}
          {assessment.validated_at && (
            <p>
              <strong>Validated:</strong> {new Date(assessment.validated_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Assessment Workflow Buttons */}
      <div className="mb-8">
        <AssessmentWorkflowButtons
          assessmentId={assessmentId}
          assessmentStatus={assessment.status}
          responses={assessment.responses}
          onStatusChange={() => refetch()}
        />
      </div>

      {/* Assessment Responses */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Assessment Responses</h2>

        {assessment.responses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Responses Yet</h3>
            <p className="mt-1 text-gray-600">
              This assessment doesn&apos;t have any responses yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assessment.responses.map((response: any) => (
              <AssessmentResponseCard
                key={response.id}
                response={response}
                assessmentId={assessmentId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
