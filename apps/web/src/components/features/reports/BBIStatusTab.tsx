"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// Types based on backend schema
interface BBIInfo {
  bbi_id: number;
  abbreviation: string;
  name: string;
  indicator_code: string | null;
}

interface BBIStatusInfo {
  rating: string;
  percentage: number;
}

interface BarangayBBIStatus {
  barangay_id: number;
  barangay_name: string;
  bbi_statuses: Record<string, BBIStatusInfo>;
}

interface BarangayDistributionItem {
  barangay_id: number;
  barangay_name: string;
  percentage: number;
}

interface BBIDistribution {
  highly_functional: BarangayDistributionItem[];
  moderately_functional: BarangayDistributionItem[];
  low_functional: BarangayDistributionItem[];
  non_functional: BarangayDistributionItem[];
}

interface MunicipalityBBIAnalyticsSummary {
  total_barangays: number;
  total_bbis: number;
  overall_highly_functional: number;
  overall_moderately_functional: number;
  overall_low_functional: number;
  overall_non_functional: number;
}

export interface MunicipalityBBIAnalyticsData {
  assessment_year: number;
  bbis: BBIInfo[];
  barangays: BarangayBBIStatus[];
  bbi_distributions: Record<string, BBIDistribution>;
  summary: MunicipalityBBIAnalyticsSummary;
}

interface BBIStatusTabProps {
  data: MunicipalityBBIAnalyticsData | null;
  isLoading?: boolean;
  municipalityName?: string;
}

// Rating colors following the wireframe
const RATING_COLORS = {
  HIGHLY_FUNCTIONAL: "#16a34a", // green-600
  MODERATELY_FUNCTIONAL: "#22c55e", // green-500 (lighter green)
  LOW_FUNCTIONAL: "#facc15", // yellow-400
  NON_FUNCTIONAL: "#ef4444", // red-500
};

const RATING_LABELS = {
  HIGHLY_FUNCTIONAL: "Highly Functional",
  MODERATELY_FUNCTIONAL: "Moderately Functional",
  LOW_FUNCTIONAL: "Low Functional",
  NON_FUNCTIONAL: "Non Functional",
};

function getRatingColor(rating: string): string {
  return RATING_COLORS[rating as keyof typeof RATING_COLORS] || "#9ca3af";
}

function getRatingLabel(rating: string): string {
  return RATING_LABELS[rating as keyof typeof RATING_LABELS] || rating;
}

function StatusDot({ rating }: { rating: string }) {
  const color = getRatingColor(rating);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="w-4 h-4 rounded-full mx-auto cursor-pointer transition-transform hover:scale-125"
          style={{ backgroundColor: color }}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p>{getRatingLabel(rating)}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function BBIStatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <span className="font-medium text-[var(--foreground)]">Legend:</span>
      {Object.entries(RATING_COLORS).map(([rating, color]) => (
        <div key={rating} className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[var(--muted-foreground)]">
            {getRatingLabel(rating)}
          </span>
        </div>
      ))}
    </div>
  );
}

