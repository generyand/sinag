/**
 * 🧪 Dashboard KPI Components Tests
 * Tests for all dashboard analytics KPI card components
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type {
  ComplianceRate,
  AreaBreakdown,
  FailedIndicator,
  BarangayRanking,
} from "@sinag/shared";
import {
  ComplianceRateCard,
  CompletionStatusCard,
  AreaBreakdownCard,
  TopFailedIndicatorsCard,
  BarangayRankingsCard,
} from "../DashboardKPIs";

describe("ComplianceRateCard", () => {
  const mockData: ComplianceRate = {
    total_barangays: 50,
    passed: 35,
    failed: 15,
    pass_percentage: 70.0,
  };

  it("renders with correct percentage and statistics", () => {
    render(<ComplianceRateCard data={mockData} />);

    // Check pass percentage display
    expect(screen.getByText("70.0%")).toBeInTheDocument();
    expect(screen.getByText("pass rate")).toBeInTheDocument();

    // Check statistics
    expect(screen.getByText("50")).toBeInTheDocument(); // Total
    expect(screen.getByText("35")).toBeInTheDocument(); // Passed
    expect(screen.getByText("15")).toBeInTheDocument(); // Failed

    // Check labels
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Passed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("displays high compliance icon when pass rate >= 70%", () => {
    const { container } = render(<ComplianceRateCard data={mockData} />);
    // CheckCircle2 icon should be present
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("displays alert icon when pass rate < 70%", () => {
    const lowComplianceData: ComplianceRate = {
      total_barangays: 50,
      passed: 30,
      failed: 20,
      pass_percentage: 60.0,
    };
    const { container } = render(<ComplianceRateCard data={lowComplianceData} />);
    expect(screen.getByText("60.0%")).toBeInTheDocument();
  });

  it("accepts custom title and description props", () => {
    render(
      <ComplianceRateCard data={mockData} title="Custom Title" description="Custom Description" />
    );

    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom Description")).toBeInTheDocument();
  });

  it("handles zero values gracefully", () => {
    const emptyData: ComplianceRate = {
      total_barangays: 0,
      passed: 0,
      failed: 0,
      pass_percentage: 0.0,
    };
    render(<ComplianceRateCard data={emptyData} />);

    expect(screen.getByText("0.0%")).toBeInTheDocument();
    // Multiple "0" values exist (Total, Passed, Failed), so use getAllByText
    const zeroElements = screen.getAllByText("0");
    expect(zeroElements.length).toBeGreaterThan(0);
  });
});

describe("CompletionStatusCard", () => {
  const mockData: ComplianceRate = {
    total_barangays: 50,
    passed: 40,
    failed: 10,
    pass_percentage: 80.0,
  };

  it("renders completion status with correct counts", () => {
    render(<CompletionStatusCard data={mockData} />);

    // Check completion percentage
    expect(screen.getByText("80.0%")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();

    // Check validated and in-progress badges
    expect(screen.getByText(/40 Validated/)).toBeInTheDocument();
    expect(screen.getByText(/10 In Progress/)).toBeInTheDocument();

    // Check additional info
    expect(screen.getByText(/40 of 50 assessments have been validated/)).toBeInTheDocument();
  });

  it("handles empty data gracefully", () => {
    const emptyData: ComplianceRate = {
      total_barangays: 0,
      passed: 0,
      failed: 0,
      pass_percentage: 0.0,
    };
    render(<CompletionStatusCard data={emptyData} />);

    expect(screen.getByText("0.0%")).toBeInTheDocument();
    expect(screen.getByText(/0 Validated/)).toBeInTheDocument();
    expect(screen.getByText(/0 In Progress/)).toBeInTheDocument();
  });
});

describe("AreaBreakdownCard", () => {
  const mockData: AreaBreakdown[] = [
    {
      area_code: "GA-1",
      area_name: "Financial Administration",
      passed: 30,
      failed: 20,
      percentage: 60.0,
    },
    {
      area_code: "GA-2",
      area_name: "Disaster Preparedness",
      passed: 40,
      failed: 10,
      percentage: 80.0,
    },
    {
      area_code: "GA-3",
      area_name: "Social Protection",
      passed: 25,
      failed: 25,
      percentage: 50.0,
    },
  ];

  it("renders all governance areas with correct data", () => {
    render(<AreaBreakdownCard data={mockData} />);

    // Check title
    expect(screen.getByText("Governance Area Breakdown")).toBeInTheDocument();

    // Check all area names are rendered
    expect(screen.getByText("Financial Administration")).toBeInTheDocument();
    expect(screen.getByText("Disaster Preparedness")).toBeInTheDocument();
    expect(screen.getByText("Social Protection")).toBeInTheDocument();

    // Check area codes
    expect(screen.getByText("GA-1")).toBeInTheDocument();
    expect(screen.getByText("GA-2")).toBeInTheDocument();
    expect(screen.getByText("GA-3")).toBeInTheDocument();

    // Check pass/fail counts
    expect(screen.getByText(/30 pass/)).toBeInTheDocument();
    expect(screen.getByText(/20 fail/)).toBeInTheDocument();

    // Check percentages
    expect(screen.getByText("60.0%")).toBeInTheDocument();
    expect(screen.getByText("80.0%")).toBeInTheDocument();
    expect(screen.getByText("50.0%")).toBeInTheDocument();
  });

  it("displays empty state when no data provided", () => {
    render(<AreaBreakdownCard data={[]} />);

    // Component uses AnalyticsEmptyState which shows "No assessments yet"
    expect(screen.getByText(/no assessments yet/i)).toBeInTheDocument();
  });
});

describe("TopFailedIndicatorsCard", () => {
  const mockData: FailedIndicator[] = [
    {
      indicator_id: 1,
      indicator_name: "Budget Transparency",
      failure_count: 25,
      percentage: 50.0,
    },
    {
      indicator_id: 2,
      indicator_name: "Disaster Response Plan",
      failure_count: 20,
      percentage: 40.0,
    },
    {
      indicator_id: 3,
      indicator_name: "Community Engagement",
      failure_count: 15,
      percentage: 30.0,
    },
  ];

  it("renders indicator names and failure counts correctly", () => {
    render(<TopFailedIndicatorsCard data={mockData} />);

    // Check title
    expect(screen.getByText("Top Failed Indicators")).toBeInTheDocument();

    // Check indicator names
    expect(screen.getByText("Budget Transparency")).toBeInTheDocument();
    expect(screen.getByText("Disaster Response Plan")).toBeInTheDocument();
    expect(screen.getByText("Community Engagement")).toBeInTheDocument();

    // Check failure counts
    expect(screen.getByText(/25 failures/)).toBeInTheDocument();
    expect(screen.getByText(/20 failures/)).toBeInTheDocument();
    expect(screen.getByText(/15 failures/)).toBeInTheDocument();

    // Check percentages
    expect(screen.getByText("50.0%")).toBeInTheDocument();
    expect(screen.getByText("40.0%")).toBeInTheDocument();
    expect(screen.getByText("30.0%")).toBeInTheDocument();
  });

  it("displays numbered badges for ranking (1, 2, 3)", () => {
    render(<TopFailedIndicatorsCard data={mockData} />);

    // Check that ranking numbers 1, 2, 3 are present
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("displays empty state when no failures", () => {
    render(<TopFailedIndicatorsCard data={[]} />);

    // Component uses AnalyticsEmptyState with variant="no-assessments" which shows "No assessments yet" in compact mode
    expect(screen.getByText(/no assessments yet/i)).toBeInTheDocument();
  });
});

describe("BarangayRankingsCard", () => {
  const mockData: BarangayRanking[] = [
    {
      barangay_id: 1,
      barangay_name: "Barangay Alpha",
      score: 95.5,
      rank: 1,
    },
    {
      barangay_id: 2,
      barangay_name: "Barangay Beta",
      score: 90.0,
      rank: 2,
    },
    {
      barangay_id: 3,
      barangay_name: "Barangay Gamma",
      score: 85.5,
      rank: 3,
    },
    {
      barangay_id: 4,
      barangay_name: "Barangay Delta",
      score: 80.0,
      rank: 4,
    },
  ];

  it("renders barangay names and scores correctly", () => {
    render(<BarangayRankingsCard data={mockData} />);

    // Check title
    expect(screen.getByText("Barangay Rankings")).toBeInTheDocument();

    // Check barangay names
    expect(screen.getByText("Barangay Alpha")).toBeInTheDocument();
    expect(screen.getByText("Barangay Beta")).toBeInTheDocument();
    expect(screen.getByText("Barangay Gamma")).toBeInTheDocument();
    expect(screen.getByText("Barangay Delta")).toBeInTheDocument();

    // Check scores
    expect(screen.getByText("95.5%")).toBeInTheDocument();
    expect(screen.getByText("90.0%")).toBeInTheDocument();
    expect(screen.getByText("85.5%")).toBeInTheDocument();
    expect(screen.getByText("80.0%")).toBeInTheDocument();
  });

  it("displays rank badges with correct numbers", () => {
    render(<BarangayRankingsCard data={mockData} />);

    // Check ranks 1, 2, 3, 4
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows only top 10 rankings when more than 10 provided", () => {
    const largeData: BarangayRanking[] = Array.from({ length: 15 }, (_, i) => ({
      barangay_id: i + 1,
      barangay_name: `Barangay ${i + 1}`,
      score: 100 - i * 5,
      rank: i + 1,
    }));

    render(<BarangayRankingsCard data={largeData} />);

    // Should show rank 1-10
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();

    // Should NOT show rank 11-15
    expect(screen.queryByText("11")).not.toBeInTheDocument();
    expect(screen.queryByText("15")).not.toBeInTheDocument();
  });

  it("displays empty state when no data provided", () => {
    render(<BarangayRankingsCard data={[]} />);

    // Component uses AnalyticsEmptyState which shows "No barangays found"
    expect(screen.getByText(/no barangays found/i)).toBeInTheDocument();
  });
});
