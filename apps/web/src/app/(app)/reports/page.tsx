"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect from /reports to /analytics
 * The reports functionality has been merged into the Analytics & Reports page
 */
export default function ReportsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the combined analytics page with charts tab
    router.replace("/analytics?tab=charts");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--cityscape-yellow)] mx-auto mb-4"></div>
        <p className="text-[var(--text-secondary)]">Redirecting to Analytics & Reports...</p>
      </div>
    </div>
  );
}
