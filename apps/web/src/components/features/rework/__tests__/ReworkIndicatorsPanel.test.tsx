import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/tests/test-utils";
import { ReworkIndicatorsPanel } from "../ReworkIndicatorsPanel";

const capturedFailedIndicators: Array<any> = [];

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("../FailedIndicatorCard", () => ({
  FailedIndicatorCard: ({ failed }: { failed: any }) => {
    capturedFailedIndicators.push(failed);
    return (
      <div>
        <div>{failed.indicator_name}</div>
        {(failed.comments || []).map((comment: any, index: number) => (
          <div key={`${failed.indicator_name}-${index}`}>{comment.comment}</div>
        ))}
      </div>
    );
  },
}));

describe("ReworkIndicatorsPanel", () => {
  capturedFailedIndicators.length = 0;

  it("uses flagged indicator ids from the dashboard payload instead of all incomplete indicators", () => {
    capturedFailedIndicators.length = 0;
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
    capturedFailedIndicators.length = 0;
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

  it("keeps feedback-backed indicators visible even when flagged ids are incomplete", () => {
    capturedFailedIndicators.length = 0;
    const dashboardData = {
      is_calibration_rework: false,
      is_mlgoo_recalibration: false,
      governance_areas: [
        {
          governance_area_id: 1,
          governance_area_name: "Financial Administration",
          indicators: [{ indicator_id: 101, indicator_name: "Indicator 101", is_complete: false }],
        },
        {
          governance_area_id: 2,
          governance_area_name: "Disaster Preparedness",
          indicators: [{ indicator_id: 201, indicator_name: "Indicator 201", is_complete: false }],
        },
      ],
      flagged_indicator_ids: [101],
      addressed_indicator_ids: [],
      rework_comments: [
        { indicator_id: 101, indicator_name: "Indicator 101", comment: "Fix financial issue" },
        { indicator_id: 201, indicator_name: "Indicator 201", comment: "Fix disaster issue" },
      ],
      mov_annotations_by_indicator: {},
      mov_notes_by_indicator: {},
    } as any;

    render(<ReworkIndicatorsPanel dashboardData={dashboardData} assessmentId={31} />);

    expect(screen.getByText("Indicator 101")).toBeInTheDocument();
    expect(screen.getByText("Indicator 201")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Disaster Preparedness/i })).toBeInTheDocument();
  });

  it("prefers aggregated MOV notes over generic rework comments in action items", () => {
    capturedFailedIndicators.length = 0;

    const dashboardData = {
      is_calibration_rework: false,
      is_mlgoo_recalibration: false,
      governance_areas: [
        {
          governance_area_id: 1,
          governance_area_name: "Financial Administration",
          indicators: [{ indicator_id: 101, indicator_name: "Indicator 101", is_complete: false }],
        },
      ],
      flagged_indicator_ids: [101],
      addressed_indicator_ids: [],
      rework_comments: [
        {
          indicator_id: 101,
          indicator_name: "Indicator 101",
          comment: "please see comments",
          comment_type: "validation",
        },
      ],
      mov_annotations_by_indicator: {},
      mov_notes_by_indicator: {
        101: [
          {
            note: "Note 1: Signature is missing",
            note_type: "assessor_rework",
            indicator_id: 101,
            indicator_name: "Indicator 101",
          },
          {
            note: "Note 2: Document is blurred",
            note_type: "assessor_rework",
            indicator_id: 101,
            indicator_name: "Indicator 101",
          },
        ],
      },
    } as any;

    render(<ReworkIndicatorsPanel dashboardData={dashboardData} assessmentId={31} />);

    expect(screen.getByText("Note 1: Signature is missing")).toBeInTheDocument();
    expect(screen.getByText("Note 2: Document is blurred")).toBeInTheDocument();
    expect(screen.queryByText("please see comments")).not.toBeInTheDocument();

    expect(capturedFailedIndicators).toHaveLength(1);
    expect(capturedFailedIndicators[0].comments.map((comment: any) => comment.comment)).toEqual([
      "Note 1: Signature is missing",
      "Note 2: Document is blurred",
    ]);
  });

  it("shows validator calibration notes instead of generic feedback in action items", () => {
    capturedFailedIndicators.length = 0;

    const dashboardData = {
      is_calibration_rework: true,
      is_mlgoo_recalibration: false,
      governance_areas: [
        {
          governance_area_id: 1,
          governance_area_name: "Environmental Management",
          indicators: [{ indicator_id: 301, indicator_name: "Indicator 301", is_complete: false }],
        },
      ],
      flagged_indicator_ids: [301],
      addressed_indicator_ids: [],
      rework_comments: [
        {
          indicator_id: 301,
          indicator_name: "Indicator 301",
          comment: "please see comments",
          comment_type: "validation",
        },
      ],
      mov_annotations_by_indicator: {},
      mov_notes_by_indicator: {
        301: [
          {
            note: "Validator note: Uploaded document is outdated",
            note_type: "validator_calibration",
            indicator_id: 301,
            indicator_name: "Indicator 301",
          },
        ],
      },
      calibration_governance_areas: [
        {
          governance_area_id: 1,
          governance_area_name: "Environmental Management",
        },
      ],
    } as any;

    render(<ReworkIndicatorsPanel dashboardData={dashboardData} assessmentId={31} />);

    expect(screen.getByText("Validator note: Uploaded document is outdated")).toBeInTheDocument();
    expect(screen.queryByText("please see comments")).not.toBeInTheDocument();
    expect(capturedFailedIndicators[0].comments.map((comment: any) => comment.comment)).toEqual([
      "Validator note: Uploaded document is outdated",
    ]);
  });

  it("falls back to generic feedback when no MOV notes exist for the indicator", () => {
    capturedFailedIndicators.length = 0;

    const dashboardData = {
      is_calibration_rework: false,
      is_mlgoo_recalibration: false,
      governance_areas: [
        {
          governance_area_id: 1,
          governance_area_name: "Financial Administration",
          indicators: [{ indicator_id: 401, indicator_name: "Indicator 401", is_complete: false }],
        },
      ],
      flagged_indicator_ids: [401],
      addressed_indicator_ids: [],
      rework_comments: [
        {
          indicator_id: 401,
          indicator_name: "Indicator 401",
          comment: "General feedback remains visible here",
          comment_type: "validation",
        },
      ],
      mov_annotations_by_indicator: {},
      mov_notes_by_indicator: {},
    } as any;

    render(<ReworkIndicatorsPanel dashboardData={dashboardData} assessmentId={31} />);

    expect(screen.getByText("General feedback remains visible here")).toBeInTheDocument();
    expect(capturedFailedIndicators[0].comments.map((comment: any) => comment.comment)).toEqual([
      "General feedback remains visible here",
    ]);
  });
});
