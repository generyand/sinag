// 🔔 Toast Utility Functions
// Helper functions for displaying user-friendly notifications

import { toast as sonnerToast } from "sonner";

type ToastType = "success" | "error" | "warning" | "info" | "loading";

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Display a success toast notification
 */
export function showSuccess(message: string, options?: ToastOptions) {
  return sonnerToast.success(message, {
    description: options?.description,
    duration: options?.duration,
    action: options?.action,
  });
}

/**
 * Display an error toast notification
 */
export function showError(message: string, options?: ToastOptions) {
  return sonnerToast.error(message, {
    description: options?.description,
    duration: options?.duration || 6000, // Errors stay longer
    action: options?.action,
  });
}

/**
 * Display a warning toast notification
 */
export function showWarning(message: string, options?: ToastOptions) {
  return sonnerToast.warning(message, {
    description: options?.description,
    duration: options?.duration,
    action: options?.action,
  });
}

/**
 * Display an info toast notification
 */
export function showInfo(message: string, options?: ToastOptions) {
  return sonnerToast.info(message, {
    description: options?.description,
    duration: options?.duration,
    action: options?.action,
  });
}

/**
 * Display a loading toast notification
 * Returns a function to dismiss the toast
 */
export function showLoading(message: string, options?: Omit<ToastOptions, "duration">) {
  const toastId = sonnerToast.loading(message, {
    description: options?.description,
  });

  return () => sonnerToast.dismiss(toastId);
}

/**
 * Display a promise toast that shows loading, success, and error states
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) {
  return sonnerToast.promise(promise, messages);
}

// Error message mapping for common API errors
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  "Invalid credentials": "Invalid email or password. Please try again.",
  "User not found": "No account found with this email address.",
  "Email already exists": "An account with this email already exists.",
  "Token expired": "Your session has expired. Please log in again.",
  "Invalid token": "Your session is invalid. Please log in again.",

  // Authorization errors
  "Not enough permissions": "You do not have permission to perform this action.",
  Forbidden: "Access denied. You do not have the required permissions.",

  // Validation errors
  "Validation error": "Please check your input and try again.",
  "Required field missing": "Please fill in all required fields.",

  // Server errors
  "Internal server error": "Something went wrong on our end. Please try again later.",
  "Service unavailable": "The service is temporarily unavailable. Please try again later.",
  "Network error": "Unable to connect to the server. Please check your internet connection.",

  // Rate limiting
  "Rate limit exceeded": "Too many requests. Please wait a moment and try again.",
  "Too many requests": "You've made too many requests. Please slow down.",
};

/**
 * Get user-friendly error message from error object
 */
export function getErrorMessage(error: any): string {
  // Check if error has a response (Axios error)
  if (error?.response?.data?.detail) {
    const detail = error.response.data.detail;

    // Check if we have a friendly message for this error
    for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
      if (detail.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }

    // Return the detail if it's user-friendly
    if (typeof detail === "string") {
      return detail;
    }
  }

  // Check for network errors
  if (error?.message === "Network Error" || error?.code === "ERR_NETWORK") {
    return ERROR_MESSAGES["Network error"];
  }

  // Check for timeout errors
  if (error?.code === "ECONNABORTED") {
    return "The request took too long. Please try again.";
  }

  // Check for status codes
  if (error?.response?.status) {
    const status = error.response.status;

    switch (status) {
      case 400:
        return "Invalid request. Please check your input.";
      case 401:
        return "You need to log in to continue.";
      case 403:
        return ERROR_MESSAGES["Forbidden"];
      case 404:
        return "The requested resource was not found.";
      case 409:
        return "A conflict occurred. The resource may already exist.";
      case 422:
        return ERROR_MESSAGES["Validation error"];
      case 429:
        return ERROR_MESSAGES["Rate limit exceeded"];
      case 500:
        return ERROR_MESSAGES["Internal server error"];
      case 503:
        return ERROR_MESSAGES["Service unavailable"];
      default:
        return `An error occurred (${status}). Please try again.`;
    }
  }

  // Fallback to generic error message
  return error?.message || "An unexpected error occurred. Please try again.";
}

/**
 * Show an error toast with user-friendly message
 */
export function showApiError(error: any, fallbackMessage?: string) {
  const message = getErrorMessage(error);
  return showError(fallbackMessage || message);
}

/**
 * Dismiss a specific toast
 */
export function dismissToast(toastId: string | number) {
  sonnerToast.dismiss(toastId);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  sonnerToast.dismiss();
}

// Export the original toast for advanced use cases
export { sonnerToast as toast };
