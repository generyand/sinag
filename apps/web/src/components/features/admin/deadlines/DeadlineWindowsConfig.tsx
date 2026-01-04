"use client";

import { useState, useEffect } from "react";
import { Clock, Save, Info, AlertTriangle, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useGetAssessmentYears, usePatchAssessmentYearsYear } from "@sinag/shared";

interface DeadlineWindowsConfigProps {
  /** Pre-select a specific year */
  defaultYear?: number;
}

export function DeadlineWindowsConfig({ defaultYear }: DeadlineWindowsConfigProps) {
  const { toast } = useToast();
  const { data: yearsData, isLoading: isLoadingYears, isError, error } = useGetAssessmentYears();
  const updateYear = usePatchAssessmentYearsYear();

  const [selectedYear, setSelectedYear] = useState<number | null>(defaultYear ?? null);
  const [formData, setFormData] = useState({
    submission_window_days: 60,
    rework_window_days: 5,
    calibration_window_days: 3,
    phase1_deadline: "" as string,
  });
  const [isDirty, setIsDirty] = useState(false);

  // Auto-select the active year when data loads
  useEffect(() => {
    if (yearsData?.years && selectedYear === null) {
      const activeYear = yearsData.years.find((y) => y.is_active);
      if (activeYear) {
        setSelectedYear(activeYear.year);
      }
    }
  }, [yearsData, selectedYear]);

  // Update form data when year selection changes
  useEffect(() => {
    if (selectedYear && yearsData?.years) {
      const yearConfig = yearsData.years.find((y) => y.year === selectedYear);
      if (yearConfig) {
        const deadlineDate = yearConfig.phase1_deadline
          ? new Date(yearConfig.phase1_deadline).toISOString().split("T")[0]
          : "";
        setFormData({
          submission_window_days: yearConfig.submission_window_days ?? 60,
          rework_window_days: yearConfig.rework_window_days ?? 5,
          calibration_window_days: yearConfig.calibration_window_days ?? 3,
          phase1_deadline: deadlineDate,
        });
        setIsDirty(false);
      }
    }
  }, [selectedYear, yearsData]);

  const handleInputChange = (field: keyof typeof formData, value: number | string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!selectedYear) return;

    try {
      const phase1DeadlineISO = formData.phase1_deadline
        ? new Date(formData.phase1_deadline + "T23:59:59").toISOString()
        : null;

      await updateYear.mutateAsync({
        year: selectedYear,
        data: {
          submission_window_days: formData.submission_window_days,
          rework_window_days: formData.rework_window_days,
          calibration_window_days: formData.calibration_window_days,
          phase1_deadline: phase1DeadlineISO,
        },
      });

      toast({
        title: "Settings saved",
        description: `Deadline settings for ${selectedYear} have been updated.`,
      });
      setIsDirty(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to save deadline window settings.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <Card className="bg-[var(--card)] border border-[var(--border)] rounded-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-red-500" />
            Deadline Windows Configuration
          </CardTitle>
          <CardDescription>
            Configure submission deadlines and window durations for rework and calibration periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Assessment Year</Label>
            <Select
              value={selectedYear?.toString() ?? ""}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
              disabled={isLoadingYears}
            >
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Choose a year to configure" />
              </SelectTrigger>
              <SelectContent>
                {yearsData?.years?.map((y) => (
                  <SelectItem key={y.year} value={y.year.toString()}>
                    {y.year} {y.is_active && "(Active)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load assessment years</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Form */}
      {selectedYear && (
        <Card className="bg-[var(--card)] border border-[var(--border)] rounded-sm">
          <CardHeader>
            <CardTitle className="text-lg">Window Configuration for {selectedYear}</CardTitle>
            <CardDescription>These values determine deadlines for BLGU submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Manual Submission Deadline */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-orange-500" />
                <Label htmlFor="submission-deadline" className="text-sm font-medium">
                  Submission Deadline (for DRAFT assessments)
                </Label>
              </div>
              <Input
                id="submission-deadline"
                type="date"
                value={formData.phase1_deadline}
                onChange={(e) => handleInputChange("phase1_deadline", e.target.value)}
                className="w-full md:w-[250px]"
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Hard deadline for barangays to submit their initial assessment. Only affects
                assessments still in DRAFT status.
              </p>
            </div>

            {/* Rework & Calibration Windows Section */}
            <div className="border-t border-[var(--border)] pt-6">
              <h4 className="text-sm font-medium text-[var(--muted-foreground)] mb-4">
                Rework & Calibration Windows
              </h4>

              {/* Rework Window */}
              <div className="space-y-2 mb-6">
                <Label htmlFor="rework-window" className="text-sm font-medium">
                  Rework Window (days)
                </Label>
                <Input
                  id="rework-window"
                  type="number"
                  min={1}
                  max={30}
                  value={formData.rework_window_days}
                  onChange={(e) =>
                    handleInputChange("rework_window_days", parseInt(e.target.value) || 5)
                  }
                  className="w-full md:w-[200px]"
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Days BLGU has to resubmit after Assessor triggers rework (default: 5 days)
                </p>
              </div>

              {/* Calibration Window */}
              <div className="space-y-2">
                <Label htmlFor="calibration-window" className="text-sm font-medium">
                  Calibration Window (days)
                </Label>
                <Input
                  id="calibration-window"
                  type="number"
                  min={1}
                  max={30}
                  value={formData.calibration_window_days}
                  onChange={(e) =>
                    handleInputChange("calibration_window_days", parseInt(e.target.value) || 3)
                  }
                  className="w-full md:w-[200px]"
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Days BLGU has to resubmit after Validator triggers calibration (default: 3 days)
                </p>
              </div>
            </div>

            {/* Info Box */}
            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">
                How Deadlines Work
              </AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <ul className="mt-2 space-y-1 text-sm">
                  <li>
                    <strong>Submission Deadline:</strong> Hard cutoff for DRAFT assessments to be
                    submitted for review
                  </li>
                  <li>
                    <strong>Rework Window:</strong> Days added when Assessor requests rework
                    (deadline = request time + days)
                  </li>
                  <li>
                    <strong>Calibration Window:</strong> Days added when Validator requests
                    calibration (deadline = request time + days)
                  </li>
                  <li>MLGOO can extend individual assessment deadlines as needed</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-[var(--border)]">
              <Button
                onClick={handleSave}
                disabled={updateYear.isPending || !isDirty}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateYear.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedYear && !isLoadingYears && !isError && (
        <Card className="bg-[var(--card)] border border-[var(--border)] rounded-sm border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-[var(--muted-foreground)] mb-4" />
            <p className="text-[var(--muted-foreground)] text-center">
              Select an assessment year above to configure its deadline windows
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
