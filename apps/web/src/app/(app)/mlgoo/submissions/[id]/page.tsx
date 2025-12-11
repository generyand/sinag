"use client";

import Image from "next/image";

const GOVERNANCE_AREA_LOGOS: Record<string, string> = {
  "Financial Administration and Sustainability": "/Assessment_Areas/financialAdmin.png",
  "Disaster Preparedness": "/Assessment_Areas/disasterPreparedness.png",
  "Social Protection and Sensitivity": "/Assessment_Areas/socialProtectAndSensitivity.png",
  "Safety, Peace and Order": "/Assessment_Areas/safetyPeaceAndOrder.png",
  "Environmental Management": "/Assessment_Areas/environmentalManagement.png",
  "Business Friendliness and Competitiveness": "/Assessment_Areas/businessFriendliness.png",
};

import { CapDevInsightsCard } from "@/components/features/capdev";
import { SecureFileViewer } from "@/components/features/movs/FileList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/useAuthStore";
import {
  getGetCapdevAssessmentsAssessmentIdQueryKey,
  useGetCapdevAssessmentsAssessmentId,
  useGetMlgooAssessmentsAssessmentId,
  usePatchMlgooAssessmentsAssessmentIdRecalibrationValidation,
  usePostAssessmentsAssessmentIdCalibrationSummaryRegenerate,
  usePostAssessmentsAssessmentIdReworkSummaryRegenerate,
  usePostAssessmentsIdRegenerateInsights,
  usePostCapdevAssessmentsAssessmentIdRegenerate,
  usePostMlgooAssessmentsAssessmentIdApprove,
  usePostMlgooAssessmentsAssessmentIdRecalibrate,
} from "@sinag/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  LayoutDashboard,
  ListChecks,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

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
    id: number;
    file_name: string;
    file_type: string;
  } | null>(null);

  // Fetch assessment details from API
  const { data, isLoading, isError, error } = useGetMlgooAssessmentsAssessmentId(assessmentId);

  // Track previous CapDev status for notifications
  const prevCapDevStatusRef = React.useRef<string | null>(null);

  // Approve mutation
  const approveMutation = usePostMlgooAssessmentsAssessmentIdApprove();

  // Recalibration mutation
  const recalibrateMutation = usePostMlgooAssessmentsAssessmentIdRecalibrate();

  // Update recalibration validation mutation
  const updateValidationMutation = usePatchMlgooAssessmentsAssessmentIdRecalibrationValidation();

  // CapDev insights query - with polling for status updates
  const {
    data: capdevInsights,
    isLoading: isCapdevLoading,
    refetch: refetchCapdev,
  } = useGetCapdevAssessmentsAssessmentId(assessmentId, {
    query: {
      queryKey: getGetCapdevAssessmentsAssessmentIdQueryKey(assessmentId),
      enabled: !!(assessmentId && data && (data as any)?.status === "COMPLETED"),
      refetchInterval: (query: any) => {
        const status = (query.state.data as any)?.status;
        // Poll every 3 seconds if generating
        return status === "generating" ? 3000 : false;
      },
    },
  });

  // Effect to notify user when generation completes
  React.useEffect(() => {
    const currentStatus = (capdevInsights as any)?.status;
    const prevStatus = prevCapDevStatusRef.current;

    if (prevStatus === "generating" && currentStatus === "completed") {
      toast.success("CapDev insights generated successfully!", {
        id: "capdev-done",
        duration: 5000,
        description: "The AI has finished analyzing the assessment data.",
      });
    }

    if (currentStatus) {
      prevCapDevStatusRef.current = currentStatus;
    }
  }, [capdevInsights]);

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
      toast.info("Regeneration started. We'll notify you when it's ready.", {
        duration: 5000,
        icon: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
      });

      // Refetch immediately to get the "generating" status which triggers polling
      await refetchCapdev();
    } catch (err: any) {
      toast.dismiss("capdev-regenerate");
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to regenerate";
      toast.error(`Regeneration failed: ${errorMessage}`, { duration: 6000 });
    }
  };

  // AI Insights regeneration mutation
  const regenerateInsightsMutation = usePostAssessmentsIdRegenerateInsights();

  const handleRegenerateInsights = async () => {
    if (!assessmentId) return;

    toast.loading("Regenerating AI insights...", { id: "insights-regenerate" });

    try {
      await regenerateInsightsMutation.mutateAsync({
        id: assessmentId,
        params: { force: true },
      });

      toast.dismiss("insights-regenerate");
      toast.success("AI insights regeneration started!", { duration: 5000 });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries();
    } catch (err: any) {
      toast.dismiss("insights-regenerate");
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to regenerate";
      toast.error(`Regeneration failed: ${errorMessage}`, { duration: 6000 });
    }
  };

  // Rework summary regeneration mutation
  const regenerateReworkMutation = usePostAssessmentsAssessmentIdReworkSummaryRegenerate();

  const handleRegenerateReworkSummary = async () => {
    if (!assessmentId) return;

    toast.loading("Regenerating rework summary...", { id: "rework-regenerate" });

    try {
      await regenerateReworkMutation.mutateAsync({
        assessmentId,
        params: { force: true },
      });

      toast.dismiss("rework-regenerate");
      toast.success("Rework summary regeneration started!", { duration: 5000 });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries();
    } catch (err: any) {
      toast.dismiss("rework-regenerate");
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to regenerate";
      toast.error(`Regeneration failed: ${errorMessage}`, { duration: 6000 });
    }
  };

  // Calibration summary regeneration mutation
  const regenerateCalibrationMutation = usePostAssessmentsAssessmentIdCalibrationSummaryRegenerate();

  const handleRegenerateCalibrationSummary = async (governanceAreaId: number) => {
    if (!assessmentId) return;

    toast.loading("Regenerating calibration summary...", { id: "calibration-regenerate" });

    try {
      await regenerateCalibrationMutation.mutateAsync({
        assessmentId,
        params: { governance_area_id: governanceAreaId, force: true },
      });

      toast.dismiss("calibration-regenerate");
      toast.success("Calibration summary regeneration started!", { duration: 5000 });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries();
    } catch (err: any) {
      toast.dismiss("calibration-regenerate");
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
      const errorMessage =
        err?.response?.data?.detail || err?.message || "Failed to approve assessment";
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
      toast.success(
        "Recalibration requested! The BLGU has been notified and given a 3-day grace period.",
        {
          duration: 6000,
        }
      );

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries();

      // Navigate back to submissions list
      router.push("/mlgoo/submissions");
    } catch (err: any) {
      toast.dismiss("recalibrate-toast");
      const errorMessage =
        err?.response?.data?.detail || err?.message || "Failed to request recalibration";
      toast.error(`Recalibration request failed: ${errorMessage}`, { duration: 6000 });
    }
  };

  const toggleIndicatorSelection = (indicatorId: number) => {
    setSelectedIndicators((prev) =>
      prev.includes(indicatorId) ? prev.filter((id) => id !== indicatorId) : [...prev, indicatorId]
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
      const errorMessage =
        err?.response?.data?.detail || err?.message || "Failed to save validation updates";
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
          <Card
            className={`${isForbidden ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"}`}
          >
            <CardContent className="pt-6">
              <div
                className={`flex items-center gap-3 ${isForbidden ? "text-yellow-700" : "text-red-700"}`}
              >
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
  const totalConditional = governanceAreas.reduce(
    (sum: number, ga: any) => sum + (ga.conditional_count || 0),
    0
  );
  const totalIndicators = totalPass + totalFail + totalConditional;
  const overallScore =
    assessment.overall_score ??
    (totalIndicators > 0 ? Math.round((totalPass / totalIndicators) * 100) : 0);

  // Get all failed/conditional indicators for recalibration selection
  // Note: validation_status from backend is uppercase (PASS, FAIL, CONDITIONAL)
  const failedIndicators: {
    id: number;
    name: string;
    code: string;
    areaName: string;
    status: string;
  }[] = [];
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
    mov_files: {
      id: number;
      file_name: string;
      file_url: string;
      file_type: string;
      file_size: number;
    }[];
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
  const hasResubmittedRecalibration =
    recalibrationTargetIndicators.length > 0 &&
    !assessment.is_mlgoo_recalibration &&
    isAwaitingApproval;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
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
                  Select the indicators you believe were unfairly marked as Fail or Conditional. The
                  BLGU will be given a 3-day grace period to provide additional documentation.
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
                  <label
                    htmlFor="recalibration-reason"
                    className="block text-sm font-medium text-orange-800 mb-2"
                  >
                    Reason for Recalibration Request *
                  </label>
                  <Textarea
                    id="recalibration-reason"
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
                  <Button variant="outline" onClick={cancelRecalibrationMode} className="flex-1">
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
                  Review the BLGU&apos;s updated submissions for the recalibration targets. Update
                  the validation status for each indicator, then approve the assessment.
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
                            <label
                              id={`status-label-${ind.indicator_id}`}
                              className="text-xs font-medium text-purple-700 mb-1.5 block"
                            >
                              Update Status
                            </label>
                            <Select
                              value={
                                validationUpdates[ind.indicator_id]?.status || ind.validation_status
                              }
                              onValueChange={(value) =>
                                updateIndicatorStatus(ind.indicator_id, value)
                              }
                            >
                              <SelectTrigger
                                className="h-10 bg-white border-purple-300 focus:ring-purple-500"
                                aria-labelledby={`status-label-${ind.indicator_id}`}
                              >
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
                                {ind.mov_files.length} file{ind.mov_files.length > 1 ? "s" : ""}{" "}
                                uploaded after recalibration
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
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {file.file_name}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {Math.round(file.file_size / 1024)} KB
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setPreviewFile({
                                        id: file.id,
                                        file_name: file.file_name,
                                        file_type: file.file_type,
                                      })
                                    }
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
                                <p className="text-sm font-medium text-amber-800">
                                  No new files uploaded
                                </p>
                                <p className="text-xs text-amber-600 mt-0.5">
                                  BLGU has not uploaded new MOV files since recalibration was
                                  requested
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Remarks Section */}
                        <div>
                          <label
                            htmlFor={`remarks-${ind.indicator_id}`}
                            className="text-sm font-medium text-gray-700 mb-1.5 block"
                          >
                            Remarks (optional)
                          </label>
                          <Textarea
                            id={`remarks-${ind.indicator_id}`}
                            value={validationUpdates[ind.indicator_id]?.remarks || ""}
                            onChange={(e) =>
                              updateIndicatorRemarks(ind.indicator_id, e.target.value)
                            }
                            placeholder="Add remarks explaining your decision..."
                            className="min-h-20 text-sm border-gray-200 focus:border-purple-300 focus:ring-purple-200"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={cancelReviewMode} className="flex-1">
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
                    Recalibration has already been requested once for this assessment. Each
                    assessment can only be recalibrated once.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="overview" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="grid w-full max-w-2xl grid-cols-1 sm:grid-cols-2 h-auto p-1.5 bg-gray-100/80 rounded-3xl sm:rounded-full border border-gray-200/50 gap-2 sm:gap-0">
                <TabsTrigger
                  value="overview"
                  className="flex items-center justify-center gap-2.5 rounded-2xl sm:rounded-full py-3 text-sm font-medium transition-all duration-300 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:text-orange-600 data-[state=active]:hover:text-white"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Executive Overview
                </TabsTrigger>
                <TabsTrigger
                  value="detailed"
                  className="flex items-center justify-center gap-2.5 rounded-2xl sm:rounded-full py-3 text-sm font-medium transition-all duration-300 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:text-orange-600 data-[state=active]:hover:text-white"
                >
                  <ListChecks className="h-4 w-4" />
                  Detailed Assessment
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6">
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

              {/* CapDev AI Insights Section - Only for Completed Assessments */}
              {assessment.status === "COMPLETED" && (
                <CapDevInsightsCard
                  insights={capdevInsights as any}
                  isLoading={isCapdevLoading}
                  onRegenerate={handleRegenerateCapdev}
                  isRegenerating={regenerateCapdevMutation.isPending}
                />
              )}

              {/* AI Summary Management Section - For MLGOO Admins */}
              {(assessment.rework_count > 0 ||
                assessment.calibration_count > 0 ||
                assessment.ai_recommendations) && (
                <Card className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg font-semibold text-[var(--foreground)]">
                      <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-purple-100">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                      </div>
                      AI Summary Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Regenerate AI-generated summaries and insights for this assessment.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* General AI Insights Regenerate */}
                      {assessment.ai_recommendations && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-blue-800">AI Insights</h4>
                              <p className="text-xs text-blue-600 mt-1">
                                General assessment recommendations
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRegenerateInsights}
                              disabled={regenerateInsightsMutation.isPending}
                              className="border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                              {regenerateInsightsMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              <span className="ml-2">Regenerate</span>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Rework Summary Regenerate */}
                      {assessment.rework_count > 0 && (
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-orange-800">Rework Summary</h4>
                              <p className="text-xs text-orange-600 mt-1">
                                {assessment.rework_count} rework
                                {assessment.rework_count > 1 ? "s" : ""} recorded
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRegenerateReworkSummary}
                              disabled={regenerateReworkMutation.isPending}
                              className="border-orange-300 text-orange-700 hover:bg-orange-100"
                            >
                              {regenerateReworkMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              <span className="ml-2">Regenerate</span>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Calibration Summary Regenerate - Per Governance Area */}
                      {assessment.calibration_count > 0 &&
                        governanceAreas
                          .filter(
                            (ga: any) => ga.calibration_count > 0 || ga.has_calibration_summary
                          )
                          .map((ga: any) => (
                            <div
                              key={`calib-${ga.id}`}
                              className="p-4 bg-purple-50 rounded-lg border border-purple-200"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-purple-800">Calibration Summary</h4>
                                  <p className="text-xs text-purple-600 mt-1 truncate" title={ga.name}>
                                    {ga.name}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRegenerateCalibrationSummary(ga.id)}
                                  disabled={regenerateCalibrationMutation.isPending}
                                  className="border-purple-300 text-purple-700 hover:bg-purple-100"
                                >
                                  {regenerateCalibrationMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                  <span className="ml-2">Regenerate</span>
                                </Button>
                              </div>
                            </div>
                          ))}
                    </div>
                  </CardContent>
                </Card>
              )}

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
                        className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-gray-50 rounded-sm border border-gray-200 gap-4 md:gap-0"
                      >
                        <div className="flex-1 w-full md:w-auto">
                          <h4 className="font-medium text-gray-900">{ga.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {ga.indicators?.length || 0} indicators
                          </p>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-gray-200/50 pt-3 md:pt-0">
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

              {/* Timeline */}
              <Card className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-[var(--foreground)]">
                    <div
                      className="w-8 h-8 rounded-sm flex items-center justify-center"
                      style={{ backgroundColor: "var(--analytics-success-bg)" }}
                    >
                      <Calendar
                        className="h-5 w-5"
                        style={{ color: "var(--analytics-success-text-light)" }}
                      />
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
                          <p className="font-semibold text-[var(--foreground)]">
                            Validation Completed
                          </p>
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
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6">
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
                        <p className="text-sm text-purple-900 mt-1">
                          {assessment.mlgoo_recalibration_comments}
                        </p>
                      </div>
                      {assessment.grace_period_expires_at && (
                        <div>
                          <p className="text-sm font-medium text-purple-700">
                            Grace Period Expires:
                          </p>
                          <p className="text-sm text-purple-900 mt-1">
                            {new Date(assessment.grace_period_expires_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Indicators Detail (expandable) */}
              {governanceAreas.map((ga: any) => {
                const logoSrc = GOVERNANCE_AREA_LOGOS[ga.name] || "/logo/logo.webp"; // Fallback to main logo
                return (
                  <Card
                    key={`detail-${ga.id}`}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 transition-all duration-300 hover:shadow-md py-0 gap-0"
                  >
                    <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50/30 border-b border-amber-100/50 p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-amber-100 p-1">
                          <Image
                            src={logoSrc}
                            alt={ga.name}
                            width={48}
                            height={48}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-gray-800">
                            {ga.name}
                          </CardTitle>
                          <p className="text-sm text-gray-500 font-medium mt-0.5">
                            Performance Indicators
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-100">
                        {(ga.indicators || []).map((indicator: any) => {
                          const isRecalibrationTarget = indicator.is_recalibration_target;
                          const status = indicator.validation_status?.toUpperCase();
                          return (
                            <div
                              key={indicator.response_id}
                              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors ${
                                isRecalibrationTarget ? "bg-purple-50/30" : ""
                              }`}
                            >
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start gap-3">
                                  <span className="shrink-0 px-2 py-1 rounded-md bg-gray-100 text-gray-600 font-mono text-xs font-bold border border-gray-200">
                                    {indicator.indicator_code}
                                  </span>
                                  <div>
                                    <p className="font-medium text-gray-900 leading-snug">
                                      {indicator.indicator_name}
                                    </p>
                                    {isRecalibrationTarget && (
                                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200">
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Recalibration Target
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {indicator.assessor_remarks && (
                                  <div className="ml-12 mt-1 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100 italic">
                                    <span className="font-semibold text-gray-700 not-italic mr-1">
                                      Remarks:
                                    </span>
                                    {indicator.assessor_remarks}
                                  </div>
                                )}
                              </div>

                              <div className="ml-12 sm:ml-0 shrink-0">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm border ${
                                    status === "PASS"
                                      ? "bg-green-100 text-green-700 border-green-200"
                                      : status === "FAIL"
                                        ? "bg-red-100 text-red-700 border-red-200"
                                        : status === "CONDITIONAL"
                                          ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                          : "bg-gray-100 text-gray-700 border-gray-200"
                                  }`}
                                >
                                  {status === "PASS" && <CheckCircle className="h-3.5 w-3.5" />}
                                  {status === "FAIL" && <XCircle className="h-3.5 w-3.5" />}
                                  {status === "CONDITIONAL" && (
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                  )}
                                  {status || "PENDING"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
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
                  {previewFile.file_type === "application/pdf" ? "PDF Document" : "Image File"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPreviewFile(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content - Use SecureFileViewer for secure file access */}
            <div className="flex-1 overflow-auto bg-white">
              <SecureFileViewer
                file={{
                  id: previewFile.id,
                  file_name: previewFile.file_name,
                  file_type: previewFile.file_type,
                  file_size: 0,
                  file_url: "",
                  assessment_id: assessmentId,
                  indicator_id: 0,
                  uploaded_by: 0,
                  uploaded_at: null,
                }}
                annotations={[]}
                annotateEnabled={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
