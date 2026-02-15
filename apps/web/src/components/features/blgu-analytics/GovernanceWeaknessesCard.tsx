"use client";

import { AlertTriangle } from "lucide-react";
import { GovernanceWeakness, isGovernanceWeakness, isStringArray } from "@/types/capdev";

interface GovernanceWeaknessesCardProps {
  weaknesses?: GovernanceWeakness[] | string[];
}

/**
 * Display governance weaknesses identified by AI
 */
export function GovernanceWeaknessesCard({ weaknesses }: GovernanceWeaknessesCardProps) {
  if (!weaknesses || weaknesses.length === 0) {
    return null;
  }

  // Severity badge styling
  const getSeverityStyle = (severity?: string) => {
    const normalizedSeverity = severity?.toLowerCase();
    switch (normalizedSeverity) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Areas for Improvement</h3>
      </div>

      <div className="space-y-3">
        {isStringArray(weaknesses)
          ? // Handle string array format
            weaknesses.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]"
              >
                <p className="text-[var(--foreground)] text-base">{item}</p>
              </div>
            ))
          : // Handle object format
            weaknesses.map((weakness, idx) => {
              if (!isGovernanceWeakness(weakness)) {
                return (
                  <div
                    key={idx}
                    className="p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]"
                  >
                    <p className="text-[var(--foreground)] text-base">{String(weakness)}</p>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className="p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="font-medium text-[var(--foreground)]">
                      {weakness.area_name}
                    </span>
                    {weakness.severity && (
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getSeverityStyle(weakness.severity)}`}
                      >
                        {weakness.severity.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm">{weakness.description}</p>
                </div>
              );
            })}
      </div>
    </div>
  );
}
