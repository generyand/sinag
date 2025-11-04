import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportsDataResponse } from "@vantage/shared";
import {
  AreaBreakdownBarChart,
  ComplianceStatusPieChart,
  TrendLineChart,
} from "./ChartComponents";
import { BarangayMap } from "@/components/features/analytics";
import { AssessmentDataTable } from "./DataTable";

interface VisualizationGridProps {
  data?: ReportsDataResponse;
  isLoading?: boolean;
}

export function VisualizationGrid({ data, isLoading }: VisualizationGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Charts Grid - 2 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-[350px]" />
        </div>

        {/* Map - Full width */}
        <Skeleton className="h-[500px]" />

        {/* Table - Full width */}
        <Skeleton className="h-[400px]" />
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

  return (
    <div className="space-y-6">
      {/* Charts Section - Responsive Grid */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Analytics Charts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bar Chart Card */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Results by Area</CardTitle>
            </CardHeader>
            <CardContent id="bar-chart-container">
              <AreaBreakdownBarChart data={data.chart_data.bar_chart} />
            </CardContent>
          </Card>

          {/* Pie Chart Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent id="pie-chart-container">
              <ComplianceStatusPieChart data={data.chart_data.pie_chart} />
            </CardContent>
          </Card>

          {/* Line Chart Card - Full width on mobile, spans 2 columns on desktop */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent id="line-chart-container">
              <TrendLineChart data={data.chart_data.line_chart} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Geographic Map Section - Full Width */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Geographic Distribution</h2>
        <Card>
          <CardHeader>
            <CardTitle>Barangay Performance Map</CardTitle>
          </CardHeader>
          <CardContent id="map-container">
            <BarangayMap barangays={data.map_data.barangays} />
          </CardContent>
        </Card>
      </section>

      {/* Data Table Section - Full Width */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Detailed Results</h2>
        <Card>
          <CardHeader>
            <CardTitle>Assessment Data</CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentDataTable data={data.table_data} />
          </CardContent>
        </Card>
      </section>

      {/* Metadata Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground border-t pt-4">
        <div>
          Report generated: {new Date(data.metadata.generated_at).toLocaleString()}
        </div>
        <div>
          Applied filters: {data.metadata.applied_filters_count} active
        </div>
      </div>
    </div>
  );
}
