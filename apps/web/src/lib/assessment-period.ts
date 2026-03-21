export function formatAssessmentPeriodLabel(year: number): string {
  return `SGLGB ${year}`;
}

export function getAssessmentPeriodLabel(
  assessmentPeriod?: string | null,
  fallbackYear?: number | null
): string {
  if (assessmentPeriod) {
    return assessmentPeriod;
  }

  if (fallbackYear) {
    return formatAssessmentPeriodLabel(fallbackYear);
  }

  return "";
}

export function getAssessmentPeriodOptions(years: number[]): string[] {
  return [...years]
    .sort((left, right) => right - left)
    .map((year) => formatAssessmentPeriodLabel(year));
}
