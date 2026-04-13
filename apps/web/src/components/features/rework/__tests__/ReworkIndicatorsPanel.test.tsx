import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/tests/test-utils";
import { ReworkIndicatorsPanel } from "../ReworkIndicatorsPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("../FailedIndicatorCard", () => ({
  FailedIndicatorCard: ({ failed }: { failed: { indicator_name: string } }) => (
    <div>{failed.indicator_name}</div>
  ),
}));

describe("ReworkIndicatorsPanel", () => {
  it("uses flagged indicator ids from the dashboard payload instead of all incomplete indicators", () => {
    const dashboardData = {
      is_calibration_rework: true,
      is_mlgoo_recalibration: false,
      governance_areas: [
        {
          governance_area_id: 1,
          governance_area_name: "Financial Administration",
          indicators: [
            { indicator_id: 101, indicator_name: "Indicator 101", is_complete: true },
            { indicator_id: 102, indicator_name: "Indicator 102", is_complete: false },
            { indicator_id: 103, indicator_name: "Indicator 103", is_complete: false },
            { indicator_id: 104, indicator_name: "Indicator 104", is_complete: false },
          ],
        },
      ],
      flagged_indicator_ids: [101, 102, 103],
      addressed_indicator_ids: [101],
      rework_comments: [
        { indicator_id: 101, indicator_name: "Indicator 101", comment: "Fix this" },
        { indicator_id: 102, indicator_name: "Indicator 102", comment: "Fix this too" },
        {
          indicator_id: 104,
          indicator_name: "Indicator 104",
          comment: "Unrelated incomplete item",
        },
      ],
      mov_annotations_by_indicator: {},
      calibration_governance_areas: [],
      calibration_governance_area_name: "Financial Administration",
    } as any;

    render(<ReworkIndicatorsPanel dashboardData={dashboardData} assessmentId={31} />);

    expect(screen.getByText(/Please review and update/i)).toHaveTextContent(
      "Please review and update 2 of 3 indicators to proceed."
    );
    expect(screen.getByText("Fixed")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("lets users collapse and re-expand a governance area after the panel auto-expands on load", async () => {
    const user = userEvent.setup();
    const dashboardData = {
      is_calibration_rework: false,
      is_mlgoo_recalibration: false,
      governance_areas: [
        {
          governance_area_id: 1,
          governance_area_name: "Financial Administration and Sustainability",
          indicators: [
            { indicator_id: 101, indicator_name: "Indicator 101", is_complete: false },
            { indicator_id: 102, indicator_name: "Indicator 102", is_complete: false },
          ],
        },
      ],
      addressed_indicator_ids: [],
      rework_comments: [
        { indicator_id: 101, indicator_name: "Indicator 101", comment: "Fix this" },
        { indicator_id: 102, indicator_name: "Indicator 102", comment: "Fix this too" },
      ],
      mov_annotations_by_indicator: {},
    } as any;

    render(<ReworkIndicatorsPanel dashboardData={dashboardData} assessmentId={31} />);

    expect(screen.getByText("Indicator 101")).toBeInTheDocument();
    expect(screen.getByText("Indicator 102")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Financial Administration and Sustainability/i,
      })
    );

    expect(screen.queryByText("Indicator 101")).not.toBeInTheDocument();
    expect(screen.queryByText("Indicator 102")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Financial Administration and Sustainability/i,
      })
    );

    expect(screen.getByText("Indicator 101")).toBeInTheDocument();
    expect(screen.getByText("Indicator 102")).toBeInTheDocument();
  });
});
