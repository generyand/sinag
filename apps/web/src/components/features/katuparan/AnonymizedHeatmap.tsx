"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, CheckCircle2, XCircle, Clock, Circle } from "lucide-react";
import type { GeographicHeatmapResponse } from "@sinag/shared";

// Status colors
const STATUS_COLORS = {
  pass: "#22c55e", // green-500
  fail: "#ef4444", // red-500
  in_progress: "#f97316", // orange-500
  not_started: "#94a3b8", // slate-400
};

interface AnonymizedHeatmapProps {
  data: GeographicHeatmapResponse;
}

export function AnonymizedHeatmap({ data }: AnonymizedHeatmapProps) {
  const { barangays, summary, total_barangays } = data;

  // Calculate percentages for the summary (memoized to prevent unnecessary re-renders)
  const { passPercent, failPercent, inProgressPercent, notStartedPercent } = useMemo(
    () => ({
      passPercent: total_barangays > 0 ? (summary.pass_count / total_barangays) * 100 : 0,
      failPercent: total_barangays > 0 ? (summary.fail_count / total_barangays) * 100 : 0,
      inProgressPercent:
        total_barangays > 0 ? (summary.in_progress_count / total_barangays) * 100 : 0,
      notStartedPercent:
        total_barangays > 0 ? (summary.not_started_count / total_barangays) * 100 : 0,
    }),
    [summary, total_barangays]
  );

  if (barangays.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Geographic Performance Overview</CardTitle>
          </div>
          <CardDescription>Anonymized status distribution across barangays</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground">No geographic data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle>Geographic Performance Overview</CardTitle>
        </div>
        <CardDescription>
          Anonymized assessment status for {total_barangays} barangays (names hidden for privacy)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg border p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Passed</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{summary.pass_count}</div>
            <div className="text-xs text-green-600/80">{passPercent.toFixed(1)}% of total</div>
          </div>

          <div className="rounded-lg border p-4 bg-red-50 border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">Failed</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{summary.fail_count}</div>
            <div className="text-xs text-red-600/80">{failPercent.toFixed(1)}% of total</div>
          </div>

          <div className="rounded-lg border p-4 bg-orange-50 border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">In Progress</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{summary.in_progress_count}</div>
            <div className="text-xs text-orange-600/80">
              {inProgressPercent.toFixed(1)}% of total
            </div>
          </div>

          <div className="rounded-lg border p-4 bg-slate-50 border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Circle className="h-5 w-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-600">Not Started</span>
            </div>
            <div className="text-2xl font-bold text-slate-500">{summary.not_started_count}</div>
            <div className="text-xs text-slate-500/80">
              {notStartedPercent.toFixed(1)}% of total
            </div>
          </div>
        </div>

        {/* Progress Bar Visualization */}
        <div className="mb-6">
          <div className="text-sm font-medium mb-2">Distribution Overview</div>
          <div className="h-8 rounded-lg overflow-hidden flex">
            {summary.pass_count > 0 && (
              <div
                className="h-full flex items-center justify-center text-xs font-medium text-white"
                style={{
                  backgroundColor: STATUS_COLORS.pass,
                  width: `${passPercent}%`,
                  minWidth: summary.pass_count > 0 ? "2rem" : 0,
                }}
                title={`Passed: ${summary.pass_count}`}
              >
                {passPercent >= 10 && `${passPercent.toFixed(0)}%`}
              </div>
            )}
            {summary.fail_count > 0 && (
              <div
                className="h-full flex items-center justify-center text-xs font-medium text-white"
                style={{
                  backgroundColor: STATUS_COLORS.fail,
                  width: `${failPercent}%`,
                  minWidth: summary.fail_count > 0 ? "2rem" : 0,
                }}
                title={`Failed: ${summary.fail_count}`}
              >
                {failPercent >= 10 && `${failPercent.toFixed(0)}%`}
              </div>
            )}
            {summary.in_progress_count > 0 && (
              <div
                className="h-full flex items-center justify-center text-xs font-medium text-white"
                style={{
                  backgroundColor: STATUS_COLORS.in_progress,
                  width: `${inProgressPercent}%`,
                  minWidth: summary.in_progress_count > 0 ? "2rem" : 0,
                }}
                title={`In Progress: ${summary.in_progress_count}`}
              >
                {inProgressPercent >= 10 && `${inProgressPercent.toFixed(0)}%`}
              </div>
            )}
            {summary.not_started_count > 0 && (
              <div
                className="h-full flex items-center justify-center text-xs font-medium text-white"
                style={{
                  backgroundColor: STATUS_COLORS.not_started,
                  width: `${notStartedPercent}%`,
                  minWidth: summary.not_started_count > 0 ? "2rem" : 0,
                }}
                title={`Not Started: ${summary.not_started_count}`}
              >
                {notStartedPercent >= 10 && `${notStartedPercent.toFixed(0)}%`}
              </div>
            )}
          </div>
        </div>

        {/* Anonymized Barangay Grid */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Barangay Status Grid</p>
            <Badge variant="outline" className="text-xs">
              Anonymized IDs
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Each cell represents one barangay. Actual names are hidden to protect individual
            performance data.
          </p>
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
            {barangays.map((barangay) => {
              const statusColor =
                STATUS_COLORS[barangay.status as keyof typeof STATUS_COLORS] ||
                STATUS_COLORS.not_started;
              const statusLabel =
                barangay.status === "pass"
                  ? "Passed"
                  : barangay.status === "fail"
                    ? "Failed"
                    : barangay.status === "in_progress"
                      ? "In Progress"
                      : "Not Started";

              return (
                <div
                  key={barangay.anonymous_id}
                  className="aspect-square rounded-md flex items-center justify-center text-white text-xs font-medium cursor-default transition-transform hover:scale-105"
                  style={{ backgroundColor: statusColor }}
                  title={`${barangay.anonymous_id}: ${statusLabel}`}
                  aria-label={`${barangay.anonymous_id}: ${statusLabel}`}
                >
                  {barangay.anonymous_id.replace("Barangay ", "")}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.pass }} />
              <span>Passed SGLGB</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.fail }} />
              <span>Failed SGLGB</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: STATUS_COLORS.in_progress }}
              />
              <span>Assessment In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: STATUS_COLORS.not_started }}
              />
              <span>Not Started</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
