/**
 * Completion Status Badge Component
 *
 * Displays completion status with consistent visual styling.
 * Type-safe: only accepts "complete" | "incomplete".
 *
 * IMPORTANT: Shows ONLY completion status (complete/incomplete).
 * This component must NEVER be used to display compliance status (PASS/FAIL/CONDITIONAL).
 */

interface CompletionStatusBadgeProps {
  status: "complete" | "incomplete";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function CompletionStatusBadge({
  status,
  size = "md",
  showIcon = false,
}: CompletionStatusBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  if (status === "complete") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 ${sizeClasses[size]}`}
      >
        {showIcon && (
          <svg
            className={iconSizes[size]}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        Complete
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${sizeClasses[size]}`}
    >
      {showIcon && (
        <svg
          className={iconSizes[size]}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}
      Incomplete
    </span>
  );
}
