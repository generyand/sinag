"use client";

import { useState, Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, RefreshCw, AlertTriangle } from "lucide-react";
import type { ReviewHistoryItem } from "@sinag/shared";
import { ReviewHistoryDetail } from "./ReviewHistoryDetail";
import { useReviewHistoryDetail } from "@/hooks/useReviewHistory";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ReviewHistoryRowProps {
  item: ReviewHistoryItem;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "-";
  }
}

export function ReviewHistoryRow({ item }: ReviewHistoryRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only fetch detail when expanded
  const {
    data: detail,
    isLoading,
    error,
  } = useReviewHistoryDetail({
    assessmentId: item.assessment_id,
    enabled: isExpanded,
  });

  // Log errors for debugging
  if (error && isExpanded) {
    console.error("Failed to load review history detail:", error);
  }

  const outcomeBadgeVariant = item.final_compliance_status === "PASSED" ? "default" : "destructive";

  const handleRowClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Fragment>
      {/* Main row - clickable to expand/collapse */}
      <TableRow
        onClick={handleRowClick}
        className={cn(
          "cursor-pointer transition-all duration-200",
          isExpanded
            ? "bg-[var(--cityscape-yellow)]/5 hover:bg-[var(--cityscape-yellow)]/10"
            : "hover:bg-[var(--muted)]/50"
        )}
      >
        {/* Expand button - circular */}
        <TableCell className="w-10 p-2">
          <div className="flex items-center justify-center">
            <button
              type="button"
              className={cn(
                "p-1.5 rounded-full transition-all duration-200",
                isExpanded
                  ? "bg-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] shadow-sm"
                  : "hover:bg-[var(--muted)] text-[var(--text-muted)]"
              )}
              aria-label={isExpanded ? "Collapse details" : "Expand details"}
              aria-expanded={isExpanded}
              onClick={(e) => {
                e.stopPropagation();
                handleRowClick();
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>
        </TableCell>

        {/* Barangay */}
        <TableCell>
          <div className="font-medium text-[var(--foreground)] text-sm">{item.barangay_name}</div>
          {item.municipality_name && (
            <div className="text-xs text-[var(--text-muted)]">{item.municipality_name}</div>
          )}
        </TableCell>

        {/* Governance Area */}
        <TableCell className="hidden md:table-cell">
          <span className="text-sm text-[var(--text-secondary)]">
            {item.governance_area_name || "All Areas"}
          </span>
        </TableCell>

        {/* Completed Date */}
        <TableCell className="hidden lg:table-cell">
          <span className="text-sm text-[var(--text-secondary)]">
            {formatDate(item.completed_at)}
          </span>
        </TableCell>

        {/* Outcome */}
        <TableCell>
          {item.final_compliance_status ? (
            <Badge variant={outcomeBadgeVariant} className="text-xs">
              {item.final_compliance_status}
            </Badge>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">N/A</span>
          )}
        </TableCell>

        {/* Indicators breakdown */}
        <TableCell className="hidden sm:table-cell">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-600 dark:text-green-400 font-medium">
              {item.pass_count}P
            </span>
            <span className="text-red-600 dark:text-red-400 font-medium">{item.fail_count}F</span>
            {(item.conditional_count ?? 0) > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                {item.conditional_count}C
              </span>
            )}
          </div>
        </TableCell>

        {/* Flags */}
        <TableCell className="hidden lg:table-cell">
          <div className="flex items-center gap-1">
            {item.was_reworked && (
              <Badge
                variant="outline"
                className="text-xs bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Rework
              </Badge>
            )}
            {item.was_calibrated && (
              <Badge
                variant="outline"
                className="text-xs bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Cal
              </Badge>
            )}
            {!item.was_reworked && !item.was_calibrated && (
              <span className="text-xs text-[var(--text-muted)]">—</span>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      {isExpanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7} className="p-0">
            <ReviewHistoryDetail
              detail={detail}
              isLoading={isLoading}
              error={error instanceof Error ? error : null}
            />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}
