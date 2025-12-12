"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrowRight, ChevronRight } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
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

// Total number of barangays in the municipality (Sulop, Davao del Sur)
const TOTAL_BARANGAYS_IN_MUNICIPALITY = 25;

// Rating colors - optimized for distinguishability and semantic meaning
// Uses a traffic light progression: Green → Blue → Yellow/Amber → Red
const RATING_COLORS = {
  HIGHLY_FUNCTIONAL: "#16a34a", // green-600 - clearly positive
  MODERATELY_FUNCTIONAL: "#3b82f6", // blue-500 - distinct from green, still positive
  LOW_FUNCTIONAL: "#f59e0b", // amber-500 - warning/caution
  NON_FUNCTIONAL: "#ef4444", // red-500 - negative/alert
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

// PERFORMANCE: Memoized dark mode compatible summary card
const SummaryCard = memo(function SummaryCard({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: "green" | "blue" | "amber" | "red";
}) {
  const colorClasses = {
    green: {
      bg: "bg-green-500/10 dark:bg-green-500/20",
      border: "border-green-500/20 dark:border-green-500/30",
      text: "text-green-700 dark:text-green-400",
      labelText: "text-green-600 dark:text-green-500",
    },
    blue: {
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      border: "border-blue-500/20 dark:border-blue-500/30",
      text: "text-blue-700 dark:text-blue-400",
      labelText: "text-blue-600 dark:text-blue-500",
    },
    amber: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      border: "border-amber-500/20 dark:border-amber-500/30",
      text: "text-amber-700 dark:text-amber-400",
      labelText: "text-amber-600 dark:text-amber-500",
    },
    red: {
      bg: "bg-red-500/10 dark:bg-red-500/20",
      border: "border-red-500/20 dark:border-red-500/30",
      text: "text-red-700 dark:text-red-400",
      labelText: "text-red-600 dark:text-red-500",
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      className={cn(
        "rounded-lg border p-4 text-center transition-all hover:shadow-md",
        classes.bg,
        classes.border
      )}
    >
      <div className={cn("text-3xl font-bold tabular-nums", classes.text)}>{count}</div>
      <div className={cn("text-xs font-medium mt-1", classes.labelText)}>{label}</div>
    </div>
  );
});

// PERFORMANCE: Memoized StatusDot with native tooltip for fast matrix rendering
const StatusDot = memo(function StatusDot({ rating }: { rating: string }) {
  const color = getRatingColor(rating);
  const label = getRatingLabel(rating);

  // Use native title attribute for instant tooltips (no React overhead)
  return (
    <div
      title={label}
      className={cn(
        "w-5 h-5 rounded-full mx-auto cursor-default transition-transform",
        "hover:scale-125",
        "shadow-sm"
      )}
      style={{ backgroundColor: color }}
    />
  );
});

function BBIStatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm bg-[var(--muted)]/30 rounded-lg px-4 py-3">
      <span className="font-semibold text-[var(--foreground)]">Legend:</span>
      {Object.entries(RATING_COLORS).map(([rating, color]) => (
        <div key={rating} className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: color }} />
          <span className="text-[var(--muted-foreground)]">{getRatingLabel(rating)}</span>
        </div>
      ))}
    </div>
  );
}

