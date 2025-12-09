"use client";

import { Search, FileX, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubmissionsEmptyStateProps {
  searchQuery: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

/**
 * Empty state component displayed when no submissions match the current filters.
 */
export function SubmissionsEmptyState({
  searchQuery,
  hasActiveFilters,
  onClearFilters,
}: SubmissionsEmptyStateProps) {
  const isSearching = searchQuery.trim() !== "";

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--muted)]/30 mb-6">
        {isSearching ? (
          <Search className="h-8 w-8 text-[var(--muted-foreground)]" />
        ) : (
          <FileX className="h-8 w-8 text-[var(--muted-foreground)]" />
        )}
      </div>

      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No submissions found</h3>

      <p className="text-sm text-[var(--muted-foreground)] text-center max-w-md mb-6">
        {isSearching ? (
          <>
            No results for &ldquo;<span className="font-medium">{searchQuery}</span>&rdquo;. Try
            adjusting your search term.
          </>
        ) : hasActiveFilters ? (
          "No submissions match your current filters. Try adjusting or clearing your filters to see more results."
        ) : (
          "There are no assessment submissions yet. Submissions will appear here once barangays begin their assessments."
        )}
      </p>

      {hasActiveFilters && (
        <Button
          variant="outline"
          onClick={onClearFilters}
          className="gap-2 bg-[var(--background)] hover:bg-[var(--cityscape-yellow)]/10 hover:border-[var(--cityscape-yellow)] border-[var(--border)] text-[var(--foreground)] rounded-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Clear all filters
        </Button>
      )}
    </div>
  );
}
