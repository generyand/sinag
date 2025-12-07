"use client";

import {
  AIInsightsDisplay,
  AreaResultsDisplay,
  ComplianceBadge,
  InsightsGenerator,
} from "@/components/features/reports";
import { PageHeader } from "@/components/shared";
import { useIntelligence } from "@/hooks";
import {
  getGetCapdevAssessmentsAssessmentIdQueryKey,
  getGetMlgooAssessmentsAssessmentIdQueryKey,
  useGetCapdevAssessmentsAssessmentId,
  useGetMlgooAssessmentsAssessmentId,
} from "@sinag/shared";
import { useParams } from "next/navigation";
import { useMemo } from "react";

export default function ReportDetailsPage() {
  const params = useParams();
  const assessmentId = Number(params.id);

  // Fetch assessment details from MLGOO API
  const {
    data: assessmentData,
    isLoading,
    error: fetchError,
    refetch: refetchAssessment,
  } = useGetMlgooAssessmentsAssessmentId(assessmentId, {
    query: {
      queryKey: getGetMlgooAssessmentsAssessmentIdQueryKey(assessmentId),
      enabled: !isNaN(assessmentId),
    },
  });

  // Fetch CapDev insights (AI recommendations)
  const {
    data: capdevData,
    isLoading: isLoadingCapdev,
    refetch: refetchCapdev,
  } = useGetCapdevAssessmentsAssessmentId(assessmentId, {
    query: {
      queryKey: getGetCapdevAssessmentsAssessmentIdQueryKey(assessmentId),
      enabled: !isNaN(assessmentId) && assessmentData?.status === "COMPLETED",
    },
  });

  const {
    generateInsights: handleGenerateInsights,
    isGenerating,
    error: generationError,
  } = useIntelligence();

  // Transform area_results from API format to display format
  const areaResults = useMemo(() => {
    if (!assessmentData?.area_results) return undefined;

    // Convert area_results object to the expected format
    const results: Record<string, string> = {};
    if (typeof assessmentData.area_results === "object") {
      Object.entries(assessmentData.area_results).forEach(([key, value]) => {
        // Handle different possible formats
        if (typeof value === "string") {
          results[key] = value;
        } else if (typeof value === "object" && value !== null && "status" in value) {
          results[key] = (value as { status: string }).status;
        }
      });
    }
    return Object.keys(results).length > 0 ? results : undefined;
  }, [assessmentData?.area_results]);

  // Transform governance_areas to area_results format if area_results is not available
  const derivedAreaResults = useMemo(() => {
    if (areaResults) return areaResults;
    if (!assessmentData?.governance_areas) return undefined;

    const results: Record<string, string> = {};
    assessmentData.governance_areas.forEach((area) => {
      // Determine pass/fail based on area validation status
      const isPassed = area.indicators?.every((ind) => ind.validation_status === "PASSED") ?? false;
      results[area.name] = isPassed ? "Passed" : "Failed";
    });
    return Object.keys(results).length > 0 ? results : undefined;
  }, [areaResults, assessmentData?.governance_areas]);

  const handleGenerate = async () => {
    if (!assessmentId) return;

    try {
      await handleGenerateInsights(assessmentId);
      // Refetch CapDev data after generation
      setTimeout(() => {
        refetchCapdev();
      }, 5000);
    } catch (err) {
      console.error("Failed to generate insights:", err);
    }
  };

  const error = fetchError ? "Failed to load assessment details" : null;

  // Determine compliance status from API response
  const complianceStatus = assessmentData?.compliance_status as "Passed" | "Failed" | undefined;
  const isValidated =
    assessmentData?.status === "COMPLETED" || assessmentData?.status === "AWAITING_MLGOO_APPROVAL";
  const hasCapdevInsights = capdevData?.status === "completed" && capdevData?.insights;

  // Transform CapDev insights to the format expected by AIInsightsDisplay
  const transformedInsights = useMemo(() => {
    if (!hasCapdevInsights || !capdevData?.insights) return null;

    // Get the first available language's insights
    const defaultLang = capdevData.available_languages?.[0] || "en";
    const langInsights = capdevData.insights[defaultLang] as Record<string, unknown> | null;
    if (!langInsights) return null;

    // Handle flexible AI-generated content structure
    const summary = typeof langInsights.summary === "string" ? langInsights.summary : "";

    const recommendations = Array.isArray(langInsights.recommendations)
      ? langInsights.recommendations.map((r: unknown) => {
          if (typeof r === "string") return r;
          if (typeof r === "object" && r !== null) {
            return (
              (r as { title?: string; description?: string }).title ||
              (r as { description?: string }).description ||
              ""
            );
          }
          return "";
        })
      : [];

    const capacity_development_needs = Array.isArray(langInsights.capacity_development_needs)
      ? langInsights.capacity_development_needs.map((n: unknown) => {
          if (typeof n === "string") return n;
          if (typeof n === "object" && n !== null) {
            const obj = n as {
              area?: string;
              current_gap?: string;
              category?: string;
              description?: string;
            };
            return obj.area || obj.current_gap || obj.category || obj.description || "";
          }
          return "";
        })
      : [];

    return { summary, recommendations, capacity_development_needs };
  }, [hasCapdevInsights, capdevData?.insights, capdevData?.available_languages]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !assessmentData) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <PageHeader title="Assessment Report" description={error || "Assessment not found"} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title={`Assessment Report - ${assessmentData.barangay_name || "Unknown"}`}
          description="View detailed SGLGB compliance status and area breakdown"
        />

        {/* Compliance Status Badge */}
        {complianceStatus && (
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Final SGLGB Compliance Status
                </h3>
                <p className="text-sm text-muted-foreground">
                  Overall compliance determination based on the 3+1 rule
                </p>
              </div>
              <ComplianceBadge status={complianceStatus} />
            </div>
          </div>
        )}

        {/* Area Results */}
        {derivedAreaResults && (
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Governance Area Results</h3>
            <AreaResultsDisplay areaResults={derivedAreaResults} />
          </div>
        )}

        {/* AI-Powered Insights Section */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">AI-Powered Insights</h3>
              <p className="text-sm text-muted-foreground">
                Get intelligent recommendations based on your assessment results
              </p>
            </div>
          </div>

          {/* Generate Insights Button (if not already generated) */}
          {!hasCapdevInsights && (
            <InsightsGenerator
              assessmentId={assessmentData.id}
              isAssessmentValidated={isValidated}
              onGenerate={handleGenerate}
              isGenerating={isGenerating || isLoadingCapdev}
            />
          )}

          {/* Generating State */}
          {isGenerating && (
            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-md border border-muted">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                Generating AI insights... This may take a few moments.
              </p>
            </div>
          )}

          {/* CapDev Loading State */}
          {isLoadingCapdev && !isGenerating && (
            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-md border border-muted">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading AI insights...</p>
            </div>
          )}

          {/* Error State */}
          {(generationError as any) && (
            <div className="p-4 bg-destructive/10 rounded-md border border-destructive/20">
              <p className="text-sm text-destructive">
                Failed to generate insights. Please try again.
              </p>
            </div>
          )}

          {/* Display CapDev Insights */}
          {transformedInsights && <AIInsightsDisplay insights={transformedInsights} />}

          {/* Show status message if insights exist but are not completed */}
          {capdevData && !hasCapdevInsights && capdevData.status !== "not_generated" && (
            <div className="p-4 bg-muted/50 rounded-md border border-muted">
              <p className="text-sm text-muted-foreground">
                {capdevData.status === "pending" && "AI insights generation is queued..."}
                {capdevData.status === "generating" && "AI insights are being generated..."}
                {capdevData.status === "failed" &&
                  "AI insights generation failed. You can try regenerating."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
