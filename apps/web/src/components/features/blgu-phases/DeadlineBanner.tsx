"use client";

/**
 * DeadlineBanner Component
 *
 * Displays a prominent banner showing Phase 1 deadline status for BLGU users.
 * Shows visual urgency based on days remaining until deadline.
 *
 * Urgency Levels:
 * - normal: > 7 days (hidden)
 * - warning: 4-7 days (yellow)
 * - urgent: 2-3 days (orange)
 * - critical: <= 1 day (red with animation)
 * - expired: deadline passed (red)
 */

import { useMemo } from "react";
import { AlertCircle, Clock, AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type UrgencyLevel = "normal" | "warning" | "urgent" | "critical" | "expired";

interface DeadlineBannerProps {
  phase1Deadline: string | null;
  daysRemaining: number | null;
  urgencyLevel: UrgencyLevel | null;
  assessmentStatus: string;
  isAutoSubmitted: boolean;
}

const urgencyConfig = {
  normal: {
    container: "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700",
    accent: "bg-slate-500",
    text: "text-slate-700 dark:text-slate-200",
    textMuted: "text-slate-600 dark:text-slate-400",
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200",
    icon: Clock,
  },
  warning: {
    container: "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700",
    accent: "bg-amber-500",
    text: "text-amber-800 dark:text-amber-100",
    textMuted: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-100",
    icon: Clock,
  },
  urgent: {
    container: "bg-orange-50 dark:bg-orange-950/30 border-orange-400 dark:border-orange-600",
    accent: "bg-orange-500",
    text: "text-orange-800 dark:text-orange-100",
    textMuted: "text-orange-700 dark:text-orange-300",
    badge: "bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-100",
    icon: AlertTriangle,
  },
  critical: {
    container: "bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-600",
    accent: "bg-red-500",
    text: "text-red-800 dark:text-red-100",
    textMuted: "text-red-700 dark:text-red-300",
    badge: "bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-100",
    icon: AlertCircle,
  },
  expired: {
    container: "bg-red-100 dark:bg-red-950/40 border-red-500 dark:border-red-500",
    accent: "bg-red-600",
    text: "text-red-900 dark:text-red-100",
    textMuted: "text-red-800 dark:text-red-200",
    badge: "bg-red-200 dark:bg-red-900/80 text-red-900 dark:text-red-100",
    icon: AlertCircle,
  },
};

function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  return date.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTimeRemaining(deadline: string): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
}

function getCountdownText(
  days: number,
  hours: number,
  urgencyLevel: UrgencyLevel
): { primary: string; secondary: string } {
  if (urgencyLevel === "expired") {
    return { primary: "Expired", secondary: "" };
  }

  if (days === 0) {
    if (hours === 0) {
      return { primary: "< 1", secondary: "hour left" };
    }
    return { primary: String(hours), secondary: hours === 1 ? "hour left" : "hours left" };
  }

  if (days <= 3) {
    // Show days + hours for more precision
    const hoursText = hours > 0 ? `, ${hours}h` : "";
    return {
      primary: String(days),
      secondary: `day${days !== 1 ? "s" : ""}${hoursText} left`,
    };
  }

  return {
    primary: String(days),
    secondary: `days left`,
  };
}

function getHeadline(urgencyLevel: UrgencyLevel, days: number, isAutoSubmitted: boolean): string {
  if (isAutoSubmitted) {
    return "Assessment Auto-Submitted";
  }

  switch (urgencyLevel) {
    case "expired":
      return "Deadline Has Passed";
    case "critical":
      return days === 0 ? "Final Hours!" : "Last Day to Submit!";
    case "urgent":
      return "Submit Soon";
    case "warning":
      return "Deadline Approaching";
    default:
      return "Submission Deadline";
  }
}

function getMessage(
  urgencyLevel: UrgencyLevel,
  days: number,
  hours: number,
  isAutoSubmitted: boolean
): string {
  if (isAutoSubmitted) {
    return "Your assessment was automatically submitted and is now queued for assessor review.";
  }

  switch (urgencyLevel) {
    case "expired":
      return "Your assessment will be auto-submitted shortly.";
    case "critical":
      if (days === 0) {
        return `Only ${hours} hour${hours !== 1 ? "s" : ""} remaining. Submit now to avoid auto-submission.`;
      }
      return "This is your final day. Submit now to avoid auto-submission at the deadline.";
    case "urgent":
      return "Complete your assessment and submit before the deadline.";
    case "warning":
      return "Make sure to complete and submit your assessment on time.";
    default:
      return "Submit your assessment before the deadline.";
  }
}

