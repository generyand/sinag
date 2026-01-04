"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { api } from "@/lib/api";

// Export data type definitions
const EXPORT_DATA_TYPES = [
  {
    key: "assessments",
    label: "Assessment Submissions",
    description: "All assessment submissions with status, scores, and compliance",
    default: true,
  },
  {
    key: "analytics",
    label: "Analytics Summary",
    description: "Compliance rates, pass/fail statistics, and trends",
    default: true,
  },
  {
    key: "governance_areas",
    label: "Governance Area Performance",
    description: "Performance breakdown by governance area",
    default: true,
  },
  {
    key: "indicators",
    label: "Indicator Details",
    description: "Detailed indicator-level breakdown per barangay",
    default: false,
  },
  {
    key: "users",
    label: "BLGU Users",
    description: "List of registered BLGU users and their barangays",
    default: false,
  },
];

// Mock cycles data (will be replaced with API call)
const MOCK_CYCLES = [
  { id: 1, name: "SGLGB 2025", year: 2025, is_active: true },
  { id: 2, name: "SGLGB 2024", year: 2024, is_active: false },
];

type WizardStep = "select-cycle" | "select-data" | "preview" | "download";

export default function DataExportPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("select-cycle");
  const [selectedCycleId, setSelectedCycleId] = useState<string>("all");
  const [selectedDataTypes, setSelectedDataTypes] = useState<Set<string>>(
    new Set(EXPORT_DATA_TYPES.filter((dt) => dt.default).map((dt) => dt.key))
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [_isGenerated, setIsGenerated] = useState(false);

  const steps: { key: WizardStep; label: string; number: number }[] = [
    { key: "select-cycle", label: "Select Cycle", number: 1 },
    { key: "select-data", label: "Choose Data", number: 2 },
    { key: "preview", label: "Preview", number: 3 },
    { key: "download", label: "Download", number: 4 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);
  const selectedCycle = MOCK_CYCLES.find((c) => c.id.toString() === selectedCycleId);

  const handleDataTypeToggle = (key: string) => {
    const newSelected = new Set(selectedDataTypes);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedDataTypes(newSelected);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await api.post(
        "/api/v1/municipal-export/generate",
        {
          cycle_id: selectedCycleId && selectedCycleId !== "all" ? parseInt(selectedCycleId) : null,
          include_assessments: selectedDataTypes.has("assessments"),
          include_analytics: selectedDataTypes.has("analytics"),
          include_governance_areas: selectedDataTypes.has("governance_areas"),
          include_indicators: selectedDataTypes.has("indicators"),
          include_users: selectedDataTypes.has("users"),
        },
        {
          responseType: "blob",
        }
      );

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers["content-disposition"];
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `municipal_export_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // Download the file
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setIsGenerated(true);
      setCurrentStep("download");
      toast.success("Export generated successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to generate export. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "select-cycle":
        return true; // Cycle selection is optional
      case "select-data":
        return selectedDataTypes.size > 0;
      case "preview":
        return true;
      default:
        return false;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/mlgoo/settings")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Settings
            </Button>
          </div>

          {/* Page Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">Data Export</h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Export municipal assessment data to Excel
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    index <= currentStepIndex
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.number}</span>
                  )}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    index <= currentStepIndex
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)]"
                  }`}
                >
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-5 w-5 mx-4 text-[var(--muted-foreground)]" />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <Card className="border border-[var(--border)]">
            <CardHeader>
              <CardTitle>
                {currentStep === "select-cycle" && "Step 1: Select Assessment Cycle"}
                {currentStep === "select-data" && "Step 2: Choose Data to Export"}
                {currentStep === "preview" && "Step 3: Review Export"}
                {currentStep === "download" && "Step 4: Download Complete"}
              </CardTitle>
              <CardDescription>
                {currentStep === "select-cycle" &&
                  "Choose which assessment cycle to export data from, or export all cycles"}
                {currentStep === "select-data" &&
                  "Select the types of data you want to include in the export"}
                {currentStep === "preview" && "Review your selection before generating the export"}
                {currentStep === "download" && "Your export is ready for download"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Step 1: Select Cycle */}
              {currentStep === "select-cycle" && (
                <div className="space-y-4">
                  <Label>Assessment Cycle</Label>
                  <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                    <SelectTrigger className="w-full md:w-[300px]">
                      <SelectValue placeholder="All Cycles (default)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cycles</SelectItem>
                      {MOCK_CYCLES.map((cycle) => (
                        <SelectItem key={cycle.id} value={cycle.id.toString()}>
                          {cycle.name} {cycle.is_active && "(Active)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Leave empty to export data from all assessment cycles
                  </p>
                </div>
              )}

              {/* Step 2: Select Data Types */}
              {currentStep === "select-data" && (
                <div className="space-y-4">
                  {EXPORT_DATA_TYPES.map((dataType) => (
                    <div
                      key={dataType.key}
                      className="flex items-start space-x-3 p-4 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)]/50 transition-colors"
                    >
                      <Checkbox
                        id={dataType.key}
                        checked={selectedDataTypes.has(dataType.key)}
                        onCheckedChange={() => handleDataTypeToggle(dataType.key)}
                      />
                      <div className="space-y-1">
                        <Label
                          htmlFor={dataType.key}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {dataType.label}
                        </Label>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {dataType.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 3: Preview */}
              {currentStep === "preview" && (
                <div className="space-y-6">
                  <div className="bg-[var(--muted)]/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--muted-foreground)]">
                        Assessment Cycle:
                      </span>
                      <span className="text-sm font-medium">
                        {selectedCycle ? selectedCycle.name : "All Cycles"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--muted-foreground)]">Data Sections:</span>
                      <span className="text-sm font-medium">{selectedDataTypes.size} selected</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Included Sections:</h4>
                    <ul className="space-y-1">
                      {EXPORT_DATA_TYPES.filter((dt) => selectedDataTypes.has(dt.key)).map((dt) => (
                        <li
                          key={dt.key}
                          className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"
                        >
                          <Check className="h-4 w-4 text-green-500" />
                          {dt.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-[var(--border)]">
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="w-full gap-2 bg-amber-500 hover:bg-amber-600"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating Export...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Generate Export
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Download Complete */}
              {currentStep === "download" && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-[var(--foreground)]">Export Complete!</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Your Excel file has been downloaded to your device
                  </p>
                  <div className="pt-4 flex justify-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentStep("select-cycle");
                        setIsGenerated(false);
                      }}
                    >
                      Export Another
                    </Button>
                    <Button onClick={() => router.push("/mlgoo/settings")}>Back to Settings</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          {currentStep !== "download" && (
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack} disabled={currentStepIndex === 0}>
                Back
              </Button>
              {currentStep !== "preview" && (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
