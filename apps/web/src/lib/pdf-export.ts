import {
  ReportsDataResponse,
  MunicipalComplianceSummary,
  AppSchemasMunicipalInsightsGovernanceAreaPerformance,
  FailingIndicator,
} from "@sinag/shared";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// ===== EXPORTED TYPE DEFINITIONS =====

export interface FilterState {
  year?: number;
  start_date?: string;
  end_date?: string;
  governance_area?: string[];
  barangay_id?: number[];
  status?: string;
}

// Re-export types from @sinag/shared for convenience
export type { MunicipalComplianceSummary, FailingIndicator };

// Alias for clearer naming in PDF context
export type GovernanceAreaPerformance = AppSchemasMunicipalInsightsGovernanceAreaPerformance;

// BBI Analytics types (not yet in shared package)
export interface BBIAnalyticsItem {
  bbi_id: number;
  bbi_name: string;
  bbi_abbreviation: string;
  average_compliance: number;
  highly_functional_count: number;
  moderately_functional_count: number;
  low_functional_count: number;
  total_barangays: number;
}

export interface MunicipalData {
  compliance_summary?: MunicipalComplianceSummary;
  governance_area_performance?: {
    areas: GovernanceAreaPerformance[];
    core_areas_pass_rate: number;
    essential_areas_pass_rate: number;
  };
  top_failing_indicators?: {
    indicators: FailingIndicator[];
    total_indicators_assessed: number;
  };
}

export interface BBIAnalyticsData {
  summary?: {
    total_assessments: number;
    overall_average_compliance: number;
  };
  bbi_breakdown?: BBIAnalyticsItem[];
}

export interface ExportMetadata {
  dateRange?: {
    start: string;
    end: string;
  };
  generatedAt: string;
  generatedBy?: string;
  municipalityName?: string;
  provinceName?: string;
  regionName?: string;
}

// ===== PDF CONFIGURATION CONSTANTS =====

// Layout Constants
const PDF_CONFIG = {
  // Page dimensions (A4 in points)
  pageFormat: "a4" as const,
  orientation: "portrait" as const,
  unit: "pt" as const,
  margin: 50,

  // Typography
  fontSize: {
    title: 28,
    sectionTitle: 18,
    heading: 12,
    body: 10,
    small: 9,
    tiny: 8,
    badge: 7,
  },

  // Layout measurements
  headerLineY: 35,
  footerLineY: 40,
  footerTextY: 25,
  sectionStartY: 90,
  decorativeBorderTop: 8,
  decorativeBorderGold: 3,

  // Table configuration
  table: {
    headerHeight: 28,
    rowHeight: 22,
    maxRowsPerPage: 22,
    borderRadius: 3,
  },

  // Card configuration
  card: {
    borderRadius: 4,
    largeRadius: 8,
    statCardHeight: 65,
  },

  // Chart configuration
  chart: {
    captureScale: 2,
    borderRadius: 5,
    padding: 10,
  },

  // Threshold values for status colors
  thresholds: {
    highPass: 70,
    mediumPass: 50,
    bbiHighFunctional: 75,
    bbiModerateFunctional: 50,
  },
} as const;

// DILG Brand Colors
const COLORS = {
  dilgBlue: [0, 51, 102] as const, // #003366
  dilgGold: [218, 165, 32] as const, // #DAA520
  darkGray: [51, 51, 51] as const, // #333333
  mediumGray: [102, 102, 102] as const, // #666666
  lightGray: [245, 245, 245] as const, // #F5F5F5
  tableHeaderBg: [0, 51, 102] as const, // Same as DILG Blue
  tableRowAlt: [248, 249, 250] as const, // Light alternating row
  passGreen: [34, 139, 34] as const, // #228B22
  failRed: [178, 34, 34] as const, // #B22222
  inProgressOrange: [255, 140, 0] as const, // #FF8C00
  white: [255, 255, 255] as const,
  coreBlue: [30, 90, 150] as const, // Lighter blue for core areas
  essentialPurple: [102, 51, 153] as const, // Purple for essential areas
  tableBorder: [230, 230, 230] as const,
};

// ===== TYPE DEFINITIONS =====
type RGBColor = readonly [number, number, number];
type MutableRGBColor = [number, number, number];

// ===== UTILITY FUNCTIONS =====

/**
 * Generate report reference number with format: SGLGB-YYYY-MMDD-XXXX
 */
