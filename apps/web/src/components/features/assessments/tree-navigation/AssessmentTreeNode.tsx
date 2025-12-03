"use client";

import { getGovernanceAreaLogo } from "@/lib/governance-area-logos";
import { GovernanceArea, Indicator } from "@/types/assessment";
import {
    AlertCircle,
    CheckCircle,
    ChevronRight,
    Circle,
    Folder
} from "lucide-react";
import Image from "next/image";

interface AssessmentTreeNodeProps {
  type: "area" | "indicator";
  item: GovernanceArea | Indicator;
  isExpanded?: boolean;
  isSelected?: boolean;
  isActive?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  level?: number;
  progress?: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export function AssessmentTreeNode({
  type,
  item,
  isExpanded = false,
  isSelected = false,
  isActive = false,
  onToggle,
  onClick,
  level = 0,
  progress,
}: AssessmentTreeNodeProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === "area" && onToggle) {
      onToggle();
    } else if (type === "indicator" && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (type === "area" && onToggle) {
        onToggle();
      } else if (type === "indicator" && onClick) {
        onClick();
      }
    }
  };

  const getStatusIcon = () => {
    if (type === "area") {
      const area = item as GovernanceArea;
      const logoPath = getGovernanceAreaLogo(area.code);

      // Use governance area logo if available
      if (logoPath) {
        return (
          <div className="relative h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
            <Image
              src={logoPath}
              alt={`${area.name} icon`}
              width={20}
              height={20}
              className="object-contain"
              priority
            />
            {/* Completion badge overlay */}
            {progress && progress.percentage === 100 && (
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-[var(--card)]">
                <CheckCircle className="h-full w-full text-white" />
              </div>
            )}
          </div>
        );
      }

      // Fallback to progress indicator if no logo
      if (!progress) return <Folder className="h-4 w-4 text-[var(--text-secondary)]" />;
      if (progress.percentage === 100) {
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      }
      return (
        <div className="relative h-4 w-4">
          <svg className="transform -rotate-90" viewBox="0 0 16 16">
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--border)]"
            />
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${progress.percentage * 0.377} ${(100 - progress.percentage) * 0.377}`}
              strokeLinecap="round"
              className="text-[var(--cityscape-yellow)]"
            />
          </svg>
        </div>
      );
    }

    // Indicator status icons
    const indicator = item as Indicator;

    switch (indicator.status) {
      case "completed":
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case "needs_rework":
        return <AlertCircle className="h-3.5 w-3.5 text-orange-500" />;
      default:
        return <Circle className="h-3.5 w-3.5 text-[var(--border)]" />;
    }
  };

  const height = type === "area" ? 36 : 32;
  // Adjusted indentation for cleaner hierarchy
  const indent = level * 16 + (type === "area" ? 0 : 12);

  return (
    <div
      role="treeitem"
      aria-expanded={type === "area" ? isExpanded : undefined}
      aria-selected={isSelected}
      aria-level={level + 1}
      tabIndex={0}
      className={`
        group relative flex items-center ${type === "area" ? "gap-2.5" : "gap-2"} cursor-pointer transition-colors duration-200 rounded-md mx-1
        ${isActive 
          ? "bg-[var(--cityscape-yellow)]/10 text-[var(--foreground)] font-medium" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--cityscape-yellow)]
      `}
      style={{
        height: `${height}px`,
        paddingLeft: `${indent}px`,
        paddingRight: "8px",
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Active Indicator Line (Left) */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 bg-[var(--cityscape-yellow)] rounded-r-full" />
      )}

      {/* Expand/Collapse Chevron (Areas only) */}
      {type === "area" && (
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <ChevronRight className={`h-3.5 w-3.5 ${isActive ? "text-[var(--foreground)]" : "text-[var(--text-secondary)]"}`} />
        </div>
      )}

      {/* Status Icon */}
      <div className="flex-shrink-0 flex items-center justify-center">{getStatusIcon()}</div>

      {/* Label */}
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        {type === "area" ? (
          <>
            <span className="truncate text-sm" title={(item as GovernanceArea).name}>
              {(item as GovernanceArea).name}
            </span>
            {progress && (
              <span className={`text-xs ${isActive ? "text-[var(--foreground)]/70" : "text-[var(--text-secondary)]"} flex-shrink-0 ml-auto`}>
                {progress.completed}/{progress.total}
              </span>
            )}
          </>
        ) : (
          <span
            className="truncate text-xs"
            title={item.name}
          >
            {(item as Indicator).code || item.name}
          </span>
        )}
      </div>
    </div>
  );
}
