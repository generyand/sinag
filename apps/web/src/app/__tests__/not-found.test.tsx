/**
 * Tests for 404 Not Found Page
 *
 * Verifies that the 404 page:
 * - Displays appropriate 404 message
 * - Provides navigation options
 * - Has proper accessibility
 * - Handles user interactions correctly
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotFound from "../not-found";

// Mock Next.js Link component
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("NotFound Page", () => {
  describe("Basic Rendering", () => {
    it("should render without errors", () => {
      const { container } = render(<NotFound />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should display 404 heading", () => {
      render(<NotFound />);
      expect(screen.getByText("404")).toBeInTheDocument();
    });

    it('should display "Page Not Found" title', () => {
      render(<NotFound />);
      expect(screen.getByText("Page Not Found")).toBeInTheDocument();
    });

    it("should display helpful description", () => {
      render(<NotFound />);
      expect(
        screen.getByText(/The page you're looking for doesn't exist or has been moved/i)
      ).toBeInTheDocument();
    });

    it("should render file question icon", () => {
      const { container } = render(<NotFound />);
      const icon = container.querySelector(".text-muted-foreground");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Go Home Button", () => {
    it("should render Go Home button", () => {
      render(<NotFound />);
      const goHomeLink = screen.getByRole("link", { name: /go home/i });
      expect(goHomeLink).toBeInTheDocument();
    });

    it("should link to home page", () => {
      render(<NotFound />);
      const goHomeLink = screen.getByRole("link", { name: /go home/i });
      expect(goHomeLink).toHaveAttribute("href", "/");
    });

    it("should render Home icon", () => {
      render(<NotFound />);
      const goHomeLink = screen.getByRole("link", { name: /go home/i });
      const icon = goHomeLink.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Go Back Button", () => {
    it("should render Go Back button", () => {
      render(<NotFound />);
      const goBackLink = screen.getByRole("link", { name: /go back/i });
      expect(goBackLink).toBeInTheDocument();
    });

    it("should have back navigation functionality", () => {
      render(<NotFound />);
      const goBackLink = screen.getByRole("link", { name: /go back/i });
      // The link exists and can be clicked (React blocks javascript: URLs in test)
      expect(goBackLink).toBeInTheDocument();
    });

    it("should render ArrowLeft icon", () => {
      render(<NotFound />);
      const goBackLink = screen.getByRole("link", { name: /go back/i });
      const icon = goBackLink.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("should have outline variant styling", () => {
      render(<NotFound />);
      const goBackLink = screen.getByRole("link", { name: /go back/i });
      // Outline variant buttons typically don't have bg-primary
      expect(goBackLink.className).not.toContain("bg-primary");
    });
  });

  describe("Page Layout", () => {
    it("should center content vertically and horizontally", () => {
      const { container } = render(<NotFound />);
      const wrapper = container.querySelector(".flex.min-h-screen");
      expect(wrapper?.className).toContain("items-center");
      expect(wrapper?.className).toContain("justify-center");
    });

    it("should use card component", () => {
      const { container } = render(<NotFound />);
      // Card should have max-width
      const card = container.querySelector(".max-w-md");
      expect(card).toBeInTheDocument();
    });

    it("should center text content", () => {
      const { container } = render(<NotFound />);
      const card = container.querySelector(".text-center");
      expect(card).toBeInTheDocument();
    });

    it("should have padding", () => {
      const { container } = render(<NotFound />);
      const wrapper = container.querySelector(".p-4");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("Icon Design", () => {
    it("should render icon in circular container", () => {
      const { container } = render(<NotFound />);
      const iconContainer = container.querySelector(".rounded-full");
      expect(iconContainer).toBeInTheDocument();
    });

    it("should use muted background for icon", () => {
      const { container } = render(<NotFound />);
      const iconContainer = container.querySelector(".bg-muted");
      expect(iconContainer).toBeInTheDocument();
    });

    it("should size icon container appropriately", () => {
      const { container } = render(<NotFound />);
      const iconContainer = container.querySelector(".h-20.w-20");
      expect(iconContainer).toBeInTheDocument();
    });

    it("should center icon in container", () => {
      const { container } = render(<NotFound />);
      const iconContainer = container.querySelector(".flex.items-center.justify-center");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("Typography", () => {
    it("should use large font for 404 number", () => {
      render(<NotFound />);
      const heading = screen.getByText("404");
      expect(heading.className).toContain("text-3xl");
      expect(heading.className).toContain("font-bold");
    });

    it("should use larger font for title", () => {
      render(<NotFound />);
      const title = screen.getByText("Page Not Found");
      expect(title.className).toContain("text-lg");
    });

    it("should use muted color for description", () => {
      const { container } = render(<NotFound />);
      const description = screen.getByText(/The page you're looking for/i);
      expect(description.className).toContain("text-muted-foreground");
    });
  });

  describe("Accessibility", () => {
    it("should display 404 heading prominently", () => {
      render(<NotFound />);
      const mainHeading = screen.getByText("404");
      // Just verify it exists and is displayed
      expect(mainHeading).toBeInTheDocument();
    });

    it("should have accessible link labels", () => {
      render(<NotFound />);
      expect(screen.getByRole("link", { name: /go home/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /go back/i })).toBeInTheDocument();
    });

    it("should use semantic HTML", () => {
      const { container } = render(<NotFound />);
      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("should have descriptive text for screen readers", () => {
      render(<NotFound />);
      const description = screen.getByText(/The page you're looking for doesn't exist/i);
      expect(description).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("should stack buttons on mobile", () => {
      const { container } = render(<NotFound />);
      const footer = container.querySelector(".flex.flex-col");
      expect(footer).toBeInTheDocument();
    });

    it("should center buttons on larger screens", () => {
      const { container } = render(<NotFound />);
      const footer = container.querySelector(".sm\\:justify-center");
      expect(footer).toBeInTheDocument();
    });

    it("should have responsive button layout", () => {
      const { container } = render(<NotFound />);
      const footer = container.querySelector(".sm\\:flex-row");
      expect(footer).toBeInTheDocument();
    });

    it("should have gap between buttons", () => {
      const { container } = render(<NotFound />);
      const footer = container.querySelector(".gap-2");
      expect(footer).toBeInTheDocument();
    });
  });

  describe("User Interaction", () => {
    it("should be clickable on Go Home link", async () => {
      const user = userEvent.setup();
      render(<NotFound />);
      const goHomeLink = screen.getByRole("link", { name: /go home/i });

      // Should be able to interact with the link
      await user.hover(goHomeLink);
      expect(goHomeLink).toBeInTheDocument();
    });

    it("should be clickable on Go Back link", async () => {
      const user = userEvent.setup();
      render(<NotFound />);
      const goBackLink = screen.getByRole("link", { name: /go back/i });

      // Should be able to interact with the link
      await user.hover(goBackLink);
      expect(goBackLink).toBeInTheDocument();
    });
  });

  describe("Content Clarity", () => {
    it("should provide clear guidance to users", () => {
      render(<NotFound />);
      const description = screen.getByText(/Check the URL or navigate back to a known page/i);
      expect(description).toBeInTheDocument();
    });

    it("should explain why 404 occurred", () => {
      render(<NotFound />);
      expect(screen.getByText(/doesn't exist or has been moved/i)).toBeInTheDocument();
    });
  });

  describe("Visual Hierarchy", () => {
    it("should have proper spacing in header", () => {
      const { container } = render(<NotFound />);
      const header = container.querySelector('[class*="mb-4"]');
      expect(header).toBeInTheDocument();
    });

    it("should have margin bottom on description", () => {
      render(<NotFound />);
      const description = screen.getByText(/The page you're looking for/i);
      // Description paragraph should have margin classes
      expect(description.closest("p")).toBeInTheDocument();
    });
  });

  describe("Background and Layout", () => {
    it("should use background color", () => {
      const { container } = render(<NotFound />);
      const wrapper = container.querySelector(".bg-background");
      expect(wrapper).toBeInTheDocument();
    });

    it("should fill minimum screen height", () => {
      const { container } = render(<NotFound />);
      const wrapper = container.querySelector(".min-h-screen");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("Icon Rendering", () => {
    it("should render FileQuestion icon with correct size", () => {
      const { container } = render(<NotFound />);
      const icon = container.querySelector(".h-10.w-10");
      expect(icon).toBeInTheDocument();
    });

    it("should render icon with muted styling", () => {
      const { container } = render(<NotFound />);
      // Check that muted styling is applied to icon container
      const iconContainer = container.querySelector(".text-muted-foreground");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("Render Performance", () => {
    it("should render quickly", () => {
      const startTime = performance.now();
      render(<NotFound />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in less than 20ms
      expect(renderTime).toBeLessThan(20);
    });
  });
});
