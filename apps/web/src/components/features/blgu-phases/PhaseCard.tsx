"use client";

/**
 * PhaseCard Component
 *
 * A collapsible card component for displaying assessment phases.
 * Supports three visual states: active, completed, and locked/pending.
 *
 * Props:
 * - title: Phase title (e.g., "Phase 1: Initial Assessment")
 * - status: Current status of the phase
 * - statusLabel: Human-readable status label
 * - isActive: Whether this phase is currently active
 * - defaultExpanded: Whether the card is expanded by default
 * - children: Phase content to render when expanded
 * - icon: Optional icon component to display
 */

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Clock, Lock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PhaseStatus =
  | "in_progress"
  | "under_review"
  | "needs_rework"
  | "completed"
  | "not_started"
  | "calibration"
  | "pending"
  | "available";

interface PhaseCardProps {
  title: string;
  phaseNumber: 1 | 2 | 3;
  status: PhaseStatus;
  statusLabel: string;
  isActive?: boolean;
  defaultExpanded?: boolean;
  children: ReactNode;
  className?: string;
  "data-tour"?: string;
}

const statusConfig: Record<
  PhaseStatus,
  {
    bgColor: string;
    borderColor: string;
    badgeVariant: string;
    badgeClass: string;
    icon: typeof CheckCircle2;
    iconClass: string;
  }
> = {
  in_progress: {
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    borderColor: "border-yellow-400 dark:border-yellow-600",
    badgeVariant: "secondary",
    badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: Loader2,
    iconClass: "text-yellow-600 animate-spin",
  },
  under_review: {
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-400 dark:border-blue-600",
    badgeVariant: "secondary",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: Clock,
    iconClass: "text-blue-600",
  },
  needs_rework: {
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    borderColor: "border-orange-400 dark:border-orange-600",
    badgeVariant: "secondary",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    icon: Clock,
    iconClass: "text-orange-600",
  },
  completed: {
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-400 dark:border-green-600",
    badgeVariant: "secondary",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: CheckCircle2,
    iconClass: "text-green-600",
  },
  not_started: {
    bgColor: "bg-gray-50 dark:bg-gray-900/20",
    borderColor: "border-gray-300 dark:border-gray-700",
    badgeVariant: "secondary",
    badgeClass: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: Lock,
    iconClass: "text-gray-400",
  },
  calibration: {
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-400 dark:border-purple-600",
    badgeVariant: "secondary",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    icon: Clock,
    iconClass: "text-purple-600",
  },
  pending: {
    bgColor: "bg-gray-50 dark:bg-gray-900/20",
    borderColor: "border-gray-300 dark:border-gray-700",
    badgeVariant: "secondary",
    badgeClass: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: Clock,
    iconClass: "text-gray-400",
  },
  available: {
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-400 dark:border-green-600",
    badgeVariant: "secondary",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: CheckCircle2,
    iconClass: "text-green-600",
  },
};

export function PhaseCard({
  title,
  phaseNumber,
  status,
  statusLabel,
  isActive = false,
  defaultExpanded,
  children,
  className,
  "data-tour": dataTour,
}: PhaseCardProps) {
  // Default expanded state: active phases are expanded, others collapsed
  const [isExpanded, setIsExpanded] = useState(
    defaultExpanded !== undefined ? defaultExpanded : isActive
  );

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border-2 overflow-hidden transition-all duration-200",
        config.bgColor,
        config.borderColor,
        isActive && "shadow-md",
        className
      )}
      data-tour={dataTour}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Phase number circle */}
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              status === "completed" || status === "available"
                ? "bg-green-500 text-white"
                : status === "not_started" || status === "pending"
                  ? "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                  : "bg-yellow-500 text-white"
            )}
          >
            {status === "completed" || status === "available" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              phaseNumber
            )}
          </div>

          {/* Title */}
          <span className="font-semibold text-[var(--foreground)] text-left">{title}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Status badge */}
          <Badge variant="secondary" className={config.badgeClass}>
            <StatusIcon className={cn("w-3 h-3 mr-1", config.iconClass)} />
            {statusLabel}
          </Badge>

          {/* Expand/Collapse icon */}
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
          ) : (
            <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
          )}
        </div>
      </button>

      {/* Content - Collapsible */}
      {isExpanded && (
        <div className="border-t border-[var(--border)] bg-[var(--card)] p-4">{children}</div>
      )}
    </div>
  );
}
