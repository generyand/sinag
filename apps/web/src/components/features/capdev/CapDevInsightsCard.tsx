'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  Target,
  Users,
  CheckCircle2,
  Download,
  RefreshCw,
  Globe
} from 'lucide-react';
import { CapDevStatusBadge } from './CapDevStatusBadge';
import type {
  CapDevInsightsResponse,
  CapDevInsightsContent,
  GovernanceWeakness,
  CapDevRecommendation,
  CapDevNeed,
  SuggestedIntervention,
  PriorityAction
} from '@sinag/shared';

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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            CapDev AI Insights
          </CardTitle>
          <CardDescription>
            AI-powered capacity development recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Insights Available</AlertTitle>
            <AlertDescription>
              CapDev insights have not been generated yet. They will be automatically
              generated after MLGOO approval.
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <div>
              <CardTitle>CapDev AI Insights</CardTitle>
              <CardDescription>
                {insights.barangay_name} - AI-powered recommendations
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
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Language Selector */}
        {availableLanguages.length > 1 && (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Language:</span>
            <div className="flex gap-1">
              {availableLanguages.map((lang) => (
                <Button
                  key={lang}
                  variant={selectedLanguage === lang ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLanguage(lang as LanguageCode)}
                >
                  {languageLabels[lang as LanguageCode] || lang}
                </Button>
              ))}
            </div>
          </div>
        )}

        {insights.status === 'generating' ? (
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertTitle>Generating Insights</AlertTitle>
            <AlertDescription>
              AI is analyzing the assessment data. This may take a few minutes...
            </AlertDescription>
          </Alert>
        ) : insights.status === 'failed' ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Generation Failed</AlertTitle>
            <AlertDescription>
              Failed to generate CapDev insights. Please contact support or try regenerating.
            </AlertDescription>
          </Alert>
        ) : currentContent ? (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="weaknesses">Weaknesses</TabsTrigger>
              <TabsTrigger value="recommendations">Actions</TabsTrigger>
              <TabsTrigger value="interventions">Training</TabsTrigger>
              <TabsTrigger value="priorities">Priorities</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4">
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed">{currentContent.summary}</p>
              </div>
            </TabsContent>

            <TabsContent value="weaknesses" className="mt-4">
              <WeaknessesSection
                weaknesses={currentContent.governance_weaknesses as GovernanceWeakness[]}
              />
            </TabsContent>

            <TabsContent value="recommendations" className="mt-4">
              <RecommendationsSection
                recommendations={currentContent.recommendations as CapDevRecommendation[]}
                needs={currentContent.capacity_development_needs as CapDevNeed[]}
              />
            </TabsContent>

            <TabsContent value="interventions" className="mt-4">
              <InterventionsSection
                interventions={currentContent.suggested_interventions as SuggestedIntervention[]}
              />
            </TabsContent>

            <TabsContent value="priorities" className="mt-4">
              <PrioritiesSection
                priorities={currentContent.priority_actions as PriorityAction[]}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Content Not Available</AlertTitle>
            <AlertDescription>
              Insights in {languageLabels[selectedLanguage]} are not available yet.
            </AlertDescription>
          </Alert>
        )}

        {/* Generated timestamp */}
        {insights.generated_at && (
          <p className="text-xs text-gray-400 text-right">
            Generated: {new Date(insights.generated_at).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Sub-components
function WeaknessesSection({ weaknesses }: { weaknesses: GovernanceWeakness[] }) {
  if (!weaknesses?.length) {
    return <p className="text-gray-500 text-sm">No weaknesses identified.</p>;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-3">
      {weaknesses.map((weakness, idx) => (
        <div key={idx} className="p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">{weakness.area_name}</span>
            <Badge className={getSeverityColor(weakness.severity)}>
              {weakness.severity}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{weakness.description}</p>
        </div>
      ))}
    </div>
  );
}

function RecommendationsSection({
  recommendations,
  needs
}: {
  recommendations: CapDevRecommendation[];
  needs: CapDevNeed[];
}) {
  return (
    <div className="space-y-6">
      {recommendations?.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Recommendations
          </h4>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded">
                <ChevronRight className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="text-xs text-gray-500">{rec.description}</p>
                  {rec.governance_area && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {rec.governance_area}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {needs?.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            Capacity Development Needs
          </h4>
          <div className="space-y-2">
            {needs.map((need, idx) => (
              <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-blue-900">{need.area}</p>
                <p className="text-xs text-blue-700 mt-1">Gap: {need.current_gap}</p>
                <p className="text-xs text-blue-600 mt-1">Target: {need.target_state}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InterventionsSection({ interventions }: { interventions: SuggestedIntervention[] }) {
  if (!interventions?.length) {
    return <p className="text-gray-500 text-sm">No interventions suggested.</p>;
  }

  return (
    <div className="space-y-3">
      {interventions.map((intervention, idx) => (
        <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm text-purple-900">{intervention.title}</span>
            <Badge variant="outline" className="text-purple-700 border-purple-200">
              {intervention.intervention_type}
            </Badge>
          </div>
          <p className="text-xs text-purple-700">{intervention.description}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-purple-600">
            <Users className="h-3 w-3" />
            <span>{intervention.target_audience}</span>
            {intervention.estimated_duration && (
              <>
                <span className="text-purple-400">|</span>
                <span>{intervention.estimated_duration}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrioritiesSection({ priorities }: { priorities: PriorityAction[] }) {
  if (!priorities?.length) {
    return <p className="text-gray-500 text-sm">No priority actions defined.</p>;
  }

  const getTimelineColor = (timeline: string) => {
    switch (timeline.toLowerCase()) {
      case 'immediate': return 'bg-red-100 text-red-800';
      case 'short-term': return 'bg-orange-100 text-orange-800';
      case 'medium-term': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-3">
      {priorities.map((priority, idx) => (
        <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">{priority.action}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-green-700">
                  {priority.responsible_party}
                </span>
                <Badge className={getTimelineColor(priority.timeline)}>
                  {priority.timeline}
                </Badge>
              </div>
              {priority.success_indicator && (
                <p className="text-xs text-green-600 mt-1">
                  Success: {priority.success_indicator}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
