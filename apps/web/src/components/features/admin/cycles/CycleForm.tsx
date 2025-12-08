import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import type { AssessmentYearFormData } from "@/hooks/useAssessmentYears";

interface CycleFormProps {
  onSubmit: (data: AssessmentYearFormData) => Promise<void>;
  isLoading?: boolean;
  initialValues?: Partial<AssessmentYearFormData>;
  mode?: "create" | "edit";
}

export function CycleForm({
  onSubmit,
  isLoading = false,
  initialValues,
  mode = "create",
}: CycleFormProps) {
  const currentYear = new Date().getFullYear();

  // Default start: Jan 1 of the selected year
  // Default end: Dec 31 of the selected year
  const getDefaultDates = (year: number) => {
    const startDate = new Date(year, 0, 1, 0, 0);
    const endDate = new Date(year, 11, 31, 23, 59);
    return {
      start: startDate.toISOString().slice(0, 16),
      end: endDate.toISOString().slice(0, 16),
    };
  };

  const defaultDates = getDefaultDates(initialValues?.year || currentYear);

  const [form, setForm] = React.useState<AssessmentYearFormData>({
    year: initialValues?.year || currentYear,
    assessment_period_start: initialValues?.assessment_period_start || defaultDates.start,
    assessment_period_end: initialValues?.assessment_period_end || defaultDates.end,
    phase1_deadline: initialValues?.phase1_deadline || null,
    rework_deadline: initialValues?.rework_deadline || null,
    phase2_deadline: initialValues?.phase2_deadline || null,
    calibration_deadline: initialValues?.calibration_deadline || null,
    description: initialValues?.description || null,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Update dates when year changes (for new cycles only)
  const handleYearChange = (newYear: number) => {
    if (mode === "create") {
      const newDates = getDefaultDates(newYear);
      setForm((prev) => ({
        ...prev,
        year: newYear,
        assessment_period_start: newDates.start,
        assessment_period_end: newDates.end,
      }));
    } else {
      setForm((prev) => ({ ...prev, year: newYear }));
    }
    if (errors.year) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.year;
        return newErrors;
      });
    }
  };

  // Validate form fields
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!form.year) {
      newErrors.year = "Year is required";
    } else if (form.year < 2020 || form.year > 2100) {
      newErrors.year = "Year must be between 2020 and 2100";
    }

    if (!form.assessment_period_start) {
      newErrors.assessment_period_start = "Assessment period start is required";
    }

    if (!form.assessment_period_end) {
      newErrors.assessment_period_end = "Assessment period end is required";
    }

    // Validate period order
    if (form.assessment_period_start && form.assessment_period_end) {
      const start = new Date(form.assessment_period_start);
      const end = new Date(form.assessment_period_end);
      if (start >= end) {
        newErrors.assessment_period_end = "End date must be after start date";
      }
    }

    // Validate deadline chronological order (if all are set)
    const deadlines = [
      { key: "phase1_deadline", value: form.phase1_deadline, label: "Phase 1" },
      { key: "rework_deadline", value: form.rework_deadline, label: "Rework" },
      { key: "phase2_deadline", value: form.phase2_deadline, label: "Phase 2" },
      { key: "calibration_deadline", value: form.calibration_deadline, label: "Calibration" },
    ];

    let prevDate: Date | null = null;
    let prevLabel = "";

    for (const deadline of deadlines) {
      if (deadline.value) {
        const date = new Date(deadline.value);
        if (prevDate && date <= prevDate) {
          newErrors[deadline.key] = `${deadline.label} deadline must be after ${prevLabel}`;
        }
        prevDate = date;
        prevLabel = deadline.label;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(form);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const handleInputChange = (
    field: keyof AssessmentYearFormData,
    value: string | number | null
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Year */}
      <div className="space-y-2">
        <Label htmlFor="year">
          Assessment Year <span className="text-red-500">*</span>
        </Label>
        <Input
          id="year"
          type="number"
          value={form.year}
          onChange={(e) => handleYearChange(parseInt(e.target.value))}
          min={2020}
          max={2100}
          disabled={isLoading || mode === "edit"}
          className={errors.year ? "border-red-500" : ""}
        />
        {errors.year && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.year}
          </p>
        )}
        {mode === "edit" && (
          <p className="text-xs text-[var(--muted-foreground)]">
            Year cannot be changed after creation
          </p>
        )}
      </div>

      {/* Assessment Period Section */}
      <div className="space-y-4 pt-4 border-t border-[var(--border)]">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Assessment Period
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Define the overall assessment period for this year
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Period Start */}
          <div className="space-y-2">
            <Label htmlFor="assessment_period_start">
              Period Start <span className="text-red-500">*</span>
            </Label>
            <Input
              id="assessment_period_start"
              type="datetime-local"
              value={form.assessment_period_start}
              onChange={(e) =>
                handleInputChange("assessment_period_start", e.target.value)
              }
              disabled={isLoading}
              className={errors.assessment_period_start ? "border-red-500" : ""}
            />
            {errors.assessment_period_start && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.assessment_period_start}
              </p>
            )}
          </div>

          {/* Period End */}
          <div className="space-y-2">
            <Label htmlFor="assessment_period_end">
              Period End <span className="text-red-500">*</span>
            </Label>
            <Input
              id="assessment_period_end"
              type="datetime-local"
              value={form.assessment_period_end}
              onChange={(e) =>
                handleInputChange("assessment_period_end", e.target.value)
              }
              disabled={isLoading}
              className={errors.assessment_period_end ? "border-red-500" : ""}
            />
            {errors.assessment_period_end && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.assessment_period_end}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Deadlines Section */}
      <div className="space-y-4 pt-4 border-t border-[var(--border)]">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Submission Deadlines
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          All deadlines must be in chronological order: Phase 1 → Rework → Phase 2
          → Calibration (optional)
        </p>

        {/* Phase 1 Deadline */}
        <div className="space-y-2">
          <Label htmlFor="phase1_deadline">
            Phase 1 Deadline (Initial Submission)
          </Label>
          <Input
            id="phase1_deadline"
            type="datetime-local"
            value={form.phase1_deadline || ""}
            onChange={(e) =>
              handleInputChange("phase1_deadline", e.target.value || null)
            }
            disabled={isLoading}
            className={errors.phase1_deadline ? "border-red-500" : ""}
          />
          {errors.phase1_deadline && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.phase1_deadline}
            </p>
          )}
        </div>

        {/* Rework Deadline */}
        <div className="space-y-2">
          <Label htmlFor="rework_deadline">Rework Deadline</Label>
          <Input
            id="rework_deadline"
            type="datetime-local"
            value={form.rework_deadline || ""}
            onChange={(e) =>
              handleInputChange("rework_deadline", e.target.value || null)
            }
            disabled={isLoading}
            className={errors.rework_deadline ? "border-red-500" : ""}
          />
          {errors.rework_deadline && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.rework_deadline}
            </p>
          )}
        </div>

        {/* Phase 2 Deadline */}
        <div className="space-y-2">
          <Label htmlFor="phase2_deadline">
            Phase 2 Deadline (Final Submission)
          </Label>
          <Input
            id="phase2_deadline"
            type="datetime-local"
            value={form.phase2_deadline || ""}
            onChange={(e) =>
              handleInputChange("phase2_deadline", e.target.value || null)
            }
            disabled={isLoading}
            className={errors.phase2_deadline ? "border-red-500" : ""}
          />
          {errors.phase2_deadline && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.phase2_deadline}
            </p>
          )}
        </div>

        {/* Calibration Deadline */}
        <div className="space-y-2">
          <Label htmlFor="calibration_deadline">Calibration Deadline</Label>
          <Input
            id="calibration_deadline"
            type="datetime-local"
            value={form.calibration_deadline || ""}
            onChange={(e) =>
              handleInputChange("calibration_deadline", e.target.value || null)
            }
            disabled={isLoading}
            className={errors.calibration_deadline ? "border-red-500" : ""}
          />
          {errors.calibration_deadline && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.calibration_deadline}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2 pt-4 border-t border-[var(--border)]">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={form.description || ""}
          onChange={(e) =>
            handleInputChange("description", e.target.value || null)
          }
          placeholder="Add notes about this assessment year..."
          disabled={isLoading}
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          {(form.description?.length || 0)} / 500 characters
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-white"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {mode === "create" ? "Creating..." : "Saving..."}
            </>
          ) : mode === "create" ? (
            "Create Assessment Year"
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
