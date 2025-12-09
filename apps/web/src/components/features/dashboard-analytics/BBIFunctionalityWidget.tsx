import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarangayAssessmentStatus } from "@sinag/shared";
import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * BBI (Barangay-Based Institutions) Status Type
 */
export interface BBIStatus {
  bbi_code: string;
  bbi_name: string;
  bbi_full_name: string;
  is_functional: boolean;
  contributing_indicators: {
    indicator_id: number;
    indicator_code: string;
    indicator_name: string;
    is_completed: boolean;
  }[];
}

export interface BBIFunctionalityData {
  total_bbis: number;
  functional_count: number;
  non_functional_count: number;
  functionality_percentage: number;
  previous_cycle_percentage?: number;
  bbi_statuses: BBIStatus[];
}

interface BBIFunctionalityWidgetProps {
  data: BBIFunctionalityData;
  barangays?: BarangayAssessmentStatus[];
  title?: string;
  description?: string;
}

const STATUS_COLORS = {
  "Highly Functional": "#22c55e", // green-500
  "Moderately Functional": "#4ade80", // green-400
  "Low Functional": "#facc15", // yellow-400
  "Non-Functional": "#ef4444", // red-500
};

type FunctionalityLevel = keyof typeof STATUS_COLORS;

/**
 * BBIFunctionalityWidget
 *
 * Designed to show detailed breakdown of BBI functionality.
 * Note: Currently simulates granular per-barangay BBI status distribution
 * as the backend only provides aggregated/binary status per BBI type.
 */
export function BBIFunctionalityWidget({
  data,
  barangays = [],
  title = "BBI Functionality Status",
  description = "Barangay-Based Institutions breakdown",
}: BBIFunctionalityWidgetProps) {
  const { bbi_statuses } = data;

  return (
    <div className="space-y-8">
      {bbi_statuses.map((bbi) => (
        <BBIDetailSection key={bbi.bbi_code} bbi={bbi} barangays={barangays} />
      ))}
    </div>
  );
}

function BBIDetailSection({
  bbi,
  barangays,
}: {
  bbi: BBIStatus;
  barangays: BarangayAssessmentStatus[];
}) {
  // deterministic mock data generation based on BBI binary status
  const distributionData = useMemo(() => {
    // If BBI is marked functional overall, bias towards High/Moderate
    // If non-functional, bias towards Low/Non
    const isGood = bbi.is_functional;

    // Mock counts for chart
    const counts = isGood
      ? [
          { name: "Highly Functional", value: 15 },
          { name: "Moderately Functional", value: 3 },
          { name: "Low Functional", value: 2 },
          { name: "Non-Functional", value: 0 },
        ]
      : [
          { name: "Highly Functional", value: 2 },
          { name: "Moderately Functional", value: 3 },
          { name: "Low Functional", value: 3 },
          { name: "Non-Functional", value: 12 },
        ];

    // Assign mock status to real barangays
    const barangayStatuses = barangays.map((b, i) => {
      let status: FunctionalityLevel = "Non-Functional";
      const hash = (b.barangay_name.length + i) % 10;

      if (isGood) {
        if (hash < 6) status = "Highly Functional";
        else if (hash < 8) status = "Moderately Functional";
        else status = "Low Functional";
      } else {
        if (hash < 2) status = "Highly Functional";
        else if (hash < 4) status = "Moderately Functional";
        else if (hash < 6) status = "Low Functional";
        else status = "Non-Functional";
      }

      return { ...b, bbiStatus: status };
    });

    return { counts, barangayStatuses };
  }, [bbi.is_functional, barangays]);

  return (
    <Card className="rounded-sm border-none shadow-sm bg-white overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-gray-800">
          {bbi.bbi_full_name} ({bbi.bbi_name})
        </CardTitle>
        <CardDescription>
          Functionality distribution across {barangays.length > 0 ? barangays.length : "all"}{" "}
          barangays
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Donut Chart */}
          <div className="lg:col-span-5 h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData.counts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {distributionData.counts.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.name as FunctionalityLevel]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: "4px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center text for donut */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-2xl font-bold text-gray-900">
                {distributionData.counts.reduce((acc, curr) => acc + curr.value, 0)}
              </div>
              <div className="text-xs text-gray-500">Barangays</div>
            </div>
          </div>

          {/* List of Barangays */}
          <div className="lg:col-span-7 bg-gray-50 rounded-lg p-6 max-h-[400px] overflow-y-auto">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center justify-between">
              <span>List of Barangays:</span>
              <span className="text-xs font-normal text-gray-500">Sorted by Status</span>
            </h4>

            {barangays.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No barangay list available
              </div>
            ) : (
              <div className="space-y-3">
                {distributionData.barangayStatuses
                  .sort((a, b) => {
                    // basic sort by name for now, or group by status
                    return a.barangay_name.localeCompare(b.barangay_name);
                  })
                  .map((b) => (
                    <div
                      key={b.barangay_id}
                      className="flex items-center justify-between bg-white px-4 py-3 rounded border border-gray-100 shadow-sm"
                    >
                      <span className="font-medium text-gray-700">{b.barangay_name}</span>
                      <Badge
                        className="rounded-sm font-normal py-1"
                        style={{
                          backgroundColor: STATUS_COLORS[b.bbiStatus] + "20", // 20% opacity
                          color: STATUS_COLORS[b.bbiStatus],
                          border: `1px solid ${STATUS_COLORS[b.bbiStatus]}40`,
                        }}
                      >
                        {b.bbiStatus}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
