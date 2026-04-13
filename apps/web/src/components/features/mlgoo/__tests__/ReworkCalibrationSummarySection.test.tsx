import { renderWithProviders, screen, within } from "@/tests/test-utils";
import { describe, expect, it } from "vitest";

import { ReworkCalibrationSummarySection } from "../ReworkCalibrationSummarySection";

describe("ReworkCalibrationSummarySection", () => {
  it("shows every requester and flagged indicator across rework and calibration activity", () => {
    renderWithProviders(
      <ReworkCalibrationSummarySection
        summary={
          {
            has_rework: true,
            has_calibration: true,
            has_mlgoo_recalibration: false,
            requesters: [
              {
                request_type: "rework",
                requester_name: "Assessor - Financial Admin",
                governance_area_name: "Financial Administration and Sustainability",
                requested_at: "2026-04-11T09:30:00Z",
              },
              {
                request_type: "rework",
                requester_name: "Assessor - Social Protection",
                governance_area_name: "Social Protection and Sensitivity",
                requested_at: "2026-04-11T10:15:00Z",
              },
              {
                request_type: "calibration",
                requester_name: "Validator 1",
                governance_area_name: "Peace and Order",
                requested_at: "2026-04-11T13:30:00Z",
              },
            ],
            rework_indicators: [
              {
                indicator_id: 1,
                indicator_name: "Compliance with Section 20",
                indicator_code: "1.6.1",
                governance_area_id: 101,
                governance_area_name: "Financial Administration and Sustainability",
                status: "rework",
                validation_status: null,
                feedback_comments: [],
                mov_annotations: [],
              },
              {
                indicator_id: 2,
                indicator_name: "System",
                indicator_code: "4.5.5",
                governance_area_id: 102,
                governance_area_name: "Social Protection and Sensitivity",
                status: "rework",
                validation_status: null,
                feedback_comments: [],
                mov_annotations: [],
              },
              {
                indicator_id: 3,
                indicator_name: "Validator Indicator",
                indicator_code: "5.1.2",
                governance_area_id: 103,
                governance_area_name: "Peace and Order",
                status: "calibration",
                validation_status: null,
                feedback_comments: [],
                mov_annotations: [],
              },
            ],
          } as any
        }
        reworkRequestedAt="2026-04-11T09:30:00Z"
        calibrationRequestedAt="2026-04-11T13:30:00Z"
      />
    );

    const requesterSection = screen.getByText("Rework Requested By").closest("div")?.parentElement;
    expect(requesterSection).not.toBeNull();

    const requesterContent = within(requesterSection as HTMLElement);
    expect(requesterContent.getByText("Assessor - Financial Admin")).toBeInTheDocument();
    expect(requesterContent.getByText("Assessor - Social Protection")).toBeInTheDocument();
    expect(requesterContent.getByText("Validator 1")).toBeInTheDocument();

    expect(screen.getByText("Indicators Under Review (3)")).toBeInTheDocument();
    expect(screen.getByText("1.6.1")).toBeInTheDocument();
    expect(screen.getByText("4.5.5")).toBeInTheDocument();
    expect(screen.getByText("5.1.2")).toBeInTheDocument();
    expect(screen.getAllByText("Rework").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Calibration").length).toBeGreaterThanOrEqual(1);
  });
});
