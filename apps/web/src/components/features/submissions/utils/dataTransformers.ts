import { AssessmentStatus } from "@sinag/shared";
import { API_STATUS_TO_LABEL } from "./statusConfig";

/**
 * Reviewer role type - distinguishes between assessors and validators.
 */
export type ReviewerRole = "assessor" | "validator" | "unknown";

/**
 * UI representation of a reviewer (assessor or validator) who has reviewed an assessment.
 */
export interface ReviewerInfo {
  id: number;
  name: string;
  avatar: string;
  role: ReviewerRole;
  /** Governance area ID for validators (used to show area icon) */
  governanceAreaId?: number;
}

/**
 * Information about an area that was sent for rework by an assessor.
 */
export interface AreaReworkInfo {
  governanceAreaId: number;
  governanceAreaName: string;
  assessorId: number;
  assessorName: string;
  reworkRequestedAt?: string;
  reworkComments?: string;
}

/**
 * UI representation of a submission for the table view.
 */
export interface SubmissionUIModel {
  id: number;
  barangayName: string;
  overallProgress: number;
  currentStatus: string;
  /** Reviewers who have reviewed this assessment (assessors and validators) */
  reviewers: ReviewerInfo[];
  /** @deprecated Use `reviewers` instead. Kept for backward compatibility. */
  assignedValidators: ReviewerInfo[];
  lastUpdated: string;
  /** Number of governance areas approved by assessors (0-6) */
  areasApprovedCount: number;
  /** Per-area assessor approval status: {"1": true, "2": false, ...} */
  areaApprovalStatus: Record<string, boolean>;
  /** Areas that have been sent for rework with assessor details */
  areaReworkInfo: AreaReworkInfo[];
}

/**
 * Raw assessment data from the API.
 * Matches the response from GET /assessments/list endpoint.
 */
interface ApiAssessment {
  id: number;
  barangay_name?: string;
  status: string;
  is_mlgoo_recalibration?: boolean;
  final_compliance_status?: string;
  /** Area results mapping area names to "Passed" or "Failed" status */
  area_results?: Record<string, string>;
  updated_at?: string;
  /** Reviewers (assessors/validators) who have reviewed this assessment */
  validators?: Array<{
    id: number;
    name: string;
    initials?: string;
    role?: "assessor" | "validator";
    governance_area_id?: number;
  }>;
  /** Per-area assessor approval status: {"1": true, "2": false, ...} */
  area_assessor_approved?: Record<string, boolean>;
  /** Number of governance areas approved by assessors (0-6) */
  areas_approved_count?: number;
  /** Areas that have been sent for rework with assessor details */
  area_rework_info?: Array<{
    governance_area_id: number;
    governance_area_name: string;
    assessor_id: number;
    assessor_name: string;
    rework_requested_at?: string;
    rework_comments?: string;
  }>;
}

/**
 * Transforms a single API assessment into a UI model.
 */
export function transformAssessmentToUI(assessment: ApiAssessment): SubmissionUIModel {
  const reviewers = transformReviewers(assessment.validators);
  return {
    id: assessment.id,
    barangayName: assessment.barangay_name ?? "Unknown",
    overallProgress: calculateProgress(assessment),
    currentStatus: determineDisplayStatus(assessment),
    reviewers,
    assignedValidators: reviewers, // Backward compatibility
    lastUpdated: formatLastUpdated(assessment.updated_at),
    areasApprovedCount: assessment.areas_approved_count ?? 0,
    areaApprovalStatus: assessment.area_assessor_approved ?? {},
    areaReworkInfo: transformAreaReworkInfo(assessment.area_rework_info),
  };
}

/**
 * Transforms area rework info from API format to UI format.
 */
function transformAreaReworkInfo(reworkInfo?: ApiAssessment["area_rework_info"]): AreaReworkInfo[] {
  if (!reworkInfo || !Array.isArray(reworkInfo)) {
    return [];
  }

  return reworkInfo.map((info) => ({
    governanceAreaId: info.governance_area_id,
    governanceAreaName: info.governance_area_name,
    assessorId: info.assessor_id,
    assessorName: info.assessor_name,
    reworkRequestedAt: info.rework_requested_at,
    reworkComments: info.rework_comments,
  }));
}

/**
 * Transforms an array of API assessments into UI models.
 */
export function transformAssessmentsToUI(assessments: ApiAssessment[]): SubmissionUIModel[] {
  return assessments.map(transformAssessmentToUI);
}

/**
 * Determines the display status, handling special cases like MLGOO RE-Calibration.
 */
