"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, AlertOctagon, CheckCircle2, CircleDashed, Loader2, Send } from "lucide-react";

interface StatusData {
  status: string;
  count: number;
  percentage: number;
  color: string;
  bgColor: string;
}

interface MunicipalProgressChartProps {
  data: StatusData[];
  totalBarangays: number;
}

const statusConfig = {
  Validated: {
    color: "var(--analytics-success-text)",
    bgColor: "var(--analytics-success-bg)",
    icon: CheckCircle2,
  },
  "Submitted for Review": {
    color: "var(--kpi-blue-text)",
    bgColor: "var(--kpi-blue-from)",
    icon: Send,
  },
  "In Rework": {
    color: "var(--analytics-warning-text)",
    bgColor: "var(--analytics-warning-bg)",
    icon: AlertOctagon,
  },
  "In Progress": {
    color: "var(--kpi-purple-text)",
    bgColor: "var(--kpi-purple-from)",
    icon: Loader2,
  },
  "Not Started": {
    color: "var(--analytics-neutral-text)",
    bgColor: "var(--analytics-neutral-bg)",
    icon: CircleDashed,
  },
};

export function MunicipalProgressChart({ data, totalBarangays }: MunicipalProgressChartProps) {
  return (
    <Card className="bg-[var(--card)] border border-[var(--border)] shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-[var(--foreground)]">
              Live Status of All Barangays
            </CardTitle>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Distribution of {totalBarangays} barangays across assessment stages
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-[var(--muted)]/50 px-3 py-1.5 rounded-full border border-[var(--border)] self-start sm:self-auto">
            <div className="w-2 h-2 rounded-full animate-pulse bg-green-500"></div>
            <span className="font-medium text-[var(--muted-foreground)]">Live Updates</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item) => {
            const config = statusConfig[item.status as keyof typeof statusConfig] || {
              color: "var(--analytics-neutral-text)",
              bgColor: "var(--analytics-neutral-bg)",
              icon: AlertCircle,
            };
            const Icon = config.icon;

            return (
              <div
                key={item.status}
                className="group relative bg-[var(--background)] hover:bg-[var(--accent)]/5 rounded-lg border border-[var(--border)] p-4 transition-all duration-200"
              >
                {/* Header Row: Status Badge + Count */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3">
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-opacity-10"
                      style={{
                        backgroundColor: config.bgColor,
                        borderColor: config.bgColor,
                        color: config.color,
                      }}
                    >
                      <Icon className="w-3.5 h-3.5 mr-1.5" />
                      {item.status}
                    </Badge>

                    {/* Mobile Only Count */}
                    <span className="sm:hidden text-sm font-medium text-[var(--foreground)]">
                      {item.count}{" "}
                      <span className="text-[var(--muted-foreground)] text-xs font-normal">
                        brgys
                      </span>
                    </span>
                  </div>

                  {/* Desktop Stats */}
                  <div className="hidden sm:flex items-center gap-4 text-sm">
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-[var(--foreground)]">{item.count}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">
                        Barangays
                      </span>
                    </div>
                    <div className="h-8 w-px bg-[var(--border)] mx-1"></div>
                    <div className="flex flex-col items-end w-12">
                      <span className="font-bold text-[var(--foreground)]">{item.percentage}%</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:hidden">
                    <span className="text-[var(--muted-foreground)]">Completion</span>
                    <span className="font-medium text-[var(--foreground)]">{item.percentage}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-[var(--muted)]/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                      style={{
                        backgroundColor: config.color, // Using the stronger text color for the bar
                        width: `${item.percentage}%`,
                      }}
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:animate-shimmer" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--border)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
            <span>Total mapped: {totalBarangays} locations</span>
            <span className="flex items-center">Running on Sinag Analytics</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
