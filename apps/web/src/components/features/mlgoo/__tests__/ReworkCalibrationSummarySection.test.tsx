import { renderWithProviders, screen } from "@/tests/test-utils";
import { describe, expect, it } from "vitest";

import { ReworkCalibrationSummarySection } from "../ReworkCalibrationSummarySection";

const baseSummary = {
  has_rework: true,
  has_calibration: false,
  has_mlgoo_recalibration: false,
  rework_requested_by_id: null,
  rework_requested_by_name: "Assessor One",
  rework_comments: null,
  calibration_validator_id: null,
  calibration_validator_name: null,
  calibration_comments: null,
  pending_calibrations: [],
  rework_indicators: [
    {
      indicator_id: 64,
      indicator_code: "6.4.1",
      indicator_name: "Accomplishment Reports covering {JUL_TO_SEP_CURRENT_YEAR}",
      governance_area_id: 6,
      governance_area_name: "Environmental Management",
      status: "rework",
      validation_status: "FAIL",
      feedback_comments: [],
      mov_annotations: [],
    },
  ],
};

describe("ReworkCalibrationSummarySection", () => {
  it("formats year placeholders in indicators under review", () => {
    renderWithProviders(
      <ReworkCalibrationSummarySection summary={baseSummary} assessmentYear={2026} />
    );

    expect(
      screen.getByText("Accomplishment Reports covering July-September 2026")
    ).toBeInTheDocument();
    expect(screen.queryByText(/\{JUL_TO_SEP_CURRENT_YEAR\}/)).not.toBeInTheDocument();
  });

  it("leaves the indicator name unchanged when no assessment year is available", () => {
    renderWithProviders(<ReworkCalibrationSummarySection summary={baseSummary} />);

    expect(
      screen.getByText("Accomplishment Reports covering {JUL_TO_SEP_CURRENT_YEAR}")
    ).toBeInTheDocument();
  });
});
