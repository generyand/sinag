import { SulopBarangayMapIntegrated } from "@/components/features/analytics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportsDataResponse } from "@sinag/shared";
import {
  AreaBreakdownBarChart,
  ComplianceStatusPieChart,
  TrendLineChart,
} from "./ChartComponents";
import { AssessmentDataTable } from "./DataTable";
import type { BarangayMapPoint } from "@sinag/shared";

type VisualizationType = "bar" | "pie" | "line" | "map" | "table";

interface VisualizationGridProps {
  data?: ReportsDataResponse;
  isLoading?: boolean;
  /** Optional: Only show specific visualizations */
  showOnly?: VisualizationType[];
}

export function VisualizationGrid({ data, isLoading, showOnly }: VisualizationGridProps) {
  // Helper to check if a visualization should be shown
  const shouldShow = (type: VisualizationType) => !showOnly || showOnly.includes(type);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Charts Grid - 2 columns on desktop */}
        {(shouldShow("bar") || shouldShow("pie") || shouldShow("line")) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shouldShow("bar") && <Skeleton className="h-[350px]" />}
            {shouldShow("pie") && <Skeleton className="h-[350px]" />}
            {shouldShow("line") && <Skeleton className="h-[350px] md:col-span-2" />}
          </div>
        )}

        {/* Map - Full width */}
        {shouldShow("map") && <Skeleton className="h-[500px]" />}

        {/* Table - Full width */}
        {shouldShow("table") && <Skeleton className="h-[400px]" />}
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>No data available to display.</AlertDescription>
      </Alert>
    );
  }

  // Check if any charts should be shown
  const showCharts = shouldShow("bar") || shouldShow("pie") || shouldShow("line");

  return (
    <div className="space-y-6">
      {/* Charts Section - Responsive Grid */}
      {showCharts && (
        <section className="space-y-4">
          {!showOnly && <h2 className="text-2xl font-semibold">Analytics Charts</h2>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bar Chart Card */}
            {shouldShow("bar") && (
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Results by Area</CardTitle>
                </CardHeader>
                <CardContent id="bar-chart-container">
                  <AreaBreakdownBarChart data={data.chart_data.bar_chart || []} />
                </CardContent>
              </Card>
            )}

            {/* Pie Chart Card */}
            {shouldShow("pie") && (
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                </CardHeader>
                <CardContent id="pie-chart-container">
                  <ComplianceStatusPieChart data={data.chart_data.pie_chart || []} />
                </CardContent>
              </Card>
            )}

            {/* Line Chart Card - Full width on mobile, spans 2 columns on desktop */}
            {shouldShow("line") && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Trends Over Time</CardTitle>
                </CardHeader>
                <CardContent id="line-chart-container">
                  <TrendLineChart data={data.chart_data.line_chart || []} />
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Geographic Map Section - Full Width */}
      {shouldShow("map") && (
        <section className="space-y-4">
          {!showOnly && <h2 className="text-2xl font-semibold">Geographic Distribution</h2>}
          <div id="map-container">
            {(() => {
              const points = (data.map_data.barangays || []) as BarangayMapPoint[];
              const toStatus = (s?: string) => {
                const v = (s || '').toLowerCase();
                if (v === 'pass' || v === 'passed') return 'pass' as const;
                if (v === 'fail' || v === 'failed') return 'fail' as const;
                if (v === 'in_progress' || v === 'in progress') return 'in_progress' as const;
                return 'not_started' as const;
              };
              const barangays = points.map((p) => ({
                id: String(p.barangay_id),
                name: p.name,
                status: toStatus(p.status),
                compliance_rate: p.score ?? undefined,
              }));
              return (
                <SulopBarangayMapIntegrated
                  barangays={barangays as any}
                  title="Sulop Barangay Assessment Status"
                  description="Interactive map showing assessment status for each barangay in Sulop"
                />
              );
            })()}
          </div>
        </section>
      )}

      {/* Data Table Section - Full Width */}
      {shouldShow("table") && (
        <section className="space-y-4">
          {!showOnly && <h2 className="text-2xl font-semibold">Detailed Results</h2>}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Data</CardTitle>
            </CardHeader>
            <CardContent>
              <AssessmentDataTable data={data.table_data || []} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Metadata Footer - Only show when not filtering */}
      {!showOnly && (
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground border-t pt-4">
          <div>
            Report generated: {new Date(data.metadata.generated_at).toLocaleString()}
          </div>
          {data.metadata.cycle_id && (
            <div>
              Cycle ID: {data.metadata.cycle_id}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
