"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AssessmentActivityResponse, useGetAssessmentActivities } from "@sinag/shared";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

/** Action type configuration with icon, label, and color */
const ACTION_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  // Assessment-level actions
  submitted: { icon: "📤", label: "Submitted", color: "blue" },
  approved: { icon: "✅", label: "Approved", color: "green" },
  review_started: { icon: "👁", label: "Review Started", color: "purple" },
  rework_requested: { icon: "🔄", label: "Rework Requested", color: "orange" },
  rework_submitted: { icon: "📤", label: "Rework Submitted", color: "blue" },
  review_completed: { icon: "✓", label: "Review Completed", color: "green" },
  validation_completed: { icon: "✓", label: "Validated", color: "green" },
  validation_started: { icon: "🔍", label: "Validation Started", color: "purple" },
  mlgoo_approved: { icon: "🏆", label: "MLGOO Approved", color: "green" },
  calibration_requested: { icon: "⚖️", label: "Calibration", color: "amber" },
  calibration_submitted: { icon: "📤", label: "Calibration Submitted", color: "blue" },
  recalibration_requested: { icon: "🔄", label: "Recalibration", color: "amber" },
  recalibration_submitted: { icon: "📤", label: "Recalibration Submitted", color: "blue" },
  completed: { icon: "🏆", label: "Completed", color: "green" },
  area_approved: { icon: "✅", label: "Area Approved", color: "green" },
  area_rework_requested: { icon: "🔄", label: "Area Rework", color: "orange" },
  created: { icon: "📝", label: "Created", color: "gray" },
  updated: { icon: "📝", label: "Updated", color: "gray" },
  // Indicator-level actions
  indicator_submitted: { icon: "📋", label: "Indicator Submitted", color: "blue" },
  indicator_reviewed: { icon: "📋", label: "Indicator Reviewed", color: "purple" },
  indicator_validated: { icon: "✓", label: "Indicator Validated", color: "green" },
  indicator_flagged_rework: { icon: "🚩", label: "Flagged for Rework", color: "orange" },
  indicator_flagged_calibration: { icon: "🚩", label: "Flagged for Calibration", color: "amber" },
  mov_uploaded: { icon: "📎", label: "MOV Uploaded", color: "blue" },
  mov_annotated: { icon: "✏️", label: "MOV Annotated", color: "purple" },
  // Compliance actions
  indicator_rework_compliance: { icon: "✅", label: "Rework Compliance", color: "green" },
  indicator_calibration_compliance: { icon: "✅", label: "Calibration Compliance", color: "green" },
  indicator_recalibration_compliance: {
    icon: "✅",
    label: "Recalibration Compliance",
    color: "green",
  },
};

/** Get configuration for an action type, with fallback */
function getActionConfig(action: string) {
  return (
    ACTION_CONFIG[action.toLowerCase()] || {
      icon: "📋",
      label: action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      color: "gray",
    }
  );
}

/** Get color classes based on action color */
function getColorClasses(color: string) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
    },
    green: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
    },
    orange: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
    },
    gray: {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
    },
  };
  return colorMap[color] || colorMap.gray;
}

/** Format relative time with error handling */
function formatTimeAgo(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "recently";
  }
}

/** Truncate a string to a maximum length with ellipsis */
function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
}

/** Pattern to match indicator codes like "6.3.1 - Description" */
const INDICATOR_PATTERN = /(\d+\.\d+(?:\.\d+)?)\s*[-–]\s*(.+)/;

/** Extract indicator code from description (e.g., "6.3.1" from "Indicator Reviewed: 6.3.1 - ...") */
function extractIndicatorInfo(description: string | null | undefined): string | null {
  if (!description) return null;
  const match = description.match(INDICATOR_PATTERN);
  if (match) {
    const code = match[1];
    const name = match[2].trim();
    return `${code} - ${truncate(name, 30)}`;
  }
  return truncate(description, 40);
}