function BBIOverviewTable({
  data,
  onSelectBBI,
}: {
  data: MunicipalityBBIAnalyticsData;
  onSelectBBI: (abbreviation: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-3 px-4 font-semibold text-[var(--foreground)] bg-[var(--muted)]/30">
              Barangay
            </th>
            {data.bbis.map((bbi) => (
              <th
                key={bbi.bbi_id}
                className="py-3 px-2 text-center font-semibold text-[var(--foreground)] bg-[var(--muted)]/30 cursor-pointer hover:bg-[var(--muted)]/50 transition-colors min-w-[80px]"
                onClick={() => onSelectBBI(bbi.abbreviation)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm">{bbi.abbreviation}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{bbi.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Click to see detailed breakdown
                    </p>
                  </TooltipContent>
                </Tooltip>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.barangays.map((barangay, index) => (
            <tr
              key={barangay.barangay_id}
              className={cn(
                "border-b border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors",
                index % 2 === 0 ? "bg-[var(--background)]" : "bg-[var(--muted)]/5"
              )}
            >
              <td className="py-2 px-4 font-medium text-[var(--foreground)]">
                {barangay.barangay_name}
              </td>
              {data.bbis.map((bbi) => {
                const status = barangay.bbi_statuses[bbi.abbreviation];
                return (
                  <td key={bbi.bbi_id} className="py-2 px-2 text-center">
                    {status ? (
                      <StatusDot rating={status.rating} />
                    ) : (
                      <span className="text-[var(--muted-foreground)] text-xs">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BBIDetailView({
  bbiName,
  bbiFullName,
  distribution,
  onBack,
}: {
  bbiName: string;
  bbiFullName: string;
  distribution: BBIDistribution;
  onBack: () => void;
}) {
  const chartData = useMemo(() => {
    return [
      {
        name: "Highly Functional",
        value: distribution.highly_functional.length,
        color: RATING_COLORS.HIGHLY_FUNCTIONAL,
      },
      {
        name: "Moderately Functional",
        value: distribution.moderately_functional.length,
        color: RATING_COLORS.MODERATELY_FUNCTIONAL,
      },
      {
        name: "Low Functional",
        value: distribution.low_functional.length,
        color: RATING_COLORS.LOW_FUNCTIONAL,
      },
      {
        name: "Non Functional",
        value: distribution.non_functional.length,
        color: RATING_COLORS.NON_FUNCTIONAL,
      },
    ].filter((item) => item.value > 0);
  }, [distribution]);

  const totalBarangays =
    distribution.highly_functional.length +
    distribution.moderately_functional.length +
    distribution.low_functional.length +
    distribution.non_functional.length;

  // All barangays sorted by status priority then by name
  const allBarangays = useMemo(() => {
    const statusOrder = [
      { items: distribution.highly_functional, rating: "HIGHLY_FUNCTIONAL" },
      { items: distribution.moderately_functional, rating: "MODERATELY_FUNCTIONAL" },
      { items: distribution.low_functional, rating: "LOW_FUNCTIONAL" },
      { items: distribution.non_functional, rating: "NON_FUNCTIONAL" },
    ];

    return statusOrder.flatMap(({ items, rating }) =>
      items.map((item) => ({ ...item, rating }))
    );
  }, [distribution]);

  return (
    <Card className="rounded-sm border-[var(--border)] shadow-sm bg-[var(--card)]">
      <CardHeader className="pb-2 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-[var(--foreground)]">
              {bbiFullName} ({bbiName})
            </CardTitle>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Functionality distribution across {totalBarangays} barangays
            </p>
          </div>
          <button
            onClick={onBack}
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors underline"
          >
            Back to Overview
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Donut Chart */}
          <div className="lg:col-span-5 h-[350px] relative">
            {chartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: "4px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        backgroundColor: "var(--card)",
                      }}
                      formatter={(value: number, name: string) => [
                        `${value} barangay${value !== 1 ? "s" : ""}`,
                        name,
                      ]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center text for donut */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[70%] text-center pointer-events-none">
                  <div className="text-3xl font-bold text-[var(--foreground)]">
                    {totalBarangays}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">Barangays</div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--muted-foreground)]">
                No data available
              </div>
            )}
          </div>

          {/* List of Barangays */}
          <div className="lg:col-span-7 bg-[var(--muted)]/20 rounded-lg p-6 max-h-[400px] overflow-y-auto">
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center justify-between sticky top-0 bg-[var(--muted)]/20 py-2">
              <span>List of Barangays:</span>
              <span className="text-xs font-normal text-[var(--muted-foreground)]">
                Sorted by Status
              </span>
            </h4>

            {allBarangays.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted-foreground)] text-sm">
                No barangay data available
              </div>
            ) : (
              <div className="space-y-2">
                {allBarangays.map((barangay) => (
                  <div
                    key={barangay.barangay_id}
                    className="flex items-center justify-between bg-[var(--card)] px-4 py-3 rounded border border-[var(--border)] shadow-sm"
                  >
                    <span className="font-medium text-[var(--foreground)]">
                      {barangay.barangay_name}
                    </span>
                    <Badge
                      className="rounded-sm font-normal py-1"
                      style={{
                        backgroundColor: getRatingColor(barangay.rating) + "20",
                        color: getRatingColor(barangay.rating),
                        border: `1px solid ${getRatingColor(barangay.rating)}40`,
                      }}
                    >
                      {getRatingLabel(barangay.rating)}
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

function BBIStatusSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-[var(--muted)]/30 rounded w-1/3" />
      <div className="h-4 bg-[var(--muted)]/30 rounded w-2/3" />
      <div className="h-[300px] bg-[var(--muted)]/30 rounded" />
    </div>
  );
}

function EmptyBBIStatus() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 bg-[var(--muted)]/30 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-[var(--muted-foreground)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
        No BBI Data Available
      </h3>
      <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
        BBI compliance data will appear here once assessments have been completed
        and validated for the selected assessment year.
      </p>
    </div>
  );
}

export function BBIStatusTab({
  data,
  isLoading = false,
  municipalityName = "Municipality",
}: BBIStatusTabProps) {
  const [selectedBBI, setSelectedBBI] = useState<string | null>(null);

  if (isLoading) {
    return <BBIStatusSkeleton />;
  }

  if (!data || data.barangays.length === 0) {
    return <EmptyBBIStatus />;
  }

  // Find the selected BBI info
  const selectedBBIInfo = selectedBBI
    ? data.bbis.find((b) => b.abbreviation === selectedBBI)
    : null;

  const selectedDistribution = selectedBBI ? data.bbi_distributions[selectedBBI] : null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-[var(--border)] pb-4">
          <h2 className="text-xl font-bold text-[var(--foreground)]">BBI Status</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Functionality status of the Barangay Based Institutions in the Barangays of{" "}
            {municipalityName}
          </p>
        </div>

        {/* Legend */}
        <BBIStatusLegend />

        {/* Content - either overview table or detail view */}
        {selectedBBI && selectedBBIInfo && selectedDistribution ? (
          <BBIDetailView
            bbiName={selectedBBIInfo.abbreviation}
            bbiFullName={selectedBBIInfo.name}
            distribution={selectedDistribution}
            onBack={() => setSelectedBBI(null)}
          />
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm overflow-hidden">
            <BBIOverviewTable data={data} onSelectBBI={setSelectedBBI} />
          </div>
        )}

        {/* Summary Stats */}
        {!selectedBBI && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-sm p-4 text-center">
              <div className="text-2xl font-bold text-green-700">
                {data.summary.overall_highly_functional}
              </div>
              <div className="text-xs text-green-600">Highly Functional</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">
                {data.summary.overall_moderately_functional}
              </div>
              <div className="text-xs text-emerald-600">Moderately Functional</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">
                {data.summary.overall_low_functional}
              </div>
              <div className="text-xs text-yellow-600">Low Functional</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-center">
              <div className="text-2xl font-bold text-red-700">
                {data.summary.overall_non_functional}
              </div>
              <div className="text-xs text-red-600">Non Functional</div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default BBIStatusTab;
