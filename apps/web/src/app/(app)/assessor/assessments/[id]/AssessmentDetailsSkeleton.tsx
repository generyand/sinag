import { PageHeader } from "@/components/shared";

export function AssessmentDetailsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Loading Assessment..."
        description="Please wait while we load the assessment details"
      />

      {/* Assessment Overview Skeleton */}
      <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 w-48 animate-pulse rounded bg-[var(--border)]"></div>
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-[var(--border)]"></div>
          </div>
          <div className="h-8 w-32 animate-pulse rounded bg-[var(--border)]"></div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg bg-[var(--hover)] p-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 animate-pulse rounded bg-[var(--border)]"></div>
                <div className="h-4 w-24 animate-pulse rounded bg-[var(--border)]"></div>
              </div>
              <div className="mt-1 h-8 w-12 animate-pulse rounded bg-[var(--border)]"></div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-48 animate-pulse rounded bg-[var(--border)]"></div>
          ))}
        </div>
      </div>

      {/* Assessment Responses Skeleton */}
      <div className="space-y-6">
        <div className="h-6 w-48 animate-pulse rounded bg-[var(--border)]"></div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="h-6 w-64 animate-pulse rounded bg-[var(--border)]"></div>
                <div className="h-6 w-20 animate-pulse rounded bg-[var(--border)]"></div>
              </div>
              <div className="mt-4 h-4 w-full animate-pulse rounded bg-[var(--border)]"></div>
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-[var(--border)]"></div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-[var(--border)]"></div>
                  <div className="h-20 w-full animate-pulse rounded bg-[var(--border)]"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-[var(--border)]"></div>
                  <div className="h-20 w-full animate-pulse rounded bg-[var(--border)]"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
