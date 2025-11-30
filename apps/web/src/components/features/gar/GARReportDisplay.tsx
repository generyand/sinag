'use client';

import { GARResponse } from '@sinag/shared';
import { BBIComplianceSection, BBIComplianceData } from './BBIComplianceSection';

interface GARReportDisplayProps {
  data: GARResponse;
}

/**
 * GAR Report Display Component
 *
 * Renders the Governance Assessment Report (GAR) data.
 * All filtering logic (depth filtering, minimum requirements) is handled by the backend.
 * This component simply renders what it receives.
 */
export function GARReportDisplay({ data }: GARReportDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 text-white text-center">
          <h2 className="text-xl font-bold">{data.cycle_year}</h2>
          <p className="text-lg font-semibold">GOVERNANCE ASSESSMENT REPORT</p>
          <p className="text-sm italic mt-1">
            Barangay {data.barangay_name}, {data.municipality}, {data.province}
          </p>
        </div>
      </div>

      {/* Governance Areas - Each in its own card */}
      {data.governance_areas?.map((area) => (
        <div
          key={area.area_id}
          className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden"
        >
          {/* Area Header */}
          <div className="bg-green-100 dark:bg-green-900/30 px-4 py-3 border-b border-[var(--border)]">
            <h3 className="font-bold text-[var(--foreground)]">
              {area.area_type === 'Core' ? 'CGA' : 'EGA'}{' '}
              {area.area_type === 'Core' ? area.area_number : area.area_number - 3}:{' '}
              {area.area_name.toUpperCase()}
            </h3>
          </div>

          {/* Table */}
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--muted)]/30">
                <th className="text-left px-4 py-2 font-semibold text-[var(--foreground)] border-b border-[var(--border)]">
                  INDICATORS
                </th>
                <th className="text-center px-4 py-2 font-semibold text-[var(--foreground)] border-b border-[var(--border)] w-32">
                  RESULT
                  <br />
                  <span className="text-xs font-normal">
                    (<span className="text-green-600">met</span>,{' '}
                    <span className="text-yellow-600">considered</span>,{' '}
                    <span className="text-red-600">unmet</span>)
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {area.indicators?.map((indicator) => (
                <>
                  {/* Indicator Row */}
                  <tr
                    key={indicator.indicator_id}
                    className={`border-b border-[var(--border)] ${
                      indicator.is_header ? 'bg-green-50 dark:bg-green-900/10' : ''
                    }`}
                  >
                    <td
                      className={`px-4 py-2 ${indicator.is_header ? 'font-bold' : ''}`}
                      style={{ paddingLeft: `${16 + (indicator.indent_level || 0) * 16}px` }}
                    >
                      {indicator.indicator_code} {indicator.indicator_name}
                    </td>
                    <td className="px-4 py-2">
                      {!indicator.is_header && (
                        <div
                          className={`h-6 w-full rounded-sm ${getStatusColor(
                            indicator.validation_status
                          )}`}
                        />
                      )}
                    </td>
                  </tr>

                  {/* Checklist Items (Minimum Requirements) - Already filtered by backend */}
                  {indicator.checklist_items?.map((item) => (
                    <tr
                      key={`${indicator.indicator_id}-${item.item_id}`}
                      className="border-b border-[var(--border)]"
                    >
                      <td
                        className="px-4 py-1.5 text-sm"
                        style={{ paddingLeft: '48px' }}
                      >
                        {item.label}
                      </td>
                      <td className="px-4 py-1.5">
                        <div
                          className={`h-6 w-full rounded-sm ${getResultColor(
                            item.validation_result
                          )}`}
                        />
                      </td>
                    </tr>
                  ))}
                </>
              ))}

              {/* Overall Result Row */}
              <tr className="bg-green-100 dark:bg-green-900/30 border-t-2 border-green-500">
                <td className="px-4 py-3 font-bold text-[var(--foreground)]">
                  OVERALL RESULT
                </td>
                <td className="px-4 py-3">
                  <div
                    className={`h-8 w-full rounded-sm ${
                      area.overall_result === 'Passed'
                        ? 'bg-green-500'
                        : area.overall_result === 'Failed'
                        ? 'bg-red-500'
                        : 'bg-gray-200'
                    }`}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Area Stats */}
          <div className="px-4 py-3 bg-[var(--muted)]/10 flex items-center gap-6 text-sm border-t border-[var(--border)]">
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm bg-green-500"></span>
              Met: {area.met_count}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm bg-yellow-400"></span>
              Considered: {area.considered_count}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-sm bg-red-500"></span>
              Unmet: {area.unmet_count}
            </span>
          </div>
        </div>
      ))}

      {/* Summary Table (if multiple areas) */}
      {data.summary && data.summary.length > 1 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
          <div className="px-4 py-3 bg-[var(--muted)]/20 border-b border-[var(--border)]">
            <h3 className="font-bold text-[var(--foreground)]">Summary</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--muted)]/10">
                <th className="text-left px-4 py-2 font-semibold border-b border-[var(--border)]">
                  Governance Area
                </th>
                <th className="text-center px-4 py-2 font-semibold border-b border-[var(--border)] w-32">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {data.summary.map((item, idx) => (
                <tr key={idx} className="border-b border-[var(--border)]">
                  <td className="px-4 py-2">
                    <span className="text-xs text-[var(--muted-foreground)] mr-2">
                      {item.area_type}
                    </span>
                    {item.area_name}
                  </td>
                  <td className="px-4 py-2">
                    <div
                      className={`h-6 w-full rounded-sm ${
                        item.result === 'Passed'
                          ? 'bg-green-500'
                          : item.result === 'Failed'
                          ? 'bg-red-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* BBI Compliance Section (DILG MC 2024-417) */}
      <BBIComplianceSection data={(data as any).bbi_compliance as BBIComplianceData} />

      {/* Generated timestamp */}
      <p className="text-sm text-[var(--muted-foreground)] text-center">
        Report generated: {data.generated_at ? new Date(data.generated_at).toLocaleString() : 'N/A'}
      </p>
    </div>
  );
}

// Helper functions for colors
function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'Pass':
      return 'bg-green-500';
    case 'Conditional':
      return 'bg-yellow-400';
    case 'Fail':
      return 'bg-red-500';
    default:
      return 'bg-gray-200 dark:bg-gray-700';
  }
}

function getResultColor(result: string | null | undefined): string {
  switch (result) {
    case 'met':
      return 'bg-green-500';
    case 'considered':
      return 'bg-yellow-400';
    case 'unmet':
      return 'bg-red-500';
    default:
      return 'bg-gray-200 dark:bg-gray-700';
  }
}