export function DeadlineBanner({
  phase1Deadline,
  daysRemaining,
  urgencyLevel,
  assessmentStatus,
  isAutoSubmitted,
}: DeadlineBannerProps) {
  // Calculate precise time remaining - must be called before early returns (React hooks rule)
  const timeRemaining = useMemo(
    () => (phase1Deadline ? getTimeRemaining(phase1Deadline) : { days: 0, hours: 0, minutes: 0 }),
    [phase1Deadline]
  );

  // Don't show banner if no deadline or normal urgency (> 7 days)
  if (!phase1Deadline || !urgencyLevel || urgencyLevel === "normal") {
    return null;
  }

  // Don't show for non-DRAFT assessments (unless expired/auto-submitted)
  if (assessmentStatus !== "DRAFT" && urgencyLevel !== "expired") {
    return null;
  }

  const config = urgencyConfig[urgencyLevel];
  const Icon = config.icon;

  const countdown = getCountdownText(timeRemaining.days, timeRemaining.hours, urgencyLevel);
  const headline = getHeadline(urgencyLevel, daysRemaining ?? 0, isAutoSubmitted);
  const message = getMessage(
    urgencyLevel,
    timeRemaining.days,
    timeRemaining.hours,
    isAutoSubmitted
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 mb-4",
        config.container,
        urgencyLevel === "critical" && "animate-pulse"
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-4 p-4">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 p-2.5 rounded-full",
            urgencyLevel === "expired" || urgencyLevel === "critical"
              ? "bg-red-100 dark:bg-red-900/50"
              : urgencyLevel === "urgent"
                ? "bg-orange-100 dark:bg-orange-900/50"
                : "bg-amber-100 dark:bg-amber-900/50"
          )}
        >
          {isAutoSubmitted ? (
            <CheckCircle2 className={cn("h-6 w-6", config.text)} aria-hidden="true" />
          ) : (
            <Icon className={cn("h-6 w-6", config.text)} aria-hidden="true" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={cn("text-lg font-bold", config.text)}>{headline}</h3>
          <p className={cn("text-sm mt-0.5", config.textMuted)}>{message}</p>
          {phase1Deadline && !isAutoSubmitted && (
            <div className={cn("flex items-center gap-1.5 mt-2 text-xs", config.textMuted)}>
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Deadline: {formatDeadline(phase1Deadline)}</span>
            </div>
          )}
        </div>

        {/* Countdown badge */}
        {!isAutoSubmitted && urgencyLevel !== "expired" && daysRemaining !== null && (
          <div
            className={cn(
              "flex-shrink-0 text-center px-4 py-2 rounded-xl min-w-[80px]",
              config.badge
            )}
          >
            <div className={cn("text-3xl font-black leading-none", config.text)}>
              {countdown.primary}
            </div>
            <div className={cn("text-xs font-medium mt-1 whitespace-nowrap", config.textMuted)}>
              {countdown.secondary}
            </div>
          </div>
        )}

        {/* Expired badge */}
        {urgencyLevel === "expired" && !isAutoSubmitted && (
          <div
            className={cn(
              "flex-shrink-0 text-center px-4 py-3 rounded-xl",
              "bg-red-200 dark:bg-red-900/80"
            )}
          >
            <div className="text-sm font-bold text-red-800 dark:text-red-100">EXPIRED</div>
          </div>
        )}

        {/* Auto-submitted badge */}
        {isAutoSubmitted && (
          <div
            className={cn(
              "flex-shrink-0 text-center px-4 py-3 rounded-xl",
              "bg-green-100 dark:bg-green-900/50"
            )}
          >
            <div className="text-sm font-bold text-green-800 dark:text-green-100">SUBMITTED</div>
          </div>
        )}
      </div>
    </div>
  );
}
