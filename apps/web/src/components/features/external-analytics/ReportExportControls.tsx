"use client";

import { useState } from "react";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";

interface ReportExportControlsProps {
  assessmentCycle?: string;
  className?: string;
}

export function ReportExportControls({
  assessmentCycle,
  className = "",
}: ReportExportControlsProps) {
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleExportCSV = async () => {
    try {
      setIsExportingCSV(true);

      // Build the API URL
      const baseUrl = process.env.NEXT_PUBLIC_API_V1_URL || "http://localhost:8000/api/v1";
      const url = new URL(`${baseUrl}/external/analytics/export/csv`);
      if (assessmentCycle) {
        url.searchParams.append("assessment_cycle", assessmentCycle);
      }

      // Get auth token from localStorage (assuming token-based auth)
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      // Fetch the CSV file
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || `Export failed with status ${response.status}`
        );
      }

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
      link.download = filenameMatch
        ? filenameMatch[1]
        : `sinag_external_analytics_${new Date().toISOString().split("T")[0]}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Show success notification (you can integrate with a toast library)
      console.log("CSV export successful");
    } catch (error) {
      console.error("CSV export error:", error);
      // Show error notification (you can integrate with a toast library)
      alert(error instanceof Error ? error.message : "Failed to export CSV");
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);

      // Build the API URL
      const baseUrl = process.env.NEXT_PUBLIC_API_V1_URL || "http://localhost:8000/api/v1";
      const url = new URL(`${baseUrl}/external/analytics/export/pdf`);
      if (assessmentCycle) {
        url.searchParams.append("assessment_cycle", assessmentCycle);
      }

      // Get auth token from localStorage
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      // Fetch the PDF file
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || `Export failed with status ${response.status}`
        );
      }

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
      link.download = filenameMatch
        ? filenameMatch[1]
        : `sinag_external_analytics_${new Date().toISOString().split("T")[0]}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Show success notification
      console.log("PDF export successful");
    } catch (error) {
      console.error("PDF export error:", error);
      // Show error notification
      alert(error instanceof Error ? error.message : "Failed to export PDF");
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className={`flex gap-3 ${className}`}>
      <button
        onClick={handleExportCSV}
        disabled={isExportingCSV || isExportingPDF}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Download aggregated analytics data as CSV"
      >
        {isExportingCSV ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating CSV...</span>
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download CSV</span>
          </>
        )}
      </button>

      <button
        onClick={handleExportPDF}
        disabled={isExportingCSV || isExportingPDF}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Download aggregated analytics data as PDF"
      >
        {isExportingPDF ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating PDF...</span>
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            <span>Download PDF</span>
          </>
        )}
      </button>

      <div className="flex-1 flex items-center text-sm text-gray-600">
        <span className="ml-3">
          Export includes aggregated data only. Individual barangay performance is not included.
        </span>
      </div>
    </div>
  );
}
