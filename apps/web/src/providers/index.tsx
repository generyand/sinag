"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./AuthProvider";
import { ThemeProvider } from "./ThemeProvider";
import { LanguageProvider } from "./LanguageProvider";

/**
 * Creates a QueryClient with optimized configuration for SINAG
 *
 * Key improvements:
 * - Shorter default staleTime (1 minute) for fresher data
 * - Window focus refetch enabled for better real-time feel
 * - Smart retry logic that doesn't retry 4xx errors
 * - Proper garbage collection timing
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default stale time - can be overridden per-query using queryConfigs
        staleTime: 60 * 1000, // 1 minute (down from 5 minutes)
        gcTime: 5 * 60 * 1000, // 5 minutes garbage collection

        // Enable window focus refetch for better UX
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,

        // Smart retry logic - don't retry client errors (4xx)
        retry: (failureCount, error: unknown) => {
          // Type guard for error with response
          const httpError = error as { response?: { status?: number } };
          const status = httpError?.response?.status;

          // Don't retry on 4xx errors (client errors)
          if (status && status >= 400 && status < 500) {
            return false;
          }

          // Retry up to 3 times for server errors
          return failureCount < 3;
        },

        // Exponential backoff for retries
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        // Don't retry mutations by default (user should retry manually)
        retry: false,

        // Optional: Add global mutation error handling here
        // onError: (error) => { ... }
      },
    },
  });
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create a stable QueryClient instance
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider defaultTheme="system" storageKey="sinag-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
        {/* Toast notifications */}
        <Toaster />
        {/* Dev tools for debugging React Query */}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
