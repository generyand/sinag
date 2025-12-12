import { SulopBarangayMapIntegrated } from "@/components/features/analytics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BarangayMapPoint } from "@sinag/shared";
import { ReportsDataResponse } from "@sinag/shared";
import { AreaBreakdownBarChart, ComplianceStatusPieChart, TrendLineChart } from "./ChartComponents";
import { AssessmentDataTable } from "./DataTable";

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
              <Card className="rounded-sm" role="region" aria-labelledby="bar-chart-title">
                <CardHeader>
                  <CardTitle id="bar-chart-title">Assessment Results by Area</CardTitle>
                  <CardDescription>Pass/fail breakdown for each governance area</CardDescription>
                </CardHeader>
                <CardContent id="bar-chart-container">
                  <AreaBreakdownBarChart data={data.chart_data.bar_chart || []} />
                </CardContent>
              </Card>
            )}

            {/* Pie Chart Card */}
            {shouldShow("pie") && (
              <Card className="rounded-sm" role="region" aria-labelledby="pie-chart-title">
                <CardHeader>
                  <CardTitle id="pie-chart-title">Status Distribution</CardTitle>
                  <CardDescription>Overall assessment completion status</CardDescription>
                </CardHeader>
                <CardContent id="pie-chart-container">
                  <ComplianceStatusPieChart data={data.chart_data.pie_chart || []} />
                </CardContent>
              </Card>
            )}

            {/* Line Chart Card - Full width on mobile, spans 2 columns on desktop */}
            {shouldShow("line") && (
              <Card
                className="md:col-span-2 rounded-sm"
                role="region"
                aria-labelledby="line-chart-title"
              >
                <CardHeader>
                  <CardTitle id="line-chart-title">Trends Over Time</CardTitle>
                  <CardDescription>Historical pass rate across assessment cycles</CardDescription>
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
                const v = (s || "").toLowerCase();
                if (v === "pass" || v === "passed") return "pass" as const;
                if (v === "fail" || v === "failed") return "fail" as const;
                if (v === "in_progress" || v === "in progress") return "in_progress" as const;
                return "not_started" as const;
              };

              // Transform backend data to match frontend component interface
              const barangays = points.map((p) => {
                const status = toStatus(p.status);

                // Use real assessment status from backend if available

                const backendAssessment = (p as any).assessment_status;

                const backendWorkflow = (p as any).workflow_status;

                // Only show assessment status for Pass/Fail (completed) assessments
                // In Progress and Not Started should NOT show governance area results
                const isCompleted = status === "pass" || status === "fail";

                // Transform backend assessment status to frontend format
                let assessmentStatus:
                  | {
                      core: {
                        passed: number;
                        total: number;
                        indicators: { FAS: string; DP: string; SPO: string };
                      };
                      essential: {
                        passed: number;
                        total: number;
                        indicators: { SPS: string; BFC: string; EM: string };
                      };
                    }
                  | undefined;

                // Only populate assessment status for completed assessments
                if (isCompleted && backendAssessment) {
                  // Transform indicators array to object format expected by component
                  const coreIndicators = backendAssessment.core?.indicators || [];
                  const essentialIndicators = backendAssessment.essential?.indicators || [];

                  // Find indicator by code and get its status
                  const getIndicatorStatus = (
                    indicators: { code: string; status: string }[],
                    code: string
                  ): "passed" | "failed" | "pending" => {
                    const indicator = indicators.find((i: { code: string }) => i.code === code);
                    if (!indicator) return "pending";
                    return indicator.status as "passed" | "failed" | "pending";
                  };

                  assessmentStatus = {
                    core: {
                      passed: backendAssessment.core?.passed ?? 0,
                      total: backendAssessment.core?.total ?? 3,
                      indicators: {
                        FAS: getIndicatorStatus(coreIndicators, "FAS"),
                        DP: getIndicatorStatus(coreIndicators, "DP"),
                        SPO: getIndicatorStatus(coreIndicators, "SPO"),
                      },
                    },
                    essential: {
                      passed: backendAssessment.essential?.passed ?? 0,
                      total: backendAssessment.essential?.total ?? 3,
                      indicators: {
                        SPS: getIndicatorStatus(essentialIndicators, "SPS"),
                        BFC: getIndicatorStatus(essentialIndicators, "BFC"),
                        EM: getIndicatorStatus(essentialIndicators, "EM"),
                      },
                    },
                  };
                }
                // For non-completed assessments, assessmentStatus remains undefined

                // Transform backend workflow status to frontend format
                // Only show for assessments that have started (not "not_started")
                let workflowStatus: { currentPhase: string; actionNeeded: string } | undefined;

                if (backendWorkflow) {
                  workflowStatus = {
                    currentPhase: backendWorkflow.current_phase,
                    actionNeeded: backendWorkflow.action_needed,
                  };
                }
                // For assessments without workflow status, leave it undefined

                return {
                  id: String(p.barangay_id),
                  name: p.name,
                  status,
                  compliance_rate: p.score ?? undefined,
                  assessmentStatus,
                  workflowStatus,
                };
              });

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
          <Card className="rounded-sm" role="region" aria-labelledby="table-title">
            <CardHeader>
              <CardTitle id="table-title">Assessment Data</CardTitle>
              <CardDescription>Detailed assessment results for all barangays</CardDescription>
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
          <div>Report generated: {new Date(data.metadata.generated_at).toLocaleString()}</div>
          {data.metadata.assessment_year && <div>Year: {data.metadata.assessment_year}</div>}
        </div>
      )}
    </div>
  );
}
