"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/useAuthStore";
import { format } from "date-fns";
import { toast } from "sonner";
import { api } from "@/lib/api";

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
  const itemsPerPage = 20;

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("skip", String((currentPage - 1) * itemsPerPage));
      params.append("limit", String(itemsPerPage));
      if (actionFilter && actionFilter !== "all") {
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchActivities();
    }
  }, [isAuthenticated, fetchActivities]);

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
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rework_requested">Rework Requested</SelectItem>
                    <SelectItem value="rework_submitted">Rework Submitted</SelectItem>
                    <SelectItem value="review_completed">Review Completed</SelectItem>
                    <SelectItem value="calibration_requested">Calibration Requested</SelectItem>
                    <SelectItem value="calibration_submitted">Calibration Submitted</SelectItem>
                    <SelectItem value="validation_completed">Validation Completed</SelectItem>
                    <SelectItem value="recalibration_requested">Recalibration Requested</SelectItem>
                    <SelectItem value="recalibration_submitted">Recalibration Submitted</SelectItem>
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
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activities
                <Badge variant="secondary" className="ml-2">
                  {totalCount} entries
                </Badge>
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
                          <TableHead className="w-[200px]">Status Change</TableHead>
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
                                {activity.from_status || activity.to_status ? (
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
