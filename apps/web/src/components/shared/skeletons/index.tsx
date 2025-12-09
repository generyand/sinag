/**
 * Skeleton Components for Lazy Loading
 *
 * Reusable skeleton/loading states for dynamically imported components.
 * Use these as fallbacks in Suspense boundaries or dynamic imports.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonContainerProps {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

function SkeletonContainer({ className, children, style }: SkeletonContainerProps) {
  return (
    <div className={cn("animate-in fade-in-0 duration-300", className)} style={style}>
      {children}
    </div>
  );
}

/**
 * Skeleton for the RightAssessorPanel (validation sidebar)
 */
export function ValidationPanelSkeleton() {
  return (
    <SkeletonContainer className="h-full p-4 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Status badges */}
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Content sections */}
      <div className="space-y-4 pt-4">
        {/* Validation status section */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Comment section */}
        <div className="space-y-2 pt-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    </SkeletonContainer>
  );
}

/**
 * Skeleton for DynamicIndicatorForm (assessment form)
 */
export function IndicatorFormSkeleton() {
  return (
    <SkeletonContainer className="space-y-6 p-4">
      {/* Form header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      {/* File upload area */}
      <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-6">
        <div className="flex flex-col items-center space-y-2">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Submit button */}
      <Skeleton className="h-10 w-32" />
    </SkeletonContainer>
  );
}

/**
 * Skeleton for chart components (recharts)
 */
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <SkeletonContainer className="w-full" style={{ height }}>
      <div className="flex flex-col h-full">
        {/* Chart title */}
        <Skeleton className="h-6 w-48 mb-4" />

        {/* Chart area */}
        <div className="flex-1 flex items-end gap-2 px-4">
          {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
            <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
          ))}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between px-4 pt-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>
      </div>
    </SkeletonContainer>
  );
}

/**
 * Skeleton for MOV files panel
 */
export function MovFilesPanelSkeleton() {
  return (
    <SkeletonContainer className="space-y-4 p-4">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* File list */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg"
          >
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    </SkeletonContainer>
  );
}

/**
 * Skeleton for dashboard cards
 */
export function DashboardCardSkeleton() {
  return (
    <SkeletonContainer className="p-6 border border-[var(--border)] rounded-lg">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </SkeletonContainer>
  );
}

/**
 * Skeleton for full dashboard page
 */
export function DashboardSkeleton() {
  return (
    <SkeletonContainer className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <DashboardCardSkeleton key={i} />
        ))}
      </div>

      {/* Chart section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-[var(--border)] rounded-lg p-4">
          <ChartSkeleton height={250} />
        </div>
        <div className="border border-[var(--border)] rounded-lg p-4">
          <ChartSkeleton height={250} />
        </div>
      </div>

      {/* Table section */}
      <div className="border border-[var(--border)] rounded-lg p-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </SkeletonContainer>
  );
}

/**
 * Skeleton for table rows
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <SkeletonContainer className="space-y-2">
      {/* Header */}
      <Skeleton className="h-10 w-full" />
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </SkeletonContainer>
  );
}

/**
 * Generic panel skeleton
 */
export function PanelSkeleton({ lines = 5 }: { lines?: number }) {
  return (
    <SkeletonContainer className="space-y-4 p-4">
      <Skeleton className="h-6 w-1/2" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" style={{ width: `${85 + ((i * 13) % 15)}%` }} />
      ))}
    </SkeletonContainer>
  );
}
