"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

interface InsightsGeneratorProps {
  assessmentId: number;
  isAssessmentValidated: boolean;
  onGenerate: () => Promise<void>;
  isGenerating?: boolean;
  className?: string;
}

export function InsightsGenerator({
  assessmentId,
  isAssessmentValidated,
  onGenerate,
  isGenerating = false,
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

  const isDisabled = !isAssessmentValidated || isGenerating;

  return (
    <div className={className}>
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

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {!isAssessmentValidated && (
        <p className="mt-2 text-sm text-muted-foreground">
          Assessment must be validated before generating insights
        </p>
      )}
    </div>
  );
}
