import { describe, expect, it } from "vitest";

import {
  resolvePdfAssessmentRows,
  resolvePdfAssessmentRecordCount,
  resolvePdfAssessmentSummary,
  shouldUseMunicipalOverviewData,
  type MunicipalData,
} from "@/lib/pdf-export";

const reportsData = {
  chart_data: {
    bar_chart: [],
    line_chart: [],
    pie_chart: [
      { status: "Pass", count: 0, percentage: 0 },
      { status: "Fail", count: 0, percentage: 0 },
      { status: "In Progress", count: 25, percentage: 100 },
    ],
  },
  map_data: { barangays: [] },
  table_data: {
    rows: [],
    total_count: 25,
    page: 1,
    page_size: 50,
  },
  metadata: {
    generated_at: "2026-04-13T09:10:00.000Z",
  },
};

describe("resolvePdfAssessmentSummary", () => {
  it("uses municipal compliance summary when it is available", () => {
    const municipalData: MunicipalData = {
      compliance_summary: {
        total_barangays: 25,
        assessed_barangays: 1,
        passed_barangays: 1,
        failed_barangays: 0,
        compliance_rate: 100,
        assessment_rate: 4,
        pending_mlgoo_approval: 0,
        in_progress: 24,
        workflow_breakdown: {
          not_started: 0,
          draft: 0,
          submitted: 0,
          in_review: 0,
          rework: 0,
          awaiting_validation: 24,
          awaiting_approval: 0,
          completed: 1,
        },
        stalled_assessments: 24,
        rework_rate: 0,
        weighted_progress: 96,
      },
    };

    expect(resolvePdfAssessmentSummary(reportsData as any, municipalData)).toEqual({
      totalAssessments: 1,
      passCount: 1,
      failCount: 0,
      passRate: 100,
      totalBarangays: 25,
    });
  });

  it("falls back to reports chart data when municipal data is unavailable", () => {
    expect(resolvePdfAssessmentSummary(reportsData as any)).toEqual({
      totalAssessments: 0,
      passCount: 0,
      failCount: 0,
      passRate: 0,
      totalBarangays: undefined,
    });
  });

  it("uses report data instead of municipal data when report-only filters are active", () => {
    const municipalData: MunicipalData = {
      compliance_summary: {
        total_barangays: 25,
        assessed_barangays: 1,
        passed_barangays: 1,
        failed_barangays: 0,
        compliance_rate: 100,
        assessment_rate: 4,
        pending_mlgoo_approval: 0,
        in_progress: 24,
        workflow_breakdown: {
          not_started: 0,
          draft: 0,
          submitted: 0,
          in_review: 0,
          rework: 0,
          awaiting_validation: 24,
          awaiting_approval: 0,
          completed: 1,
        },
        stalled_assessments: 24,
        rework_rate: 0,
        weighted_progress: 96,
      },
    };

    expect(resolvePdfAssessmentSummary(reportsData as any, municipalData, false)).toEqual({
      totalAssessments: 0,
      passCount: 0,
      failCount: 0,
      passRate: 0,
      totalBarangays: undefined,
    });
  });
});

describe("resolvePdfAssessmentRows", () => {
  it("uses municipal barangay statuses for accurate status and indicator counts", () => {
    const municipalData: MunicipalData = {
      barangay_statuses: {
        total_count: 2,
        barangays: [
          {
            barangay_id: 1,
            barangay_name: "Talas",
            assessment_id: 31,
            status: "COMPLETED",
            compliance_status: "PASSED",
            submitted_at: null,
            mlgoo_approved_at: null,
            overall_score: 100,
            has_capdev_insights: false,
            capdev_status: null,
            governance_areas_passed: 6,
            total_governance_areas: 6,
            pass_count: 80,
            conditional_count: 5,
            total_responses: 86,
          },
          {
            barangay_id: 2,
            barangay_name: "Lupuran",
            assessment_id: 32,
            status: "AWAITING_FINAL_VALIDATION",
            compliance_status: null,
            submitted_at: null,
            mlgoo_approved_at: null,
            overall_score: null,
            has_capdev_insights: false,
            capdev_status: null,
            governance_areas_passed: null,
            total_governance_areas: null,
            pass_count: null,
            conditional_count: null,
            total_responses: null,
          },
        ],
      },
    };

    expect(resolvePdfAssessmentRows(reportsData as any, municipalData)).toEqual([
      {
        barangay_id: 1,
        barangay_name: "Talas",
        status: "Pass",
        governance_areas_passed: 6,
        total_governance_areas: 6,
        indicators_passed: 85,
        total_indicators: 86,
      },
      {
        barangay_id: 2,
        barangay_name: "Lupuran",
        status: "In Progress",
        governance_areas_passed: null,
        total_governance_areas: null,
        indicators_passed: null,
        total_indicators: null,
      },
    ]);
  });

  it("normalizes report fallback rows with zero totals to N/A-ready null values", () => {
    const filteredReportsData = {
      ...reportsData,
      table_data: {
        ...reportsData.table_data,
        rows: [
          {
            barangay_id: 1,
            barangay_name: "Lupuran",
            status: "In Progress",
            governance_areas_passed: 0,
            total_governance_areas: 0,
            indicators_passed: 0,
            total_indicators: 0,
          },
        ],
      },
    };

    expect(resolvePdfAssessmentRows(filteredReportsData as any, undefined, false)).toEqual([
      {
        barangay_id: 1,
        barangay_name: "Lupuran",
        status: "In Progress",
        governance_areas_passed: null,
        total_governance_areas: null,
        indicators_passed: null,
        total_indicators: null,
      },
    ]);
  });
});

describe("shouldUseMunicipalOverviewData", () => {
  it("allows municipal data for year-only exports", () => {
    expect(shouldUseMunicipalOverviewData({ year: 2025 })).toBe(true);
  });

  it("prevents municipal data from overriding narrower report filters", () => {
    expect(shouldUseMunicipalOverviewData({ year: 2025, status: "Pass" })).toBe(false);
    expect(shouldUseMunicipalOverviewData({ year: 2025, barangay_id: [1] })).toBe(false);
    expect(shouldUseMunicipalOverviewData({ year: 2025, governance_area: ["Financial"] })).toBe(
      false
    );
    expect(shouldUseMunicipalOverviewData({ year: 2025, start_date: "2026-01-01" })).toBe(false);
  });
});

describe("resolvePdfAssessmentRecordCount", () => {
  it("uses municipal total count when PDF rows come from municipal barangay statuses", () => {
    const municipalData: MunicipalData = {
      barangay_statuses: {
        total_count: 25,
        barangays: [],
      },
    };

    expect(resolvePdfAssessmentRecordCount(reportsData as any, municipalData)).toBe(25);
  });
});
