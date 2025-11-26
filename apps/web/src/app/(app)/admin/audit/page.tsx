'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useGetUsersMe } from '@sinag/shared';
import { AuditLogTable } from '@/components/features/admin/audit/AuditLogTable';

/**
 * Audit Log Viewer Page
 *
 * Protected route for MLGOO_DILG users to view system audit logs.
 * Displays comprehensive audit trail with filtering and search capabilities.
 */
export default function AuditLogViewerPage() {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuthStore();

  // Auto-generated hook to fetch current user data
  const userQuery = useGetUsersMe();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  // Handle user data fetch success
  useEffect(() => {
    if (userQuery.data && !user) {
      setUser(userQuery.data);
    }
  }, [userQuery.data, user, setUser]);

  // Check if user has MLGOO_DILG role
  useEffect(() => {
    if (user && user.role !== 'MLGOO_DILG') {
      // Redirect non-admin users to their appropriate dashboard
      router.replace('/');
    }
  }, [user, router]);

  // Show loading if not authenticated or user role check pending
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
            style={{ borderColor: 'var(--analytics-danger)' }}
          />
          <p className="text-sm" style={{ color: 'var(--analytics-muted-foreground)' }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (user.role !== 'MLGOO_DILG') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--analytics-danger)' }}>
            Access Denied
          </h1>
          <p className="text-sm" style={{ color: 'var(--analytics-muted-foreground)' }}>
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          View and filter system audit logs for all administrative actions
        </p>
      </div>

      {/* Audit Log Table Component */}
      <AuditLogTable />
    </div>
  );
}
