"use client";

import { AssessorData, SystemicWeakness } from "./AssessorAnalyticsTypes";
import { getSeverityLevel, calculateImpactPercentage } from "./AssessorAnalyticsUtils";

interface WeaknessDetailModalProps {
  weakness: SystemicWeakness | null;
  data: AssessorData;
  isOpen: boolean;
  onClose: () => void;
}

export function WeaknessDetailModal({ weakness, data, isOpen, onClose }: WeaknessDetailModalProps) {
  if (!isOpen || !weakness) return null;

  const severity = getSeverityLevel(weakness.failedCount);
  const impactPercentage = calculateImpactPercentage(weakness.failedCount, data.assignedBarangays);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--card)] rounded-sm border border-[var(--border)] shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-4 h-4 rounded-full bg-${severity.color}-500`}></div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${severity.color}-100 text-${severity.color}-700`}>
                {severity.level} SEVERITY
              </span>
            </div>
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
              Performance Hotspot Details
            </h3>
            <p className="text-[var(--text-muted)] font-medium">
              {weakness.indicator}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--hover)] rounded-sm transition-colors duration-200 ml-4"
          >
            <svg
              className="w-6 h-6 text-[var(--text-muted)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="bg-[var(--hover)] rounded-sm p-4 mb-6 border border-[var(--border)]">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--foreground)]">
                {weakness.failedCount}
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                Affected Barangays
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--foreground)]">
                {impactPercentage}%
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                Impact Rate
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--text-muted)]">Coverage</span>
              <span className="text-sm font-medium text-[var(--foreground)]">
                {weakness.failedCount} of {data.assignedBarangays} barangays
              </span>
            </div>
            <div className="w-full bg-[var(--border)] rounded-full h-3">
              <div
                className={`h-3 rounded-full bg-${severity.color}-500`}
                style={{ width: `${impactPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Affected Barangays List */}
        <div>
          <h4 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            Affected Barangays
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
            {weakness.barangays.map((barangay, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-sm border border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200"
              >
                <svg
                  className="w-4 h-4 text-red-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span className="text-red-700 dark:text-red-300 text-sm font-medium">
                  {barangay}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-4 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-sm transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
} 