/**
 * Tests for NotificationPanel component
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationPanel } from "../NotificationPanel";
import type { NotificationResponse, NotificationType } from "@sinag/shared";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Helper to create mock notifications
function createMockNotification(
  overrides: Partial<NotificationResponse> = {}
): NotificationResponse {
  return {
    id: Math.floor(Math.random() * 10000),
    recipient_id: 1,
    notification_type: "NEW_SUBMISSION" as NotificationType,
    title: "Test Notification",
    message: "Test message content",
    is_read: false,
    created_at: new Date().toISOString(),
    assessment_id: 123,
    governance_area_id: null,
    read_at: null,
    email_sent: false,
    email_sent_at: null,
    assessment_barangay_name: "Test Barangay",
    governance_area_name: null,
    ...overrides,
  };
}

describe("NotificationPanel", () => {
  const mockOnMarkAsRead = vi.fn();
  const mockOnMarkAllAsRead = vi.fn();
  const mockOnRefresh = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    notifications: [],
    unreadCount: 0,
    totalCount: 0,
    isLoading: false,
    isMarkingAllRead: false,
    onMarkAsRead: mockOnMarkAsRead,
    onMarkAllAsRead: mockOnMarkAllAsRead,
    onRefresh: mockOnRefresh,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Header", () => {
    it("renders header with Notifications title", () => {
      render(<NotificationPanel {...defaultProps} />);

      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    it("shows unread count badge when there are unread notifications", () => {
      render(<NotificationPanel {...defaultProps} unreadCount={5} />);

      expect(screen.getByText("(5 unread)")).toBeInTheDocument();
    });

    it("does not show unread count badge when all are read", () => {
      render(<NotificationPanel {...defaultProps} unreadCount={0} />);

      expect(screen.queryByText(/unread/i)).not.toBeInTheDocument();
    });

    it("renders refresh button", () => {
      render(<NotificationPanel {...defaultProps} />);

      // Find by role button that contains refresh icon class
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("renders mark all read button when there are unread notifications", () => {
      render(<NotificationPanel {...defaultProps} unreadCount={3} />);

      expect(screen.getByText("Mark all read")).toBeInTheDocument();
    });

    it("does not render mark all read button when no unread notifications", () => {
      render(<NotificationPanel {...defaultProps} unreadCount={0} />);

      expect(screen.queryByText("Mark all read")).not.toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("shows loading skeletons when loading and no notifications", () => {
      const { container } = render(<NotificationPanel {...defaultProps} isLoading={true} />);

      // Check for skeleton elements (they have a specific class)
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("shows existing notifications while loading (not skeleton)", () => {
      const notifications = [createMockNotification({ id: 1, title: "Existing Notification" })];

      render(
        <NotificationPanel
          {...defaultProps}
          notifications={notifications}
          totalCount={1}
          isLoading={true}
        />
      );

      expect(screen.getByText("Existing Notification")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("shows empty state message when no notifications", () => {
      render(<NotificationPanel {...defaultProps} />);

      expect(screen.getByText("No notifications yet")).toBeInTheDocument();
      expect(screen.getByText(/You'll see notifications here/i)).toBeInTheDocument();
    });
  });

  describe("Notification List", () => {
    it("renders all notifications", () => {
      const notifications = [
        createMockNotification({ id: 1, title: "Notification 1" }),
        createMockNotification({ id: 2, title: "Notification 2" }),
        createMockNotification({ id: 3, title: "Notification 3" }),
      ];

      render(<NotificationPanel {...defaultProps} notifications={notifications} totalCount={3} />);

      expect(screen.getByText("Notification 1")).toBeInTheDocument();
      expect(screen.getByText("Notification 2")).toBeInTheDocument();
      expect(screen.getByText("Notification 3")).toBeInTheDocument();
    });

    it("passes onMarkAsRead to notification items", () => {
      const notifications = [createMockNotification({ id: 1, is_read: false })];

      render(
        <NotificationPanel
          {...defaultProps}
          notifications={notifications}
          totalCount={1}
          unreadCount={1}
        />
      );

      fireEvent.click(screen.getByText("Test Notification"));

      expect(mockOnMarkAsRead).toHaveBeenCalledWith(1);
    });
  });

  describe("Footer", () => {
    it("shows count info when there are more notifications than displayed", () => {
      const notifications = [createMockNotification({ id: 1 }), createMockNotification({ id: 2 })];

      render(<NotificationPanel {...defaultProps} notifications={notifications} totalCount={10} />);

      expect(screen.getByText("Showing 2 of 10 notifications")).toBeInTheDocument();
    });

    it("does not show count info when all notifications are displayed", () => {
      const notifications = [createMockNotification({ id: 1 }), createMockNotification({ id: 2 })];

      render(<NotificationPanel {...defaultProps} notifications={notifications} totalCount={2} />);

      expect(screen.queryByText(/Showing/i)).not.toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("calls onRefresh when refresh button is clicked", () => {
      const { container } = render(<NotificationPanel {...defaultProps} />);

      // Find the refresh button (first button in header)
      const buttons = container.querySelectorAll("button");
      const refreshButton = buttons[0];
      fireEvent.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it("calls onMarkAllAsRead when mark all read button is clicked", () => {
      render(<NotificationPanel {...defaultProps} unreadCount={3} />);

      fireEvent.click(screen.getByText("Mark all read"));

      expect(mockOnMarkAllAsRead).toHaveBeenCalled();
    });

    it("disables refresh button while loading", () => {
      const { container } = render(<NotificationPanel {...defaultProps} isLoading={true} />);

      const buttons = container.querySelectorAll("button");
      const refreshButton = buttons[0];
      expect(refreshButton).toBeDisabled();
    });

    it("disables mark all read button while marking", () => {
      render(<NotificationPanel {...defaultProps} unreadCount={3} isMarkingAllRead={true} />);

      const markAllButton = screen.getByText("Mark all read").closest("button");
      expect(markAllButton).toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("has proper heading structure", () => {
      render(<NotificationPanel {...defaultProps} />);

      expect(screen.getByRole("heading", { level: 3, hidden: true })).toBeDefined();
    });
  });
});
