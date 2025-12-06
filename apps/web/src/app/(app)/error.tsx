'use client';

/**
 * App Route Error Page
 *
 * Handles errors within the authenticated app routes.
 * Provides user-friendly error messages and recovery options.
 */

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error for debugging
    console.error('App route error:', error);

    // In production, you would send this to an error tracking service like Sentry
    // if (process.env.NODE_ENV === 'production') {
    //   captureException(error, { extra: { digest: error.digest } });
    // }
  }, [error]);

  // Classify error type for better messaging
  const isNetworkError = error.message.toLowerCase().includes('network') ||
    error.message.toLowerCase().includes('fetch');
  const isAuthError = error.message.toLowerCase().includes('unauthorized') ||
    error.message.toLowerCase().includes('401');

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-500" />
          </div>
          <CardTitle className="text-xl">
            {isNetworkError
              ? 'Connection Problem'
              : isAuthError
                ? 'Session Expired'
                : 'Something went wrong'}
          </CardTitle>
          <CardDescription>
            {isNetworkError
              ? 'Unable to connect to the server. Please check your internet connection.'
              : isAuthError
                ? 'Your session has expired. Please log in again to continue.'
                : 'We encountered an unexpected error. Please try again.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <details className="rounded-lg bg-muted p-3">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Bug className="h-4 w-4" />
                Error Details (Development Only)
              </summary>
              <div className="mt-3 space-y-2">
                <p className="font-mono text-xs text-destructive break-words">
                  {error.message}
                </p>
                {error.stack && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-background p-2 text-xs">
                    {error.stack}
                  </pre>
                )}
                {error.digest && (
                  <p className="text-xs text-muted-foreground">
                    Digest: {error.digest}
                  </p>
                )}
              </div>
            </details>
          )}

          {process.env.NODE_ENV === 'production' && error.digest && (
            <p className="text-center text-xs text-muted-foreground">
              Error Reference: {error.digest}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <div className="flex w-full gap-2">
            <Button onClick={reset} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            {isAuthError ? (
              <Button variant="outline" className="flex-1" asChild>
                <Link href="/login">
                  Log In Again
                </Link>
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Link>
              </Button>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            If this problem persists, please contact support.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
