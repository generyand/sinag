import { SeverityLevel } from "./AssessorAnalyticsTypes";

export const getSeverityLevel = (failedCount: number): SeverityLevel => {
  if (failedCount >= 15) return { level: "CRITICAL", color: "red" };
  if (failedCount >= 10) return { level: "HIGH", color: "orange" };
  if (failedCount >= 5) return { level: "MEDIUM", color: "yellow" };
  return { level: "LOW", color: "green" };
};

export const calculateImpactPercentage = (failedCount: number, totalBarangays: number): number => {
  return Math.round((failedCount / totalBarangays) * 100);
};
