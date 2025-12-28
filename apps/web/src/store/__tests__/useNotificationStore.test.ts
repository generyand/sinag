import { describe, it, expect, beforeEach } from "vitest";
import { useNotificationStore } from "../useNotificationStore";
import { NotificationResponse, NotificationType } from "@sinag/shared";

// Helper to create mock notifications
function createMockNotification(
  overrides: Partial<NotificationResponse> = {}
): NotificationResponse {
  return {
    id: Math.floor(Math.random() * 10000),
    recipient_id: 1,
    notification_type: "NEW_SUBMISSION" as NotificationType,
    title: "Test Notification",
    message: "Test message",
    is_read: false,
    created_at: new Date().toISOString(),
    assessment_id: null,
    governance_area_id: null,
    read_at: null,
    email_sent: false,
    email_sent_at: null,
    assessment_barangay_name: null,
    governance_area_name: null,
    ...overrides,
  };
}

describe("useNotificationStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useNotificationStore.setState({
      notifications: [],
      totalCount: 0,
      unreadCount: 0,
      isLoading: false,
      isPanelOpen: false,
      lastFetchedAt: null,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useNotificationStore.getState();

      expect(state.notifications).toEqual([]);
      expect(state.totalCount).toBe(0);
      expect(state.unreadCount).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.isPanelOpen).toBe(false);
      expect(state.lastFetchedAt).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe("setNotifications", () => {
    it("should set notifications and counts", () => {
      const store = useNotificationStore.getState();
      const notifications = [
        createMockNotification({ id: 1 }),
        createMockNotification({ id: 2 }),
        createMockNotification({ id: 3, is_read: true }),
      ];

      store.setNotifications(notifications, 10, 7);

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(3);
      expect(state.totalCount).toBe(10);
      expect(state.unreadCount).toBe(7);
      expect(state.lastFetchedAt).not.toBeNull();
      expect(state.error).toBeNull();
    });

    it("should update lastFetchedAt timestamp", () => {
      const store = useNotificationStore.getState();
      const before = Date.now();

      store.setNotifications([], 0, 0);

      const state = useNotificationStore.getState();
      expect(state.lastFetchedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe("setUnreadCount", () => {
    it("should update unread count", () => {
      const store = useNotificationStore.getState();

      store.setUnreadCount(5);

      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(5);
    });

    it("should update lastFetchedAt", () => {
      const store = useNotificationStore.getState();
      const before = Date.now();

      store.setUnreadCount(3);

      const state = useNotificationStore.getState();
      expect(state.lastFetchedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe("markAsRead", () => {
    it("should mark specific notifications as read", () => {
      const store = useNotificationStore.getState();
      const notifications = [
        createMockNotification({ id: 1, is_read: false }),
        createMockNotification({ id: 2, is_read: false }),
        createMockNotification({ id: 3, is_read: false }),
      ];

      store.setNotifications(notifications, 3, 3);
      store.markAsRead([1, 2]);

      const state = useNotificationStore.getState();
      const notif1 = state.notifications.find((n) => n.id === 1);
      const notif2 = state.notifications.find((n) => n.id === 2);
      const notif3 = state.notifications.find((n) => n.id === 3);

      expect(notif1?.is_read).toBe(true);
      expect(notif1?.read_at).not.toBeNull();
      expect(notif2?.is_read).toBe(true);
      expect(notif3?.is_read).toBe(false);
      expect(state.unreadCount).toBe(1);
    });

    it("should not double-count already read notifications", () => {
      const store = useNotificationStore.getState();
      const notifications = [
        createMockNotification({ id: 1, is_read: true }),
        createMockNotification({ id: 2, is_read: false }),
      ];

      store.setNotifications(notifications, 2, 1);
      store.markAsRead([1]); // Already read

      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(1); // Should remain 1
    });

    it("should handle marking non-existent notification IDs", () => {
      const store = useNotificationStore.getState();
      const notifications = [createMockNotification({ id: 1 })];

      store.setNotifications(notifications, 1, 1);
      store.markAsRead([999]); // Non-existent

      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(1); // Unchanged
    });

    it("should not go below 0 for unread count", () => {
      const store = useNotificationStore.getState();
      const notifications = [createMockNotification({ id: 1, is_read: false })];

      store.setNotifications(notifications, 1, 0); // Start with 0 unread
      store.markAsRead([1]);

      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(0); // Should not be negative
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all notifications as read", () => {
      const store = useNotificationStore.getState();
      const notifications = [
        createMockNotification({ id: 1, is_read: false }),
        createMockNotification({ id: 2, is_read: false }),
        createMockNotification({ id: 3, is_read: false }),
      ];

      store.setNotifications(notifications, 3, 3);
      store.markAllAsRead();

      const state = useNotificationStore.getState();
      state.notifications.forEach((n) => {
        expect(n.is_read).toBe(true);
        expect(n.read_at).not.toBeNull();
      });
      expect(state.unreadCount).toBe(0);
    });

    it("should handle already read notifications", () => {
      const store = useNotificationStore.getState();
      const notifications = [
        createMockNotification({ id: 1, is_read: true }),
        createMockNotification({ id: 2, is_read: false }),
      ];

      store.setNotifications(notifications, 2, 1);
      store.markAllAsRead();

      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(0);
    });
  });

  describe("addNotification", () => {
    it("should add notification to the beginning of the list", () => {
      const store = useNotificationStore.getState();
      const existing = createMockNotification({ id: 1 });

      store.setNotifications([existing], 1, 1);

      const newNotif = createMockNotification({ id: 2, title: "New One" });
      store.addNotification(newNotif);

      const state = useNotificationStore.getState();
      expect(state.notifications[0].id).toBe(2);
      expect(state.notifications[1].id).toBe(1);
      expect(state.totalCount).toBe(2);
      expect(state.unreadCount).toBe(2);
    });

    it("should increment unread count for unread notification", () => {
      const store = useNotificationStore.getState();

      store.setNotifications([], 0, 0);
      store.addNotification(createMockNotification({ is_read: false }));

      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(1);
    });

    it("should not increment unread count for already read notification", () => {
      const store = useNotificationStore.getState();

      store.setNotifications([], 0, 0);
      store.addNotification(createMockNotification({ is_read: true }));

      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(0);
    });
  });

  describe("Panel State", () => {
    it("should toggle panel open state", () => {
      const store = useNotificationStore.getState();

      expect(store.isPanelOpen).toBe(false);

      store.togglePanel();
      expect(useNotificationStore.getState().isPanelOpen).toBe(true);

      store.togglePanel();
      expect(useNotificationStore.getState().isPanelOpen).toBe(false);
    });

    it("should set panel open state directly", () => {
      const store = useNotificationStore.getState();

      store.setPanelOpen(true);
      expect(useNotificationStore.getState().isPanelOpen).toBe(true);

      store.setPanelOpen(false);
      expect(useNotificationStore.getState().isPanelOpen).toBe(false);
    });
  });

  describe("Loading State", () => {
    it("should set loading state", () => {
      const store = useNotificationStore.getState();

      store.setLoading(true);
      expect(useNotificationStore.getState().isLoading).toBe(true);

      store.setLoading(false);
      expect(useNotificationStore.getState().isLoading).toBe(false);
    });
  });

  describe("Error State", () => {
    it("should set error message", () => {
      const store = useNotificationStore.getState();

      store.setError("Failed to load notifications");

      const state = useNotificationStore.getState();
      expect(state.error).toBe("Failed to load notifications");
    });

    it("should clear error message", () => {
      const store = useNotificationStore.getState();

      store.setError("Some error");
      store.setError(null);

      const state = useNotificationStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe("clear", () => {
    it("should reset all state to initial values", () => {
      const store = useNotificationStore.getState();

      // Set some state
      store.setNotifications([createMockNotification(), createMockNotification()], 5, 3);
      store.setPanelOpen(true);
      store.setLoading(true);
      store.setError("Some error");

      // Clear
      store.clear();

      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual([]);
      expect(state.totalCount).toBe(0);
      expect(state.unreadCount).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.isPanelOpen).toBe(false);
      expect(state.lastFetchedAt).toBeNull();
      expect(state.error).toBeNull();
    });
  });
});
