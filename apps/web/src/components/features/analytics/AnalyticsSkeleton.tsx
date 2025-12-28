"use client";

import { PageHeader } from "@/components/shared";

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <PageHeader title="Loading Analytics..." description="Preparing your assessment data" />

      {/* Skeleton Global Filter */}
      <div className="bg-[var(--card)] rounded-sm border border-[var(--border)] p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-[var(--border)] rounded w-32 animate-pulse"></div>
            <div className="h-8 bg-[var(--border)] rounded w-48 animate-pulse"></div>
          </div>
          <div className="h-12 bg-[var(--border)] rounded w-40 animate-pulse"></div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Skeleton Performance Overview */}
        <div className="bg-[var(--card)] rounded-sm border border-[var(--border)] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 bg-[var(--border)] rounded w-64 animate-pulse"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[var(--border)] rounded-full"></div>
              <div className="h-4 bg-[var(--border)] rounded w-16 animate-pulse"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-56 h-56 bg-[var(--border)] rounded-full animate-pulse mb-6"></div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[var(--border)] rounded-full"></div>
                  <div className="h-4 bg-[var(--border)] rounded w-20 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[var(--border)] rounded-full"></div>
                  <div className="h-4 bg-[var(--border)] rounded w-20 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[var(--hover)] rounded-sm p-4">
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-[var(--border)] rounded w-32 animate-pulse"></div>
                    <div className="h-6 bg-[var(--border)] rounded w-12 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skeleton Performance Hotspots */}
        <div className="bg-[var(--card)] rounded-sm border border-[var(--border)] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 bg-[var(--border)] rounded w-80 animate-pulse"></div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[var(--border)] rounded"></div>
              <div className="h-4 bg-[var(--border)] rounded w-24 animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-[var(--hover)] rounded-sm p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-[var(--border)] rounded-full"></div>
                      <div className="h-4 bg-[var(--border)] rounded w-16 animate-pulse"></div>
                    </div>
                    <div className="h-5 bg-[var(--border)] rounded w-64 animate-pulse"></div>
                    <div className="h-4 bg-[var(--border)] rounded w-48 animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <div className="flex justify-between mb-1">
                        <div className="h-3 bg-[var(--border)] rounded w-8 animate-pulse"></div>
                        <div className="h-3 bg-[var(--border)] rounded w-8 animate-pulse"></div>
                      </div>
                      <div className="w-full bg-[var(--border)] rounded-full h-2.5"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-6 bg-[var(--border)] rounded w-8 animate-pulse"></div>
                      <div className="h-3 bg-[var(--border)] rounded w-12 animate-pulse mt-1"></div>
                    </div>
                    <div className="w-5 h-5 bg-[var(--border)] rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton Workflow Metrics */}
        <div className="bg-[var(--card)] rounded-sm border border-[var(--border)] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 bg-[var(--border)] rounded w-64 animate-pulse"></div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[var(--border)] rounded"></div>
              <div className="h-4 bg-[var(--border)] rounded w-32 animate-pulse"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2].map((section) => (
              <div key={section}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-[var(--border)] rounded-full"></div>
                  <div className="h-5 bg-[var(--border)] rounded w-32 animate-pulse"></div>
                </div>
                <div className="space-y-4">
                  {[1, 2].map((item) => (
                    <div key={item} className="bg-[var(--hover)] rounded-sm p-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="h-4 bg-[var(--border)] rounded w-32 animate-pulse"></div>
                          <div className="h-3 bg-[var(--border)] rounded w-24 animate-pulse"></div>
                        </div>
                        <div className="text-right">
                          <div className="h-6 bg-[var(--border)] rounded w-12 animate-pulse"></div>
                          <div className="h-3 bg-[var(--border)] rounded w-8 animate-pulse mt-1"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
