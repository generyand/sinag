/**
 * ErrorDisplay Component
 *
 * Reusable component for displaying errors with proper styling and icons.
 * Follows the pattern established in LoginForm for consistent error UX.
 */

"use client";

import { AlertCircle, AlertTriangle, Clock, Lock, ServerCrash, ShieldAlert, WifiOff } from "lucide-react";
import { classifyError, type ErrorInfo } from "@/lib/error-utils";
import { cn } from "@/lib/utils";

interface ErrorDisplayProps {
  error: unknown;
  className?: string;
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
 * ErrorDisplay component shows structured error information with appropriate styling
 *
 * @example
 * ```tsx
 * <ErrorDisplay error={mutationError} />
 * ```
 */
export function ErrorDisplay({ error, className, isDarkMode = false }: ErrorDisplayProps) {
  if (!error) return null;

  const errorInfo = classifyError(error);
  const Icon = getIconComponent(errorInfo.type);

  // Network errors get orange color, all others get red
  const isNetworkError = errorInfo.type === "network";
  const isValidationError = errorInfo.type === "validation";

  return (
    <div
      className={cn(
        "rounded-md p-4",
        "transition-colors duration-200",
        "flex items-start gap-3",
        isNetworkError
          ? isDarkMode
            ? "bg-orange-900/10 border border-orange-500/20"
            : "bg-orange-50 border border-orange-200"
          : isValidationError
            ? isDarkMode
              ? "bg-amber-900/10 border border-amber-500/20"
              : "bg-amber-50 border border-amber-200"
            : isDarkMode
              ? "bg-red-900/10 border border-red-500/20"
              : "bg-red-50 border border-red-200",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Icon based on error type */}
      <Icon
        className={cn(
          "w-5 h-5 flex-shrink-0 mt-0.5",
          isNetworkError
            ? isDarkMode
              ? "text-orange-400"
              : "text-orange-500"
            : isValidationError
              ? isDarkMode
                ? "text-amber-400"
                : "text-amber-500"
              : isDarkMode
                ? "text-red-400"
                : "text-red-500"
        )}
        aria-hidden="true"
      />

      {/* Error content */}
      <div className="flex flex-col gap-0.5">
        <div
          className={cn(
            "text-sm font-semibold",
            isNetworkError
              ? isDarkMode
                ? "text-orange-400"
                : "text-orange-700"
              : isValidationError
                ? isDarkMode
                  ? "text-amber-400"
                  : "text-amber-700"
                : isDarkMode
                  ? "text-red-400"
                  : "text-red-700"
          )}
        >
          {errorInfo.title}
        </div>
        <div
          className={cn(
            "text-sm",
            isNetworkError
              ? isDarkMode
                ? "text-orange-300/80"
                : "text-orange-600"
              : isValidationError
                ? isDarkMode
                  ? "text-amber-300/80"
                  : "text-amber-600"
                : isDarkMode
                  ? "text-red-300/80"
                  : "text-red-600"
          )}
        >
          {errorInfo.message}
        </div>
      </div>
    </div>
  );
}
