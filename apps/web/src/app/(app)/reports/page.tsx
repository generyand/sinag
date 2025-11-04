"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FilterControls,
  VisualizationGrid,
  ExportControls,
} from "@/components/features/reports";
import { useGetAnalyticsReports } from "@vantage/shared";

export default function ReportsPage() {
  // Filter state
  const [filters, setFilters] = useState({
    cycle_id: undefined as number | undefined,
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined,
    governance_area: undefined as string[] | undefined,
    barangay_id: undefined as number[] | undefined,
    status: undefined as string | undefined,
    page: 1,
    page_size: 50,
  });

  // Fetch reports data with filters
  const { data, isLoading, error } = useGetAnalyticsReports({
    cycle_id: filters.cycle_id,
    start_date: filters.start_date,
    end_date: filters.end_date,
    governance_area: filters.governance_area,
    barangay_id: filters.barangay_id,
    status: filters.status,
    page: filters.page,
    page_size: filters.page_size,
  });

  // Handle filter changes - triggers automatic data re-fetch via TanStack Query
  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader
            title="Reports & Visualizations"
            description="Analytics and reporting dashboard with interactive visualizations"
          />

          <Alert variant="destructive">
            <AlertDescription>
              Failed to load reports data: {error.message || "Unknown error"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Get user role (TODO: Get from actual auth context)
  const userRole = "MLGOO_DILG";

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header with Export Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
            title="Reports & Visualizations"
            description="Analytics and reporting dashboard with interactive visualizations"
          />

          {/* Export Controls - Only for MLGOO_DILG */}
          {userRole === "MLGOO_DILG" && data && (
            <div className="flex-shrink-0">
              <ExportControls
                tableData={data.table_data.rows}
                currentFilters={{
                  cycle_id: filters.cycle_id,
                  start_date: filters.start_date,
                  end_date: filters.end_date,
                  governance_area: filters.governance_area,
                  barangay_id: filters.barangay_id,
                  status: filters.status,
                }}
                reportsData={data}
              />
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <FilterControls
          filters={filters}
          onFilterChange={handleFilterChange}
          userRole={userRole}
        />

        {/* Visualization Grid */}
        <VisualizationGrid data={data} isLoading={isLoading} />
      </div>
    </div>
  );
}
