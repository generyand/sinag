"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FilterControls,
  VisualizationGrid,
  ExportControls,
} from "@/components/features/reports";
import { useGetAnalyticsReports } from "@sinag/shared";
import { BarChart3, FileText } from "lucide-react";

export default function ReportsPage() {
  // Filter state
  const [filters, setFilters] = useState({
    cycle_id: undefined as number | undefined,
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined,
    governance_area: undefined as string[] | undefined,
    barangay_id: undefined as number[] | undefined,
    status: undefined as string | undefined,
    phase: undefined as 'phase1' | 'phase2' | undefined,
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
      <div className="min-h-screen bg-[var(--background)] p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="relative overflow-hidden bg-[var(--card)] rounded shadow-lg border border-gray-200 p-8">
            <div className="relative z-10">
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                Reports &{" "}
                <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                  Visualizations
                </span>
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Analytics and reporting dashboard with interactive visualizations
              </p>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertDescription>
              Failed to load reports data: {(error as any)?.message || "Unknown error"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Get user role (TODO: Get from actual auth context)
  const userRole = "MLGOO_DILG";

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header Section */}
        <div className="relative overflow-hidden bg-[var(--card)] rounded shadow-lg border border-gray-200 p-8">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/40 to-indigo-100/20 rounded-full -translate-y-20 translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/30 to-pink-100/20 rounded-full translate-y-16 -translate-x-16"></div>

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] rounded shadow-md">
                  <BarChart3 className="h-8 w-8 text-[var(--foreground)]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[var(--foreground)]">
                    Reports &{" "}
                    <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                      Visualizations
                    </span>
                  </h1>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Analytics and reporting dashboard with interactive visualizations
                  </p>
                </div>
              </div>

              {/* Export Controls - Only for MLGOO_DILG */}
              {userRole === "MLGOO_DILG" && data && (
                <div className="flex-shrink-0">
                  <ExportControls
                    tableData={data.table_data.rows || []}
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

            {/* Quick Stats */}
            {data && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[var(--foreground)]">
                        {data.table_data.rows?.length || 0}
                      </div>
                      <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                        Total Records
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[var(--foreground)]">
                        {data.map_data.barangays?.length || 0}
                      </div>
                      <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                        Barangays
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[var(--foreground)]">
                        {data.metadata.generated_at ? new Date(data.metadata.generated_at).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                        Report Date
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <FilterControls
          filters={filters}
          onFilterChange={handleFilterChange as any}
          userRole={userRole}
        />

        {/* Visualization Grid */}
        <VisualizationGrid data={data} isLoading={isLoading} />
      </div>
    </div>
  );
}
