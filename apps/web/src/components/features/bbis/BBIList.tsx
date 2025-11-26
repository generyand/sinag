"use client";

import { useState } from "react";
import type { BBIWithGovernanceArea } from "@sinag/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Plus, Edit, Settings, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeleteBBIMutation } from "@/hooks/useBBIs";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface BBIListProps {
  bbis: BBIWithGovernanceArea[];
  onCreateNew?: () => void;
  isLoading?: boolean;
}

export default function BBIList({
  bbis,
  onCreateNew,
  isLoading = false
}: BBIListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const deleteBBIMutation = useDeleteBBIMutation();

  // Get unique governance areas for filter
  const governanceAreas = Array.from(
    new Map(
      bbis
        .filter(b => b.governance_area)
        .map(b => [b.governance_area.id, b.governance_area])
    ).values()
  );

  // Filter BBIs
  const filteredBBIs = bbis.filter((bbi) => {
    const matchesSearch =
      bbi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bbi.abbreviation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArea = filterArea === "all" ||
                       bbi.governance_area_id.toString() === filterArea;
    const matchesStatus = filterStatus === "all" ||
                         (filterStatus === "active" ? bbi.is_active : !bbi.is_active);

    return matchesSearch && matchesArea && matchesStatus;
  });

  const handleBBIClick = (bbiId: number) => {
    router.push(`/mlgoo/bbis/${bbiId}/edit`);
  };

  const handleDeactivateBBI = async (bbiId: number, bbiName: string) => {
    if (!confirm(`Are you sure you want to deactivate "${bbiName}"? This will hide it from active calculations.`)) {
      return;
    }

    try {
      await deleteBBIMutation.mutateAsync({ bbiId });
      toast.success(`BBI "${bbiName}" has been deactivated`);
      queryClient.invalidateQueries({ queryKey: ['bbis'] });
    } catch (error) {
      toast.error(`Failed to deactivate BBI: ${error}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6 animate-pulse"
          >
            <div className="h-6 bg-[var(--muted)] rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-[var(--muted)] rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Filters Section with Card */}
      <div className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
          <div className="flex-1 space-y-4">
            {/* Search */}
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">
                Search BBIs
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input
                  type="text"
                  placeholder="Search by name or abbreviation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Governance Area Filter */}
              <div className="flex-1">
                <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">
                  Governance Area
                </label>
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Areas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {governanceAreas.map((area) => (
                      <SelectItem key={area.id} value={area.id.toString()}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="flex-1">
                <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">
                  Status
                </label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Create New Button */}
          {onCreateNew && (
            <div className="lg:mb-0">
              <Button
                onClick={onCreateNew}
                className="w-full sm:w-auto h-11 px-6 font-semibold hover:shadow-lg transition-all duration-200"
                style={{
                  background: 'linear-gradient(to bottom right, var(--cityscape-yellow), var(--cityscape-yellow-dark))',
                  color: 'var(--foreground)',
                }}
              >
                <Plus className="h-5 w-5 mr-2" />
                New BBI
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-[var(--muted-foreground)]">
        Showing <span className="font-semibold text-[var(--foreground)]">{filteredBBIs.length}</span> of{" "}
        <span className="font-semibold text-[var(--foreground)]">{bbis.length}</span> BBIs
      </div>

      {/* BBI Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--muted)]/50 border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                  Abbreviation
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                  Governance Area
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                  Mapping Rules
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredBBIs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-[var(--muted-foreground)]">
                      {searchQuery || filterArea !== "all" || filterStatus !== "all"
                        ? "No BBIs match your filters"
                        : "No BBIs created yet"}
                    </div>
                    {onCreateNew && (
                      <Button
                        onClick={onCreateNew}
                        variant="outline"
                        className="mt-4"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create your first BBI
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredBBIs.map((bbi) => (
                  <tr
                    key={bbi.id}
                    className="hover:bg-[var(--muted)]/30 transition-colors cursor-pointer"
                    onClick={() => handleBBIClick(bbi.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--foreground)]">
                        {bbi.name}
                      </div>
                      {bbi.description && (
                        <div className="text-sm text-[var(--muted-foreground)] mt-1 line-clamp-1">
                          {bbi.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="font-mono">
                        {bbi.abbreviation}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--foreground)]">
                        {bbi.governance_area.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {bbi.is_active ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-500/20">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-red-500/10 text-red-700 border-red-500/20">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {bbi.mapping_rules ? (
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-[var(--cityscape-yellow)]" />
                          <span className="text-sm text-[var(--muted-foreground)]">
                            Configured
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--muted-foreground)]">
                          Not configured
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBBIClick(bbi.id)}
                          className="hover:bg-[var(--muted)]"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {bbi.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivateBBI(bbi.id, bbi.name)}
                            className="hover:bg-red-500/10 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
