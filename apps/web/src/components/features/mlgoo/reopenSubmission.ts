import { AssessmentStatus } from "@sinag/shared";

export const REOPENABLE_ASSESSMENT_STATUSES = new Set<string>([
  AssessmentStatus.SUBMITTED,
  AssessmentStatus.SUBMITTED_FOR_REVIEW,
  AssessmentStatus.IN_REVIEW,
  AssessmentStatus.AWAITING_FINAL_VALIDATION,
  AssessmentStatus.AWAITING_MLGOO_APPROVAL,
]);

export function canReopenSubmission(
  status: string | null | undefined,
  isLockedForBlgu: boolean
): boolean {
  if (!status || isLockedForBlgu) {
    return false;
  }

  return REOPENABLE_ASSESSMENT_STATUSES.has(status);
}
