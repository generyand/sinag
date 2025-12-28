"use client";

import { FileX, BarChart3, Users, AlertCircle, type LucideIcon } from "lucide-react";

type EmptyStateVariant = "no-data" | "no-assessments" | "no-indicators" | "no-barangays";

interface AnalyticsEmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  compact?: boolean;
}

const VARIANT_CONFIG: Record<
  EmptyStateVariant,
  { icon: LucideIcon; title: string; description: string }
> = {
  "no-data": {
    icon: FileX,
    title: "No data available",
    description: "Data will appear here once assessments are submitted and processed.",
  },
  "no-assessments": {
    icon: BarChart3,
    title: "No assessments yet",
    description: "Assessment data will appear here once BLGUs begin submitting their assessments.",
  },
  "no-indicators": {
    icon: AlertCircle,
    title: "Not enough data",
    description:
      "Indicator performance data requires at least one completed assessment to analyze.",
  },
  "no-barangays": {
    icon: Users,
    title: "No barangays found",
    description: "No barangays match your current filter criteria. Try adjusting your filters.",
  },
};

/**
 * Reusable empty state component for analytics cards.
 * Provides consistent messaging when no data is available.
 */
export function AnalyticsEmptyState({
  variant = "no-data",
  title,
  description,
  icon,
  compact = false,
}: AnalyticsEmptyStateProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = icon ?? config.icon;
  const displayTitle = title ?? config.title;
  const displayDescription = description ?? config.description;

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-6 px-4 text-center justify-center">
        <Icon className="h-5 w-5 text-[var(--muted-foreground)]" />
        <div className="text-sm text-[var(--muted-foreground)]">{displayTitle}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[var(--muted)]/30 mb-4">
        <Icon className="h-7 w-7 text-[var(--muted-foreground)]" />
      </div>
      <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">{displayTitle}</h3>
      <p className="text-sm text-[var(--muted-foreground)] text-center max-w-sm">
        {displayDescription}
      </p>
    </div>
  );
}
