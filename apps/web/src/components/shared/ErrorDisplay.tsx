/**
 * ErrorDisplay Component
 *
 * Reusable component for displaying errors with proper styling and icons.
 * Follows the pattern established in LoginForm for consistent error UX.
 * Automatically adapts to light/dark mode using Tailwind's dark: variant.
 */

"use client";

import { AlertCircle, AlertTriangle, Clock, Lock, ServerCrash, ShieldAlert, WifiOff } from "lucide-react";
import { classifyError, type ErrorInfo } from "@/lib/error-utils";
import { cn } from "@/lib/utils";

interface ErrorDisplayProps {
  error: unknown;
  className?: string;
  /** @deprecated No longer needed - component auto-detects dark mode via Tailwind */
  isDarkMode?: boolean;
}

/**
 * Get the appropriate icon component for an error type
 */
function getIconComponent(errorType: ErrorInfo["type"]) {
  switch (errorType) {
    case "network":
      return WifiOff;
    case "server":
      return ServerCrash;
    case "auth":
      return Lock;
    case "validation":
      return AlertCircle;
    case "rate_limit":
      return Clock;
    case "permission":
      return ShieldAlert;
    default:
      return AlertTriangle;
  }
}

/**
 * Get styling classes based on error type with dark mode support
 */
function getErrorStyles(errorType: ErrorInfo["type"]) {
  switch (errorType) {
    case "network":
      return {
        container: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
        icon: "text-orange-500 dark:text-orange-400",
        title: "text-orange-700 dark:text-orange-300",
        message: "text-orange-600 dark:text-orange-400/80",
      };
    case "validation":
      return {
        container: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
        icon: "text-amber-500 dark:text-amber-400",
        title: "text-amber-700 dark:text-amber-300",
        message: "text-amber-600 dark:text-amber-400/80",
      };
    default:
      return {
        container: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
        icon: "text-red-500 dark:text-red-400",
        title: "text-red-700 dark:text-red-300",
        message: "text-red-600 dark:text-red-400/80",
      };
  }
}

/**
 * ErrorDisplay component shows structured error information with appropriate styling.
 * Automatically adapts to light/dark mode.
 *
 * @example
 * ```tsx
 * <ErrorDisplay error={mutationError} />
 * ```
 */
export function ErrorDisplay({ error, className }: ErrorDisplayProps) {
  if (!error) return null;

  const errorInfo = classifyError(error);
  const Icon = getIconComponent(errorInfo.type);
  const styles = getErrorStyles(errorInfo.type);

  return (
    <div
      className={cn(
        "rounded-md p-4 border",
        "transition-colors duration-200",
        "flex items-start gap-3",
        styles.container,
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Icon based on error type */}
      <Icon
        className={cn("w-5 h-5 flex-shrink-0 mt-0.5", styles.icon)}
        aria-hidden="true"
      />

      {/* Error content */}
      <div className="flex flex-col gap-0.5">
        <div className={cn("text-sm font-semibold", styles.title)}>
          {errorInfo.title}
        </div>
        <div className={cn("text-sm", styles.message)}>
          {errorInfo.message}
        </div>
      </div>
    </div>
  );
}
