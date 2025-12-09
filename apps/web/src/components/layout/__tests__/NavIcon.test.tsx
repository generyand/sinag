/**
 * Tests for NavIcon Component
 *
 * Verifies that the NavIcon component:
 * - Renders correct lucide-react icons
 * - Handles unknown icon names gracefully
 * - Applies custom classNames
 * - Has proper accessibility attributes
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NavIcon } from "../NavIcon";

describe("NavIcon", () => {
  describe("Icon Rendering", () => {
    it("should render home icon", () => {
      const { container } = render(<NavIcon name="home" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render clipboard icon", () => {
      const { container } = render(<NavIcon name="clipboard" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render chart icon", () => {
      const { container } = render(<NavIcon name="chart" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render users icon", () => {
      const { container } = render(<NavIcon name="users" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render user icon", () => {
      const { container } = render(<NavIcon name="user" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render settings icon", () => {
      const { container } = render(<NavIcon name="settings" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render list icon", () => {
      const { container } = render(<NavIcon name="list" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render layers icon", () => {
      const { container } = render(<NavIcon name="layers" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render calendar icon", () => {
      const { container } = render(<NavIcon name="calendar" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render building icon", () => {
      const { container } = render(<NavIcon name="building" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render clock icon", () => {
      const { container } = render(<NavIcon name="clock" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Unknown Icons", () => {
    it("should return null for unknown icon name", () => {
      const { container } = render(<NavIcon name="unknown-icon" />);
      expect(container.firstChild).toBeNull();
    });

    it("should return null for empty string icon name", () => {
      const { container } = render(<NavIcon name="" />);
      expect(container.firstChild).toBeNull();
    });

    it("should not throw error for invalid icon name", () => {
      expect(() => render(<NavIcon name="invalid-name-123" />)).not.toThrow();
    });
  });

  describe("Styling", () => {
    it("should apply default className", () => {
      const { container } = render(<NavIcon name="home" />);
      const svg = container.querySelector("svg");
      // SVG className is an object in testing library, use getAttribute
      const className = svg?.getAttribute("class") || "";
      expect(className).toContain("w-5");
      expect(className).toContain("h-5");
    });

    it("should accept custom className", () => {
      const { container } = render(<NavIcon name="home" className="w-8 h-8 text-blue-500" />);
      const svg = container.querySelector("svg");
      const className = svg?.getAttribute("class") || "";
      expect(className).toContain("w-8");
      expect(className).toContain("h-8");
      expect(className).toContain("text-blue-500");
    });

    it("should override default sizing with custom className", () => {
      const { container } = render(<NavIcon name="home" className="w-10 h-10" />);
      const svg = container.querySelector("svg");
      const className = svg?.getAttribute("class") || "";
      expect(className).toContain("w-10");
      expect(className).toContain("h-10");
    });
  });

  describe("Accessibility", () => {
    it("should have aria-hidden attribute", () => {
      const { container } = render(<NavIcon name="home" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("should have aria-hidden on all icon types", () => {
      const iconNames = ["home", "clipboard", "chart", "users", "settings"];

      iconNames.forEach((name) => {
        const { container } = render(<NavIcon name={name} />);
        const svg = container.querySelector("svg");
        expect(svg).toHaveAttribute("aria-hidden", "true");
      });
    });
  });

  describe("Icon Mapping", () => {
    it("should map all navigation icon names to lucide components", () => {
      const validIconNames = [
        "home",
        "clipboard",
        "chart",
        "users",
        "user",
        "settings",
        "list",
        "layers",
        "calendar",
        "building",
        "clock",
      ];

      validIconNames.forEach((name) => {
        const { container } = render(<NavIcon name={name} />);
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe("Render Performance", () => {
    it("should render quickly", () => {
      const startTime = performance.now();
      render(<NavIcon name="home" />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in less than 10ms
      expect(renderTime).toBeLessThan(10);
    });

    it("should handle multiple icons efficiently", () => {
      const startTime = performance.now();
      render(
        <>
          <NavIcon name="home" />
          <NavIcon name="clipboard" />
          <NavIcon name="chart" />
          <NavIcon name="users" />
          <NavIcon name="settings" />
        </>
      );
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render 5 icons in less than 50ms
      expect(renderTime).toBeLessThan(50);
    });
  });

  describe("SVG Structure", () => {
    it("should render as SVG element", () => {
      const { container } = render(<NavIcon name="home" />);
      const svg = container.querySelector("svg");
      expect(svg?.tagName).toBe("svg");
    });

    it("should have viewBox attribute", () => {
      const { container } = render(<NavIcon name="home" />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("viewBox");
    });
  });
});
