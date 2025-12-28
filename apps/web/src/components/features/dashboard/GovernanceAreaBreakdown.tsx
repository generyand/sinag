"use client";

interface AreaData {
  areaCode: string;
  areaName: string;
  passed: number;
  failed: number;
  percentage: number;
}

interface GovernanceAreaBreakdownProps {
  data: AreaData[];
}

export function GovernanceAreaBreakdown({ data }: GovernanceAreaBreakdownProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
          Governance Area Performance
        </h3>
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          No assessment data available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Governance Area Performance
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Pass/fail rates across all 6 governance areas
        </p>
      </div>

      <div className="space-y-4">
        {data.map((area) => {
          const total = area.passed + area.failed;
          const passRate = total > 0 ? (area.passed / total) * 100 : 0;

          return (
            <div key={area.areaCode} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--foreground)] truncate max-w-[200px]">
                  {area.areaName}
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-green-600 font-medium">{area.passed} passed</span>
                  <span className="text-red-500 font-medium">{area.failed} failed</span>
                  <span className="font-semibold text-[var(--foreground)] min-w-[45px] text-right">
                    {passRate.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-[var(--muted)]/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${passRate}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-6 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted-foreground)]">Average Pass Rate</span>
          <span className="font-semibold text-[var(--foreground)]">
            {data.length > 0
              ? (data.reduce((sum, a) => sum + a.percentage, 0) / data.length).toFixed(1)
              : 0}
            %
          </span>
        </div>
      </div>
    </div>
  );
}
