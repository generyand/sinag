"use client";

import { Indicator, GovernanceArea } from "@/types/assessment";
import {
  ChevronRight,
  ChevronDown,
  Circle,
  CheckCircle,
  AlertCircle,
  Folder,
} from "lucide-react";
import Image from "next/image";
import { getGovernanceAreaLogo } from "@/lib/governance-area-logos";

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
          <div className="relative h-6 w-6 flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
            <Image
              src={logoPath}
              alt={`${area.name} icon`}
              width={24}
              height={24}
              className="object-contain"
              priority
            />
            {/* Completion badge overlay */}
            {progress && progress.percentage === 100 && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-[var(--card)]">
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
        return <Circle className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const height = type === "area" ? 40 : 32;
  const indent = level * 12 + (type === "area" ? 0 : 20);

  return (
    <div
      role="treeitem"
      aria-expanded={type === "area" ? isExpanded : undefined}
      aria-selected={isSelected}
      aria-level={level + 1}
      tabIndex={0}
      className={`
        group relative flex items-center ${type === "area" ? "gap-2" : "gap-1.5"} cursor-pointer transition-all duration-150
        ${isActive ? "bg-[var(--cityscape-yellow)]/10 border-l-[3px] border-l-[var(--cityscape-yellow)]" : "border-l-[3px] border-l-transparent"}
        ${!isActive ? "hover:bg-[var(--hover)]" : ""}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--cityscape-yellow)]
      `}
      style={{
        height: `${height}px`,
        paddingLeft: `${indent}px`,
        minHeight: `${height}px`,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Expand/Collapse Chevron (Areas only) */}
      {type === "area" && (
        <div className="flex-shrink-0 w-4 h-4">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
          )}
        </div>
      )}

      {/* Status Icon */}
      <div className="flex-shrink-0">{getStatusIcon()}</div>

      {/* Label */}
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        {type === "area" ? (
          <>
            <span
              className={`
              font-semibold text-sm truncate
              ${isActive ? "text-[var(--foreground)]" : "text-[var(--foreground)]"}
            `}
            >
              {(item as GovernanceArea).code}
            </span>
            {progress && (
              <span className="text-xs text-[var(--text-secondary)] flex-shrink-0">
                {progress.completed}/{progress.total}
              </span>
            )}
          </>
        ) : (
          <>
            <span
              className={`
              text-xs font-medium
              ${isActive ? "text-[var(--foreground)]" : "text-[var(--text-secondary)]"}
            `}
              title={item.name}
            >
              {(item as Indicator).code || item.name}
            </span>
          </>
        )}
      </div>

      {/* Hover indicator */}
      {!isActive && (
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-[var(--cityscape-yellow)] opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
      )}
    </div>
  );
}
