"use client";

/**
 * Global Error Page
 *
 * This error boundary catches errors in the root layout.
 * It must define its own html and body tags since it replaces the root layout.
 */

import { AlertOctagon, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertOctagon className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>

            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Critical Error
            </h1>

            <p className="mb-6 text-gray-600 dark:text-gray-400">
              A critical error occurred while loading the application. Please try refreshing the
              page.
            </p>

            {process.env.NODE_ENV === "development" && (
              <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-left">
                <p className="font-mono text-sm text-red-700 dark:text-red-300 break-words">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="mt-2 text-xs text-red-500">Digest: {error.digest}</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Reload Page
              </button>
            </div>

            {error.digest && process.env.NODE_ENV === "production" && (
              <p className="mt-6 text-xs text-gray-500">Error Reference: {error.digest}</p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
