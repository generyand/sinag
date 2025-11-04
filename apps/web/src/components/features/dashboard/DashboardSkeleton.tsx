import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Enhanced Header Section Skeleton */}
          <div className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-8">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--cityscape-yellow)]/5 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[var(--cityscape-yellow)]/3 rounded-full translate-y-16 -translate-x-16"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-2 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-sm" />
                    <Skeleton className="h-9 w-96" />
                  </div>
                  <div className="flex items-center gap-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-8 w-48" />
                  </div>
                </div>
                
                {/* Enhanced Quick Stats Skeleton */}
                <div className="flex items-center gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]">
                      <Skeleton className="h-8 w-16 mx-auto mb-1" />
                      <Skeleton className="h-3 w-20 mx-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid with enhanced layout */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Left Column - Status and Feedback (3/4 width) */}
            <div className="xl:col-span-3 space-y-8">
              {/* Primary Status Card Skeleton */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-sm" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-80" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>

              {/* Action Required: Rework Section Skeleton */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="w-1 h-6 bg-gradient-to-b from-orange-500 to-red-600 rounded-sm" />
                  <Skeleton className="h-6 w-48" />
                </div>
                <Skeleton className="h-4 w-80 mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-[var(--hover)] rounded-sm p-4 border border-[var(--border)]">
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-center">
                    <Skeleton className="h-10 w-48" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Enhanced Sidebar (1/4 width) */}
            <div className="space-y-6">
              {/* Quick Actions Card Skeleton */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-sm" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-sm bg-[var(--hover)] border border-[var(--border)]">
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Assessment Summary Skeleton */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-600 rounded-sm" />
                  <Skeleton className="h-6 w-40" />
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-[var(--hover)] rounded-sm border border-[var(--border)]">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-8" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity Card Skeleton */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-sm" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="w-2 h-2 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-12 ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Governance Areas Grid Skeleton - Full Width */}
          <div className="mt-12">
            <div className="text-center mb-6">
              <Skeleton className="h-6 w-48 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Skeleton className="w-12 h-12 rounded-sm" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}