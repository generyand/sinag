import type { Assessment } from "@/types/assessment";

interface AssessmentIndicatorNode {
  id: string;
  status?: string;
  isCompleted?: boolean;
  response?: {
    requires_rework?: boolean;
  };
  children?: AssessmentIndicatorNode[];
}

export interface ReworkProgressSummary {
  flagged: number;
  addressed: number;
  remaining: number;
}

function walkLeafIndicators(
  indicators: AssessmentIndicatorNode[] | undefined,
  visit: (indicator: AssessmentIndicatorNode) => void
) {
  for (const indicator of indicators || []) {
    if (indicator.children && indicator.children.length > 0) {
      walkLeafIndicators(indicator.children, visit);
      continue;
    }

    visit(indicator);
  }
}

export function getReworkProgressSummary(
  assessment: Assessment | null | undefined,
  addressedIndicatorIds: number[]
): ReworkProgressSummary {
  if (!assessment) {
    return { flagged: 0, addressed: 0, remaining: 0 };
  }

  const addressedIds = new Set(addressedIndicatorIds);
  let flagged = 0;
  let addressed = 0;

  for (const area of assessment.governanceAreas || []) {
    walkLeafIndicators((area as any).indicators, (indicator) => {
      if (indicator.response?.requires_rework !== true) {
        return;
      }

      flagged += 1;

      if (
        addressedIds.has(Number(indicator.id)) &&
        (indicator.isCompleted === true || indicator.status === "completed")
      ) {
        addressed += 1;
      }
    });
  }

  return {
    flagged,
    addressed,
    remaining: Math.max(flagged - addressed, 0),
  };
}
