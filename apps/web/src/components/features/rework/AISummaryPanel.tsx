/**
 * AI Summary Panel Component
 *
 * Displays AI-generated rework or calibration summaries with language toggle.
 * Shows:
 * - Overall summary of issues
 * - Priority actions to address first
 * - Per-indicator breakdowns with suggested actions
 * - Estimated time to complete
 *
 * Supports three languages: Bisaya (ceb), Tagalog (fil), English (en)
 */

"use client";

import { useState } from "react";
import {
  Sparkles,
  Clock,
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AISummary, AISummaryIndicator } from "@sinag/shared";

// Language display names
const LANGUAGE_NAMES: Record<string, string> = {
  ceb: "Bisaya",
  fil: "Tagalog",
  en: "English",
};

interface AISummaryPanelProps {
  summary: AISummary;
  availableLanguages: string[];
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  isLoading?: boolean;
}

export function AISummaryPanel({
  summary,
  availableLanguages,
  currentLanguage,
  onLanguageChange,
  isLoading = false,
}: AISummaryPanelProps) {
  const [expandedIndicators, setExpandedIndicators] = useState<Set<number>>(new Set());

  const toggleIndicator = (indicatorId: number) => {
    setExpandedIndicators((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(indicatorId)) {
        newSet.delete(indicatorId);
      } else {
        newSet.add(indicatorId);
      }
      return newSet;
    });
  };

  const isCalibration = summary.summary_type === "calibration";

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      {/* Header with gradient */}
      <div
        className={`px-6 py-4 ${
          isCalibration
            ? "bg-gradient-to-r from-purple-600 to-purple-700"
            : "bg-gradient-to-r from-amber-500 to-amber-600"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isCalibration ? "Calibration Summary" : "Rework Summary"}
              </h2>
              <p className="text-sm text-white/80">
                {isCalibration
                  ? `AI-generated guidance for ${summary.governance_area || "your governance area"}`
                  : "AI-generated guidance for your assessment corrections"}
              </p>
            </div>
          </div>

          {/* Language Toggle */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-white/70" />
            <div className="flex bg-white/20 rounded-lg p-1">
              {(availableLanguages.length > 0 ? availableLanguages : ["ceb", "en"]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onLanguageChange(lang)}
                  disabled={isLoading}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${
                    currentLanguage === lang
                      ? "bg-white text-gray-800 font-medium shadow-sm"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {LANGUAGE_NAMES[lang] || lang}
                </button>
              ))}
              {/* On-demand Tagalog option if not pre-generated */}
              {!availableLanguages.includes("fil") && (
                <button
                  onClick={() => onLanguageChange("fil")}
                  disabled={isLoading}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${
                    currentLanguage === "fil"
                      ? "bg-white text-gray-800 font-medium shadow-sm"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  title="Tagalog will be generated on-demand"
                >
                  Tagalog
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            <span className="ml-3 text-gray-600">Loading summary...</span>
          </div>
        ) : (
          <>
            {/* Overall Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-700 leading-relaxed">{summary.overall_summary}</p>
            </div>

            {/* Estimated Time */}
            {summary.estimated_time && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  Estimated time to complete:{" "}
                  <span className="font-medium text-gray-800">{summary.estimated_time}</span>
                </span>
              </div>
            )}

            {/* Priority Actions */}
            {summary.priority_actions && summary.priority_actions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Priority Actions
                </h3>
                <ol className="space-y-2">
                  {summary.priority_actions.map((action, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0
                            ? "bg-red-100 text-red-700"
                            : index === 1
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-gray-700 text-sm">{action}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Indicator Summaries */}
            {summary.indicator_summaries && summary.indicator_summaries.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Indicators to Address ({summary.indicator_summaries.length})
                </h3>
                <div className="space-y-2">
                  {summary.indicator_summaries.map((indicator: AISummaryIndicator) => (
                    <IndicatorSummaryCard
                      key={indicator.indicator_id}
                      indicator={indicator}
                      isExpanded={expandedIndicators.has(indicator.indicator_id)}
                      onToggle={() => toggleIndicator(indicator.indicator_id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Generated timestamp */}
            {summary.generated_at && (
              <p className="text-xs text-gray-400 text-right">
                Generated: {new Date(summary.generated_at).toLocaleString()}
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

// Sub-component for individual indicator summaries
interface IndicatorSummaryCardProps {
  indicator: AISummaryIndicator;
  isExpanded: boolean;
  onToggle: () => void;
}

function IndicatorSummaryCard({ indicator, isExpanded, onToggle }: IndicatorSummaryCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <span className="font-medium text-gray-800 text-left">{indicator.indicator_name}</span>
        </div>
        <div className="flex items-center gap-2">
          {indicator.key_issues && indicator.key_issues.length > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              {indicator.key_issues.length} issue{indicator.key_issues.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-4">
          {/* Key Issues */}
          {indicator.key_issues && indicator.key_issues.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Key Issues
              </h4>
              <ul className="space-y-1">
                {indicator.key_issues.map((issue, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-500 mt-0.5">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Actions */}
          {indicator.suggested_actions && indicator.suggested_actions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Suggested Actions
              </h4>
              <ul className="space-y-1">
                {indicator.suggested_actions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Affected MOVs */}
          {indicator.affected_movs && indicator.affected_movs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Affected Documents
              </h4>
              <div className="flex flex-wrap gap-2">
                {indicator.affected_movs.map((mov, index) => (
                  <span key={index} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {mov}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
