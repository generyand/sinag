import type { AuditLogListResponse, GetAdminAuditLogsParams } from '@sinag/shared';
import { useGetAdminAuditLogs } from '@sinag/shared';

/**
 * Custom hook for fetching audit logs with filtering
 *
 * Wraps the auto-generated useGetAdminAuditLogs hook with additional
 * convenience features and proper error handling.
 *
 * @param filters - Optional filters for audit logs (user_id, entity_type, action, dates, pagination)
 * @returns Query result with audit logs data, loading state, and error handling
 */
export function useAuditLogs(filters?: GetAdminAuditLogsParams) {
  return useGetAdminAuditLogs(filters, {
    query: {
      // Refetch every 30 seconds to keep data fresh
      refetchInterval: 30000,
      // Keep previous data while fetching new data (for smooth pagination)
      placeholderData: (previousData: AuditLogListResponse | undefined) => previousData,
    } as any,
  });
}
