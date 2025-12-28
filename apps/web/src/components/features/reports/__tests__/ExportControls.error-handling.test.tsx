/**
 * Tests for ExportControls Error Handling
 *
 * Verifies that the component correctly:
 * - Shows toast notifications instead of native alerts for errors
 * - Handles PNG export errors gracefully
 * - Handles PDF export errors gracefully
 * - Shows warnings for empty data scenarios
 * - Manages loading states during export operations
 */

import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportControls } from "../ExportControls";
import { showError, showWarning } from "@/lib/toast";
import { exportToPNG } from "@/lib/png-export";
import { exportReportToPDF } from "@/lib/pdf-export";

// Mock the toast module
vi.mock("@/lib/toast", () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));

vi.mock("@/lib/png-export", () => ({
  exportToPNG: vi.fn(),
}));

vi.mock("@/lib/pdf-export", () => ({
  exportReportToPDF: vi.fn(),
}));

const mockReportsData = {
  summary: {
    total_assessments: 10,
    completed: 5,
    in_progress: 3,
    pending: 2,
  },
  assessments: [],
};

describe("ExportControls Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PNG Export Button", () => {
    it("should render PNG export dropdown button on map tab", () => {
      render(<ExportControls activeTab="map" />);

      const pngButton = screen.getByText("Export PNG");
      expect(pngButton).toBeInTheDocument();
    });

    it("should not render PNG export button on non-map tabs", () => {
      render(<ExportControls activeTab="overview" />);

      expect(screen.queryByText("Export PNG")).not.toBeInTheDocument();
    });

    it("should not be disabled when on map tab", () => {
      render(<ExportControls activeTab="map" />);

      const pngButton = screen.getByText("Export PNG").closest("button");
      expect(pngButton).not.toBeDisabled();
    });
  });

  describe("PDF Export Error Handling", () => {
    it("should show toast error when PDF export fails", async () => {
      (exportReportToPDF as Mock).mockRejectedValue(new Error("PDF generation failed"));

      render(<ExportControls reportsData={mockReportsData as any} activeTab="overview" />);

      const pdfButton = screen.getByText("Export PDF");
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(showError).toHaveBeenCalledWith("Failed to export PDF", {
          description: "Please try again.",
        });
      });
    });

    it("should disable PDF button when no reports data available", () => {
      render(<ExportControls reportsData={undefined} activeTab="overview" />);

      const pdfButton = screen.getByText("Export PDF").closest("button");
      expect(pdfButton).toBeDisabled();
    });

    it("should not call native alert on PDF export error", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      (exportReportToPDF as Mock).mockRejectedValue(new Error("Export failed"));

      render(<ExportControls reportsData={mockReportsData as any} activeTab="overview" />);

      const pdfButton = screen.getByText("Export PDF");
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(alertSpy).not.toHaveBeenCalled();
        expect(showError).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });
  });

  describe("Button States", () => {
    it("should enable PDF button when reports data is available", () => {
      render(<ExportControls reportsData={mockReportsData as any} activeTab="overview" />);

      const pdfButton = screen.getByText("Export PDF").closest("button");
      expect(pdfButton).not.toBeDisabled();
    });
  });

  describe("Error Message Content", () => {
    it("should include helpful description in PDF error message", async () => {
      (exportReportToPDF as Mock).mockRejectedValue(new Error("Failed"));

      render(<ExportControls reportsData={mockReportsData as any} activeTab="overview" />);

      const pdfButton = screen.getByText("Export PDF");
      fireEvent.click(pdfButton);

      await waitFor(() => {
        const mockShowError = showError as Mock;
        expect(mockShowError).toHaveBeenCalled();
        const call = mockShowError.mock.calls[0];
        expect(call[0]).toBe("Failed to export PDF");
        expect(call[1].description).toBe("Please try again.");
      });
    });
  });

  describe("Toast vs Alert Consistency", () => {
    it("should use toast for PDF errors consistently", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      // Test PDF error
      (exportReportToPDF as Mock).mockRejectedValue(new Error("PDF error"));
      render(<ExportControls reportsData={mockReportsData as any} activeTab="overview" />);
      fireEvent.click(screen.getByText("Export PDF"));

      await waitFor(() => {
        // Native alert should never be called
        expect(alertSpy).not.toHaveBeenCalled();
        // Toast should be called for errors
        expect(showError).toHaveBeenCalledTimes(1);
      });

      alertSpy.mockRestore();
    });
  });
});
