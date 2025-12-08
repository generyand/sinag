"use client";

/**
 * BBIPreviewPanel Component
 *
 * Displays a compact preview of BBI compliance ratings for validators.
 * Shows predicted ratings based on current validation status.
 *
 * Per DILG MC 2024-417 guidelines (4-tier system):
 * - HIGHLY_FUNCTIONAL: 75-100%
 * - MODERATELY_FUNCTIONAL: 50-74%
 * - LOW_FUNCTIONAL: 1-49%
 * - NON_FUNCTIONAL: 0%
 */

import { useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// BBI compliance types
export interface BBIPreviewResult {
  bbi_id: number;
  bbi_name: string;
  bbi_abbreviation: string;
  compliance_percentage: number;
  compliance_rating: string;
  sub_indicators_passed: number;
  sub_indicators_total: number;
}

export interface BBIPreviewData {
  bbi_results: BBIPreviewResult[];
  average_compliance: number;
}

interface BBIPreviewPanelProps {
  data?: BBIPreviewData;
  isLoading?: boolean;
}

// Get rating color classes (4-tier system)
function getRatingStyle(rating: string): {
  bg: string;
  text: string;
  icon: React.ElementType;
} {
  switch (rating) {
    case "HIGHLY_FUNCTIONAL":
      return {
        bg: "bg-green-100 dark:bg-green-950/30",
        text: "text-green-700 dark:text-green-300",
        icon: CheckCircle2,
      };
    case "MODERATELY_FUNCTIONAL":
      return {
        bg: "bg-amber-100 dark:bg-amber-950/30",
        text: "text-amber-700 dark:text-amber-300",
        icon: AlertTriangle,
      };
    case "LOW_FUNCTIONAL":
      return {
        bg: "bg-orange-100 dark:bg-orange-950/30",
        text: "text-orange-700 dark:text-orange-300",
        icon: AlertTriangle,
      };
    case "NON_FUNCTIONAL":
    default:
      return {
        bg: "bg-red-100 dark:bg-red-950/30",
        text: "text-red-700 dark:text-red-300",
        icon: XCircle,
      };
  }
}

export function BBIPreviewPanel({ data, isLoading = false }: BBIPreviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-sm">
        <div className="px-4 py-2 flex items-center gap-2 animate-pulse">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Loading BBI preview...
          </span>
        </div>
      </div>
    );
  }

  if (!data || data.bbi_results.length === 0) {
    return null;
  }

  const highly = data.bbi_results.filter(
    (r) => r.compliance_rating === "HIGHLY_FUNCTIONAL"
  ).length;
  const moderate = data.bbi_results.filter(
    (r) => r.compliance_rating === "MODERATELY_FUNCTIONAL"
  ).length;
  const low = data.bbi_results.filter(
    (r) => r.compliance_rating === "LOW_FUNCTIONAL"
  ).length;
  const nonFunc = data.bbi_results.filter(
    (r) => r.compliance_rating === "NON_FUNCTIONAL"
  ).length;

  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-sm overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            BBI Preview
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400">
            ({Math.round(data.average_compliance)}% avg)
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick summary badges */}
          <div className="flex items-center gap-1.5 text-xs">
            {highly > 0 && (
              <span className="px-1.5 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded">
                {highly} High
              </span>
            )}
            {moderate > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded">
                {moderate} Mod
              </span>
            )}
            {low > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded">
                {low} Low
              </span>
            )}
            {nonFunc > 0 && (
              <span className="px-1.5 py-0.5 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded">
                {nonFunc} None
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-blue-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-blue-600" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-3 border-t border-blue-200 dark:border-blue-800">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-3">
            {data.bbi_results.map((bbi) => {
              const style = getRatingStyle(bbi.compliance_rating);
              const Icon = style.icon;
              return (
                <div
                  key={bbi.bbi_id}
                  className={`${style.bg} rounded p-2 text-center`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${style.text}`} />
                    <span className={`text-sm font-semibold ${style.text}`}>
                      {Math.round(bbi.compliance_percentage)}%
                    </span>
                  </div>
                  <p className={`text-xs font-medium ${style.text}`}>
                    {bbi.bbi_abbreviation}
                  </p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                    {bbi.sub_indicators_passed}/{bbi.sub_indicators_total} passed
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-2 text-center">
            Based on current validation status • DILG MC 2024-417
          </p>
        </div>
      )}
    </div>
  );
}

export default BBIPreviewPanel;
