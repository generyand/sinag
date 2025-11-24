/**
 * TypeScript interfaces for AI-generated rework summary feature
 *
 * These types mirror the Pydantic schemas defined in:
 * apps/api/app/schemas/assessment.py (IndicatorSummary, ReworkSummaryResponse)
 *
 * TODO: Replace with auto-generated types from @vantage/shared after running pnpm generate-types
 */

export interface IndicatorSummary {
  /** ID of the indicator requiring rework */
  indicator_id: number;

  /** Full name of the indicator (e.g., '1.1 Budget Ordinance') */
  indicator_name: string;

  /** List of specific issues identified by the assessor */
  key_issues: string[];

  /** Actionable steps the BLGU should take to address the issues */
  suggested_actions: string[];

  /** List of MOV filenames that have annotations or issues */
  affected_movs: string[];
}

export interface ReworkSummaryResponse {
  /** Brief 2-3 sentence overview of the main issues across all indicators */
  overall_summary: string;

  /** Detailed summaries for each indicator requiring rework */
  indicator_summaries: IndicatorSummary[];

  /** Top 3-5 most critical actions the BLGU should prioritize */
  priority_actions: string[];

  /** Estimated time to complete all rework (e.g., '30-45 minutes') */
  estimated_time?: string;

  /** Timestamp when the summary was generated */
  generated_at: string;
}
