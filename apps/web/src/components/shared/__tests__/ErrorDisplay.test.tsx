/**
 * Tests for ErrorDisplay Component
 *
 * Verifies that the component correctly:
 * - Renders error information with proper styling
 * - Shows appropriate icons for different error types
 * - Applies correct colors (orange for network, red for server, amber for validation)
 * - Includes accessibility attributes (role="alert", aria-live="polite")
 * - Includes dark mode classes via Tailwind's dark: variant
 * - Returns null when no error is provided
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorDisplay } from "../ErrorDisplay";

describe("ErrorDisplay", () => {
  describe("Rendering Behavior", () => {
    it("should return null when error is null", () => {
      const { container } = render(<ErrorDisplay error={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("should return null when error is undefined", () => {
      const { container } = render(<ErrorDisplay error={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it("should render error display when error is provided", () => {
      const error = { message: "Network Error" };
      render(<ErrorDisplay error={error} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("Network Errors", () => {
    const networkError = { message: "Network Error" };

    it("should display network error title and message", () => {
      render(<ErrorDisplay error={networkError} />);

      expect(screen.getByText("Unable to connect to server")).toBeInTheDocument();
      expect(
        screen.getByText(
          "The server may be down or unreachable. Please check your connection and try again."
        )
      ).toBeInTheDocument();
    });

    it("should apply orange styling for network errors", () => {
      const { container } = render(<ErrorDisplay error={networkError} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("bg-orange-50");
      expect(alert?.className).toContain("border-orange-200");
    });

    it("should include dark mode classes for network errors", () => {
      const { container } = render(<ErrorDisplay error={networkError} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("dark:bg-orange-950/30");
      expect(alert?.className).toContain("dark:border-orange-800");
    });

    it("should show WifiOff icon for network errors (via aria-hidden)", () => {
      const { container } = render(<ErrorDisplay error={networkError} />);
      const icon = container.querySelector('[aria-hidden="true"]');

      expect(icon).toBeInTheDocument();
      // WifiOff icon should have orange color class
      const iconClass = icon?.getAttribute("class") || "";
      expect(iconClass).toContain("text-orange");
    });
  });

  describe("Server Errors (5xx)", () => {
    const serverError = { response: { status: 500 } };

    it("should display server error title and message", () => {
      render(<ErrorDisplay error={serverError} />);

      expect(screen.getByText("Server error")).toBeInTheDocument();
      expect(
        screen.getByText("Something went wrong on our end. Please try again later.")
      ).toBeInTheDocument();
    });

    it("should apply red styling for server errors", () => {
      const { container } = render(<ErrorDisplay error={serverError} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("bg-red-50");
      expect(alert?.className).toContain("border-red-200");
    });

    it("should include dark mode classes for server errors", () => {
      const { container } = render(<ErrorDisplay error={serverError} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("dark:bg-red-950/30");
      expect(alert?.className).toContain("dark:border-red-800");
    });

    it("should show ServerCrash icon for server errors", () => {
      const { container } = render(<ErrorDisplay error={serverError} />);
      const icon = container.querySelector('[aria-hidden="true"]');

      // ServerCrash icon should have red color class
      const iconClass = icon?.getAttribute("class") || "";
      expect(iconClass).toContain("text-red");
    });
  });

  describe("Authentication Errors (401)", () => {
    const authError = { response: { status: 401 } };

    it("should display auth error title and message", () => {
      render(<ErrorDisplay error={authError} />);

      expect(screen.getByText("Authentication failed")).toBeInTheDocument();
      expect(
        screen.getByText("Your session may have expired. Please log in again.")
      ).toBeInTheDocument();
    });

    it("should apply red styling for auth errors", () => {
      const { container } = render(<ErrorDisplay error={authError} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("bg-red-50");
      expect(alert?.className).toContain("border-red-200");
    });

    it("should show Lock icon for auth errors", () => {
      const { container } = render(<ErrorDisplay error={authError} />);
      const icon = container.querySelector('[aria-hidden="true"]');

      const iconClass = icon?.getAttribute("class") || "";
      expect(iconClass).toContain("text-red");
    });
  });

  describe("Validation Errors (400, 422)", () => {
    const validationError = {
      response: {
        status: 422,
        data: {
          detail: "Email is required",
        },
      },
    };

    it("should display validation error title and message", () => {
      render(<ErrorDisplay error={validationError} />);

      expect(screen.getByText("Validation failed")).toBeInTheDocument();
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });

    it("should apply amber styling for validation errors", () => {
      const { container } = render(<ErrorDisplay error={validationError} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("bg-amber-50");
      expect(alert?.className).toContain("border-amber-200");
    });

    it("should include dark mode classes for validation errors", () => {
      const { container } = render(<ErrorDisplay error={validationError} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("dark:bg-amber-950/30");
      expect(alert?.className).toContain("dark:border-amber-800");
    });

    it("should show AlertCircle icon for validation errors", () => {
      const { container } = render(<ErrorDisplay error={validationError} />);
      const icon = container.querySelector('[aria-hidden="true"]');

      const iconClass = icon?.getAttribute("class") || "";
      expect(iconClass).toContain("text-amber");
    });
  });

  describe("Rate Limit Errors (429)", () => {
    const rateLimitError = { response: { status: 429 } };

    it("should display rate limit error title and message", () => {
      render(<ErrorDisplay error={rateLimitError} />);

      expect(screen.getByText("Too many requests")).toBeInTheDocument();
      expect(screen.getByText("Please wait a moment before trying again.")).toBeInTheDocument();
    });

    it("should apply red styling for rate limit errors (not validation)", () => {
      const { container } = render(<ErrorDisplay error={rateLimitError} />);
      const alert = container.querySelector('[role="alert"]');

      // Rate limit errors should use red, not amber/yellow
      expect(alert?.className).toContain("bg-red-50");
    });
  });

  describe("Permission Errors (403)", () => {
    const permissionError = { response: { status: 403 } };

    it("should display permission error title and message", () => {
      render(<ErrorDisplay error={permissionError} />);

      expect(screen.getByText("Access denied")).toBeInTheDocument();
      expect(
        screen.getByText("You do not have permission to perform this action.")
      ).toBeInTheDocument();
    });

    it("should apply red styling for permission errors", () => {
      const { container } = render(<ErrorDisplay error={permissionError} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("bg-red-50");
      expect(alert?.className).toContain("border-red-200");
    });

    it("should show ShieldAlert icon for permission errors", () => {
      const { container } = render(<ErrorDisplay error={permissionError} />);
      const icon = container.querySelector('[aria-hidden="true"]');

      const iconClass = icon?.getAttribute("class") || "";
      expect(iconClass).toContain("text-red");
    });
  });

  describe("Unknown Errors", () => {
    const unknownError = { message: "Something unexpected" };

    it("should display unknown error title and message", () => {
      render(<ErrorDisplay error={unknownError} />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Something unexpected")).toBeInTheDocument();
    });

    it("should apply red styling for unknown errors", () => {
      const { container } = render(<ErrorDisplay error={unknownError} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("bg-red-50");
      expect(alert?.className).toContain("border-red-200");
    });

    it("should show AlertTriangle icon for unknown errors", () => {
      const { container } = render(<ErrorDisplay error={unknownError} />);
      const icon = container.querySelector('[aria-hidden="true"]');

      const iconClass = icon?.getAttribute("class") || "";
      expect(iconClass).toContain("text-red");
    });
  });

  describe("Accessibility", () => {
    const error = { message: "Network Error" };

    it("should have role='alert' for screen readers", () => {
      render(<ErrorDisplay error={error} />);
      const alert = screen.getByRole("alert");

      expect(alert).toBeInTheDocument();
    });

    it("should have aria-live='polite' for screen reader announcements", () => {
      const { container } = render(<ErrorDisplay error={error} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert).toHaveAttribute("aria-live", "polite");
    });

    it("should mark icon as aria-hidden to avoid duplicate announcements", () => {
      const { container } = render(<ErrorDisplay error={error} />);
      const icon = container.querySelector('[aria-hidden="true"]');

      expect(icon).toBeInTheDocument();
    });

    it("should display error title and message as readable text", () => {
      render(<ErrorDisplay error={error} />);

      // Both title and message should be accessible to screen readers
      expect(screen.getByText("Unable to connect to server")).toBeInTheDocument();
      expect(
        screen.getByText(
          "The server may be down or unreachable. Please check your connection and try again."
        )
      ).toBeInTheDocument();
    });
  });

  describe("Custom Styling", () => {
    const error = { message: "Network Error" };

    it("should accept and apply custom className", () => {
      const { container } = render(<ErrorDisplay error={error} className="my-custom-class" />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("my-custom-class");
    });

    it("should merge custom className with default classes", () => {
      const { container } = render(<ErrorDisplay error={error} className="mt-4" />);
      const alert = container.querySelector('[role="alert"]');

      // Should have both custom and default classes
      expect(alert?.className).toContain("mt-4");
      expect(alert?.className).toContain("rounded-md");
      expect(alert?.className).toContain("p-4");
    });

    it("should apply rounded-md styling", () => {
      const { container } = render(<ErrorDisplay error={error} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("rounded-md");
    });

    it("should apply padding", () => {
      const { container } = render(<ErrorDisplay error={error} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("p-4");
    });

    it("should apply flex layout with gap", () => {
      const { container } = render(<ErrorDisplay error={error} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("flex");
      expect(alert?.className).toContain("items-start");
      expect(alert?.className).toContain("gap-3");
    });

    it("should apply transition for smooth color changes", () => {
      const { container } = render(<ErrorDisplay error={error} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("transition-colors");
    });
  });

  describe("Dark Mode Support", () => {
    it("should include dark mode Tailwind classes for automatic theme switching", () => {
      const error = { message: "Network Error" };
      const { container } = render(<ErrorDisplay error={error} />);
      const alert = container.querySelector('[role="alert"]');

      // Should have both light mode and dark: variant classes
      expect(alert?.className).toContain("bg-orange-50");
      expect(alert?.className).toContain("dark:bg-orange-950/30");
    });

    it("should include dark mode icon color classes", () => {
      const error = { message: "Network Error" };
      const { container } = render(<ErrorDisplay error={error} />);
      const icon = container.querySelector('[aria-hidden="true"]');

      const iconClass = icon?.getAttribute("class") || "";
      expect(iconClass).toContain("text-orange-500");
      expect(iconClass).toContain("dark:text-orange-400");
    });

    it("should include dark mode text color classes", () => {
      const error = { message: "Network Error" };
      render(<ErrorDisplay error={error} />);

      const titleElement = screen.getByText("Unable to connect to server");
      const messageElement = screen.getByText(
        "The server may be down or unreachable. Please check your connection and try again."
      );

      expect(titleElement.className).toContain("text-orange-700");
      expect(titleElement.className).toContain("dark:text-orange-300");
      expect(messageElement.className).toContain("text-orange-600");
      expect(messageElement.className).toContain("dark:text-orange-400/80");
    });

    it("should support deprecated isDarkMode prop without breaking (backwards compat)", () => {
      const error = { message: "Network Error" };
      // This should not throw - the prop is accepted but ignored
      const { container } = render(<ErrorDisplay error={error} isDarkMode={true} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert).toBeInTheDocument();
    });
  });

  describe("Error Type Visual Differentiation", () => {
    it("should visually distinguish network errors with orange", () => {
      const { container } = render(<ErrorDisplay error={{ message: "Network Error" }} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("orange");
      expect(alert?.className).not.toContain("red-50");
    });

    it("should visually distinguish server errors with red", () => {
      const { container } = render(<ErrorDisplay error={{ response: { status: 500 } }} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("red");
      expect(alert?.className).not.toContain("orange");
    });

    it("should visually distinguish validation errors with amber", () => {
      const { container } = render(<ErrorDisplay error={{ response: { status: 422 } }} />);
      const alert = container.querySelector('[role="alert"]');

      expect(alert?.className).toContain("amber");
      expect(alert?.className).not.toContain("red-50");
    });
  });

  describe("Icon Display", () => {
    it("should display icon with proper sizing", () => {
      const error = { message: "Network Error" };
      const { container } = render(<ErrorDisplay error={error} />);
      const icon = container.querySelector('[aria-hidden="true"]');

      const iconClass = icon?.getAttribute("class") || "";
      expect(iconClass).toContain("w-5");
      expect(iconClass).toContain("h-5");
    });

    it("should prevent icon from shrinking in flex layout", () => {
      const error = { message: "Network Error" };
      const { container } = render(<ErrorDisplay error={error} />);
      const icon = container.querySelector('[aria-hidden="true"]');

      const iconClass = icon?.getAttribute("class") || "";
      expect(iconClass).toContain("flex-shrink-0");
    });

    it("should apply slight top margin to align with text", () => {
      const error = { message: "Network Error" };
      const { container } = render(<ErrorDisplay error={error} />);
      const icon = container.querySelector('[aria-hidden="true"]');

      const iconClass = icon?.getAttribute("class") || "";
      expect(iconClass).toContain("mt-0.5");
    });
  });

  describe("Content Layout", () => {
    const error = {
      response: {
        status: 422,
        data: {
          detail: "Invalid email format",
        },
      },
    };

    it("should display title and message in separate elements", () => {
      render(<ErrorDisplay error={error} />);

      const title = screen.getByText("Validation failed");
      const message = screen.getByText("Invalid email format");

      expect(title).toBeInTheDocument();
      expect(message).toBeInTheDocument();
      expect(title).not.toBe(message);
    });

    it("should apply flex column layout for title and message", () => {
      const { container } = render(<ErrorDisplay error={error} />);
      const contentWrapper = container.querySelector(".flex.flex-col");

      expect(contentWrapper).toBeInTheDocument();
    });

    it("should apply gap between title and message", () => {
      const { container } = render(<ErrorDisplay error={error} />);
      const contentWrapper = container.querySelector(".flex.flex-col");

      expect(contentWrapper?.className).toContain("gap-0.5");
    });

    it("should make title bold", () => {
      render(<ErrorDisplay error={error} />);
      const title = screen.getByText("Validation failed");

      expect(title.className).toContain("font-semibold");
    });

    it("should apply text-sm to both title and message", () => {
      render(<ErrorDisplay error={error} />);
      const title = screen.getByText("Validation failed");
      const message = screen.getByText("Invalid email format");

      expect(title.className).toContain("text-sm");
      expect(message.className).toContain("text-sm");
    });
  });
});
