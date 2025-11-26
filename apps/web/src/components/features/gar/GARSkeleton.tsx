'use client';

export function GARSkeleton() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-gray-300 to-gray-200 px-6 py-4 text-center">
        <div className="h-6 bg-gray-400/50 rounded w-48 mx-auto mb-2"></div>
        <div className="h-5 bg-gray-400/50 rounded w-64 mx-auto mb-2"></div>
        <div className="h-4 bg-gray-400/50 rounded w-56 mx-auto"></div>
      </div>

      {/* Area Header Skeleton */}
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 border-b border-[var(--border)]">
        <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-80"></div>
      </div>

      {/* Table Header Skeleton */}
      <div className="flex border-b border-[var(--border)] bg-gray-50 dark:bg-gray-800/50">
        <div className="flex-1 px-4 py-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
        </div>
        <div className="w-32 px-4 py-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16 mx-auto"></div>
        </div>
      </div>

      {/* Row Skeletons */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className="flex border-b border-[var(--border)]">
          <div className="flex-1 px-4 py-2">
            <div
              className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
              style={{ width: `${60 + Math.random() * 30}%` }}
            ></div>
          </div>
          <div className="w-32 px-4 py-2">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      ))}

      {/* Overall Result Skeleton */}
      <div className="flex bg-gray-100 dark:bg-gray-800 border-t-2 border-gray-300">
        <div className="flex-1 px-4 py-3">
          <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
        </div>
        <div className="w-32 px-4 py-3">
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      </div>
    </div>
  );
}
