"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  CapDevInsightsContent,
  CapDevNeed,
  CapDevNeedAIFormat,
  CapDevRecommendation,
  GovernanceWeakness,
  SuggestedIntervention,
  SuggestedInterventionAIFormat,
} from "@/types/capdev";
import type { CapDevInsightsResponse } from "@sinag/shared";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Globe,
  GraduationCap,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CapDevStatusBadge } from "./CapDevStatusBadge";

interface CapDevInsightsCardProps {
  insights: CapDevInsightsResponse | null;
  isLoading?: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

type LanguageCode = "ceb" | "en" | "fil";

const languageLabels: Record<LanguageCode, string> = {
  ceb: "Bisaya",
  en: "English",
  fil: "Filipino",
};

export function CapDevInsightsCard({
  insights,
  isLoading = false,
  onRegenerate,
  isRegenerating = false,
}: CapDevInsightsCardProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("ceb");
  const [hasViewedRecommendations, setHasViewedRecommendations] = useState(false);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
            CapDev AI Insights
          </CardTitle>
          <CardDescription>AI-powered capacity development recommendations</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="bg-amber-50 border-amber-200">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Insights Pending</AlertTitle>
            <AlertDescription className="text-amber-700">
              CapDev insights will be automatically generated after MLGOO approval. These AI-powered
              recommendations help identify capacity development needs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const availableLanguages = insights.available_languages as LanguageCode[];
  const currentContent = insights.insights?.[selectedLanguage] as CapDevInsightsContent | undefined;

  // If selected language not available, default to first available
  if (
    !currentContent &&
    availableLanguages.length > 0 &&
    selectedLanguage !== availableLanguages[0]
  ) {
    setSelectedLanguage(availableLanguages[0] as LanguageCode);
    return null;
  }

  return (
    <Card className="overflow-hidden shadow-lg p-0 gap-0 border-0 ring-1 ring-gray-200">
      {/* Enhanced Header with Gradient */}
      <CardHeader className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50/50 border-b border-orange-100/50 pt-6 pb-6 px-6">
        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-amber-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
              <div className="relative p-3 bg-gradient-to-br from-white to-orange-50 rounded-xl shadow-sm border border-orange-100 ring-1 ring-white/50">
                <Sparkles className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">
                CapDev AI Insights
              </CardTitle>
              <CardDescription className="text-orange-900/70 font-medium mt-1">
                {insights.barangay_name} <span className="mx-1.5 opacity-40">|</span> AI-powered
                recommendations
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center justify-between w-full sm:w-auto gap-3 mt-2 sm:mt-0">
            <CapDevStatusBadge status={insights.status} />
            {onRegenerate && insights.status === "completed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="border-orange-200 hover:bg-orange-50 text-orange-800 hover:text-orange-900 transition-all duration-300"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Language Selector - Sticky */}
        {availableLanguages.length > 1 && (
          <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-[var(--border)]">
            <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Language:</span>
            <div className="flex gap-1.5">
              {availableLanguages.map((lang) => (
                <Button
                  key={lang}
                  variant={selectedLanguage === lang ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedLanguage(lang as LanguageCode)}
                  className={
                    selectedLanguage === lang
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "hover:bg-amber-50 hover:border-amber-300"
                  }
                >
                  {languageLabels[lang as LanguageCode] || lang}
                </Button>
              ))}
            </div>
          </div>
        )}

        {insights.status === "generating" ? (
          <div className="p-8">
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-800 dark:text-blue-200">
                Generating Insights
              </AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                AI is analyzing the assessment data and generating personalized recommendations.
                This typically takes 1-2 minutes...
              </AlertDescription>
            </Alert>
          </div>
        ) : insights.status === "failed" ? (
          <div className="p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Generation Failed</AlertTitle>
              <AlertDescription className="flex flex-col gap-3">
                <span>
                  Failed to generate CapDev insights. Please try regenerating or contact support.
                </span>
                {onRegenerate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    className="w-fit border-red-300 hover:bg-red-50 text-red-700"
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-1.5 ${isRegenerating ? "animate-spin" : ""}`}
                    />
                    {isRegenerating ? "Regenerating..." : "Try Again"}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          </div>
        ) : currentContent ? (
          <Tabs
            defaultValue="summary"
            className="w-full"
            onValueChange={(value) => {
              if (value === "recommendations" && !hasViewedRecommendations) {
                setHasViewedRecommendations(true);
              }
            }}
          >
            {/* Simplified Tab List - 3 tabs */}
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100/80 dark:bg-gray-800/50 p-1 h-auto">
                <TabsTrigger
                  value="summary"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm py-2.5 gap-1.5"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Summary</span>
                </TabsTrigger>
                <TabsTrigger
                  value="weaknesses"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm py-2.5 gap-1.5"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span className="hidden sm:inline">Weaknesses</span>
                </TabsTrigger>
                <TabsTrigger
                  value="recommendations"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm py-2.5 gap-1.5"
                >
                  <Lightbulb className="h-4 w-4" />
                  <span className="hidden sm:inline">Recommendations</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Contents */}
            <div className="p-6">
              <TabsContent value="summary" className="mt-0">
                <SummarySection summary={currentContent.summary} />
              </TabsContent>

              <TabsContent value="weaknesses" className="mt-0">
                <WeaknessesSection
                  weaknesses={
                    currentContent.governance_weaknesses as GovernanceWeakness[] | string[]
                  }
                />
              </TabsContent>

              <TabsContent value="recommendations" className="mt-0">
                <UnifiedRecommendationsSection
                  recommendations={
                    currentContent.recommendations as CapDevRecommendation[] | string[]
                  }
                  needs={
                    currentContent.capacity_development_needs as CapDevNeed[] | CapDevNeedAIFormat[]
                  }
                  interventions={
                    currentContent.suggested_interventions as
                      | SuggestedIntervention[]
                      | SuggestedInterventionAIFormat[]
                  }
                  shouldAnimate={!hasViewedRecommendations}
                />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="p-8">
            <Alert className="bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700">
              <AlertTriangle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <AlertTitle className="text-gray-700 dark:text-gray-200">
                Content Not Available
              </AlertTitle>
              <AlertDescription className="text-gray-600 dark:text-gray-400">
                Insights in {languageLabels[selectedLanguage]} are not available yet.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Footer with AI disclaimer and timestamp */}
        {insights.generated_at && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-[var(--border)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                AI-generated content may contain inaccuracies. Please verify recommendations.
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">Generated:</span>{" "}
              {new Date(insights.generated_at).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Summary Section - Enhanced with visual treatment
// ============================================================================
// ============================================================================
// Summary Section - Enhanced with visual treatment
// ============================================================================
function SummarySection({ summary }: { summary: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-blue-100 rounded-lg">
          <BookOpen className="h-4 w-4 text-blue-600" />
        </div>
        <h3 className="font-semibold text-gray-800">Executive Summary</h3>
      </div>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-200 rounded-full" />
        <div className="pl-5 pr-2">
          <TypewriterText text={summary} speed={30} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Weaknesses Section - Card-based layout with severity indicators
// ============================================================================
function WeaknessesSection({ weaknesses }: { weaknesses: GovernanceWeakness[] | string[] }) {
  const [expandedItems, setExpandedItems] = useState<number[]>([0, 1, 2]);

  if (!weaknesses?.length) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No significant weaknesses identified</p>
        <p className="text-sm text-gray-400">The barangay has met all requirements</p>
      </div>
    );
  }

  const isStringArray = typeof weaknesses[0] === "string";

  const toggleItem = (idx: number) => {
    setExpandedItems((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-100 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <h3 className="font-semibold text-gray-800">Identified Weaknesses</h3>
        </div>
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 w-fit">
          {weaknesses.length} {weaknesses.length === 1 ? "issue" : "issues"}
        </Badge>
      </div>

      <div className="space-y-3">
        {isStringArray
          ? (weaknesses as string[]).map((weakness, idx) => (
              <div
                key={idx}
                className="border border-red-100 rounded-xl overflow-hidden bg-gradient-to-r from-red-50 to-orange-50 hover:shadow-md transition-shadow p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600">
                      {idx + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-relaxed break-words">{weakness}</p>
                  </div>
                </div>
              </div>
            ))
          : (weaknesses as GovernanceWeakness[]).map((weakness, idx) => (
              <div
                key={idx}
                className="border border-red-100 rounded-xl overflow-hidden bg-gradient-to-r from-red-50 to-orange-50 p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="font-medium text-gray-800 break-words">
                    {weakness.area_name}
                  </span>
                  {weakness.severity && (
                    <Badge className={getSeverityColor(weakness.severity)}>
                      {weakness.severity}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 break-words">{weakness.description}</p>
              </div>
            ))}
      </div>
    </div>
  );
}

function getSeverityColor(severity?: string) {
  if (!severity) return "bg-gray-100 text-gray-800";
  switch (severity.toLowerCase()) {
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// ============================================================================
// Unified Recommendations Section - Merges Actions, Training, and Priorities
// ============================================================================
function UnifiedRecommendationsSection({
  recommendations,
  needs,
  interventions,
  shouldAnimate,
}: {
  recommendations: CapDevRecommendation[] | string[];
  needs: CapDevNeed[] | CapDevNeedAIFormat[];
  interventions: SuggestedIntervention[] | SuggestedInterventionAIFormat[];
  shouldAnimate?: boolean;
}) {
  const isRecsStringArray = recommendations?.length > 0 && typeof recommendations[0] === "string";
  const isNeedsAIFormat = needs?.length > 0 && "category" in (needs[0] as object);
  const isInterventionsAIFormat =
    interventions?.length > 0 &&
    ("governance_area" in (interventions[0] as object) ||
      "priority" in (interventions[0] as object));

  const hasContent = recommendations?.length > 0 || needs?.length > 0 || interventions?.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No recommendations needed</p>
        <p className="text-sm text-gray-400">The barangay has met all requirements</p>
      </div>
    );
  }

  const animationClass = shouldAnimate ? "animate-in fade-in zoom-in-95 duration-500" : "";

  return (
    <div className={`space-y-8 ${animationClass}`}>
      <div className="space-y-6">
        {/* CapDev Solutions */}
        {recommendations?.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-linear-to-br from-amber-100 to-orange-100 rounded-xl shadow-sm ring-1 ring-amber-50">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">
                    CapDev Solutions
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Strategic recommendations for improvement
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-amber-50/50 text-amber-700 border-amber-200 w-fit sm:ml-auto shadow-sm"
              >
                {recommendations.length} {recommendations.length === 1 ? "solution" : "solutions"}
              </Badge>
            </div>

            <div className="grid gap-3">
              {isRecsStringArray
                ? (recommendations as string[]).map((rec, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50/80 to-orange-50/50 border border-amber-100 hover:border-amber-200 transition-all duration-300 hover:shadow-md hover:translate-x-1 ${shouldAnimate ? "animate-in slide-in-from-bottom-2 fade-in fill-mode-forwards" : ""}`}
                      style={shouldAnimate ? { animationDelay: `${idx * 100}ms` } : {}}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-6 h-6 rounded-full bg-linear-to-br from-amber-200 to-orange-300 flex items-center justify-center shadow-sm">
                          <ArrowRight className="h-3.5 w-3.5 text-amber-900" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed font-medium">{rec}</p>
                    </div>
                  ))
                : (recommendations as CapDevRecommendation[]).map((rec, idx) => (
                    <div
                      key={idx}
                      className={`group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50/80 to-orange-50/50 border border-amber-100 hover:border-amber-200 transition-all duration-300 hover:shadow-md ${shouldAnimate ? "animate-in slide-in-from-bottom-2 fade-in fill-mode-forwards" : ""}`}
                      style={shouldAnimate ? { animationDelay: `${idx * 100}ms` } : {}}
                    >
                      <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <ArrowRight className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-amber-700 transition-colors">
                          {rec.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                          {rec.description}
                        </p>
                        {rec.governance_area && (
                          <div className="mt-3 flex">
                            <Badge
                              variant="secondary"
                              className="text-xs bg-white/80 border border-amber-100 text-amber-800 shadow-sm"
                            >
                              {rec.governance_area}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}

        {/* Capacity Development Needs */}
        {needs?.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl shadow-sm ring-1 ring-blue-50">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">
                    Capacity Development Needs
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Targeted areas for skill building
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-purple-50/50 text-purple-700 border-purple-200 w-fit sm:ml-auto shadow-sm"
              >
                {needs.length} {needs.length === 1 ? "need" : "needs"}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {isNeedsAIFormat
                ? (needs as CapDevNeedAIFormat[]).map((need, idx) => (
                    <div
                      key={idx}
                      className={`relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/30 border border-blue-100/60 hover:border-blue-300 hover:shadow-lg transition-all duration-500 group ${shouldAnimate ? "animate-in slide-in-from-bottom-3 fade-in fill-mode-forwards" : ""}`}
                      style={
                        shouldAnimate
                          ? { animationDelay: `${(idx + (recommendations?.length || 0)) * 100}ms` }
                          : {}
                      }
                    >
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                        <Target className="h-24 w-24 text-blue-600" />
                      </div>

                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 mb-3 px-3 py-1 shadow-sm">
                        {need.category}
                      </Badge>

                      <p className="text-sm text-gray-700 leading-relaxed font-medium relative z-10">
                        {need.description}
                      </p>

                      {need.suggested_providers && need.suggested_providers.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-blue-100/50 relative z-10">
                          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Suggested Providers
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {need.suggested_providers.map((provider, pIdx) => (
                              <Badge
                                key={pIdx}
                                variant="outline"
                                className="text-xs bg-white text-gray-600 border-blue-100 hover:border-blue-300 hover:text-blue-700 transition-colors"
                              >
                                {provider}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                : (needs as CapDevNeed[]).map((need, idx) => (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/30 border border-blue-100/60 hover:border-blue-300 hover:shadow-md transition-all duration-300 ${shouldAnimate ? "animate-in slide-in-from-bottom-3 fade-in fill-mode-forwards" : ""}`}
                      style={
                        shouldAnimate
                          ? { animationDelay: `${(idx + (recommendations?.length || 0)) * 100}ms` }
                          : {}
                      }
                    >
                      <p className="text-sm font-semibold text-blue-900 mb-2">{need.area}</p>
                      <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                        <span className="font-medium">Gap Identified:</span> {need.current_gap}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}

        {/* Training & Interventions */}
        {interventions?.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl shadow-sm ring-1 ring-purple-50">
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">
                    Training Programs
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Recommended capacity interventions
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-purple-50/50 text-purple-700 border-purple-200 ml-auto shadow-sm"
              >
                {interventions.length} {interventions.length === 1 ? "program" : "programs"}
              </Badge>
            </div>

            <div className="grid gap-3">
              {isInterventionsAIFormat
                ? (interventions as SuggestedInterventionAIFormat[]).map((intervention, idx) => (
                    <div
                      key={idx}
                      className={`p-5 rounded-xl bg-gradient-to-r from-purple-50/80 to-white border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all duration-300 ${shouldAnimate ? "animate-in slide-in-from-bottom-2 fade-in fill-mode-forwards" : ""}`}
                      style={
                        shouldAnimate
                          ? {
                              animationDelay: `${(idx + (recommendations?.length || 0) + (needs?.length || 0)) * 100}ms`,
                            }
                          : {}
                      }
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-y-2 gap-x-4 mb-3">
                        <h4 className="text-base font-bold text-gray-800">{intervention.title}</h4>
                        {intervention.priority && (
                          <Badge
                            className={`shrink-0 text-xs shadow-sm ${
                              intervention.priority.toLowerCase() === "immediate"
                                ? "bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                                : intervention.priority.toLowerCase() === "short-term"
                                  ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200"
                                  : "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200"
                            }`}
                          >
                            {intervention.priority} Priority
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {intervention.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-purple-100/50">
                        {intervention.estimated_duration && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Duration: {intervention.estimated_duration}</span>
                          </div>
                        )}

                        {/* Placeholder for future metadata if needed */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                          <span>Suggested Intervention</span>
                        </div>
                      </div>
                    </div>
                  ))
                : (interventions as SuggestedIntervention[]).map((intervention, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-gradient-to-r from-purple-50/80 to-white border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all duration-300 animate-in slide-in-from-bottom-2 fade-in fill-mode-forwards"
                      style={{
                        animationDelay: `${(idx + (recommendations?.length || 0) + (needs?.length || 0)) * 100}ms`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-gray-800">{intervention.title}</h4>
                        <Badge
                          variant="outline"
                          className="text-xs text-purple-700 border-purple-200 bg-purple-50"
                        >
                          {intervention.intervention_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{intervention.description}</p>
                    </div>
                  ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TypewriterText({ text, speed = 5 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  // If text is extremely long, show it immediately to avoid poor UX
  // const shouldAnimate = text.length < 1000;

  // Check if we should animate (e.g. only if "just generated")
  // For now, always animate on mount as per request

  useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);

    let i = 0;
    const timer = setInterval(() => {
      setDisplayedText((prev) => {
        if (prev.length < text.length) {
          // Add 2 characters at a time for faster perceived speed on long text
          const nextChunk = text.slice(prev.length, prev.length + 3);
          return prev + nextChunk;
        }
        clearInterval(timer);
        setIsComplete(true);
        return prev;
      });
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, setDisplayedText, setIsComplete]);

  return (
    <p className="text-gray-700 leading-relaxed text-[15px]">
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-1.5 h-4 ml-1 bg-amber-500 align-middle animate-pulse rounded-full" />
      )}
    </p>
  );
}
