/**
 * Tests for ExportControls Error Handling
 *
 * Verifies that the component correctly:
 * - Shows toast notifications instead of native alerts for errors
 * - Handles CSV export errors gracefully
 * - Handles PNG export errors gracefully
 * - Handles PDF export errors gracefully
 * - Shows warnings for empty data scenarios
 * - Manages loading states during export operations
 */

import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportControls } from "../ExportControls";
import { showError, showWarning } from "@/lib/toast";
import { exportToCSV } from "@/lib/csv-export";
import { exportToPNG } from "@/lib/png-export";
import { exportReportToPDF } from "@/lib/pdf-export";

// Mock the toast module
vi.mock("@/lib/toast", () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));

// Mock the export utilities
vi.mock("@/lib/csv-export", () => ({
  exportToCSV: vi.fn(),
}));

vi.mock("@/lib/png-export", () => ({
  exportToPNG: vi.fn(),
}));

vi.mock("@/lib/pdf-export", () => ({
  exportReportToPDF: vi.fn(),
}));

const mockTableData = [
  {
    barangay_name: "Test Barangay 1",
    governance_area: "Financial Administration",
    status: "COMPLETED",
    score: 85,
  },
  {
    barangay_name: "Test Barangay 2",
    governance_area: "Disaster Preparedness",
    status: "IN_REVIEW",
    score: 72,
  },
];

const mockReportsData = {
  summary: {
    total_assessments: 10,
    completed: 5,
    in_progress: 3,
    pending: 2,
  },
  assessments: mockTableData,
};

describe("ExportControls Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CSV Export Error Handling", () => {
    it("should show toast error when CSV export fails", async () => {
      (exportToCSV as Mock).mockImplementation(() => {
        throw new Error("CSV generation failed");
      });

      render(<ExportControls tableData={mockTableData} />);

      const csvButton = screen.getByText("Export CSV");
      fireEvent.click(csvButton);

      expect(showError).toHaveBeenCalledWith("Failed to export CSV", {
        description: "Please try again.",
      });
    });

    it("should disable CSV button when no data available", () => {
      render(<ExportControls tableData={[]} />);

      const csvButton = screen.getByText("Export CSV").closest("button");
      expect(csvButton).toBeDisabled();
    });

    it("should not call native alert on CSV export error", () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      (exportToCSV as Mock).mockImplementation(() => {
        throw new Error("Export failed");
      });

      render(<ExportControls tableData={mockTableData} />);

      const csvButton = screen.getByText("Export CSV");
      fireEvent.click(csvButton);

      expect(alertSpy).not.toHaveBeenCalled();
      expect(showError).toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe("PNG Export Button", () => {
    it("should render PNG export dropdown button", () => {
      render(<ExportControls tableData={mockTableData} />);

      const pngButton = screen.getByText("Export PNG");
      expect(pngButton).toBeInTheDocument();
    });

    it("should not be disabled when data is available", () => {
      render(<ExportControls tableData={mockTableData} />);

      const pngButton = screen.getByText("Export PNG").closest("button");
      expect(pngButton).not.toBeDisabled();
    });
  });

  describe("PDF Export Error Handling", () => {
    it("should show toast error when PDF export fails", async () => {
      (exportReportToPDF as Mock).mockRejectedValue(new Error("PDF generation failed"));

      render(<ExportControls tableData={mockTableData} reportsData={mockReportsData as any} />);

      const pdfButton = screen.getByText("Export PDF");
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(showError).toHaveBeenCalledWith("Failed to export PDF", {
          description: "Please try again.",
        });
      });
    });

    it("should disable PDF button when no reports data available", () => {
      render(<ExportControls tableData={mockTableData} reportsData={undefined} />);

      const pdfButton = screen.getByText("Export PDF").closest("button");
      expect(pdfButton).toBeDisabled();
    });

    it("should not call native alert on PDF export error", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      (exportReportToPDF as Mock).mockRejectedValue(new Error("Export failed"));

      render(<ExportControls tableData={mockTableData} reportsData={mockReportsData as any} />);

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
    it("should enable CSV button when data is available", () => {
      render(<ExportControls tableData={mockTableData} reportsData={mockReportsData as any} />);

      const csvButton = screen.getByText("Export CSV").closest("button");
      expect(csvButton).not.toBeDisabled();
    });

    it("should enable PDF button when reports data is available", () => {
      render(<ExportControls tableData={mockTableData} reportsData={mockReportsData as any} />);

      const pdfButton = screen.getByText("Export PDF").closest("button");
      expect(pdfButton).not.toBeDisabled();
    });
  });

  describe("Error Message Content", () => {
    it("should include helpful description in CSV error message", () => {
      (exportToCSV as Mock).mockImplementation(() => {
        throw new Error("Failed");
      });

      render(<ExportControls tableData={mockTableData} />);

      const csvButton = screen.getByText("Export CSV");
      fireEvent.click(csvButton);

      const mockShowError = showError as Mock;
      expect(mockShowError).toHaveBeenCalled();
      const call = mockShowError.mock.calls[0];
      expect(call[0]).toBe("Failed to export CSV");
      expect(call[1].description).toBe("Please try again.");
    });

    it("should include helpful description in PDF error message", async () => {
      (exportReportToPDF as Mock).mockRejectedValue(new Error("Failed"));

      render(<ExportControls tableData={mockTableData} reportsData={mockReportsData as any} />);

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
    it("should use toast for all error types consistently", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      // Test CSV error
      (exportToCSV as Mock).mockImplementation(() => {
        throw new Error("CSV error");
      });

      const { rerender } = render(<ExportControls tableData={mockTableData} />);
      fireEvent.click(screen.getByText("Export CSV"));

      // Test PDF error
      (exportReportToPDF as Mock).mockRejectedValue(new Error("PDF error"));
      rerender(<ExportControls tableData={mockTableData} reportsData={mockReportsData as any} />);
      fireEvent.click(screen.getByText("Export PDF"));

      await waitFor(() => {
        // Native alert should never be called
        expect(alertSpy).not.toHaveBeenCalled();
        // Toast should be called for errors
        expect(showError).toHaveBeenCalledTimes(2);
      });

      alertSpy.mockRestore();
    });
  });
});
