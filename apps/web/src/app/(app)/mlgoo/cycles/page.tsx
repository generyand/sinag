"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useCycles } from "@/hooks/useCycles";
import { CycleForm } from "@/components/features/admin/cycles/CycleForm";
import { DeadlineStatusDashboard } from "@/components/features/admin/deadlines/DeadlineStatusDashboard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Clock, Settings, Users } from "lucide-react";
import type { CycleFormData } from "@/hooks/useCycles";

type TabId = "settings" | "monitoring";

export default function CyclesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("settings");

  // Fetch active cycle and mutation handlers
  const {
    activeCycle,
    isLoadingActiveCycle,
    activeCycleError,
    createCycle,
    isCreatingCycle,
    refetchActiveCycle,
  } = useCycles();

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

  // Handle cycle creation
  const handleCreateCycle = async (data: CycleFormData) => {
    try {
      await createCycle.mutateAsync({ data });
      setShowCreateForm(false);
      refetchActiveCycle();
    } catch (error) {
      console.error("Failed to create cycle:", error);
    }
  };

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

  // Handle error state - but 404 means no active cycle, which is valid
  // Only show error for non-404 errors
  const isNotFoundError = activeCycleError &&
    (activeCycleError as any)?.response?.status === 404;

  if (activeCycleError && !isNotFoundError) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Error Loading Assessment Cycle
            </h2>
            <p className="text-[var(--muted-foreground)]">
              Failed to load active assessment cycle. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Treat 404 as "no active cycle" (valid state)
  const hasNoCycle = !activeCycle || isNotFoundError;

  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Enhanced Header Section */}
          <div className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-8">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/40 to-indigo-100/20 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/30 to-pink-100/20 rounded-full translate-y-16 -translate-x-16"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold text-[var(--foreground)]">
                    Assessment{" "}
                    <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                      Cycles
                    </span>
                  </h1>
                  <p className="text-[var(--muted-foreground)] mt-2">
                    Manage assessment cycles, deadlines, and monitor barangay submissions
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-6">
                  <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]">
                    <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {activeCycle ? "1" : "0"}
                    </div>
                    <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                      Active Cycle
                    </div>
                  </div>
                  {activeCycle && (
                    <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]">
                      <div className="text-3xl font-bold text-[var(--foreground)]">
                        {activeCycle.year}
                      </div>
                      <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                        Current Year
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
              <TabsList className="w-full flex gap-1 bg-transparent h-auto p-0">
                <TabsTrigger
                  value="settings"
                  className="flex items-center gap-2 px-6 py-3 rounded data-[state=active]:bg-[var(--cityscape-yellow)] data-[state=active]:text-[var(--foreground)] data-[state=active]:shadow-sm transition-all"
                >
                  <Settings className="h-4 w-4" />
                  Cycle Settings
                </TabsTrigger>
                <TabsTrigger
                  value="monitoring"
                  className="flex items-center gap-2 px-6 py-3 rounded data-[state=active]:bg-[var(--cityscape-yellow)] data-[state=active]:text-[var(--foreground)] data-[state=active]:shadow-sm transition-all"
                >
                  <Users className="h-4 w-4" />
                  Deadline Monitoring
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Tab Content */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              {/* Active Cycle Display */}
              {isLoadingActiveCycle ? (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--cityscape-yellow)]"></div>
                    <span className="ml-3 text-[var(--muted-foreground)]">
                      Loading active cycle...
                    </span>
                  </div>
                </div>
              ) : !hasNoCycle && activeCycle ? (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg">
                  {/* Cycle Header */}
                  <div className="p-6 border-b border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-[var(--foreground)]">
                          {activeCycle.name}
                        </h2>
                        <p className="text-[var(--muted-foreground)] mt-1">
                          Active assessment cycle for {activeCycle.year}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Active
                      </div>
                    </div>
                  </div>

                  {/* Deadlines Grid */}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-[var(--cityscape-yellow)]" />
                      Submission Deadlines
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Phase 1 */}
                      <div className="p-4 bg-[var(--background)] rounded-sm border border-[var(--border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <h4 className="font-semibold text-[var(--foreground)]">Phase 1</h4>
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Initial Submission
                        </p>
                        <p className="text-sm font-medium text-[var(--foreground)] mt-2">
                          {formatDate(activeCycle.phase1_deadline)}
                        </p>
                      </div>

                      {/* Rework */}
                      <div className="p-4 bg-[var(--background)] rounded-sm border border-[var(--border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <h4 className="font-semibold text-[var(--foreground)]">Rework</h4>
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Rework Submission
                        </p>
                        <p className="text-sm font-medium text-[var(--foreground)] mt-2">
                          {formatDate(activeCycle.rework_deadline)}
                        </p>
                      </div>

                      {/* Phase 2 */}
                      <div className="p-4 bg-[var(--background)] rounded-sm border border-[var(--border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-purple-500" />
                          <h4 className="font-semibold text-[var(--foreground)]">Phase 2</h4>
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Final Submission
                        </p>
                        <p className="text-sm font-medium text-[var(--foreground)] mt-2">
                          {formatDate(activeCycle.phase2_deadline)}
                        </p>
                      </div>

                      {/* Calibration */}
                      <div className="p-4 bg-[var(--background)] rounded-sm border border-[var(--border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-green-500" />
                          <h4 className="font-semibold text-[var(--foreground)]">Calibration</h4>
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Validation Deadline
                        </p>
                        <p className="text-sm font-medium text-[var(--foreground)] mt-2">
                          {formatDate(activeCycle.calibration_deadline)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cycle Metadata */}
                  <div className="p-6 border-t border-[var(--border)] bg-[var(--background)]/50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-[var(--muted-foreground)]">Created:</span>
                        <span className="ml-2 text-[var(--foreground)] font-medium">
                          {formatDate(activeCycle.created_at)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--muted-foreground)]">Last Updated:</span>
                        <span className="ml-2 text-[var(--foreground)] font-medium">
                          {formatDate(activeCycle.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-12">
                  <div className="text-center">
                    <Calendar className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                      No Active Assessment Cycle
                    </h3>
                    <p className="text-[var(--muted-foreground)] mb-6">
                      Create a new assessment cycle to begin managing submission deadlines and barangay assessments.
                    </p>
                    <Button
                      onClick={() => setShowCreateForm(true)}
                      className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Assessment Cycle
                    </Button>
                  </div>
                </div>
              )}

              {/* Create Form Section */}
              {showCreateForm && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-[var(--foreground)]">
                      Create New Assessment Cycle
                    </h2>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                      disabled={isCreatingCycle}
                    >
                      Cancel
                    </Button>
                  </div>
                  <CycleForm
                    onSubmit={handleCreateCycle}
                    isLoading={isCreatingCycle}
                  />
                </div>
              )}

              {/* Show Create Button when there's an active cycle */}
              {!hasNoCycle && activeCycle && !showCreateForm && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Cycle (Replaces Active)
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Deadline Monitoring Tab */}
          {activeTab === "monitoring" && (
            <DeadlineStatusDashboard />
          )}
        </div>
      </div>
    </div>
  );
}
