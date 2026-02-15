"use client";

import { Sparkles } from "lucide-react";

interface CapDevSummaryCardProps {
  summary: string;
  generatedAt?: string | null;
}

/**
 * AI-generated summary of CapDev insights
 */
export function CapDevSummaryCard({ summary, generatedAt }: CapDevSummaryCardProps) {
  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="bg-gradient-to-br from-[var(--card)] to-[var(--muted)] border border-[var(--border)] rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] rounded-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">AI Summary</h3>
            {formattedDate && (
              <span className="text-xs text-[var(--text-secondary)]">
                Generated: {formattedDate}
              </span>
            )}
          </div>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed whitespace-pre-wrap">
            {summary}
          </p>
        </div>
      </div>
    </div>
  );
}
