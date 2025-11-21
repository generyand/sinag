"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Filter,
  Search,
  ChevronDown,
  Eye,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SubmissionsSkeleton } from "@/components/features/submissions";
import { useGetAssessmentsList, AssessmentStatus } from "@vantage/shared";

interface Submission {
  id: number;
  barangayName: string;
  overallProgress: number;
  currentStatus: string;
  statusColor: string;
  assignedAssessors: Array<{
    id: number;
    name: string;
    avatar: string;
  }>;
  lastUpdated: string;
}

export default function AdminSubmissionsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [assessorFilter, setAssessorFilter] = useState("all");

  // Build API status filter
  const apiStatusFilter = useMemo(() => {
    if (statusFilter === "all") {
      return undefined; // Don't filter by status
    }
    // Map UI filter values to API status enums
    const statusMap: Record<string, AssessmentStatus> = {
      "completed": AssessmentStatus.COMPLETED,
      "validated": AssessmentStatus.VALIDATED,
      "awaiting_final": AssessmentStatus.AWAITING_FINAL_VALIDATION,
      "in_review": AssessmentStatus.IN_REVIEW,
      "rework": AssessmentStatus.REWORK,
      "submitted": AssessmentStatus.SUBMITTED,
      "draft": AssessmentStatus.DRAFT,
    };
    return statusMap[statusFilter];
  }, [statusFilter]);

  // Fetch assessments from API
  const { data: apiData, isLoading, error } = useGetAssessmentsList(
    { status: apiStatusFilter },
    {
      query: {
        // Refetch when filter changes
        keepPreviousData: true,
      },
    }
  );

  // Transform API data to UI structure
  const submissionsData = useMemo((): Submission[] => {
    if (!apiData) return [];

    return (apiData as any[]).map((assessment: any) => {
      // Map API status to UI display status
      const statusMap: Record<string, string> = {
        [AssessmentStatus.COMPLETED]: "Completed",
        [AssessmentStatus.VALIDATED]: "Validated",
        [AssessmentStatus.AWAITING_FINAL_VALIDATION]: "Awaiting Final Validation",
        [AssessmentStatus.IN_REVIEW]: "In Review",
        [AssessmentStatus.REWORK]: "Needs Rework",
        [AssessmentStatus.SUBMITTED]: "Submitted for Review",
        [AssessmentStatus.DRAFT]: "Draft",
        [AssessmentStatus.SUBMITTED_FOR_REVIEW]: "Submitted for Review",
        [AssessmentStatus.NEEDS_REWORK]: "Needs Rework",
      };

      const currentStatus = statusMap[assessment.status] || assessment.status;

      // Calculate progress based on area_results if available
      let overallProgress = 0;
      if (assessment.area_results && typeof assessment.area_results === 'object') {
        const results = Object.values(assessment.area_results);
        if (results.length > 0) {
          const totalCompliance = results.reduce((sum: number, result: any) => {
            return sum + (result?.compliance_rate || 0);
          }, 0);
          overallProgress = Math.round(totalCompliance / results.length);
        }
      } else if (assessment.final_compliance_status === "COMPLIANT") {
        overallProgress = 100;
      } else if (assessment.status === AssessmentStatus.COMPLETED || assessment.status === AssessmentStatus.VALIDATED) {
        overallProgress = 100;
      } else if (assessment.status === AssessmentStatus.AWAITING_FINAL_VALIDATION) {
        overallProgress = 95;
      } else if (assessment.status === AssessmentStatus.IN_REVIEW) {
        overallProgress = 75;
      } else if (assessment.status === AssessmentStatus.SUBMITTED) {
        overallProgress = 50;
      }

      // Format date
      const lastUpdated = assessment.updated_at
        ? new Date(assessment.updated_at).toLocaleDateString()
        : "N/A";

      // Map validators from API
      const assignedAssessors = assessment.validators && Array.isArray(assessment.validators)
        ? assessment.validators.map((v: any) => ({
            id: v.id,
            name: v.name,
            avatar: v.initials || "?",
          }))
        : [];

      return {
        id: assessment.id,
        barangayName: assessment.barangay_name || "Unknown",
        overallProgress,
        currentStatus,
        statusColor: "green", // Will be determined by getStatusConfig
        assignedAssessors,
        lastUpdated,
      };
    });
  }, [apiData]);

  // Filter submissions based on search (status filtering is done via API)
  const filteredSubmissions = useMemo(() => {
    return submissionsData.filter((submission) => {
      const matchesSearch = submission.barangayName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesArea = areaFilter === "all"; // For now, all areas match
      const matchesAssessor = assessorFilter === "all"; // For now, all assessors match

      return matchesSearch && matchesArea && matchesAssessor;
    });
  }, [searchQuery, areaFilter, assessorFilter, submissionsData]);

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

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-8">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              Failed to Load Assessments
            </h2>
            <p className="text-[var(--muted-foreground)] mb-4">
              {(error as any)?.message || "An unexpected error occurred"}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-white"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      "Submitted for Review": {
        bgColor: 'var(--analytics-warning-bg)',
        textColor: 'var(--analytics-warning-text)',
        icon: Clock,
      },
      "In Review": {
        bgColor: 'var(--kpi-blue-from)',
        textColor: 'var(--kpi-blue-text)',
        icon: Clock,
      },
      "Awaiting Final Validation": {
        bgColor: 'var(--kpi-purple-from)',
        textColor: 'var(--kpi-purple-text)',
        icon: Clock,
      },
      "Completed": {
        bgColor: 'var(--analytics-success-bg)',
        textColor: 'var(--analytics-success-text)',
        icon: CheckCircle,
      },
      "Draft": {
        bgColor: 'var(--analytics-neutral-bg)',
        textColor: 'var(--analytics-neutral-text)',
        icon: XCircle,
      },
      "Needs Rework": {
        bgColor: 'var(--analytics-warning-bg)',
        textColor: 'var(--analytics-warning-text)',
        icon: AlertTriangle,
      },
      "Validated": {
        bgColor: 'var(--analytics-success-bg)',
        textColor: 'var(--analytics-success-text)',
        icon: CheckCircle,
      },
    };
    return configs[status as keyof typeof configs] || configs["Draft"];
  };

  const getProgressBarColor = (progress: number) => {
    if (progress >= 90) return "var(--analytics-success)";
    if (progress >= 70) return "var(--analytics-warning)";
    if (progress >= 40) return "var(--analytics-warning)";
    return "var(--analytics-danger)";
  };

  const handleViewDetails = (submission: Submission) => {
            router.push(`/mlgoo/submissions/${submission.id}`);
  };

  const handleSendReminder = (submission: Submission) => {
    toast.success(`Reminder sent to ${submission.barangayName}`);
  };

  // Show skeleton while loading
  if (isLoading) {
    return <SubmissionsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Enhanced Header Section */}
          <div className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-8">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/40 to-indigo-100/20 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/30 to-pink-100/20 rounded-full translate-y-16 -translate-x-16"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold text-[var(--foreground)]">
                    Assessment{" "}
                    <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                      Submissions
                    </span>
                  </h1>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-6">
                  <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]">
                    <div className="text-3xl font-bold text-[var(--foreground)]">
                      {filteredSubmissions.length}
                    </div>
                    <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                      Submissions
                    </div>
                  </div>
                  <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]">
                    <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {submissionsData.filter(s => s.currentStatus === "Validated" || s.currentStatus === "Completed").length}
                    </div>
                    <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                      Completed
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Filter className="h-5 w-5" style={{ color: 'var(--cityscape-yellow)' }} />
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Filters & Search
              </h2>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Search Section - Left Side */}
              <div className="flex-1 max-w-md">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    Search
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-[var(--muted-foreground)]" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search by Barangay Name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 bg-[var(--background)] border-[var(--border)] rounded-sm focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Filters Section - Right Side */}
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Filter by Status */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--foreground)]">
                      Filter by Status
                    </label>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="h-10 bg-[var(--background)] border-[var(--border)] rounded-sm focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 transition-all duration-200">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border border-[var(--border)] shadow-xl rounded-sm z-50">
                        <SelectItem
                          value="all"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          All Statuses
                        </SelectItem>
                        <SelectItem
                          value="completed"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          Completed
                        </SelectItem>
                        <SelectItem
                          value="validated"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          Validated
                        </SelectItem>
                        <SelectItem
                          value="awaiting_final"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          Awaiting Final Validation
                        </SelectItem>
                        <SelectItem
                          value="in_review"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          In Review
                        </SelectItem>
                        <SelectItem
                          value="submitted"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          Submitted
                        </SelectItem>
                        <SelectItem
                          value="rework"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          Needs Rework
                        </SelectItem>
                        <SelectItem
                          value="draft"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          Draft
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filter by Governance Area */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--foreground)]">
                      Filter by Governance Area
                    </label>
                    <Select value={areaFilter} onValueChange={setAreaFilter}>
                      <SelectTrigger className="h-10 bg-[var(--background)] border-[var(--border)] rounded-sm focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 transition-all duration-200">
                        <SelectValue placeholder="All Areas" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border border-[var(--border)] shadow-xl rounded-sm z-50">
                        <SelectItem
                          value="all"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          All Areas
                        </SelectItem>
                        <SelectItem
                          value="financial"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          Financial Administration
                        </SelectItem>
                        <SelectItem
                          value="disaster"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          Disaster Preparedness
                        </SelectItem>
                        <SelectItem
                          value="safety"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          Safety & Peace Order
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filter by Assessor */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[var(--foreground)]">
                      Filter by Assessor
                    </label>
                    <Select
                      value={assessorFilter}
                      onValueChange={setAssessorFilter}
                    >
                      <SelectTrigger className="h-10 bg-[var(--background)] border-[var(--border)] rounded-sm focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 transition-all duration-200">
                        <SelectValue placeholder="All Assessors" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border border-[var(--border)] shadow-xl rounded-sm z-50">
                        <SelectItem
                          value="all"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          All Assessors
                        </SelectItem>
                        <SelectItem
                          value="john"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          John Doe
                        </SelectItem>
                        <SelectItem
                          value="jane"
                          className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 cursor-pointer px-3 py-2"
                        >
                          Jane Smith
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--muted-foreground)]">
              Showing {filteredSubmissions.length} submissions
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--muted)]/20 border-b border-[var(--border)]">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                        Barangay Name
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                        Overall Progress
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                        Current Status
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                        Validators
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                        Last Updated
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                        Actions
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredSubmissions.map((submission) => {
                    const statusConfig = getStatusConfig(
                      submission.currentStatus
                    );
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr
                        key={submission.id}
                        className="hover:bg-[var(--cityscape-yellow)]/5 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-[var(--foreground)]">
                            {submission.barangayName}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-[var(--border)] rounded-sm h-3 min-w-[100px]">
                                                          <div
                              className="h-3 rounded-sm transition-all duration-300"
                              style={{
                                backgroundColor: getProgressBarColor(submission.overallProgress),
                                width: `${submission.overallProgress}%`,
                              }}
                            />
                            </div>
                            <span className="text-sm font-medium text-[var(--foreground)] min-w-[35px]">
                              {submission.overallProgress}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-sm text-xs font-medium"
                            style={{
                              backgroundColor: statusConfig.bgColor,
                              color: statusConfig.textColor
                            }}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {submission.currentStatus}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {submission.assignedAssessors.length > 0 ? (
                              submission.assignedAssessors.map((assessor) => (
                                <div
                                  key={assessor.id}
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm"
                                  title={assessor.name}
                                >
                                  {assessor.avatar}
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-[var(--muted-foreground)] italic">
                                No validators yet
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-[var(--muted-foreground)]">
                            {submission.lastUpdated}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(submission)}
                              className="bg-[var(--background)] hover:bg-[var(--cityscape-yellow)]/10 hover:border-[var(--cityscape-yellow)] border-[var(--border)] text-[var(--foreground)] rounded-sm font-medium transition-all duration-200"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendReminder(submission)}
                              className="bg-[var(--background)] hover:bg-[var(--cityscape-yellow)]/10 hover:border-[var(--cityscape-yellow)] border-[var(--border)] text-[var(--foreground)] rounded-sm font-medium transition-all duration-200"
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Remind
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
