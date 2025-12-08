"use client";

import { AssessorData } from "./AssessorAnalyticsTypes";

interface GlobalFilterProps {
  data: AssessorData;
}

export function GlobalFilter({ data }: GlobalFilterProps) {
  return (
    <section
      className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-sm border border-purple-200 p-6 shadow-sm"
      aria-labelledby="assessment-period-title"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 id="assessment-period-title" className="text-sm font-medium text-purple-700 mb-1">
            Assessment Period
          </h3>
          <p
            className="text-2xl font-bold text-purple-900"
            aria-label={`Current assessment period: ${data.assessmentPeriod}`}
          >
            {data.assessmentPeriod}
          </p>
        </div>
        <div className="relative">
          <label htmlFor="assessment-period-select" className="sr-only">
            Select assessment period
          </label>
          <select
            id="assessment-period-select"
            className="appearance-none bg-[var(--card)] border border-purple-300 rounded-sm px-4 py-3 pr-10 text-[var(--foreground)] font-medium shadow-sm hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
            aria-label="Select assessment period"
          >
            <option>SGLGB 2024</option>
            <option>SGLGB 2023</option>
            <option>SGLGB 2022</option>
          </select>
          <div
            className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none"
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
