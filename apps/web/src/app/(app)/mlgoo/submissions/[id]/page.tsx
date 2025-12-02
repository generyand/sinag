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
  Lightbulb,
  File,
  ExternalLink,
  Download,
  X,
  Eye,
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
  usePatchMlgooAssessmentsAssessmentIdRecalibrationValidation,
  useGetCapdevAssessmentsAssessmentId,
  usePostCapdevAssessmentsAssessmentIdRegenerate,
  getGetCapdevAssessmentsAssessmentIdQueryKey,
} from "@sinag/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CapDevInsightsCard } from "@/components/features/capdev";

export default function SubmissionDetailsPage() {
  const { isAuthenticated } = useAuthStore();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const assessmentId = parseInt(params.id as string, 10);

  // State for recalibration mode (requesting new recalibration)
  const [isRecalibrationMode, setIsRecalibrationMode] = React.useState(false);
  const [selectedIndicators, setSelectedIndicators] = React.useState<number[]>([]);
  const [recalibrationComments, setRecalibrationComments] = React.useState("");

  // State for review mode (reviewing resubmitted recalibration targets)
  const [isReviewMode, setIsReviewMode] = React.useState(false);
  const [validationUpdates, setValidationUpdates] = React.useState<{
    [indicatorId: number]: { status: string; remarks: string };
  }>({});

  // State for file preview modal
  const [previewFile, setPreviewFile] = React.useState<{
    file_name: string;
    file_url: string;
    file_type: string;
  } | null>(null);

  // Fetch assessment details from API
  const { data, isLoading, isError, error } = useGetMlgooAssessmentsAssessmentId(assessmentId);

  // Approve mutation
  const approveMutation = usePostMlgooAssessmentsAssessmentIdApprove();

  // Recalibration mutation
  const recalibrateMutation = usePostMlgooAssessmentsAssessmentIdRecalibrate();

  // Update recalibration validation mutation
  const updateValidationMutation = usePatchMlgooAssessmentsAssessmentIdRecalibrationValidation();

  // CapDev insights query - only fetch if assessment is completed
  const {
    data: capdevInsights,
    isLoading: isCapdevLoading,
    refetch: refetchCapdev,
  } = useGetCapdevAssessmentsAssessmentId(assessmentId, {
    query: {
      queryKey: getGetCapdevAssessmentsAssessmentIdQueryKey(assessmentId),
      enabled: !!(assessmentId && data && (data as any)?.status === "COMPLETED"),
    },
  });

  // CapDev regeneration mutation
  const regenerateCapdevMutation = usePostCapdevAssessmentsAssessmentIdRegenerate();

  const handleRegenerateCapdev = async () => {
    if (!assessmentId) return;

    toast.loading("Regenerating CapDev insights...", { id: "capdev-regenerate" });

    try {
      await regenerateCapdevMutation.mutateAsync({
        assessmentId,
        params: { force: true },
      });

      toast.dismiss("capdev-regenerate");
      toast.success("CapDev insights regeneration started. Please refresh in a few minutes.", {
        duration: 5000,
      });

      // Refetch after a delay to get updated status
      setTimeout(() => refetchCapdev(), 3000);
    } catch (err: any) {
      toast.dismiss("capdev-regenerate");
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to regenerate";
      toast.error(`Regeneration failed: ${errorMessage}`, { duration: 6000 });
    }
  };

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

  // Initialize review mode with current validation statuses
  const startReviewMode = (recalibrationTargetIndicators: any[]) => {
    const initialUpdates: { [id: number]: { status: string; remarks: string } } = {};
    recalibrationTargetIndicators.forEach((ind) => {
      initialUpdates[ind.indicator_id] = {
        status: ind.validation_status || "FAIL",
        remarks: "",
      };
    });
    setValidationUpdates(initialUpdates);
    setIsReviewMode(true);
  };

  const cancelReviewMode = () => {
    setIsReviewMode(false);
    setValidationUpdates({});
  };

  const updateIndicatorStatus = (indicatorId: number, status: string) => {
    setValidationUpdates((prev) => ({
      ...prev,
      [indicatorId]: { ...prev[indicatorId], status },
    }));
  };

  const updateIndicatorRemarks = (indicatorId: number, remarks: string) => {
    setValidationUpdates((prev) => ({
      ...prev,
      [indicatorId]: { ...prev[indicatorId], remarks },
    }));
  };

  const handleSaveValidationUpdates = async () => {
    if (!assessmentId || Object.keys(validationUpdates).length === 0) return;

    toast.loading("Saving validation updates...", { id: "save-validation-toast" });

    try {
      const indicatorUpdates = Object.entries(validationUpdates).map(([id, update]) => ({
        indicator_id: parseInt(id, 10),
        validation_status: update.status,
        remarks: update.remarks || undefined,
      }));

      await updateValidationMutation.mutateAsync({
        assessmentId,
        data: {
          indicator_updates: indicatorUpdates,
        },
      });

      toast.dismiss("save-validation-toast");
      toast.success("Validation statuses updated successfully!", { duration: 5000 });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries();
      setIsReviewMode(false);
      setValidationUpdates({});
    } catch (err: any) {
      toast.dismiss("save-validation-toast");
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to save validation updates";
      toast.error(`Save failed: ${errorMessage}`, { duration: 6000 });
    }
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
    // Check if it's a 403 forbidden error (user doesn't have MLGOO_DILG role)
    const errorResponse = (error as any)?.response;
    const isForbidden = errorResponse?.status === 403;
    const isUnauthorized = errorResponse?.status === 401;

    const errorTitle = isForbidden
      ? "Access Denied"
      : isUnauthorized
      ? "Authentication Required"
      : "Failed to load assessment";

    const errorMessage = isForbidden
      ? "You need MLGOO/DILG admin privileges to access this page. Please log in with an admin account (e.g., admin@sinag.com)."
      : isUnauthorized
      ? "Please log in to access this page."
      : (error as any)?.message || "Please try again later.";

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
          <Card className={`${isForbidden ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"}`}>
            <CardContent className="pt-6">
              <div className={`flex items-center gap-3 ${isForbidden ? "text-yellow-700" : "text-red-700"}`}>
                <AlertCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">{errorTitle}</p>
                  <p className="text-sm">{errorMessage}</p>
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
  // Note: validation_status from backend is uppercase (PASS, FAIL, CONDITIONAL)
  const failedIndicators: { id: number; name: string; code: string; areaName: string; status: string }[] = [];
  governanceAreas.forEach((ga: any) => {
    (ga.indicators || []).forEach((ind: any) => {
      const statusUpper = ind.validation_status?.toUpperCase();
      if (statusUpper === "FAIL" || statusUpper === "CONDITIONAL") {
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

  // Get recalibration target indicators (for review after BLGU resubmission)
  const recalibrationTargetIds = new Set(assessment.mlgoo_recalibration_indicator_ids || []);
  const recalibrationTargetIndicators: {
    indicator_id: number;
    indicator_name: string;
    indicator_code: string;
    areaName: string;
    validation_status: string;
    mov_files: { id: number; file_name: string; file_url: string; file_type: string; file_size: number }[];
  }[] = [];
  governanceAreas.forEach((ga: any) => {
    (ga.indicators || []).forEach((ind: any) => {
      if (recalibrationTargetIds.has(ind.indicator_id)) {
        recalibrationTargetIndicators.push({
          indicator_id: ind.indicator_id,
          indicator_name: ind.indicator_name,
          indicator_code: ind.indicator_code,
          areaName: ga.name,
          validation_status: ind.validation_status,
          mov_files: ind.mov_files || [],
        });
      }
    });
  });

  // Check if this is a resubmission after recalibration (has recalibration targets but not in active recalibration)
  const hasResubmittedRecalibration = recalibrationTargetIndicators.length > 0 &&
    !assessment.is_mlgoo_recalibration &&
    isAwaitingApproval;

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

              {isAwaitingApproval && !isRecalibrationMode && !isReviewMode && (
                <>
                  {/* Show Review Recalibration button if BLGU has resubmitted after recalibration */}
                  {hasResubmittedRecalibration && (
                    <Button
                      variant="outline"
                      onClick={() => startReviewMode(recalibrationTargetIndicators)}
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Review Recalibration ({recalibrationTargetIndicators.length})
                    </Button>
                  )}
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
                            ind.status?.toUpperCase() === "FAIL"
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

          {/* Review Mode Panel - For reviewing resubmitted recalibration targets */}
          {isReviewMode && (
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <RotateCcw className="h-5 w-5" />
                  Review Recalibration Submissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-purple-700">
                  Review the BLGU&apos;s updated submissions for the recalibration targets.
                  Update the validation status for each indicator, then approve the assessment.
                </p>

                <div className="bg-white rounded-sm border border-purple-200 p-4 space-y-4">
                  <p className="text-sm font-medium text-gray-700">
                    Recalibration Target Indicators ({recalibrationTargetIndicators.length})
                  </p>
                  {recalibrationTargetIndicators.map((ind) => (
                    <div
                      key={ind.indicator_id}
                      className="bg-white rounded-lg border border-purple-200 shadow-sm overflow-hidden"
                    >
                      {/* Header */}
                      <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                                {ind.indicator_code}
                              </span>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded ${
                                  ind.validation_status?.toUpperCase() === "PASS"
                                    ? "bg-green-100 text-green-700"
                                    : ind.validation_status?.toUpperCase() === "FAIL"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                Current: {ind.validation_status}
                              </span>
                            </div>
                            <p className="font-medium text-sm text-gray-900">
                              {ind.indicator_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{ind.areaName}</p>
                          </div>
                          <div className="w-44">
                            <label className="text-xs font-medium text-purple-700 mb-1.5 block">
                              Update Status
                            </label>
                            <Select
                              value={validationUpdates[ind.indicator_id]?.status || ind.validation_status}
                              onValueChange={(value) => updateIndicatorStatus(ind.indicator_id, value)}
                            >
                              <SelectTrigger className="h-10 bg-white border-purple-300 focus:ring-purple-500">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PASS">
                                  <span className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    Pass
                                  </span>
                                </SelectItem>
                                <SelectItem value="CONDITIONAL">
                                  <span className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                    Conditional
                                  </span>
                                </SelectItem>
                                <SelectItem value="FAIL">
                                  <span className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    Fail
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-4 space-y-4">
                        {/* MOV Files Section */}
                        {ind.mov_files && ind.mov_files.length > 0 ? (
                          <div className="bg-green-50 rounded-lg border border-green-200 p-3">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                                NEW
                              </div>
                              <p className="text-sm font-medium text-green-800">
                                {ind.mov_files.length} file{ind.mov_files.length > 1 ? 's' : ''} uploaded after recalibration
                              </p>
                            </div>
                            <div className="space-y-2">
                              {ind.mov_files.map((file: any) => (
                                <div
                                  key={file.id}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-100 hover:border-green-300 transition-colors"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                      <FileText className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
                                      <p className="text-xs text-gray-500">
                                        {Math.round(file.file_size / 1024)} KB
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPreviewFile({
                                      file_name: file.file_name,
                                      file_url: file.file_url,
                                      file_type: file.file_type,
                                    })}
                                    className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Preview
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-amber-800">No new files uploaded</p>
                                <p className="text-xs text-amber-600 mt-0.5">
                                  BLGU has not uploaded new MOV files since recalibration was requested
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Remarks Section */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                            Remarks (optional)
                          </label>
                          <Textarea
                            value={validationUpdates[ind.indicator_id]?.remarks || ""}
                            onChange={(e) => updateIndicatorRemarks(ind.indicator_id, e.target.value)}
                            placeholder="Add remarks explaining your decision..."
                            className="min-h-20 text-sm border-gray-200 focus:border-purple-300 focus:ring-purple-200"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={cancelReviewMode}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveValidationUpdates}
                    disabled={updateValidationMutation.isPending}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {updateValidationMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Save Validation Updates
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
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-sm border border-gray-200"
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
                            indicator.validation_status?.toUpperCase() === "PASS"
                              ? "bg-green-100 text-green-700"
                              : indicator.validation_status?.toUpperCase() === "FAIL"
                              ? "bg-red-100 text-red-700"
                              : indicator.validation_status?.toUpperCase() === "CONDITIONAL"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {indicator.validation_status?.toUpperCase() === "PASS" && <CheckCircle className="h-3 w-3" />}
                          {indicator.validation_status?.toUpperCase() === "FAIL" && <XCircle className="h-3 w-3" />}
                          {indicator.validation_status?.toUpperCase() === "CONDITIONAL" && <AlertCircle className="h-3 w-3" />}
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

          {/* CapDev AI Insights Section - Only for Completed Assessments */}
          {assessment.status === "COMPLETED" && (
            <CapDevInsightsCard
              insights={capdevInsights as any}
              isLoading={isCapdevLoading}
              onRegenerate={handleRegenerateCapdev}
              isRegenerating={regenerateCapdevMutation.isPending}
            />
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-[80vw] h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold">{previewFile.file_name}</h2>
                <p className="text-sm text-muted-foreground">
                  {previewFile.file_type === 'application/pdf' ? 'PDF Document' : 'Image File'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewFile.file_url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open in New Tab
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewFile(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-auto">
              {previewFile.file_type === 'application/pdf' ? (
                <iframe
                  src={previewFile.file_url}
                  className="w-full h-full rounded border border-gray-200"
                  title={previewFile.file_name}
                />
              ) : previewFile.file_type?.startsWith('image/') ? (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={previewFile.file_url}
                    alt={previewFile.file_name}
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <File className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Preview not available for this file type
                  </p>
                  <Button
                    onClick={() => window.open(previewFile.file_url, "_blank")}
                    variant="outline"
                  >
                    Open in New Tab
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
