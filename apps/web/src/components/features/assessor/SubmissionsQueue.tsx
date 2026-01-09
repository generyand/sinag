"use client";

import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAssessorQueue } from "@/hooks/useAssessor";
import Link from "next/link";
import * as React from "react";

type QueueItem = {
  assessment_id: number;
  barangay_name: string;
  submission_date: string | null;
  status: string;
  updated_at: string;
};

interface SubmissionsQueueProps {
  items?: QueueItem[];
}

const STATUS_TABS = [
  { key: "Submitted for Review", label: "Submitted for Review" },
  { key: "Needs Rework", label: "Needs Rework" },
  { key: "Validated", label: "Validated" },
];

export function SubmissionsQueue({ items = [] }: SubmissionsQueueProps) {
  const { data, isLoading, error } = useAssessorQueue();
  // Use hook data if available, otherwise fallback to items prop (for backward compatibility)
  const serverItems = (data as QueueItem[] | undefined) ?? items;
  const [active, setActive] = React.useState<string>(STATUS_TABS[0].key);

  const filtered = React.useMemo(
    () => serverItems.filter((i) => i.status === active),
    [serverItems, active]
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-[var(--muted)] rounded-sm mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[var(--muted)] rounded-sm"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6">
        <p className="text-[var(--text-secondary)]">
          Failed to load submissions queue. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <Tabs value={active} onValueChange={setActive} className="w-full">
      <TabsList>
        {STATUS_TABS.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {STATUS_TABS.map((tab) => {
        const tabFiltered = tab.key === active ? filtered : [];
        return (
          <TabsContent key={tab.key} value={tab.key} className="mt-4">
            {tabFiltered.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barangay</TableHead>
                    <TableHead>Submission Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabFiltered.map((row) => (
                    <TableRow key={row.assessment_id}>
                      <TableCell>Brgy. {row.barangay_name}</TableCell>
                      <TableCell>
                        {row.submission_date ? new Date(row.submission_date).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm">
                          <Link href={`/assessor/submissions/${row.assessment_id}/validation`}>
                            Review
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 px-6 bg-[var(--card)] border border-[var(--border)] rounded-sm">
                <p className="text-[var(--text-secondary)]">
                  No submissions found for "{tab.label}"
                </p>
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
