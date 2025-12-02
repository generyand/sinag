'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Lightbulb,
  Target,
  Users,
  CheckCircle2,
  RefreshCw,
  Globe,
  Sparkles,
  TrendingUp,
  BookOpen,
  Clock,
  Building2,
  GraduationCap,
  AlertCircle,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { CapDevStatusBadge } from './CapDevStatusBadge';
import type { CapDevInsightsResponse } from '@sinag/shared';
import type {
  CapDevInsightsContent,
  GovernanceWeakness,
  CapDevRecommendation,
  CapDevNeed,
  CapDevNeedAIFormat,
  SuggestedIntervention,
  SuggestedInterventionAIFormat,
  PriorityAction
} from '@/types/capdev';

interface CapDevInsightsCardProps {
  insights: CapDevInsightsResponse | null;
  isLoading?: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

type LanguageCode = 'ceb' | 'en' | 'fil';

const languageLabels: Record<LanguageCode, string> = {
  ceb: 'Bisaya',
  en: 'English',
  fil: 'Filipino',
};

export function CapDevInsightsCard({
  insights,
  isLoading = false,
  onRegenerate,
  isRegenerating = false
}: CapDevInsightsCardProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('ceb');

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
          <CardDescription>
            AI-powered capacity development recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="bg-amber-50 border-amber-200">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Insights Pending</AlertTitle>
            <AlertDescription className="text-amber-700">
              CapDev insights will be automatically generated after MLGOO approval.
              These AI-powered recommendations help identify capacity development needs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const availableLanguages = insights.available_languages as LanguageCode[];
  const currentContent = insights.insights?.[selectedLanguage] as CapDevInsightsContent | undefined;

  // If selected language not available, default to first available
  if (!currentContent && availableLanguages.length > 0 && selectedLanguage !== availableLanguages[0]) {
    setSelectedLanguage(availableLanguages[0] as LanguageCode);
    return null;
  }

  return (
    <Card className="overflow-hidden shadow-lg">
      {/* Enhanced Header with Gradient */}
      <CardHeader className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border-b border-amber-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-800">
                CapDev AI Insights
              </CardTitle>
              <CardDescription className="text-amber-700 font-medium">
                {insights.barangay_name} • AI-powered recommendations
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CapDevStatusBadge status={insights.status} />
            {onRegenerate && insights.status === 'completed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="border-amber-200 hover:bg-amber-50"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Language Selector - Sticky */}
        {availableLanguages.length > 1 && (
          <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 border-b">
            <Globe className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Language:</span>
            <div className="flex gap-1.5">
              {availableLanguages.map((lang) => (
                <Button
                  key={lang}
                  variant={selectedLanguage === lang ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLanguage(lang as LanguageCode)}
                  className={selectedLanguage === lang
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'hover:bg-amber-50 hover:border-amber-300'}
                >
                  {languageLabels[lang as LanguageCode] || lang}
                </Button>
              ))}
            </div>
          </div>
        )}

        {insights.status === 'generating' ? (
          <div className="p-8">
            <Alert className="bg-blue-50 border-blue-200">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              <AlertTitle className="text-blue-800">Generating Insights</AlertTitle>
              <AlertDescription className="text-blue-700">
                AI is analyzing the assessment data and generating personalized recommendations.
                This typically takes 1-2 minutes...
              </AlertDescription>
            </Alert>
          </div>
        ) : insights.status === 'failed' ? (
          <div className="p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Generation Failed</AlertTitle>
              <AlertDescription>
                Failed to generate CapDev insights. Please try regenerating or contact support.
              </AlertDescription>
            </Alert>
          </div>
        ) : currentContent ? (
          <Tabs defaultValue="summary" className="w-full">
            {/* Enhanced Tab List */}
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-5 bg-gray-100/80 p-1 h-auto">
                <TabsTrigger
                  value="summary"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 gap-1.5"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Summary</span>
                </TabsTrigger>
                <TabsTrigger
                  value="weaknesses"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 gap-1.5"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span className="hidden sm:inline">Weaknesses</span>
                </TabsTrigger>
                <TabsTrigger
                  value="recommendations"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 gap-1.5"
                >
                  <Lightbulb className="h-4 w-4" />
                  <span className="hidden sm:inline">Actions</span>
                </TabsTrigger>
                <TabsTrigger
                  value="interventions"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 gap-1.5"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">Training</span>
                </TabsTrigger>
                <TabsTrigger
                  value="priorities"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5 gap-1.5"
                >
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Priorities</span>
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
                  weaknesses={currentContent.governance_weaknesses as GovernanceWeakness[] | string[]}
                />
              </TabsContent>

              <TabsContent value="recommendations" className="mt-0">
                <RecommendationsSection
                  recommendations={currentContent.recommendations as CapDevRecommendation[] | string[]}
                  needs={currentContent.capacity_development_needs as CapDevNeed[] | CapDevNeedAIFormat[]}
                />
              </TabsContent>

              <TabsContent value="interventions" className="mt-0">
                <InterventionsSection
                  interventions={currentContent.suggested_interventions as SuggestedIntervention[] | SuggestedInterventionAIFormat[]}
                />
              </TabsContent>

              <TabsContent value="priorities" className="mt-0">
                <PrioritiesSection
                  priorities={currentContent.priority_actions as PriorityAction[] | string[]}
                />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="p-8">
            <Alert className="bg-gray-50 border-gray-200">
              <AlertTriangle className="h-4 w-4 text-gray-500" />
              <AlertTitle className="text-gray-700">Content Not Available</AlertTitle>
              <AlertDescription className="text-gray-600">
                Insights in {languageLabels[selectedLanguage]} are not available yet.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Footer with timestamp */}
        {insights.generated_at && (
          <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Sparkles className="h-3 w-3" />
              <span>Powered by Gemini AI</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              Generated: {new Date(insights.generated_at).toLocaleString()}
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
          <p className="text-gray-700 leading-relaxed text-[15px]">{summary}</p>
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

  const isStringArray = typeof weaknesses[0] === 'string';

  const toggleItem = (idx: number) => {
    setExpandedItems(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-100 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <h3 className="font-semibold text-gray-800">Identified Weaknesses</h3>
        </div>
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          {weaknesses.length} {weaknesses.length === 1 ? 'issue' : 'issues'}
        </Badge>
      </div>

      <ScrollArea className="max-h-[400px] pr-4">
        <div className="space-y-3">
          {isStringArray ? (
            (weaknesses as string[]).map((weakness, idx) => (
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
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {weakness}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            (weaknesses as GovernanceWeakness[]).map((weakness, idx) => (
              <div key={idx} className="border border-red-100 rounded-xl overflow-hidden bg-gradient-to-r from-red-50 to-orange-50 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="font-medium text-gray-800">{weakness.area_name}</span>
                  {weakness.severity && (
                    <Badge className={getSeverityColor(weakness.severity)}>
                      {weakness.severity}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{weakness.description}</p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function getSeverityColor(severity?: string) {
  if (!severity) return 'bg-gray-100 text-gray-800';
  switch (severity.toLowerCase()) {
    case 'high': return 'bg-red-100 text-red-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

// ============================================================================
// Recommendations Section - Dual-column layout
// ============================================================================
function RecommendationsSection({
  recommendations,
  needs
}: {
  recommendations: CapDevRecommendation[] | string[];
  needs: CapDevNeed[] | CapDevNeedAIFormat[];
}) {
  const isRecsStringArray = recommendations?.length > 0 && typeof recommendations[0] === 'string';
  const isNeedsAIFormat = needs?.length > 0 && 'category' in (needs[0] as object);

  return (
    <div className="space-y-6">
      {/* Recommendations */}
      {recommendations?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <Lightbulb className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Recommended Actions</h3>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 ml-auto">
              {recommendations.length} {recommendations.length === 1 ? 'action' : 'actions'}
            </Badge>
          </div>

          <div className="space-y-2">
            {isRecsStringArray ? (
              (recommendations as string[]).map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 hover:shadow-sm transition-shadow"
                >
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center">
                      <ArrowRight className="h-3 w-3 text-amber-700" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
                </div>
              ))
            ) : (
              (recommendations as CapDevRecommendation[]).map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100">
                  <ArrowRight className="h-4 w-4 mt-0.5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{rec.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{rec.description}</p>
                    {rec.governance_area && (
                      <Badge variant="outline" className="mt-2 text-xs bg-white">
                        {rec.governance_area}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Capacity Development Needs */}
      {needs?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Capacity Development Needs</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {isNeedsAIFormat ? (
              (needs as CapDevNeedAIFormat[]).map((need, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      {need.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{need.description}</p>
                  {need.affected_indicators && need.affected_indicators.length > 0 && (
                    <div className="text-xs text-blue-600 mb-2">
                      <span className="font-medium">Indicators:</span> {need.affected_indicators.join(', ')}
                    </div>
                  )}
                  {need.suggested_providers && need.suggested_providers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {need.suggested_providers.map((provider, pIdx) => (
                        <Badge key={pIdx} variant="outline" className="text-xs bg-white text-blue-600 border-blue-200">
                          {provider}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              (needs as CapDevNeed[]).map((need, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                  <p className="text-sm font-medium text-blue-900 mb-2">{need.area}</p>
                  <p className="text-xs text-blue-700">Gap: {need.current_gap}</p>
                  <p className="text-xs text-blue-600 mt-1">Target: {need.target_state}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Interventions Section - Timeline-style cards
// ============================================================================
function InterventionsSection({ interventions }: { interventions: SuggestedIntervention[] | SuggestedInterventionAIFormat[] }) {
  if (!interventions?.length) {
    return (
      <div className="text-center py-8">
        <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No training interventions suggested</p>
        <p className="text-sm text-gray-400">The assessment did not identify training needs</p>
      </div>
    );
  }

  const isAIFormat = 'governance_area' in (interventions[0] as object) || 'priority' in (interventions[0] as object);

  const getPriorityStyle = (priority?: string) => {
    if (!priority) return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
    switch (priority.toLowerCase()) {
      case 'immediate': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
      case 'short-term': return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
      case 'medium-term': return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-purple-100 rounded-lg">
          <GraduationCap className="h-4 w-4 text-purple-600" />
        </div>
        <h3 className="font-semibold text-gray-800">Suggested Training & Interventions</h3>
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 ml-auto">
          {interventions.length} {interventions.length === 1 ? 'program' : 'programs'}
        </Badge>
      </div>

      <div className="space-y-4">
        {isAIFormat ? (
          (interventions as SuggestedInterventionAIFormat[]).map((intervention, idx) => {
            const priorityStyle = getPriorityStyle(intervention.priority);
            return (
              <div key={idx} className="relative pl-8">
                {/* Timeline connector */}
                {idx < interventions.length - 1 && (
                  <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-purple-200" />
                )}
                {/* Timeline dot */}
                <div className="absolute left-0 top-2 w-6 h-6 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-600">{idx + 1}</span>
                </div>

                <div className={`p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border ${priorityStyle.border}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-medium text-gray-800">{intervention.title}</h4>
                    {intervention.priority && (
                      <Badge className={`${priorityStyle.bg} ${priorityStyle.text} hover:${priorityStyle.bg}`}>
                        {intervention.priority}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{intervention.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {intervention.governance_area && (
                      <div className="flex items-center gap-1 text-purple-600">
                        <Building2 className="h-3 w-3" />
                        <span>{intervention.governance_area}</span>
                      </div>
                    )}
                    {intervention.estimated_duration && (
                      <div className="flex items-center gap-1 text-purple-600">
                        <Clock className="h-3 w-3" />
                        <span>{intervention.estimated_duration}</span>
                      </div>
                    )}
                    {intervention.resource_requirements && (
                      <div className="flex items-center gap-1 text-purple-500">
                        <Users className="h-3 w-3" />
                        <span>{intervention.resource_requirements}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          (interventions as SuggestedIntervention[]).map((intervention, idx) => (
            <div key={idx} className="relative pl-8">
              {idx < interventions.length - 1 && (
                <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-purple-200" />
              )}
              <div className="absolute left-0 top-2 w-6 h-6 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center">
                <span className="text-xs font-bold text-purple-600">{idx + 1}</span>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-800">{intervention.title}</h4>
                  <Badge variant="outline" className="text-purple-700 border-purple-200">
                    {intervention.intervention_type}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{intervention.description}</p>
                <div className="flex items-center gap-2 text-xs text-purple-600">
                  <Users className="h-3 w-3" />
                  <span>{intervention.target_audience}</span>
                  {intervention.estimated_duration && (
                    <>
                      <span className="text-purple-300">|</span>
                      <Clock className="h-3 w-3" />
                      <span>{intervention.estimated_duration}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Priorities Section - Numbered checklist style
// ============================================================================
function PrioritiesSection({ priorities }: { priorities: PriorityAction[] | string[] }) {
  if (!priorities?.length) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No priority actions defined</p>
        <p className="text-sm text-gray-400">All requirements have been met</p>
      </div>
    );
  }

  const isStringArray = typeof priorities[0] === 'string';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-green-100 rounded-lg">
          <Zap className="h-4 w-4 text-green-600" />
        </div>
        <h3 className="font-semibold text-gray-800">Priority Actions</h3>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 ml-auto">
          {priorities.length} {priorities.length === 1 ? 'action' : 'actions'}
        </Badge>
      </div>

      {/* Priority ranking visual */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
        <TrendingUp className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-700 font-medium">
          Actions are listed by priority - start from the top
        </span>
      </div>

      <div className="space-y-3">
        {isStringArray ? (
          (priorities as string[]).map((priority, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${
                idx === 0
                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300'
                  : idx === 1
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                    : 'bg-white border-gray-200'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                idx === 0
                  ? 'bg-green-500 text-white'
                  : idx === 1
                    ? 'bg-green-400 text-white'
                    : 'bg-green-200 text-green-800'
              }`}>
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className={`text-sm leading-relaxed ${idx < 2 ? 'font-medium text-gray-800' : 'text-gray-700'}`}>
                  {priority}
                </p>
                {idx === 0 && (
                  <Badge className="mt-2 bg-green-600 text-white hover:bg-green-600">
                    Highest Priority
                  </Badge>
                )}
              </div>
            </div>
          ))
        ) : (
          (priorities as PriorityAction[]).map((priority, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${
                idx === 0
                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                idx === 0 ? 'bg-green-500 text-white' : 'bg-green-200 text-green-800'
              }`}>
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 mb-2">{priority.action}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {priority.responsible_party && (
                    <Badge variant="outline" className="text-xs bg-white">
                      <Users className="h-3 w-3 mr-1" />
                      {priority.responsible_party}
                    </Badge>
                  )}
                  {priority.timeline && (
                    <Badge className={getTimelineColor(priority.timeline)}>
                      {priority.timeline}
                    </Badge>
                  )}
                </div>
                {priority.success_indicator && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Success: {priority.success_indicator}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getTimelineColor(timeline?: string) {
  if (!timeline) return 'bg-gray-100 text-gray-800';
  switch (timeline.toLowerCase()) {
    case 'immediate': return 'bg-red-100 text-red-800';
    case 'short-term': return 'bg-orange-100 text-orange-800';
    case 'medium-term': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
