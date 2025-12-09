"use client";

import { useState } from "react";
import type { IndicatorResponse } from "@sinag/shared";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { useRouter } from "next/navigation";

interface IndicatorListProps {
  indicators: IndicatorResponse[];
  onCreateNew?: () => void;
  isLoading?: boolean;
}

export default function IndicatorList({
  indicators,
  onCreateNew,
  isLoading = false,
}: IndicatorListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Get unique governance areas for filter
  const governanceAreas = Array.from(
    new Map(
      indicators
        .filter((i) => i.governance_area)
        .map((i) => [i.governance_area!.id, i.governance_area!])
    ).values()
  );

  // Filter indicators
  const filteredIndicators = indicators.filter((indicator) => {
    const matchesSearch = indicator.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArea =
      filterArea === "all" || indicator.governance_area_id.toString() === filterArea;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" ? indicator.is_active : !indicator.is_active);

    return matchesSearch && matchesArea && matchesStatus;
  });

  const handleIndicatorClick = (indicatorId: number) => {
    router.push(`/mlgoo/indicators/${indicatorId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Filters Skeleton */}
        <div className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-6 animate-pulse">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
            <div className="flex-1 space-y-4">
              {/* Search skeleton */}
              <div>
                <div className="h-4 bg-[var(--muted)]/50 rounded w-32 mb-2"></div>
                <div className="h-9 bg-[var(--muted)]/50 rounded"></div>
              </div>
              {/* Filters skeleton */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="h-4 bg-[var(--muted)]/50 rounded w-28 mb-2"></div>
                  <div className="h-9 bg-[var(--muted)]/50 rounded"></div>
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-[var(--muted)]/50 rounded w-16 mb-2"></div>
                  <div className="h-9 bg-[var(--muted)]/50 rounded"></div>
                </div>
              </div>
            </div>
            {/* Button skeleton */}
            <div className="lg:mb-0">
              <div className="h-11 bg-[var(--muted)]/50 rounded w-48"></div>
            </div>
          </div>
          {/* Results count skeleton */}
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <div className="h-4 bg-[var(--muted)]/50 rounded w-48"></div>
          </div>
        </div>

        {/* Indicator Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[var(--card)] border-2 border-[var(--border)] rounded-sm p-6 animate-pulse"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex-1 space-y-4">
                  {/* Title skeleton */}
                  <div>
                    <div className="h-6 bg-[var(--muted)]/50 rounded w-2/3 mb-2"></div>
                    <div className="h-4 bg-[var(--muted)]/50 rounded w-full"></div>
                    <div className="h-4 bg-[var(--muted)]/50 rounded w-4/5 mt-1"></div>
                  </div>
                  {/* Badges skeleton */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="h-7 bg-[var(--muted)]/50 rounded w-24"></div>
                    <div className="h-7 bg-[var(--muted)]/50 rounded w-16"></div>
                    <div className="h-7 bg-[var(--muted)]/50 rounded w-20"></div>
                  </div>
                </div>
                {/* Timestamps skeleton */}
                <div className="flex lg:flex-col gap-4 lg:gap-2">
                  <div className="bg-[var(--muted)]/30 px-3 py-2 rounded-sm border border-[var(--border)] w-32 h-16"></div>
                  <div className="bg-[var(--muted)]/30 px-3 py-2 rounded-sm border border-[var(--border)] w-32 h-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Filters Section with Card */}
      <div className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
          <div className="flex-1 space-y-4">
            {/* Search */}
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">
                Search Indicators
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input
                  type="text"
                  placeholder="Search by indicator name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Governance Area Filter */}
              <div className="flex-1">
                <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">
                  Governance Area
                </label>
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Areas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {governanceAreas.map((area) => (
                      <SelectItem key={area.id} value={area.id.toString()}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="flex-1">
                <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">
                  Status
                </label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">
              Showing{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {filteredIndicators.length}
              </span>{" "}
              of <span className="font-semibold text-[var(--foreground)]">{indicators.length}</span>{" "}
              indicators
            </span>
            {(searchQuery || filterArea !== "all" || filterStatus !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterArea("all");
                  setFilterStatus("all");
                }}
                className="text-[var(--cityscape-yellow)] hover:text-[var(--cityscape-yellow-dark)] font-medium transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Indicator Cards */}
      {filteredIndicators.length === 0 ? (
        <div className="text-center py-16 bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm">
          <div className="w-16 h-16 bg-[var(--muted)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-[var(--muted-foreground)]" />
          </div>
          <p className="text-lg font-medium text-[var(--foreground)] mb-1">
            {searchQuery || filterArea !== "all" || filterStatus !== "all"
              ? "No indicators match your filters"
              : "No indicators found"}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Try adjusting your search criteria or create a new indicator
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredIndicators.map((indicator) => (
            <div
              key={indicator.id}
              className="group bg-[var(--card)] border-2 border-[var(--border)] rounded-sm p-6 hover:border-[var(--cityscape-yellow)] hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden"
              onClick={() => handleIndicatorClick(indicator.id)}
            >
              {/* Hover gradient effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--cityscape-yellow)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="relative z-10">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  {/* Indicator Info */}
                  <div className="flex-1 space-y-4">
                    {/* Title and Description */}
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-[var(--foreground)] group-hover:text-[var(--cityscape-yellow)] transition-colors">
                          {indicator.name}
                        </h3>
                      </div>
                      {indicator.description && (
                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                          {indicator.description}
                        </p>
                      )}
                    </div>

                    {/* Metadata row with enhanced badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Governance Area */}
                      {indicator.governance_area && (
                        <Badge
                          variant="outline"
                          className="px-3 py-1.5 rounded-sm font-medium text-xs"
                          style={{
                            backgroundColor: "var(--kpi-blue-from)",
                            color: "var(--kpi-blue-text)",
                            borderColor: "var(--kpi-blue-border, var(--border))",
                          }}
                        >
                          {indicator.governance_area.name}
                        </Badge>
                      )}

                      {/* Version */}
                      <Badge
                        variant="outline"
                        className="px-3 py-1.5 rounded-sm font-medium text-xs"
                        style={{
                          backgroundColor: "var(--analytics-info-bg)",
                          color: "var(--analytics-info-text)",
                          borderColor: "var(--analytics-info-border)",
                        }}
                      >
                        v{indicator.version}
                      </Badge>

                      {/* Status */}
                      <Badge
                        variant="outline"
                        className="px-3 py-1.5 rounded-sm font-medium text-xs"
                        style={{
                          backgroundColor: indicator.is_active
                            ? "var(--analytics-success-bg)"
                            : "var(--analytics-neutral-bg)",
                          color: indicator.is_active
                            ? "var(--analytics-success-text)"
                            : "var(--analytics-neutral-text)",
                          borderColor: indicator.is_active
                            ? "var(--analytics-success-border)"
                            : "var(--analytics-neutral-border)",
                        }}
                      >
                        {indicator.is_active ? "● Active" : "○ Inactive"}
                      </Badge>

                      {/* Auto-calculable */}
                      {indicator.is_auto_calculable && (
                        <Badge
                          variant="outline"
                          className="px-3 py-1.5 rounded-sm font-medium text-xs"
                          style={{
                            backgroundColor: "var(--kpi-purple-from)",
                            color: "var(--kpi-purple-text)",
                            borderColor: "var(--kpi-purple-border, var(--border))",
                          }}
                        >
                          ⚡ Auto-calculable
                        </Badge>
                      )}

                      {/* Profiling Only */}
                      {indicator.is_profiling_only && (
                        <Badge
                          variant="outline"
                          className="px-3 py-1.5 rounded-sm font-medium text-xs"
                          style={{
                            backgroundColor: "var(--analytics-warning-bg)",
                            color: "var(--analytics-warning-text)",
                            borderColor: "var(--analytics-warning-border)",
                          }}
                        >
                          📊 Profiling Only
                        </Badge>
                      )}

                      {/* Parent indicator */}
                      {indicator.parent && (
                        <Badge
                          variant="outline"
                          className="px-3 py-1.5 rounded-sm font-medium text-xs bg-[var(--muted)]/20"
                        >
                          ↳ Child of: {indicator.parent.name}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Timestamps with enhanced styling */}
                  <div className="flex lg:flex-col gap-4 lg:gap-2 text-xs lg:text-right relative z-20">
                    <div className="bg-[var(--muted)]/10 px-3 py-2 rounded-sm border border-[var(--border)]">
                      <span className="text-[var(--text-secondary)] block mb-0.5">Created</span>
                      <span className="font-semibold text-[var(--foreground)] block">
                        {new Date(indicator.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="bg-[var(--muted)]/10 px-3 py-2 rounded-sm border border-[var(--border)]">
                      <span className="text-[var(--text-secondary)] block mb-0.5">Updated</span>
                      <span className="font-semibold text-[var(--foreground)] block">
                        {new Date(indicator.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
