"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewHistoryFilters as FilterType } from "@/hooks/useReviewHistory";
import { Search, X } from "lucide-react";

interface ReviewHistoryFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
}

export function ReviewHistoryFilters({ filters, onFiltersChange }: ReviewHistoryFiltersProps) {
  const hasActiveFilters =
    filters.search || filters.dateFrom || filters.dateTo || filters.outcome;

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      dateFrom: null,
      dateTo: null,
      outcome: null,
    });
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <label htmlFor="search" className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <Input
            id="search"
            placeholder="Search by barangay name..."
            value={filters.search || ""}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* Date From */}
      <div className="w-[160px]">
        <label htmlFor="date-from" className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
          From Date
        </label>
        <Input
          id="date-from"
          type="date"
          value={filters.dateFrom ? filters.dateFrom.toISOString().split("T")[0] : ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              dateFrom: e.target.value ? new Date(e.target.value) : null,
            })
          }
        />
      </div>

      {/* Date To */}
      <div className="w-[160px]">
        <label htmlFor="date-to" className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
          To Date
        </label>
        <Input
          id="date-to"
          type="date"
          value={filters.dateTo ? filters.dateTo.toISOString().split("T")[0] : ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              dateTo: e.target.value ? new Date(e.target.value) : null,
            })
          }
        />
      </div>

      {/* Outcome Filter */}
      <div className="w-[160px]">
        <label htmlFor="outcome" className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">
          Outcome
        </label>
        <Select
          value={filters.outcome || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              outcome: value === "all" ? null : (value as "PASSED" | "FAILED"),
            })
          }
        >
          <SelectTrigger id="outcome">
            <SelectValue placeholder="All Outcomes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="PASSED">Passed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Button */}
      {hasActiveFilters && (
        <Button variant="ghost" onClick={clearFilters} className="h-10">
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
