import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssessmentTreeNode } from "../AssessmentTreeNode";
import type { Indicator } from "@/types/assessment";

function makeIndicator(overrides: Partial<Indicator> = {}): Indicator {
  return {
    id: "201",
    code: "1.3.1",
    name: "Presence of a Barangay Appropriation Ordinance",
    description: "",
    technicalNotes: "",
    governanceAreaId: "1",
    status: "completed",
    movFiles: [],
    formSchema: { properties: {} },
    ...overrides,
  };
}

describe("AssessmentTreeNode", () => {
  it("keeps the default yellow MOV attention icon for shared non-validator trees", () => {
    render(
      <AssessmentTreeNode
        type="indicator"
        item={makeIndicator({ hasMovNotes: true, status: "completed" })}
      />
    );

    const icon = screen.getByLabelText("Indicator has MOV notes");
    expect(icon).toHaveClass("text-yellow-500");
    expect(screen.queryByLabelText("Indicator complete")).not.toBeInTheDocument();
  });

  it("shows a red warning icon before the completed icon for validator MOV attention", () => {
    render(
      <AssessmentTreeNode
        type="indicator"
        item={makeIndicator({ hasMovNotes: true, status: "completed" })}
        movAttentionVariant="danger"
      />
    );

    const icon = screen.getByLabelText("Indicator needs attention");
    expect(icon).toHaveClass("text-red-500");
    expect(screen.queryByLabelText("Indicator complete")).not.toBeInTheDocument();
  });
});
