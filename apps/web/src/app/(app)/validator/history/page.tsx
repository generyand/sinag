"use client";

import { ReviewHistoryFilters, ReviewHistoryTable } from "@/components/features/review-history";
import { useReviewHistory, ReviewHistoryFilters as FilterType } from "@/hooks/useReviewHistory";
import { useValidatorGovernanceArea } from "@/hooks/useValidatorGovernanceArea";
import { getGovernanceAreaLogo } from "@/lib/governance-area-logos";
import { useState, useMemo } from "react";
import { History } from "lucide-react";
import Image from "next/image";

export default function ValidatorHistoryPage() {
  const {
    governanceAreaName,
    governanceAreaCode,
    isLoading: governanceAreaLoading,
  } = useValidatorGovernanceArea();
  const logoPath = governanceAreaCode ? getGovernanceAreaLogo(governanceAreaCode) : null;
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterType>({
    search: "",
    dateFrom: null,
    dateTo: null,
    outcome: null,
  });

  const { data, isLoading, error } = useReviewHistory({
    page,
    pageSize: 20,
    filters,
  });

  // Filter items by search (client-side for current page)
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (!filters.search) return data.items;

    const searchLower = filters.search.toLowerCase();
    return data.items.filter(
      (item) =>
        item.barangay_name.toLowerCase().includes(searchLower) ||
        (item.municipality_name?.toLowerCase().includes(searchLower) ?? false)
    );
  }, [data?.items, filters.search]);

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  // Loading state
  if (governanceAreaLoading || (isLoading && !data)) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-[var(--muted)] rounded-sm w-1/3 mb-2"></div>
            <div className="h-6 bg-[var(--muted)] rounded-sm w-1/2"></div>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-[var(--muted)] rounded-sm animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <div className="space-y-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Error Loading Validation History
            </h2>
            <p className="text-[var(--text-secondary)]">
              Failed to load your validation history. Please try again later.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[var(--background)]"
      role="main"
      aria-label="Validation History"
    >
      <div className="space-y-6">
        {/* Header */}
        <section className="bg-gradient-to-r from-[var(--card)] to-[var(--card)] border border-[var(--border)] rounded-sm p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Governance Area Logo */}
            {logoPath ? (
              <div className="flex-shrink-0">
                <Image
                  src={logoPath}
                  alt={governanceAreaName || "Governance Area"}
                  width={56}
                  height={56}
                  className="rounded-sm"
                />
              </div>
            ) : (
              <div className="p-2 bg-[var(--cityscape-yellow)] rounded-sm flex-shrink-0">
                <History className="h-5 w-5 text-[var(--cityscape-accent-foreground)]" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                Validation History
              </h1>
              <p className="text-[var(--text-secondary)]">
                {governanceAreaName ? (
                  <>
                    Completed validations for{" "}
                    <span className="font-medium">{governanceAreaName}</span>
                  </>
                ) : (
                  "View your completed assessment validations"
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6 shadow-sm">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Filter & Search</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Find specific completed validations
            </p>
          </header>
          <ReviewHistoryFilters filters={filters} onFiltersChange={setFilters} />
        </section>

        {/* Table */}
        <section className="shadow-sm">
          <header className="bg-[var(--card)] border border-b-0 border-[var(--border)] rounded-t-sm px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  Completed Validations
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {data?.total ?? 0} total validation{(data?.total ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </header>
          <ReviewHistoryTable
            items={filteredItems}
            currentPage={page}
            totalPages={totalPages}
            hasMore={data?.has_more ?? false}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        </section>
      </div>
    </main>
  );
}
