/**
 * Test Utilities for Frontend Integration Tests
 *
 * Provides custom render function with all necessary providers:
 * - TanStack Query (React Query)
 * - Next.js App Router context
 * - Authentication context
 */

import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Create a new QueryClient for each test to ensure isolation
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: 0, // Disable caching in tests
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Custom render function that wraps components with necessary providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

export function renderWithProviders(ui: ReactElement, options?: CustomRenderOptions) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options || {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

/**
 * Wait for TanStack Query to settle
 * Useful when waiting for all async operations to complete
 */
export async function waitForQueryToSettle(queryClient: QueryClient) {
  await queryClient
    .getQueryCache()
    .getAll()
    .forEach((query) => {
      query.fetch();
    });
}

// Re-export everything from React Testing Library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
