"use client";

import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";

interface InsightsGeneratorProps {
  assessmentId: number;
  isAssessmentValidated: boolean;
  onGenerate: () => Promise<void>;
  onRegenerate?: () => Promise<void>;
  isGenerating?: boolean;
  isRegenerating?: boolean;
  hasExistingInsights?: boolean;
  className?: string;
}

export function InsightsGenerator({
  assessmentId,
  isAssessmentValidated,
  onGenerate,
  onRegenerate,
  isGenerating = false,
  isRegenerating = false,
  hasExistingInsights = false,
  className,
}: InsightsGeneratorProps) {
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!isAssessmentValidated || isGenerating) {
      return;
    }

    try {
      setError(null);
      await onGenerate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate insights");
    }
  };

  const handleRegenerate = async () => {
    if (!onRegenerate || isRegenerating) {
      return;
    }

    try {
      setError(null);
      await onRegenerate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate insights");
    }
  };

  const isDisabled = !isAssessmentValidated || isGenerating;
  const isProcessing = isGenerating || isRegenerating;

  return (
    <div className={className}>
      {/* Show regenerate button when insights already exist */}
      {hasExistingInsights && onRegenerate ? (
        <Button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="w-full justify-start"
          variant="outline"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Regenerating AI Insights...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Regenerate AI Insights
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={handleGenerate}
          disabled={isDisabled}
          className="w-full justify-start"
          variant="outline"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating AI Insights...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate AI-Powered Insights
            </>
          )}
        </Button>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {!isAssessmentValidated && !hasExistingInsights && (
        <p className="mt-2 text-sm text-muted-foreground">
          Assessment must be validated before generating insights
        </p>
      )}
    </div>
  );
}
