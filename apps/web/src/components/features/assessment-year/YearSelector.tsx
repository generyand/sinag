"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useYearSelector } from "@/hooks/useAssessmentYear";
import { Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface YearSelectorProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the label */
  showLabel?: boolean;
  /** Whether to show the calendar icon */
  showIcon?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show loading state */
  showLoading?: boolean;
}

/**
 * Assessment Year Selector Component
 *
 * A reusable dropdown for selecting the assessment year.
 * Uses the global assessment year store and fetches accessible years
 * based on the current user's role.
 *
 * Usage:
 * ```tsx
 * <YearSelector showLabel showIcon />
 * ```
 */
export function YearSelector({
  className,
  showLabel = true,
  showIcon = true,
  size = "md",
  showLoading = true,
}: YearSelectorProps) {
  const { options, value, onChange, isLoading, hasMultipleYears } =
    useYearSelector();

  // Don't render if there's only one year (or none)
  if (!hasMultipleYears && !isLoading) {
    return null;
  }

  const sizeClasses = {
    sm: "h-7 text-xs",
    md: "h-8 text-sm",
    lg: "h-10 text-base",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  if (isLoading && showLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-3 border border-[var(--border)]",
          className
        )}
      >
        <Loader2
          className={cn(iconSizes[size], "animate-spin text-[var(--muted-foreground)]")}
        />
        <span className="text-sm text-[var(--muted-foreground)]">Loading years...</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-3 border border-[var(--border)]",
        className
      )}
    >
      {showIcon && (
        <Calendar
          className={cn(iconSizes[size])}
          style={{ color: "var(--cityscape-yellow)" }}
        />
      )}
      <div className="flex flex-col">
        {showLabel && (
          <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
            Assessment Year
          </span>
        )}
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            className={cn(
              "w-24 border-0 bg-transparent p-0 focus:ring-0 font-semibold",
              sizeClasses[size]
            )}
          >
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-sm">
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className={cn(
                  "text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10",
                  option.isActive && "font-semibold"
                )}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Compact Year Selector for use in headers/toolbars
 *
 * A minimal version without the container styling.
 */
export function YearSelectorCompact({
  className,
}: {
  className?: string;
}) {
  const { options, value, onChange, isLoading, hasMultipleYears } =
    useYearSelector();

  if (!hasMultipleYears && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "w-24 h-8 text-sm font-medium border-[var(--border)]",
          className
        )}
      >
        <Calendar className="h-3.5 w-3.5 mr-1.5" style={{ color: "var(--cityscape-yellow)" }} />
        <SelectValue placeholder="Year" />
      </SelectTrigger>
      <SelectContent className="bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-sm">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={cn(
              "text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10",
              option.isActive && "font-semibold"
            )}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default YearSelector;
