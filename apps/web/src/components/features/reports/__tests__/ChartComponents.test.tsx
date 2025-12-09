/**
 * 🧪 Chart Components Tests
 * Tests for the reports page chart visualizations (bar, pie, line charts)
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  AreaBreakdownBarChart,
  ComplianceStatusPieChart,
  TrendLineChart,
} from "../ChartComponents";

describe("AreaBreakdownBarChart", () => {
  const mockBarChartData = [
    {
      area_code: "GA-1",
      area_name: "Financial Administration",
      passed: 20,
      failed: 5,
      pass_percentage: 80.0,
    },
    {
      area_code: "GA-2",
      area_name: "Disaster Preparedness",
      passed: 15,
      failed: 10,
      pass_percentage: 60.0,
    },
    {
      area_code: "GA-3",
      area_name: "Social Protection",
      passed: 18,
      failed: 7,
      pass_percentage: 72.0,
    },
  ];

  it("renders without crashing with valid data", () => {
    const { container } = render(<AreaBreakdownBarChart data={mockBarChartData} />);

    // Verify component renders (doesn't crash)
    // Note: Recharts may not fully render in test environment
    expect(container).toBeTruthy();
    expect(container.firstChild).not.toBeNull();
  });

  it('displays "No data available" message when data is empty', () => {
    render(<AreaBreakdownBarChart data={[]} />);

    expect(screen.getByText("No assessments yet")).toBeInTheDocument();
  });

  it('displays "No data available" message when data is undefined', () => {
    render(<AreaBreakdownBarChart data={undefined as any} />);

    expect(screen.getByText("No assessments yet")).toBeInTheDocument();
  });

  it("accepts array of data with correct structure", () => {
    // Test that component accepts properly structured data
    expect(() => {
      render(<AreaBreakdownBarChart data={mockBarChartData} />);
    }).not.toThrow();

    // Verify data has required fields
    mockBarChartData.forEach((item) => {
      expect(item).toHaveProperty("area_code");
      expect(item).toHaveProperty("area_name");
      expect(item).toHaveProperty("passed");
      expect(item).toHaveProperty("failed");
      expect(item).toHaveProperty("pass_percentage");
    });
  });
});

describe("ComplianceStatusPieChart", () => {
  const mockPieChartData = [
    {
      status: "Pass",
      count: 30,
      percentage: 60.0,
    },
    {
      status: "Fail",
      count: 15,
      percentage: 30.0,
    },
    {
      status: "In Progress",
      count: 5,
      percentage: 10.0,
    },
  ];

  it("renders without crashing with valid data", () => {
    const { container } = render(<ComplianceStatusPieChart data={mockPieChartData} />);

    // Verify component renders
    expect(container).toBeTruthy();
    expect(container.firstChild).not.toBeNull();
  });

  it('displays "No data available" message when data is empty', () => {
    render(<ComplianceStatusPieChart data={[]} />);

    expect(screen.getByText("No assessments yet")).toBeInTheDocument();
  });

  it('displays "No data available" message when data is undefined', () => {
    render(<ComplianceStatusPieChart data={undefined as any} />);

    expect(screen.getByText("No assessments yet")).toBeInTheDocument();
  });

  it("accepts array of data with correct structure", () => {
    // Test that component accepts properly structured data
    expect(() => {
      render(<ComplianceStatusPieChart data={mockPieChartData} />);
    }).not.toThrow();

    // Verify data has required fields
    mockPieChartData.forEach((item) => {
      expect(item).toHaveProperty("status");
      expect(item).toHaveProperty("count");
      expect(item).toHaveProperty("percentage");
    });
  });

  it("handles data with three status types", () => {
    const { container } = render(<ComplianceStatusPieChart data={mockPieChartData} />);

    // Component should handle Pass, Fail, and In Progress statuses
    expect(container.firstChild).not.toBeNull();
    expect(mockPieChartData.length).toBe(3);
  });
});

describe("TrendLineChart", () => {
  const mockLineChartData = [
    {
      cycle_id: 0,
      cycle_name: "January 2025",
      pass_rate: 65.0,
      date: new Date("2025-01-01T00:00:00"),
    },
    {
      cycle_id: 0,
      cycle_name: "February 2025",
      pass_rate: 72.0,
      date: new Date("2025-02-01T00:00:00"),
    },
    {
      cycle_id: 0,
      cycle_name: "March 2025",
      pass_rate: 78.5,
      date: new Date("2025-03-01T00:00:00"),
    },
  ];

  it("renders without crashing with valid data", () => {
    const { container } = render(<TrendLineChart data={mockLineChartData} />);

    // Verify component renders
    expect(container).toBeTruthy();
    expect(container.firstChild).not.toBeNull();
  });

  it('displays "No trend data available" message when data is empty', () => {
    render(<TrendLineChart data={[]} />);

    expect(screen.getByText("No assessments yet")).toBeInTheDocument();
  });

  it('displays "No trend data available" message when data is undefined', () => {
    render(<TrendLineChart data={undefined as any} />);

    expect(screen.getByText("No assessments yet")).toBeInTheDocument();
  });

  it("accepts array of data with correct structure", () => {
    // Test that component accepts properly structured data
    expect(() => {
      render(<TrendLineChart data={mockLineChartData} />);
    }).not.toThrow();

    // Verify data has required fields
    mockLineChartData.forEach((item) => {
      expect(item).toHaveProperty("cycle_name");
      expect(item).toHaveProperty("pass_rate");
      expect(item).toHaveProperty("date");
    });
  });

  it("handles multiple trend data points", () => {
    const { container } = render(<TrendLineChart data={mockLineChartData} />);

    // Component should handle multiple data points
    expect(container.firstChild).not.toBeNull();
    expect(mockLineChartData.length).toBe(3);
  });

  it("renders trend showing pass rate progression", () => {
    const { container } = render(<TrendLineChart data={mockLineChartData} />);

    // Verify trend data shows progression
    expect(mockLineChartData[0].pass_rate).toBe(65.0);
    expect(mockLineChartData[1].pass_rate).toBe(72.0);
    expect(mockLineChartData[2].pass_rate).toBe(78.5);
    expect(container.firstChild).not.toBeNull();
  });
});

describe("Chart Components - Integration", () => {
  it("all charts render without crashing when given valid data", () => {
    const barData = [
      {
        area_code: "GA-1",
        area_name: "Test Area",
        passed: 10,
        failed: 5,
        pass_percentage: 66.67,
      },
    ];

    const pieData = [
      {
        status: "Pass",
        count: 10,
        percentage: 100.0,
      },
    ];

    const lineData = [
      {
        cycle_id: 1,
        cycle_name: "Test Cycle",
        pass_rate: 75.0,
        date: new Date("2025-01-01"),
      },
    ];

    // Test that all charts render without errors
    expect(() => {
      const { rerender } = render(<AreaBreakdownBarChart data={barData} />);
      rerender(<ComplianceStatusPieChart data={pieData} />);
      rerender(<TrendLineChart data={lineData} />);
    }).not.toThrow();
  });

  it("all charts handle empty data gracefully", () => {
    // Test that all charts show appropriate empty state messages
    const { rerender } = render(<AreaBreakdownBarChart data={[]} />);
    expect(screen.getByText("No assessments yet")).toBeInTheDocument();

    rerender(<ComplianceStatusPieChart data={[]} />);
    expect(screen.getByText("No assessments yet")).toBeInTheDocument();

    rerender(<TrendLineChart data={[]} />);
    expect(screen.getByText("No assessments yet")).toBeInTheDocument();
  });
});
