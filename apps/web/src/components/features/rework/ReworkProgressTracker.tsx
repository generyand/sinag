/**
 * Rework Progress Tracker Component
 *
 * Shows rework progress and provides navigation to next/previous failed indicators.
 * Displays at the bottom of indicator forms during rework workflow.
 */

"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ReworkProgress } from "@/types/rework";

interface ReworkProgressTrackerProps {
  progress: ReworkProgress;
  assessmentId: number;
}

export function ReworkProgressTracker({ progress, assessmentId }: ReworkProgressTrackerProps) {
  const router = useRouter();

  const handlePrevious = () => {
    if (progress.previous_indicator_id) {
      router.push(`/blgu/assessment/${assessmentId}/indicator/${progress.previous_indicator_id}?from=rework`);
    }
  };

  const handleNext = () => {
    if (progress.next_indicator_id) {
      router.push(`/blgu/assessment/${assessmentId}/indicator/${progress.next_indicator_id}?from=rework`);
    }
  };

  const handleBackToDashboard = () => {
    router.push(`/blgu/dashboard`);
  };

  return (
    <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t-2 border-orange-300 dark:border-orange-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              Rework Progress
            </span>
            <span className="text-gray-900 dark:text-gray-100 font-semibold">
              {progress.fixed_count} of {progress.total_failed} Fixed ({progress.completion_percentage.toFixed(0)}%)
            </span>
          </div>
          <Progress value={progress.completion_percentage} className="h-2" />
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Previous + Back to Dashboard */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={!progress.has_previous}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToDashboard}
              className="gap-1"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </div>

          {/* Center: Position Indicator */}
          {progress.current_index !== undefined && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Indicator {progress.current_index + 1} of {progress.total_failed}
            </div>
          )}

          {/* Right: Next */}
          <div>
            {progress.has_next ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleNext}
                className="gap-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                Next Failed Indicator
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleBackToDashboard}
                className="gap-1 bg-green-600 hover:bg-green-700 text-white"
              >
                All Done! Back to Dashboard
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
