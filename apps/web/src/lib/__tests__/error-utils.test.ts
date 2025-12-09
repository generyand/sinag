/**
 * Tests for Error Handling Utilities
 *
 * Verifies that the classifyError function correctly:
 * - Identifies different error types (network, server, auth, validation, etc.)
 * - Returns user-friendly error messages without technical jargon
 * - Handles edge cases (null, undefined, empty objects)
 * - Extracts error details from various error formats (Axios, FastAPI)
 */

import { describe, it, expect } from "vitest";
import {
  classifyError,
  getErrorIcon,
  getErrorColor,
  getErrorMessage,
  isNetworkError,
  isAuthError,
  isValidationError,
  type ErrorInfo,
} from "../error-utils";

describe("classifyError", () => {
  describe("Network Errors", () => {
    it("should identify network error from 'Network Error' message", () => {
      const error = { message: "Network Error" };
      const result = classifyError(error);

      expect(result.type).toBe("network");
      expect(result.title).toBe("Unable to connect to server");
      expect(result.message).toContain("server may be down");
    });

    it("should identify network error from 'Failed to fetch' message", () => {
      const error = { message: "Failed to fetch" };
      const result = classifyError(error);

      expect(result.type).toBe("network");
      expect(result.title).toBe("Unable to connect to server");
    });

    it("should identify network error from 'fetch failed' message", () => {
      const error = { message: "fetch failed" };
      const result = classifyError(error);

      expect(result.type).toBe("network");
    });

    it("should identify network error from ERR_NETWORK code", () => {
      const error = { code: "ERR_NETWORK" };
      const result = classifyError(error);

      expect(result.type).toBe("network");
      expect(result.title).toBe("Unable to connect to server");
    });

    it("should identify network error from ECONNREFUSED code", () => {
      const error = { code: "ECONNREFUSED" };
      const result = classifyError(error);

      expect(result.type).toBe("network");
    });

    it("should not contain technical jargon in network error messages", () => {
      const error = { message: "Network Error" };
      const result = classifyError(error);

      // Should not contain terms like "ECONNREFUSED", "ERR_NETWORK", etc.
      expect(result.message).not.toMatch(/ERR_|ECONN/);
      expect(result.message.toLowerCase()).toContain("server");
    });
  });

  describe("Server Errors (5xx)", () => {
    it("should identify 500 Internal Server Error", () => {
      const error = { response: { status: 500 } };
      const result = classifyError(error);

      expect(result.type).toBe("server");
      expect(result.title).toBe("Server error");
      expect(result.message).toContain("Something went wrong on our end");
    });

    it("should identify 502 Bad Gateway", () => {
      const error = { response: { status: 502 } };
      const result = classifyError(error);

      expect(result.type).toBe("server");
    });

    it("should identify 503 Service Unavailable", () => {
      const error = { response: { status: 503 } };
      const result = classifyError(error);

      expect(result.type).toBe("server");
    });

    it("should identify 504 Gateway Timeout", () => {
      const error = { response: { status: 504 } };
      const result = classifyError(error);

      expect(result.type).toBe("server");
    });

    it("should not contain technical jargon in server error messages", () => {
      const error = { response: { status: 500 } };
      const result = classifyError(error);

      // Should not contain technical terms
      expect(result.message).not.toMatch(/500|HTTP|status code/i);
      // Should use user-friendly language
      expect(result.message.toLowerCase()).toMatch(/went wrong|try again/);
    });
  });

  describe("Authentication Errors (401)", () => {
    it("should identify 401 status code", () => {
      const error = { response: { status: 401 } };
      const result = classifyError(error);

      expect(result.type).toBe("auth");
      expect(result.title).toBe("Authentication failed");
      expect(result.message).toContain("session may have expired");
    });

    it("should identify '401' in error message", () => {
      const error = { message: "Request failed with status code 401" };
      const result = classifyError(error);

      expect(result.type).toBe("auth");
      expect(result.title).toBe("Authentication failed");
    });

    it("should not contain technical jargon in auth error messages", () => {
      const error = { response: { status: 401 } };
      const result = classifyError(error);

      // Should not contain "401", "unauthorized", etc.
      expect(result.message).not.toMatch(/401|unauthorized/i);
      expect(result.message.toLowerCase()).toContain("log in");
    });
  });

  describe("Permission Errors (403)", () => {
    it("should identify 403 Forbidden status", () => {
      const error = { response: { status: 403 } };
      const result = classifyError(error);

      expect(result.type).toBe("permission");
      expect(result.title).toBe("Access denied");
      expect(result.message).toContain("do not have permission");
    });

    it("should not contain technical jargon in permission error messages", () => {
      const error = { response: { status: 403 } };
      const result = classifyError(error);

      expect(result.message).not.toMatch(/403|forbidden/i);
      expect(result.message.toLowerCase()).toContain("permission");
    });
  });

  describe("Validation Errors (400, 422)", () => {
    it("should identify 400 Bad Request", () => {
      const error = { response: { status: 400 } };
      const result = classifyError(error);

      expect(result.type).toBe("validation");
      expect(result.title).toBe("Validation failed");
    });

    it("should identify 422 Unprocessable Entity", () => {
      const error = { response: { status: 422 } };
      const result = classifyError(error);

      expect(result.type).toBe("validation");
      expect(result.title).toBe("Validation failed");
    });

    it("should extract string detail from validation error", () => {
      const error = {
        response: {
          status: 422,
          data: {
            detail: "Email is required",
          },
        },
      };
      const result = classifyError(error);

      expect(result.type).toBe("validation");
      expect(result.message).toBe("Email is required");
    });

    it("should extract message from object detail", () => {
      const error = {
        response: {
          status: 422,
          data: {
            detail: {
              message: "Password is too short",
            },
          },
        },
      };
      const result = classifyError(error);

      expect(result.type).toBe("validation");
      expect(result.message).toBe("Password is too short");
    });

    it("should extract and join messages from FastAPI validation array", () => {
      const error = {
        response: {
          status: 422,
          data: {
            detail: [{ msg: "Field 'email' is required" }, { msg: "Field 'password' is required" }],
          },
        },
      };
      const result = classifyError(error);

      expect(result.type).toBe("validation");
      expect(result.message).toContain("Field 'email' is required");
      expect(result.message).toContain("Field 'password' is required");
    });

    it("should handle validation array with missing msg fields", () => {
      const error = {
        response: {
          status: 422,
          data: {
            detail: [{}, { msg: "Valid error" }],
          },
        },
      };
      const result = classifyError(error);

      expect(result.type).toBe("validation");
      expect(result.message).toContain("Validation error");
      expect(result.message).toContain("Valid error");
    });

    it("should provide default message when no detail available", () => {
      const error = { response: { status: 422 } };
      const result = classifyError(error);

      expect(result.type).toBe("validation");
      expect(result.message).toBe("Please check your input and try again.");
    });
  });

  describe("Rate Limiting Errors (429)", () => {
    it("should identify 429 Too Many Requests", () => {
      const error = { response: { status: 429 } };
      const result = classifyError(error);

      expect(result.type).toBe("rate_limit");
      expect(result.title).toBe("Too many requests");
      expect(result.message).toContain("wait a moment");
    });

    it("should not contain technical jargon in rate limit messages", () => {
      const error = { response: { status: 429 } };
      const result = classifyError(error);

      expect(result.message).not.toMatch(/429|rate limit/i);
    });
  });

  describe("Unknown Errors", () => {
    it("should classify errors without status as unknown", () => {
      const error = { message: "Something unexpected happened" };
      const result = classifyError(error);

      expect(result.type).toBe("unknown");
      expect(result.title).toBe("Something went wrong");
    });

    it("should extract error message if available", () => {
      const error = { message: "Custom error message" };
      const result = classifyError(error);

      expect(result.type).toBe("unknown");
      expect(result.message).toBe("Custom error message");
    });

    it("should extract string detail from response data", () => {
      const error = {
        response: {
          status: 418,
          data: {
            detail: "I'm a teapot",
          },
        },
      };
      const result = classifyError(error);

      expect(result.type).toBe("unknown");
      expect(result.message).toBe("I'm a teapot");
    });

    it("should extract message from object detail", () => {
      const error = {
        response: {
          status: 418,
          data: {
            detail: {
              message: "Custom message",
            },
          },
        },
      };
      const result = classifyError(error);

      expect(result.type).toBe("unknown");
      expect(result.message).toBe("Custom message");
    });

    it("should provide default message when nothing is available", () => {
      const error = {};
      const result = classifyError(error);

      expect(result.type).toBe("unknown");
      expect(result.message).toBe("An unexpected error occurred. Please try again.");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null error", () => {
      const result = classifyError(null);

      expect(result.type).toBe("unknown");
      expect(result.title).toBe("Something went wrong");
      expect(result.message).toBe("An unexpected error occurred. Please try again.");
    });

    it("should handle undefined error", () => {
      const result = classifyError(undefined);

      expect(result.type).toBe("unknown");
      expect(result.title).toBe("Something went wrong");
    });

    it("should handle empty object", () => {
      const result = classifyError({});

      expect(result.type).toBe("unknown");
    });

    it("should handle string error", () => {
      const result = classifyError("Something went wrong");

      expect(result.type).toBe("unknown");
    });

    it("should handle Error instance", () => {
      const error = new Error("Test error");
      const result = classifyError(error);

      expect(result.type).toBe("unknown");
      expect(result.message).toBe("Test error");
    });

    it("should handle error with null response", () => {
      const error = { response: null, message: "No response" };
      const result = classifyError(error);

      expect(result.type).toBe("unknown");
      expect(result.message).toBe("No response");
    });

    it("should handle error with undefined status", () => {
      const error = { response: { status: undefined } };
      const result = classifyError(error);

      expect(result.type).toBe("unknown");
    });
  });

  describe("Error Priority and Precedence", () => {
    it("should prioritize network errors over status codes", () => {
      const error = {
        message: "Network Error",
        response: { status: 500 },
      };
      const result = classifyError(error);

      // Network error should take precedence
      expect(result.type).toBe("network");
    });

    it("should prioritize rate limit (429) over server errors", () => {
      const error = {
        response: { status: 429 },
        message: "Server Error",
      };
      const result = classifyError(error);

      // 429 should be identified before falling through to unknown
      expect(result.type).toBe("rate_limit");
    });
  });
});

