/**
 * Tests for WithLoading Component
 *
 * Verifies that the WithLoading wrapper:
 * - Shows skeleton during loading state
 * - Shows error UI when error occurs
 * - Shows empty state when data is empty
 * - Renders children with data on success
 * - Handles retry functionality
 * - Works with QueryWrapper variant
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WithLoading, QueryWrapper } from "../WithLoading";

describe("WithLoading", () => {
  describe("Loading State", () => {
    it("should show default skeleton when loading", () => {
      const { container } = render(
        <WithLoading data={undefined} isLoading={true} error={null}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
      expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });

    it("should show custom skeleton when provided", () => {
      render(
        <WithLoading
          data={undefined}
          isLoading={true}
          error={null}
          skeleton={<div data-testid="custom-skeleton">Loading...</div>}
        >
          {() => <div>Content</div>}
        </WithLoading>
      );

      expect(screen.getByTestId("custom-skeleton")).toBeInTheDocument();
      expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });

    it("should apply minHeight to loading container", () => {
      const { container } = render(
        <WithLoading data={undefined} isLoading={true} error={null} minHeight="min-h-[400px]">
          {() => <div>Content</div>}
        </WithLoading>
      );

      const loadingContainer = container.firstChild as HTMLElement;
      expect(loadingContainer.className).toContain("min-h-[400px]");
    });

    it("should apply custom className to loading container", () => {
      const { container } = render(
        <WithLoading
          data={undefined}
          isLoading={true}
          error={null}
          className="custom-loading-class"
        >
          {() => <div>Content</div>}
        </WithLoading>
      );

      const loadingContainer = container.firstChild as HTMLElement;
      expect(loadingContainer.className).toContain("custom-loading-class");
    });
  });

  describe("Error State", () => {
    it("should show error message when error occurs", () => {
      const error = new Error("Failed to fetch data");
      render(
        <WithLoading data={undefined} isLoading={false} error={error}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      expect(screen.getByText("Failed to load data")).toBeInTheDocument();
      expect(screen.getByText("Failed to fetch data")).toBeInTheDocument();
      expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });

    it("should show default error message when error has no message", () => {
      const error = new Error();
      render(
        <WithLoading data={undefined} isLoading={false} error={error}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      expect(
        screen.getByText("An unexpected error occurred. Please try again.")
      ).toBeInTheDocument();
    });

    it("should show retry button when onRetry is provided", () => {
      const error = new Error("Network error");
      const onRetry = vi.fn();

      render(
        <WithLoading data={undefined} isLoading={false} error={error} onRetry={onRetry}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      const retryButton = screen.getByRole("button", { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it("should call onRetry when retry button is clicked", async () => {
      const user = userEvent.setup();
      const error = new Error("Network error");
      const onRetry = vi.fn();

      render(
        <WithLoading data={undefined} isLoading={false} error={error} onRetry={onRetry}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      const retryButton = screen.getByRole("button", { name: /retry/i });
      await user.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("should not show retry button when onRetry is not provided", () => {
      const error = new Error("Network error");

      render(
        <WithLoading data={undefined} isLoading={false} error={error}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    });

    it("should show error icon", () => {
      const error = new Error("Test error");
      const { container } = render(
        <WithLoading data={undefined} isLoading={false} error={error}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      const errorIcon = container.querySelector(".text-destructive");
      expect(errorIcon).toBeInTheDocument();
    });

    it("should apply minHeight to error container", () => {
      const error = new Error("Test error");
      const { container } = render(
        <WithLoading data={undefined} isLoading={false} error={error} minHeight="min-h-[500px]">
          {() => <div>Content</div>}
        </WithLoading>
      );

      const errorContainer = container.firstChild as HTMLElement;
      expect(errorContainer.className).toContain("min-h-[500px]");
    });
  });

  describe("Empty State", () => {
    it("should show empty state when data is undefined", () => {
      render(
        <WithLoading data={undefined} isLoading={false} error={null}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      expect(screen.getByText("No data available")).toBeInTheDocument();
      expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });

    it("should show empty state when data is null", () => {
      render(
        <WithLoading data={null} isLoading={false} error={null}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      expect(screen.getByText("No data available")).toBeInTheDocument();
    });

    it("should show empty state when data is empty array", () => {
      render(
        <WithLoading data={[]} isLoading={false} error={null}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      expect(screen.getByText("No data available")).toBeInTheDocument();
    });

    it("should show custom empty message when provided", () => {
      render(
        <WithLoading data={undefined} isLoading={false} error={null} emptyMessage="No items found">
          {() => <div>Content</div>}
        </WithLoading>
      );

      expect(screen.getByText("No items found")).toBeInTheDocument();
    });

    it("should show custom empty state component when provided", () => {
      render(
        <WithLoading
          data={undefined}
          isLoading={false}
          error={null}
          emptyState={<div data-testid="custom-empty">Custom Empty State</div>}
        >
          {() => <div>Content</div>}
        </WithLoading>
      );

      expect(screen.getByTestId("custom-empty")).toBeInTheDocument();
      expect(screen.queryByText("No data available")).not.toBeInTheDocument();
    });

    it("should show empty state icon", () => {
      const { container } = render(
        <WithLoading data={undefined} isLoading={false} error={null}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      const emptyIcon = container.querySelector(".text-muted-foreground");
      expect(emptyIcon).toBeInTheDocument();
    });
  });

  describe("Success State", () => {
    it("should render children when data is provided", () => {
      const data = { id: 1, name: "Test" };
      render(
        <WithLoading data={data} isLoading={false} error={null}>
          {(d) => <div>Content: {d.name}</div>}
        </WithLoading>
      );

      expect(screen.getByText("Content: Test")).toBeInTheDocument();
    });

    it("should pass data to children render function", () => {
      const data = { count: 42, items: ["a", "b", "c"] };
      render(
        <WithLoading data={data} isLoading={false} error={null}>
          {(d) => (
            <div>
              <span>Count: {d.count}</span>
              <span>Items: {d.items.length}</span>
            </div>
          )}
        </WithLoading>
      );

      expect(screen.getByText("Count: 42")).toBeInTheDocument();
      expect(screen.getByText("Items: 3")).toBeInTheDocument();
    });

    it("should render children when data is array with items", () => {
      const data = [1, 2, 3];
      render(
        <WithLoading data={data} isLoading={false} error={null}>
          {(d) => <div>Items: {d.length}</div>}
        </WithLoading>
      );

      expect(screen.getByText("Items: 3")).toBeInTheDocument();
    });

    it("should show empty state when data is zero (falsy)", () => {
      const data = 0;
      render(
        <WithLoading data={data} isLoading={false} error={null}>
          {(d) => <div>Value: {d}</div>}
        </WithLoading>
      );

      // 0 is falsy so it should show empty state
      expect(screen.getByText("No data available")).toBeInTheDocument();
    });

    it("should show empty state when data is false (falsy)", () => {
      const data = false;
      render(
        <WithLoading data={data} isLoading={false} error={null}>
          {(d) => <div>Value: {String(d)}</div>}
        </WithLoading>
      );

      // false is falsy so it should show empty state
      expect(screen.getByText("No data available")).toBeInTheDocument();
    });

    it("should show empty state when data is empty string (falsy)", () => {
      const data = "";
      render(
        <WithLoading data={data} isLoading={false} error={null}>
          {(d) => <div>Value: "{d}"</div>}
        </WithLoading>
      );

      // Empty string is falsy so it should show empty state
      expect(screen.getByText("No data available")).toBeInTheDocument();
    });
  });

  describe("Priority of States", () => {
    it("should prioritize loading over error", () => {
      const error = new Error("Test error");
      const { container } = render(
        <WithLoading data={undefined} isLoading={true} error={error}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
      expect(screen.queryByText("Failed to load data")).not.toBeInTheDocument();
    });

    it("should prioritize loading over empty state", () => {
      const { container } = render(
        <WithLoading data={undefined} isLoading={true} error={null}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
      expect(screen.queryByText("No data available")).not.toBeInTheDocument();
    });

    it("should prioritize error over empty state", () => {
      const error = new Error("Test error");
      render(
        <WithLoading data={undefined} isLoading={false} error={error}>
          {() => <div>Content</div>}
        </WithLoading>
      );

      expect(screen.getByText("Failed to load data")).toBeInTheDocument();
      expect(screen.queryByText("No data available")).not.toBeInTheDocument();
    });
  });
});

describe("QueryWrapper", () => {
  describe("Basic Functionality", () => {
    it("should show loading state from query result", () => {
      const query = {
        data: undefined,
        isLoading: true,
        error: null,
      };

      const { container } = render(
        <QueryWrapper query={query}>{() => <div>Content</div>}</QueryWrapper>
      );

      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("should show error state from query result", () => {
      const query = {
        data: undefined,
        isLoading: false,
        error: new Error("Query failed"),
      };

      render(<QueryWrapper query={query}>{() => <div>Content</div>}</QueryWrapper>);

      expect(screen.getByText("Failed to load data")).toBeInTheDocument();
      expect(screen.getByText("Query failed")).toBeInTheDocument();
    });

    it("should render children with query data", () => {
      const query = {
        data: { id: 1, title: "Test Data" },
        isLoading: false,
        error: null,
      };

      render(<QueryWrapper query={query}>{(data) => <div>Title: {data.title}</div>}</QueryWrapper>);

      expect(screen.getByText("Title: Test Data")).toBeInTheDocument();
    });

    it("should show empty state when query has no data", () => {
      const query = {
        data: undefined,
        isLoading: false,
        error: null,
      };

      render(<QueryWrapper query={query}>{() => <div>Content</div>}</QueryWrapper>);

      expect(screen.getByText("No data available")).toBeInTheDocument();
    });
  });

  describe("Refetch Functionality", () => {
    it("should pass refetch to onRetry", async () => {
      const user = userEvent.setup();
      const refetch = vi.fn();
      const query = {
        data: undefined,
        isLoading: false,
        error: new Error("Network error"),
        refetch,
      };

      render(<QueryWrapper query={query}>{() => <div>Content</div>}</QueryWrapper>);

      const retryButton = screen.getByRole("button", { name: /retry/i });
      await user.click(retryButton);

      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it("should work without refetch function", () => {
      const query = {
        data: undefined,
        isLoading: false,
        error: new Error("Network error"),
      };

      render(<QueryWrapper query={query}>{() => <div>Content</div>}</QueryWrapper>);

      // Should not show retry button when refetch is not available
      expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  describe("Custom Props", () => {
    it("should accept custom skeleton", () => {
      const query = {
        data: undefined,
        isLoading: true,
        error: null,
      };

      render(
        <QueryWrapper
          query={query}
          skeleton={<div data-testid="custom-skeleton">Custom Loading</div>}
        >
          {() => <div>Content</div>}
        </QueryWrapper>
      );

      expect(screen.getByTestId("custom-skeleton")).toBeInTheDocument();
    });

    it("should accept custom empty state", () => {
      const query = {
        data: undefined,
        isLoading: false,
        error: null,
      };

      render(
        <QueryWrapper query={query} emptyState={<div data-testid="custom-empty">No results</div>}>
          {() => <div>Content</div>}
        </QueryWrapper>
      );

      expect(screen.getByTestId("custom-empty")).toBeInTheDocument();
    });

    it("should accept custom empty message", () => {
      const query = {
        data: undefined,
        isLoading: false,
        error: null,
      };

      render(
        <QueryWrapper query={query} emptyMessage="Nothing to show here">
          {() => <div>Content</div>}
        </QueryWrapper>
      );

      expect(screen.getByText("Nothing to show here")).toBeInTheDocument();
    });

    it("should accept custom className", () => {
      const query = {
        data: undefined,
        isLoading: true,
        error: null,
      };

      const { container } = render(
        <QueryWrapper query={query} className="custom-query-class">
          {() => <div>Content</div>}
        </QueryWrapper>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("custom-query-class");
    });

    it("should accept custom minHeight", () => {
      const query = {
        data: undefined,
        isLoading: true,
        error: null,
      };

      const { container } = render(
        <QueryWrapper query={query} minHeight="min-h-[600px]">
          {() => <div>Content</div>}
        </QueryWrapper>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("min-h-[600px]");
    });
  });

  describe("Type Safety", () => {
    it("should correctly type the data parameter in children", () => {
      interface TestData {
        id: number;
        name: string;
      }

      const query = {
        data: { id: 1, name: "Test" } as TestData,
        isLoading: false,
        error: null,
      };

      render(
        <QueryWrapper<TestData> query={query}>
          {(data) => (
            <div>
              ID: {data.id}, Name: {data.name}
            </div>
          )}
        </QueryWrapper>
      );

      expect(screen.getByText("ID: 1, Name: Test")).toBeInTheDocument();
    });
  });
});
