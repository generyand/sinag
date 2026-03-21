import { describe, expect, it } from "vitest";
import {
  formatAssessmentPeriodLabel,
  getAssessmentPeriodLabel,
  getAssessmentPeriodOptions,
} from "../assessment-period";

describe("assessment-period", () => {
  it("formats the current assessment period label from a year", () => {
    expect(formatAssessmentPeriodLabel(2025)).toBe("SGLGB 2025");
  });

  it("uses the active configured assessment year as the fallback label", () => {
    expect(getAssessmentPeriodLabel(undefined, 2025)).toBe("SGLGB 2025");
  });

  it("builds descending assessment period options from configured assessment years", () => {
    expect(getAssessmentPeriodOptions([2023, 2025, 2024])).toEqual([
      "SGLGB 2025",
      "SGLGB 2024",
      "SGLGB 2023",
    ]);
  });
});
