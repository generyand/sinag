import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Plus } from "lucide-react";

export function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Assessment Periods Card */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-white" />
                  <Skeleton className="h-10 w-48 rounded-sm" />
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[var(--hover)] border-b border-[var(--border)]">
                    <tr>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <th key={i} className="px-6 py-4 text-left">
                          <Skeleton className="h-4 w-24" />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {Array.from({ length: 3 }).map((_, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-[var(--hover)] transition-colors">
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-6 w-20 rounded-sm" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-8 w-8 rounded-sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Active Period Deadlines Card */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-sm flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <Skeleton className="h-6 w-64" />
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* BLGU Submission Deadline */}
                <div className="space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-[var(--muted-foreground)]" />
                    </div>
                    <Skeleton className="h-12 w-full pl-10" />
                  </div>
                </div>

                {/* Rework Completion Deadline */}
                <div className="space-y-3">
                  <Skeleton className="h-4 w-44" />
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-[var(--muted-foreground)]" />
                    </div>
                    <Skeleton className="h-12 w-full pl-10" />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-12 w-32 rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
