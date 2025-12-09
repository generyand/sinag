import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-10">
          {/* Enhanced Header Section Skeleton */}
          <div className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-8">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100/20 dark:bg-blue-900/20 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-100/20 dark:bg-purple-900/20 rounded-full translate-y-16 -translate-x-16"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-4">
                  <Skeleton className="h-9 w-96" />
                  <div className="flex items-center gap-8">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-8 w-48" />
                  </div>
                </div>

                {/* Enhanced Quick Stats Skeleton */}
                <div className="flex items-center gap-8">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]"
                    >
                      <Skeleton className="h-8 w-16 mx-auto mb-1" />
                      <Skeleton className="h-3 w-20 mx-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card
                key={i}
                className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-48" />
                    <div className="space-y-2">
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content Grid Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            {/* Left Column - Municipal Progress (2/3 width) */}
            <div className="xl:col-span-2">
              <Card className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
                <CardHeader>
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="h-4 w-80" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-4 w-8" />
                          </div>
                          <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Quick Stats (1/3 width) */}
            <div className="space-y-8">
              {/* System Status Card Skeleton */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-[var(--hover)] rounded-sm"
                    >
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions Card Skeleton */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-sm bg-[var(--hover)] border border-[var(--border)]"
                    >
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Actionable Intelligence Sections Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {/* Assessor Queue Skeleton */}
            <Card className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-60" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="rounded-md border border-[var(--border)]">
                    <div className="p-6">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 py-3">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-4 w-8" />
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Failed Indicators Skeleton */}
            <Card className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-6 w-56" />
                    <Skeleton className="h-4 w-72" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-5 rounded-lg border border-[var(--border)]">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-4 w-12" />
                          </div>
                          <Skeleton className="h-4 w-48" />
                        </div>
                        <div className="text-right ml-4">
                          <Skeleton className="h-6 w-8" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-8" />
                        </div>
                        <Skeleton className="h-2 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
