'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import type { AuditLogResponse } from '@sinag/shared';
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Globe,
  User,
} from 'lucide-react';
import * as React from 'react';

/**
 * Audit Log Table Component
 *
 * Comprehensive audit log viewer with filtering, pagination, and export capabilities.
 * Displays all system audit logs with detailed information about user actions.
 */
export function AuditLogTable() {
  // Filter state
  const [userFilter, setUserFilter] = React.useState<number | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] = React.useState<string | null>(null);
  const [actionFilter, setActionFilter] = React.useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = React.useState<string>('');
  const [endDateFilter, setEndDateFilter] = React.useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);

  // Calculate skip for pagination
  const skip = (currentPage - 1) * pageSize;

  // Fetch audit log data
  const { data, isLoading, error } = useAuditLogs({
    skip,
    limit: pageSize,
    user_id: userFilter || undefined,
    entity_type: entityTypeFilter || undefined,
    action: actionFilter || undefined,
    start_date: startDateFilter || undefined,
    end_date: endDateFilter || undefined,
  });

  const auditLogs = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Handle page size change
  const handlePageSizeChange = (size: string) => {
    setPageSize(parseInt(size));
    setCurrentPage(1); // Reset to first page
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Format changes JSON for display
  const formatChanges = (changes: AuditLogResponse['changes']) => {
    if (!changes) return '—';
    try {
      return JSON.stringify(changes, null, 2);
    } catch {
      return String(changes);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setUserFilter(null);
    setEntityTypeFilter(null);
    setActionFilter(null);
    setStartDateFilter('');
    setEndDateFilter('');
    setCurrentPage(1);
  };

  // Common entity types for filter
  const entityTypes = [
    'indicator',
    'bbi',
    'deadline_override',
    'user',
    'assessment_cycle',
    'assessment_response',
  ];

  // Common actions for filter
  const actions = ['create', 'update', 'delete', 'deactivate', 'activate'];

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[var(--muted-foreground)]" />
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Filters</h3>
          </div>
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Entity Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="entity-type-filter">Entity Type</Label>
            <Select
              value={entityTypeFilter || 'all'}
              onValueChange={(value) => setEntityTypeFilter(value === 'all' ? null : value)}
            >
              <SelectTrigger id="entity-type-filter">
                <SelectValue placeholder="All Entity Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entity Types</SelectItem>
                {entityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Filter */}
          <div className="space-y-2">
            <Label htmlFor="action-filter">Action</Label>
            <Select
              value={actionFilter || 'all'}
              onValueChange={(value) => setActionFilter(value === 'all' ? null : value)}
            >
              <SelectTrigger id="action-filter">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date Filter */}
          <div className="space-y-2">
            <Label htmlFor="start-date-filter">Start Date</Label>
            <Input
              id="start-date-filter"
              type="datetime-local"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
            />
          </div>

          {/* End Date Filter */}
          <div className="space-y-2">
            <Label htmlFor="end-date-filter">End Date</Label>
            <Input
              id="end-date-filter"
              type="datetime-local"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--background)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Timestamp
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    User
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Entity Type
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  Entity ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Action
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    IP Address
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)]">
                  Changes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary)]"></div>
                      <span className="text-[var(--muted-foreground)]">Loading audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-[var(--destructive)]">
                      Error loading audit logs. Please try again.
                    </p>
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
                    <p className="text-[var(--muted-foreground)]">
                      No audit logs found
                      {(entityTypeFilter || actionFilter || startDateFilter || endDateFilter) &&
                        ' with the selected filters'}
                      .
                    </p>
                  </td>
                </tr>
              ) : (
                auditLogs.map((log: AuditLogResponse) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--background)]/50 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--foreground)]">
                        {formatDate(log.created_at)}
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-[var(--foreground)]">
                          {log.user_name || 'Unknown'}
                        </div>
                        {log.user_email && (
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {log.user_email}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Entity Type */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--foreground)]">
                        {log.entity_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </div>
                    </td>

                    {/* Entity ID */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--foreground)]">
                        {log.entity_id ?? '—'}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
                        {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                      </span>
                    </td>

                    {/* IP Address */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--muted-foreground)] font-mono">
                        {log.ip_address || '—'}
                      </div>
                    </td>

                    {/* Changes */}
                    <td className="px-6 py-4">
                      <div className="text-xs text-[var(--muted-foreground)] font-mono max-w-md truncate">
                        {formatChanges(log.changes)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="border-t border-[var(--border)] bg-[var(--background)] px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="page-size" className="text-sm">
                  Rows per page:
                </Label>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger id="page-size" className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-[var(--muted-foreground)]">
                  Showing {skip + 1} to {Math.min(skip + pageSize, total)} of {total} entries
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm text-[var(--foreground)]">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
