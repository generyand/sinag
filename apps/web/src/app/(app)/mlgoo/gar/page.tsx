"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffectiveYear } from "@/store/useAssessmentYearStore";
import { YearSelector } from "@/components/features/assessment-year/YearSelector";
import { useGetGarAssessments, useGetGarAssessmentId } from "@sinag/shared";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GARReportDisplay } from "@/components/features/gar/GARReportDisplay";
import { GARSkeleton } from "@/components/features/gar/GARSkeleton";
import { getApiV1URL } from "@/lib/api";
import { showError, showWarning } from "@/lib/toast";

export default function GARPage() {
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuthStore();
  const effectiveYear = useEffectiveYear();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all"); // Default to All Areas
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Auth check
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  // Role check - MLGOO only
  useEffect(() => {
    if (isAuthenticated && user?.role !== "MLGOO_DILG") {
      router.replace("/assessor/submissions");
    }
  }, [isAuthenticated, user, router]);

  // Reset selected assessment when year changes
  useEffect(() => {
    setSelectedAssessmentId("");
  }, [effectiveYear]);

  // Fetch completed assessments list for the selected year
  const { data: assessmentsData, isLoading: loadingAssessments } = useGetGarAssessments({
    year: effectiveYear ?? undefined,
  });

  // Fetch GAR data for selected assessment
  const {
    data: garData,
    isLoading: loadingGar,
    error: garError,
  } = useGetGarAssessmentId(
    parseInt(selectedAssessmentId) || 0,
    { governance_area_id: selectedAreaId === "all" ? undefined : parseInt(selectedAreaId) },
    {
      query: {
        enabled: !!selectedAssessmentId && parseInt(selectedAssessmentId) > 0,
      } as any,
    }
  );

  // Handle export with idempotence (prevent double-clicks)
  const handleExport = async (format: "excel" | "pdf") => {
    if (!selectedAssessmentId) return;

    // Check if already exporting this format
    if (format === "excel" && exportingExcel) return;
    if (format === "pdf" && exportingPdf) return;

    // Set loading state
    if (format === "excel") setExportingExcel(true);
    if (format === "pdf") setExportingPdf(true);

    const baseUrl = getApiV1URL();
    const areaParam = selectedAreaId === "all" ? "" : `?governance_area_id=${selectedAreaId}`;
    const url = `${baseUrl}/gar/${selectedAssessmentId}/export/${format}${areaParam}`;

    if (!token) {
      showWarning("Authentication required", {
        description: "Please log in again.",
      });
      if (format === "excel") setExportingExcel(false);
      if (format === "pdf") setExportingPdf(false);
      return;
    }

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `GAR_${selectedAssessmentId}.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      showError("Export failed", {
        description: "Please try again.",
      });
    } finally {
      // Reset loading state
      if (format === "excel") setExportingExcel(false);
      if (format === "pdf") setExportingPdf(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user?.role !== "MLGOO_DILG") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-8">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-100/40 to-emerald-100/20 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-green-100/30 to-teal-100/20 rounded-full translate-y-16 -translate-x-16"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold text-[var(--foreground)]">
                    Governance{" "}
                    <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                      Assessment Report
                    </span>
                  </h1>
                  <p className="text-[var(--muted-foreground)] mt-2">
                    View and export GAR reports for completed assessments
                  </p>
                </div>

                {/* Year Selector + Quick Stats */}
                <div className="flex items-center gap-4">
                  <YearSelector showLabel showIcon />
                  <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]">
                    <div className="text-2xl font-bold text-[var(--foreground)]">
                      {assessmentsData?.total || 0}
                    </div>
                    <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                      Completed
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
              {/* Assessment Selector */}
              <div className="flex-1 w-full md:w-auto">
                <label
                  id="assessment-selector-label"
                  className="block text-sm font-medium text-[var(--foreground)] mb-2"
                >
                  Select Assessment
                </label>
                <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                  <SelectTrigger className="w-full" aria-labelledby="assessment-selector-label">
                    <SelectValue placeholder="Select a completed assessment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingAssessments ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : assessmentsData?.assessments?.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No completed assessments found
                      </SelectItem>
                    ) : (
                      assessmentsData?.assessments?.map((a) => (
                        <SelectItem key={a.assessment_id} value={String(a.assessment_id)}>
                          {a.barangay_name} - {a.status}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Governance Area Selector */}
              <div className="w-full md:w-64">
                <label
                  id="governance-area-selector-label"
                  className="block text-sm font-medium text-[var(--foreground)] mb-2"
                >
                  Governance Area
                </label>
                <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                  <SelectTrigger aria-labelledby="governance-area-selector-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Governance Areas</SelectItem>
                    <SelectItem value="1">CGA 1: Financial Administration</SelectItem>
                    <SelectItem value="2">CGA 2: Disaster Preparedness</SelectItem>
                    <SelectItem value="3">CGA 3: Safety, Peace and Order</SelectItem>
                    <SelectItem value="4">EGA 1: Social Protection</SelectItem>
                    <SelectItem value="5">EGA 2: Business-Friendliness</SelectItem>
                    <SelectItem value="6">EGA 3: Environmental Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport("excel")}
                  disabled={!selectedAssessmentId || exportingExcel || exportingPdf}
                  className="flex items-center gap-2"
                >
                  {exportingExcel ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  {exportingExcel ? "Exporting..." : "Excel"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport("pdf")}
                  disabled={!selectedAssessmentId || exportingExcel || exportingPdf}
                  className="flex items-center gap-2"
                >
                  {exportingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {exportingPdf ? "Exporting..." : "PDF"}
                </Button>
              </div>
            </div>
          </div>

          {/* GAR Report Display */}
          {!selectedAssessmentId ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-12 text-center">
              <FileSpreadsheet className="h-16 w-16 mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                Select an Assessment
              </h3>
              <p className="text-[var(--muted-foreground)]">
                Choose a completed assessment from the dropdown above to view its GAR report.
              </p>
            </div>
          ) : loadingGar ? (
            <GARSkeleton />
          ) : garError ? (
            <div className="bg-[var(--card)] border border-red-200 rounded-sm shadow-lg p-6 text-center">
              <p className="text-red-600">Failed to load GAR data. Please try again.</p>
            </div>
          ) : garData ? (
            <GARReportDisplay data={garData} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
