import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAssessmentValidation } from "../useAssessment";

describe("useAssessmentValidation", () => {
  it("does not count completed rework indicators as incomplete", () => {
    const assessment = {
      status: "REWORK",
      completedIndicators: 2,
      totalIndicators: 3,
      governanceAreas: [
        {
          id: "1",
          indicators: [
            {
              id: "101",
              code: "1.1.1",
              name: "Completed rework item",
              status: "needs_rework",
              isCompleted: true,
              response: {
                is_completed: true,
                requires_rework: true,
              },
              children: [],
            },
            {
              id: "102",
              code: "1.1.2",
              name: "Still incomplete",
              status: "needs_rework",
              isCompleted: false,
              response: {
                is_completed: false,
                requires_rework: true,
              },
              children: [],
            },
            {
              id: "103",
              code: "1.1.3",
              name: "Completed clean item",
              status: "completed",
              isCompleted: true,
              response: {
                is_completed: true,
                requires_rework: false,
              },
              children: [],
            },
          ],
        },
      ],
    } as any;

    const { result } = renderHook(() => useAssessmentValidation(assessment));

    expect(result.current.isComplete).toBe(false);
    expect(result.current.missingIndicators).toEqual(["1.1.2 - Still incomplete"]);
  });
});
