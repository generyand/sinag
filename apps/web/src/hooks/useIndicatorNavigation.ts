import { useMemo, useCallback } from "react";
import { Assessment, Indicator } from "@/types/assessment";

/**
 * Flattened indicator with navigation context
 */
export interface FlatIndicator {
  indicator: Indicator;
  areaCode: string;
  position: number; // 1-indexed position in flat list
}

/**
 * Hook to provide sequential next/previous navigation through indicators
 * Builds a flat list of all leaf indicators in assessment order
 */
export function useIndicatorNavigation(
  assessment: Assessment | null,
  currentIndicatorId: string | null,
  onNavigate?: (indicatorId: string) => void
) {
  // Build flat list of all leaf indicators in sequential order
  const flatIndicators = useMemo<FlatIndicator[]>(() => {
    if (!assessment) return [];

    const flat: FlatIndicator[] = [];
    let position = 1;

    // Traverse each governance area in order
    for (const area of assessment.governanceAreas) {
      // Recursively collect leaf indicators
      const collectLeafIndicators = (indicators: Indicator[]): Indicator[] => {
        const leaves: Indicator[] = [];
        for (const indicator of indicators) {
          const children = (indicator as any).children;
          if (children && children.length > 0) {
            // Has children, recurse
            leaves.push(...collectLeafIndicators(children));
          } else {
            // Leaf indicator
            leaves.push(indicator);
          }
        }
        return leaves;
      };

      const leafIndicators = collectLeafIndicators(area.indicators);

      for (const indicator of leafIndicators) {
        flat.push({
          indicator,
          areaCode: area.code,
          position: position++,
        });
      }
    }

    return flat;
  }, [assessment]);

  // Find current indicator index
  const currentIndex = useMemo(() => {
    if (!currentIndicatorId) return -1;
    return flatIndicators.findIndex((fi) => fi.indicator.id === currentIndicatorId);
  }, [flatIndicators, currentIndicatorId]);

  // Get previous and next indicators
  const previous = currentIndex > 0 ? flatIndicators[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < flatIndicators.length - 1
      ? flatIndicators[currentIndex + 1]
      : null;

  // Current indicator data
  const current = currentIndex >= 0 ? flatIndicators[currentIndex] : null;

  // Navigation functions
  const navigatePrevious = useCallback(() => {
    if (previous && onNavigate) {
      onNavigate(previous.indicator.id);
    }
  }, [previous, onNavigate]);

  const navigateNext = useCallback(() => {
    if (next && onNavigate) {
      onNavigate(next.indicator.id);
    }
  }, [next, onNavigate]);

  return {
    previous,
    next,
    current,
    position: current?.position || 0,
    total: flatIndicators.length,
    navigatePrevious,
    navigateNext,
    hasPrevious: previous !== null,
    hasNext: next !== null,
  };
}
