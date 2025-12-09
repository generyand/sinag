export interface SystemicWeakness {
  indicator: string;
  failedCount: number;
  barangays: string[];
}

export interface AssessorData {
  name: string;
  assignedBarangays: number;
  assessmentPeriod: string;
  performance: {
    totalAssessed: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  systemicWeaknesses: SystemicWeakness[];
  workflowMetrics: {
    avgTimeToFirstReview: number;
    avgReworkCycleTime: number;
    totalReviewed: number;
    reworkRate: number;
  };
}

export interface SeverityLevel {
  level: string;
  color: string;
}
