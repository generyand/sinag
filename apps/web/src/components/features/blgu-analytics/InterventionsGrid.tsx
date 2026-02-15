"use client";

import { GraduationCap, Clock, Users } from "lucide-react";
import {
  SuggestedIntervention,
  SuggestedInterventionAIFormat,
  isSuggestedInterventionAIFormat,
} from "@/types/capdev";

interface InterventionsGridProps {
  interventions?: SuggestedIntervention[] | SuggestedInterventionAIFormat[];
}

/**
 * Grid display of suggested interventions/trainings
 */
export function InterventionsGrid({ interventions }: InterventionsGridProps) {
  if (!interventions || interventions.length === 0) {
    return null;
  }

  // Priority styling for AI format
  const getPriorityStyle = (priority?: string) => {
    const normalizedPriority = priority?.toLowerCase();
    switch (normalizedPriority) {
      case "immediate":
        return "bg-red-100 text-red-700 border-red-200";
      case "short-term":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "long-term":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Suggested Interventions</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {interventions.map((intervention, idx) => {
          // Check if AI format
          if (isSuggestedInterventionAIFormat(intervention)) {
            const aiIntervention = intervention as SuggestedInterventionAIFormat;
            return (
              <div
                key={idx}
                className="p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)] hover:border-[var(--cityscape-yellow)] transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-[var(--foreground)]">{aiIntervention.title}</h4>
                  {aiIntervention.priority && (
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full border flex-shrink-0 ${getPriorityStyle(aiIntervention.priority)}`}
                    >
                      {aiIntervention.priority}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  {aiIntervention.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                  {aiIntervention.governance_area && (
                    <span className="flex items-center gap-1">
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                        {aiIntervention.governance_area}
                      </span>
                    </span>
                  )}
                  {aiIntervention.estimated_duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {aiIntervention.estimated_duration}
                    </span>
                  )}
                </div>
                {aiIntervention.resource_requirements && (
                  <p className="text-xs text-[var(--text-secondary)] mt-2 pt-2 border-t border-[var(--border)]">
                    <span className="font-medium">Resources:</span>{" "}
                    {aiIntervention.resource_requirements}
                  </p>
                )}
              </div>
            );
          }

          // Standard format
          const stdIntervention = intervention as SuggestedIntervention;
          return (
            <div
              key={idx}
              className="p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)] hover:border-[var(--cityscape-yellow)] transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-medium text-[var(--foreground)]">{stdIntervention.title}</h4>
                {stdIntervention.intervention_type && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--text-secondary)] flex-shrink-0">
                    {stdIntervention.intervention_type}
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                {stdIntervention.description}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                {stdIntervention.target_audience && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {stdIntervention.target_audience}
                  </span>
                )}
                {stdIntervention.estimated_duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {stdIntervention.estimated_duration}
                  </span>
                )}
              </div>
              {stdIntervention.resources_needed && stdIntervention.resources_needed.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--border)]">
                  <p className="text-xs font-medium text-[var(--foreground)] mb-1">
                    Resources Needed:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {stdIntervention.resources_needed.map((resource, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-[var(--card)] rounded-full text-[var(--text-secondary)]"
                      >
                        {resource}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
