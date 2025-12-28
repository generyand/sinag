/**
 * useReworkSummary Hook
 *
 * Custom hook for fetching AI-generated rework summary with automatic polling.
 *
 * Features:
 * - Fetches rework summary from API
 * - Polls every 5 seconds if summary is not yet available (still generating)
 * - Stops polling once summary is received or error occurs
 * - Provides loading, error, and data states
 * - Supports multiple languages (Bisaya, Tagalog, English)
 */

import { mutator } from "@/lib/api";
import { type LanguageCode } from "@/providers/LanguageProvider";
import { ReworkSummaryResponse } from "@/types/rework-summary";
import { useCallback, useEffect, useState } from "react";

interface UseReworkSummaryOptions {
  /** Whether to enable polling (default: true) */
  enablePolling?: boolean;
  /** Polling interval in milliseconds (default: 5000) */
  pollingInterval?: number;
  /** Maximum number of polling attempts (default: 20) */
  maxPollingAttempts?: number;
  /** Language code for the summary (default: uses user's preferred language) */
  language?: LanguageCode;
}

interface UseReworkSummaryResult {
  /** The rework summary data */
  data: ReworkSummaryResponse | null;
  /** Whether the summary is currently being fetched */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether the summary is still being generated (polling active) */
  isGenerating: boolean;
  /** Manually trigger a refetch */
  refetch: () => Promise<void>;
}

export function useReworkSummary(
  assessmentId: number | null | undefined,
  options: UseReworkSummaryOptions = {}
): UseReworkSummaryResult {
  const {
    enablePolling = true,
    pollingInterval = 5000,
    maxPollingAttempts = 20,
    language,
  } = options;

  const [data, setData] = useState<ReworkSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [pollingAttempts, setPollingAttempts] = useState<number>(0);

  const fetchSummary = useCallback(async () => {
    if (!assessmentId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Build URL with optional language parameter
      let url = `/api/v1/assessments/${assessmentId}/rework-summary`;
      if (language) {
        url += `?language=${language}`;
      }

      const data = await mutator<ReworkSummaryResponse>({
        url,
        method: "GET",
      });

      setData(data);
      setIsGenerating(false);
      setPollingAttempts(0);
    } catch (err: any) {
      // Handle 404: Summary is still being generated
      if (err.response?.status === 404) {
        const detail = err.response?.data?.detail || "";
        if (detail.includes("still being generated")) {
          setIsGenerating(true);
          setError(null); // Don't show error for generation in progress
        } else {
          setError("Rework summary not found");
          setIsGenerating(false);
        }
      }
      // Handle 400: Assessment not in rework status
      else if (err.response?.status === 400) {
        setError("Assessment is not in rework status");
        setIsGenerating(false);
      }
      // Handle other errors
      else {
        const errorMessage =
          err.response?.data?.detail || err.message || "Failed to fetch rework summary";
        setError(errorMessage);
        setIsGenerating(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId, language]);

  // Initial fetch and refetch when language changes
  useEffect(() => {
    if (assessmentId) {
      fetchSummary();
    }
  }, [assessmentId, language, fetchSummary]);

  // Polling logic
  useEffect(() => {
    if (!enablePolling || !isGenerating || !assessmentId || pollingAttempts >= maxPollingAttempts) {
      return;
    }

    const intervalId = setInterval(() => {
      setPollingAttempts((prev) => prev + 1);
      fetchSummary();
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [
    enablePolling,
    isGenerating,
    assessmentId,
    pollingInterval,
    pollingAttempts,
    maxPollingAttempts,
    fetchSummary,
  ]);

  // Stop polling if max attempts reached
  useEffect(() => {
    if (pollingAttempts >= maxPollingAttempts && isGenerating) {
      setIsGenerating(false);
      setError(
        "Rework summary generation is taking longer than expected. Please refresh the page in a few moments."
      );
    }
  }, [pollingAttempts, maxPollingAttempts, isGenerating]);

  return {
    data,
    isLoading,
    error,
    isGenerating,
    refetch: fetchSummary,
  };
}
