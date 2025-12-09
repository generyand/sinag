/**
 * Assessment Period Status
 */
export type AssessmentPeriodStatus = "active" | "upcoming" | "archived";

/**
 * Assessment Period
 */
export interface AssessmentPeriod extends Record<string, unknown> {
  id: string;
  performanceYear: number;
  assessmentYear: number;
  status: AssessmentPeriodStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create Assessment Period Request
 */
export interface CreateAssessmentPeriodRequest {
  performanceYear: number;
  assessmentYear: number;
}

/**
 * Assessment Period Deadlines
 */
export interface AssessmentPeriodDeadlines {
  id: string;
  periodId: string;
  blguSubmissionDeadline: string;
  reworkCompletionDeadline: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Update Deadlines Request
 */
export interface UpdateDeadlinesRequest {
  blguSubmissionDeadline: string;
  reworkCompletionDeadline: string;
}

/**
 * Confirmation Dialog Props
 */
export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}
