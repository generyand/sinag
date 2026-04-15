import type { IndicatorDetailItem } from "@sinag/shared";

type ProgressBreakdown = {
  completedCount: number;
  flaggedCount: number;
  processedCount: number;
  pendingCount: number;
};

export function isAssessorIndicatorCompleted(indicator: IndicatorDetailItem): boolean {
  const indicatorWithProgress = indicator as IndicatorDetailItem & {
    assessor_reviewed?: boolean;
  };

  if (
    indicator.flagged_for_calibration ||
    indicator.requires_rework ||
    indicator.is_recalibration_target
  ) {
    return false;
  }

  if (typeof indicatorWithProgress.assessor_reviewed === "boolean") {
    return indicatorWithProgress.assessor_reviewed;
  }

  return Boolean(indicator.assessor_remarks && indicator.assessor_remarks.trim().length > 0);
}

export function isValidatorIndicatorCompleted(indicator: IndicatorDetailItem): boolean {
  const indicatorWithProgress = indicator as IndicatorDetailItem & {
    validator_reviewed?: boolean;
  };

  if (indicator.flagged_for_calibration || indicator.is_recalibration_target) {
    return false;
  }

  if (typeof indicatorWithProgress.validator_reviewed === "boolean") {
    return indicatorWithProgress.validator_reviewed;
  }

  const validationStatus = (indicator.validation_status || "").toUpperCase();
  return (
    validationStatus === "PASS" || validationStatus === "FAIL" || validationStatus === "CONDITIONAL"
  );
}

function getValidationStatusLabel(status?: string | null): string {
  switch ((status || "").toUpperCase()) {
    case "PASS":
      return "Pass";
    case "FAIL":
      return "Fail";
    case "CONDITIONAL":
      return "Conditional";
    default:
      return "Pending";
  }
}

export function getAssessorIndicatorDetail(indicator: IndicatorDetailItem): {
  label: string;
  isPositive: boolean;
} {
  if (indicator.flagged_for_calibration) {
    return { label: "Flagged for Calibration", isPositive: false };
  }

  if (indicator.requires_rework) {
    return { label: "Flagged for Rework", isPositive: false };
  }

  if (isAssessorIndicatorCompleted(indicator)) {
    return { label: "Complete", isPositive: true };
  }

  return { label: "Pending", isPositive: false };
}

export function getValidatorIndicatorDetail(indicator: IndicatorDetailItem): {
  label: string;
  isPositive: boolean;
} {
  if (indicator.flagged_for_calibration) {
    return { label: "Flagged for Calibration", isPositive: false };
  }

  if (isValidatorIndicatorCompleted(indicator)) {
    return { label: getValidationStatusLabel(indicator.validation_status), isPositive: true };
  }

  return { label: "Pending", isPositive: false };
}

function buildProgressBreakdown(
  indicators: IndicatorDetailItem[],
  getDetail: (indicator: IndicatorDetailItem) => { label: string; isPositive: boolean }
): ProgressBreakdown {
  let completedCount = 0;
  let flaggedCount = 0;

  for (const indicator of indicators) {
    const detail = getDetail(indicator);
    if (detail.isPositive) {
      completedCount += 1;
      continue;
    }

    if (detail.label === "Flagged for Rework" || detail.label === "Flagged for Calibration") {
      flaggedCount += 1;
    }
  }

  return {
    completedCount,
    flaggedCount,
    processedCount: completedCount + flaggedCount,
    pendingCount: Math.max(0, indicators.length - completedCount - flaggedCount),
  };
}

export function getAssessorProgressBreakdown(indicators: IndicatorDetailItem[]): ProgressBreakdown {
  return buildProgressBreakdown(indicators, getAssessorIndicatorDetail);
}

export function getValidatorProgressBreakdown(
  indicators: IndicatorDetailItem[]
): ProgressBreakdown {
  return buildProgressBreakdown(indicators, getValidatorIndicatorDetail);
}
