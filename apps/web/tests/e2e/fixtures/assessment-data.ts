// 📊 Assessment Test Data Fixtures
// Epic 6 Story 6.1 - E2E Workflow Testing

/**
 * Sample form field values for different field types
 *
 * These values can be used to fill dynamic forms during E2E tests.
 */
export const FORM_FIELD_VALUES = {
  TEXT: {
    projectName: "Barangay Infrastructure Improvement Project",
    description:
      "Road rehabilitation and drainage system improvement for the entire barangay area.",
    location: "Barangay Centro, San Juan",
  },
  NUMBER: {
    budget: "500000",
    population: "3500",
    households: "850",
  },
  TEXT_AREA: {
    longDescription: `This is a comprehensive project aimed at improving the infrastructure
    of the barangay. It includes road rehabilitation, drainage system improvements,
    and the installation of street lighting to enhance safety and accessibility for all residents.`,
  },
  RADIO: {
    // Select first option (index 0) or specific value
    selection: "Yes",
  },
  CHECKBOX: {
    // Array of checkbox values to select
    selections: ["Option A", "Option C"],
  },
  DATE: {
    projectStart: "2025-01-15",
    projectEnd: "2025-12-31",
  },
} as const;

/**
 * Sample MOV (Means of Verification) files for testing file uploads
 *
 * Note: These file paths are relative to the test execution directory.
 * You may need to create actual test files or use base64-encoded data.
 */
export const MOV_TEST_FILES = {
  PDF: {
    name: "test-document.pdf",
    path: "./tests/e2e/fixtures/files/test-document.pdf",
    mimeType: "application/pdf",
  },
  IMAGE_JPG: {
    name: "test-image.jpg",
    path: "./tests/e2e/fixtures/files/test-image.jpg",
    mimeType: "image/jpeg",
  },
  IMAGE_PNG: {
    name: "test-screenshot.png",
    path: "./tests/e2e/fixtures/files/test-screenshot.png",
    mimeType: "image/png",
  },
} as const;

/**
 * Assessor rework comments for testing rework workflow
 */
export const REWORK_COMMENTS = {
  GENERAL:
    "Please review and update the assessment data to ensure all required information is complete and accurate.",
  SPECIFIC_BUDGET:
    "The budget allocation appears incomplete. Please provide detailed breakdown and supporting documentation.",
  SPECIFIC_MOV:
    "The uploaded Means of Verification document is unclear. Please provide a higher quality scan or photo.",
  SPECIFIC_DESCRIPTION:
    "Project description needs more detail. Please include timeline, beneficiaries, and expected outcomes.",
} as const;

/**
 * Expected workflow status transitions for testing
 */
export const WORKFLOW_STATUSES = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  IN_REVIEW: "IN_REVIEW",
  REWORK: "REWORK",
  NEEDS_REWORK: "NEEDS_REWORK", // Legacy status
  COMPLETED: "COMPLETED",
} as const;

/**
 * Test assessment ID
 *
 * Note: This should be updated based on your test database setup.
 * You may need to create a fresh assessment for each test run.
 */
export const TEST_ASSESSMENT_ID = 68;

/**
 * Helper function to generate form data for a specific indicator
 */
export function generateFormDataForIndicator(
  indicatorId: number
): Record<string, string | string[]> {
  return {
    [`field_${indicatorId}_text`]: FORM_FIELD_VALUES.TEXT.projectName,
    [`field_${indicatorId}_number`]: FORM_FIELD_VALUES.NUMBER.budget,
    [`field_${indicatorId}_textarea`]: FORM_FIELD_VALUES.TEXT_AREA.longDescription,
    [`field_${indicatorId}_radio`]: FORM_FIELD_VALUES.RADIO.selection,
    [`field_${indicatorId}_checkbox`]: [...FORM_FIELD_VALUES.CHECKBOX.selections],
    [`field_${indicatorId}_date`]: FORM_FIELD_VALUES.DATE.projectStart,
  };
}
