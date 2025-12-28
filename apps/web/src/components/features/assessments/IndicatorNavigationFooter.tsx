"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

interface IndicatorNavigationFooterProps {
  currentCode?: string;
  currentPosition: number;
  totalIndicators: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  isLocked?: boolean;
}

/**
 * Sticky footer with next/previous navigation controls for indicators
 * Includes keyboard shortcuts (Alt+Left/Right) and responsive design
 */
export function IndicatorNavigationFooter({
  currentCode,
  currentPosition,
  totalIndicators,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  isLocked = false,
}: IndicatorNavigationFooterProps) {
  // Keyboard shortcuts: Alt+Left (previous), Alt+Right (next)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+Left Arrow - Previous
      if (e.altKey && e.key === "ArrowLeft" && hasPrevious) {
        e.preventDefault();
        onPrevious();
      }
      // Alt+Right Arrow - Next
      if (e.altKey && e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasPrevious, hasNext, onPrevious, onNext]);

  // Don't render if no indicators
  if (totalIndicators === 0) return null;

  return (
    <div
      className={cn(
        "sticky bottom-0 left-0 right-0 z-20",
        "border-t border-[var(--border)]",
        "bg-[var(--card)]/90 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--card)]/80",
        "shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
      )}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="default"
          onClick={onPrevious}
          disabled={!hasPrevious || isLocked}
          className={cn(
            "gap-2 min-w-[40px] sm:min-w-[110px] px-2 sm:px-4 transition-all duration-200",
            "border-[var(--border)] text-[var(--foreground)]",
            "hover:bg-[var(--hover)] hover:border-[var(--border)]",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
          aria-label="Previous indicator (Alt+Left)"
          title="Previous indicator (Alt+Left)"
        >
          <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline font-medium">Previous</span>
        </Button>

        {/* Center Label: Code + Position */}
        <div className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {currentCode && (
              <span className="font-mono text-xs font-semibold text-[var(--cityscape-yellow-dark)] bg-[var(--cityscape-yellow)]/10 px-2 py-0.5 rounded border border-[var(--cityscape-yellow)]/20">
                {currentCode}
              </span>
            )}
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Indicator {currentPosition} of {totalIndicators}
            </span>
          </div>
          <div className="h-1 w-24 bg-[var(--border)] rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-[var(--cityscape-yellow)] transition-all duration-300 ease-out"
              style={{ width: `${(currentPosition / totalIndicators) * 100}%` }}
            />
          </div>
        </div>

        {/* Next Button */}
        <Button
          size="default"
          onClick={onNext}
          disabled={!hasNext || isLocked}
          className={cn(
            "gap-2 min-w-[40px] sm:min-w-[110px] px-2 sm:px-4 transition-all duration-200 shadow-sm",
            "bg-[var(--cityscape-yellow)] text-[var(--foreground)] border border-[var(--cityscape-yellow-dark)]/10",
            "hover:bg-[var(--cityscape-yellow)]/90 hover:translate-x-0.5",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0"
          )}
          aria-label="Next indicator (Alt+Right)"
          title="Next indicator (Alt+Right)"
        >
          <span className="hidden sm:inline font-semibold">Next</span>
          <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );
}
