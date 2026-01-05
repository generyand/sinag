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

import { AlertCircle, Clock, AlertTriangle } from "lucide-react";
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
    bg: "bg-gray-50 dark:bg-gray-900/20",
    border: "border-gray-200 dark:border-gray-700",
    text: "text-gray-800 dark:text-gray-200",
    icon: Clock,
    title: "Submission Deadline",
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
    border: "border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-800 dark:text-yellow-200",
    icon: Clock,
    title: "Deadline Approaching",
  },
  urgent: {
    bg: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-200 dark:border-orange-800",
    text: "text-orange-800 dark:text-orange-200",
    icon: AlertTriangle,
    title: "Urgent: Submit Soon",
  },
  critical: {
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-800 dark:text-red-200",
    icon: AlertCircle,
    title: "Final Warning",
  },
  expired: {
    bg: "bg-red-100 dark:bg-red-950/30",
    border: "border-red-300 dark:border-red-700",
    text: "text-red-900 dark:text-red-100",
    icon: AlertCircle,
    title: "Deadline Passed",
  },
};

function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  return date.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDaysText(days: number): string {
  if (days < 0) {
    const absDays = Math.abs(days);
    return absDays === 1 ? "1 day ago" : `${absDays} days ago`;
  }
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function DeadlineBanner({
  phase1Deadline,
  daysRemaining,
  urgencyLevel,
  assessmentStatus,
  isAutoSubmitted,
}: DeadlineBannerProps) {
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

  // Build the message based on status
  let message: string;
  if (isAutoSubmitted) {
    message =
      "Your assessment was automatically submitted when the deadline passed. It is now queued for assessor review.";
  } else if (urgencyLevel === "expired") {
    message = "The submission deadline has passed. Your assessment will be auto-submitted shortly.";
  } else if (daysRemaining !== null) {
    const daysText = getDaysText(daysRemaining);
    if (urgencyLevel === "critical") {
      message = `You have ${daysText} left to submit your assessment. If not submitted, it will be automatically submitted at the deadline.`;
    } else if (urgencyLevel === "urgent") {
      message = `Only ${daysText} remaining to complete and submit your assessment.`;
    } else {
      message = `${daysText} remaining until the submission deadline.`;
    }
  } else {
    message = "Please complete and submit your assessment before the deadline.";
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4 mb-4",
        config.bg,
        config.border,
        urgencyLevel === "critical" && "animate-pulse"
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.text)} aria-hidden="true" />
        <div className="flex-1">
          <h3 className={cn("font-semibold", config.text)}>{config.title}</h3>
          <p className={cn("text-sm mt-1", config.text)}>{message}</p>
          {phase1Deadline && !isAutoSubmitted && (
            <p className={cn("text-xs mt-2 opacity-80", config.text)}>
              Deadline: {formatDeadline(phase1Deadline)}
            </p>
          )}
        </div>
        {daysRemaining !== null && daysRemaining >= 0 && !isAutoSubmitted && (
          <div
            className={cn(
              "flex-shrink-0 text-right px-3 py-1 rounded-full",
              urgencyLevel === "warning" && "bg-yellow-100 dark:bg-yellow-900/40",
              urgencyLevel === "urgent" && "bg-orange-100 dark:bg-orange-900/40",
              urgencyLevel === "critical" && "bg-red-100 dark:bg-red-900/40"
            )}
          >
            <span className={cn("text-2xl font-bold", config.text)}>{daysRemaining}</span>
            <span className={cn("text-xs block", config.text)}>
              {daysRemaining === 1 ? "day" : "days"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
