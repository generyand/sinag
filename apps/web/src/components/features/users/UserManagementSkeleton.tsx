import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, Building, Search } from "lucide-react";

export function UserManagementSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Enhanced Stats and Actions Header */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* User Statistics Cards */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Users Card */}
              <div className="bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-sm flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Active Users Card */}
              <div className="bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-sm flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              {/* BLGU Users Card */}
              <div className="bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-sm flex items-center justify-center">
                    <Building className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Add User Button */}
            <div className="flex items-center justify-center lg:justify-end">
              <Skeleton className="h-14 w-40 rounded-sm" />
            </div>
          </div>

          {/* Enhanced User Table with Search and Pagination */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <Skeleton className="h-6 w-32 mb-1" />
                  <Skeleton className="h-4 w-64" />
                </div>

                {/* Search Bar */}
                <div className="relative w-full lg:w-80">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-[var(--muted-foreground)]" />
                  </div>
                  <Skeleton className="h-10 w-full pl-10" />
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4 mb-4 pb-2 border-b border-[var(--border)]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-20" />
                ))}
              </div>

              {/* Table Rows */}
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid grid-cols-6 gap-4 py-3 border-b border-[var(--border)] last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-16 rounded-sm" />
                    <Skeleton className="h-8 w-16 rounded-sm" />
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              <div className="mt-8 flex items-center justify-between">
                <Skeleton className="h-4 w-48" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-20 rounded-sm" />
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="w-10 h-10 rounded-sm" />
                    ))}
                  </div>
                  <Skeleton className="h-10 w-20 rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
