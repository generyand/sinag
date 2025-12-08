import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface FilterControlsProps {
  filters: {
    cycle_id?: number;
    start_date?: string;
    end_date?: string;
    governance_area?: string[];
    barangay_id?: number[];
    status?: string;
    phase?: 'phase1' | 'phase2' | 'all';
  };
  onFilterChange: (filters: FilterControlsProps["filters"]) => void;
  userRole?: string;
}

export function FilterControls({
  filters,
  onFilterChange,
  userRole,
}: FilterControlsProps) {
  // Handle status filter change
  const handleStatusChange = (value: string) => {
    onFilterChange({
      ...filters,
      status: value === "all" ? undefined : value,
    });
  };

  // Handle phase filter change
  const handlePhaseChange = (value: 'phase1' | 'phase2' | 'all') => {
    onFilterChange({
      ...filters,
      phase: value === "all" ? undefined : value,
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    onFilterChange({
      cycle_id: undefined,
      start_date: undefined,
      end_date: undefined,
      governance_area: undefined,
      barangay_id: undefined,
      status: undefined,
      phase: undefined,
    });
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.cycle_id ||
    filters.start_date ||
    filters.end_date ||
    filters.governance_area?.length ||
    filters.barangay_id?.length ||
    filters.status ||
    filters.phase;

  return (
    <div className="bg-card rounded shadow-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Phase Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Assessment Phase</label>
          <Select
            value={filters.phase || "all"}
            onValueChange={handlePhaseChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All phases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              <SelectItem value="phase1">Phase 1: Table Assessment</SelectItem>
              <SelectItem value="phase2">Phase 2: Table Validation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={filters.status || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Pass">Pass</SelectItem>
              <SelectItem value="Fail">Fail</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cycle Filter - Placeholder */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Cycle (Coming Soon)
          </label>
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Select cycle" />
            </SelectTrigger>
          </Select>
        </div>

        {/* Governance Area Filter - Placeholder */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Governance Area (Coming Soon)
          </label>
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Select areas" />
            </SelectTrigger>
          </Select>
        </div>

        {/* Barangay Filter - Placeholder */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Barangay (Coming Soon)
          </label>
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Select barangays" />
            </SelectTrigger>
          </Select>
        </div>
      </div>

      {/* Date Range Filters - Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Start Date (Coming Soon)
          </label>
          <div className="h-10 border border-input bg-muted/50 rounded-md flex items-center px-3">
            <span className="text-sm text-muted-foreground">
              Select start date
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            End Date (Coming Soon)
          </label>
          <div className="h-10 border border-input bg-muted/50 rounded-md flex items-center px-3">
            <span className="text-sm text-muted-foreground">
              Select end date
            </span>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-2">
          <div className="flex flex-wrap gap-2">
            {filters.phase && (
              <div className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${
                filters.phase === 'phase1'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-purple-100 text-purple-800'
              }`}>
                Phase: {filters.phase === 'phase1' ? 'Table Assessment' : 'Table Validation'}
                <button
                  onClick={() =>
                    onFilterChange({ ...filters, phase: undefined })
                  }
                  className="hover:bg-primary/20 rounded-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.status && (
              <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-md flex items-center gap-1">
                Status: {filters.status}
                <button
                  onClick={() =>
                    onFilterChange({ ...filters, status: undefined })
                  }
                  className="hover:bg-primary/20 rounded-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.cycle_id && (
              <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-md flex items-center gap-1">
                Cycle: {filters.cycle_id}
                <button
                  onClick={() =>
                    onFilterChange({ ...filters, cycle_id: undefined })
                  }
                  className="hover:bg-primary/20 rounded-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
