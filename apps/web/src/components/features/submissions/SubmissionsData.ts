import { SubmissionsData, BarangaySubmission } from "@/types/submissions";

// Real barangay names from the system
const barangayNames = [
  "Balasinon",
  "Buguis",
  "Carre",
  "Clib",
  "Harada Butai",
  "Katipunan",
  "Kiblagon",
  "Labon",
  "Laperas",
  "Lapla",
  "Litos",
  "Luparan",
  "Mckinley",
  "New Cebu",
  "Osmeña",
  "Palili",
  "Parame",
  "Poblacion",
  "Roxas",
  "Solongvale",
  "Tagolilong",
  "Tala-o",
  "Talas",
  "Tanwalang",
  "Waterfall",
];

// Generate mock submissions data
export function generateSubmissionsData(governanceArea: string): SubmissionsData {
  const submissions: BarangaySubmission[] = barangayNames.map((name, index) => {
    // Create varied statuses for demonstration
    const statusOptions: BarangaySubmission["areaStatus"][] = [
      "awaiting_review",
      "in_progress",
      "needs_rework",
      "validated",
    ];
    const areaStatus = statusOptions[index % statusOptions.length];

    // Create varied overall statuses
    const overallOptions: BarangaySubmission["overallStatus"][] = [
      "draft",
      "submitted",
      "under_review",
      "needs_rework",
      "validated",
      "completed",
    ];
    const overallStatus = overallOptions[index % overallOptions.length];

    // Generate random progress (0-100)
    const areaProgress = Math.floor(Math.random() * 100) + 1;

    // Generate random last updated date (within last 30 days)
    const daysAgo = Math.floor(Math.random() * 30);
    const lastUpdated = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    return {
      id: `submission-${index + 1}`,
      barangayName: name,
      areaProgress,
      areaStatus,
      overallStatus,
      lastUpdated,
      assignedTo: "Melan", // Current assessor
    };
  });

  // Calculate KPIs based on submissions
  const kpi = {
    awaitingReview: submissions.filter((s) => s.areaStatus === "awaiting_review").length,
    inRework: submissions.filter((s) => s.areaStatus === "needs_rework").length,
    validated: submissions.filter((s) => s.areaStatus === "validated").length,
    avgReviewTime: 2.1, // Mock average review time in days
  };

  return {
    kpi,
    submissions,
    governanceArea,
  };
}

// Default data for Environmental Management
export const mockSubmissionsData: SubmissionsData = generateSubmissionsData(
  "Environmental Management"
);
