"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Municipal Overview Page - Redirects to Analytics
 *
 * The Municipal Overview dashboard has been consolidated into the
 * Analytics & Reports page as the default "Overview" tab.
 *
 * This page redirects to /analytics?tab=overview for backwards compatibility.
 */
export default function MunicipalOverviewPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/analytics?tab=overview");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Analytics...</p>
      </div>
    </div>
  );
}
