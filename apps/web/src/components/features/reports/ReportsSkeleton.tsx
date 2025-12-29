import { Skeleton } from "@/components/ui/skeleton";
import { Filter, Target, Activity, Brain } from "lucide-react";

export function ReportsSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Global Filters Skeleton */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="h-5 w-5" style={{ color: "var(--cityscape-yellow)" }} />
              <Skeleton className="h-6 w-32" />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>
          </div>

          {/* Main Analytics Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Official SGLGB Performance - 2 columns */}
            <div className="lg:col-span-2">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
                <div className="p-6 border-b border-[var(--border)]">
                  <Skeleton className="h-6 w-80 mb-2" />

                  {/* Donut Chart and Stats */}
                  <div className="flex items-center gap-8 mb-6">
                    {/* Donut Chart Skeleton */}
                    <div className="relative w-32 h-32">
                      <Skeleton className="w-32 h-32 rounded-full" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Skeleton className="h-8 w-8 mb-1" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                    </div>

                    {/* Legend Skeleton */}
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Skeleton className="w-3 h-3 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </div>

                    {/* Pass Rate Skeleton */}
                    <div className="ml-auto text-right">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </div>

                {/* Barangay List Skeleton */}
                <div className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide pb-2 border-b border-[var(--border)]">
                      <div>Barangay</div>
                      <div>Compliance Rate</div>
                      <div>Status</div>
                    </div>

                    {Array.from({ length: 8 }).map((_, index) => (
                      <div key={index} className="grid grid-cols-3 gap-4 items-center py-2">
                        <Skeleton className="h-4 w-32" />
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-[var(--border)] rounded-sm h-2">
                            <Skeleton className="h-2 w-3/4 rounded-sm" />
                          </div>
                          <Skeleton className="h-4 w-8" />
                        </div>
                        <Skeleton className="h-5 w-12 rounded-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Municipality-Wide Performance Hotspots */}
            <div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
                <div className="p-6 border-b border-[var(--border)]">
                  <Skeleton className="h-5 w-64 mb-1" />
                  <Skeleton className="h-4 w-80" />
                </div>

                <div className="p-6 space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-sm p-4 border"
                      style={{
                        backgroundColor: "var(--analytics-danger-bg)",
                        borderColor: "var(--analytics-danger-border)",
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <Skeleton className="h-4 w-48 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-5 w-12 rounded-sm" />
                      </div>
                    </div>
                  ))}

                  {/* Capacity Development Priority */}
                  <div
                    className="mt-6 rounded-sm p-4 border"
                    style={{
                      backgroundColor: "var(--kpi-blue-from)",
                      borderColor: "var(--kpi-blue-border, var(--border))",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Target
                        className="h-5 w-5 mt-0.5 flex-shrink-0"
                        style={{ color: "var(--kpi-blue-text)" }}
                      />
                      <div>
                        <Skeleton className="h-4 w-48 mb-1" />
                        <Skeleton className="h-3 w-64" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pre-Assessment Effectiveness Analysis */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]">
              <Skeleton className="h-6 w-80" />
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-sm p-6 text-center border"
                    style={{
                      backgroundColor: "var(--analytics-success-bg)",
                      borderColor: "var(--analytics-success-border)",
                    }}
                  >
                    <Skeleton className="h-12 w-16 mx-auto mb-2" />
                    <Skeleton className="h-4 w-32 mx-auto mb-1" />
                    <Skeleton className="h-3 w-24 mx-auto" />
                  </div>
                ))}
              </div>

              {/* Analysis Summary */}
              <div
                className="rounded-sm p-4 border"
                style={{
                  backgroundColor: "var(--kpi-blue-from)",
                  borderColor: "var(--kpi-blue-border, var(--border))",
                }}
              >
                <div className="flex items-start gap-3">
                  <Activity
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    style={{ color: "var(--kpi-blue-text)" }}
                  />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-80" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI-Powered CapDev Report Generator */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <Brain className="h-6 w-6" style={{ color: "var(--kpi-purple-text)" }} />
                <Skeleton className="h-6 w-64" />
              </div>
              <Skeleton className="h-4 w-80 mt-1" />
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-64" />
                </div>

                <Skeleton className="h-10 w-40 rounded-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
