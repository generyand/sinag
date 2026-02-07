"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";
import { SubmissionsFilter } from "@/types/submissions";
import { UNIFIED_STATUS_FILTER_OPTIONS } from "./utils/statusConfig";
import { useState } from "react";

interface SubmissionsFiltersProps {
  filters: SubmissionsFilter;
  onFiltersChange: (filters: SubmissionsFilter) => void;
}

// Use unified status filter options from centralized config
const statusOptions = UNIFIED_STATUS_FILTER_OPTIONS;

export function SubmissionsFilters({ filters, onFiltersChange }: SubmissionsFiltersProps) {
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];

    onFiltersChange({ ...filters, status: newStatuses });
  };

  const clearFilters = () => {
    onFiltersChange({ search: "", status: [] });
  };

  const hasActiveFilters = filters.search || filters.status.length > 0;

  return (
    <div className="space-y-6" role="search" aria-label="Submission filters">
      {/* Enhanced Search and Filter Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="relative lg:col-span-2">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <Input
              placeholder="Search by barangay name, assigned assessor, or status..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-12 pr-4 py-3 border-2 border-[var(--border)] bg-[var(--card)] hover:border-[var(--cityscape-yellow)] focus:border-[var(--cityscape-yellow)] transition-all duration-200 text-base rounded-sm"
              aria-label="Search submissions by barangay name, assessor, or status"
            />
          </div>
          {filters.search && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <button
                onClick={() => handleSearchChange("")}
                className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors duration-200"
                aria-label="Clear search input"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowStatusFilter(!showStatusFilter)}
            className={`w-full border-2 border-[var(--border)] bg-[var(--card)] hover:border-[var(--cityscape-yellow)] hover:bg-[var(--hover)] transition-all duration-200 py-3 rounded-sm ${
              filters.status.length > 0
                ? "border-[var(--cityscape-yellow)] bg-[var(--cityscape-yellow)]/10"
                : ""
            }`}
            aria-label={`Filter by status${filters.status.length > 0 ? ` (${filters.status.length} selected)` : ""}`}
            aria-expanded={showStatusFilter}
            aria-controls="status-filter-menu"
          >
            <Filter className="h-5 w-5 mr-2" aria-hidden="true" />
            <span className="font-medium">Filter by Status</span>
            {filters.status.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 bg-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] rounded-sm"
                aria-hidden="true"
              >
                {filters.status.length}
              </Badge>
            )}
          </Button>

          {showStatusFilter && (
            <div
              id="status-filter-menu"
              className="absolute top-full left-0 right-0 mt-2 bg-[var(--card)] border-2 border-[var(--border)] rounded-sm shadow-xl z-10 p-4"
              role="menu"
              aria-label="Status filter options"
            >
              <div className="space-y-3">
                <h4 className="font-semibold text-[var(--foreground)] text-sm border-b border-[var(--border)] pb-2">
                  Filter by Status
                </h4>
                {statusOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center space-x-3 cursor-pointer p-2 rounded-sm hover:bg-[var(--hover)] transition-colors duration-200"
                  >
                    <input
                      type="checkbox"
                      checked={filters.status.includes(option.value)}
                      onChange={() => handleStatusToggle(option.value)}
                      className="rounded-sm border-2 border-[var(--border)] text-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]"
                      aria-label={`Filter by ${option.label} status`}
                    />
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Active Filters Display */}
      {hasActiveFilters && (
        <div
          className="bg-gradient-to-r from-[var(--muted)] to-[var(--card)] border border-[var(--border)] rounded-sm p-4"
          role="region"
          aria-label="Active filters"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-[var(--foreground)] text-sm">
              Active Filters ({filters.status.length + (filters.search ? 1 : 0)})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition-all duration-200 rounded-sm"
              aria-label="Clear all active filters"
            >
              <X className="h-4 w-4 mr-1" aria-hidden="true" />
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2" role="list" aria-label="List of active filters">
            {filters.search && (
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 px-3 py-1 font-medium rounded-sm"
                role="listitem"
              >
                <Search className="h-3 w-3 mr-1" aria-hidden="true" />
                &quot;{filters.search}&quot;
              </Badge>
            )}
            {filters.status.map((status) => {
              const option = statusOptions.find((opt) => opt.value === status);
              return (
                <Badge
                  key={status}
                  variant="secondary"
                  className={`${option?.color} border px-3 py-1 font-medium rounded-sm`}
                  role="listitem"
                >
                  <Filter className="h-3 w-3 mr-1" aria-hidden="true" />
                  {option?.label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
