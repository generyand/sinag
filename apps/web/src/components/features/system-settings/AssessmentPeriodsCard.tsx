"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DataTable from "@/components/shared/DataTable";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { CreateAssessmentPeriodDialog } from "./CreateAssessmentPeriodDialog";
import { AssessmentPeriod } from "@/types/system-settings";

interface AssessmentPeriodsCardProps {
  periods: AssessmentPeriod[];
  onCreatePeriod: (data: { performanceYear: number; assessmentYear: number }) => void;
  onActivatePeriod: (periodId: string) => void;
  onArchivePeriod: (periodId: string) => void;
  onDeletePeriod: (periodId: string) => void;
  onViewPeriod: (periodId: string) => void;
  isLoading?: boolean;
}

export function AssessmentPeriodsCard({
  periods,
  onCreatePeriod,
  onActivatePeriod,
  onArchivePeriod,
  onDeletePeriod,
  onViewPeriod,
  isLoading = false,
}: AssessmentPeriodsCardProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "warning",
    onConfirm: () => {},
  });

  const getStatusColor = (status: AssessmentPeriod["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "archived":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleAction = (action: string, period: AssessmentPeriod) => {
    switch (action) {
      case "activate":
        setConfirmationDialog({
          isOpen: true,
          title: "Activate Assessment Period",
          message: `Are you sure you want to activate the SGLGB ${period.assessmentYear} cycle? This will make it the live assessment period for all users. The current active cycle will be archived.`,
          variant: "warning",
          onConfirm: () => {
            onActivatePeriod(period.id);
            setConfirmationDialog({ ...confirmationDialog, isOpen: false });
          },
        });
        break;
      case "archive":
        setConfirmationDialog({
          isOpen: true,
          title: "Archive Assessment Period",
          message:
            "Archiving this cycle will make all related assessments read-only. This action is final. Are you sure?",
          variant: "warning",
          onConfirm: () => {
            onArchivePeriod(period.id);
            setConfirmationDialog({ ...confirmationDialog, isOpen: false });
          },
        });
        break;
      case "delete":
        setConfirmationDialog({
          isOpen: true,
          title: "Delete Assessment Period",
          message:
            "This action cannot be undone and will delete all associated assessment records for this period. Are you sure you want to proceed?",
          variant: "danger",
          onConfirm: () => {
            onDeletePeriod(period.id);
            setConfirmationDialog({ ...confirmationDialog, isOpen: false });
          },
        });
        break;
      case "view":
        onViewPeriod(period.id);
        break;
    }
  };

  const columns = [
    {
      key: "performanceYear" as keyof AssessmentPeriod,
      label: "Performance Year",
      sortable: true,
    },
    {
      key: "assessmentYear" as keyof AssessmentPeriod,
      label: "Assessment Year",
      sortable: true,
    },
    {
      key: "status" as keyof AssessmentPeriod,
      label: "Status",
      sortable: true,
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as AssessmentPeriod["status"])}>
          {(value as string).charAt(0).toUpperCase() + (value as string).slice(1)}
        </Badge>
      ),
    },
    {
      key: "actions" as keyof AssessmentPeriod,
      label: "Actions",
      sortable: false,
      render: (_value: unknown, row: AssessmentPeriod) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.status === "upcoming" && (
              <>
                <DropdownMenuItem onClick={() => handleAction("activate", row)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction("delete", row)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
            {row.status === "active" && (
              <DropdownMenuItem onClick={() => handleAction("archive", row)}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )}
            {row.status === "archived" && (
              <DropdownMenuItem onClick={() => handleAction("view", row)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Assessment Periods</CardTitle>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Assessment Period
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable<AssessmentPeriod>
            data={periods}
            columns={columns}
            loading={isLoading}
            emptyMessage="No assessment periods found"
          />
        </CardContent>
      </Card>

      <CreateAssessmentPeriodDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={onCreatePeriod}
      />

      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog({ ...confirmationDialog, isOpen: false })}
        onConfirm={confirmationDialog.onConfirm}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        variant={confirmationDialog.variant}
      />
    </>
  );
}