describe("getErrorIcon", () => {
  it("should return WifiOff for network errors", () => {
    expect(getErrorIcon("network")).toBe("WifiOff");
  });

  it("should return ServerCrash for server errors", () => {
    expect(getErrorIcon("server")).toBe("ServerCrash");
  });

  it("should return Lock for auth errors", () => {
    expect(getErrorIcon("auth")).toBe("Lock");
  });

  it("should return AlertCircle for validation errors", () => {
    expect(getErrorIcon("validation")).toBe("AlertCircle");
  });

  it("should return Clock for rate limit errors", () => {
    expect(getErrorIcon("rate_limit")).toBe("Clock");
  });

  it("should return ShieldAlert for permission errors", () => {
    expect(getErrorIcon("permission")).toBe("ShieldAlert");
  });

  it("should return AlertTriangle for unknown errors", () => {
    expect(getErrorIcon("unknown")).toBe("AlertTriangle");
  });
});

describe("getErrorColor", () => {
  it("should return orange colors for network errors", () => {
    expect(getErrorColor("network", "text")).toContain("orange");
    expect(getErrorColor("network", "bg")).toContain("orange");
    expect(getErrorColor("network", "border")).toContain("orange");
  });

  it("should return amber colors for validation errors", () => {
    expect(getErrorColor("validation", "text")).toContain("amber");
    expect(getErrorColor("validation", "bg")).toContain("amber");
    expect(getErrorColor("validation", "border")).toContain("amber");
  });

  it("should return yellow colors for rate limit errors", () => {
    expect(getErrorColor("rate_limit", "text")).toContain("yellow");
    expect(getErrorColor("rate_limit", "bg")).toContain("yellow");
    expect(getErrorColor("rate_limit", "border")).toContain("yellow");
  });

  it("should return red colors for server errors", () => {
    expect(getErrorColor("server", "text")).toContain("red");
    expect(getErrorColor("server", "bg")).toContain("red");
    expect(getErrorColor("server", "border")).toContain("red");
  });

  it("should return red colors for auth errors", () => {
    expect(getErrorColor("auth", "text")).toContain("red");
  });

  it("should return red colors for permission errors", () => {
    expect(getErrorColor("permission", "text")).toContain("red");
  });

  it("should return red colors for unknown errors", () => {
    expect(getErrorColor("unknown", "text")).toContain("red");
  });

  it("should default to text variant when not specified", () => {
    const result = getErrorColor("network");
    expect(result).toContain("text-orange");
  });

  it("should include dark mode variants for bg", () => {
    const result = getErrorColor("server", "bg");
    expect(result).toContain("dark:");
  });

  it("should include dark mode variants for border", () => {
    const result = getErrorColor("auth", "border");
    expect(result).toContain("dark:");
  });

  it("should include dark mode variants for text", () => {
    const result = getErrorColor("validation", "text");
    expect(result).toContain("dark:");
  });
});

