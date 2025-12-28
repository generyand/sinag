"use client";

/**
 * WithLoading - Standardized loading state wrapper
 *
 * Provides a consistent way to handle loading, error, and empty states
 * across the application.
 *
 * @example
 * ```tsx
 * <WithLoading
 *   data={dashboardData}
 *   isLoading={isLoading}
 *   error={error}
 *   skeleton={<DashboardSkeleton />}
 * >
 *   {(data) => <DashboardContent data={data} />}
 * </WithLoading>
 * ```
 */

import { ReactNode } from "react";
import { AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WithLoadingProps<T> {
  /** The data to render when loaded */
  data: T | undefined | null;
  /** Loading state flag */
  isLoading: boolean;
  /** Error object if an error occurred */
  error?: Error | null;
  /** Skeleton component to show while loading */
  skeleton?: ReactNode;
  /** Custom empty state component */
  emptyState?: ReactNode;
  /** Message to show when data is empty */
  emptyMessage?: string;
  /** Function to retry the data fetch */
  onRetry?: () => void;
  /** Render function that receives the data */
  children: (data: T) => ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Minimum height for the loading container */
  minHeight?: string;
}

/**
 * Default empty state component
 */
function DefaultEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Default error state component
 */
function DefaultErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="mb-2 font-semibold text-destructive">Failed to load data</h3>
      <p className="mb-4 max-w-md text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Default loading skeleton (simple pulse animation)
 */
function DefaultSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="h-32 w-full rounded bg-muted" />
    </div>
  );
}

export function WithLoading<T>({
  data,
  isLoading,
  error,
  skeleton,
  emptyState,
  emptyMessage = "No data available",
  onRetry,
  children,
  className,
  minHeight = "min-h-[200px]",
}: WithLoadingProps<T>) {
  // Loading state
  if (isLoading) {
    return (
      <div className={cn(minHeight, "flex items-center justify-center", className)}>
        {skeleton || <DefaultSkeleton />}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn(minHeight, className)}>
        <DefaultErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  // Empty state
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className={cn(minHeight, className)}>
        {emptyState || <DefaultEmptyState message={emptyMessage} />}
      </div>
    );
  }

  // Render children with data
  return <>{children(data)}</>;
}

/**
 * Hook-friendly version that accepts React Query result directly
 *
 * @example
 * ```tsx
 * const query = useGetDashboard();
 *
 * <QueryWrapper
 *   query={query}
 *   skeleton={<DashboardSkeleton />}
 * >
 *   {(data) => <Dashboard data={data} />}
 * </QueryWrapper>
 * ```
 */
interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch?: () => void;
}

interface QueryWrapperProps<T> {
  query: QueryResult<T>;
  skeleton?: ReactNode;
  emptyState?: ReactNode;
  emptyMessage?: string;
  children: (data: T) => ReactNode;
  className?: string;
  minHeight?: string;
}

export function QueryWrapper<T>({
  query,
  skeleton,
  emptyState,
  emptyMessage,
  children,
  className,
  minHeight,
}: QueryWrapperProps<T>) {
  return (
    <WithLoading
      data={query.data}
      isLoading={query.isLoading}
      error={query.error}
      skeleton={skeleton}
      emptyState={emptyState}
      emptyMessage={emptyMessage}
      onRetry={query.refetch}
      className={className}
      minHeight={minHeight}
    >
      {children}
    </WithLoading>
  );
}
