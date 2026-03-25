import { describe, expect, it } from "vitest";

import { getReworkProgressSummary } from "../rework-progress";

describe("getReworkProgressSummary", () => {
  it("counts only flagged indicators and marks addressed ones only when completed", () => {
    const assessment = {
      governanceAreas: [
        {
          id: "1",
          indicators: [
            {
              id: "101",
              code: "1.1.1",
              name: "Completed and addressed",
              status: "needs_rework",
              isCompleted: true,
              response: { requires_rework: true },
              children: [],
            },
            {
              id: "102",
              code: "1.1.2",
              name: "Updated but still incomplete",
              status: "needs_rework",
              isCompleted: false,
              response: { requires_rework: true },
              children: [],
            },
            {
              id: "103",
              code: "1.1.3",
              name: "Incomplete but never flagged",
              status: "in_progress",
              isCompleted: false,
              response: { requires_rework: false },
              children: [],
            },
          ],
        },
      ],
    } as any;

    const summary = getReworkProgressSummary(assessment, [101, 102]);

    expect(summary).toEqual({
      flagged: 2,
      addressed: 1,
      remaining: 1,
    });
  });
});
