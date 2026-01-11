"use client";

import { formatIndicatorName } from "@/lib/utils/text-formatter";
import Image from "next/image";

const GOVERNANCE_AREA_LOGOS: Record<string, string> = {
  "Financial Administration and Sustainability": "/Assessment_Areas/financialAdmin.webp",
  "Disaster Preparedness": "/Assessment_Areas/disasterPreparedness.webp",
  "Social Protection and Sensitivity": "/Assessment_Areas/socialProtectAndSensitivity.webp",
  "Safety, Peace and Order": "/Assessment_Areas/safetyPeaceAndOrder.webp",
  "Environmental Management": "/Assessment_Areas/environmentalManagement.webp",
  "Business Friendliness and Competitiveness": "/Assessment_Areas/businessFriendliness.webp",
  "Business-Friendliness and Competitiveness": "/Assessment_Areas/businessFriendliness.webp",
};

// Type for MOV file with new/rejected flags
type MovFile = {
  id: number;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  is_new?: boolean;
  is_rejected?: boolean;
  has_annotations?: boolean;
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
  useGetAssessmentsList,
  useGetCapdevAssessmentsAssessmentId,
  useGetMlgooAssessmentsAssessmentId,
  usePatchMlgooAssessmentResponsesResponseIdOverrideStatus,
  usePatchMlgooAssessmentsAssessmentIdRecalibrationValidation,
  usePostCapdevAssessmentsAssessmentIdRegenerate,
  usePostMlgooAssessmentsAssessmentIdApprove,
  usePostMlgooAssessmentsAssessmentIdRecalibrateByMov,
} from "@sinag/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Eye,
  FileCheck,
  FileText,
  LayoutDashboard,
  ListChecks,
  Loader2,
  RotateCcw,
  TrendingUp,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

