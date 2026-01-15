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

// Unified status type for combined STATUS column in Assessor/Validator views
export type UnifiedStatus =
  | "awaiting_assessment" // First submission, assessor hasn't started (area_progress = 0)
  | "assessment_in_progress" // First submission, assessor has started (area_progress > 0, not approved)
  | "sent_for_rework" // Rework requested, waiting for BLGU (submission_type = "rework_pending")
  | "awaiting_re_review" // BLGU resubmitted, assessor hasn't started re-review
  | "re_assessment_in_progress" // Assessor actively re-reviewing resubmitted docs
  | "reviewed"; // Area approved by assessor

export interface BarangaySubmission {
  id: string;
  barangayName: string;
  areaProgress: number; // Progress percentage for the assessor's specific area
  // NEW: Unified status combining areaStatus and overallStatus into single column
  unifiedStatus: UnifiedStatus;
  // Re-review progress for rework resubmissions (0-100%)
  reReviewProgress?: number;
  lastUpdated: string;
  assignedTo?: string;
  // Submission type for Issue #5 - distinguish first submissions from reworks
  submissionType?: "first_submission" | "rework_pending" | "rework_resubmission";
  // Global assessment status for reference
  globalStatus?: string | null;
  // DEPRECATED: Kept for backward compatibility, use unifiedStatus instead
  areaStatus?: "awaiting_review" | "in_progress" | "needs_rework" | "validated";
  overallStatus?:
    | "draft"
    | "submitted"
    | "under_review"
    | "needs_rework"
    | "validated"
    | "completed";
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
