import { AssessorData } from "./AssessorAnalyticsTypes";

// Function to generate mock data based on governance area
export function generateAssessorData(governanceAreaName: string): AssessorData {
  // Define area-specific indicators based on governance area
  const areaIndicators = {
    "Environmental Management": [
      "6.1.1: Organized BESWMC",
      "6.2.1: Presence of a Materials Recovery Facility",
      "6.3.1: Implementation of Solid Waste Management",
      "6.4.1: Tree Planting and Greening Programs",
      "6.5.1: Environmental Protection Initiatives",
    ],
    "Disaster Preparedness": [
      "5.1.1: Organized BDRRMC",
      "5.2.1: Early Warning System",
      "5.3.1: Disaster Risk Reduction Programs",
      "5.4.1: Emergency Response Plan",
      "5.5.1: Community Preparedness Training",
    ],
    "Safety, Peace and Order": [
      "4.1.1: Organized BPOC",
      "4.2.1: Crime Prevention Programs",
      "4.3.1: Community Policing",
      "4.4.1: Peace and Order Initiatives",
      "4.5.1: Public Safety Measures",
    ],
    "Social Protection and Sensitivity": [
      "3.1.1: Social Welfare Programs",
      "3.2.1: Health Services",
      "3.3.1: Education Support",
      "3.4.1: Senior Citizen Programs",
      "3.5.1: PWD Support Services",
    ],
    "Business-Friendliness and Competitiveness": [
      "2.1.1: Business Registration Process",
      "2.2.1: Investment Promotion",
      "2.3.1: Local Economic Development",
      "2.4.1: Market Development",
      "2.5.1: Business Support Services",
    ],
    "Financial Administration": [
      "1.1.1: Financial Management System",
      "1.2.1: Budget Planning",
      "1.3.1: Revenue Generation",
      "1.4.1: Financial Reporting",
      "1.5.1: Asset Management",
    ],
  };

  const indicators =
    areaIndicators[governanceAreaName as keyof typeof areaIndicators] ||
    areaIndicators["Environmental Management"];

  return {
    name: governanceAreaName,
    assignedBarangays: 25,
    assessmentPeriod: "SGLGB 2024",
    performance: {
      totalAssessed: 25,
      passed: 15,
      failed: 10,
      passRate: 60,
    },
    systemicWeaknesses: indicators.map((indicator, index) => ({
      indicator,
      failedCount: Math.max(5, 18 - index * 2), // Decreasing failure counts
      barangays: Array.from(
        { length: Math.max(5, 18 - index * 2) },
        (_, i) => `Barangay ${String.fromCharCode(65 + i)}`
      ),
    })),
    workflowMetrics: {
      avgTimeToFirstReview: 1.8,
      avgReworkCycleTime: 4.2,
      totalReviewed: 25,
      reworkRate: 60,
    },
  };
}

// Default mock data for the MENRO (Environmental Management) assessor
export const mockAssessorData: AssessorData = generateAssessorData("Environmental Management");
