'use client';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { Bell } from 'lucide-react';
import { NotificationPanel } from './NotificationPanel';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const {
    notifications,
    unreadCount,
    totalCount,
    isLoading,
    isPanelOpen,
    isMarkingAllRead,
    markAsRead,
    markAllAsRead,
    togglePanel,
    setPanelOpen,
    refresh,
  } = useNotifications();

  return (
    <Popover open={isPanelOpen} onOpenChange={setPanelOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          onClick={togglePanel}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {/* Badge */}
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex items-center justify-center',
                'min-w-[18px] h-[18px] px-1 rounded-full',
                'bg-destructive text-destructive-foreground',
                'text-[10px] font-medium'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-auto bg-white border border-gray-200 shadow-lg"
        align="end"
        sideOffset={8}
      >
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          totalCount={totalCount}
          isLoading={isLoading}
          isMarkingAllRead={isMarkingAllRead}
          onMarkAsRead={(id) => markAsRead([id])}
          onMarkAllAsRead={markAllAsRead}
          onRefresh={refresh}
          onClose={() => setPanelOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
