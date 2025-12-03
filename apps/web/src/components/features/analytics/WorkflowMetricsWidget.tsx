"use client";

import { AssessorData } from "./AssessorAnalyticsTypes";

interface WorkflowMetricsWidgetProps {
  data: AssessorData;
}

export function WorkflowMetricsWidget({ data }: WorkflowMetricsWidgetProps) {
  return (
    <section
      className="bg-[var(--card)] rounded-sm border border-[var(--border)] p-8 shadow-sm hover:shadow-md transition-shadow duration-200"
      aria-labelledby="workflow-metrics-title"
      role="region"
    >
      <header className="flex items-center justify-between mb-6">
        <h3 id="workflow-metrics-title" className="text-xl font-bold text-[var(--foreground)]">
          Your Assessment Workflow Metrics
        </h3>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span>Performance Overview</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Enhanced Efficiency Metrics */}
        <div role="group" aria-labelledby="efficiency-metrics-title">
          <h4 id="efficiency-metrics-title" className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: 'var(--kpi-blue-accent)' }}
              aria-hidden="true"
            ></div>
            Efficiency Metrics
          </h4>
          <div className="space-y-4">
            <div 
              className="rounded-sm p-4 border hover:opacity-90 transition-all duration-200"
              style={{
                backgroundColor: 'var(--kpi-blue-from)',
                borderColor: 'var(--kpi-blue-border, var(--border))'
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium" style={{ color: 'var(--kpi-blue-text)' }}>
                    Avg. Time to First Review
                  </span>
                  <div className="text-xs mt-1" style={{ color: 'var(--kpi-blue-text)' }}>
                    Response efficiency
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold" style={{ color: 'var(--kpi-blue-text)' }}>
                    {data.workflowMetrics.avgTimeToFirstReview}
                  </span>
                  <div className="text-xs" style={{ color: 'var(--kpi-blue-text)' }}>Days</div>
                </div>
              </div>
            </div>

            <div 
              className="rounded-sm p-4 border hover:opacity-90 transition-all duration-200"
              style={{
                backgroundColor: 'var(--analytics-warning-bg)',
                borderColor: 'var(--analytics-warning-border)'
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium" style={{ color: 'var(--analytics-warning-text)' }}>
                    Avg. Rework Cycle Time
                  </span>
                  <div className="text-xs mt-1" style={{ color: 'var(--analytics-warning-text)' }}>
                    Revision turnaround
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold" style={{ color: 'var(--analytics-warning-text-light)' }}>
                    {data.workflowMetrics.avgReworkCycleTime}
                  </span>
                  <div className="text-xs" style={{ color: 'var(--analytics-warning-text)' }}>Days</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Outcomes */}
        <div role="group" aria-labelledby="outcomes-title">
          <h4 id="outcomes-title" className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: 'var(--analytics-success)' }}
              aria-hidden="true"
            ></div>
            Outcomes
          </h4>
          <div className="space-y-4">
            <div 
              className="rounded-sm p-4 border hover:opacity-90 transition-all duration-200"
              style={{
                backgroundColor: 'var(--analytics-success-bg)',
                borderColor: 'var(--analytics-success-border)'
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium" style={{ color: 'var(--analytics-success-text)' }}>
                    Total Submissions Reviewed
                  </span>
                  <div className="text-xs mt-1" style={{ color: 'var(--analytics-success-text)' }}>
                    Completion progress
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold" style={{ color: 'var(--analytics-success-text-light)' }}>
                    {data.workflowMetrics.totalReviewed}
                  </span>
                  <div className="text-xs" style={{ color: 'var(--analytics-success-text)' }}>
                    of {data.assignedBarangays}
                  </div>
                </div>
              </div>
            </div>

            <div 
              className="rounded-sm p-4 border hover:opacity-90 transition-all duration-200"
              style={{
                backgroundColor: 'var(--kpi-purple-from)',
                borderColor: 'var(--kpi-purple-border, var(--border))'
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium" style={{ color: 'var(--kpi-purple-text)' }}>
                    Rework Rate
                  </span>
                  <div className="text-xs mt-1" style={{ color: 'var(--kpi-purple-text)' }}>
                    Quality indicator
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold" style={{ color: 'var(--kpi-purple-text)' }}>
                    {data.workflowMetrics.reworkRate}%
                  </span>
                  <div className="text-xs" style={{ color: 'var(--kpi-purple-text)' }}>
                    Required Rework
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 