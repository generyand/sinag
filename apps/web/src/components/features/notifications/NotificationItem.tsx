'use client';

import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { NotificationResponse, NotificationType } from '@sinag/shared';
import { cn } from '@/lib/utils';
import {
  FileCheck,
  FileWarning,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface NotificationItemProps {
  notification: NotificationResponse;
  onMarkAsRead?: (id: number) => void;
  onClose?: () => void;
}

/**
 * Get icon and color based on notification type
 */
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'NEW_SUBMISSION':
      return { icon: FileCheck, color: 'text-blue-500', bg: 'bg-blue-50' };
    case 'REWORK_REQUESTED':
      return { icon: FileWarning, color: 'text-amber-500', bg: 'bg-amber-50' };
    case 'REWORK_RESUBMITTED':
      return { icon: RefreshCw, color: 'text-indigo-500', bg: 'bg-indigo-50' };
    case 'READY_FOR_VALIDATION':
      return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' };
    case 'CALIBRATION_REQUESTED':
      return { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50' };
    case 'CALIBRATION_RESUBMITTED':
      return { icon: RefreshCw, color: 'text-purple-500', bg: 'bg-purple-50' };
    default:
      return { icon: FileCheck, color: 'text-gray-500', bg: 'bg-gray-50' };
  }
}

/**
 * Get navigation path based on notification type and user context
 */
function getNotificationLink(notification: NotificationResponse): string | null {
  if (!notification.assessment_id) return null;

  // For assessors/validators - go to the validation page
  if (
    notification.notification_type === 'NEW_SUBMISSION' ||
    notification.notification_type === 'REWORK_RESUBMITTED' ||
    notification.notification_type === 'READY_FOR_VALIDATION' ||
    notification.notification_type === 'CALIBRATION_RESUBMITTED'
  ) {
    return `/assessor/validation/${notification.assessment_id}`;
  }

  // For BLGU users - go to their dashboard or assessment
  if (
    notification.notification_type === 'REWORK_REQUESTED' ||
    notification.notification_type === 'CALIBRATION_REQUESTED'
  ) {
    return `/blgu`;
  }

  return null;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClose,
}: NotificationItemProps) {
  const router = useRouter();
  const { icon: Icon, color, bg } = getNotificationIcon(
    notification.notification_type as NotificationType
  );

  const handleClick = () => {
    // Mark as read if not already
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    // Navigate to relevant page
    const link = getNotificationLink(notification);
    if (link) {
      onClose?.();
      router.push(link);
    }
  };

  const timeAgo = notification.created_at
    ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
    : '';

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 p-3 cursor-pointer transition-colors',
        'hover:bg-muted/50',
        !notification.is_read && 'bg-muted/30'
      )}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0 p-2 rounded-full', bg)}>
        <Icon className={cn('h-4 w-4', color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm leading-snug',
              !notification.is_read ? 'font-medium' : 'text-muted-foreground'
            )}
          >
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        {/* Barangay/Governance Area info */}
        <div className="flex items-center gap-2 mt-1">
          {notification.assessment_barangay_name && (
            <span className="text-xs text-muted-foreground">
              {notification.assessment_barangay_name}
            </span>
          )}
          {notification.governance_area_name && (
            <>
              {notification.assessment_barangay_name && (
                <span className="text-xs text-muted-foreground">|</span>
              )}
              <span className="text-xs text-muted-foreground">
                {notification.governance_area_name}
              </span>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground/70 mt-1">{timeAgo}</p>
      </div>
    </div>
  );
}
