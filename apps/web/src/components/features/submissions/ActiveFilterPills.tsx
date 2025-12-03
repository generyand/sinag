"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_FILTER_OPTIONS } from "./utils/statusConfig";

interface ActiveFilterPillsProps {
  searchQuery: string;
  statusFilter: string;
  totalCount: number;
  filteredCount: number;
  onClearSearch: () => void;
  onClearStatus: () => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

/**
 * Displays active filter pills with the ability to remove individual filters.
 */
export function ActiveFilterPills({
  searchQuery,
  statusFilter,
  totalCount,
  filteredCount,
  onClearSearch,
  onClearStatus,
  onClearAll,
  hasActiveFilters,
}: ActiveFilterPillsProps) {
  const getStatusLabel = (value: string): string => {
    const option = STATUS_FILTER_OPTIONS.find((opt) => opt.value === value);
    return option?.label ?? value;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-[var(--muted)]/10 border-b border-[var(--border)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--muted-foreground)]">
          Showing {filteredCount} of {totalCount} submissions
        </span>

        {/* Active filter pills */}
        {searchQuery && (
          <Badge
            variant="secondary"
            className="gap-1 bg-[var(--cityscape-yellow)]/10 text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/20 cursor-pointer rounded-sm"
            onClick={onClearSearch}
          >
            Search: {searchQuery}
            <X className="h-3 w-3" aria-label="Clear search filter" />
          </Badge>
        )}

        {statusFilter !== "all" && (
          <Badge
            variant="secondary"
            className="gap-1 bg-[var(--cityscape-yellow)]/10 text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/20 cursor-pointer rounded-sm"
            onClick={onClearStatus}
          >
            Status: {getStatusLabel(statusFilter)}
            <X className="h-3 w-3" aria-label="Clear status filter" />
          </Badge>
        )}
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 rounded-sm h-8 px-3"
        >
          Clear all filters
        </Button>
      )}
    </div>
  );
}
