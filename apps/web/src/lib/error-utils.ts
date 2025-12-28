/**
 * Shared Error Handling Utilities
 *
 * Provides consistent error classification and messaging across the frontend.
 * Distinguishes between network errors, server errors, authentication errors, etc.
 */

export interface ErrorInfo {
  type: "network" | "server" | "auth" | "validation" | "rate_limit" | "permission" | "unknown";
  title: string;
  message: string;
}

/**
 * Classify an error and return structured information for display
 *
 * @param error - The error object from axios or other HTTP client
 * @returns Structured error information with type, title, and message
 */
export function classifyError(error: unknown): ErrorInfo {
  // Handle null or undefined errors
  if (!error) {
    return {
      type: "unknown",
      title: "Something went wrong",
      message: "An unexpected error occurred. Please try again.",
    };
  }

  const err = error as {
    response?: {
      status?: number;
      data?: {
        detail?: string | { message?: string } | Array<{ msg?: string }>;
      };
    };
    message?: string;
    code?: string;
  };

  // Network/Connection Errors - server unreachable
  if (
    err.message === "Network Error" ||
    err.message?.includes("Failed to fetch") ||
    err.message?.includes("fetch failed") ||
    err.code === "ERR_NETWORK" ||
    err.code === "ECONNREFUSED"
  ) {
    return {
      type: "network",
      title: "Unable to connect to server",
      message: "The server may be down or unreachable. Please check your connection and try again.",
    };
  }

  // Rate Limiting (429)
  if (err.response?.status === 429) {
    return {
      type: "rate_limit",
      title: "Too many requests",
      message: "Please wait a moment before trying again.",
    };
  }

  // Server Errors (500+)
  if (err.response?.status && err.response.status >= 500) {
    return {
      type: "server",
      title: "Server error",
      message: "Something went wrong on our end. Please try again later.",
    };
  }

  // Authentication Errors (401)
  if (err.response?.status === 401 || err.message?.includes("401")) {
    return {
      type: "auth",
      title: "Authentication failed",
      message: "Your session may have expired. Please log in again.",
    };
  }

  // Permission Errors (403)
  if (err.response?.status === 403) {
    return {
      type: "permission",
      title: "Access denied",
      message: "You do not have permission to perform this action.",
    };
  }

  // Validation Errors (400, 422) - extract meaningful details
  if (err.response?.status === 400 || err.response?.status === 422) {
    const detail = err.response?.data?.detail;

    // Handle array of validation errors (FastAPI validation)
    if (Array.isArray(detail)) {
      const messages = detail.map((d: { msg?: string }) => d.msg || "Validation error").join(", ");
      return {
        type: "validation",
        title: "Validation failed",
        message: messages,
      };
    }

    // Handle object with message property
    if (typeof detail === "object" && detail !== null && "message" in detail) {
      return {
        type: "validation",
        title: "Validation failed",
        message: String(detail.message),
      };
    }

    // Handle string detail
    if (typeof detail === "string") {
      return {
        type: "validation",
        title: "Validation failed",
        message: detail,
      };
    }

    return {
      type: "validation",
      title: "Validation failed",
      message: "Please check your input and try again.",
    };
  }

  // Default fallback - extract whatever error message is available
  const detail = err.response?.data?.detail;
  let message = "An unexpected error occurred. Please try again.";

  if (typeof detail === "string") {
    message = detail;
  } else if (typeof detail === "object" && detail !== null && "message" in detail) {
    message = String(detail.message);
  } else if (err.message) {
    message = err.message;
  }

  return {
    type: "unknown",
    title: "Something went wrong",
    message,
  };
}

/**
 * Get an icon name for an error type (for use with lucide-react)
 *
 * @param errorType - The error type from classifyError
 * @returns Icon name string
 */
export function getErrorIcon(errorType: ErrorInfo["type"]): string {
  switch (errorType) {
    case "network":
      return "WifiOff";
    case "server":
      return "ServerCrash";
    case "auth":
      return "Lock";
    case "validation":
      return "AlertCircle";
    case "rate_limit":
      return "Clock";
    case "permission":
      return "ShieldAlert";
    default:
      return "AlertTriangle";
  }
}

/**
 * Get color class for an error type (for Tailwind CSS)
 *
 * @param errorType - The error type from classifyError
 * @param variant - "bg" | "text" | "border"
 * @returns Tailwind color class string
 */
export function getErrorColor(
  errorType: ErrorInfo["type"],
  variant: "bg" | "text" | "border" = "text"
): string {
  const colorMap = {
    network: "orange",
    server: "red",
    auth: "red",
    validation: "amber",
    rate_limit: "yellow",
    permission: "red",
    unknown: "red",
  };

  const color = colorMap[errorType] || "red";

  switch (variant) {
    case "bg":
      return `bg-${color}-50 dark:bg-${color}-950/20`;
    case "border":
      return `border-${color}-200 dark:border-${color}-900`;
    case "text":
    default:
      return `text-${color}-600 dark:text-${color}-400`;
  }
}

/**
 * Extract a simple error message string from any error object
 * Useful for quick error display in toasts or simple error states
 *
 * @param error - The error object
 * @returns A single error message string
 */
export function getErrorMessage(error: unknown): string {
  return classifyError(error).message;
}

/**
 * Check if an error is a network error (server unreachable)
 *
 * @param error - The error object
 * @returns True if this is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return classifyError(error).type === "network";
}

/**
 * Check if an error is an authentication error (401)
 *
 * @param error - The error object
 * @returns True if this is an auth error
 */
export function isAuthError(error: unknown): boolean {
  return classifyError(error).type === "auth";
}

/**
 * Check if an error is a validation error (400, 422)
 *
 * @param error - The error object
 * @returns True if this is a validation error
 */
export function isValidationError(error: unknown): boolean {
  return classifyError(error).type === "validation";
}
