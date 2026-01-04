"use client";

import { CycleForm } from "@/components/features/admin/cycles/CycleForm";
import { DeadlineWindowsConfig } from "@/components/features/admin/deadlines/DeadlineWindowsConfig";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AssessmentYearFormData } from "@/hooks/useAssessmentYears";
import {
  transformApiToFormData,
  transformFormToApiData,
  useAssessmentYears,
} from "@/hooks/useAssessmentYears";
import { useAuthStore } from "@/store/useAuthStore";
import type { AssessmentYearResponse } from "@sinag/shared";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  GlobeLock,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Settings,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type TabId = "years" | "deadline-windows";

export default function CyclesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingYear, setEditingYear] = useState<AssessmentYearResponse | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  // Get tab from URL or default to "years"
  const tabParam = searchParams.get("tab");
  const activeTab: TabId = tabParam === "deadline-windows" ? "deadline-windows" : "years";

  // Handle tab change with URL update
  const handleTabChange = (tab: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "years") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    router.push(`/mlgoo/cycles${params.toString() ? `?${params.toString()}` : ""}`);
  };

  // Use the new assessment years hook
  const {
    years,
    activeYear,
    isLoading,
    yearsError,
    createYear,
    isCreatingYear,
    updateYear,
    isUpdatingYear,
    activateYear,
    isActivatingYear,
    deactivateYear,
    isDeactivatingYear,
    publishYear,
    isPublishingYear,
    unpublishYear,
    isUnpublishingYear,
    deleteYear,
    isDeletingYear,
  } = useAssessmentYears();

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

  // Handle year creation
  const handleCreateYear = async (data: AssessmentYearFormData) => {
    try {
      await createYear.mutateAsync({ data: transformFormToApiData(data) });
      setShowCreateForm(false);
    } catch (error) {
      console.error("Failed to create year:", error);
    }
  };

  // Handle year update
  const handleUpdateYear = async (data: AssessmentYearFormData) => {
    if (!editingYear) return;
    try {
      await updateYear.mutateAsync({
        year: editingYear.year,
        data: {
          assessment_period_start: data.assessment_period_start,
          assessment_period_end: data.assessment_period_end,
          phase1_deadline: data.phase1_deadline || undefined,
          rework_deadline: data.rework_deadline || undefined,
          phase2_deadline: data.phase2_deadline || undefined,
          calibration_deadline: data.calibration_deadline || undefined,
          description: data.description || undefined,
        },
      });
      setEditingYear(null);
    } catch (error) {
      console.error("Failed to update year:", error);
    }
  };

  // Handle year activation
  const handleActivateYear = async (year: number) => {
    try {
      await activateYear.mutateAsync({ year, params: { create_assessments: true } });
    } catch (error) {
      console.error("Failed to activate year:", error);
    }
  };

  // Handle year deactivation
  const handleDeactivateYear = async (year: number) => {
    try {
      await deactivateYear.mutateAsync({ year });
    } catch (error) {
      console.error("Failed to deactivate year:", error);
    }
  };

  // Handle year publish
  const handlePublishYear = async (year: number) => {
    try {
      await publishYear.mutateAsync({ year });
    } catch (error) {
      console.error("Failed to publish year:", error);
    }
  };

  // Handle year unpublish
  const handleUnpublishYear = async (year: number) => {
    try {
      await unpublishYear.mutateAsync({ year });
    } catch (error) {
      console.error("Failed to unpublish year:", error);
    }
  };

  // Handle year delete
  const handleDeleteYear = async (year: number) => {
    if (
      !confirm(
        `Are you sure you want to delete assessment year ${year}? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await deleteYear.mutateAsync({ year });
    } catch (error) {
      console.error("Failed to delete year:", error);
    }
  };

  // Toggle expanded state for a year
  const toggleExpanded = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
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

  // Handle error state
  if (yearsError) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Error Loading Assessment Years
            </h2>
            <p className="text-[var(--muted-foreground)]">
              Failed to load assessment years. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isMutating =
    isCreatingYear ||
    isUpdatingYear ||
    isActivatingYear ||
    isDeactivatingYear ||
    isPublishingYear ||
    isUnpublishingYear ||
    isDeletingYear;

  return (
    <main
      className="min-h-screen bg-[var(--background)]"
      role="main"
      aria-label="Assessment Years Management"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Enhanced Header Section */}
          <header className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-8">
            {/* Decorative background elements */}
            <div
              className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/40 to-indigo-100/20 rounded-full -translate-y-20 translate-x-20"
              aria-hidden="true"
            ></div>
            <div
              className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/30 to-pink-100/20 rounded-full translate-y-16 -translate-x-16"
              aria-hidden="true"
            ></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold text-[var(--foreground)]">
                    {activeTab === "years" ? (
                      <>
                        Assessment{" "}
                        <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                          Years
                        </span>
                      </>
                    ) : (
                      <>
                        Deadline{" "}
                        <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                          Windows
                        </span>
                      </>
                    )}
                  </h1>
                  <p className="text-[var(--muted-foreground)] mt-2">
                    {activeTab === "years"
                      ? "Manage assessment years and monitor barangay submissions"
                      : "Configure submission deadlines and window durations for rework and calibration"}
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-6" role="group" aria-label="Year statistics">
                  <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]">
                    <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {years.length}
                    </div>
                    <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                      Total Years
                    </div>
                  </div>
                  {activeYear && (
                    <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]">
                      <div className="text-3xl font-bold text-[var(--foreground)]">
                        {activeYear.year}
                      </div>
                      <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                        Active Year
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Tab Navigation */}
          <nav
            className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-2"
            aria-label="Assessment year tabs"
          >
            <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabId)}>
              <TabsList className="w-full grid grid-cols-2 gap-2 bg-transparent h-auto p-0">
                <TabsTrigger
                  value="years"
                  className="flex items-center justify-center gap-2 px-2 sm:px-6 py-3 rounded-sm data-[state=active]:bg-[var(--cityscape-yellow)] data-[state=active]:text-[var(--foreground)] data-[state=active]:shadow-sm transition-all"
                  aria-label="Assessment Years tab"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  <span className="truncate">Assessment Years</span>
                </TabsTrigger>
                <TabsTrigger
                  value="deadline-windows"
                  className="flex items-center justify-center gap-2 px-2 sm:px-6 py-3 rounded-sm data-[state=active]:bg-[var(--cityscape-yellow)] data-[state=active]:text-[var(--foreground)] data-[state=active]:shadow-sm transition-all"
                  aria-label="Deadline Windows tab"
                >
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span className="truncate">Deadline Windows</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </nav>

          {/* Tab Content */}
          {activeTab === "years" && (
            <div className="space-y-6">
              {/* Loading State */}
              {isLoading ? (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--cityscape-yellow)]"></div>
                    <span className="ml-3 text-[var(--muted-foreground)]">
                      Loading assessment years...
                    </span>
                  </div>
                </div>
              ) : years.length === 0 ? (
                /* Empty State */
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-12">
                  <div className="text-center">
                    <Calendar
                      className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50"
                      aria-hidden="true"
                    />
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                      No Assessment Years
                    </h3>
                    <p className="text-[var(--muted-foreground)] mb-6">
                      Create your first assessment year to begin managing submission deadlines and
                      barangay assessments.
                    </p>
                    <Button
                      onClick={() => setShowCreateForm(true)}
                      className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-white rounded-sm"
                      aria-label="Create new assessment year"
                    >
                      <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                      Create Assessment Year
                    </Button>
                  </div>
                </div>
              ) : (
                /* Years List */
                <div className="space-y-4">
                  {years.map((yearData) => (
                    <div
                      key={yearData.id}
                      className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden"
                    >
                      {/* Year Header */}
                      <div className="p-6 border-b border-[var(--border)]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold text-[var(--foreground)]">
                              {yearData.year}
                            </h2>
                            <div className="flex items-center gap-2">
                              {yearData.is_active && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                  Active
                                </span>
                              )}
                              {yearData.is_published ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                                  <Globe className="w-3 h-3" />
                                  Published
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium">
                                  <GlobeLock className="w-3 h-3" />
                                  Draft
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Action Buttons */}
                            {!yearData.is_active ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleActivateYear(yearData.year)}
                                disabled={isMutating}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <Power className="w-4 h-4 mr-1" />
                                Activate
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeactivateYear(yearData.year)}
                                disabled={isMutating}
                                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                              >
                                <PowerOff className="w-4 h-4 mr-1" />
                                Deactivate
                              </Button>
                            )}
                            {!yearData.is_published ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePublishYear(yearData.year)}
                                disabled={isMutating}
                              >
                                <Globe className="w-4 h-4 mr-1" />
                                Publish
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnpublishYear(yearData.year)}
                                disabled={isMutating}
                              >
                                <GlobeLock className="w-4 h-4 mr-1" />
                                Unpublish
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingYear(yearData)}
                              disabled={isMutating}
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            {!yearData.is_active && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteYear(yearData.year)}
                                disabled={isMutating}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpanded(yearData.year)}
                            >
                              {expandedYears.has(yearData.year) ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        {yearData.description && (
                          <p className="text-sm text-[var(--muted-foreground)] mt-2">
                            {yearData.description}
                          </p>
                        )}
                      </div>

                      {/* Expanded Content */}
                      {expandedYears.has(yearData.year) && (
                        <>
                          {/* Assessment Period */}
                          <div className="p-6 border-b border-[var(--border)] bg-[var(--background)]/30">
                            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-[var(--cityscape-yellow)]" />
                              Assessment Period
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-[var(--muted-foreground)]">Start:</span>
                                <span className="ml-2 text-[var(--foreground)]">
                                  {formatDate(yearData.assessment_period_start)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[var(--muted-foreground)]">End:</span>
                                <span className="ml-2 text-[var(--foreground)]">
                                  {formatDate(yearData.assessment_period_end)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Deadlines Grid */}
                          <div className="p-6">
                            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center">
                              <Clock className="w-4 h-4 mr-2 text-[var(--cityscape-yellow)]" />
                              Submission Deadlines
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Phase 1 */}
                              <div className="p-3 bg-[var(--background)] rounded-sm border border-[var(--border)]">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <h4 className="font-medium text-[var(--foreground)] text-sm">
                                    Phase 1
                                  </h4>
                                </div>
                                <p className="text-xs text-[var(--foreground)]">
                                  {formatDate(yearData.phase1_deadline)}
                                </p>
                              </div>

                              {/* Rework */}
                              <div className="p-3 bg-[var(--background)] rounded-sm border border-[var(--border)]">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                  <h4 className="font-medium text-[var(--foreground)] text-sm">
                                    Rework
                                  </h4>
                                </div>
                                <p className="text-xs text-[var(--foreground)]">
                                  {formatDate(yearData.rework_deadline)}
                                </p>
                              </div>

                              {/* Phase 2 */}
                              <div className="p-3 bg-[var(--background)] rounded-sm border border-[var(--border)]">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                  <h4 className="font-medium text-[var(--foreground)] text-sm">
                                    Phase 2
                                  </h4>
                                </div>
                                <p className="text-xs text-[var(--foreground)]">
                                  {formatDate(yearData.phase2_deadline)}
                                </p>
                              </div>

                              {/* Calibration */}
                              <div className="p-3 bg-[var(--background)] rounded-sm border border-[var(--border)]">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <h4 className="font-medium text-[var(--foreground)] text-sm">
                                    Calibration
                                  </h4>
                                </div>
                                <p className="text-xs text-[var(--foreground)]">
                                  {formatDate(yearData.calibration_deadline)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]/50">
                            <div className="grid grid-cols-2 gap-4 text-xs text-[var(--muted-foreground)]">
                              <div>Created: {formatDate(yearData.created_at)}</div>
                              <div>Last Updated: {formatDate(yearData.updated_at)}</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Create Form Section */}
              {showCreateForm && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-[var(--foreground)]">
                      Create New Assessment Year
                    </h2>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                      disabled={isCreatingYear}
                    >
                      Cancel
                    </Button>
                  </div>
                  <CycleForm onSubmit={handleCreateYear} isLoading={isCreatingYear} mode="create" />
                </div>
              )}

              {/* Edit Form Section */}
              {editingYear && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-[var(--foreground)]">
                      Edit Assessment Year {editingYear.year}
                    </h2>
                    <Button
                      variant="outline"
                      onClick={() => setEditingYear(null)}
                      disabled={isUpdatingYear}
                    >
                      Cancel
                    </Button>
                  </div>
                  <CycleForm
                    onSubmit={handleUpdateYear}
                    isLoading={isUpdatingYear}
                    initialValues={transformApiToFormData(editingYear)}
                    mode="edit"
                  />
                </div>
              )}

              {/* Show Create Button when there are years and no form is open */}
              {years.length > 0 && !showCreateForm && !editingYear && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-white rounded-sm"
                    aria-label="Create new assessment year"
                  >
                    <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                    Create New Year
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Deadline Windows Tab */}
          {activeTab === "deadline-windows" && (
            <section aria-label="Deadline windows configuration">
              <DeadlineWindowsConfig />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