function determineDisplayStatus(assessment: ApiAssessment): string {
  // Check for MLGOO RE-calibration (different from regular rework)
  if (
    assessment.is_mlgoo_recalibration &&
    (assessment.status === AssessmentStatus.REWORK || assessment.status === "REWORK")
  ) {
    return "MLGOO RE-Calibration";
  }

  return API_STATUS_TO_LABEL[assessment.status] ?? assessment.status;
}

/**
 * Calculates the overall progress percentage based on assessment workflow status.
 *
 * Progress represents how far an assessment has progressed through the workflow:
 * - DRAFT: 0% (not started)
 * - SUBMITTED: 25% (submitted, awaiting review)
 * - IN_REVIEW: 50% (being reviewed by assessor)
 * - REWORK: 50% (sent back for corrections, still in review phase)
 * - AWAITING_FINAL_VALIDATION: 75% (assessor done, awaiting validators)
 * - AWAITING_MLGOO_APPROVAL: 95% (validators done, awaiting final approval)
 * - COMPLETED/VALIDATED: 100% (fully complete)
 *
 * Note: This is purely workflow progress, NOT compliance/pass rate.
 * Compliance rate should be shown separately if needed.
 */
function calculateProgress(assessment: ApiAssessment): number {
  // Final states always show 100%
  if (
    assessment.status === AssessmentStatus.COMPLETED ||
    assessment.status === AssessmentStatus.VALIDATED
  ) {
    return 100;
  }

  // Return workflow-based progress
  // NOTE: Compliance status (PASSED/FAILED) does not affect workflow progress.
  // An assessment can be determined as PASSED but still needs MLGOO final approval.
  return getProgressFallbackByStatus(assessment.status);
}

/**
 * Returns workflow progress percentage based on assessment status.
 *
 * Workflow stages (linear progression):
 * 1. DRAFT (0%) - BLGU working on assessment
 * 2. SUBMITTED (25%) - Submitted, waiting for assessor
 * 3. IN_REVIEW (50%) - Assessor reviewing
 * 4. REWORK (50%) - Sent back for fixes (same stage as review)
 * 5. AWAITING_FINAL_VALIDATION (75%) - Assessor done, validators reviewing
 * 6. AWAITING_MLGOO_APPROVAL (95%) - Validators done, MLGOO final review
 * 7. COMPLETED (100%) - Fully approved
 */
function getProgressFallbackByStatus(status: string): number {
  const progressByStatus: Record<string, number> = {
    [AssessmentStatus.DRAFT]: 0,
    [AssessmentStatus.SUBMITTED]: 25,
    [AssessmentStatus.SUBMITTED_FOR_REVIEW]: 25,
    [AssessmentStatus.IN_REVIEW]: 50,
    [AssessmentStatus.REWORK]: 50,
    [AssessmentStatus.NEEDS_REWORK]: 50,
    [AssessmentStatus.AWAITING_FINAL_VALIDATION]: 75,
    [AssessmentStatus.AWAITING_MLGOO_APPROVAL]: 95,
    [AssessmentStatus.COMPLETED]: 100,
    [AssessmentStatus.VALIDATED]: 100,
  };

  return progressByStatus[status] ?? 0;
}

/**
 * Transforms reviewer data from the API into UI format.
 * Includes role information to distinguish between assessors and validators.
 *
 * Avatar display:
 * - Assessors: Show "A" + first letter of initials (e.g., "AJ" for Assessor Juan)
 * - Validators: Show "V" + first letter of initials (e.g., "VM" for Validator Maria)
 * - Unknown: Show initials as-is
 *
 * Colors are applied in the UI component:
 * - Assessors: Purple gradient
 * - Validators: Blue gradient
 */
function transformReviewers(validators?: ApiAssessment["validators"]): ReviewerInfo[] {
  if (!validators || !Array.isArray(validators)) {
    return [];
  }

  return validators.map((v) => {
    // Determine role from API data
    let role: ReviewerRole = "unknown";
    if (v.role === "assessor") {
      role = "assessor";
    } else if (v.role === "validator") {
      role = "validator";
    }

    const initials = v.initials ?? "?";

    // Create role-prefixed avatar for visual distinction
    // Format: RolePrefix + First initial (e.g., "AJ", "VM")
    let avatar: string;
    if (role === "assessor") {
      avatar = `A${initials.charAt(0)}`;
    } else if (role === "validator") {
      avatar = `V${initials.charAt(0)}`;
    } else {
      // For unknown roles (e.g., feedback commenters), just show initials
      avatar = initials.substring(0, 2);
    }

    return {
      id: v.id,
      name: v.name,
      avatar,
      role,
      governanceAreaId: v.governance_area_id,
    };
  });
}

/**
 * @deprecated Use transformReviewers instead.
 */
function transformValidators(validators?: ApiAssessment["validators"]): ReviewerInfo[] {
  return transformReviewers(validators);
}

