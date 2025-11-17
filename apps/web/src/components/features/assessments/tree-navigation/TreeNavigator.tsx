"use client";

import { Assessment } from "@/types/assessment";
import { useEffect, useState, ReactElement } from "react";
import { AssessmentTreeNode } from "./AssessmentTreeNode";
import { TreeHeader } from "./TreeHeader";
import {
  calculateAreaProgress,
  loadExpandedState,
  saveExpandedState,
  getInitialExpandedAreas,
} from "./tree-utils";

interface TreeNavigatorProps {
  assessment: Assessment;
  selectedIndicatorId: string | null;
  onIndicatorSelect: (indicatorId: string) => void;
}

export function TreeNavigator({
  assessment,
  selectedIndicatorId,
  onIndicatorSelect,
}: TreeNavigatorProps) {
  // Load expanded state from sessionStorage or auto-expand first incomplete
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(() => {
    const stored = loadExpandedState(assessment.id);
    return stored.size > 0 ? stored : getInitialExpandedAreas(assessment);
  });

  // Save expanded state when it changes
  useEffect(() => {
    saveExpandedState(assessment.id, expandedAreas);
  }, [expandedAreas, assessment.id]);

  const toggleArea = (areaId: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
      } else {
        next.add(areaId);
      }
      return next;
    });
  };

  const handleIndicatorClick = (indicatorId: string) => {
    onIndicatorSelect(indicatorId);
  };

  // Recursive function to render indicator tree with proper nesting
  const renderIndicatorTree = (indicators: any[], level: number = 1): ReactElement[] => {
    return indicators.map((indicator) => {
      const hasChildren = indicator.children && indicator.children.length > 0;

      // Only render leaf indicators (indicators without children)
      // Parent containers with children are just organizational and shouldn't be clickable
      if (hasChildren) {
        // This is a parent container - recursively render its children
        return (
          <div key={indicator.id}>
            {renderIndicatorTree(indicator.children, level)}
          </div>
        );
      }

      // This is a leaf indicator - render it normally
      return (
        <div key={indicator.id}>
          <AssessmentTreeNode
            type="indicator"
            item={indicator}
            isActive={selectedIndicatorId === indicator.id}
            onClick={() => handleIndicatorClick(indicator.id)}
            level={level}
          />
        </div>
      );
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      // TODO: Implement arrow key navigation
    }
  };

  return (
    <div
      role="tree"
      aria-label="Assessment navigation"
      className="h-full flex flex-col bg-[var(--card)] border-r border-[var(--border)]"
      onKeyDown={handleKeyDown}
    >
      {/* Sticky Header */}
      <TreeHeader
        completedIndicators={assessment.completedIndicators}
        totalIndicators={assessment.totalIndicators}
      />

      {/* Scrollable Tree Content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 8px;
          }
          div::-webkit-scrollbar-track {
            background: transparent;
          }
          div::-webkit-scrollbar-thumb {
            background: var(--border);
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: var(--cityscape-yellow);
          }
        `}</style>

        {assessment.governanceAreas.map((area) => {
          const isExpanded = expandedAreas.has(area.id);
          const progress = calculateAreaProgress(area);

          return (
            <div key={area.id}>
              {/* Area Node */}
              <AssessmentTreeNode
                type="area"
                item={area}
                isExpanded={isExpanded}
                onToggle={() => toggleArea(area.id)}
                progress={progress}
                level={0}
              />

              {/* Indicators (when expanded) - Render hierarchical tree */}
              {isExpanded && (
                <div>
                  {renderIndicatorTree(area.indicators, 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
