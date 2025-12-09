"use client";

/**
 * BBIComplianceCard Component
 *
 * Displays BBI (Barangay-based Institutions) compliance results
 * based on DILG MC 2024-417 guidelines (4-tier system).
 *
 * Shows the 7 mandatory BBIs with their compliance ratings:
 * - HIGHLY_FUNCTIONAL: 75-100% (green)
 * - MODERATELY_FUNCTIONAL: 50-74% (yellow/amber)
 * - LOW_FUNCTIONAL: 1-49% (orange)
 * - NON_FUNCTIONAL: 0% (red)
 *
 * Only displayed when assessment is COMPLETED.
 */

import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Users,
  Shield,
  Heart,
  Briefcase,
  Leaf,
  Scale,
} from "lucide-react";
import { useState } from "react";

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

interface BBIComplianceCardProps {
  data?: BBIComplianceData;
  isLoading?: boolean;
}

// Map BBI abbreviations to icons
const BBIIcons: Record<string, React.ElementType> = {
  BDC: Users, // Barangay Development Council
  BDRRMC: Shield, // Barangay Disaster Risk Reduction and Management Committee
  BPOC: Scale, // Barangay Peace and Order Council
  BESWMC: Leaf, // Barangay Environmental and Solid Waste Management Committee
  "VAW Desk": Heart, // Violence Against Women Desk
  BCPC: Users, // Barangay Council for the Protection of Children
  BADAC: Briefcase, // Barangay Anti-Drug Abuse Council
};

// Get rating color classes (4-tier system)
function getRatingColor(rating: string): {
  bg: string;
  text: string;
  border: string;
  icon: React.ElementType;
  label: string;
} {
  switch (rating) {
    case "HIGHLY_FUNCTIONAL":
      return {
        bg: "bg-green-100 dark:bg-green-950/30",
        text: "text-green-700 dark:text-green-300",
        border: "border-green-200 dark:border-green-800",
        icon: CheckCircle2,
        label: "Highly Functional",
      };
    case "MODERATELY_FUNCTIONAL":
      return {
        bg: "bg-amber-100 dark:bg-amber-950/30",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-800",
        icon: AlertTriangle,
        label: "Moderately Functional",
      };
    case "LOW_FUNCTIONAL":
      return {
        bg: "bg-orange-100 dark:bg-orange-950/30",
        text: "text-orange-700 dark:text-orange-300",
        border: "border-orange-200 dark:border-orange-800",
        icon: AlertTriangle,
        label: "Low Functional",
      };
    case "NON_FUNCTIONAL":
    default:
      return {
        bg: "bg-red-100 dark:bg-red-950/30",
        text: "text-red-700 dark:text-red-300",
        border: "border-red-200 dark:border-red-800",
        icon: XCircle,
        label: "Non Functional",
      };
  }
}

// Format percentage for display
function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

// Single BBI Card
function BBICard({ result }: { result: BBIComplianceResult }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rating = getRatingColor(result.compliance_rating);
  const Icon = BBIIcons[result.bbi_abbreviation] || Building2;
  const RatingIcon = rating.icon;

  return (
    <div className={`rounded-lg border ${rating.border} ${rating.bg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${rating.bg} ${rating.text}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="font-medium text-[var(--foreground)]">{result.bbi_abbreviation}</h4>
            <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{result.bbi_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <RatingIcon className={`w-4 h-4 ${rating.text}`} />
              <span className={`text-sm font-semibold ${rating.text}`}>
                {formatPercentage(result.compliance_percentage)}
              </span>
            </div>
            <p className={`text-xs ${rating.text}`}>{rating.label}</p>
          </div>
          {result.sub_indicator_results.length > 0 &&
            (isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
            ))}
        </div>
      </button>

      {/* Expanded Sub-indicators */}
      {isExpanded && result.sub_indicator_results.length > 0 && (
        <div className="px-4 pb-4 pt-2 border-t border-[var(--border)]">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
            Sub-indicators ({result.sub_indicators_passed}/{result.sub_indicators_total} passed)
          </p>
          <div className="space-y-1.5">
            {result.sub_indicator_results.map((sub, index) => (
              <div key={index} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2">
                  {sub.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                  )}
                  <span className="text-[var(--foreground)]">{sub.name}</span>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">{sub.code}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Summary Card (4-tier system)
function SummaryCard({ summary }: { summary: BBIComplianceSummary }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-[var(--foreground)]">BBI Summary</h4>
        <span className="text-lg font-bold text-[var(--foreground)]">
          {formatPercentage(summary.average_compliance_percentage)} avg
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-green-100 dark:bg-green-950/30 rounded-lg p-2">
          <p className="text-xl font-bold text-green-700 dark:text-green-300">
            {summary.highly_functional_count}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">Highly</p>
        </div>
        <div className="bg-amber-100 dark:bg-amber-950/30 rounded-lg p-2">
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
            {summary.moderately_functional_count}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">Moderate</p>
        </div>
        <div className="bg-orange-100 dark:bg-orange-950/30 rounded-lg p-2">
          <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
            {summary.low_functional_count}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400">Low</p>
        </div>
        <div className="bg-red-100 dark:bg-red-950/30 rounded-lg p-2">
          <p className="text-xl font-bold text-red-700 dark:text-red-300">
            {summary.non_functional_count}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">Non</p>
        </div>
      </div>
    </div>
  );
}

// Loading skeleton
function BBIComplianceSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function BBIComplianceCard({ data, isLoading = false }: BBIComplianceCardProps) {
  if (isLoading) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Barangay-Based Institutions (BBIs)
        </h3>
        <BBIComplianceSkeleton />
      </div>
    );
  }

  if (!data || data.bbi_results.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Barangay-Based Institutions (BBIs)
        </h3>
        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-[var(--border)]">
          <Building2 className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-[var(--text-secondary)]">
            BBI compliance data will be available after assessment processing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <Building2 className="w-5 h-5" />
        Barangay-Based Institutions (BBIs)
      </h3>

      {/* Summary */}
      <SummaryCard summary={data.summary} />

      {/* BBI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.bbi_results.map((result) => (
          <BBICard key={result.bbi_id} result={result} />
        ))}
      </div>

      {/* DILG Reference */}
      <p className="text-xs text-[var(--text-secondary)] mt-4 text-center">
        Compliance ratings based on DILG MC 2024-417 guidelines
      </p>
    </div>
  );
}

export default BBIComplianceCard;
