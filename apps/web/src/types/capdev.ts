/**
 * CapDev (Capacity Development) Types
 * Local type definitions for AI-generated CapDev insights content
 *
 * These types define the expected structure of CapDev insights,
 * but the frontend handles both structured objects and string arrays
 * due to flexible AI-generated content.
 */

/**
 * Governance weakness identified by AI analysis
 */
export interface GovernanceWeakness {
  area_name: string;
  description: string;
  severity?: "high" | "medium" | "low";
}

/**
 * Capacity development recommendation
 */
export interface CapDevRecommendation {
  title: string;
  description: string;
  governance_area?: string;
  priority?: "high" | "medium" | "low";
  expected_impact?: string;
}

/**
 * Identified capacity development need
 */
export interface CapDevNeed {
  area: string;
  current_gap: string;
  target_state: string;
  skills_required?: string[];
}

/**
 * Alternative AI format for capacity development needs
 */
export interface CapDevNeedAIFormat {
  category: string;
  description: string;
  affected_indicators?: string[];
  suggested_providers?: string[];
}

/**
 * Suggested training/intervention
 */
export interface SuggestedIntervention {
  intervention_type: string;
  title: string;
  description: string;
  target_audience: string;
  estimated_duration?: string;
  resources_needed?: string[];
}

/**
 * Alternative AI format for suggested interventions
 * Note: Backend sends Title Case values (e.g., "Immediate", "Short-term", "Long-term")
 * Frontend normalizes with toLowerCase() for comparison
 */
export interface SuggestedInterventionAIFormat {
  title: string;
  description: string;
  governance_area?: string;
  priority?: "Immediate" | "Short-term" | "Long-term" | "immediate" | "short-term" | "long-term";
  estimated_duration?: string;
  resource_requirements?: string;
}

/**
 * Priority action item
 * Note: Backend sends Title Case values for timeline
 */
export interface PriorityAction {
  action: string;
  responsible_party: string;
  timeline: "Immediate" | "Short-term" | "Long-term" | "immediate" | "short-term" | "long-term";
  success_indicator?: string;
}

/**
 * Full CapDev insights content structure
 * Note: AI may return simpler structures (string arrays instead of objects)
 */
export interface CapDevInsightsContent {
  summary: string;
  governance_weaknesses?: GovernanceWeakness[] | string[];
  recommendations?: CapDevRecommendation[] | string[];
  capacity_development_needs?: CapDevNeed[] | CapDevNeedAIFormat[];
  suggested_interventions?: SuggestedIntervention[] | SuggestedInterventionAIFormat[];
  priority_actions?: PriorityAction[] | string[];
  generated_at?: string;
}

/**
 * Type guard to check if a value is a string array
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && (value.length === 0 || typeof value[0] === "string");
}

/**
 * Type guard to check if item is a GovernanceWeakness object
 */
export function isGovernanceWeakness(item: unknown): item is GovernanceWeakness {
  return typeof item === "object" && item !== null && "area_name" in item && "description" in item;
}

/**
 * Type guard to check if item is a CapDevRecommendation object
 */
export function isCapDevRecommendation(item: unknown): item is CapDevRecommendation {
  return typeof item === "object" && item !== null && "title" in item && "description" in item;
}

/**
 * Type guard for AI format capacity development needs
 */
export function isCapDevNeedAIFormat(item: unknown): item is CapDevNeedAIFormat {
  return typeof item === "object" && item !== null && "category" in item;
}

/**
 * Type guard for AI format interventions
 */
export function isSuggestedInterventionAIFormat(
  item: unknown
): item is SuggestedInterventionAIFormat {
  return (
    (typeof item === "object" && item !== null && "governance_area" in item) ||
    "priority" in (item as object)
  );
}
