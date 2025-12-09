"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface OfficialPerformanceData {
  totalBarangays: number;
  passed: number;
  failed: number;
  notAssessed: number;
  passedBarangays: Array<{
    name: string;
    score: number;
  }>;
}

interface OfficialPerformanceWidgetProps {
  data: OfficialPerformanceData;
  period: string;
}

export function OfficialPerformanceWidget({ data, period }: OfficialPerformanceWidgetProps) {
  const totalAssessed = data.passed + data.failed;
  const passRate = totalAssessed > 0 ? Math.round((data.passed / totalAssessed) * 100) : 0;

  // Calculate donut chart segments
  const circumference = 2 * Math.PI * 45; // radius = 45
  const passedAngle = totalAssessed > 0 ? (data.passed / totalAssessed) * 360 : 0;
  const failedAngle = totalAssessed > 0 ? (data.failed / totalAssessed) * 360 : 0;
  const notAssessedAngle =
    data.totalBarangays > 0 ? (data.notAssessed / data.totalBarangays) * 360 : 0;

  const passedDashArray = (passedAngle / 360) * circumference;
  const failedDashArray = (failedAngle / 360) * circumference;
  const notAssessedDashArray = (notAssessedAngle / 360) * circumference;

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Official SGLGB Performance ({period})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut Chart */}
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="var(--analytics-neutral-border)"
                  strokeWidth="8"
                />
                {/* Passed segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="var(--analytics-success)"
                  strokeWidth="8"
                  strokeDasharray={`${passedDashArray} ${circumference}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
                {/* Failed segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="var(--analytics-danger)"
                  strokeWidth="8"
                  strokeDasharray={`${failedDashArray} ${circumference}`}
                  strokeDashoffset={`-${passedDashArray}`}
                  strokeLinecap="round"
                />
                {/* Not Assessed segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="var(--analytics-neutral)"
                  strokeWidth="8"
                  strokeDasharray={`${notAssessedDashArray} ${circumference}`}
                  strokeDashoffset={`-${passedDashArray + failedDashArray}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-[var(--foreground)]">{data.passed}</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  / {data.totalBarangays} Passers
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "var(--analytics-success)" }}
                ></div>
                <span className="text-sm text-[var(--text-primary)]">Passed ({data.passed})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "var(--analytics-danger)" }}
                ></div>
                <span className="text-sm text-[var(--text-primary)]">Failed ({data.failed})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "var(--analytics-neutral)" }}
                ></div>
                <span className="text-sm text-[var(--text-primary)]">
                  Not Assessed ({data.notAssessed})
                </span>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div>
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2 text-[var(--foreground)]">
                Officially Passed Barangays
              </h4>
              <p className="text-sm text-[var(--text-secondary)]">
                Pass Rate:{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--analytics-success-text-light)" }}
                >
                  {passRate}%
                </span>
              </p>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barangay</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.passedBarangays.map((barangay) => (
                    <TableRow key={barangay.name}>
                      <TableCell className="font-medium">{barangay.name}</TableCell>
                      <TableCell>{barangay.score}%</TableCell>
                      <TableCell>
                        <Badge
                          variant="default"
                          className="border-0 text-white"
                          style={{ backgroundColor: "var(--analytics-success)" }}
                        >
                          Passed
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
