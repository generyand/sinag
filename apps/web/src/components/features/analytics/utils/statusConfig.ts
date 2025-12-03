import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileSearch,
  type LucideIcon,
} from "lucide-react";

/**
 * Status configuration for badges and visual indicators.
 */
export interface StatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
  icon?: LucideIcon;
}

/**
 * Assessment status configuration.
 * Maps API status values to UI display properties.
 */
export const ASSESSMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  COMPLETED: {
    label: "Completed",
    bgColor: "bg-green-600",
    textColor: "text-white",
    icon: CheckCircle,
  },
  VALIDATED: {
    label: "Validated",
    bgColor: "bg-green-600",
    textColor: "text-white",
    icon: CheckCircle,
  },
  AWAITING_MLGOO_APPROVAL: {
    label: "Awaiting Approval",
    bgColor: "bg-yellow-600",
    textColor: "text-white",
    icon: Clock,
  },
  AWAITING_FINAL_VALIDATION: {
    label: "Awaiting Validation",
    bgColor: "bg-purple-600",
    textColor: "text-white",
    icon: Clock,
  },
  IN_REVIEW: {
    label: "In Review",
    bgColor: "bg-blue-600",
    textColor: "text-white",
    icon: FileSearch,
  },
  SUBMITTED: {
    label: "In Review",
    bgColor: "bg-blue-600",
    textColor: "text-white",
    icon: FileSearch,
  },
  REWORK: {
    label: "Rework",
    bgColor: "bg-orange-600",
    textColor: "text-white",
    icon: AlertTriangle,
  },
  NEEDS_REWORK: {
    label: "Rework",
    bgColor: "bg-orange-600",
    textColor: "text-white",
    icon: AlertTriangle,
  },
  DRAFT: {
    label: "Draft",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-700 dark:text-gray-300",
  },
  NO_ASSESSMENT: {
    label: "No Assessment",
    bgColor: "bg-transparent",
    textColor: "text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600",
  },
  NO_USER_ASSIGNED: {
    label: "No User",
    bgColor: "bg-transparent",
    textColor: "text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700",
  },
};

/**
 * Compliance status configuration.
 */
export const COMPLIANCE_STATUS_CONFIG: Record<string, StatusConfig> = {
  PASSED: {
    label: "Passed",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-800 dark:text-green-300",
    icon: CheckCircle,
  },
  COMPLIANT: {
    label: "Passed",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-800 dark:text-green-300",
    icon: CheckCircle,
  },
  FAILED: {
    label: "Failed",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-800 dark:text-red-300",
    icon: XCircle,
  },
  NON_COMPLIANT: {
    label: "Failed",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-800 dark:text-red-300",
    icon: XCircle,
  },
};

/**
 * Gets the assessment status configuration.
 */
export function getAssessmentStatusConfig(status: string): StatusConfig {
  return ASSESSMENT_STATUS_CONFIG[status] ?? ASSESSMENT_STATUS_CONFIG.NO_ASSESSMENT;
}

/**
 * Gets the compliance status configuration.
 */
export function getComplianceStatusConfig(status: string | null): StatusConfig | null {
  if (!status) return null;
  return COMPLIANCE_STATUS_CONFIG[status] ?? null;
}

/**
 * Gets the color for a pass/compliance rate percentage.
 * Green (≥70%), Yellow (50-69%), Red (<50%)
 */
export function getRateColor(rate: number): { text: string; bg: string } {
  if (rate >= 70) {
    return {
      text: "text-green-600 dark:text-green-400",
      bg: "bg-green-500",
    };
  }
  if (rate >= 50) {
    return {
      text: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-500",
    };
  }
  return {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500",
  };
}

/**
 * Gets the progress bar color class based on percentage and type.
 * For compliance: Green (≥70%), Yellow (50-69%), Red (<50%)
 * For progress: Blue (neutral, not good/bad)
 */
export function getProgressBarColor(
  value: number,
  type: "compliance" | "progress" = "compliance"
): string {
  if (type === "progress") {
    return "bg-blue-500";
  }

  if (value >= 70) return "bg-green-500";
  if (value >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

/**
 * Gets the fail rate severity configuration.
 * Higher fail rate = more critical (red)
 */
export function getFailRateSeverity(rate: number): {
  color: string;
  bg: string;
  label: string;
} {
  if (rate >= 70) {
    return {
      color: "text-red-700 dark:text-red-300",
      bg: "bg-red-50 dark:bg-red-900/30",
      label: "Critical",
    };
  }
  if (rate >= 50) {
    return {
      color: "text-orange-700 dark:text-orange-300",
      bg: "bg-orange-50 dark:bg-orange-900/30",
      label: "High",
    };
  }
  if (rate >= 30) {
    return {
      color: "text-yellow-700 dark:text-yellow-300",
      bg: "bg-yellow-50 dark:bg-yellow-900/30",
      label: "Moderate",
    };
  }
  return {
    color: "text-gray-700 dark:text-gray-300",
    bg: "bg-gray-50 dark:bg-gray-800/30",
    label: "Low",
  };
}

/**
 * Score color configuration for barangay scores.
 */
export function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}
