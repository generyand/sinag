"use client";

import { AnalyticsTabId } from "@/components/features/analytics";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterState, exportReportToPDF } from "@/lib/pdf-export";
import { exportToPNG } from "@/lib/png-export";
import { showError, showWarning } from "@/lib/toast";
import { ReportsDataResponse } from "@sinag/shared";
import { ChevronDown, Download, Image, Loader2 } from "lucide-react";
import { useState } from "react";

interface ExportControlsProps {
  currentFilters?: FilterState;
  reportsData?: ReportsDataResponse;
  activeTab: AnalyticsTabId;
}

export function ExportControls({ currentFilters, reportsData, activeTab }: ExportControlsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);

  // Handle PNG export for specific chart
  const handlePNGExport = async (chartType: string, elementId: string) => {
    try {
      setIsExporting(true);
      setExportType("PNG");

      await exportToPNG(elementId, `${chartType}_chart`);
    } catch (error) {
      console.error("PNG export failed:", error);
      showError("Failed to export PNG", {
        description: "Please try again.",
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  // Handle PDF export with DILG branding
  const handlePDFExport = async () => {
    if (!reportsData) {
      showWarning("No report data available to export");
      return;
    }

    try {
      setIsExporting(true);
      setExportType("PDF");

      await exportReportToPDF(reportsData, currentFilters || {}, {
        generatedAt: new Date().toISOString(),
        dateRange:
          currentFilters?.start_date && currentFilters?.end_date
            ? {
                start: currentFilters.start_date,
                end: currentFilters.end_date,
              }
            : undefined,
      });
    } catch (error) {
      console.error("PDF export failed:", error);
      showError("Failed to export PDF", {
        description: "Please try again.",
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* PNG Export Dropdown - Only show on Map tab */}
      {activeTab === "map" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isExporting}>
              {isExporting && exportType === "PNG" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Image className="h-4 w-4 mr-2" />
              )}
              Export PNG
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handlePNGExport("map", "map-container")}>
              Map
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

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