describe("getErrorMessage", () => {
  it("should extract message from network error", () => {
    const error = { message: "Network Error" };
    const message = getErrorMessage(error);

    expect(message).toBe(
      "The server may be down or unreachable. Please check your connection and try again."
    );
  });

  it("should extract message from validation error with detail", () => {
    const error = {
      response: {
        status: 422,
        data: {
          detail: "Email is invalid",
        },
      },
    };
    const message = getErrorMessage(error);

    expect(message).toBe("Email is invalid");
  });

  it("should return default message for empty error", () => {
    const message = getErrorMessage({});
    expect(message).toBe("An unexpected error occurred. Please try again.");
  });
});

describe("isNetworkError", () => {
  it("should return true for network errors", () => {
    const error = { message: "Network Error" };
    expect(isNetworkError(error)).toBe(true);
  });

  it("should return false for non-network errors", () => {
    const error = { response: { status: 500 } };
    expect(isNetworkError(error)).toBe(false);
  });
});

describe("isAuthError", () => {
  it("should return true for 401 errors", () => {
    const error = { response: { status: 401 } };
    expect(isAuthError(error)).toBe(true);
  });

  it("should return false for non-auth errors", () => {
    const error = { response: { status: 500 } };
    expect(isAuthError(error)).toBe(false);
  });
});

