/**
 * Tests for NotificationBell component
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBell } from '../NotificationBell';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hooks
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(() => ({
    notifications: [],
    unreadCount: 0,
    totalCount: 0,
    isLoading: false,
    isPanelOpen: false,
    isMarkingAllRead: false,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    togglePanel: vi.fn(),
    setPanelOpen: vi.fn(),
    refresh: vi.fn(),
  })),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import { useNotifications } from '@/hooks/useNotifications';

// Create a query client for tests
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

// Wrapper with QueryClient
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('NotificationBell', () => {
  const mockTogglePanel = vi.fn();
  const mockSetPanelOpen = vi.fn();
  const mockMarkAsRead = vi.fn();
  const mockMarkAllAsRead = vi.fn();
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNotifications as ReturnType<typeof vi.fn>).mockReturnValue({
      notifications: [],
      unreadCount: 0,
      totalCount: 0,
      isLoading: false,
      isPanelOpen: false,
      isMarkingAllRead: false,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      togglePanel: mockTogglePanel,
      setPanelOpen: mockSetPanelOpen,
      refresh: mockRefresh,
    });
  });

  describe('Rendering', () => {
    it('renders bell button', () => {
      render(
        <TestWrapper>
          <NotificationBell />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders bell icon inside button', () => {
      const { container } = render(
        <TestWrapper>
          <NotificationBell />
        </TestWrapper>
      );

      // Bell icon should be present as SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      render(
        <TestWrapper>
          <NotificationBell className="custom-class" />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Badge Display', () => {
    it('does not show badge when unreadCount is 0', () => {
      (useNotifications as ReturnType<typeof vi.fn>).mockReturnValue({
        notifications: [],
        unreadCount: 0,
        totalCount: 0,
        isLoading: false,
        isPanelOpen: false,
        isMarkingAllRead: false,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        togglePanel: mockTogglePanel,
        setPanelOpen: mockSetPanelOpen,
        refresh: mockRefresh,
      });

      render(
        <TestWrapper>
          <NotificationBell />
        </TestWrapper>
      );

      // No badge should be visible
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('shows badge with count when unreadCount > 0', () => {
      (useNotifications as ReturnType<typeof vi.fn>).mockReturnValue({
        notifications: [],
        unreadCount: 5,
        totalCount: 10,
        isLoading: false,
        isPanelOpen: false,
        isMarkingAllRead: false,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        togglePanel: mockTogglePanel,
        setPanelOpen: mockSetPanelOpen,
        refresh: mockRefresh,
      });

      render(
        <TestWrapper>
          <NotificationBell />
        </TestWrapper>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows "99+" when unreadCount exceeds 99', () => {
      (useNotifications as ReturnType<typeof vi.fn>).mockReturnValue({
        notifications: [],
        unreadCount: 150,
        totalCount: 200,
        isLoading: false,
        isPanelOpen: false,
        isMarkingAllRead: false,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        togglePanel: mockTogglePanel,
        setPanelOpen: mockSetPanelOpen,
        refresh: mockRefresh,
      });

      render(
        <TestWrapper>
          <NotificationBell />
        </TestWrapper>
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls togglePanel when button is clicked', () => {
      render(
        <TestWrapper>
          <NotificationBell />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockTogglePanel).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible label without unread notifications', () => {
      (useNotifications as ReturnType<typeof vi.fn>).mockReturnValue({
        notifications: [],
        unreadCount: 0,
        totalCount: 0,
        isLoading: false,
        isPanelOpen: false,
        isMarkingAllRead: false,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        togglePanel: mockTogglePanel,
        setPanelOpen: mockSetPanelOpen,
        refresh: mockRefresh,
      });

      render(
        <TestWrapper>
          <NotificationBell />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Notifications');
    });

    it('has accessible label with unread count', () => {
      (useNotifications as ReturnType<typeof vi.fn>).mockReturnValue({
        notifications: [],
        unreadCount: 5,
        totalCount: 10,
        isLoading: false,
        isPanelOpen: false,
        isMarkingAllRead: false,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        togglePanel: mockTogglePanel,
        setPanelOpen: mockSetPanelOpen,
        refresh: mockRefresh,
      });

      render(
        <TestWrapper>
          <NotificationBell />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute(
        'aria-label',
        'Notifications (5 unread)'
      );
    });
  });

  describe('Popover Panel', () => {
    it('shows panel when isPanelOpen is true', () => {
      (useNotifications as ReturnType<typeof vi.fn>).mockReturnValue({
        notifications: [],
        unreadCount: 0,
        totalCount: 0,
        isLoading: false,
        isPanelOpen: true,
        isMarkingAllRead: false,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        togglePanel: mockTogglePanel,
        setPanelOpen: mockSetPanelOpen,
        refresh: mockRefresh,
      });

      render(
        <TestWrapper>
          <NotificationBell />
        </TestWrapper>
      );

      // Panel should be visible
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });

    it('does not show panel when isPanelOpen is false', () => {
      (useNotifications as ReturnType<typeof vi.fn>).mockReturnValue({
        notifications: [],
        unreadCount: 0,
        totalCount: 0,
        isLoading: false,
        isPanelOpen: false,
        isMarkingAllRead: false,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        togglePanel: mockTogglePanel,
        setPanelOpen: mockSetPanelOpen,
        refresh: mockRefresh,
      });

      render(
        <TestWrapper>
          <NotificationBell />
        </TestWrapper>
      );

      // Panel content should not be visible
      expect(screen.queryByText('No notifications yet')).not.toBeInTheDocument();
    });
  });
});
