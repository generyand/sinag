"use client";

/**
 * BBIComplianceSection Component
 *
 * Displays BBI (Barangay-based Institutions) compliance results
 * within the GAR (Governance Assessment Report) following the same
 * styling pattern as other GAR sections.
 *
 * Shows the 7 mandatory BBIs with their compliance ratings (4-tier system):
 * - HIGHLY_FUNCTIONAL: 75-100% (green)
 * - MODERATELY_FUNCTIONAL: 50-74% (yellow/amber)
 * - LOW_FUNCTIONAL: 1-49% (orange)
 * - NON_FUNCTIONAL: 0% (red)
 *
 * Per DILG MC 2024-417 guidelines.
 */

import { Building2 } from "lucide-react";

// BBI compliance types (matching backend schema)
export interface SubIndicatorResult {
  code: string;
  name: string;
  passed: boolean;
  validation_rule?: string;
  checklist_summary?: Record<string, unknown>;
}

export interface BBIComplianceResult {
  bbi_id: number;
  bbi_name: string;
  bbi_abbreviation: string;
  indicator_code?: string;
  governance_area_id: number;
  governance_area_name?: string;
  assessment_id: number;
  barangay_id: number;
  assessment_year: number;
  compliance_percentage: number;
  compliance_rating: string;
  sub_indicators_passed: number;
  sub_indicators_total: number;
  sub_indicator_results: SubIndicatorResult[];
  calculated_at: string;
}

export interface BBIComplianceSummary {
  total_bbis: number;
  highly_functional_count: number;
  moderately_functional_count: number;
  low_functional_count: number;
  non_functional_count: number;
  average_compliance_percentage: number;
}

export interface BBIComplianceData {
  assessment_id: number;
  barangay_id: number;
  barangay_name?: string;
  assessment_year: number;
  bbi_results: BBIComplianceResult[];
  summary: BBIComplianceSummary;
  calculated_at: string;
}

interface BBIComplianceSectionProps {
  data?: BBIComplianceData;
}

// Get rating color for the result bar (4-tier system)
function getRatingColor(rating: string): string {
  switch (rating) {
    case "HIGHLY_FUNCTIONAL":
      return "bg-green-500";
    case "MODERATELY_FUNCTIONAL":
      return "bg-yellow-400";
    case "LOW_FUNCTIONAL":
      return "bg-orange-500";
    case "NON_FUNCTIONAL":
    default:
      return "bg-red-500";
  }
}

// Get rating label for display
function getRatingLabel(rating: string): string {
  switch (rating) {
    case "HIGHLY_FUNCTIONAL":
      return "Highly Functional";
    case "MODERATELY_FUNCTIONAL":
      return "Moderately Functional";
    case "LOW_FUNCTIONAL":
      return "Low Functional";
    case "NON_FUNCTIONAL":
    default:
      return "Non Functional";
  }
}

export function BBIComplianceSection({ data }: BBIComplianceSectionProps) {
  if (!data || data.bbi_results.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
      {/* Section Header */}
      <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-3 border-b border-[var(--border)]">
        <h3 className="font-bold text-[var(--foreground)] flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          BARANGAY-BASED INSTITUTIONS (BBIs)
        </h3>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          Per DILG MC 2024-417 Guidelines
        </p>
      </div>

      {/* BBI Table */}
      {/* BBI Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-[var(--muted)]/30">
              <th className="text-left px-4 py-2 font-semibold text-[var(--foreground)] border-b border-[var(--border)]">
                BBI
              </th>
              <th className="text-center px-4 py-2 font-semibold text-[var(--foreground)] border-b border-[var(--border)] w-28">
                COMPLIANCE
              </th>
              <th className="text-center px-4 py-2 font-semibold text-[var(--foreground)] border-b border-[var(--border)] w-36">
                RATING
                <br />
                <span className="text-xs font-normal">
                  (<span className="text-green-600">high</span>,{" "}
                  <span className="text-yellow-600">mod</span>,{" "}
                  <span className="text-orange-600">low</span>,{" "}
                  <span className="text-red-600">non</span>)
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.bbi_results.map((bbi) => (
              <tr key={bbi.bbi_id} className="border-b border-[var(--border)]">
                <td className="px-4 py-2">
                  <div>
                    <span className="font-medium text-[var(--foreground)]">
                      {bbi.bbi_abbreviation}
                    </span>
                    <p className="text-xs text-[var(--muted-foreground)]">{bbi.bbi_name}</p>
                  </div>
                </td>
                <td className="px-4 py-2 text-center">
                  <span className="font-semibold text-[var(--foreground)]">
                    {Math.round(bbi.compliance_percentage)}%
                  </span>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    ({bbi.sub_indicators_passed}/{bbi.sub_indicators_total})
                  </p>
                </td>
                <td className="px-4 py-2">
                  <div
                    className={`h-6 w-full rounded-sm ${getRatingColor(bbi.compliance_rating)}`}
                    title={getRatingLabel(bbi.compliance_rating)}
                  />
                </td>
              </tr>
            ))}

            {/* Overall BBI Result Row */}
            <tr className="bg-blue-100 dark:bg-blue-900/30 border-t-2 border-blue-500">
              <td className="px-4 py-3 font-bold text-[var(--foreground)]">AVERAGE COMPLIANCE</td>
              <td className="px-4 py-3 text-center font-bold text-[var(--foreground)]">
                {Math.round(data.summary.average_compliance_percentage)}%
              </td>
              <td className="px-4 py-3">
                <div
                  className={`h-8 w-full rounded-sm ${
                    data.summary.average_compliance_percentage >= 75
                      ? "bg-green-500"
                      : data.summary.average_compliance_percentage >= 50
                        ? "bg-yellow-400"
                        : data.summary.average_compliance_percentage > 0
                          ? "bg-orange-500"
                          : "bg-red-500"
                  }`}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* BBI Stats */}
      <div className="px-4 py-3 bg-[var(--muted)]/10 flex flex-wrap items-center gap-4 text-sm border-t border-[var(--border)]">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm bg-green-500"></span>
          Highly: {data.summary.highly_functional_count}
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm bg-yellow-400"></span>
          Moderate: {data.summary.moderately_functional_count}
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm bg-orange-500"></span>
          Low: {data.summary.low_functional_count}
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm bg-red-500"></span>
          Non: {data.summary.non_functional_count}
        </span>
      </div>
    </div>
  );
}

export default BBIComplianceSection;
