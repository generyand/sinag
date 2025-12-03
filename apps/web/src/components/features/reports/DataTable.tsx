"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableData, AssessmentRow } from "@sinag/shared";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from "lucide-react";
import { AnalyticsEmptyState } from "@/components/features/analytics";

interface AssessmentDataTableProps {
  data: TableData;
  onRowClick?: (row: AssessmentRow) => void;
}

// Helper function to get status badge color
const getStatusColor = (status: string): string => {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes("pass")) return "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30";
  if (normalizedStatus.includes("fail")) return "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30";
  if (normalizedStatus.includes("progress"))
    return "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30";
  return "text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800";
};

// Helper function to get score color based on value
const getScoreColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return "text-[var(--muted-foreground)]";
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
};

export function AssessmentDataTable({
  data,
  onRowClick,
}: AssessmentDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Use empty array if no rows, but always call the hook
  const rows = data.rows || [];

  // Column definitions
  const columns: ColumnDef<AssessmentRow>[] = [
    {
      accessorKey: "barangay_name",
      header: "Barangay Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("barangay_name")}</div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "governance_area",
      header: "Governance Area",
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("governance_area")}</div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <div
            className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${getStatusColor(
              status
            )}`}
          >
            {status}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "score",
      header: "Score",
      cell: ({ row }) => {
        const score = row.getValue("score") as number | null | undefined;
        return (
          <div className={`text-sm font-semibold ${getScoreColor(score)}`}>
            {score !== null && score !== undefined
              ? `${score.toFixed(1)}%`
              : "N/A"}
          </div>
        );
      },
      enableSorting: true,
    },
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: data.page_size || 50,
        pageIndex: (data.page || 1) - 1,
      },
    },
  });

  // Calculate pagination info
  const startRow = (data.page - 1) * data.page_size + 1;
  const endRow = Math.min(data.page * data.page_size, data.total_count);

  // Handle empty data - render after hooks are called
  if (rows.length === 0) {
    return (
      <div className="border border-[var(--border)] rounded-sm p-8">
        <AnalyticsEmptyState variant="no-assessments" compact />
      </div>
    );
  }

  return (
    <div className="space-y-4" role="region" aria-label="Assessment data table">
      {/* Search Input */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
          <Input
            placeholder="Search barangays..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 rounded-sm"
            aria-label="Search barangays"
          />
        </div>
        <div className="text-sm text-[var(--muted-foreground)]">
          Showing {startRow}-{endRow} of {data.total_count} results
        </div>
      </div>

      {/* Table */}
      <div className="rounded-sm border border-[var(--border)] overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? "flex items-center gap-2 cursor-pointer select-none hover:text-foreground"
                            : ""
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className="ml-auto">
                            {header.column.getIsSorted() === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronsUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--muted-foreground)]">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2" role="navigation" aria-label="Table pagination">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-sm"
            aria-label="Previous page"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-sm"
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
