import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetNotifications,
  useGetNotificationsCount,
  usePostNotificationsMarkRead,
  usePostNotificationsMarkAllRead,
  getGetNotificationsQueryKey,
  getGetNotificationsCountQueryKey,
} from '@sinag/shared';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAuthStore } from '@/store/useAuthStore';

/** Polling interval for notification count (30 seconds) */
const POLLING_INTERVAL_MS = 30_000;

/**
 * Custom hook for managing notifications with polling support.
 * Syncs data between React Query and Zustand store.
 *
 * @param options - Configuration options
 * @param options.enablePolling - Whether to enable background polling (default: true)
 * @param options.pollingInterval - Polling interval in ms (default: 30000)
 */
export function useNotifications({
  enablePolling = true,
  pollingInterval = POLLING_INTERVAL_MS,
}: {
  enablePolling?: boolean;
  pollingInterval?: number;
} = {}) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const {
    notifications,
    unreadCount,
    totalCount,
    isLoading,
    isPanelOpen,
    error,
    setNotifications,
    setUnreadCount,
    markAsRead: storeMarkAsRead,
    markAllAsRead: storeMarkAllAsRead,
    togglePanel,
    setPanelOpen,
    setLoading,
    setError,
  } = useNotificationStore();

  // Track if we've fetched full notifications at least once
  const hasFetchedRef = useRef(false);

  // Params for fetching notifications
  const params = { limit: 50, skip: 0 };

  // Fetch full notification list (when panel is opened)
  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useGetNotifications(params, {
    query: {
      queryKey: getGetNotificationsQueryKey(params),
      enabled: isAuthenticated && isPanelOpen,
      staleTime: 60_000, // 1 minute
      refetchOnWindowFocus: false,
    },
  });

  // Fetch only unread count (lightweight endpoint for polling)
  const {
    data: countData,
    isLoading: isLoadingCount,
    refetch: refetchCount,
  } = useGetNotificationsCount({
    query: {
      queryKey: getGetNotificationsCountQueryKey(),
      enabled: isAuthenticated,
      refetchInterval: enablePolling ? pollingInterval : false,
      refetchIntervalInBackground: false,
      staleTime: 10_000, // 10 seconds
      refetchOnWindowFocus: true,
    },
  });

  // Mark notifications as read mutation
  const markReadMutation = usePostNotificationsMarkRead({
    mutation: {
      onSuccess: (data) => {
        // Invalidate queries to refetch fresh data
        queryClient.invalidateQueries({
          queryKey: getGetNotificationsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetNotificationsCountQueryKey(),
        });
      },
    },
  });

  // Mark all notifications as read mutation
  const markAllReadMutation = usePostNotificationsMarkAllRead({
    mutation: {
      onSuccess: () => {
        // Invalidate queries to refetch fresh data
        queryClient.invalidateQueries({
          queryKey: getGetNotificationsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetNotificationsCountQueryKey(),
        });
      },
    },
  });

  // Sync notification data to store when fetched
  useEffect(() => {
    if (notificationsData) {
      setNotifications(
        notificationsData.notifications,
        notificationsData.total,
        notificationsData.unread_count
      );
      hasFetchedRef.current = true;
    }
  }, [notificationsData, setNotifications]);

  // Sync unread count from polling to store
  useEffect(() => {
    if (countData && !isPanelOpen) {
      setUnreadCount(countData.unread_count);
    }
  }, [countData, isPanelOpen, setUnreadCount]);

  // Update loading state
  useEffect(() => {
    setLoading(isLoadingNotifications || isLoadingCount);
  }, [isLoadingNotifications, isLoadingCount, setLoading]);

  // Update error state
  useEffect(() => {
    if (notificationsError) {
      setError('Failed to load notifications');
    } else {
      setError(null);
    }
  }, [notificationsError, setError]);

  /**
   * Mark specific notifications as read
   */
  const markAsRead = useCallback(
    async (notificationIds: number[]) => {
      // Optimistic update in store
      storeMarkAsRead(notificationIds);

      // Call API
      try {
        await markReadMutation.mutateAsync({
          data: { notification_ids: notificationIds },
        });
      } catch (err) {
        // Refetch to restore correct state on error
        refetchNotifications();
        refetchCount();
      }
    },
    [storeMarkAsRead, markReadMutation, refetchNotifications, refetchCount]
  );

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    // Optimistic update in store
    storeMarkAllAsRead();

    // Call API
    try {
      await markAllReadMutation.mutateAsync();
    } catch (err) {
      // Refetch to restore correct state on error
      refetchNotifications();
      refetchCount();
    }
  }, [storeMarkAllAsRead, markAllReadMutation, refetchNotifications, refetchCount]);

  /**
   * Force refresh notifications
   */
  const refresh = useCallback(() => {
    refetchNotifications();
    refetchCount();
  }, [refetchNotifications, refetchCount]);

  return {
    // Data
    notifications,
    unreadCount,
    totalCount,

    // State
    isLoading,
    isPanelOpen,
    error,
    isMarkingRead: markReadMutation.isPending,
    isMarkingAllRead: markAllReadMutation.isPending,

    // Actions
    markAsRead,
    markAllAsRead,
    togglePanel,
    setPanelOpen,
    refresh,
  };
}

/**
 * Lightweight hook for just the notification count (for badge display)
 * Uses polling to keep count fresh without fetching full notification list
 */
export function useNotificationCount({
  enablePolling = true,
  pollingInterval = POLLING_INTERVAL_MS,
}: {
  enablePolling?: boolean;
  pollingInterval?: number;
} = {}) {
  const { isAuthenticated } = useAuthStore();
  const { unreadCount, setUnreadCount } = useNotificationStore();

  const { data, isLoading, refetch } = useGetNotificationsCount({
    query: {
      queryKey: getGetNotificationsCountQueryKey(),
      enabled: isAuthenticated,
      refetchInterval: enablePolling ? pollingInterval : false,
      refetchIntervalInBackground: false,
      staleTime: 10_000,
      refetchOnWindowFocus: true,
    },
  });

  // Sync to store
  useEffect(() => {
    if (data) {
      setUnreadCount(data.unread_count);
    }
  }, [data, setUnreadCount]);

  return {
    unreadCount: data?.unread_count ?? unreadCount,
    totalCount: data?.total ?? 0,
    isLoading,
    refresh: refetch,
  };
}
