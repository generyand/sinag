"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarangaySubmission, UnifiedStatus } from "@/types/submissions";
import { Clock, Eye, Play } from "lucide-react";
import { UNIFIED_STATUS_CONFIG } from "./utils/statusConfig";

interface SubmissionsTableProps {
  submissions: BarangaySubmission[];
  onSubmissionClick: (submission: BarangaySubmission) => void;
}

export function SubmissionsTable({ submissions, onSubmissionClick }: SubmissionsTableProps) {
  // Get unified status badge using the centralized config
  const getUnifiedStatusBadge = (status: UnifiedStatus) => {
    const config = UNIFIED_STATUS_CONFIG[status];
    return (
      <Badge
        variant="secondary"
        className={`text-[${config.textColor}] border-0 whitespace-nowrap`}
        style={{ backgroundColor: config.bgColor, color: config.textColor }}
      >
        {config.label}
      </Badge>
    );
  };

  // Get the appropriate icon for each action
  const getActionIcon = (status: UnifiedStatus) => {
    switch (status) {
      case "awaiting_assessment":
      case "awaiting_re_review":
        return Play;
      case "assessment_in_progress":
      case "re_assessment_in_progress":
        return Clock;
      case "sent_for_rework":
      case "reviewed":
      default:
        return Eye;
    }
  };

  // Get action button based on unified status
  const getActionButton = (submission: BarangaySubmission) => {
    const { unifiedStatus } = submission;
    const config = UNIFIED_STATUS_CONFIG[unifiedStatus];
    const Icon = getActionIcon(unifiedStatus);

    // Determine variant based on action type
    const isGhost = config.actionVariant === "ghost";
    const isOutline = config.actionVariant === "outline";

    return (
      <Button
        size="sm"
        variant={isGhost ? "ghost" : isOutline ? "outline" : "default"}
        onClick={(e) => {
          e.stopPropagation();
          onSubmissionClick(submission);
        }}
        className={`relative z-10 ${config.actionColorClass} shadow-lg hover:shadow-xl transition-shadow duration-200 rounded-sm`}
        aria-label={`${config.actionLabel} for ${submission.barangayName}`}
      >
        <Icon className="h-4 w-4 mr-2" aria-hidden="true" />
        {config.actionLabel}
      </Button>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "1 day ago";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table role="table" aria-label="Barangay submissions table">
          <caption className="sr-only">
            List of barangay submissions with their progress, status, and available actions
          </caption>
          <TableHeader>
            <TableRow
              className="border-[var(--border)] bg-gradient-to-r from-[var(--muted)] to-[var(--card)]"
              role="row"
            >
              <TableHead
                className="text-[var(--foreground)] font-semibold text-sm py-4 px-6"
                role="columnheader"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" aria-hidden="true"></div>
                  <span>Barangay Name</span>
                </div>
              </TableHead>
              <TableHead
                className="text-[var(--foreground)] font-semibold text-sm py-4 px-6"
                role="columnheader"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></div>
                  <span>Progress (in this Area)</span>
                </div>
              </TableHead>
              <TableHead
                className="text-[var(--foreground)] font-semibold text-sm py-4 px-6"
                role="columnheader"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" aria-hidden="true"></div>
                  <span>Status</span>
                </div>
              </TableHead>
              <TableHead
                className="text-[var(--foreground)] font-semibold text-sm py-4 px-6"
                role="columnheader"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full" aria-hidden="true"></div>
                  <span>Last Updated</span>
                </div>
              </TableHead>
              <TableHead
                className="text-[var(--foreground)] font-semibold text-sm py-4 px-6 text-center"
                role="columnheader"
              >
                <div className="flex items-center justify-center space-x-2">
                  <div
                    className="w-2 h-2 bg-[var(--cityscape-yellow)] rounded-full"
                    aria-hidden="true"
                  ></div>
                  <span>Actions</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission, index) => (
              <TableRow
                key={submission.id}
                className={`border-[var(--border)] hover:bg-gradient-to-r hover:from-[var(--hover)] hover:to-[var(--muted)] transition-all duration-200 cursor-pointer ${
                  index % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--muted)]"
                }`}
                onClick={() => onSubmissionClick(submission)}
                role="row"
              >
                <TableCell className="font-semibold text-[var(--foreground)] py-4 px-6" role="cell">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 bg-gradient-to-br from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] rounded-sm flex items-center justify-center text-[var(--cityscape-accent-foreground)] text-sm font-bold"
                      aria-hidden="true"
                    >
                      {submission.barangayName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--foreground)]">
                        Brgy. {submission.barangayName}
                      </div>
                      {submission.assignedTo && (
                        <div className="text-xs text-[var(--text-muted)]">
                          Assigned to: {submission.assignedTo}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-6" role="cell">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <Progress
                        value={submission.areaProgress}
                        className="h-2 bg-[var(--muted)]"
                        aria-label={`Progress: ${submission.areaProgress}%`}
                      />
                    </div>
                    <span className="text-sm font-semibold text-[var(--foreground)] min-w-[3rem] text-right">
                      {submission.areaProgress}%
                    </span>
                  </div>
                  <div
                    className="mt-1 text-xs text-[var(--text-muted)]"
                    aria-label="Progress description"
                  >
                    {submission.areaProgress < 25 && "Just started"}
                    {submission.areaProgress >= 25 && submission.areaProgress < 50 && "In progress"}
                    {submission.areaProgress >= 50 &&
                      submission.areaProgress < 75 &&
                      "Nearly complete"}
                    {submission.areaProgress >= 75 &&
                      submission.areaProgress < 100 &&
                      "Almost done"}
                    {submission.areaProgress === 100 && "Complete"}
                  </div>
                </TableCell>
                <TableCell className="py-4 px-6" role="cell">
                  {getUnifiedStatusBadge(submission.unifiedStatus)}
                </TableCell>
                <TableCell className="text-[var(--text-secondary)] text-sm py-4 px-6" role="cell">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-1 h-1 bg-[var(--text-muted)] rounded-full"
                      aria-hidden="true"
                    ></div>
                    <span>{formatDate(submission.lastUpdated)}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-6" role="cell">
                  <div className="flex justify-center">{getActionButton(submission)}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
