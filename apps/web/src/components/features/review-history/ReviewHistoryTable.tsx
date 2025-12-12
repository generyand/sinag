"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { ReviewHistoryItem } from "@sinag/shared";
import { ReviewHistoryRow } from "./ReviewHistoryRow";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ReviewHistoryTableProps {
  items: ReviewHistoryItem[];
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function ReviewHistoryTable({
  items,
  currentPage,
  totalPages,
  hasMore,
  onPageChange,
  isLoading = false,
}: ReviewHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm">
        <div className="p-8 text-center">
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[var(--muted)] rounded-sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm">
        <div className="p-12 text-center">
          <div className="mx-auto h-16 w-16 text-[var(--text-muted)] mb-4 bg-[var(--muted)] rounded-full flex items-center justify-center">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            No completed reviews found
          </h3>
          <p className="text-[var(--text-secondary)] max-w-md mx-auto">
            When you complete assessment reviews, they will appear here for your reference.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--muted)] hover:bg-[var(--muted)]">
              <TableHead className="w-10"></TableHead>
              <TableHead>Barangay</TableHead>
              <TableHead className="hidden md:table-cell">Governance Area</TableHead>
              <TableHead className="hidden lg:table-cell">Completed</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead className="hidden sm:table-cell">Indicators</TableHead>
              <TableHead className="hidden lg:table-cell">Flags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <ReviewHistoryRow key={item.assessment_id} item={item} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--muted)]">
          <div className="text-sm text-[var(--text-secondary)]">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasMore}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
