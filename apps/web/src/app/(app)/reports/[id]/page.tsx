'use client';

import {
    AIInsightsDisplay,
    AreaResultsDisplay,
    ComplianceBadge,
    InsightsGenerator,
} from '@/components/features/reports';
import { PageHeader } from '@/components/shared';
import { useIntelligence } from '@/hooks';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AssessmentDetails {
  id: number;
  status: string;
  final_compliance_status?: 'Passed' | 'Failed';
  area_results?: Record<string, string>;
  ai_recommendations?: Record<string, any>;
  blgu_user?: {
    name: string;
    barangay?: {
      name: string;
    };
  };
}

export default function ReportDetailsPage() {
  const params = useParams();
  const assessmentId = params.id as string;
  const [assessment, setAssessment] = useState<AssessmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  
  const { generateInsights: handleGenerateInsights, isGenerating, error: generationError } = useIntelligence();

  const handleGenerate = async () => {
    if (!assessment?.id) return;
    
    setIsGeneratingInsights(true);
    try {
      await handleGenerateInsights(Number(assessmentId));
      // Refresh assessment data to get updated ai_recommendations
      // TODO: Replace with actual refetch logic
      setTimeout(() => {
        setIsGeneratingInsights(false);
      }, 30000); // Mock timeout, actual polling will handle this
    } catch (err) {
      setIsGeneratingInsights(false);
      console.error('Failed to generate insights:', err);
    }
  };

  useEffect(() => {
    // TODO: Replace with actual API call
    // const fetchAssessmentDetails = async () => {
    //   try {
    //     const response = await fetch(`/api/v1/assessments/${assessmentId}`);
    //     if (!response.ok) throw new Error('Failed to fetch assessment');
    //     const data = await response.json();
    //     setAssessment(data);
    //   } catch (err) {
    //     setError(err instanceof Error ? err.message : 'Unknown error');
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // fetchAssessmentDetails();

    // Mock data for now
    setTimeout(() => {
      setError(null);
      setAssessment({
        id: Number(assessmentId),
        status: 'Validated',
        final_compliance_status: 'Passed',
        area_results: {
          'Financial Administration and Sustainability': 'Passed',
          'Disaster Preparedness': 'Passed',
          'Safety, Peace and Order': 'Passed',
          'Social Protection and Sensitivity': 'Passed',
          'Business-Friendliness and Competitiveness': 'Failed',
          'Environmental Management': 'Failed',
        },
        ai_recommendations: undefined,
        blgu_user: {
          name: 'Sample User',
          barangay: {
            name: 'Sample Barangay',
          },
        },
      });
      setIsLoading(false);
    }, 500);
  }, [assessmentId]);

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

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Assessment Report"
            description={error || 'Assessment not found'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title={`Assessment Report - ${assessment.blgu_user?.barangay?.name || 'Unknown'}`}
          description="View detailed SGLGB compliance status and area breakdown"
        />

        {/* Compliance Status Badge */}
        {assessment.final_compliance_status && (
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
              <ComplianceBadge status={assessment.final_compliance_status} />
            </div>
          </div>
        )}

        {/* Area Results */}
        {assessment.area_results && (
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Governance Area Results</h3>
            <AreaResultsDisplay areaResults={assessment.area_results} />
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
          {!assessment.ai_recommendations && (
            <InsightsGenerator
              assessmentId={assessment.id}
              isAssessmentValidated={assessment.status === 'Validated'}
              onGenerate={handleGenerate}
              isGenerating={isGenerating || isGeneratingInsights}
            />
          )}

          {/* Generating State */}
          {(isGenerating || isGeneratingInsights) && (
            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-md border border-muted">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                Generating AI insights... This may take a few moments.
              </p>
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

          {/* Display Insights */}
          {assessment.ai_recommendations && (
            <AIInsightsDisplay insights={assessment.ai_recommendations as any} />
          )}
        </div>
      </div>
    </div>
  );
}
