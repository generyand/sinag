"use client";

import { GARReportDisplay } from "@/components/features/gar/GARReportDisplay";
import { GARSkeleton } from "@/components/features/gar/GARSkeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiV1URL } from "@/lib/api";
import { showError, showWarning } from "@/lib/toast";
import { useAuthStore } from "@/store/useAuthStore";
import { useGetGarAssessmentId, useGetGarAssessments } from "@sinag/shared";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface GARAnalyticsTabProps {
  year: number;
}

export function GARAnalyticsTab({ year }: GARAnalyticsTabProps) {
  const { token } = useAuthStore();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Reset selected assessment when year changes
  useEffect(() => {
    setSelectedAssessmentId("");
  }, [year]);

  // Fetch completed assessments list for the selected year
  const { data: assessmentsData, isLoading: loadingAssessments } = useGetGarAssessments({
    year: year,
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

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Filters and Controls */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-4 md:p-6">
        <div className="flex flex-col gap-3 md:gap-4">
          {/* Top row: Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {/* Assessment Selector */}
            <div className="w-full">
              <label
                id="assessment-selector-label"
                className="block text-xs md:text-sm font-medium text-[var(--foreground)] mb-1.5 md:mb-2"
              >
                Select Assessment
              </label>
              <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                <SelectTrigger className="w-full h-10 md:h-11 text-sm" aria-labelledby="assessment-selector-label">
                  <SelectValue placeholder="Select assessment..." />
                </SelectTrigger>
                <SelectContent className="z-50 max-h-96">
                  {loadingAssessments ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : assessmentsData?.assessments?.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No completed assessments for {year}
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
            <div className="w-full">
              <label
                id="governance-area-selector-label"
                className="block text-xs md:text-sm font-medium text-[var(--foreground)] mb-1.5 md:mb-2"
              >
                Governance Area
              </label>
              <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                <SelectTrigger className="h-10 md:h-11 text-sm" aria-labelledby="governance-area-selector-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">All Areas</SelectItem>
                  <SelectItem value="1">CGA 1: Financial Admin</SelectItem>
                  <SelectItem value="2">CGA 2: Disaster Prep</SelectItem>
                  <SelectItem value="3">CGA 3: Safety & Order</SelectItem>
                  <SelectItem value="4">EGA 1: Social Protection</SelectItem>
                  <SelectItem value="5">EGA 2: Business-Friendly</SelectItem>
                  <SelectItem value="6">EGA 3: Environment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Buttons - Full width on mobile */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => handleExport("excel")}
              disabled={!selectedAssessmentId || exportingExcel || exportingPdf}
              className="flex-1 sm:flex-none items-center justify-center gap-2 h-10 md:h-11 text-sm"
            >
              {exportingExcel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{exportingExcel ? "Exporting..." : "Excel"}</span>
              <span className="sm:hidden">{exportingExcel ? "..." : "Excel"}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("pdf")}
              disabled={!selectedAssessmentId || exportingExcel || exportingPdf}
              className="flex-1 sm:flex-none items-center justify-center gap-2 h-10 md:h-11 text-sm"
            >
              {exportingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{exportingPdf ? "Exporting..." : "PDF"}</span>
              <span className="sm:hidden">{exportingPdf ? "..." : "PDF"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* GAR Report Display */}
      {!selectedAssessmentId ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6 md:p-12 text-center">
          <FileSpreadsheet className="h-10 w-10 md:h-16 md:w-16 mx-auto text-[var(--muted-foreground)] mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-medium text-[var(--foreground)] mb-1.5 md:mb-2">
            Select an Assessment
          </h3>
          <p className="text-sm md:text-base text-[var(--muted-foreground)]">
            Choose an assessment from the dropdown to view its GAR for {year}.
          </p>
        </div>
      ) : loadingGar ? (
        <GARSkeleton />
      ) : garError ? (
        <div className="bg-[var(--card)] border border-red-200 rounded-sm shadow-lg p-4 md:p-6 text-center">
          <p className="text-sm md:text-base text-red-600">Failed to load GAR data. Please try again.</p>
        </div>
      ) : garData ? (
        <GARReportDisplay data={garData} />
      ) : null}
    </div>
  );
}
