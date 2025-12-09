import { useState, useMemo } from "react";
import { BarangaySubmission, SubmissionsFilter } from "@/types/submissions";

// Mock data for development - replace with actual API calls
const mockSubmissions: BarangaySubmission[] = [
  {
    id: "1",
    barangayName: "Balasinon",
    areaProgress: 85,
    areaStatus: "awaiting_review",
    overallStatus: "submitted",
    lastUpdated: "2024-01-15T10:30:00Z",
    assignedTo: "Juan Dela Cruz",
  },
  {
    id: "2",
    barangayName: "Buguis",
    areaProgress: 45,
    areaStatus: "in_progress",
    overallStatus: "under_review",
    lastUpdated: "2024-01-14T15:45:00Z",
    assignedTo: "Pedro Reyes",
  },
  {
    id: "3",
    barangayName: "Carre",
    areaProgress: 100,
    areaStatus: "validated",
    overallStatus: "completed",
    lastUpdated: "2024-01-13T09:15:00Z",
    assignedTo: "Juan Dela Cruz",
  },
  {
    id: "4",
    barangayName: "Clib",
    areaProgress: 0,
    areaStatus: "awaiting_review",
    overallStatus: "draft",
    lastUpdated: "2024-01-12T14:20:00Z",
  },
  {
    id: "5",
    barangayName: "Harada Butai",
    areaProgress: 70,
    areaStatus: "needs_rework",
    overallStatus: "needs_rework",
    lastUpdated: "2024-01-11T11:30:00Z",
    assignedTo: "Maria Santos",
  },
  {
    id: "6",
    barangayName: "Katipunan",
    areaProgress: 95,
    areaStatus: "validated",
    overallStatus: "validated",
    lastUpdated: "2024-01-10T16:45:00Z",
    assignedTo: "Pedro Reyes",
  },
];

export function useSubmissions() {
  const [filters, setFilters] = useState<SubmissionsFilter>({
    search: "",
    status: [],
  });

  const [loading] = useState(false);

  const filteredSubmissions = useMemo(() => {
    let filtered = [...mockSubmissions];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (submission) =>
          submission.barangayName.toLowerCase().includes(searchLower) ||
          (submission.assignedTo && submission.assignedTo.toLowerCase().includes(searchLower))
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter((submission) => filters.status.includes(submission.areaStatus));
    }

    return filtered;
  }, [filters]);

  const updateFilters = (newFilters: Partial<SubmissionsFilter>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: [],
    });
  };

  return {
    submissions: filteredSubmissions,
    filters,
    updateFilters,
    resetFilters,
    loading,
  };
}
