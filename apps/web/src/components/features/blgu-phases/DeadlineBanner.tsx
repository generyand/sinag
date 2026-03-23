"use client";

import { useMemo } from "react";
import { AlertCircle, AlertTriangle, CalendarClock, Clock } from "lucide-react";
import {
  getGracePeriodMessage,
  getLockMessage,
  getLockReasonLabel,
  hasActiveGracePeriod,
} from "@/lib/assessment-locks";
import { cn } from "@/lib/utils";

type BannerMode = "normal" | "warning" | "urgent" | "critical" | "expired" | "reopened" | "locked";

interface DeadlineBannerProps {
  phase1Deadline: string | null;
  daysRemaining: number | null;
  urgencyLevel: "normal" | "warning" | "urgent" | "critical" | "expired" | null;
  assessmentStatus: string;
  isAutoSubmitted: boolean;
  isLockedForBlgu?: boolean | null;
  lockReason?: string | null;
  gracePeriodExpiresAt?: string | null;
}

const bannerConfig: Record<
  BannerMode,
  {
    container: string;
    text: string;
    textMuted: string;
    badge: string;
    icon: typeof Clock;
  }
> = {
  normal: {
    container: "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-200",
    textMuted: "text-slate-600 dark:text-slate-400",
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200",
    icon: Clock,
  },
  warning: {
    container: "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700",
    text: "text-amber-800 dark:text-amber-100",
    textMuted: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-100",
    icon: Clock,
  },
  urgent: {
    container: "bg-orange-50 dark:bg-orange-950/30 border-orange-400 dark:border-orange-600",
    text: "text-orange-800 dark:text-orange-100",
    textMuted: "text-orange-700 dark:text-orange-300",
    badge: "bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-100",
    icon: AlertTriangle,
  },
  critical: {
    container: "bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-600",
    text: "text-red-800 dark:text-red-100",
    textMuted: "text-red-700 dark:text-red-300",
    badge: "bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-100",
    icon: AlertCircle,
  },
  expired: {
    container: "bg-red-100 dark:bg-red-950/40 border-red-500 dark:border-red-500",
    text: "text-red-900 dark:text-red-100",
    textMuted: "text-red-800 dark:text-red-200",
    badge: "bg-red-200 dark:bg-red-900/80 text-red-900 dark:text-red-100",
    icon: AlertCircle,
  },
  reopened: {
    container: "bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-700",
    text: "text-sky-800 dark:text-sky-100",
    textMuted: "text-sky-700 dark:text-sky-300",
    badge: "bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-100",
    icon: Clock,
  },
  locked: {
    container: "bg-slate-100 dark:bg-slate-900/40 border-slate-400 dark:border-slate-600",
    text: "text-slate-900 dark:text-slate-100",
    textMuted: "text-slate-700 dark:text-slate-300",
    badge: "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100",
    icon: AlertCircle,
  },
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTimeRemaining(target: string): { days: number; hours: number; minutes: number } {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
  };
}

function getCountdownText(days: number, hours: number, mode: BannerMode) {
  if (mode === "expired" || mode === "locked") {
    return { primary: "Expired", secondary: "" };
  }

  if (days === 0) {
    if (hours === 0) {
      return { primary: "< 1", secondary: "hour left" };
    }
    return { primary: String(hours), secondary: hours === 1 ? "hour left" : "hours left" };
  }

  if (days <= 3) {
    return {
      primary: String(days),
      secondary: `day${days !== 1 ? "s" : ""}${hours > 0 ? `, ${hours}h` : ""} left`,
    };
  }

  return { primary: String(days), secondary: "days left" };
}

