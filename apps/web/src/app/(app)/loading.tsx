/**
 * App Route Loading State
 *
 * Displayed instantly when navigating between authenticated routes.
 * Uses a centered spinner for quick visual feedback.
 */

import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--cityscape-yellow)]" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
