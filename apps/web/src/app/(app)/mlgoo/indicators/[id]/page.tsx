"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useIndicator, useIndicatorHistory } from "@/hooks/useIndicators";
import { IndicatorDetail, IndicatorHistory } from "@/components/features/indicators";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function IndicatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState("details");

  // Parse indicator ID from URL params
  const indicatorId = parseInt(params.id as string, 10);

  // Fetch indicator and history
  const {
    data: indicator,
    isLoading: isLoadingIndicator,
    error: indicatorError,
  } = useIndicator(indicatorId);
  const { data: history, isLoading: isLoadingHistory } = useIndicatorHistory(indicatorId);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  // Redirect non-admin users to their appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const isAdmin = user.role === "MLGOO_DILG";
      if (!isAdmin) {
        // Redirect to appropriate dashboard based on role
        if (user.role === "ASSESSOR" || user.role === "VALIDATOR") {
          router.replace("/assessor/submissions");
        } else {
          router.replace("/blgu/dashboard");
        }
      }
    }
  }, [isAuthenticated, user, router]);

  // Show loading if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-[var(--muted-foreground)]">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show loading if user is not admin
  if (user && user.role !== "MLGOO_DILG") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-[var(--muted-foreground)]">
            Access denied. Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (indicatorError) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Error Loading Indicator
            </h2>
            <p className="text-[var(--muted-foreground)]">
              {indicatorError instanceof Error
                ? indicatorError.message
                : "Failed to load indicator. It may not exist or you may not have permission to view it."}
            </p>
            <button
              onClick={() => router.push("/mlgoo/indicators")}
              className="mt-4 text-[var(--primary)] hover:underline"
            >
              Back to Indicators List
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoadingIndicator) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6 animate-pulse">
            <div className="h-12 bg-[var(--muted)] rounded w-1/3"></div>
            <div className="h-64 bg-[var(--muted)] rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show not found state
  if (!indicator) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6 text-center">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Indicator Not Found
            </h2>
            <p className="text-[var(--muted-foreground)]">
              The indicator you're looking for does not exist.
            </p>
            <button
              onClick={() => router.push("/mlgoo/indicators")}
              className="mt-4 text-[var(--primary)] hover:underline"
            >
              Back to Indicators List
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    // TODO: Open edit dialog/form (Story 1.6)
    console.log("Edit indicator:", indicator.id);
  };

  const handleViewHistory = () => {
    setActiveTab("history");
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="details">Indicator Details</TabsTrigger>
            <TabsTrigger value="history">
              Version History {history && history.length > 0 && `(${history.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-0">
            <IndicatorDetail
              indicator={indicator}
              onEdit={handleEdit}
              onViewHistory={handleViewHistory}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <IndicatorHistory
              history={history || []}
              currentVersion={indicator.version}
              isLoading={isLoadingHistory}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
