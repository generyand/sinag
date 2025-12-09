import { AssessmentStatus } from "@sinag/shared";
import { Clock, CheckCircle, AlertTriangle, XCircle, type LucideIcon } from "lucide-react";

export interface StatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
  icon: LucideIcon;
}

/**
 * Status display configuration mapping API status values to UI presentation.
 * Single source of truth for status styling across the submissions feature.
 */
export const STATUS_DISPLAY_MAP: Record<string, StatusConfig> = {
  // Final states (Green)
  Completed: {
    label: "Completed",
    bgColor: "var(--analytics-success-bg)",
    textColor: "var(--analytics-success-text)",
    icon: CheckCircle,
  },
  Validated: {
    label: "Validated",
    bgColor: "var(--analytics-success-bg)",
    textColor: "var(--analytics-success-text)",
    icon: CheckCircle,
  },
  // Admin action needed (Purple)
  "Awaiting MLGOO Approval": {
    label: "Awaiting MLGOO Approval",
    bgColor: "var(--kpi-purple-from)",
    textColor: "var(--kpi-purple-text)",
    icon: Clock,
  },
  "Awaiting Final Validation": {
    label: "Awaiting Final Validation",
    bgColor: "var(--kpi-purple-from)",
    textColor: "var(--kpi-purple-text)",
    icon: Clock,
  },
  "MLGOO RE-Calibration": {
    label: "MLGOO RE-Calibration",
    bgColor: "var(--kpi-purple-from)",
    textColor: "var(--kpi-purple-text)",
    icon: AlertTriangle,
  },
  // Active processing (Blue)
  "In Review": {
    label: "In Review",
    bgColor: "var(--kpi-blue-from)",
    textColor: "var(--kpi-blue-text)",
    icon: Clock,
  },
  // BLGU action needed (Amber/Orange)
  "Submitted for Review": {
    label: "Submitted for Review",
    bgColor: "var(--analytics-warning-bg)",
    textColor: "var(--analytics-warning-text)",
    icon: Clock,
  },
  "Needs Rework": {
    label: "Needs Rework",
    bgColor: "var(--analytics-warning-bg)",
    textColor: "var(--analytics-warning-text)",
    icon: AlertTriangle,
  },
  // Inactive (Gray)
  Draft: {
    label: "Draft",
    bgColor: "var(--analytics-neutral-bg)",
    textColor: "var(--analytics-neutral-text)",
    icon: XCircle,
  },
};

/**
 * Maps API AssessmentStatus enum values to human-readable display labels.
 */
export const API_STATUS_TO_LABEL: Record<string, string> = {
  [AssessmentStatus.COMPLETED]: "Completed",
  [AssessmentStatus.VALIDATED]: "Validated",
  [AssessmentStatus.AWAITING_FINAL_VALIDATION]: "Awaiting Final Validation",
  [AssessmentStatus.AWAITING_MLGOO_APPROVAL]: "Awaiting MLGOO Approval",
  [AssessmentStatus.IN_REVIEW]: "In Review",
  [AssessmentStatus.REWORK]: "Needs Rework",
  [AssessmentStatus.SUBMITTED]: "Submitted for Review",
  [AssessmentStatus.DRAFT]: "Draft",
  [AssessmentStatus.SUBMITTED_FOR_REVIEW]: "Submitted for Review",
  [AssessmentStatus.NEEDS_REWORK]: "Needs Rework",
};

/**
 * Maps UI filter values to API AssessmentStatus enum values.
 */
export const FILTER_TO_API_STATUS: Record<string, AssessmentStatus> = {
  completed: AssessmentStatus.COMPLETED,
  validated: AssessmentStatus.VALIDATED,
  awaiting_final: AssessmentStatus.AWAITING_FINAL_VALIDATION,
  awaiting_mlgoo: AssessmentStatus.AWAITING_MLGOO_APPROVAL,
  in_review: AssessmentStatus.IN_REVIEW,
  rework: AssessmentStatus.REWORK,
  submitted: AssessmentStatus.SUBMITTED,
  draft: AssessmentStatus.DRAFT,
};

/**
 * Gets the status configuration for a given display status.
 * Falls back to Draft config if status is not found.
 */
export function getStatusConfig(status: string): StatusConfig {
  return STATUS_DISPLAY_MAP[status] ?? STATUS_DISPLAY_MAP["Draft"];
}

/**
 * Gets the progress bar color based on progress percentage.
 */
export function getProgressBarColor(progress: number): string {
  if (progress >= 90) return "var(--analytics-success)";
  if (progress >= 40) return "var(--analytics-warning)";
  return "var(--analytics-danger)";
}

/**
 * Status filter options for the dropdown.
 */
export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "awaiting_mlgoo", label: "Awaiting MLGOO Approval" },
  { value: "validated", label: "Validated" },
  { value: "awaiting_final", label: "Awaiting Final Validation" },
  { value: "in_review", label: "In Review" },
  { value: "submitted", label: "Submitted" },
  { value: "rework", label: "Needs Rework" },
  { value: "draft", label: "Draft" },
] as const;