export function DeadlineBanner({
  phase1Deadline,
  daysRemaining,
  urgencyLevel,
  assessmentStatus,
  isAutoSubmitted,
  isLockedForBlgu = false,
  lockReason,
  gracePeriodExpiresAt,
}: DeadlineBannerProps) {
  const isGracePeriodActive = hasActiveGracePeriod({
    is_locked_for_blgu: isLockedForBlgu,
    grace_period_expires_at: gracePeriodExpiresAt,
  });
  const countdownTarget = isGracePeriodActive ? gracePeriodExpiresAt : phase1Deadline;
  const timeRemaining = useMemo(
    () => (countdownTarget ? getTimeRemaining(countdownTarget) : { days: 0, hours: 0, minutes: 0 }),
    [countdownTarget]
  );

  if (
    !isLockedForBlgu &&
    !isGracePeriodActive &&
    (!phase1Deadline || !urgencyLevel || urgencyLevel === "normal")
  ) {
    return null;
  }

  if (
    !isLockedForBlgu &&
    !isGracePeriodActive &&
    assessmentStatus !== "DRAFT" &&
    urgencyLevel !== "expired"
  ) {
    return null;
  }

  const mode: BannerMode = isGracePeriodActive
    ? "reopened"
    : isLockedForBlgu
      ? lockReason === "mlgoo_manual_lock"
        ? "locked"
        : "expired"
      : urgencyLevel!;

  const config = bannerConfig[mode];
  const Icon = config.icon;
  const countdown = getCountdownText(timeRemaining.days, timeRemaining.hours, mode);

  const headline = isLockedForBlgu
    ? getLockReasonLabel(lockReason)
    : isGracePeriodActive
      ? "Editing Reopened"
      : isAutoSubmitted
        ? "Assessment Auto-Submitted"
        : mode === "expired"
          ? "Deadline Has Passed"
          : mode === "critical"
            ? timeRemaining.days === 0
              ? "Final Hours"
              : "Last Day to Submit"
            : mode === "urgent"
              ? "Submit Soon"
              : "Deadline Approaching";

  const message = isLockedForBlgu
    ? getLockMessage(lockReason)
    : isGracePeriodActive
      ? getGracePeriodMessage(gracePeriodExpiresAt)
      : isAutoSubmitted
        ? "Your assessment was automatically submitted under the legacy workflow."
        : mode === "expired"
          ? "The deadline has passed. Editing stays disabled until MLGOO reopens this assessment."
          : mode === "critical"
            ? "Only a short time remains before editing locks automatically."
            : "Complete and submit your assessment before the deadline.";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 mb-4",
        config.container,
        mode === "critical" && "animate-pulse"
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-4 p-4">
        <div className="flex-shrink-0 rounded-full bg-white/70 p-2.5 dark:bg-black/10">
          <Icon className={cn("h-6 w-6", config.text)} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className={cn("text-lg font-bold", config.text)}>{headline}</h3>
          <p className={cn("mt-0.5 text-sm", config.textMuted)}>{message}</p>

          {countdownTarget && !isLockedForBlgu && (
            <div className={cn("mt-2 flex items-center gap-1.5 text-xs", config.textMuted)}>
              <CalendarClock className="h-3.5 w-3.5" />
              <span>
                {isGracePeriodActive ? "Grace period ends: " : "Deadline: "}
                {formatDateTime(countdownTarget)}
              </span>
            </div>
          )}

          {isLockedForBlgu && gracePeriodExpiresAt && (
            <div className={cn("mt-2 flex items-center gap-1.5 text-xs", config.textMuted)}>
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Last grace period ended: {formatDateTime(gracePeriodExpiresAt)}</span>
            </div>
          )}
        </div>

        {!isLockedForBlgu && !isAutoSubmitted && countdownTarget && mode !== "expired" && (
          <div
            className={cn(
              "min-w-[80px] flex-shrink-0 rounded-xl px-4 py-2 text-center",
              config.badge
            )}
          >
            <div className="text-2xl font-bold leading-none">{countdown.primary}</div>
            <div className="mt-0.5 text-xs font-medium">{countdown.secondary}</div>
          </div>
        )}
      </div>
    </div>
  );
}
