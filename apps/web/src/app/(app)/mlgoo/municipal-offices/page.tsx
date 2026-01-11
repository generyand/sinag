"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronRight,
  Edit,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/store/useAuthStore";
import {
  useGetMunicipalOfficesGrouped,
  useDeleteMunicipalOfficesOfficeId,
  getGetMunicipalOfficesGroupedQueryKey,
  MunicipalOfficeResponse,
} from "@sinag/shared";
import { MunicipalOfficeForm } from "@/components/features/municipal-offices/MunicipalOfficeForm";
import { MunicipalOfficeSkeleton } from "@/components/features/municipal-offices/MunicipalOfficeSkeleton";
import { toast } from "sonner";

export default function MunicipalOfficesPage() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<MunicipalOfficeResponse | null>(null);
  const [deletingOffice, setDeletingOffice] = useState<MunicipalOfficeResponse | null>(null);
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6]));

  const {
    data: groupedOffices,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetMunicipalOfficesGrouped();
  const deleteMutation = useDeleteMunicipalOfficesOfficeId();

  const toggleArea = (areaId: number) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
      } else {
        next.add(areaId);
      }
      return next;
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingOffice) return;

    try {
      await deleteMutation.mutateAsync({ officeId: deletingOffice.id });
      toast.success(`${deletingOffice.abbreviation} has been deactivated`);
      queryClient.invalidateQueries({
        queryKey: getGetMunicipalOfficesGroupedQueryKey(),
      });
    } catch {
      toast.error("Failed to deactivate office");
    } finally {
      setDeletingOffice(null);
    }
  };

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setEditingOffice(null);
    queryClient.invalidateQueries({
      queryKey: getGetMunicipalOfficesGroupedQueryKey(),
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-[var(--muted-foreground)]">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <MunicipalOfficeSkeleton />;
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              Failed to load municipal offices
            </h2>
            <p className="text-[var(--muted-foreground)] mb-4 max-w-md">
              {error instanceof Error
                ? error.message
                : "An unexpected error occurred. Please try again."}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-sm flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30">
                <Building2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--foreground)]">Municipal Offices</h1>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Manage offices linked to governance areas
                </p>
              </div>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow)]/90 text-black">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Office
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Municipal Office</DialogTitle>
                  <DialogDescription>
                    Create a new municipal office linked to a governance area.
                  </DialogDescription>
                </DialogHeader>
                <MunicipalOfficeForm
                  onSuccess={handleFormSuccess}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Grouped Offices */}
          <div className="space-y-4">
            {groupedOffices?.map((group) => (
              <Card
                key={group.governance_area_id}
                className="overflow-hidden border border-[var(--border)]"
              >
                <CardHeader
                  className="cursor-pointer hover:bg-[var(--muted)]/50 transition-colors py-4"
                  onClick={() => toggleArea(group.governance_area_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedAreas.has(group.governance_area_id) ? (
                        <ChevronDown className="h-5 w-5 text-[var(--muted-foreground)]" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-[var(--muted-foreground)]" />
                      )}
                      <CardTitle className="text-lg">{group.governance_area_name}</CardTitle>
                      <Badge
                        variant="outline"
                        className={
                          group.area_type === "CORE"
                            ? "border-blue-500 text-blue-600"
                            : "border-purple-500 text-purple-600"
                        }
                      >
                        {group.area_type}
                      </Badge>
                    </div>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {group.offices.length} office(s)
                    </span>
                  </div>
                </CardHeader>

                {expandedAreas.has(group.governance_area_id) && (
                  <CardContent className="pt-0 pb-4">
                    {group.offices.length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
                        No offices assigned to this governance area
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.offices.map((office) => (
                          <div
                            key={office.id}
                            className="p-4 border border-[var(--border)] rounded-sm hover:border-emerald-500/50 transition-colors bg-[var(--card)]"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[var(--foreground)]">
                                  {office.abbreviation}
                                </p>
                                <p className="text-sm text-[var(--muted-foreground)] truncate">
                                  {office.name}
                                </p>
                              </div>
                              <div className="flex gap-1 ml-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingOffice(office);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingOffice(office);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {office.contact_person && (
                              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                                Contact: {office.contact_person}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingOffice} onOpenChange={() => setEditingOffice(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Municipal Office</DialogTitle>
            <DialogDescription>Update the municipal office details.</DialogDescription>
          </DialogHeader>
          {editingOffice && (
            <MunicipalOfficeForm
              office={editingOffice}
              onSuccess={handleFormSuccess}
              onCancel={() => setEditingOffice(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingOffice} onOpenChange={() => setDeletingOffice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Municipal Office</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{deletingOffice?.abbreviation}</strong>?
              This action can be reversed by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
