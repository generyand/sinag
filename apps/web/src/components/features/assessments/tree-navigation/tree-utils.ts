import { Assessment, GovernanceArea, Indicator } from "@/types/assessment";

/**
 * Calculate progress for a governance area
 */
export function calculateAreaProgress(area: GovernanceArea) {
  const indicators = getAllLeafIndicators(area.indicators);
  const completed = indicators.filter((i) => i.status === "completed").length;

  return {
    completed,
    total: indicators.length,
    percentage: indicators.length > 0 ? Math.round((completed / indicators.length) * 100) : 0,
  };
}

/**
 * Get all leaf indicators (indicators without children)
 */
export function getAllLeafIndicators(indicators: Indicator[]): Indicator[] {
  const leaves: Indicator[] = [];

  function traverse(indicator: Indicator) {
    const children = (indicator as any).children;
    if (children && children.length > 0) {
      children.forEach(traverse);
    } else {
      leaves.push(indicator);
    }
  }

  indicators.forEach(traverse);
  return leaves;
}

/**
 * Find indicator by ID in assessment tree
 */
export function findIndicatorById(
  assessment: Assessment,
  indicatorId: string
): { indicator: Indicator; areaId: string } | null {
  for (const area of assessment.governanceAreas) {
    const indicator = findInIndicatorTree(area.indicators, indicatorId);
    if (indicator) {
      return { indicator, areaId: area.id };
    }
  }
  return null;
}

/**
 * Find indicator in indicator tree (recursive)
 */
function findInIndicatorTree(indicators: Indicator[], indicatorId: string): Indicator | null {
  for (const indicator of indicators) {
    if (indicator.id === indicatorId) {
      return indicator;
    }
    const children = (indicator as any).children;
    if (children && children.length > 0) {
      const found = findInIndicatorTree(children, indicatorId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get parent area ID for an indicator
 */
export function getParentAreaId(assessment: Assessment, indicatorId: string): string | null {
  const result = findIndicatorById(assessment, indicatorId);
  return result?.areaId || null;
}

/**
 * Get first incomplete indicator in assessment
 */
export function getFirstIncompleteIndicator(
  assessment: Assessment
): { indicator: Indicator; areaId: string } | null {
  for (const area of assessment.governanceAreas) {
    const indicators = getAllLeafIndicators(area.indicators);
    const incomplete = indicators.find((i) => i.status !== "completed");
    if (incomplete) {
      return { indicator: incomplete, areaId: area.id };
    }
  }
  return null;
}

/**
 * Load expanded state from sessionStorage
 */
export function loadExpandedState(assessmentId: string): Set<string> {
  if (typeof window === "undefined") return new Set();

  try {
    const key = `assessment-tree-expanded-${assessmentId}`;
    const stored = sessionStorage.getItem(key);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Save expanded state to sessionStorage
 */
export function saveExpandedState(assessmentId: string, expanded: Set<string>) {
  if (typeof window === "undefined") return;

  try {
    const key = `assessment-tree-expanded-${assessmentId}`;
    sessionStorage.setItem(key, JSON.stringify([...expanded]));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Auto-expand first incomplete area
 */
export function getInitialExpandedAreas(assessment: Assessment): Set<string> {
  const expanded = new Set<string>();

  // Find first area with incomplete indicators
  for (const area of assessment.governanceAreas) {
    const indicators = getAllLeafIndicators(area.indicators);
    const hasIncomplete = indicators.some((i) => i.status !== "completed");
    if (hasIncomplete) {
      expanded.add(area.id);
      break;
    }
  }

  // If all complete or none started, expand first area
  if (expanded.size === 0 && assessment.governanceAreas.length > 0) {
    expanded.add(assessment.governanceAreas[0].id);
  }

  return expanded;
}
