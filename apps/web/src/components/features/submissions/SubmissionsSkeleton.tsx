import { Skeleton } from "@/components/ui/skeleton";
import { Filter, Search } from "lucide-react";

export function SubmissionsSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>

          {/* Filters & Search Skeleton */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <Skeleton className="h-6 w-32" />
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Search Section Skeleton */}
              <div className="flex-1 max-w-md">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-[var(--muted-foreground)]" />
                    </div>
                    <Skeleton className="h-10 w-full pl-10" />
                  </div>
                </div>
              </div>

              {/* Filters Section Skeleton */}
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary Skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
          </div>

          {/* Table Skeleton */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--hover)] border-b border-[var(--border)]">
                  <tr>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <th key={i} className="px-6 py-4 text-left">
                        <Skeleton className="h-4 w-24" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {Array.from({ length: 6 }).map((_, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-[var(--hover)] transition-colors">
                      {/* Barangay Name */}
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-40" />
                      </td>

                      {/* Overall Progress */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-[var(--border)] rounded-sm h-3 min-w-[100px]">
                            <Skeleton className="h-3 w-3/4 rounded-sm" />
                          </div>
                          <Skeleton className="h-4 w-8" />
                        </div>
                      </td>

                      {/* Current Status */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-3" />
                          <Skeleton className="h-5 w-24" />
                        </div>
                      </td>

                      {/* Assigned Assessors */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <Skeleton key={i} className="w-8 h-8 rounded-full" />
                          ))}
                        </div>
                      </td>

                      {/* Last Updated */}
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-20" />
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-16 rounded-sm" />
                          <Skeleton className="h-8 w-20 rounded-sm" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