/**
 * Formats the last updated date for display.
 */
function formatLastUpdated(dateString?: string): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString();
}

/**
 * Sort direction type.
 */
export type SortDirection = "asc" | "desc";

/**
 * Sortable column keys.
 */
export type SortableColumn = "barangayName" | "overallProgress" | "currentStatus" | "lastUpdated";

/**
 * Sort configuration.
 */
export interface SortConfig {
  key: SortableColumn;
  direction: SortDirection;
}

/**
 * Sorts submissions by the specified column and direction.
 */
export function sortSubmissions(
  submissions: SubmissionUIModel[],
  sortConfig: SortConfig | null
): SubmissionUIModel[] {
  if (!sortConfig) return submissions;

  return [...submissions].sort((a, b) => {
    const { key, direction } = sortConfig;
    let comparison = 0;

    switch (key) {
      case "barangayName":
        comparison = a.barangayName.localeCompare(b.barangayName);
        break;
      case "overallProgress":
        comparison = a.overallProgress - b.overallProgress;
        break;
      case "currentStatus":
        comparison = a.currentStatus.localeCompare(b.currentStatus);
        break;
      case "lastUpdated":
        comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });
}

/**
 * Filters submissions by search query (barangay name).
 */
export function filterSubmissionsBySearch(
  submissions: SubmissionUIModel[],
  searchQuery: string
): SubmissionUIModel[] {
  if (!searchQuery.trim()) return submissions;

  const lowerQuery = searchQuery.toLowerCase();
  return submissions.filter((submission) =>
    submission.barangayName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Short names for the 6 governance areas (used in tooltips and compact displays).
 */
export const GOVERNANCE_AREA_SHORT_NAMES: Record<number, string> = {
  1: "Financial Admin",
  2: "Disaster Prep",
  3: "Peace & Order",
  4: "Social Protection",
  5: "Business-Friendliness",
  6: "Environmental Mgmt",
};

/**
 * Validator display status for the Reviewers & Progress column.
 */
export interface ValidatorDisplayStatus {
  text: string;
  className: string;
}

/**
 * Determines the validator status display based on assessment workflow state.
 *
 * Logic:
 * - Draft: "Unassigned" (gray, italic)
 * - Completed/Validated: "Complete" (green)
 * - Awaiting MLGOO Approval: "Awaiting MLGOO" (purple)
 * - MLGOO RE-Calibration: "RE-Calibration" (purple)
 * - Awaiting Final Validation (6/6 areas approved): "Awaiting Validation" (blue)
 * - In Review / Needs Rework / Submitted (< 6 areas): "Awaiting Assessors" (gray, italic)
 */
export function getValidatorDisplayStatus(submission: SubmissionUIModel): ValidatorDisplayStatus {
  const { areasApprovedCount, currentStatus } = submission;

  // Draft state - no one assigned yet
  if (currentStatus === "Draft") {
    return { text: "Unassigned", className: "italic text-[var(--muted-foreground)]" };
  }

  // Final completed states
  if (currentStatus === "Completed" || currentStatus === "Validated") {
    return { text: "Complete", className: "text-green-600 dark:text-green-400" };
  }

  // MLGOO approval stage
  if (currentStatus === "Awaiting MLGOO Approval") {
    return { text: "Awaiting MLGOO", className: "text-purple-600 dark:text-purple-400" };
  }

  // MLGOO RE-Calibration (special rework from MLGOO)
  if (currentStatus === "MLGOO RE-Calibration") {
    return { text: "RE-Calibration", className: "text-purple-600 dark:text-purple-400" };
  }

  // Awaiting Final Validation (all 6 assessors done)
  if (currentStatus === "Awaiting Final Validation") {
    return { text: "Awaiting Validation", className: "text-blue-600 dark:text-blue-400" };
  }

  // Still in assessor phase (In Review, Needs Rework, Submitted for Review)
  if (areasApprovedCount < 6) {
    return { text: "Awaiting Assessors", className: "italic text-[var(--muted-foreground)]" };
  }

  // Fallback for any edge cases with 6/6 areas approved
  return { text: "Awaiting Validation", className: "text-blue-600 dark:text-blue-400" };
}

/**
 * Gets the breakdown of approved vs missing governance areas for tooltip display.
 */
export function getAreasBreakdown(areaApprovalStatus: Record<string, boolean>): {
  approved: string[];
  missing: string[];
} {
  const approved: string[] = [];
  const missing: string[] = [];

  for (let i = 1; i <= 6; i++) {
    const areaName = GOVERNANCE_AREA_SHORT_NAMES[i];
    if (areaApprovalStatus[String(i)]) {
      approved.push(areaName);
    } else {
      missing.push(areaName);
    }
  }

  return { approved, missing };
}
