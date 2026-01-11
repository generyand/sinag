"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect to cycles page with deadline-windows tab.
 * This page is kept for backwards compatibility.
 */
export default function DeadlineWindowsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mlgoo/cycles?tab=deadline-windows");
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--cityscape-yellow)] mx-auto mb-4"></div>
        <p className="text-[var(--muted-foreground)]">Redirecting...</p>
      </div>
    </div>
  );
}
