"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Image, Loader2, ChevronDown } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";
import { exportToPNG } from "@/lib/png-export";
import { exportReportToPDF, FilterState } from "@/lib/pdf-export";
import { AssessmentRow, ReportsDataResponse } from "@sinag/shared";

interface ExportControlsProps {
  tableData: AssessmentRow[];
  currentFilters?: FilterState;
  reportsData?: ReportsDataResponse;
}

export function ExportControls({
  tableData,
  currentFilters,
  reportsData,
}: ExportControlsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);

  // Handle CSV export
  const handleCSVExport = () => {
    if (!tableData || tableData.length === 0) {
      alert("No data available to export");
      return;
    }

    try {
      setIsExporting(true);
      setExportType("CSV");

      // Transform data for CSV export
      const csvData = tableData.map((row) => ({
        "Barangay Name": row.barangay_name,
        "Governance Area": row.governance_area,
        Status: row.status,
        Score: row.score !== null && row.score !== undefined ? row.score : "N/A",
      }));

      exportToCSV(csvData, "assessment_report");
    } catch (error) {
      console.error("CSV export failed:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  // Handle PNG export for specific chart
  const handlePNGExport = async (chartType: string, elementId: string) => {
    try {
      setIsExporting(true);
      setExportType("PNG");

      await exportToPNG(elementId, `${chartType}_chart`);
    } catch (error) {
      console.error("PNG export failed:", error);
      alert("Failed to export PNG. Please try again.");
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  // Handle PDF export with DILG branding
  const handlePDFExport = async () => {
    if (!reportsData) {
      alert("No report data available to export");
      return;
    }

    try {
      setIsExporting(true);
      setExportType("PDF");

      await exportReportToPDF(
        reportsData,
        currentFilters || {},
        {
          generatedAt: new Date().toISOString(),
          dateRange: currentFilters?.start_date && currentFilters?.end_date
            ? {
                start: currentFilters.start_date,
                end: currentFilters.end_date,
              }
            : undefined,
        }
      );
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* CSV Export Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleCSVExport}
        disabled={isExporting || !tableData || tableData.length === 0}
      >
        {isExporting && exportType === "CSV" ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        Export CSV
      </Button>

      {/* PNG Export Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isExporting}>
            {isExporting && exportType === "PNG" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image className="h-4 w-4 mr-2" />
            )}
            Export PNG
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              handlePNGExport("bar_chart", "bar-chart-container")
            }
          >
            Bar Chart
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              handlePNGExport("pie_chart", "pie-chart-container")
            }
          >
            Pie Chart
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              handlePNGExport("line_chart", "line-chart-container")
            }
          >
            Line Chart
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handlePNGExport("map", "map-container")}
          >
            Map
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* PDF Export Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePDFExport}
        disabled={isExporting || !reportsData}
      >
        {isExporting && exportType === "PDF" ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Export PDF
      </Button>
    </div>
  );
}
