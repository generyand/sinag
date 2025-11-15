/**
 * ⏰ Deadline Override Modal Component
 *
 * Multi-step modal for extending deadlines for specific barangays and indicators.
 *
 * Steps:
 * 1. Select Barangay - Dropdown selection with search
 * 2. Select Indicators - Multi-select checkbox list
 * 3. Set New Deadline & Reason - Date picker + textarea justification
 * 4. Confirmation Summary - Review before submission
 */

import * as React from "react";
import { useDeadlines } from "@/hooks/useDeadlines";
import { useBarangays } from "@/hooks/useBarangays";
import { useIndicators } from "@/hooks/useIndicators";
import { useCycles } from "@/hooks/useCycles";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Calendar,
  FileText,
  List,
  MapPin,
} from "lucide-react";

interface DeadlineOverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedBarangayId?: number;
  onSuccess?: () => void;
}

interface FormData {
  barangayId: number | null;
  indicatorIds: number[];
  newDeadline: string;
  reason: string;
}

export function DeadlineOverrideModal({
  open,
  onOpenChange,
  preSelectedBarangayId,
  onSuccess,
}: DeadlineOverrideModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [formData, setFormData] = React.useState<FormData>({
    barangayId: preSelectedBarangayId || null,
    indicatorIds: [],
    newDeadline: "",
    reason: "",
  });

  // Fetch data
  const { activeCycle } = useCycles();
  const { data: barangays, isLoading: isLoadingBarangays } = useBarangays();
  const { data: indicators, isLoading: isLoadingIndicators } = useIndicators();
  const { createOverride, isCreatingOverride, refetchStatus } = useDeadlines();

  // Barangay search
  const [barangaySearch, setBarangaySearch] = React.useState("");

  // Filter barangays by search
  const filteredBarangays = React.useMemo(() => {
    if (!barangays) return [];
    if (!barangaySearch) return barangays;
    return (barangays as any).filter((b: any) =>
      b.name.toLowerCase().includes(barangaySearch.toLowerCase())
    );
  }, [barangays, barangaySearch]);

  // Get active indicators
  const activeIndicators = React.useMemo(() => {
    if (!indicators) return [];
    return indicators.filter((i: any) => i.is_active);
  }, [indicators]);

  // Reset form when modal closes or opens
  React.useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setFormData({
        barangayId: preSelectedBarangayId || null,
        indicatorIds: [],
        newDeadline: "",
        reason: "",
      });
      setBarangaySearch("");
    } else {
      // When modal opens with pre-selected barangay, skip to step 2
      if (preSelectedBarangayId) {
        setCurrentStep(2);
        setFormData({
          barangayId: preSelectedBarangayId,
          indicatorIds: [],
          newDeadline: "",
          reason: "",
        });
      } else {
        setCurrentStep(1);
      }
    }
  }, [open, preSelectedBarangayId]);

  // Validation for each step
  const canProceedToStep2 = formData.barangayId !== null;
  const canProceedToStep3 = formData.indicatorIds.length > 0;
  const canProceedToStep4 = formData.newDeadline !== "" && formData.reason.length >= 10;

  // Handle step navigation
  const handleNext = () => {
    if (currentStep === 1 && !canProceedToStep2) {
      toast({
        title: "Barangay Required",
        description: "Please select a barangay to continue.",
        variant: "destructive",
      });
      return;
    }
    if (currentStep === 2 && !canProceedToStep3) {
      toast({
        title: "Indicators Required",
        description: "Please select at least one indicator to continue.",
        variant: "destructive",
      });
      return;
    }
    if (currentStep === 3 && !canProceedToStep4) {
      toast({
        title: "Missing Information",
        description: "Please provide a new deadline and a reason (minimum 10 characters).",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevious = () => {
    // If barangay is pre-selected, don't go back to step 1
    const minStep = preSelectedBarangayId ? 2 : 1;
    setCurrentStep((prev) => Math.max(prev - 1, minStep));
  };

  // Handle submission
  const handleSubmit = async () => {
    if (!activeCycle || !formData.barangayId) return;

    try {
      // Create override for each selected indicator
      const promises = formData.indicatorIds.map((indicatorId) =>
        createOverride.mutateAsync({
          data: {
            cycle_id: activeCycle.id,
            barangay_id: formData.barangayId!,
            indicator_id: indicatorId,
            new_deadline: formData.newDeadline,
            reason: formData.reason,
          },
        })
      );

      await Promise.all(promises);

      // Success notification
      toast({
        title: "Deadline Extended",
        description: `Successfully extended deadline for ${formData.indicatorIds.length} indicator(s).`,
        variant: "default",
      });

      // Refresh dashboard data
      await refetchStatus();

      // Close modal and trigger success callback
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Failed to Extend Deadline",
        description: error?.message || "An error occurred while extending the deadline.",
        variant: "destructive",
      });
    }
  };

  // Get selected barangay and indicators for display
  const selectedBarangay = (barangays as any)?.find((b: any) => b.id === formData.barangayId);
  const selectedIndicators = activeIndicators.filter((i: any) =>
    formData.indicatorIds.includes(i.id)
  );

  // Select/Deselect all indicators
  const handleSelectAllIndicators = () => {
    if (formData.indicatorIds.length === activeIndicators.length) {
      setFormData({ ...formData, indicatorIds: [] });
    } else {
      setFormData({
        ...formData,
        indicatorIds: activeIndicators.map((i: any) => i.id),
      });
    }
  };

  // Toggle individual indicator
  const handleToggleIndicator = (indicatorId: number) => {
    setFormData({
      ...formData,
      indicatorIds: formData.indicatorIds.includes(indicatorId)
        ? formData.indicatorIds.filter((id) => id !== indicatorId)
        : [...formData.indicatorIds, indicatorId],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-[var(--card)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#F7B520]" />
            Extend Deadline
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step < currentStep
                    ? "bg-green-500 text-white"
                    : step === currentStep
                    ? "bg-[#F7B520] text-white"
                    : "bg-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
              {step < 4 && (
                <div
                  className={`w-16 h-0.5 ${
                    step < currentStep ? "bg-green-500" : "bg-[var(--border)]"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-4">
          {/* Step 1: Select Barangay */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-[var(--muted-foreground)]" />
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Step 1: Select Barangay
                </h3>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Choose the barangay for which you want to extend the deadline.
              </p>

              <div className="space-y-2">
                <Label htmlFor="barangay-search">Search Barangay</Label>
                <Input
                  id="barangay-search"
                  type="text"
                  placeholder="Type to search..."
                  value={barangaySearch}
                  onChange={(e) => setBarangaySearch(e.target.value)}
                  disabled={isLoadingBarangays}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barangay-select">Barangay</Label>
                <Select
                  value={formData.barangayId?.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, barangayId: parseInt(value) })
                  }
                  disabled={isLoadingBarangays}
                >
                  <SelectTrigger id="barangay-select">
                    <SelectValue placeholder="Select a barangay" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBarangays.length === 0 ? (
                      <div className="p-4 text-center text-[var(--muted-foreground)]">
                        No barangays found
                      </div>
                    ) : (
                      filteredBarangays.map((barangay: any) => (
                        <SelectItem key={barangay.id} value={barangay.id.toString()}>
                          {barangay.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Select Indicators */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <List className="w-5 h-5 text-[var(--muted-foreground)]" />
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Step 2: Select Indicators
                </h3>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Select one or more indicators for deadline extension.
              </p>

              <div className="flex items-center justify-between">
                <Label>Indicators ({formData.indicatorIds.length} selected)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllIndicators}
                  disabled={isLoadingIndicators}
                >
                  {formData.indicatorIds.length === activeIndicators.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>

              <div className="max-h-[300px] overflow-y-auto border border-[var(--border)] rounded-sm p-4 space-y-3">
                {isLoadingIndicators ? (
                  <p className="text-center text-[var(--muted-foreground)]">
                    Loading indicators...
                  </p>
                ) : activeIndicators.length === 0 ? (
                  <p className="text-center text-[var(--muted-foreground)]">
                    No active indicators found
                  </p>
                ) : (
                  activeIndicators.map((indicator: any) => (
                    <div
                      key={indicator.id}
                      className="flex items-start gap-3 p-2 hover:bg-[var(--background)] rounded-sm transition-colors"
                    >
                      <Checkbox
                        id={`indicator-${indicator.id}`}
                        checked={formData.indicatorIds.includes(indicator.id)}
                        onCheckedChange={() => handleToggleIndicator(indicator.id)}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={`indicator-${indicator.id}`}
                          className="text-sm font-medium text-[var(--foreground)] cursor-pointer"
                        >
                          {indicator.name}
                        </label>
                        {indicator.description && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {indicator.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 3: Set New Deadline & Reason */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-[var(--muted-foreground)]" />
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Step 3: Set New Deadline & Reason
                </h3>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Specify the new deadline and provide a justification for the extension.
              </p>

              <div className="space-y-2">
                <Label htmlFor="new-deadline">
                  New Deadline <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="new-deadline"
                  type="datetime-local"
                  value={formData.newDeadline}
                  onChange={(e) =>
                    setFormData({ ...formData, newDeadline: e.target.value })
                  }
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason for Extension <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Provide a clear justification for extending this deadline (minimum 10 characters)..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  {formData.reason.length} / 10 characters minimum
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation Summary */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-[var(--muted-foreground)]" />
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Step 4: Confirmation
                </h3>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Review your selections before submitting.
              </p>

              <div className="bg-[var(--background)] border border-[var(--border)] rounded-sm p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase">
                    Barangay
                  </p>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {selectedBarangay?.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase">
                    Indicators ({formData.indicatorIds.length})
                  </p>
                  <ul className="text-sm text-[var(--foreground)] space-y-1 mt-1">
                    {selectedIndicators.map((indicator: any) => (
                      <li key={indicator.id}>• {indicator.name}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase">
                    New Deadline
                  </p>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {new Date(formData.newDeadline).toLocaleString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase">
                    Reason
                  </p>
                  <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">
                    {formData.reason}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-sm p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Summary
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    You are about to extend the deadline for{" "}
                    <span className="font-semibold">{formData.indicatorIds.length}</span>{" "}
                    indicator(s) in <span className="font-semibold">{selectedBarangay?.name}</span>{" "}
                    until{" "}
                    <span className="font-semibold">
                      {new Date(formData.newDeadline).toLocaleDateString()}
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer with Navigation */}
        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevious} disabled={isCreatingOverride}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-white"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isCreatingOverride}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isCreatingOverride ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Confirm & Submit
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