// Reusable Verdict Result Card component for showing SGLGB pass/fail status
function VerdictResultCard({ isPassed }: { isPassed: boolean }) {
  return (
    <Card
      className={`rounded-sm shadow-lg border overflow-hidden ${
        isPassed
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
          : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
      }`}
    >
      <CardContent className="py-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${
              isPassed ? "bg-green-500" : "bg-amber-400"
            }`}
          >
            {isPassed ? (
              <Award className="w-8 h-8 text-white" />
            ) : (
              <TrendingUp className="w-8 h-8 text-white" />
            )}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h3 className={`text-xl font-bold ${isPassed ? "text-green-800" : "text-amber-800"}`}>
              {isPassed ? "SGLGB Achieved" : "SGLGB Not Yet Achieved"}
            </h3>
            <p className={`text-sm mt-1 ${isPassed ? "text-green-700" : "text-amber-700"}`}>
              {isPassed
                ? "This barangay has successfully met the requirements for the Seal of Good Local Governance for Barangays."
                : "This barangay did not meet all requirements this cycle. Review the detailed results below."}
            </p>
          </div>
          <div className="flex-shrink-0">
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                isPassed
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}
            >
              {isPassed ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {isPassed ? "PASSED" : "FAILED"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Completion Progress Card for DRAFT assessments
// Shows indicator completion based on is_completed flag (form filled + required MOVs)
// This aligns with the geographic map's completion calculation
function CompletionProgressCard({
  completedIndicators,
  totalIndicators,
  totalMovFiles,
}: {
  completedIndicators: number;
  totalIndicators: number;
  totalMovFiles: number;
}) {
  const percentage =
    totalIndicators > 0 ? Math.round((completedIndicators / totalIndicators) * 100) : 0;

  // Determine color based on percentage
  const getProgressColor = () => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-amber-500";
    if (percentage >= 25) return "bg-orange-500";
    return "bg-gray-400";
  };

  const getTextColor = () => {
    if (percentage >= 80) return "text-green-700";
    if (percentage >= 50) return "text-amber-700";
    if (percentage >= 25) return "text-orange-700";
    return "text-gray-600";
  };

  const getBgColor = () => {
    if (percentage >= 80) return "bg-green-50 border-green-200";
    if (percentage >= 50) return "bg-amber-50 border-amber-200";
    if (percentage >= 25) return "bg-orange-50 border-orange-200";
    return "bg-gray-50 border-gray-200";
  };

  const getStatusMessage = () => {
    if (percentage === 100) return "All indicators complete";
    if (percentage >= 80) return "Almost complete - just a few more to go";
    if (percentage >= 50) return "Good progress - over halfway there";
    if (percentage >= 25) return "Getting started - keep going";
    if (percentage > 0) return "Early stage - many indicators need completion";
    return "No indicators completed yet";
  };

  return (
    <Card className={`rounded-sm border shadow-sm ${getBgColor()}`}>
      <CardContent className="py-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Left: Icon and Title */}
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                percentage >= 80
                  ? "bg-green-100"
                  : percentage >= 50
                    ? "bg-amber-100"
                    : percentage >= 25
                      ? "bg-orange-100"
                      : "bg-gray-100"
              }`}
            >
              <Upload className={`w-6 h-6 ${getTextColor()}`} />
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${getTextColor()}`}>Indicator Completion</h3>
              <p className="text-xs text-gray-500">{getStatusMessage()}</p>
            </div>
          </div>

          {/* Center: Progress Bar */}
          <div className="flex-1 lg:max-w-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-600">
                {completedIndicators} of {totalIndicators} indicators
              </span>
              <span className={`text-sm font-bold ${getTextColor()}`}>{percentage}%</span>
            </div>
            <div
              className="relative w-full h-2.5 bg-gray-200 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Indicator completion: ${percentage}% complete, ${completedIndicators} of ${totalIndicators} indicators`}
            >
              <div
                className={`absolute inset-y-0 left-0 ${getProgressColor()} rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Right: Stats */}
          <div className="flex items-center gap-6 lg:pl-4 lg:border-l border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{completedIndicators}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{totalMovFiles}</p>
                <p className="text-xs text-gray-500">Total Files</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SubmissionDetailsPage() {
  const { isAuthenticated } = useAuthStore();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const assessmentId = parseInt(params.id as string, 10);

  // State for recalibration mode (requesting new recalibration)
  const [isRecalibrationMode, setIsRecalibrationMode] = React.useState(false);
  const [selectedMovFiles, setSelectedMovFiles] = React.useState<number[]>([]);
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

  // State for expanded indicators in recalibration mode (to show MOV files)
  const [expandedIndicators, setExpandedIndicators] = React.useState<Set<number>>(new Set());

  // Fetch assessment details from API
  const { data, isLoading, isError, error } = useGetMlgooAssessmentsAssessmentId(assessmentId);

  // Fetch all submissions for prev/next navigation
  const { data: allSubmissions } = useGetAssessmentsList({});

  // Compute previous and next submission IDs
  const { prevSubmissionId, nextSubmissionId, currentIndex, totalSubmissions } =
    React.useMemo(() => {
      if (!allSubmissions || !Array.isArray(allSubmissions)) {
        return {
          prevSubmissionId: null,
          nextSubmissionId: null,
          currentIndex: -1,
          totalSubmissions: 0,
        };
      }

      const sortedSubmissions = [...allSubmissions].sort((a: any, b: any) => {
        // Sort by barangay name alphabetically for consistent navigation
        const nameA = a.barangay_name || "";
        const nameB = b.barangay_name || "";
        return nameA.localeCompare(nameB);
      });

      const currentIdx = sortedSubmissions.findIndex((s: any) => s.id === assessmentId);

      return {
        prevSubmissionId: currentIdx > 0 ? sortedSubmissions[currentIdx - 1].id : null,
        nextSubmissionId:
          currentIdx < sortedSubmissions.length - 1 ? sortedSubmissions[currentIdx + 1].id : null,
        currentIndex: currentIdx,
        totalSubmissions: sortedSubmissions.length,
      };
    }, [allSubmissions, assessmentId]);

  // Track previous CapDev status for notifications
  const prevCapDevStatusRef = React.useRef<string | null>(null);

  // Approve mutation
  const approveMutation = usePostMlgooAssessmentsAssessmentIdApprove();

  // Recalibration mutation (MOV file level)
  const recalibrateMutation = usePostMlgooAssessmentsAssessmentIdRecalibrateByMov();

  // Update recalibration validation mutation
  const updateValidationMutation = usePatchMlgooAssessmentsAssessmentIdRecalibrationValidation();

  // Override validation status mutation (for any indicator)
  const overrideStatusMutation = usePatchMlgooAssessmentResponsesResponseIdOverrideStatus();

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
    if (!assessmentId || selectedMovFiles.length === 0 || !recalibrationComments.trim()) {
      toast.error("Please select at least one MOV file and provide comments.");
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
          mov_files: selectedMovFiles.map((id) => ({ mov_file_id: id })),
          overall_comments: recalibrationComments.trim(),
        },
      });

      toast.dismiss("recalibrate-toast");
      toast.success(
        "Recalibration requested! The BLGU has been notified and given a 3-day grace period to resubmit the flagged files.",
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

  const toggleMovFileSelection = (movFileId: number) => {
    setSelectedMovFiles((prev) =>
      prev.includes(movFileId) ? prev.filter((id) => id !== movFileId) : [...prev, movFileId]
    );
  };

  const cancelRecalibrationMode = () => {
    setIsRecalibrationMode(false);
    setSelectedMovFiles([]);
    setRecalibrationComments("");
    setExpandedIndicators(new Set());
  };

  const toggleIndicatorExpanded = (indicatorId: number) => {
    setExpandedIndicators((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(indicatorId)) {
        newSet.delete(indicatorId);
      } else {
        newSet.add(indicatorId);
      }
      return newSet;
    });
  };

  // Handle override validation status
  const handleOverrideStatus = async (
    responseId: number,
    newStatus: "PASS" | "FAIL" | "CONDITIONAL"
  ) => {
    toast.loading("Updating validation status...", { id: `override-${responseId}` });

    try {
      await overrideStatusMutation.mutateAsync({
        responseId,
        data: {
          validation_status: newStatus,
        },
      });

      toast.dismiss(`override-${responseId}`);
      toast.success(`Status updated to ${newStatus}`, { duration: 3000 });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries();
    } catch (err: any) {
      toast.dismiss(`override-${responseId}`);
      const errorMessage = err?.response?.data?.detail || err?.message || "Failed to update status";
      toast.error(`Update failed: ${errorMessage}`, { duration: 5000 });
    }
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
  const isCompleted = assessment.status === "COMPLETED";
  const complianceStatus = assessment.compliance_status; // "PASSED" or "FAILED"
  const isPassed = complianceStatus === "PASSED";

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

  // Calculate indicator completion progress (for DRAFT assessments)
  // Uses is_completed flag which checks: form filled + required MOVs uploaded
  // This aligns with the geographic map's completion calculation
  const isDraft = assessment.status === "DRAFT";
  let completedIndicators = 0;
  let totalMovFiles = 0;
  let allIndicatorsCount = 0;

  for (const ga of governanceAreas) {
    for (const ind of ga.indicators || []) {
      allIndicatorsCount++;
      const movCount = (ind.mov_files || []).length;
      totalMovFiles += movCount;
      if (ind.is_completed) {
        completedIndicators++;
      }
    }
  }

  // Get all failed/conditional indicators for recalibration selection
  // Note: validation_status from backend is uppercase (PASS, FAIL, CONDITIONAL)
  const failedIndicators: {
    id: number;
    name: string;
    code: string;
    areaName: string;
    status: string;
    mov_files: MovFile[];
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
          mov_files: ind.mov_files || [],
        });
      }
    });
  });

  // Get recalibration target indicators (for review after BLGU resubmission)
  const recalibrationTargetIds = new Set(assessment.mlgoo_recalibration_indicator_ids || []);

  // Get MLGOO flagged file IDs for identifying previously flagged files
  const mlgooFlaggedFileIds = new Set(
    (assessment.mlgoo_recalibration_mov_file_ids || []).map((item: any) => item.mov_file_id)
  );
  // Get comments for flagged files
  const mlgooFlaggedFileComments = new Map<number, string>(
    (assessment.mlgoo_recalibration_mov_file_ids || []).map((item: any) => [
      item.mov_file_id,
      item.comment,
    ])
  );

  const recalibrationTargetIndicators: {
    indicator_id: number;
    indicator_name: string;
    indicator_code: string;
    areaName: string;
    validation_status: string;
    mov_files: MovFile[];
    newFiles: MovFile[];
    existingFiles: MovFile[];
    rejectedFiles: MovFile[];
    mlgooFlaggedFiles: (MovFile & { mlgoo_comment?: string })[];
  }[] = [];
  governanceAreas.forEach((ga: any) => {
    (ga.indicators || []).forEach((ind: any) => {
      if (recalibrationTargetIds.has(ind.indicator_id)) {
        const allFiles: MovFile[] = ind.mov_files || [];

        // Separate files into categories
        // For MLGOO recalibration, flagged files should be in a special category
        const mlgooFlaggedFiles = allFiles
          .filter((f: MovFile) => mlgooFlaggedFileIds.has(f.id))
          .map((f: MovFile) => ({
            ...f,
            mlgoo_comment: mlgooFlaggedFileComments.get(f.id) || undefined,
          }));

        // New files are those uploaded after MLGOO recalibration request
        // Use is_new flag from backend, OR if no flagged files data, use is_new directly
        const newFiles = allFiles.filter(
          (f: MovFile) => f.is_new === true && !mlgooFlaggedFileIds.has(f.id)
        );

        // Rejected files (from assessor/validator annotations)
        const rejectedFiles = allFiles.filter(
          (f: MovFile) => f.is_rejected === true && !mlgooFlaggedFileIds.has(f.id)
        );

        // Existing files that are NOT new, NOT rejected, and NOT MLGOO-flagged
        const existingFiles = allFiles.filter(
          (f: MovFile) =>
            f.is_new !== true && f.is_rejected !== true && !mlgooFlaggedFileIds.has(f.id)
        );

        recalibrationTargetIndicators.push({
          indicator_id: ind.indicator_id,
          indicator_name: ind.indicator_name,
          indicator_code: ind.indicator_code,
          areaName: ga.name,
          validation_status: ind.validation_status,
          mov_files: allFiles,
          newFiles,
          existingFiles,
          rejectedFiles,
          mlgooFlaggedFiles,
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
          {/* Navigation Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => router.push("/mlgoo/submissions")}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] rounded-sm transition-colors duration-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden xs:inline">Back to</span> Submissions
            </Button>

            {/* Prev/Next Navigation */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {totalSubmissions > 0 && (
                <span className="text-sm text-[var(--muted-foreground)] mr-0 sm:mr-2">
                  {currentIndex + 1} of {totalSubmissions}
                </span>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    prevSubmissionId && router.push(`/mlgoo/submissions/${prevSubmissionId}`)
                  }
                  disabled={!prevSubmissionId}
                  className="rounded-sm border-[var(--border)] hover:bg-[var(--hover)] disabled:opacity-50"
                  title="Previous submission"
                >
                  <ChevronLeft className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    nextSubmissionId && router.push(`/mlgoo/submissions/${nextSubmissionId}`)
                  }
                  disabled={!nextSubmissionId}
                  className="rounded-sm border-[var(--border)] hover:bg-[var(--hover)] disabled:opacity-50"
                  title="Next submission"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </div>
            </div>
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

          {/* Completion Progress Card - Only for DRAFT assessments */}
          {isDraft && (
            <CompletionProgressCard
              completedIndicators={completedIndicators}
              totalIndicators={allIndicatorsCount}
              totalMovFiles={totalMovFiles}
            />
          )}

          {/* Recalibration Mode Panel - MOV File Level Selection */}
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
                  Select the specific MOV files that need to be resubmitted. The BLGU will be given
                  a 3-day grace period to provide replacement documentation for only the selected
                  files.
                </p>

                <div className="bg-white rounded-sm border border-orange-200 p-4 max-h-[500px] overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Failed/Conditional Indicators ({failedIndicators.length})
                  </p>
                  <div className="space-y-3">
                    {failedIndicators.map((ind) => (
                      <div
                        key={ind.id}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        {/* Indicator header (non-selectable, just for grouping) */}
                        <div
                          className="flex items-start gap-3 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                          onClick={() => toggleIndicatorExpanded(ind.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {ind.code} - {formatIndicatorName(ind.name, assessment.cycle_year)}
                            </p>
                            <p className="text-xs text-gray-500">{ind.areaName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                ind.status?.toUpperCase() === "FAIL"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {ind.status}
                            </span>
                            {ind.mov_files.length > 0 ? (
                              <div className="flex items-center text-gray-500">
                                <FileText className="h-4 w-4 mr-1" />
                                <span className="text-xs">{ind.mov_files.length}</span>
                                {expandedIndicators.has(ind.id) ? (
                                  <ChevronUp className="h-4 w-4 ml-1" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 ml-1" />
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                No MOV
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expandable MOV files section with checkboxes */}
                        {expandedIndicators.has(ind.id) && ind.mov_files.length > 0 && (
                          <div className="p-3 bg-white border-t border-gray-200 space-y-2">
                            <p className="text-xs font-medium text-gray-600 mb-2">
                              Select files to flag for resubmission:
                            </p>
                            {ind.mov_files.map((file: MovFile) => (
                              <div
                                key={file.id}
                                className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                                  selectedMovFiles.includes(file.id)
                                    ? "bg-orange-50 border-orange-300"
                                    : "bg-slate-50 border-slate-100 hover:border-slate-200"
                                }`}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <Checkbox
                                    checked={selectedMovFiles.includes(file.id)}
                                    onCheckedChange={() => toggleMovFileSelection(file.id)}
                                  />
                                  <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center flex-shrink-0">
                                    <FileText className="h-4 w-4 text-slate-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-gray-900 truncate">
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
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setPreviewFile({
                                      id: file.id,
                                      file_name: file.file_name,
                                      file_type: file.file_type,
                                    });
                                  }}
                                  className="h-7 px-2 text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedMovFiles.length > 0 && (
                  <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-orange-800">
                      {selectedMovFiles.length} file(s) selected for recalibration
                    </p>
                  </div>
                )}

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
                    placeholder="Explain why these files need to be resubmitted (minimum 10 characters)..."
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
                      selectedMovFiles.length === 0 ||
                      recalibrationComments.trim().length < 10
                    }
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {recalibrateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Submit Recalibration ({selectedMovFiles.length} file
                        {selectedMovFiles.length !== 1 ? "s" : ""})
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
                              {formatIndicatorName(ind.indicator_name, assessment.cycle_year)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{ind.areaName}</p>
                          </div>
                          <div className="w-44">
                            <span
                              id={`status-label-${ind.indicator_id}`}
                              className="text-xs font-medium text-purple-700 mb-1.5 block"
                            >
                              Update Status
                            </span>
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
                        {/* MOV Files Sections */}
                        <div className="space-y-3">
                          {/* New Files Section (Green) */}
                          {ind.newFiles && ind.newFiles.length > 0 && (
                            <div className="bg-green-50 rounded-lg border border-green-200 p-3">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                                  NEW
                                </div>
                                <p className="text-sm font-medium text-green-800">
                                  {ind.newFiles.length} file{ind.newFiles.length > 1 ? "s" : ""}{" "}
                                  uploaded after recalibration
                                </p>
                              </div>
                              <div className="space-y-2">
                                {ind.newFiles.map((file: MovFile) => (
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
                          )}

                          {/* MLGOO-Flagged Files Section (Orange/Red - shows what was flagged for recalibration) */}
                          {ind.mlgooFlaggedFiles && ind.mlgooFlaggedFiles.length > 0 && (
                            <div className="bg-orange-50 rounded-lg border-2 border-orange-300 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                                  PREVIOUSLY FLAGGED
                                </div>
                                <p className="text-sm font-medium text-orange-800">
                                  {ind.mlgooFlaggedFiles.length} file
                                  {ind.mlgooFlaggedFiles.length > 1 ? "s" : ""} you flagged for
                                  recalibration
                                </p>
                              </div>
                              <p className="text-xs text-orange-600 mb-3">
                                These are the files you marked for BLGU to replace. Compare with the
                                NEW uploads above.
                              </p>
                              <div className="space-y-2">
                                {ind.mlgooFlaggedFiles.map(
                                  (file: MovFile & { mlgoo_comment?: string }) => (
                                    <div
                                      key={file.id}
                                      className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-400 transition-colors"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                                            <FileText className="h-5 w-5 text-orange-600" />
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
                                          className="border-orange-300 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                                        >
                                          <Eye className="h-4 w-4 mr-1" />
                                          Preview
                                        </Button>
                                      </div>
                                      {file.mlgoo_comment && (
                                        <div className="ml-13 pl-3 border-l-2 border-orange-200">
                                          <p className="text-xs text-orange-700 italic">
                                            Your comment: &quot;{file.mlgoo_comment}&quot;
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* Existing Files Section (Neutral) */}
                          {ind.existingFiles && ind.existingFiles.length > 0 && (
                            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                              <div className="flex items-center gap-2 mb-3">
                                <p className="text-sm font-medium text-slate-700">
                                  Existing Files ({ind.existingFiles.length})
                                </p>
                              </div>
                              <div className="space-y-2">
                                {ind.existingFiles.map((file: MovFile) => (
                                  <div
                                    key={file.id}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 hover:border-slate-300 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <FileText className="h-5 w-5 text-slate-600" />
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
                                      className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-800"
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      Preview
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Previous Files Section (Red - for comparison) */}
                          {ind.rejectedFiles && ind.rejectedFiles.length > 0 && (
                            <div className="bg-red-50 rounded-lg border-2 border-red-200 p-3 opacity-75">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                                  PREVIOUS
                                </div>
                                <p className="text-sm font-medium text-red-800">
                                  {ind.rejectedFiles.length} file
                                  {ind.rejectedFiles.length > 1 ? "s" : ""} replaced
                                </p>
                              </div>
                              <p className="text-xs text-red-600 mb-3">
                                These files were flagged during review and have been replaced with
                                new uploads. Shown for comparison.
                              </p>
                              <div className="space-y-2">
                                {ind.rejectedFiles.map((file: MovFile) => (
                                  <div
                                    key={file.id}
                                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100 hover:border-red-300 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <FileText className="h-5 w-5 text-red-600" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate line-through">
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
                                      className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      Preview
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* No files at all */}
                          {(!ind.newFiles || ind.newFiles.length === 0) &&
                            (!ind.existingFiles || ind.existingFiles.length === 0) &&
                            (!ind.rejectedFiles || ind.rejectedFiles.length === 0) && (
                              <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                                <div className="flex items-start gap-3">
                                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-amber-800">
                                      No files uploaded
                                    </p>
                                    <p className="text-xs text-amber-600 mt-0.5">
                                      BLGU has not uploaded any MOV files for this indicator
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>

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
                      <p className="text-sm text-gray-500 mt-1">Compliance Rate</p>
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

              {/* SGLGB Verdict Result - Only for Completed Assessments */}
              {isCompleted && complianceStatus && <VerdictResultCard isPassed={isPassed} />}

              {/* CapDev AI Insights Section - Only for Completed Assessments */}
              {isCompleted && (
                <CapDevInsightsCard
                  insights={capdevInsights as any}
                  isLoading={isCapdevLoading}
                  onRegenerate={handleRegenerateCapdev}
                  isRegenerating={regenerateCapdevMutation.isPending}
                />
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
              {/* SGLGB Verdict Result - Only for Completed Assessments */}
              {isCompleted && complianceStatus && <VerdictResultCard isPassed={isPassed} />}

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
                          const movFiles: MovFile[] = indicator.mov_files || [];
                          const isExpanded = expandedIndicators.has(indicator.indicator_id);
                          return (
                            <div
                              key={indicator.indicator_id}
                              className={`${isRecalibrationTarget ? "bg-purple-50/30" : ""}`}
                            >
                              {/* Indicator Header */}
                              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-start gap-3">
                                    <span className="shrink-0 px-2 py-1 rounded-md bg-gray-100 text-gray-600 font-mono text-xs font-bold border border-gray-200">
                                      {indicator.indicator_code}
                                    </span>
                                    <div>
                                      <p className="font-medium text-gray-900 leading-snug">
                                        {formatIndicatorName(
                                          indicator.indicator_name,
                                          assessment.cycle_year
                                        )}
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

                                <div className="ml-12 sm:ml-0 shrink-0 flex items-center gap-2">
                                  {/* MOV Files Button */}
                                  {movFiles.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        toggleIndicatorExpanded(indicator.indicator_id)
                                      }
                                      className="h-8 px-2 text-gray-500 hover:text-gray-700"
                                    >
                                      <FileText className="h-4 w-4 mr-1" />
                                      <span className="text-xs">{movFiles.length} MOV</span>
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4 ml-1" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 ml-1" />
                                      )}
                                    </Button>
                                  )}
                                  {movFiles.length === 0 && (
                                    <span className="text-xs text-gray-400 flex items-center gap-1 mr-2">
                                      <AlertCircle className="h-3 w-3" />
                                      No MOV
                                    </span>
                                  )}

                                  {/* Status Badge with Override Dropdown (only if AWAITING_MLGOO_APPROVAL) */}
                                  {isAwaitingApproval ? (
                                    <Select
                                      value={status || "PENDING"}
                                      onValueChange={(value) =>
                                        handleOverrideStatus(
                                          indicator.response_id,
                                          value as "PASS" | "FAIL" | "CONDITIONAL"
                                        )
                                      }
                                      disabled={overrideStatusMutation.isPending}
                                    >
                                      <SelectTrigger
                                        className={`h-8 w-[130px] text-xs font-bold border shadow-sm ${
                                          status === "PASS"
                                            ? "bg-green-100 text-green-700 border-green-200"
                                            : status === "FAIL"
                                              ? "bg-red-100 text-red-700 border-red-200"
                                              : status === "CONDITIONAL"
                                                ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                                : "bg-gray-100 text-gray-700 border-gray-200"
                                        }`}
                                      >
                                        <SelectValue />
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
                                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
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
                                  ) : (
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
                                  )}
                                </div>
                              </div>

                              {/* Expandable MOV Files Section */}
                              {isExpanded && movFiles.length > 0 && (
                                <div className="px-4 pb-4 pt-0">
                                  <div className="ml-12 bg-slate-50 rounded-lg border border-slate-200 p-3">
                                    <p className="text-xs font-medium text-slate-600 mb-2">
                                      Uploaded MOV Files:
                                    </p>
                                    <div className="space-y-2">
                                      {movFiles.map((file: MovFile) => (
                                        <div
                                          key={file.id}
                                          className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                                        >
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center flex-shrink-0">
                                              <FileText className="h-4 w-4 text-slate-600" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-xs font-medium text-gray-900 truncate">
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
                                            className="h-7 px-2 text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
                                          >
                                            <Eye className="h-3 w-3 mr-1" />
                                            View
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
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
