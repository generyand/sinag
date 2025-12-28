"use client";

import { X, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FilterLabel {
  key: string;
  label: string;
  onClear: () => void;
}

interface ActiveFilterPillsProps {
  filterLabels: FilterLabel[];
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

/**
 * Displays active filter pills with the ability to remove individual filters.
 * Shows which filters are currently applied to the analytics dashboard.
 */
export function ActiveFilterPills({
  filterLabels,
  onClearAll,
  hasActiveFilters,
}: ActiveFilterPillsProps) {
  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-3 bg-[var(--muted)]/20 border border-[var(--border)] rounded-sm">
      <span className="text-sm text-[var(--muted-foreground)] mr-2">Active filters:</span>

      {filterLabels.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="gap-1.5 bg-[var(--cityscape-yellow)]/10 hover:bg-[var(--cityscape-yellow)]/20 text-[var(--foreground)] cursor-pointer rounded-sm px-2.5 py-1 transition-colors"
          onClick={filter.onClear}
        >
          {filter.label}
          <X className="h-3 w-3" aria-label={`Clear ${filter.label} filter`} />
        </Badge>
      ))}

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="ml-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 rounded-sm h-7 px-2 gap-1"
      >
        <RefreshCw className="h-3 w-3" />
        Clear all
      </Button>
    </div>
  );
}
