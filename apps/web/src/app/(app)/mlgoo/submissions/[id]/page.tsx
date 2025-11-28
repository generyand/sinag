"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMlgooAssessmentsAssessmentId,
  usePostMlgooAssessmentsAssessmentIdApprove,
  usePostMlgooAssessmentsAssessmentIdRecalibrate,
} from "@sinag/shared";

export default function SubmissionDetailsPage() {
  const { isAuthenticated } = useAuthStore();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const assessmentId = parseInt(params.id as string, 10);

  // State for recalibration mode
  const [isRecalibrationMode, setIsRecalibrationMode] = React.useState(false);
  const [selectedIndicators, setSelectedIndicators] = React.useState<number[]>([]);
  const [recalibrationComments, setRecalibrationComments] = React.useState("");

  // Fetch assessment details from API
  const { data, isLoading, isError, error } = useGetMlgooAssessmentsAssessmentId(assessmentId);

  // Approve mutation
  const approveMutation = usePostMlgooAssessmentsAssessmentIdApprove();

  // Recalibration mutation
  const recalibrateMutation = usePostMlgooAssessmentsAssessmentIdRecalibrate();

  const handleApprove = async () => {
    if (!assessmentId) return;

    toast.loading("Approving assessment...", { id: "approve-toast" });

    try {
      await approveMutation.mutateAsync({
        assessmentId,
        data: {
          comments: "Assessment approved by MLGOO.",
        },
      });

      toast.dismiss("approve-toast");
      toast.success("Assessment approved successfully! The BLGU has been notified.", {
        duration: 5000,
      });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries();

      // Navigate back to submissions list
      router.push("/mlgoo/submissions");
    } catch (err: any) {
      toast.dismiss("approve-toast");
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to approve assessment";
      toast.error(`Approval failed: ${errorMessage}`, { duration: 6000 });
    }
  };

  const handleRecalibrate = async () => {
    if (!assessmentId || selectedIndicators.length === 0 || !recalibrationComments.trim()) {
      toast.error("Please select at least one indicator and provide comments.");
      return;
    }

    if (recalibrationComments.trim().length < 10) {
      toast.error("Please provide more detailed comments (at least 10 characters).");
      return;
    }

    toast.loading("Requesting recalibration...", { id: "recalibrate-toast" });

    try {
      await recalibrateMutation.mutateAsync({
        assessmentId,
        data: {
          indicator_ids: selectedIndicators,
          comments: recalibrationComments.trim(),
        },
      });

      toast.dismiss("recalibrate-toast");
      toast.success("Recalibration requested! The BLGU has been notified and given a 3-day grace period.", {
        duration: 6000,
      });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries();

      // Navigate back to submissions list
      router.push("/mlgoo/submissions");
    } catch (err: any) {
      toast.dismiss("recalibrate-toast");
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to request recalibration";
      toast.error(`Recalibration request failed: ${errorMessage}`, { duration: 6000 });
    }
  };

  const toggleIndicatorSelection = (indicatorId: number) => {
    setSelectedIndicators((prev) =>
      prev.includes(indicatorId)
        ? prev.filter((id) => id !== indicatorId)
        : [...prev, indicatorId]
    );
  };

  const cancelRecalibrationMode = () => {
    setIsRecalibrationMode(false);
    setSelectedIndicators([]);
    setRecalibrationComments("");
  };

  // Show loading if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading assessment details...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/mlgoo/submissions")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Submissions
          </Button>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-700">
                <AlertCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Failed to load assessment</p>
                  <p className="text-sm">{(error as any)?.message || "Please try again later."}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const assessment = data as any;
  const governanceAreas = assessment.governance_areas || [];
  const isAwaitingApproval = assessment.status === "AWAITING_MLGOO_APPROVAL";
  const canRecalibrate = assessment.can_recalibrate && isAwaitingApproval;

  // Calculate totals
  const totalPass = governanceAreas.reduce((sum: number, ga: any) => sum + (ga.pass_count || 0), 0);
  const totalFail = governanceAreas.reduce((sum: number, ga: any) => sum + (ga.fail_count || 0), 0);
  const totalConditional = governanceAreas.reduce((sum: number, ga: any) => sum + (ga.conditional_count || 0), 0);
  const totalIndicators = totalPass + totalFail + totalConditional;
  const overallScore = assessment.overall_score ?? (totalIndicators > 0 ? Math.round((totalPass / totalIndicators) * 100) : 0);

  // Get all failed/conditional indicators for recalibration selection
  const failedIndicators: { id: number; name: string; code: string; areaName: string; status: string }[] = [];
  governanceAreas.forEach((ga: any) => {
    (ga.indicators || []).forEach((ind: any) => {
      if (ind.validation_status === "Fail" || ind.validation_status === "Conditional") {
        failedIndicators.push({
          id: ind.indicator_id,
          name: ind.indicator_name,
          code: ind.indicator_code,
          areaName: ga.name,
          status: ind.validation_status,
        });
      }
    });
  });

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Back Button */}
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push("/mlgoo/submissions")}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] rounded-sm transition-colors duration-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Submissions
            </Button>
          </div>

          {/* Header with Status and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                {assessment.barangay_name || "Assessment Details"}
              </h1>
              <p className="text-[var(--muted-foreground)] mt-2">
                Cycle Year: {assessment.cycle_year || "N/A"} | Assessment ID: {assessment.id}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium ${
                  isAwaitingApproval
                    ? "bg-yellow-100 text-yellow-800"
                    : assessment.status === "COMPLETED"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {isAwaitingApproval ? (
                  <Clock className="h-4 w-4" />
                ) : assessment.status === "COMPLETED" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {assessment.status?.replace(/_/g, " ") || "Unknown"}
              </span>

              {/* Show recalibration count badge if already recalibrated */}
              {assessment.mlgoo_recalibration_count > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-sm text-xs font-medium bg-purple-100 text-purple-800">
                  <RotateCcw className="h-3 w-3" />
                  Recalibrated {assessment.mlgoo_recalibration_count}x
                </span>
              )}

              {isAwaitingApproval && !isRecalibrationMode && (
                <>
                  {canRecalibrate && failedIndicators.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setIsRecalibrationMode(true)}
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Request Recalibration
                    </Button>
                  )}
                  <Button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {approveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve Assessment
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Recalibration Mode Panel */}
          {isRecalibrationMode && (
            <Card className="bg-orange-50 border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <RotateCcw className="h-5 w-5" />
                  Request Recalibration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-orange-700">
                  Select the indicators you believe were unfairly marked as Fail or Conditional.
                  The BLGU will be given a 3-day grace period to provide additional documentation.
                </p>

                <div className="bg-white rounded-sm border border-orange-200 p-4 max-h-64 overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Failed/Conditional Indicators ({failedIndicators.length})
                  </p>
                  <div className="space-y-2">
                    {failedIndicators.map((ind) => (
                      <label
                        key={ind.id}
                        className="flex items-start gap-3 p-2 rounded hover:bg-orange-50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedIndicators.includes(ind.id)}
                          onCheckedChange={() => toggleIndicatorSelection(ind.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {ind.code} - {ind.name}
                          </p>
                          <p className="text-xs text-gray-500">{ind.areaName}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            ind.status === "Fail"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {ind.status}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    Reason for Recalibration Request *
                  </label>
                  <Textarea
                    value={recalibrationComments}
                    onChange={(e) => setRecalibrationComments(e.target.value)}
                    placeholder="Explain why you believe these indicators should be recalibrated (minimum 10 characters)..."
                    className="min-h-24 border-orange-200 focus:border-orange-400"
                  />
                  <p className="text-xs text-orange-600 mt-1">
                    {recalibrationComments.length}/10 minimum characters
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={cancelRecalibrationMode}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRecalibrate}
                    disabled={
                      recalibrateMutation.isPending ||
                      selectedIndicators.length === 0 ||
                      recalibrationComments.trim().length < 10
                    }
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {recalibrateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Submit Recalibration ({selectedIndicators.length} selected)
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cannot Recalibrate Notice */}
          {isAwaitingApproval && !canRecalibrate && assessment.mlgoo_recalibration_count > 0 && (
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-purple-700">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">
                    Recalibration has already been requested once for this assessment.
                    Each assessment can only be recalibrated once.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white rounded-sm shadow border">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{overallScore}%</p>
                  <p className="text-sm text-gray-500 mt-1">Overall Score</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-sm shadow border">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{totalPass}</p>
                  <p className="text-sm text-gray-500 mt-1">Pass</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-sm shadow border">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">{totalFail}</p>
                  <p className="text-sm text-gray-500 mt-1">Fail</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-sm shadow border">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-600">{totalConditional}</p>
                  <p className="text-sm text-gray-500 mt-1">Conditional</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Governance Areas Breakdown */}
          <Card className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold text-[var(--foreground)]">
                <div
                  className="w-8 h-8 rounded-sm flex items-center justify-center"
                  style={{ backgroundColor: "var(--kpi-blue-from)" }}
                >
                  <FileText className="h-5 w-5" style={{ color: "var(--kpi-blue-text)" }} />
                </div>
                Governance Areas Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {governanceAreas.map((ga: any) => (
                  <div
                    key={ga.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-sm border"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{ga.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {ga.indicators?.length || 0} indicators
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle className="h-4 w-4" />
                          {ga.pass_count || 0}
                        </span>
                        <p className="text-xs text-gray-500">Pass</p>
                      </div>
                      <div className="text-center">
                        <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                          <XCircle className="h-4 w-4" />
                          {ga.fail_count || 0}
                        </span>
                        <p className="text-xs text-gray-500">Fail</p>
                      </div>
                      <div className="text-center">
                        <span className="inline-flex items-center gap-1 text-yellow-600 font-medium">
                          <AlertCircle className="h-4 w-4" />
                          {ga.conditional_count || 0}
                        </span>
                        <p className="text-xs text-gray-500">Conditional</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Indicators Detail (expandable) */}
          {governanceAreas.map((ga: any) => (
            <Card key={`detail-${ga.id}`} className="bg-white rounded-sm shadow border">
              <CardHeader>
                <CardTitle className="text-base font-medium">{ga.name} - Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {(ga.indicators || []).map((indicator: any) => {
                    const isRecalibrationTarget = indicator.is_recalibration_target;
                    return (
                      <div
                        key={indicator.response_id}
                        className={`py-3 flex items-start justify-between ${
                          isRecalibrationTarget ? "bg-purple-50 -mx-6 px-6" : ""
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {indicator.indicator_code} - {indicator.indicator_name}
                            </p>
                            {isRecalibrationTarget && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                <RotateCcw className="h-3 w-3" />
                                Recalibration Target
                              </span>
                            )}
                          </div>
                          {indicator.assessor_remarks && (
                            <p className="text-xs text-gray-500 mt-1">
                              Remarks: {indicator.assessor_remarks}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            indicator.validation_status === "Pass"
                              ? "bg-green-100 text-green-700"
                              : indicator.validation_status === "Fail"
                              ? "bg-red-100 text-red-700"
                              : indicator.validation_status === "Conditional"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {indicator.validation_status === "Pass" && <CheckCircle className="h-3 w-3" />}
                          {indicator.validation_status === "Fail" && <XCircle className="h-3 w-3" />}
                          {indicator.validation_status === "Conditional" && <AlertCircle className="h-3 w-3" />}
                          {indicator.validation_status || "Pending"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Recalibration Info (if applicable) */}
          {assessment.is_mlgoo_recalibration && assessment.mlgoo_recalibration_comments && (
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <RotateCcw className="h-5 w-5" />
                  Recalibration Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-purple-700">MLGOO Comments:</p>
                    <p className="text-sm text-purple-900 mt-1">{assessment.mlgoo_recalibration_comments}</p>
                  </div>
                  {assessment.grace_period_expires_at && (
                    <div>
                      <p className="text-sm font-medium text-purple-700">Grace Period Expires:</p>
                      <p className="text-sm text-purple-900 mt-1">
                        {new Date(assessment.grace_period_expires_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold text-[var(--foreground)]">
                <div
                  className="w-8 h-8 rounded-sm flex items-center justify-center"
                  style={{ backgroundColor: "var(--analytics-success-bg)" }}
                >
                  <Calendar className="h-5 w-5" style={{ color: "var(--analytics-success-text-light)" }} />
                </div>
                Assessment Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assessment.submitted_at && (
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 rounded-full mt-1.5 bg-blue-500"></div>
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">Submitted</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {new Date(assessment.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {assessment.validated_at && (
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 rounded-full mt-1.5 bg-green-500"></div>
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">Validation Completed</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {new Date(assessment.validated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {assessment.status === "COMPLETED" && assessment.updated_at && (
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 rounded-full mt-1.5 bg-green-600"></div>
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">MLGOO Approved</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {new Date(assessment.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