// PERFORMANCE: Memoized table component to prevent re-renders
const BBIOverviewTable = memo(function BBIOverviewTable({
  data,
  onSelectBBI,
}: {
  data: MunicipalityBBIAnalyticsData;
  onSelectBBI: (abbreviation: string) => void;
}) {
  return (
    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
      <table className="w-full border-collapse min-w-[600px]">
        <caption className="sr-only">
          BBI Functionality Status Matrix - {data.barangays.length} barangays across{" "}
          {data.bbis.length} institutions
        </caption>
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-3 px-4 font-semibold text-[var(--foreground)] bg-[var(--card)] shadow-sm">
              Barangay
            </th>
            {data.bbis.map((bbi) => (
              <th
                key={bbi.bbi_id}
                role="button"
                tabIndex={0}
                aria-label={`View detailed breakdown for ${bbi.name}`}
                className={cn(
                  "py-3 px-2 text-center font-semibold min-w-[80px]",
                  "bg-[var(--card)] cursor-pointer transition-all shadow-sm",
                  "hover:bg-[var(--muted)]/50 group"
                )}
                onClick={() => onSelectBBI(bbi.abbreviation)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectBBI(bbi.abbreviation);
                  }
                }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--cityscape-yellow)] transition-colors">
                        {bbi.abbreviation}
                      </span>
                      <ArrowRight className="w-3 h-3 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="font-medium">{bbi.name}</p>
                    <p className="text-xs text-muted-foreground">Click to see detailed breakdown</p>
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
              <td className="py-3 px-4 font-medium text-[var(--foreground)]">
                {barangay.barangay_name}
              </td>
              {data.bbis.map((bbi) => {
                const status = barangay.bbi_statuses[bbi.abbreviation];
                return (
                  <td key={bbi.bbi_id} className="py-3 px-2 text-center">
                    {status ? (
                      <StatusDot rating={status.rating} />
                    ) : (
                      <span className="text-[var(--muted-foreground)] text-xs">—</span>
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
});

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

    return statusOrder.flatMap(({ items, rating }) => items.map((item) => ({ ...item, rating })));
  }, [distribution]);

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <button
          onClick={onBack}
          className="hover:text-[var(--foreground)] transition-colors hover:underline"
        >
          BBI Overview
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[var(--foreground)] font-medium">{bbiName}</span>
      </div>

      <Card className="rounded-lg border-[var(--border)] shadow-sm bg-[var(--card)]">
        <CardHeader className="pb-2 border-b border-[var(--border)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl font-bold text-[var(--foreground)]">
                {bbiFullName}
              </CardTitle>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Functionality distribution across {totalBarangays} of{" "}
                {TOTAL_BARANGAYS_IN_MUNICIPALITY} barangays
              </p>
            </div>
            <button
              onClick={onBack}
              className="text-sm px-4 py-2 rounded-lg bg-[var(--muted)]/50 text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors whitespace-nowrap flex-shrink-0"
            >
              ← Back to Overview
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
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          backgroundColor: "var(--card)",
                          color: "var(--foreground)",
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
                    <div className="text-2xl font-bold text-[var(--foreground)]">
                      {totalBarangays}/{TOTAL_BARANGAYS_IN_MUNICIPALITY}
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
              <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center justify-between sticky top-0 bg-[var(--muted)]/20 py-2 backdrop-blur-sm">
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
                      className="flex items-center justify-between bg-[var(--card)] px-4 py-3 rounded-lg border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow"
                    >
                      <span className="font-medium text-[var(--foreground)]">
                        {barangay.barangay_name}
                      </span>
                      <Badge
                        className="rounded-md font-normal py-1"
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
    </div>
  );
}

function BBIStatusSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-4">
        <div className="h-8 bg-[var(--muted)]/30 rounded w-1/4 mb-2" />
        <div className="h-4 bg-[var(--muted)]/30 rounded w-2/3" />
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-[var(--muted)]/30 rounded-lg" />
        ))}
      </div>
      {/* Legend */}
      <div className="h-12 bg-[var(--muted)]/30 rounded-lg" />
      {/* Table */}
      <div className="h-[300px] bg-[var(--muted)]/30 rounded-lg" />
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
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No BBI Data Available</h3>
      <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
        BBI compliance data will appear here once assessments have been completed and validated for
        the selected assessment year.
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
        {/* 1. Header */}
        <header className="border-b border-[var(--border)] pb-4">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">BBI Status</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Functionality status of the Barangay Based Institutions in the Barangays of{" "}
            {municipalityName}
          </p>
        </header>

        {/* 2. Summary Statistics - ABOVE table for better information scent */}
        {!selectedBBI && (
          <section aria-label="Summary statistics">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard
                count={data.summary.overall_highly_functional}
                label="Highly Functional"
                color="green"
              />
              <SummaryCard
                count={data.summary.overall_moderately_functional}
                label="Moderately Functional"
                color="blue"
              />
              <SummaryCard
                count={data.summary.overall_low_functional}
                label="Low Functional"
                color="amber"
              />
              <SummaryCard
                count={data.summary.overall_non_functional}
                label="Non Functional"
                color="red"
              />
            </div>
          </section>
        )}

        {/* 3. Legend */}
        <BBIStatusLegend />

        {/* 4. Main Content - Matrix Table or Detail View */}
        <section aria-label={selectedBBI ? "BBI detail view" : "BBI overview matrix"}>
          {selectedBBI && selectedBBIInfo && selectedDistribution ? (
            <BBIDetailView
              bbiName={selectedBBIInfo.abbreviation}
              bbiFullName={selectedBBIInfo.name}
              distribution={selectedDistribution}
              onBack={() => setSelectedBBI(null)}
            />
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
              <BBIOverviewTable data={data} onSelectBBI={setSelectedBBI} />
            </div>
          )}
        </section>

        {/* 5. Screen reader feedback */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {selectedBBI
            ? `Viewing detailed breakdown for ${selectedBBIInfo?.name}`
            : "Viewing BBI overview matrix"}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default BBIStatusTab;
