/**
 * Tests for NotificationItem component
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationItem } from '../NotificationItem';
import type { NotificationResponse, NotificationType } from '@sinag/shared';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Helper to create mock notifications
function createMockNotification(
  overrides: Partial<NotificationResponse> = {}
): NotificationResponse {
  return {
    id: 1,
    recipient_id: 1,
    notification_type: 'NEW_SUBMISSION' as NotificationType,
    title: 'Test Notification',
    message: 'Test message content',
    is_read: false,
    created_at: new Date().toISOString(),
    assessment_id: 123,
    governance_area_id: null,
    read_at: null,
    email_sent: false,
    email_sent_at: null,
    assessment_barangay_name: 'Test Barangay',
    governance_area_name: null,
    ...overrides,
  };
}

describe('NotificationItem', () => {
  const mockOnMarkAsRead = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders notification title and message', () => {
      const notification = createMockNotification({
        title: 'New Submission',
        message: 'Barangay Test has submitted their assessment',
      });

      render(<NotificationItem notification={notification} />);

      expect(screen.getByText('New Submission')).toBeInTheDocument();
      expect(
        screen.getByText('Barangay Test has submitted their assessment')
      ).toBeInTheDocument();
    });

    it('renders barangay name when available', () => {
      const notification = createMockNotification({
        assessment_barangay_name: 'San Miguel',
      });

      render(<NotificationItem notification={notification} />);

      expect(screen.getByText('San Miguel')).toBeInTheDocument();
    });

    it('renders governance area name when available', () => {
      const notification = createMockNotification({
        governance_area_name: 'Financial Administration',
      });

      render(<NotificationItem notification={notification} />);

      expect(screen.getByText('Financial Administration')).toBeInTheDocument();
    });

    it('renders both barangay and governance area with separator', () => {
      const notification = createMockNotification({
        assessment_barangay_name: 'San Miguel',
        governance_area_name: 'Financial Administration',
      });

      render(<NotificationItem notification={notification} />);

      expect(screen.getByText('San Miguel')).toBeInTheDocument();
      expect(screen.getByText('|')).toBeInTheDocument();
      expect(screen.getByText('Financial Administration')).toBeInTheDocument();
    });

    it('displays unread indicator for unread notifications', () => {
      const notification = createMockNotification({ is_read: false });

      const { container } = render(
        <NotificationItem notification={notification} />
      );

      // Look for the unread dot indicator (a small circle)
      const unreadDot = container.querySelector('.bg-primary');
      expect(unreadDot).toBeInTheDocument();
    });

    it('does not display unread indicator for read notifications', () => {
      const notification = createMockNotification({ is_read: true });

      const { container } = render(
        <NotificationItem notification={notification} />
      );

      const unreadDot = container.querySelector('.bg-primary');
      expect(unreadDot).not.toBeInTheDocument();
    });

    it('renders time ago text', () => {
      const recentDate = new Date();
      recentDate.setMinutes(recentDate.getMinutes() - 5);

      const notification = createMockNotification({
        created_at: recentDate.toISOString(),
      });

      render(<NotificationItem notification={notification} />);

      // Should contain "minutes ago" or similar text
      expect(screen.getByText(/ago/i)).toBeInTheDocument();
    });
  });

  describe('Notification Types and Icons', () => {
    it('renders correct icon for NEW_SUBMISSION type', () => {
      const notification = createMockNotification({
        notification_type: 'NEW_SUBMISSION' as NotificationType,
      });

      const { container } = render(
        <NotificationItem notification={notification} />
      );

      // Icon should have blue color for NEW_SUBMISSION
      expect(container.querySelector('.text-blue-500')).toBeInTheDocument();
    });

    it('renders correct icon for REWORK_REQUESTED type', () => {
      const notification = createMockNotification({
        notification_type: 'REWORK_REQUESTED' as NotificationType,
      });

      const { container } = render(
        <NotificationItem notification={notification} />
      );

      // Icon should have amber color for REWORK_REQUESTED
      expect(container.querySelector('.text-amber-500')).toBeInTheDocument();
    });

    it('renders correct icon for READY_FOR_VALIDATION type', () => {
      const notification = createMockNotification({
        notification_type: 'READY_FOR_VALIDATION' as NotificationType,
      });

      const { container } = render(
        <NotificationItem notification={notification} />
      );

      // Icon should have green color for READY_FOR_VALIDATION
      expect(container.querySelector('.text-green-500')).toBeInTheDocument();
    });

    it('renders correct icon for CALIBRATION_REQUESTED type', () => {
      const notification = createMockNotification({
        notification_type: 'CALIBRATION_REQUESTED' as NotificationType,
      });

      const { container } = render(
        <NotificationItem notification={notification} />
      );

      // Icon should have orange color for CALIBRATION_REQUESTED
      expect(container.querySelector('.text-orange-500')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onMarkAsRead when clicking unread notification', () => {
      const notification = createMockNotification({ is_read: false });

      render(
        <NotificationItem
          notification={notification}
          onMarkAsRead={mockOnMarkAsRead}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Test Notification'));

      expect(mockOnMarkAsRead).toHaveBeenCalledWith(notification.id);
    });

    it('does not call onMarkAsRead when clicking already read notification', () => {
      const notification = createMockNotification({ is_read: true });

      render(
        <NotificationItem
          notification={notification}
          onMarkAsRead={mockOnMarkAsRead}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Test Notification'));

      expect(mockOnMarkAsRead).not.toHaveBeenCalled();
    });

    it('calls onClose when clicking notification with assessment link', () => {
      const notification = createMockNotification({
        assessment_id: 123,
        notification_type: 'NEW_SUBMISSION' as NotificationType,
      });

      render(
        <NotificationItem
          notification={notification}
          onMarkAsRead={mockOnMarkAsRead}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Test Notification'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('applies different background for unread notifications', () => {
      const unreadNotification = createMockNotification({ is_read: false });

      const { container: unreadContainer } = render(
        <NotificationItem notification={unreadNotification} />
      );

      // Unread should have muted background
      expect(
        unreadContainer.querySelector('.bg-muted\\/30')
      ).toBeInTheDocument();
    });

    it('applies bolder text for unread notifications', () => {
      const notification = createMockNotification({ is_read: false });

      const { container } = render(
        <NotificationItem notification={notification} />
      );

      expect(container.querySelector('.font-medium')).toBeInTheDocument();
    });
  });
});
