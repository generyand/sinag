'use client';

interface ReworkStats {
  totalAssessments: number;
  assessmentsWithRework: number;
  reworkRate: number;
  assessmentsWithCalibration: number;
  calibrationRate: number;
}

interface ReworkStatsCardProps {
  data: ReworkStats;
}

export function ReworkStatsCard({ data }: ReworkStatsCardProps) {
  const cleanSubmissions = data.totalAssessments - data.assessmentsWithRework - data.assessmentsWithCalibration;
  const cleanRate = data.totalAssessments > 0
    ? ((cleanSubmissions / data.totalAssessments) * 100).toFixed(1)
    : '0';

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Submission Quality
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Rework and calibration usage rates
        </p>
      </div>

      <div className="space-y-4">
        {/* Clean submissions */}
        <div className="p-4 rounded-sm bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Clean Submissions
            </span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-500">
              {cleanRate}%
            </span>
          </div>
          <p className="text-xs text-green-600 dark:text-green-500">
            {cleanSubmissions} of {data.totalAssessments} submitted without needing revision
          </p>
        </div>

        {/* Rework rate */}
        <div className="p-4 rounded-sm bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
              Rework Rate
            </span>
            <span className="text-2xl font-bold text-orange-600 dark:text-orange-500">
              {data.reworkRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-orange-600 dark:text-orange-500">
            {data.assessmentsWithRework} assessments required rework from BLGU
          </p>
        </div>

        {/* Calibration rate */}
        <div className="p-4 rounded-sm bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
              Calibration Rate
            </span>
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-500">
              {data.calibrationRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-500">
            {data.assessmentsWithCalibration} assessments required validator calibration
          </p>
        </div>
      </div>

      {/* Total assessments footer */}
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted-foreground)]">
            Total Assessments
          </span>
          <span className="font-semibold text-[var(--foreground)]">
            {data.totalAssessments}
          </span>
        </div>
      </div>
    </div>
  );
}