/** Single activity card in the carousel (memoized to prevent unnecessary re-renders) */
const ActivityCard = memo(function ActivityCard({
  activity,
}: {
  activity: AssessmentActivityResponse;
}) {
  const config = getActionConfig(activity.action);
  const colors = getColorClasses(config.color);
  const timeAgo = formatTimeAgo(activity.created_at);
  const indicatorInfo = extractIndicatorInfo(activity.description);

  return (
    <div
      className={cn(
        "flex-shrink-0 w-[200px] sm:w-[220px] p-3 rounded-sm border transition-all duration-200",
        colors.bg,
        colors.border
      )}
      title={activity.description || undefined}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{config.icon}</span>
        <span className={cn("text-xs font-semibold uppercase tracking-wide", colors.text)}>
          {config.label}
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-900 truncate">
          {activity.barangay_name || "Unknown Barangay"}
        </p>
        <p className="text-xs text-gray-600 truncate" title={activity.user_email || undefined}>
          {activity.user_name || "System"}
        </p>
        {activity.user_email && (
          <p className="text-xs text-gray-400 truncate">{activity.user_email}</p>
        )}
        {indicatorInfo && (
          <p className="text-xs text-gray-500 truncate font-medium">{indicatorInfo}</p>
        )}
        <p className="text-xs text-gray-400">{timeAgo}</p>
      </div>
    </div>
  );
});

/** Empty state when no activities are available */
function EmptyState() {
  return (
    <div className="flex items-center justify-center h-24 text-gray-400">
      <p className="text-sm">No recent activities</p>
    </div>
  );
}

/** Loading skeleton for the carousel */
function LoadingSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[200px] sm:w-[220px] p-3 rounded-sm border border-gray-200 bg-gray-50 animate-pulse"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-gray-200 rounded" />
            <div className="w-20 h-3 bg-gray-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="w-32 h-4 bg-gray-200 rounded" />
            <div className="w-24 h-3 bg-gray-200 rounded" />
            <div className="w-16 h-3 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveUpdatesCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch activities with auto-refresh every 30 seconds
  // Note: `as any` is required due to Orval-generated hook types requiring queryKey
  // This is the established pattern in this codebase (see useDeadlines.ts)
  const { data, isLoading, isError } = useGetAssessmentActivities(
    { limit: 10 },
    {
      query: {
        refetchInterval: 30000,
        staleTime: 15000,
      } as any,
    }
  );

  const activities = useMemo(() => data?.items || [], [data?.items]);
  const hasActivities = activities.length > 0;

  // Calculate visible count based on container width
  const visibleCount = 4;

  // Auto-scroll interval
  useEffect(() => {
    if (isPaused || !hasActivities || activities.length <= visibleCount) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activities.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, hasActivities, activities.length]);

  // Navigation handlers
  const goToPrev = useCallback(() => {
    if (activities.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + activities.length) % activities.length);
  }, [activities.length]);

  const goToNext = useCallback(() => {
    if (activities.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % activities.length);
  }, [activities.length]);

  // Calculate visible activities
  const visibleActivities = useMemo(() => {
    if (activities.length === 0) return [];
    if (activities.length <= visibleCount) return activities;

    const result: AssessmentActivityResponse[] = [];
    for (let i = 0; i < Math.min(visibleCount, activities.length); i++) {
      const index = (activeIndex + i) % activities.length;
      result.push(activities[index]);
    }
    return result;
  }, [activities, activeIndex]);

  return (
    <Card className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm">
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm sm:text-base font-semibold text-[var(--foreground)]">
            Live Updates
          </h3>
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-medium text-green-600">Live</span>
            </div>

            {/* Navigation buttons */}
            {hasActivities && activities.length > visibleCount && (
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPrev}
                  className="p-1.5 rounded-sm border border-[var(--border)] hover:bg-[var(--muted)] transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="Previous activity"
                >
                  <ChevronLeft className="h-4 w-4 text-[var(--muted-foreground)]" />
                </button>
                <button
                  onClick={goToNext}
                  className="p-1.5 rounded-sm border border-[var(--border)] hover:bg-[var(--muted)] transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="Next activity"
                >
                  <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Carousel content */}
        <div
          className="relative overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          role="region"
          aria-label="Recent assessment activities"
          aria-live="polite"
        >
          {isLoading ? (
            <LoadingSkeleton />
          ) : isError ? (
            <div className="flex items-center justify-center h-24 text-red-500">
              <p className="text-sm">Failed to load activities</p>
            </div>
          ) : !hasActivities ? (
            <EmptyState />
          ) : (
            <div className="flex gap-4 transition-all duration-500 ease-out">
              {visibleActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
