import { AssessmentStatus } from "@sinag/shared";
import { API_STATUS_TO_LABEL } from "./statusConfig";

/**
 * UI representation of a submission for the table view.
 */
export interface SubmissionUIModel {
  id: number;
  barangayName: string;
  overallProgress: number;
  currentStatus: string;
  assignedValidators: Array<{
    id: number;
    name: string;
    avatar: string;
  }>;
  lastUpdated: string;
}

/**
 * Raw assessment data from the API.
 * Using a flexible type since the API response structure may vary.
 */
interface ApiAssessment {
  id: number;
  barangay_name?: string;
  status: string;
  is_mlgoo_recalibration?: boolean;
  final_compliance_status?: string;
  area_results?: Record<string, { compliance_rate?: number }>;
  updated_at?: string;
  validators?: Array<{
    id: number;
    name: string;
    initials?: string;
  }>;
}

/**
 * Transforms a single API assessment into a UI model.
 */
export function transformAssessmentToUI(assessment: ApiAssessment): SubmissionUIModel {
  return {
    id: assessment.id,
    barangayName: assessment.barangay_name ?? "Unknown",
    overallProgress: calculateProgress(assessment),
    currentStatus: determineDisplayStatus(assessment),
    assignedValidators: transformValidators(assessment.validators),
    lastUpdated: formatLastUpdated(assessment.updated_at),
  };
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
 * Calculates the overall progress percentage based on assessment status and data.
 * Completed assessments always show 100%.
 */
function calculateProgress(assessment: ApiAssessment): number {
  // Final states always show 100%
  if (
    assessment.status === AssessmentStatus.COMPLETED ||
    assessment.status === AssessmentStatus.VALIDATED
  ) {
    return 100;
  }

  // Check compliance status
  if (
    assessment.final_compliance_status === "COMPLIANT" ||
    assessment.final_compliance_status === "PASSED"
  ) {
    return 100;
  }

  // Calculate from area results if available
  if (assessment.area_results && typeof assessment.area_results === "object") {
    const results = Object.values(assessment.area_results);
    if (results.length > 0) {
      const totalCompliance = results.reduce((sum, result) => {
        return sum + (result?.compliance_rate ?? 0);
      }, 0);
      return Math.round(totalCompliance / results.length);
    }
  }

  // Fallback based on status
  return getProgressFallbackByStatus(assessment.status);
}

/**
 * Returns a fallback progress percentage based on assessment status.
 */
function getProgressFallbackByStatus(status: string): number {
  const progressByStatus: Record<string, number> = {
    [AssessmentStatus.AWAITING_MLGOO_APPROVAL]: 95,
    [AssessmentStatus.AWAITING_FINAL_VALIDATION]: 90,
    [AssessmentStatus.IN_REVIEW]: 75,
    [AssessmentStatus.SUBMITTED]: 50,
    [AssessmentStatus.SUBMITTED_FOR_REVIEW]: 50,
    [AssessmentStatus.REWORK]: 25,
    [AssessmentStatus.NEEDS_REWORK]: 25,
    [AssessmentStatus.DRAFT]: 0,
  };

  return progressByStatus[status] ?? 0;
}

/**
 * Transforms validator data from the API into UI format.
 */
function transformValidators(
  validators?: ApiAssessment["validators"]
): SubmissionUIModel["assignedValidators"] {
  if (!validators || !Array.isArray(validators)) {
    return [];
  }

  return validators.map((v) => ({
    id: v.id,
    name: v.name,
    avatar: v.initials ?? "?",
  }));
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
