"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Building2 } from "lucide-react";
import type { BBIFunctionalityTrendsResponse } from "@sinag/shared";

// Colors for each functionality tier (following DILG MC 2024-417)
const FUNCTIONALITY_COLORS = {
  highlyFunctional: "#22c55e", // green-500
  moderatelyFunctional: "#eab308", // yellow-500
  lowFunctional: "#f97316", // orange-500
  nonFunctional: "#ef4444", // red-500
};

interface BBITrendsChartProps {
  data: BBIFunctionalityTrendsResponse;
}

interface ChartDataItem {
  name: string;
  fullName: string;
  "Highly Functional": number;
  "Moderately Functional": number;
  "Low Functional": number;
  "Non-Functional": number;
  highlyCount: number;
  moderatelyCount: number;
  lowCount: number;
  nonCount: number;
  total: number;
}

// Tooltip formatter helper - defined outside to avoid prop-types issues
function formatTooltipValue(value: number, name: string, payload: ChartDataItem): [string, string] {
  let count = 0;
  if (name === "Highly Functional") count = payload.highlyCount;
  if (name === "Moderately Functional") count = payload.moderatelyCount;
  if (name === "Low Functional") count = payload.lowCount;
  if (name === "Non-Functional") count = payload.nonCount;
  return [`${value.toFixed(1)}% (${count} barangays)`, name];
}

export function BBITrendsChart({ data }: BBITrendsChartProps) {
  // Transform data for the stacked bar chart (memoized to prevent unnecessary re-renders)
  const chartData = useMemo(
    (): ChartDataItem[] =>
      data.bbis.map((bbi) => ({
        name: bbi.bbi_abbreviation,
        fullName: bbi.bbi_name,
        "Highly Functional": bbi.highly_functional_percentage,
        "Moderately Functional": bbi.moderately_functional_percentage,
        "Low Functional": bbi.low_functional_percentage,
        "Non-Functional": bbi.non_functional_percentage,
        highlyCount: bbi.highly_functional_count,
        moderatelyCount: bbi.moderately_functional_count,
        lowCount: bbi.low_functional_count,
        nonCount: bbi.non_functional_count,
        total: bbi.total_assessed,
      })),
    [data.bbis]
  );

  if (data.bbis.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>BBI Functionality Trends</CardTitle>
          </div>
          <CardDescription>
            Distribution of barangays across BBI functionality tiers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground">No BBI data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>BBI Functionality Trends</CardTitle>
        </div>
        <CardDescription>
          Distribution of {data.total_barangays_assessed} barangays across BBI functionality tiers
          (per DILG MC 2024-417)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Accessible data table for screen readers */}
        <table className="sr-only" aria-label="BBI functionality distribution">
          <caption>
            Functionality distribution for each Barangay-Based Institution across all barangays
          </caption>
          <thead>
            <tr>
              <th scope="col">BBI</th>
              <th scope="col">Highly Functional</th>
              <th scope="col">Moderately Functional</th>
              <th scope="col">Low Functional</th>
              <th scope="col">Non-Functional</th>
              <th scope="col">Total Assessed</th>
            </tr>
          </thead>
          <tbody>
            {data.bbis.map((bbi) => (
              <tr key={bbi.bbi_abbreviation}>
                <td>{bbi.bbi_name}</td>
                <td>
                  {bbi.highly_functional_count} ({bbi.highly_functional_percentage.toFixed(1)}%)
                </td>
                <td>
                  {bbi.moderately_functional_count} (
                  {bbi.moderately_functional_percentage.toFixed(1)}
                  %)
                </td>
                <td>
                  {bbi.low_functional_count} ({bbi.low_functional_percentage.toFixed(1)}%)
                </td>
                <td>
                  {bbi.non_functional_count} ({bbi.non_functional_percentage.toFixed(1)}%)
                </td>
                <td>{bbi.total_assessed}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Stacked Bar Chart */}
        <div
          className="h-[300px] mb-6"
          role="img"
          aria-label={`Stacked bar chart showing BBI functionality distribution for ${data.bbis.length} BBI types`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 12 }} />
              {/* eslint-disable react/prop-types */}
              <Tooltip
                formatter={(value: number, name: string, props: { payload: ChartDataItem }) =>
                  formatTooltipValue(value, name, props.payload)
                }
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.name === label);
                  return item?.fullName || label;
                }}
              />
              {/* eslint-enable react/prop-types */}
              <Legend />
              <Bar
                dataKey="Highly Functional"
                stackId="a"
                fill={FUNCTIONALITY_COLORS.highlyFunctional}
              />
              <Bar
                dataKey="Moderately Functional"
                stackId="a"
                fill={FUNCTIONALITY_COLORS.moderatelyFunctional}
              />
              <Bar dataKey="Low Functional" stackId="a" fill={FUNCTIONALITY_COLORS.lowFunctional} />
              <Bar dataKey="Non-Functional" stackId="a" fill={FUNCTIONALITY_COLORS.nonFunctional} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Explanation */}
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-3">
            <strong>Functionality Tiers</strong> (per DILG MC 2024-417):
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: FUNCTIONALITY_COLORS.highlyFunctional }}
              />
              <span>Highly (75-100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: FUNCTIONALITY_COLORS.moderatelyFunctional }}
              />
              <span>Moderately (50-74%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: FUNCTIONALITY_COLORS.lowFunctional }}
              />
              <span>Low (1-49%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: FUNCTIONALITY_COLORS.nonFunctional }}
              />
              <span>Non-Functional (0%)</span>
            </div>
          </div>
        </div>

        {/* BBI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
          {data.bbis.map((bbi) => (
            <div key={bbi.bbi_abbreviation} className="rounded-lg border p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-sm">{bbi.bbi_abbreviation}</h4>
                  <p className="text-xs text-muted-foreground">{bbi.bbi_name}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {bbi.governance_area_code}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: FUNCTIONALITY_COLORS.highlyFunctional }}
                  />
                  <span className="text-muted-foreground">Highly:</span>
                  <span className="font-medium">{bbi.highly_functional_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: FUNCTIONALITY_COLORS.moderatelyFunctional }}
                  />
                  <span className="text-muted-foreground">Moderate:</span>
                  <span className="font-medium">{bbi.moderately_functional_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: FUNCTIONALITY_COLORS.lowFunctional }}
                  />
                  <span className="text-muted-foreground">Low:</span>
                  <span className="font-medium">{bbi.low_functional_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: FUNCTIONALITY_COLORS.nonFunctional }}
                  />
                  <span className="text-muted-foreground">Non:</span>
                  <span className="font-medium">{bbi.non_functional_count}</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                Total Assessed:{" "}
                <span className="font-medium text-foreground">{bbi.total_assessed}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
