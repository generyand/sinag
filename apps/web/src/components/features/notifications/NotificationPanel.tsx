"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationResponse } from "@sinag/shared";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { NotificationItem } from "./NotificationItem";

interface NotificationPanelProps {
  notifications: NotificationResponse[];
  unreadCount: number;
  totalCount: number;
  isLoading: boolean;
  isRefreshing?: boolean;
  isMarkingAllRead: boolean;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onRefresh: () => void;
  onClose: () => void;
}

export function NotificationPanel({
  notifications,
  unreadCount,
  totalCount,
  isLoading,
  isRefreshing = false,
  isMarkingAllRead,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
  onClose,
}: NotificationPanelProps) {
  return (
    <div className="w-[380px] max-h-[500px] flex flex-col bg-white rounded-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">({unreadCount} unread)</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={onMarkAllAsRead}
              disabled={isMarkingAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isLoading && notifications.length === 0 ? (
          // Loading skeleton
          <div className="p-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="p-3 rounded-full bg-muted mb-3">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              You&apos;ll see notifications here when there&apos;s activity on your assessments.
            </p>
          </div>
        ) : (
          // Notification list
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={(id) => onMarkAsRead(id)}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {totalCount > notifications.length && (
        <>
          <Separator />
          <div className="px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">
              Showing {notifications.length} of {totalCount} notifications
            </p>
          </div>
        </>
      )}
    </div>
  );
}