function generateReportNumber(year?: number): string {
  const date = new Date();
  const yearPart = year || date.getFullYear();
  const monthPart = String(date.getMonth() + 1).padStart(2, "0");
  const dayPart = String(date.getDate()).padStart(2, "0");
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SGLGB-${yearPart}-${monthPart}${dayPart}-${randomPart}`;
}

/**
 * Get color based on rate thresholds
 */
function getRateColor(rate: number): MutableRGBColor {
  if (rate >= PDF_CONFIG.thresholds.highPass) {
    return [...COLORS.passGreen];
  } else if (rate >= PDF_CONFIG.thresholds.mediumPass) {
    return [...COLORS.inProgressOrange];
  }
  return [...COLORS.failRed];
}

/**
 * Get BBI compliance color based on functionality thresholds
 */
function getBBIColor(compliance: number): MutableRGBColor {
  if (compliance >= PDF_CONFIG.thresholds.bbiHighFunctional) {
    return [...COLORS.passGreen];
  } else if (compliance >= PDF_CONFIG.thresholds.bbiModerateFunctional) {
    return [...COLORS.inProgressOrange];
  }
  return [...COLORS.failRed];
}

/**
 * Get status color for pass/fail/in-progress
 */
function getStatusColor(status: string): RGBColor {
  switch (status.toLowerCase()) {
    case "pass":
    case "passed":
      return COLORS.passGreen;
    case "fail":
    case "failed":
      return COLORS.failRed;
    default:
      return COLORS.inProgressOrange;
  }
}

/**
 * Get area type color (core vs essential)
 */
function getAreaTypeColor(areaType: string): MutableRGBColor {
  return areaType === "CORE" ? [...COLORS.coreBlue] : [...COLORS.essentialPurple];
}

/**
 * Truncate text to fit within a character limit
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Exports a comprehensive report as a multi-page PDF with DILG branding
 * @param data The reports data containing charts, maps, and table data
 * @param filters Current filter state applied to the report
 * @param metadata Additional metadata for the report cover page
 * @param municipalData Optional municipal overview data for enhanced reporting
 * @param bbiData Optional BBI analytics data
 */
export async function exportReportToPDF(
  data: ReportsDataResponse,
  filters: FilterState,
  metadata: ExportMetadata,
  municipalData?: MunicipalData,
  bbiData?: BBIAnalyticsData
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
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;

    let currentPage = 1;
    const reportNumber = generateReportNumber(filters.year);

    // Helper function to draw a horizontal line
    const drawLine = (y: number, width?: number, color?: readonly [number, number, number]) => {
      pdf.setDrawColor(...(color || COLORS.dilgBlue));
      pdf.setLineWidth(1);
      const lineWidth = width || contentWidth;
      const xStart = (pageWidth - lineWidth) / 2;
      pdf.line(xStart, y, xStart + lineWidth, y);
    };

    // Helper function to add header/footer to each page
    const addHeaderFooter = (pageNum: number) => {
      // Header line
      pdf.setDrawColor(...COLORS.dilgBlue);
      pdf.setLineWidth(2);
      pdf.line(margin, 35, pageWidth - margin, 35);

      // Header text
      pdf.setFontSize(9);
      pdf.setTextColor(...COLORS.mediumGray);
      pdf.setFont("helvetica", "normal");
      pdf.text("DILG - Seal of Good Local Governance for Barangays (SGLGB)", margin, 25);
      pdf.text(reportNumber, pageWidth - margin, 25, { align: "right" });

      // Footer line
      pdf.setDrawColor(...COLORS.dilgBlue);
      pdf.setLineWidth(1);
      pdf.line(margin, pageHeight - 40, pageWidth - margin, pageHeight - 40);

      // Footer content
      pdf.setFontSize(8);
      pdf.setTextColor(...COLORS.mediumGray);

      // Left: Classification
      pdf.text("OFFICIAL REPORT", margin, pageHeight - 25);

      // Center: Page number
      pdf.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 25, { align: "center" });

      // Right: Date
      pdf.text(
        new Date(metadata.generatedAt).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        pageWidth - margin,
        pageHeight - 25,
        { align: "right" }
      );
    };

    // Helper function to add a new page with section title
    const addSectionPage = (title: string): number => {
      pdf.addPage();
      currentPage++;

      // Section title
      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.dilgBlue);
      pdf.setFont("helvetica", "bold");
      pdf.text(title, pageWidth / 2, 60, { align: "center" });

      // Decorative underline
      pdf.setDrawColor(...COLORS.dilgGold);
      pdf.setLineWidth(2);
      const titleWidth = pdf.getTextWidth(title);
      pdf.line((pageWidth - titleWidth) / 2 - 20, 70, (pageWidth + titleWidth) / 2 + 20, 70);

      addHeaderFooter(currentPage);
      return 90; // Return starting Y position for content
    };

    // ===== PAGE 1: Cover Page =====
    // Decorative top border
    pdf.setFillColor(...COLORS.dilgBlue);
    pdf.rect(0, 0, pageWidth, 8, "F");
    pdf.setFillColor(...COLORS.dilgGold);
    pdf.rect(0, 8, pageWidth, 3, "F");

    // DILG Branding Header
    pdf.setFontSize(11);
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.setFont("helvetica", "normal");
    pdf.text("Republic of the Philippines", pageWidth / 2, 50, { align: "center" });

    pdf.setFontSize(20);
    pdf.setTextColor(...COLORS.dilgBlue);
    pdf.setFont("helvetica", "bold");
    pdf.text("Department of the Interior", pageWidth / 2, 75, { align: "center" });
    pdf.text("and Local Government", pageWidth / 2, 97, { align: "center" });

    // Decorative line under department name
    drawLine(115, 280, COLORS.dilgGold);

    // Municipality info (if available)
    if (metadata.municipalityName) {
      pdf.setFontSize(12);
      pdf.setTextColor(...COLORS.mediumGray);
      pdf.setFont("helvetica", "normal");
      let locationText = `Municipality of ${metadata.municipalityName}`;
      if (metadata.provinceName) locationText += `, ${metadata.provinceName}`;
      if (metadata.regionName) locationText += ` (${metadata.regionName})`;
      pdf.text(locationText, pageWidth / 2, 135, { align: "center" });
    }

    // Title
    pdf.setFontSize(28);
    pdf.setTextColor(...COLORS.darkGray);
    pdf.setFont("helvetica", "bold");
    const titleY = metadata.municipalityName ? 175 : 160;
    pdf.text("SGLGB Assessment Report", pageWidth / 2, titleY, { align: "center" });

    // Assessment Year Badge
    const badgeY = titleY + 30;
    if (filters.year) {
      pdf.setFillColor(...COLORS.dilgBlue);
      const badgeWidth = 170;
      const badgeHeight = 36;
      const badgeX = (pageWidth - badgeWidth) / 2;
      pdf.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 6, 6, "F");
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Calendar Year ${filters.year}`, pageWidth / 2, badgeY + 23, { align: "center" });
    }

    // Report Reference Number Box
    const refBoxY = badgeY + 50;
    pdf.setFillColor(...COLORS.lightGray);
    pdf.roundedRect(margin + 100, refBoxY, contentWidth - 200, 45, 5, 5, "F");
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.setFont("helvetica", "normal");
    pdf.text("Report Reference Number", pageWidth / 2, refBoxY + 15, { align: "center" });
    pdf.setFontSize(14);
    pdf.setTextColor(...COLORS.dilgBlue);
    pdf.setFont("helvetica", "bold");
    pdf.text(reportNumber, pageWidth / 2, refBoxY + 35, { align: "center" });

    // Report Information Box
    const infoBoxY = refBoxY + 65;
    pdf.setFillColor(...COLORS.lightGray);
    pdf.roundedRect(margin, infoBoxY, contentWidth, 150, 8, 8, "F");

    let yPos = infoBoxY + 25;
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.dilgBlue);
    pdf.setFont("helvetica", "bold");
    pdf.text("Report Details", margin + 20, yPos);

    yPos += 6;
    pdf.setDrawColor(...COLORS.dilgBlue);
    pdf.setLineWidth(0.5);
    pdf.line(margin + 20, yPos, margin + 120, yPos);

    yPos += 20;
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.darkGray);

    // Two column layout for report details
    const col1X = margin + 20;
    const col2X = pageWidth / 2 + 20;

    // Column 1
    pdf.setFont("helvetica", "bold");
    pdf.text("Assessment Year:", col1X, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(filters.year?.toString() || "All Years", col1X + 95, yPos);

    // Column 2
    pdf.setFont("helvetica", "bold");
    pdf.text("Generated:", col2X, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      new Date(metadata.generatedAt).toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      col2X + 65,
      yPos
    );

    yPos += 18;
    pdf.setFont("helvetica", "bold");
    pdf.text("Status Filter:", col1X, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(filters.status || "All Statuses", col1X + 95, yPos);

    if (metadata.generatedBy) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Prepared by:", col2X, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(metadata.generatedBy, col2X + 65, yPos);
    }

    yPos += 18;
    if (filters.governance_area && filters.governance_area.length > 0) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Areas:", col1X, yPos);
      pdf.setFont("helvetica", "normal");
      const areasText =
        filters.governance_area.length > 3
          ? `${filters.governance_area.slice(0, 3).join(", ")}...`
          : filters.governance_area.join(", ");
      pdf.text(areasText, col1X + 95, yPos);
    }

    // Summary Statistics Section
    const statsY = infoBoxY + 175;
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.dilgBlue);
    pdf.setFont("helvetica", "bold");
    pdf.text("Assessment Summary", margin, statsY);

    // Calculate statistics
    const totalAssessments = data.table_data.total_count || 0;
    const passCount = data.chart_data.pie_chart?.find((item) => item.status === "Pass")?.count || 0;
    const failCount = data.chart_data.pie_chart?.find((item) => item.status === "Fail")?.count || 0;
    const passRate =
      totalAssessments > 0 ? ((passCount / totalAssessments) * 100).toFixed(1) : "0.0";

    // Stats cards layout - 4 cards
    const cardWidth = (contentWidth - 30) / 4;
    const cardHeight = 65;
    const cardY = statsY + 15;

    // Helper function to draw stat card
    const drawStatCard = (
      x: number,
      label: string,
      value: string,
      color: readonly [number, number, number]
    ) => {
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(...color);
      pdf.setLineWidth(2);
      pdf.roundedRect(x, cardY, cardWidth, cardHeight, 4, 4, "FD");

      pdf.setFontSize(20);
      pdf.setTextColor(...color);
      pdf.setFont("helvetica", "bold");
      pdf.text(value, x + cardWidth / 2, cardY + 30, { align: "center" });

      pdf.setFontSize(8);
      pdf.setTextColor(...COLORS.mediumGray);
      pdf.setFont("helvetica", "normal");
      pdf.text(label, x + cardWidth / 2, cardY + 50, { align: "center" });
    };

    drawStatCard(margin, "Total", totalAssessments.toString(), COLORS.dilgBlue);
    drawStatCard(margin + cardWidth + 10, "Passed", passCount.toString(), COLORS.passGreen);
    drawStatCard(margin + (cardWidth + 10) * 2, "Failed", failCount.toString(), COLORS.failRed);
    drawStatCard(margin + (cardWidth + 10) * 3, "Pass Rate", `${passRate}%`, COLORS.dilgBlue);

    // Decorative bottom border
    pdf.setFillColor(...COLORS.dilgGold);
    pdf.rect(0, pageHeight - 11, pageWidth, 3, "F");
    pdf.setFillColor(...COLORS.dilgBlue);
    pdf.rect(0, pageHeight - 8, pageWidth, 8, "F");

    addHeaderFooter(currentPage);

    // ===== PAGE 2: Executive Summary =====
    let execY = addSectionPage("Executive Summary");

    // Overall Compliance Rate - Large Display
    pdf.setFillColor(...COLORS.lightGray);
    pdf.roundedRect(margin, execY, contentWidth, 100, 8, 8, "F");

    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.setFont("helvetica", "normal");
    pdf.text("Overall Compliance Rate", pageWidth / 2, execY + 25, { align: "center" });

    const complianceRate =
      municipalData?.compliance_summary?.compliance_rate ?? parseFloat(passRate);
    const rateColor = getRateColor(complianceRate);

    pdf.setFontSize(48);
    pdf.setTextColor(rateColor[0], rateColor[1], rateColor[2]);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${complianceRate.toFixed(1)}%`, pageWidth / 2, execY + 70, { align: "center" });

    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `${passCount} of ${totalAssessments} barangays passed the SGLGB assessment`,
      pageWidth / 2,
      execY + 90,
      { align: "center" }
    );

    execY += 120;

    // Assessment Coverage
    if (municipalData?.compliance_summary) {
      const summary = municipalData.compliance_summary;

      pdf.setFontSize(12);
      pdf.setTextColor(...COLORS.dilgBlue);
      pdf.setFont("helvetica", "bold");
      pdf.text("Assessment Coverage", margin, execY);

      execY += 20;
      pdf.setFillColor(...COLORS.lightGray);
      pdf.roundedRect(margin, execY, contentWidth / 2 - 10, 70, 5, 5, "F");
      pdf.roundedRect(margin + contentWidth / 2 + 10, execY, contentWidth / 2 - 10, 70, 5, 5, "F");

      // Left box - Total Barangays
      pdf.setFontSize(10);
      pdf.setTextColor(...COLORS.mediumGray);
      pdf.text("Total Barangays in Municipality", margin + contentWidth / 4 - 5, execY + 20, {
        align: "center",
      });
      pdf.setFontSize(28);
      pdf.setTextColor(...COLORS.dilgBlue);
      pdf.setFont("helvetica", "bold");
      pdf.text(summary.total_barangays.toString(), margin + contentWidth / 4 - 5, execY + 50, {
        align: "center",
      });

      // Right box - Assessment Rate
      pdf.setFontSize(10);
      pdf.setTextColor(...COLORS.mediumGray);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        "Assessment Completion Rate",
        margin + contentWidth / 2 + 10 + contentWidth / 4 - 5,
        execY + 20,
        { align: "center" }
      );
      pdf.setFontSize(28);
      pdf.setTextColor(...COLORS.passGreen);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `${summary.assessment_rate.toFixed(1)}%`,
        margin + contentWidth / 2 + 10 + contentWidth / 4 - 5,
        execY + 50,
        { align: "center" }
      );

      execY += 90;

      // Rework Statistics (if available)
      if (summary.rework_rate !== undefined && summary.rework_rate > 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(...COLORS.dilgBlue);
        pdf.setFont("helvetica", "bold");
        pdf.text("Quality Metrics", margin, execY);

        execY += 20;
        pdf.setFontSize(10);
        pdf.setTextColor(...COLORS.darkGray);
        pdf.setFont("helvetica", "normal");

        pdf.setFillColor(...COLORS.dilgBlue);
        pdf.circle(margin + 8, execY - 3, 2, "F");
        pdf.text(
          `Rework Rate: ${summary.rework_rate.toFixed(1)}% of assessments required revision`,
          margin + 18,
          execY
        );

        execY += 20;
      }
    }

    // 3+1 Classification Summary
    if (municipalData?.governance_area_performance) {
      const gaPerf = municipalData.governance_area_performance;

      execY += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(...COLORS.dilgBlue);
      pdf.setFont("helvetica", "bold");
      pdf.text("3+1 Governance Area Performance", margin, execY);

      execY += 20;
      pdf.setFillColor(...COLORS.lightGray);
      pdf.roundedRect(margin, execY, contentWidth, 80, 5, 5, "F");

      // Core Areas
      pdf.setFontSize(10);
      pdf.setTextColor(...COLORS.coreBlue);
      pdf.setFont("helvetica", "bold");
      pdf.text("Core Areas (3 Required)", margin + 20, execY + 25);
      pdf.setFontSize(24);
      pdf.text(`${gaPerf.core_areas_pass_rate.toFixed(1)}%`, margin + 20, execY + 55);
      pdf.setFontSize(9);
      pdf.setTextColor(...COLORS.mediumGray);
      pdf.setFont("helvetica", "normal");
      pdf.text("Average Pass Rate", margin + 20, execY + 70);

      // Essential Areas
      pdf.setFontSize(10);
      pdf.setTextColor(...COLORS.essentialPurple);
      pdf.setFont("helvetica", "bold");
      pdf.text("Essential Areas (+1 Required)", margin + contentWidth / 2, execY + 25);
      pdf.setFontSize(24);
      pdf.text(
        `${gaPerf.essential_areas_pass_rate.toFixed(1)}%`,
        margin + contentWidth / 2,
        execY + 55
      );
      pdf.setFontSize(9);
      pdf.setTextColor(...COLORS.mediumGray);
      pdf.setFont("helvetica", "normal");
      pdf.text("Average Pass Rate", margin + contentWidth / 2, execY + 70);
    }

    // ===== PAGE 3: Governance Area Performance Matrix =====
    if (
      municipalData?.governance_area_performance?.areas &&
      municipalData.governance_area_performance.areas.length > 0
    ) {
      let matrixY = addSectionPage("Governance Area Performance");

      const areas = municipalData.governance_area_performance.areas;

      // Table setup
      const colW = {
        name: 180,
        type: 70,
        passed: 70,
        failed: 70,
        rate: 90,
      };
      const rowH = 22;
      const headerH = 28;

      // Header
      pdf.setFillColor(...COLORS.tableHeaderBg);
      pdf.roundedRect(margin, matrixY, contentWidth, headerH, 3, 3, "F");

      pdf.setFontSize(9);
      pdf.setTextColor(...COLORS.white);
      pdf.setFont("helvetica", "bold");

      const hY = matrixY + headerH / 2 + 3;
      pdf.text("Governance Area", margin + 10, hY);
      pdf.text("Type", margin + colW.name + 10, hY);
      pdf.text("Passed", margin + colW.name + colW.type + 10, hY);
      pdf.text("Failed", margin + colW.name + colW.type + colW.passed + 10, hY);
      pdf.text("Pass Rate", margin + colW.name + colW.type + colW.passed + colW.failed + 10, hY);

      matrixY += headerH;

      // Rows
      areas.forEach((area, index) => {
        if (index % 2 === 1) {
          pdf.setFillColor(...COLORS.tableRowAlt);
          pdf.rect(margin, matrixY, contentWidth, rowH, "F");
        }

        pdf.setDrawColor(...COLORS.tableBorder);
        pdf.setLineWidth(0.5);
        pdf.line(margin, matrixY + rowH, margin + contentWidth, matrixY + rowH);

        const textY = matrixY + rowH / 2 + 3;
        pdf.setFontSize(9);
        pdf.setTextColor(...COLORS.darkGray);
        pdf.setFont("helvetica", "normal");

        // Area name (truncate if needed)
        const areaName = truncateText(area.name, 28);
        pdf.text(areaName, margin + 10, textY);

        // Type badge
        const typeColor = getAreaTypeColor(area.area_type);
        pdf.setFillColor(typeColor[0], typeColor[1], typeColor[2]);
        pdf.roundedRect(margin + colW.name + 5, textY - 8, 55, 12, 2, 2, "F");
        pdf.setTextColor(...COLORS.white);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.text(area.area_type, margin + colW.name + 32, textY - 1, { align: "center" });

        // Counts
        pdf.setTextColor(...COLORS.passGreen);
        pdf.setFontSize(9);
        pdf.text(area.passed_count.toString(), margin + colW.name + colW.type + 30, textY, {
          align: "center",
        });

        pdf.setTextColor(...COLORS.failRed);
        pdf.text(
          area.failed_count.toString(),
          margin + colW.name + colW.type + colW.passed + 30,
          textY,
          { align: "center" }
        );

        // Pass rate with color
        const areaRateColor = getRateColor(area.pass_rate);
        pdf.setTextColor(areaRateColor[0], areaRateColor[1], areaRateColor[2]);
        pdf.setFont("helvetica", "bold");
        pdf.text(
          `${area.pass_rate.toFixed(1)}%`,
          margin + colW.name + colW.type + colW.passed + colW.failed + 45,
          textY,
          { align: "center" }
        );

        matrixY += rowH;
      });

      // Table border
      pdf.setDrawColor(...COLORS.dilgBlue);
      pdf.setLineWidth(1);
      pdf.roundedRect(
        margin,
        matrixY - areas.length * rowH - headerH,
        contentWidth,
        areas.length * rowH + headerH,
        3,
        3,
        "S"
      );
    }

    // ===== PAGE 4: Top Failing Indicators =====
    if (
      municipalData?.top_failing_indicators?.indicators &&
      municipalData.top_failing_indicators.indicators.length > 0
    ) {
      let indicatorsY = addSectionPage("Top Failing Indicators");

      const indicators = municipalData.top_failing_indicators.indicators.slice(0, 10);

      pdf.setFontSize(10);
      pdf.setTextColor(...COLORS.mediumGray);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        "These indicators have the highest failure rates and may require targeted capacity development interventions.",
        margin,
        indicatorsY
      );

      indicatorsY += 25;

      // Table setup
      const colW = {
        code: 70,
        name: 200,
        area: 100,
        failRate: 80,
      };
      const rowH = 28;
      const headerH = 28;

      // Header
      pdf.setFillColor(...COLORS.tableHeaderBg);
      pdf.roundedRect(margin, indicatorsY, contentWidth, headerH, 3, 3, "F");

      pdf.setFontSize(9);
      pdf.setTextColor(...COLORS.white);
      pdf.setFont("helvetica", "bold");

      const hY = indicatorsY + headerH / 2 + 3;
      pdf.text("Code", margin + 10, hY);
      pdf.text("Indicator Name", margin + colW.code + 10, hY);
      pdf.text("Gov. Area", margin + colW.code + colW.name + 10, hY);
      pdf.text("Fail Rate", margin + colW.code + colW.name + colW.area + 10, hY);

      indicatorsY += headerH;

      // Rows
      indicators.forEach((indicator, index) => {
        if (index % 2 === 1) {
          pdf.setFillColor(...COLORS.tableRowAlt);
          pdf.rect(margin, indicatorsY, contentWidth, rowH, "F");
        }

        pdf.setDrawColor(...COLORS.tableBorder);
        pdf.setLineWidth(0.5);
        pdf.line(margin, indicatorsY + rowH, margin + contentWidth, indicatorsY + rowH);

        const textY = indicatorsY + rowH / 2 + 3;
        pdf.setFontSize(8);
        pdf.setTextColor(...COLORS.darkGray);
        pdf.setFont("helvetica", "normal");

        // Code
        pdf.setFont("helvetica", "bold");
        pdf.text(indicator.indicator_code, margin + 10, textY);

        // Name (truncate if needed)
        pdf.setFont("helvetica", "normal");
        const indicatorName = truncateText(indicator.indicator_name, 35);
        pdf.text(indicatorName, margin + colW.code + 10, textY);

        // Governance Area (truncate)
        const areaName = truncateText(indicator.governance_area, 15);
        pdf.text(areaName, margin + colW.code + colW.name + 10, textY);

        // Fail rate badge
        pdf.setFillColor(...COLORS.failRed);
        pdf.roundedRect(
          margin + colW.code + colW.name + colW.area + 5,
          textY - 8,
          50,
          14,
          3,
          3,
          "F"
        );
        pdf.setTextColor(...COLORS.white);
        pdf.setFont("helvetica", "bold");
        pdf.text(
          `${indicator.fail_rate.toFixed(1)}%`,
          margin + colW.code + colW.name + colW.area + 30,
          textY,
          { align: "center" }
        );

        indicatorsY += rowH;
      });

      // Table border
      pdf.setDrawColor(...COLORS.dilgBlue);
      pdf.setLineWidth(1);
      pdf.roundedRect(
        margin,
        indicatorsY - indicators.length * rowH - headerH,
        contentWidth,
        indicators.length * rowH + headerH,
        3,
        3,
        "S"
      );

      // Summary note
      indicatorsY += 15;
      pdf.setFontSize(9);
      pdf.setTextColor(...COLORS.mediumGray);
      pdf.setFont("helvetica", "italic");
      pdf.text(
        `Total indicators assessed: ${municipalData.top_failing_indicators.total_indicators_assessed}`,
        pageWidth - margin,
        indicatorsY,
        { align: "right" }
      );
    }

    // ===== PAGE 5: BBI Compliance (if available) =====
    if (bbiData?.bbi_breakdown && bbiData.bbi_breakdown.length > 0) {
      let bbiY = addSectionPage("BBI Compliance Status (DILG MC 2024-417)");

      // Overall BBI Summary
      if (bbiData.summary) {
        pdf.setFillColor(...COLORS.lightGray);
        pdf.roundedRect(margin, bbiY, contentWidth, 60, 5, 5, "F");

        pdf.setFontSize(10);
        pdf.setTextColor(...COLORS.mediumGray);
        pdf.text("Overall BBI Compliance Rate", pageWidth / 2, bbiY + 20, { align: "center" });

        pdf.setFontSize(32);
        const bbiColor = getBBIColor(bbiData.summary.overall_average_compliance);
        pdf.setTextColor(bbiColor[0], bbiColor[1], bbiColor[2]);
        pdf.setFont("helvetica", "bold");
        pdf.text(
          `${bbiData.summary.overall_average_compliance.toFixed(1)}%`,
          pageWidth / 2,
          bbiY + 48,
          { align: "center" }
        );

        bbiY += 80;
      }

      // BBI Breakdown Table
      const colW = {
        bbi: 120,
        compliance: 80,
        high: 70,
        moderate: 80,
        low: 70,
      };
      const rowH = 25;
      const headerH = 28;

      // Header
      pdf.setFillColor(...COLORS.tableHeaderBg);
      pdf.roundedRect(margin, bbiY, contentWidth, headerH, 3, 3, "F");

      pdf.setFontSize(8);
      pdf.setTextColor(...COLORS.white);
      pdf.setFont("helvetica", "bold");

      const hY = bbiY + headerH / 2 + 3;
      pdf.text("BBI", margin + 10, hY);
      pdf.text("Avg. Compliance", margin + colW.bbi + 5, hY);
      pdf.text("Highly Func.", margin + colW.bbi + colW.compliance + 5, hY);
      pdf.text("Mod. Func.", margin + colW.bbi + colW.compliance + colW.high + 5, hY);
      pdf.text(
        "Low Func.",
        margin + colW.bbi + colW.compliance + colW.high + colW.moderate + 5,
        hY
      );

      bbiY += headerH;

      // Rows
      bbiData.bbi_breakdown.forEach((bbi, index) => {
        if (index % 2 === 1) {
          pdf.setFillColor(...COLORS.tableRowAlt);
          pdf.rect(margin, bbiY, contentWidth, rowH, "F");
        }

        pdf.setDrawColor(...COLORS.tableBorder);
        pdf.setLineWidth(0.5);
        pdf.line(margin, bbiY + rowH, margin + contentWidth, bbiY + rowH);

        const textY = bbiY + rowH / 2 + 3;
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");

        // BBI Name with abbreviation
        pdf.setTextColor(...COLORS.darkGray);
        pdf.setFont("helvetica", "bold");
        pdf.text(bbi.bbi_abbreviation, margin + 10, textY);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        const bbiName = truncateText(bbi.bbi_name, 15);
        pdf.text(bbiName, margin + 45, textY);

        // Compliance rate
        pdf.setFontSize(8);
        const compColor = getBBIColor(bbi.average_compliance);
        pdf.setTextColor(compColor[0], compColor[1], compColor[2]);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${bbi.average_compliance.toFixed(1)}%`, margin + colW.bbi + 35, textY, {
          align: "center",
        });

        // Functionality counts
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...COLORS.passGreen);
        pdf.text(
          bbi.highly_functional_count.toString(),
          margin + colW.bbi + colW.compliance + 30,
          textY,
          { align: "center" }
        );

        pdf.setTextColor(...COLORS.inProgressOrange);
        pdf.text(
          bbi.moderately_functional_count.toString(),
          margin + colW.bbi + colW.compliance + colW.high + 30,
          textY,
          { align: "center" }
        );

        pdf.setTextColor(...COLORS.failRed);
        pdf.text(
          bbi.low_functional_count.toString(),
          margin + colW.bbi + colW.compliance + colW.high + colW.moderate + 30,
          textY,
          { align: "center" }
        );

        bbiY += rowH;
      });

      // Table border
      pdf.setDrawColor(...COLORS.dilgBlue);
      pdf.setLineWidth(1);
      pdf.roundedRect(
        margin,
        bbiY - bbiData.bbi_breakdown.length * rowH - headerH,
        contentWidth,
        bbiData.bbi_breakdown.length * rowH + headerH,
        3,
        3,
        "S"
      );

      // Legend
      bbiY += 15;
      pdf.setFontSize(8);
      pdf.setTextColor(...COLORS.mediumGray);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        "Legend: Highly Functional (75%+) | Moderately Functional (50-74%) | Low Functional (<50%)",
        margin,
        bbiY
      );
    }

    // ===== Chart Pages =====
    const chartIds = [
      { id: "bar-chart-container", title: "Assessment Results by Governance Area" },
      { id: "pie-chart-container", title: "Overall Status Distribution" },
      { id: "line-chart-container", title: "Assessment Trends Over Time" },
      { id: "map-container", title: "Geographic Distribution of Assessments" },
    ];

    for (const chart of chartIds) {
      const element = document.getElementById(chart.id);
      if (!element) {
        console.warn(`Element with ID "${chart.id}" not found, skipping...`);
        continue;
      }

      const chartY = addSectionPage(chart.title);

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

        // Check if image fits on page, otherwise scale down
        const maxHeight = pageHeight - margin - 100 - chartY;
        const finalHeight = Math.min(imgHeight, maxHeight);
        const finalWidth = (finalHeight * canvas.width) / canvas.height;

        // Add a subtle border around the chart
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(...COLORS.tableBorder);
        pdf.setLineWidth(1);
        const chartBoxX = margin + (contentWidth - finalWidth) / 2 - 10;
        const chartBoxY = chartY - 10;
        pdf.roundedRect(chartBoxX, chartBoxY, finalWidth + 20, finalHeight + 20, 5, 5, "FD");

        pdf.addImage(
          imgData,
          "PNG",
          margin + (contentWidth - finalWidth) / 2,
          chartY,
          finalWidth,
          finalHeight
        );
      } catch (error) {
        console.error(`Failed to capture ${chart.id}:`, error);
        pdf.setFontSize(12);
        pdf.setTextColor(...COLORS.failRed);
        pdf.text("Failed to capture chart image", pageWidth / 2, pageHeight / 2, {
          align: "center",
        });
      }
    }

    // ===== Barangay Assessment Table =====
    let tableY = addSectionPage("Barangay Assessment Details");

    // Table configuration - Enhanced columns
    const colWidths = {
      barangay: 160,
      status: 90,
      areas: 90,
      indicators: 100,
    };
    const tableStartX = margin;
    const rowHeight = 22;
    const headerHeight = 28;

    // Helper function to draw table header
    const drawTableHeader = (startY: number): number => {
      // Header background
      pdf.setFillColor(...COLORS.tableHeaderBg);
      pdf.roundedRect(tableStartX, startY, contentWidth, headerHeight, 3, 3, "F");

      // Header text
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");

      const headerY = startY + headerHeight / 2 + 3;
      pdf.text("Barangay", tableStartX + 10, headerY);
      pdf.text("Status", tableStartX + colWidths.barangay + 10, headerY);
      pdf.text("Areas", tableStartX + colWidths.barangay + colWidths.status + 10, headerY);
      pdf.text(
        "Indicators",
        tableStartX + colWidths.barangay + colWidths.status + colWidths.areas + 10,
        headerY
      );

      return startY + headerHeight;
    };

    // Draw initial table header
    let tableYPos = drawTableHeader(tableY);
    const rows = data.table_data.rows || [];
    const maxRowsPerPage = 22;
    let rowCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Check if we need a new page
      if (rowCount >= maxRowsPerPage) {
        pdf.addPage();
        currentPage++;
        addHeaderFooter(currentPage);

        // Continue table header
        pdf.setFontSize(10);
        pdf.setTextColor(...COLORS.mediumGray);
        pdf.setFont("helvetica", "italic");
        pdf.text("Barangay Assessment Details (continued)", margin, 55);

        tableYPos = drawTableHeader(65);
        rowCount = 0;
      }

      // Alternating row background
      if (rowCount % 2 === 1) {
        pdf.setFillColor(...COLORS.tableRowAlt);
        pdf.rect(tableStartX, tableYPos, contentWidth, rowHeight, "F");
      }

      // Row border
      pdf.setDrawColor(...COLORS.tableBorder);
      pdf.setLineWidth(0.5);
      pdf.line(
        tableStartX,
        tableYPos + rowHeight,
        tableStartX + contentWidth,
        tableYPos + rowHeight
      );

      // Cell text
      pdf.setFontSize(8);
      pdf.setTextColor(...COLORS.darkGray);
      pdf.setFont("helvetica", "normal");

      const textY = tableYPos + rowHeight / 2 + 3;

      // Barangay name (truncate if too long, with null safety)
      const barangayName = truncateText(row.barangay_name || "Unknown", 22);
      pdf.text(barangayName, tableStartX + 10, textY);

      // Status with colored badge
      const statusColor = getStatusColor(row.status || "In Progress");
      const statusText = row.status || "In Progress";
      const statusWidth = pdf.getTextWidth(statusText) + 12;
      const statusX = tableStartX + colWidths.barangay + 10;

      pdf.setFillColor(...statusColor);
      pdf.roundedRect(statusX - 3, textY - 8, statusWidth, 12, 2, 2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(statusText, statusX + 3, textY - 1);

      // Governance Areas Passed
      pdf.setTextColor(...COLORS.darkGray);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      const areasText =
        row.governance_areas_passed !== null && row.total_governance_areas !== null
          ? `${row.governance_areas_passed}/${row.total_governance_areas}`
          : "N/A";
      pdf.text(areasText, tableStartX + colWidths.barangay + colWidths.status + 25, textY, {
        align: "center",
      });

      // Indicators Passed
      const indicatorsText =
        row.indicators_passed !== null && row.total_indicators !== null
          ? `${row.indicators_passed}/${row.total_indicators}`
          : "N/A";
      pdf.text(
        indicatorsText,
        tableStartX + colWidths.barangay + colWidths.status + colWidths.areas + 45,
        textY,
        { align: "center" }
      );

      tableYPos += rowHeight;
      rowCount++;
    }

    // Table border
    pdf.setDrawColor(...COLORS.dilgBlue);
    pdf.setLineWidth(1);
    const tableEndY = tableY + headerHeight + Math.min(rows.length, maxRowsPerPage) * rowHeight;
    pdf.roundedRect(tableStartX, tableY, contentWidth, tableEndY - tableY, 3, 3, "S");

    // Total records footer
    tableYPos += 10;
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.setFont("helvetica", "italic");
    pdf.text(
      `Total Records: ${data.table_data.total_count || rows.length}`,
      pageWidth - margin,
      tableYPos,
      { align: "right" }
    );

    // ===== FINAL PAGE: Certification & Disclaimers =====
    pdf.addPage();
    currentPage++;

    // Section title
    pdf.setFontSize(18);
    pdf.setTextColor(...COLORS.dilgBlue);
    pdf.setFont("helvetica", "bold");
    pdf.text("Certification & Disclaimers", pageWidth / 2, 60, { align: "center" });

    // Decorative underline
    pdf.setDrawColor(...COLORS.dilgGold);
    pdf.setLineWidth(2);
    pdf.line((pageWidth - 200) / 2, 70, (pageWidth + 200) / 2, 70);

    let certY = 100;

    // Certification Section
    pdf.setFillColor(...COLORS.lightGray);
    pdf.roundedRect(margin, certY, contentWidth, 180, 8, 8, "F");

    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.dilgBlue);
    pdf.setFont("helvetica", "bold");
    pdf.text("Report Certification", margin + 20, certY + 25);

    certY += 45;
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.darkGray);
    pdf.setFont("helvetica", "normal");

    // Signature lines
    const sigWidth = (contentWidth - 60) / 3;

    // Prepared by
    pdf.text("Prepared by:", margin + 20, certY);
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(...COLORS.darkGray);
    pdf.line(margin + 20, certY + 35, margin + 20 + sigWidth - 20, certY + 35);
    pdf.setFontSize(8);
    pdf.text("Signature over Printed Name", margin + 20, certY + 45);
    pdf.text("Date: _______________", margin + 20, certY + 60);

    // Reviewed by
    pdf.setFontSize(10);
    pdf.text("Reviewed by:", margin + sigWidth + 30, certY);
    pdf.line(
      margin + sigWidth + 30,
      certY + 35,
      margin + sigWidth + 30 + sigWidth - 20,
      certY + 35
    );
    pdf.setFontSize(8);
    pdf.text("Validator", margin + sigWidth + 30, certY + 45);
    pdf.text("Date: _______________", margin + sigWidth + 30, certY + 60);

    // Approved by
    pdf.setFontSize(10);
    pdf.text("Approved by:", margin + 2 * sigWidth + 40, certY);
    pdf.line(
      margin + 2 * sigWidth + 40,
      certY + 35,
      margin + 2 * sigWidth + 40 + sigWidth - 20,
      certY + 35
    );
    pdf.setFontSize(8);
    pdf.text("MLGOO-DILG", margin + 2 * sigWidth + 40, certY + 45);
    pdf.text("Date: _______________", margin + 2 * sigWidth + 40, certY + 60);

    // Data Quality Statement
    certY = 300;
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.dilgBlue);
    pdf.setFont("helvetica", "bold");
    pdf.text("Data Quality Statement", margin, certY);

    certY += 20;
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.darkGray);
    pdf.setFont("helvetica", "normal");

    const dataQualityText = [
      "This report is based on data submitted by Barangay Local Government Units (BLGUs) through the",
      "SINAG platform. All data has been validated by DILG-assigned Assessors and Validators following",
      "the SGLGB Assessment Guidelines.",
      "",
      `Assessment Period: ${filters.year ? `Calendar Year ${filters.year}` : "All available periods"}`,
      `Data Extraction: ${new Date(metadata.generatedAt).toLocaleString("en-PH")}`,
      `Total Records: ${data.table_data.total_count || 0}`,
      `Report Reference: ${reportNumber}`,
    ];

    dataQualityText.forEach((line) => {
      pdf.text(line, margin, certY);
      certY += 14;
    });

    // Disclaimer
    certY += 20;
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.dilgBlue);
    pdf.setFont("helvetica", "bold");
    pdf.text("Disclaimer", margin, certY);

    certY += 20;
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.darkGray);
    pdf.setFont("helvetica", "normal");

    const disclaimerText = [
      "This report is generated for official DILG use only. Information contained herein is subject to",
      "verification and may be updated pending final MLGOO approval. The assessment results reflect the",
      "status at the time of data extraction and may not represent real-time conditions.",
      "",
      "Methodology: Assessments follow DILG Memorandum Circular guidelines for SGLGB evaluation.",
      "Classification: Pass/Fail determined using the 3+1 governance area algorithm.",
      "Data Source: SINAG Platform - SGLGB Assessment Module",
    ];

    disclaimerText.forEach((line) => {
      pdf.text(line, margin, certY);
      certY += 14;
    });

    // Confidentiality Notice
    certY += 20;
    pdf.setFillColor(...COLORS.dilgBlue);
    pdf.roundedRect(margin, certY, contentWidth, 40, 5, 5, "F");

    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.white);
    pdf.setFont("helvetica", "bold");
    pdf.text("CONFIDENTIALITY NOTICE", pageWidth / 2, certY + 15, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(
      "This document contains official government information. Unauthorized reproduction or distribution is prohibited.",
      pageWidth / 2,
      certY + 30,
      { align: "center" }
    );

    addHeaderFooter(currentPage);

    // ===== Download PDF =====
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const filename = `SGLGB_Assessment_Report_${reportNumber}_${timestamp}.pdf`;

    pdf.save(filename);
  } catch (error) {
    console.error("Error exporting PDF:", error);
    throw new Error("Failed to export PDF. Please try again.");
  }
}
