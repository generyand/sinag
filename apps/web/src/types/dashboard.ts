// TODO: These types should match the real API response structure
// Expected API endpoints:
// - GET /api/v1/assessments/dashboard/{barangay_id} -> DashboardData
// - GET /api/v1/assessments/{assessment_id}/progress -> AssessmentProgress
// - GET /api/v1/assessments/{assessment_id}/feedback -> AssessorFeedback[]

export type AssessmentStatus = "Draft" | "Submitted for Review" | "Validated" | "Needs Rework";

export interface AssessmentProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface GovernanceAreaProgress {
  id: number;
  name: string;
  area_type: string;
  status: string;
  total_indicators: number;
  completed_indicators: number;
  completion_percentage: number;
  requires_rework_count: number;
}

export type AssessorFeedback = {
  [key: string]: unknown;
};

export interface DashboardData {
  barangayName: string;
  performanceYear: string;
  assessmentYear: string;
  status: AssessmentStatus;
  progress: AssessmentProgress;
  governanceAreas: GovernanceAreaProgress[];
  feedback: AssessorFeedback[];
}
