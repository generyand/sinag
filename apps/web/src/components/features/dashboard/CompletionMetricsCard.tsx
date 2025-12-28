/**
 * Completion Metrics Card Component
 *
 * Displays assessment completion metrics for BLGU users.
 * Shows ONLY completion status (complete/incomplete), never compliance status.
 *
 * Props:
 * - totalIndicators: Total number of indicators in the assessment
 * - completedIndicators: Number of indicators with all required fields filled
 * - incompleteIndicators: Number of indicators with missing required fields
 * - completionPercentage: Completion percentage (0-100)
 */

interface CompletionMetricsCardProps {
  totalIndicators: number;
  completedIndicators: number;
  incompleteIndicators: number;
  completionPercentage: number;
}

export function CompletionMetricsCard({
  totalIndicators,
  completedIndicators,
  incompleteIndicators,
  completionPercentage,
}: CompletionMetricsCardProps) {
  return (
    <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Completion Progress</h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Track your assessment completion status
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Overall Completion</span>
          <span className="text-2xl font-bold text-[var(--cityscape-yellow)]">
            {completionPercentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
            role="progressbar"
            aria-valuenow={completionPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Indicators */}
        <div className="bg-[var(--hover)] rounded-lg p-4 border border-[var(--border)]">
          <div className="flex flex-col items-center text-center">
            <div className="text-3xl font-bold text-[var(--foreground)] mb-1">
              {totalIndicators}
            </div>
            <div className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide">
              Total Indicators
            </div>
          </div>
        </div>

        {/* Completed Indicators */}
        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex flex-col items-center text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
              {completedIndicators}
            </div>
            <div className="text-sm font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
              Completed
            </div>
          </div>
        </div>

        {/* Incomplete Indicators */}
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <div className="flex flex-col items-center text-center">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">
              {incompleteIndicators}
            </div>
            <div className="text-sm font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide">
              Incomplete
            </div>
          </div>
        </div>
      </div>

      {/* Completion Message */}
      {completionPercentage === 100 ? (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm font-medium text-green-700 dark:text-green-300 text-center">
            ✓ All indicators completed! You may submit your assessment for review.
          </p>
        </div>
      ) : (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300 text-center">
            {incompleteIndicators} indicator{incompleteIndicators !== 1 ? "s" : ""} remaining to
            complete your assessment
          </p>
        </div>
      )}
    </div>
  );
}
