/**
 * ReworkLoadingState Component
 *
 * Loading skeleton displayed while AI generates the rework summary.
 * Provides visual feedback that the system is processing assessor feedback.
 */

import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function ReworkLoadingState() {
  return (
    <div className="space-y-6">
      {/* Loading header */}
      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-sm">
        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">
            Generating AI-powered summary...
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Analyzing assessor feedback and annotations. This usually takes 5-10 seconds.
          </p>
        </div>
      </div>

      {/* Overall summary skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>

      {/* Priority actions skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <div className="space-y-2 pl-4">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>

      {/* Indicator summaries skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-48" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-sm space-y-3">
            <Skeleton className="h-5 w-64" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
