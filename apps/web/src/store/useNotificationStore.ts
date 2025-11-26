import { create } from 'zustand';
import { NotificationResponse } from '@vantage/shared';

/**
 * Notification state interface for the global notification store
 */
interface NotificationState {
  /** List of notifications for the current user */
  notifications: NotificationResponse[];
  /** Total count of all notifications */
  totalCount: number;
  /** Count of unread notifications (for badge display) */
  unreadCount: number;
  /** Whether notifications are currently being fetched */
  isLoading: boolean;
  /** Whether the notification panel is open */
  isPanelOpen: boolean;
  /** Last fetch timestamp (for polling optimization) */
  lastFetchedAt: number | null;
  /** Error message if fetch failed */
  error: string | null;

  // Actions
  /** Set notifications list and counts */
  setNotifications: (
    notifications: NotificationResponse[],
    total: number,
    unread: number
  ) => void;
  /** Update only the unread count (for polling) */
  setUnreadCount: (count: number) => void;
  /** Mark specific notifications as read locally */
  markAsRead: (notificationIds: number[]) => void;
  /** Mark all notifications as read locally */
  markAllAsRead: () => void;
  /** Add a new notification (for real-time updates) */
  addNotification: (notification: NotificationResponse) => void;
  /** Toggle panel open/closed */
  togglePanel: () => void;
  /** Set panel open state */
  setPanelOpen: (open: boolean) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error message */
  setError: (error: string | null) => void;
  /** Clear all notification state */
  clear: () => void;
}

/**
 * Zustand store for managing global notification state
 *
 * This store holds notifications, unread count for badge display,
 * and panel visibility state. It does NOT persist to localStorage
 * since notifications should be fetched fresh on each session.
 */
export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  totalCount: 0,
  unreadCount: 0,
  isLoading: false,
  isPanelOpen: false,
  lastFetchedAt: null,
  error: null,

  setNotifications: (notifications, total, unread) =>
    set({
      notifications,
      totalCount: total,
      unreadCount: unread,
      lastFetchedAt: Date.now(),
      error: null,
    }),

  setUnreadCount: (count) =>
    set({
      unreadCount: count,
      lastFetchedAt: Date.now(),
    }),

  markAsRead: (notificationIds) => {
    const { notifications, unreadCount } = get();
    const updatedNotifications = notifications.map((n) =>
      notificationIds.includes(n.id) && !n.is_read
        ? { ...n, is_read: true, read_at: new Date().toISOString() }
        : n
    );
    // Count how many were actually marked as read
    const markedCount = notifications.filter(
      (n) => notificationIds.includes(n.id) && !n.is_read
    ).length;
    set({
      notifications: updatedNotifications,
      unreadCount: Math.max(0, unreadCount - markedCount),
    });
  },

  markAllAsRead: () => {
    const { notifications } = get();
    const updatedNotifications = notifications.map((n) =>
      !n.is_read
        ? { ...n, is_read: true, read_at: new Date().toISOString() }
        : n
    );
    set({
      notifications: updatedNotifications,
      unreadCount: 0,
    });
  },

  addNotification: (notification) => {
    const { notifications, totalCount, unreadCount } = get();
    // Add to the beginning of the list (newest first)
    set({
      notifications: [notification, ...notifications],
      totalCount: totalCount + 1,
      unreadCount: notification.is_read ? unreadCount : unreadCount + 1,
    });
  },

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  setPanelOpen: (open) => set({ isPanelOpen: open }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clear: () =>
    set({
      notifications: [],
      totalCount: 0,
      unreadCount: 0,
      isLoading: false,
      isPanelOpen: false,
      lastFetchedAt: null,
      error: null,
    }),
}));
