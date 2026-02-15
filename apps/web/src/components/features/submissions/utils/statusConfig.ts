import { AssessmentStatus } from "@sinag/shared";
import { Clock, CheckCircle, AlertTriangle, XCircle, type LucideIcon } from "lucide-react";
import type { UnifiedStatus } from "@/types/submissions";

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

/**
 * Statuses that should be clickable to view rework/calibration details.
 * These statuses indicate that there are items requiring attention.
 */
export const CLICKABLE_STATUSES = [
  "Needs Rework",
  "MLGOO RE-Calibration",
  "Awaiting Final Validation",
] as const;

/**
 * Determines if a status badge should be clickable.
 * Clickable statuses navigate to the detailed assessment view.
 */
export function isStatusClickable(status: string): boolean {
  return CLICKABLE_STATUSES.includes(status as (typeof CLICKABLE_STATUSES)[number]);
}

/**
 * Gets a tooltip message for clickable status badges.
 */
export function getStatusClickTooltip(status: string): string | null {
  switch (status) {
    case "Needs Rework":
      return "Click to view indicators marked for rework";
    case "MLGOO RE-Calibration":
      return "Click to view calibration details";
    case "Awaiting Final Validation":
      return "Click to view validation progress";
    default:
      return null;
  }
}

// ============================================================================
// Unified Status Configuration for Assessor/Validator Dashboard
// ============================================================================

export interface UnifiedStatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
  actionLabel: string;
  actionVariant: "default" | "outline" | "ghost";
  actionColorClass: string;
}

/**
 * Unified status display and action configuration for Assessor/Validator dashboard.
 * Maps UnifiedStatus values to UI presentation and action button styling.
 */
export const UNIFIED_STATUS_CONFIG: Record<UnifiedStatus, UnifiedStatusConfig> = {
  awaiting_assessment: {
    label: "Awaiting Assessment",
    bgColor: "var(--kpi-blue-bg)",
    textColor: "var(--kpi-blue-text)",
    actionLabel: "Start Review",
    actionVariant: "default",
    actionColorClass:
      "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white",
  },
  assessment_in_progress: {
    label: "Assessment In Progress",
    bgColor: "var(--kpi-blue-bg)",
    textColor: "var(--kpi-blue-text)",
    actionLabel: "Continue Review",
    actionVariant: "outline",
    actionColorClass: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
  },
  sent_for_rework: {
    label: "Sent for Rework",
    bgColor: "var(--muted)",
    textColor: "var(--text-muted)",
    actionLabel: "View",
    actionVariant: "ghost",
    actionColorClass: "text-[var(--text-muted)] hover:text-[var(--foreground)]",
  },
  awaiting_re_review: {
    label: "Awaiting Re-Review",
    bgColor: "var(--kpi-orange-bg)",
    textColor: "var(--kpi-orange-text)",
    actionLabel: "Re-Review",
    actionVariant: "default",
    actionColorClass:
      "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white",
  },
  re_assessment_in_progress: {
    label: "Re-Assessment in Progress",
    bgColor: "var(--kpi-orange-bg)",
    textColor: "var(--kpi-orange-text)",
    actionLabel: "Resume Re-Review",
    actionVariant: "outline",
    actionColorClass: "border-2 border-orange-500 text-orange-500 hover:bg-orange-50",
  },
  reviewed: {
    label: "Reviewed",
    bgColor: "var(--kpi-green-bg)",
    textColor: "var(--kpi-green-text)",
    actionLabel: "View",
    actionVariant: "ghost",
    actionColorClass: "text-[var(--text-muted)] hover:text-[var(--foreground)]",
  },
};

/**
 * Validator-specific unified status config.
 * Uses validation terminology instead of assessment terminology.
 */
export const VALIDATOR_UNIFIED_STATUS_CONFIG: Record<UnifiedStatus, UnifiedStatusConfig> = {
  awaiting_assessment: {
    label: "Awaiting Validation",
    bgColor: "var(--kpi-blue-bg)",
    textColor: "var(--kpi-blue-text)",
    actionLabel: "Start Validation",
    actionVariant: "default",
    actionColorClass:
      "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white",
  },
  assessment_in_progress: {
    label: "Validation In Progress",
    bgColor: "var(--kpi-blue-bg)",
    textColor: "var(--kpi-blue-text)",
    actionLabel: "Continue Validation",
    actionVariant: "outline",
    actionColorClass: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
  },
  sent_for_rework: {
    label: "Sent for Calibration",
    bgColor: "var(--muted)",
    textColor: "var(--text-muted)",
    actionLabel: "View",
    actionVariant: "ghost",
    actionColorClass: "text-[var(--text-muted)] hover:text-[var(--foreground)]",
  },
  awaiting_re_review: {
    label: "Awaiting Re-Validation",
    bgColor: "var(--kpi-orange-bg)",
    textColor: "var(--kpi-orange-text)",
    actionLabel: "Re-Validate",
    actionVariant: "default",
    actionColorClass:
      "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white",
  },
  re_assessment_in_progress: {
    label: "Re-Validation in Progress",
    bgColor: "var(--kpi-orange-bg)",
    textColor: "var(--kpi-orange-text)",
    actionLabel: "Resume Re-Validation",
    actionVariant: "outline",
    actionColorClass: "border-2 border-orange-500 text-orange-500 hover:bg-orange-50",
  },
  reviewed: {
    label: "Validated",
    bgColor: "var(--kpi-green-bg)",
    textColor: "var(--kpi-green-text)",
    actionLabel: "View",
    actionVariant: "ghost",
    actionColorClass: "text-[var(--text-muted)] hover:text-[var(--foreground)]",
  },
};

/**
 * Filter options for unified status in Assessor dashboard.
 */
export const UNIFIED_STATUS_FILTER_OPTIONS = [
  {
    value: "awaiting_assessment",
    label: "Awaiting Assessment",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "assessment_in_progress",
    label: "Assessment In Progress",
    color: "bg-blue-100 text-blue-800",
  },
  { value: "sent_for_rework", label: "Sent for Rework", color: "bg-gray-100 text-gray-800" },
  {
    value: "awaiting_re_review",
    label: "Awaiting Re-Review",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "re_assessment_in_progress",
    label: "Re-Assessment in Progress",
    color: "bg-orange-100 text-orange-800",
  },
  { value: "reviewed", label: "Reviewed", color: "bg-green-100 text-green-800" },
] as const;

/**
 * Filter options for unified status in Validator dashboard.
 */
export const VALIDATOR_UNIFIED_STATUS_FILTER_OPTIONS = [
  {
    value: "awaiting_assessment",
    label: "Awaiting Validation",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "assessment_in_progress",
    label: "Validation In Progress",
    color: "bg-blue-100 text-blue-800",
  },
  { value: "sent_for_rework", label: "Sent for Calibration", color: "bg-gray-100 text-gray-800" },
  {
    value: "awaiting_re_review",
    label: "Awaiting Re-Validation",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "re_assessment_in_progress",
    label: "Re-Validation in Progress",
    color: "bg-orange-100 text-orange-800",
  },
  { value: "reviewed", label: "Validated", color: "bg-green-100 text-green-800" },
] as const;

/**
 * Gets the unified status configuration for a given status.
 * Falls back to awaiting_assessment if status is not found.
 */
export function getUnifiedStatusConfig(status: UnifiedStatus): UnifiedStatusConfig {
  return UNIFIED_STATUS_CONFIG[status] ?? UNIFIED_STATUS_CONFIG["awaiting_assessment"];
}
