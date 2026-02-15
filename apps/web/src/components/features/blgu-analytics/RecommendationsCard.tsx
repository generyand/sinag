"use client";

import { Lightbulb, ArrowRight } from "lucide-react";
import { CapDevRecommendation, isCapDevRecommendation, isStringArray } from "@/types/capdev";

interface RecommendationsCardProps {
  recommendations?: CapDevRecommendation[] | string[];
}

/**
 * Display AI-generated recommendations
 */
export function RecommendationsCard({ recommendations }: RecommendationsCardProps) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  // Priority badge styling
  const getPriorityStyle = (priority?: string) => {
    const normalizedPriority = priority?.toLowerCase();
    switch (normalizedPriority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Recommendations</h3>
      </div>

      <div className="space-y-3">
        {isStringArray(recommendations)
          ? // Handle string array format
            recommendations.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]"
              >
                <ArrowRight className="w-4 h-4 text-[var(--cityscape-yellow)] mt-1 flex-shrink-0" />
                <p className="text-[var(--foreground)] text-base">{item}</p>
              </div>
            ))
          : // Handle object format
            recommendations.map((rec, idx) => {
              if (!isCapDevRecommendation(rec)) {
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]"
                  >
                    <ArrowRight className="w-4 h-4 text-[var(--cityscape-yellow)] mt-1 flex-shrink-0" />
                    <p className="text-[var(--foreground)] text-base">{String(rec)}</p>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className="p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="font-medium text-[var(--foreground)]">{rec.title}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {rec.governance_area && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                          {rec.governance_area}
                        </span>
                      )}
                      {rec.priority && (
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityStyle(rec.priority)}`}
                        >
                          {rec.priority.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm mb-2">{rec.description}</p>
                  {rec.expected_impact && (
                    <p className="text-xs text-[var(--cityscape-yellow)] mt-2">
                      <span className="font-medium">Expected Impact:</span> {rec.expected_impact}
                    </p>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}
