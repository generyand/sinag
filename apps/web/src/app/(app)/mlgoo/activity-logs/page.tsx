"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  History,
  Loader2,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// Action type to label and color mapping
const ACTION_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  submitted: { label: "Submitted", color: "text-blue-700", bgColor: "bg-blue-100" },
  review_started: { label: "Review Started", color: "text-purple-700", bgColor: "bg-purple-100" },
  rework_requested: {
    label: "Rework Requested",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  rework_submitted: { label: "Rework Submitted", color: "text-blue-700", bgColor: "bg-blue-100" },
  review_completed: { label: "Review Completed", color: "text-green-700", bgColor: "bg-green-100" },
  validation_started: {
    label: "Validation Started",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
  calibration_requested: {
    label: "Calibration Requested",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  calibration_submitted: {
    label: "Calibration Submitted",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  validation_completed: {
    label: "Validation Completed",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  approved: { label: "Approved", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  recalibration_requested: {
    label: "Recalibration Requested",
    color: "text-rose-700",
    bgColor: "bg-rose-100",
  },
  recalibration_submitted: {
    label: "Recalibration Submitted",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  completed: { label: "Completed", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  created: { label: "Created", color: "text-gray-700", bgColor: "bg-gray-100" },
  // NEW: Indicator-level action configs
  indicator_submitted: {
    label: "Indicator Submitted",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  indicator_reviewed: {
    label: "Indicator Reviewed",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
  },
  indicator_validated: {
    label: "Indicator Validated",
    color: "text-green-700",
    bgColor: "bg-green-50",
  },
  indicator_flagged_rework: {
    label: "Indicator Flagged for Rework",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
  },
  indicator_flagged_calibration: {
    label: "Indicator Flagged for Calibration",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
  },
  mov_uploaded: {
    label: "MOV Uploaded",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50",
  },
  mov_annotated: {
    label: "MOV Annotated",
    color: "text-teal-700",
    bgColor: "bg-teal-50",
  },
};

interface Activity {
  id: number;
  action: string;
  barangay_name: string;
  user_name: string;
  user_email: string;
  description: string;
  created_at: string;
  from_status: string | null;
  to_status: string | null;
}

// Assessment-level action types
const ASSESSMENT_ACTIONS = [
  "submitted",
  "approved",
  "rework_requested",
  "rework_submitted",
  "review_started",
  "review_completed",
  "calibration_requested",
  "calibration_submitted",
  "validation_started",
  "validation_completed",
  "recalibration_requested",
  "recalibration_submitted",
  "completed",
  "created",
];

// Indicator-level action types
const INDICATOR_ACTIONS = [
  "indicator_submitted",
  "indicator_reviewed",
  "indicator_validated",
  "indicator_flagged_rework",
  "indicator_flagged_calibration",
  "mov_uploaded",
  "mov_annotated",
];

interface ActionCount {
  action: string;
  count: number;
  label: string;
}

export default function ActivityLogsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Separate counts for indicator vs assessment activities
  const [indicatorCount, setIndicatorCount] = useState(0);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [actionCounts, setActionCounts] = useState<ActionCount[]>([]);

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("skip", String((currentPage - 1) * itemsPerPage));
      params.append("limit", String(itemsPerPage));

      // Handle special filter values for grouped actions
      if (actionFilter === "all_assessment") {
        ASSESSMENT_ACTIONS.forEach((action) => params.append("actions", action));
      } else if (actionFilter === "all_indicator") {
        INDICATOR_ACTIONS.forEach((action) => params.append("actions", action));
      } else if (actionFilter && actionFilter !== "all") {
        params.append("action", actionFilter);
      }

      const response = await api.get(`/api/v1/assessment-activities?${params}`);
      const data = response.data;
      setActivities(data.items || []);
      setTotalCount(data.total || 0);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, actionFilter, itemsPerPage]);

  // Fetch summary counts for badges
  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.get("/api/v1/assessment-activities/summary");
      const data = response.data;
      const byAction: ActionCount[] = data.by_action || [];
      setActionCounts(byAction);

      // Calculate indicator vs assessment counts
      let indicatorTotal = 0;
      let assessmentTotal = 0;
      byAction.forEach((item: ActionCount) => {
        if (INDICATOR_ACTIONS.includes(item.action)) {
          indicatorTotal += item.count;
        } else {
          assessmentTotal += item.count;
        }
      });
      setIndicatorCount(indicatorTotal);
      setAssessmentCount(assessmentTotal);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchActivities();
      fetchSummary();
    }
  }, [isAuthenticated, fetchActivities, fetchSummary]);

  // Client-side search filtering (since API search would require additional implementation)
  const filteredActivities = activities.filter((activity) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      activity.barangay_name?.toLowerCase().includes(query) ||
      activity.user_name?.toLowerCase().includes(query) ||
      activity.user_email?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.get("/api/v1/assessment-activities/export", {
        responseType: "blob",
      });

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers["content-disposition"];
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `activity_logs_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // Download the file
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Activity logs exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export activity logs");
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    fetchActivities();
    fetchSummary();
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/mlgoo/settings")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Settings
              </Button>
            </div>
          </div>

          {/* Page Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <History className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">Activity Logs</h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Track assessment workflow activities and history
              </p>
            </div>
          </div>

          {/* Filters and Actions */}
          <Card className="border border-[var(--border)]">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <Input
                    placeholder="Search by barangay or user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Action Filter */}
                <Select
                  value={actionFilter}
                  onValueChange={(value) => {
                    setActionFilter(value);
                    setCurrentPage(1); // Reset to first page when filter changes
                  }}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="all_assessment" className="font-medium text-blue-600">
                      All Assessment Actions
                    </SelectItem>
                    <SelectItem value="all_indicator" className="font-medium text-purple-600">
                      All Indicator Actions
                    </SelectItem>

                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel className="font-semibold text-blue-600">
                        Assessment Actions
                      </SelectLabel>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rework_requested">Rework Requested</SelectItem>
                      <SelectItem value="rework_submitted">Rework Submitted</SelectItem>
                      <SelectItem value="review_completed">Review Completed</SelectItem>
                      <SelectItem value="calibration_requested">Calibration Requested</SelectItem>
                      <SelectItem value="calibration_submitted">Calibration Submitted</SelectItem>
                      <SelectItem value="validation_completed">Validation Completed</SelectItem>
                      <SelectItem value="recalibration_requested">
                        Recalibration Requested
                      </SelectItem>
                      <SelectItem value="recalibration_submitted">
                        Recalibration Submitted
                      </SelectItem>
                    </SelectGroup>

                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel className="font-semibold text-purple-600">
                        Indicator Actions
                      </SelectLabel>
                      <SelectItem value="indicator_submitted">Indicator Submitted</SelectItem>
                      <SelectItem value="indicator_reviewed">Indicator Reviewed</SelectItem>
                      <SelectItem value="indicator_validated">Indicator Validated</SelectItem>
                      <SelectItem value="indicator_flagged_rework">
                        Indicator Flagged Rework
                      </SelectItem>
                      <SelectItem value="indicator_flagged_calibration">
                        Indicator Flagged Calibration
                      </SelectItem>
                      <SelectItem value="mov_uploaded">MOV Uploaded</SelectItem>
                      <SelectItem value="mov_annotated">MOV Annotated</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="gap-2"
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Table */}
          <Card className="border border-[var(--border)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                <Calendar className="h-5 w-5" />
                Recent Activities
                <div className="flex items-center gap-2 ml-2">
                  <Badge variant="secondary">
                    {actionFilter === "all" ? assessmentCount + indicatorCount : totalCount} total
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    {assessmentCount} assessment
                  </Badge>
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                    {indicatorCount} indicator
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
                  <h3 className="text-lg font-medium text-[var(--foreground)]">
                    No activities found
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    Activities will appear here once assessments are submitted
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Date/Time</TableHead>
                          <TableHead className="w-[150px]">Action</TableHead>
                          <TableHead>Barangay</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredActivities.map((activity) => {
                          const config = ACTION_CONFIG[activity.action] || {
                            label: activity.action,
                            color: "text-gray-700",
                            bgColor: "bg-gray-100",
                          };
                          return (
                            <TableRow key={activity.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
                                  <div>
                                    <div className="text-sm">
                                      {format(new Date(activity.created_at), "MMM d, yyyy")}
                                    </div>
                                    <div className="text-xs text-[var(--muted-foreground)]">
                                      {format(new Date(activity.created_at), "h:mm a")}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${config.bgColor} ${config.color} border-0`}>
                                  {config.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">
                                  {activity.barangay_name || "N/A"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center">
                                    <User className="h-4 w-4 text-[var(--muted-foreground)]" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium">
                                      {activity.user_name || "System"}
                                    </div>
                                    <div className="text-xs text-[var(--muted-foreground)]">
                                      {activity.user_email || ""}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {activity.description ? (
                                  <span className="text-sm text-[var(--foreground)]">
                                    {activity.description}
                                  </span>
                                ) : activity.from_status || activity.to_status ? (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-[var(--muted-foreground)]">
                                      {activity.from_status?.replace(/_/g, " ") || "-"}
                                    </span>
                                    <span className="text-[var(--muted-foreground)]">→</span>
                                    <span className="font-medium">
                                      {activity.to_status?.replace(/_/g, " ") || "-"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[var(--muted-foreground)]">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
                      <div className="text-sm text-[var(--muted-foreground)]">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
