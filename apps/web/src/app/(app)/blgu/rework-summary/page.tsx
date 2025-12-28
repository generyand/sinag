/**
 * Rework Summary Page
 *
 * Full-page view of AI-generated rework summary showing comprehensive
 * guidance on what needs to be fixed across all indicators.
 *
 * Accessible via link from ReworkAlertBanner during rework workflow.
 */

"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Sparkles, Clock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useReworkSummary } from "@/hooks/useReworkSummary";
import { ReworkSummaryCard } from "@/components/features/rework/ReworkSummaryCard";
import { ReworkLoadingState } from "@/components/features/rework/ReworkLoadingState";
import { SummaryLanguageDropdown } from "@/components/shared/SummaryLanguageDropdown";
import { useLanguage, type LanguageCode } from "@/providers/LanguageProvider";

function ReworkSummaryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const assessmentId = searchParams.get("assessment");

  // Language selection state
  const { language: defaultLang } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(defaultLang);

  const {
    data: reworkSummary,
    isLoading,
    error,
    isGenerating,
  } = useReworkSummary(assessmentId ? parseInt(assessmentId, 10) : null, {
    language: selectedLang,
  });

  // Handle missing assessment ID
  if (!assessmentId) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Missing Assessment ID
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-800">
              No assessment ID was provided. Please access this page from the rework workflow.
            </p>
            <Button onClick={() => router.push("/blgu")} className="mt-4" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading || isGenerating) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="mb-6">
          <Button onClick={() => router.back()} variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <ReworkLoadingState />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Loading Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-800">{error}</p>
            <Button onClick={() => router.back()} className="mt-4" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data state
  if (!reworkSummary) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              No Summary Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The rework summary is not yet available. It may still be generating.
            </p>
            <Button onClick={() => router.back()} className="mt-4" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main content
  return (
    <div className="container max-w-5xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <Button onClick={() => router.back()} variant="ghost" size="sm" className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-blue-600" />
              AI-Powered Rework Summary
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive guidance on what needs to be fixed in your assessment
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Language Selector */}
            <SummaryLanguageDropdown
              value={selectedLang}
              onChange={setSelectedLang}
              isLoading={isLoading || isGenerating}
            />

            {reworkSummary.estimated_time && (
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Estimated: {reworkSummary.estimated_time}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Overall Summary */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg">Overall Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-800 leading-relaxed">{reworkSummary.overall_summary}</p>
        </CardContent>
      </Card>

      {/* Priority Actions */}
      {reworkSummary.priority_actions.length > 0 && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Priority Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">Start with these most critical actions:</p>
            <ol className="space-y-2 pl-6">
              {reworkSummary.priority_actions.map((action, index) => (
                <li
                  key={index}
                  className="text-gray-800 list-decimal marker:text-green-600 marker:font-bold"
                >
                  {action}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Separator className="my-8" />

      {/* Indicator-by-Indicator Breakdown */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Indicator-by-Indicator Guidance</h2>
        <p className="text-muted-foreground">
          Detailed breakdown of issues and suggested actions for each indicator
        </p>

        <Accordion type="multiple" className="space-y-3" defaultValue={["0"]}>
          {reworkSummary.indicator_summaries.map((indicator, index) => (
            <AccordionItem
              key={indicator.indicator_id}
              value={index.toString()}
              className="border rounded-sm"
            >
              <AccordionTrigger className="px-4 hover:bg-gray-50">
                <div className="flex items-center gap-3 text-left">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-semibold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="font-semibold">{indicator.indicator_name}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <ReworkSummaryCard summary={indicator} collapsed={false} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Start Fixing CTA */}
      <Card className="mt-8 border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Ready to Start Fixing?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Go back to your assessment and address the issues one by one
              </p>
            </div>
            <Button
              onClick={() => router.push(`/blgu/assessment/${assessmentId}`)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Start Fixing Issues
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generation Timestamp */}
      <p className="text-xs text-center text-muted-foreground mt-6">
        Summary generated on {new Date(reworkSummary.generated_at).toLocaleString()}
      </p>
    </div>
  );
}

export default function ReworkSummaryPage() {
  return (
    <Suspense fallback={<ReworkLoadingState />}>
      <ReworkSummaryContent />
    </Suspense>
  );
}