describe("isValidationError", () => {
  it("should return true for 422 errors", () => {
    const error = { response: { status: 422 } };
    expect(isValidationError(error)).toBe(true);
  });

  it("should return true for 400 errors", () => {
    const error = { response: { status: 400 } };
    expect(isValidationError(error)).toBe(true);
  });

  it("should return false for non-validation errors", () => {
    const error = { response: { status: 500 } };
    expect(isValidationError(error)).toBe(false);
  });
});

describe("User-Friendly Message Verification", () => {
  const technicalJargon = [
    "500",
    "401",
    "403",
    "422",
    "ERR_NETWORK",
    "ECONNREFUSED",
    "status code",
    "HTTP",
    "unauthorized",
    "forbidden",
  ];

  it("should not contain technical jargon in any error messages", () => {
    const testCases = [
      { message: "Network Error" },
      { response: { status: 500 } },
      { response: { status: 401 } },
      { response: { status: 403 } },
      { response: { status: 422 } },
      { response: { status: 429 } },
      { code: "ERR_NETWORK" },
    ];

    testCases.forEach((error) => {
      const result = classifyError(error);
      technicalJargon.forEach((term) => {
        expect(result.message.toLowerCase()).not.toContain(term.toLowerCase());
      });
    });
  });

  it("should use plain language in all error messages", () => {
    const testCases = [
      { message: "Network Error" },
      { response: { status: 500 } },
      { response: { status: 401 } },
      { response: { status: 403 } },
      { response: { status: 422 } },
      { response: { status: 429 } },
    ];

    testCases.forEach((error) => {
      const result = classifyError(error);
      // Messages should be sentences with proper punctuation
      expect(result.message).toMatch(/^[A-Z].*\.$/);
      // Messages should not be too short (at least 10 characters)
      expect(result.message.length).toBeGreaterThan(10);
    });
  });
});
