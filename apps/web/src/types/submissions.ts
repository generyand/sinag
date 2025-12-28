export interface SubmissionStatus {
  id: string;
  name: string;
  color: string;
}

export interface SubmissionsKPI {
  awaitingReview: number;
  inRework: number;
  validated: number;
  avgReviewTime: number;
}

export interface BarangaySubmission {
  id: string;
  barangayName: string;
  areaProgress: number; // Progress percentage for the assessor's specific area
  areaStatus: "awaiting_review" | "in_progress" | "needs_rework" | "validated";
  overallStatus:
    | "draft"
    | "submitted"
    | "under_review"
    | "needs_rework"
    | "validated"
    | "completed";
  lastUpdated: string;
  assignedTo?: string;
}

export interface SubmissionsFilter {
  search: string;
  status: string[];
}

export interface Assessor {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface SubmissionsData {
  kpi: SubmissionsKPI;
  submissions: BarangaySubmission[];
  governanceArea: string;
}
