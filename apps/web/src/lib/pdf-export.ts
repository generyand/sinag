import { ReportsDataResponse } from "@sinag/shared";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface FilterState {
  year?: number;
  start_date?: string;
  end_date?: string;
  governance_area?: string[];
  barangay_id?: number[];
  status?: string;
}

export interface ExportMetadata {
  dateRange?: {
    start: string;
    end: string;
  };
  generatedAt: string;
  generatedBy?: string;
}

/**
 * Exports a comprehensive report as a multi-page PDF with DILG branding
 * @param data The reports data containing charts, maps, and table data
 * @param filters Current filter state applied to the report
 * @param metadata Additional metadata for the report cover page
 */
export async function exportReportToPDF(
  data: ReportsDataResponse,
  filters: FilterState,
  metadata: ExportMetadata
): Promise<void> {
  try {
    // Initialize jsPDF (A4 portrait, pt units)
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - 2 * margin;

    let currentPage = 1;

    // Helper function to add header/footer to each page
    const addHeaderFooter = (pageNum: number) => {
      // Header
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text("DILG - Seal of Good Local Governance", margin, 20);

      // Footer
      pdf.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 20, { align: "center" });
      pdf.text(
        `Generated on ${new Date(metadata.generatedAt).toLocaleDateString()}`,
        pageWidth - margin,
        pageHeight - 20,
        { align: "right" }
      );
    };

    // ===== PAGE 1: Cover Page =====
    // DILG Branding Header
    pdf.setFontSize(24);
    pdf.setTextColor(0, 51, 102); // DILG Blue
    pdf.text("Department of the Interior", pageWidth / 2, 100, { align: "center" });
    pdf.text("and Local Government", pageWidth / 2, 130, { align: "center" });

    // Title
    pdf.setFontSize(28);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Assessment Reports", pageWidth / 2, 200, { align: "center" });

    // Subtitle
    pdf.setFontSize(14);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Seal of Good Local Governance for Barangays (SGLGB)", pageWidth / 2, 230, {
      align: "center",
    });

    // Metadata Section
    let yPos = 300;
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);

    // Date Range
    if (metadata.dateRange) {
      pdf.text(`Report Period:`, margin, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `${new Date(metadata.dateRange.start).toLocaleDateString()} - ${new Date(metadata.dateRange.end).toLocaleDateString()}`,
        margin + 120,
        yPos
      );
      yPos += 25;
      pdf.setFont("helvetica", "bold");
    }

    // Applied Filters
    pdf.text(`Applied Filters:`, margin, yPos);
    yPos += 20;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    const filterLines: string[] = [];
    if (filters.status) {
      filterLines.push(`• Status: ${filters.status}`);
    }
    if (filters.year) {
      filterLines.push(`• Assessment Year: ${filters.year}`);
    }
    if (filters.governance_area && filters.governance_area.length > 0) {
      filterLines.push(`• Governance Areas: ${filters.governance_area.join(", ")}`);
    }
    if (filters.barangay_id && filters.barangay_id.length > 0) {
      filterLines.push(`• Barangay IDs: ${filters.barangay_id.join(", ")}`);
    }
    if (filterLines.length === 0) {
      filterLines.push(`• No filters applied (showing all data)`);
    }

    filterLines.forEach((line) => {
      pdf.text(line, margin + 10, yPos);
      yPos += 18;
    });

    yPos += 20;

    // Generation Info
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(`Report Generated:`, margin, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    yPos += 20;
    pdf.text(`${new Date(metadata.generatedAt).toLocaleString()}`, margin + 10, yPos);

    if (metadata.generatedBy) {
      yPos += 18;
      pdf.text(`By: ${metadata.generatedBy}`, margin + 10, yPos);
    }

    // Summary Statistics
    yPos += 40;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(`Summary Statistics:`, margin, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    yPos += 20;

    const totalAssessments = data.table_data.total_count || 0;
    pdf.text(`• Total Assessments: ${totalAssessments}`, margin + 10, yPos);
    yPos += 18;

    const passCount = data.chart_data.pie_chart?.find((item) => item.status === "Pass")?.count || 0;
    const failCount = data.chart_data.pie_chart?.find((item) => item.status === "Fail")?.count || 0;
    const inProgressCount =
      data.chart_data.pie_chart?.find((item) => item.status === "In Progress")?.count || 0;

    pdf.text(`• Pass: ${passCount}`, margin + 10, yPos);
    yPos += 18;
    pdf.text(`• Fail: ${failCount}`, margin + 10, yPos);
    yPos += 18;
    pdf.text(`• In Progress: ${inProgressCount}`, margin + 10, yPos);

    // Add footer to cover page
    addHeaderFooter(currentPage);

    // ===== PAGES 2+: Chart Images =====
    const chartIds = [
      { id: "bar-chart-container", title: "Assessment Results by Area" },
      { id: "pie-chart-container", title: "Status Distribution" },
      { id: "line-chart-container", title: "Trends Over Time" },
      { id: "map-container", title: "Geographic Distribution" },
    ];

    for (const chart of chartIds) {
      const element = document.getElementById(chart.id);
      if (!element) {
        console.warn(`Element with ID "${chart.id}" not found, skipping...`);
        continue;
      }

      // Add new page
      pdf.addPage();
      currentPage++;

      // Add title
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.text(chart.title, pageWidth / 2, margin + 20, { align: "center" });

      // Capture chart as image
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Calculate position to center the image
        const xPos = margin;
        const yPos = margin + 50;

        // Check if image fits on page, otherwise scale down
        const maxHeight = pageHeight - margin * 2 - 100;
        const finalHeight = Math.min(imgHeight, maxHeight);
        const finalWidth = (finalHeight * canvas.width) / canvas.height;

        pdf.addImage(
          imgData,
          "PNG",
          xPos + (contentWidth - finalWidth) / 2,
          yPos,
          finalWidth,
          finalHeight
        );
      } catch (error) {
        console.error(`Failed to capture ${chart.id}:`, error);
        pdf.setFontSize(12);
        pdf.setTextColor(200, 0, 0);
        pdf.text(`Failed to capture chart image`, pageWidth / 2, pageHeight / 2, {
          align: "center",
        });
      }

      // Add header/footer
      addHeaderFooter(currentPage);
    }

    // ===== FINAL PAGE: Table Data =====
    pdf.addPage();
    currentPage++;

    // Add title
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.text("Assessment Data Table", pageWidth / 2, margin + 20, {
      align: "center",
    });

    // Table headers
    let tableYPos = margin + 60;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");

    const colWidths = {
      barangay: 180,
      area: 140,
      status: 80,
      score: 60,
    };

    const headerY = tableYPos;
    pdf.text("Barangay Name", margin, headerY);
    pdf.text("Governance Area", margin + colWidths.barangay, headerY);
    pdf.text("Status", margin + colWidths.barangay + colWidths.area, headerY);
    pdf.text(
      "Comp. Rate",
      margin + colWidths.barangay + colWidths.area + colWidths.status,
      headerY
    );

    // Header underline
    pdf.setLineWidth(1);
    pdf.line(margin, headerY + 5, pageWidth - margin, headerY + 5);

    tableYPos += 20;

    // Table rows
    pdf.setFont("helvetica", "normal");
    const rows = data.table_data.rows || [];
    const maxRowsPerPage = 30; // Approximate, adjust as needed
    let rowCount = 0;

    for (const row of rows) {
      // Check if we need a new page
      if (rowCount >= maxRowsPerPage) {
        pdf.addPage();
        currentPage++;
        addHeaderFooter(currentPage);

        tableYPos = margin + 40;
        rowCount = 0;

        // Repeat headers on new page
        pdf.setFont("helvetica", "bold");
        pdf.text("Barangay Name", margin, tableYPos);
        pdf.text("Governance Area", margin + colWidths.barangay, tableYPos);
        pdf.text("Status", margin + colWidths.barangay + colWidths.area, tableYPos);
        pdf.text(
          "Comp. Rate",
          margin + colWidths.barangay + colWidths.area + colWidths.status,
          tableYPos
        );
        pdf.line(margin, tableYPos + 5, pageWidth - margin, tableYPos + 5);
        tableYPos += 20;
        pdf.setFont("helvetica", "normal");
      }

      // Truncate long text to fit
      const barangayName =
        row.barangay_name.length > 25
          ? row.barangay_name.substring(0, 22) + "..."
          : row.barangay_name;
      const governanceArea =
        row.governance_area.length > 20
          ? row.governance_area.substring(0, 17) + "..."
          : row.governance_area;
      const scoreText =
        row.score !== null && row.score !== undefined ? row.score.toString() : "N/A";

      pdf.text(barangayName, margin, tableYPos);
      pdf.text(governanceArea, margin + colWidths.barangay, tableYPos);
      pdf.text(row.status, margin + colWidths.barangay + colWidths.area, tableYPos);
      pdf.text(
        scoreText,
        margin + colWidths.barangay + colWidths.area + colWidths.status,
        tableYPos
      );

      tableYPos += 15;
      rowCount++;
    }

    // Add header/footer to final page
    addHeaderFooter(currentPage);

    // ===== Download PDF =====
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const filename = `report_${timestamp}.pdf`;

    pdf.save(filename);
  } catch (error) {
    console.error("Error exporting PDF:", error);
    throw new Error("Failed to export PDF. Please try again.");
  }
}
