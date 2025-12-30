"use client";

import { useState } from "react";
import { ChevronDown, Target, BookOpen } from "lucide-react";
import {
  CapDevNeed,
  CapDevNeedAIFormat,
  isCapDevNeedAIFormat,
} from "@/types/capdev";

interface CapDevNeedsAccordionProps {
  needs?: CapDevNeed[] | CapDevNeedAIFormat[];
}

/**
 * Expandable accordion showing capacity development needs
 */
export function CapDevNeedsAccordion({ needs }: CapDevNeedsAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!needs || needs.length === 0) {
    return null;
  }

  const toggleAccordion = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  // Determine which format the data is in
  const isAIFormat = needs.length > 0 && isCapDevNeedAIFormat(needs[0]);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <Target className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Capacity Development Needs
        </h3>
      </div>

      <div className="space-y-2">
        {needs.map((need, idx) => {
          const isOpen = openIndex === idx;

          if (isAIFormat && isCapDevNeedAIFormat(need)) {
            // AI Format (category-based)
            return (
              <div
                key={idx}
                className="border border-[var(--border)] rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleAccordion(idx)}
                  className="w-full flex items-center justify-between p-4 bg-[var(--muted)] hover:bg-[var(--hover)] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-[var(--cityscape-yellow)]" />
                    <span className="font-medium text-[var(--foreground)]">
                      {need.category}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-[var(--text-secondary)] transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="p-4 space-y-3">
                    <p className="text-[var(--text-secondary)] text-sm">
                      {need.description}
                    </p>
                    {need.affected_indicators && need.affected_indicators.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-[var(--foreground)] mb-2">
                          Affected Indicators:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {need.affected_indicators.map((indicator, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 text-xs bg-[var(--muted)] rounded-full text-[var(--text-secondary)]"
                            >
                              {indicator}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {need.suggested_providers && need.suggested_providers.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-[var(--foreground)] mb-2">
                          Suggested Providers:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {need.suggested_providers.map((provider, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 text-xs bg-blue-50 rounded-full text-blue-700"
                            >
                              {provider}
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

          // Standard Format (area-based)
          const standardNeed = need as CapDevNeed;
          return (
            <div
              key={idx}
              className="border border-[var(--border)] rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleAccordion(idx)}
                className="w-full flex items-center justify-between p-4 bg-[var(--muted)] hover:bg-[var(--hover)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-[var(--cityscape-yellow)]" />
                  <span className="font-medium text-[var(--foreground)]">
                    {standardNeed.area}
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[var(--text-secondary)] transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-red-600 mb-1">Current Gap</p>
                      <p className="text-sm text-[var(--foreground)]">
                        {standardNeed.current_gap}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-1">Target State</p>
                      <p className="text-sm text-[var(--foreground)]">
                        {standardNeed.target_state}
                      </p>
                    </div>
                  </div>
                  {standardNeed.skills_required && standardNeed.skills_required.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[var(--foreground)] mb-2">
                        Skills Required:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {standardNeed.skills_required.map((skill, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs bg-[var(--muted)] rounded-full text-[var(--text-secondary)]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
