# E2E Test Fixtures

This directory contains reusable test fixtures for Epic 5.0 and Epic 6.0 E2E workflow testing.

## Overview

The fixtures provide:

- **Authentication helpers**: Login/logout functions for BLGU and Assessor users
- **Test data**: Sample form values, workflow statuses, and rework comments
- **Helper functions**: Common operations like navigation, form filling, and submission

## Files

### `auth.ts`

Authentication utilities for E2E tests.

**Exports:**

- `TEST_USERS`: Test user credentials for BLGU and ASSESSOR roles
- `loginAsBLGU(page)`: Login as BLGU user and navigate to dashboard
- `loginAsAssessor(page)`: Login as Assessor user and navigate to assessor page
- `logout(page)`: Logout current user

**Example:**

```typescript
import { loginAsBLGU } from "./fixtures";

test("BLGU can access dashboard", async ({ page }) => {
  await loginAsBLGU(page);
  await expect(page).toHaveURL(/\/blgu\/dashboard/);
});
```

### `assessment-data.ts`

Test data constants for assessment workflows.

**Exports:**

- `FORM_FIELD_VALUES`: Sample values for all field types (text, number, textarea, radio, checkbox,
  date)
- `MOV_TEST_FILES`: Test file paths for MOV uploads (PDF, JPG, PNG)
- `REWORK_COMMENTS`: Sample assessor rework comments
- `WORKFLOW_STATUSES`: Assessment status constants (DRAFT, SUBMITTED, IN_REVIEW, REWORK, COMPLETED)
- `TEST_ASSESSMENT_ID`: Hardcoded assessment ID for testing (currently 68)
- `generateFormDataForIndicator(indicatorId)`: Generate complete form data for an indicator

**Example:**

```typescript
import { FORM_FIELD_VALUES, WORKFLOW_STATUSES } from "./fixtures";

// Fill text field
await page.fill('input[type="text"]', FORM_FIELD_VALUES.TEXT.projectName);

// Verify status
await expect(page).toContainText(WORKFLOW_STATUSES.SUBMITTED);
```

### `helpers.ts`

Helper functions for common E2E test operations.

**Navigation Helpers:**

- `navigateToBLGUDashboard(page)`: Navigate to BLGU dashboard and verify load
- `navigateToIndicatorForm(page, assessmentId, indicatorId)`: Navigate to specific indicator form
- `navigateToAssessorReviewPage(page, assessmentId)`: Navigate to assessor review page
- `clickFirstIndicator(page)`: Click first indicator card from dashboard

**Form Interaction Helpers:**

- `fillTextField(page, selector, value)`: Fill text input field
- `fillNumberField(page, selector, value)`: Fill number input field
- `fillTextArea(page, selector, value)`: Fill textarea field
- `selectRadioOption(page, selector)`: Select radio button
- `selectCheckboxOptions(page, selectors)`: Select multiple checkboxes
- `selectDate(page, selector, dateValue)`: Select date using date picker
- `uploadFile(page, fileInputSelector, filePath)`: Upload file to file input
- `saveForm(page)`: Click save button and wait for success

**Workflow Helpers:**

- `submitAssessment(page)`: Submit assessment from dashboard
- `resubmitAssessment(page)`: Resubmit assessment after rework
- `requestRework(page, comment)`: Assessor requests rework with comment

**Verification Helpers:**

- `verifyAssessmentStatus(page, expectedStatus)`: Verify assessment status on dashboard
- `verifyLockedStateBanner(page)`: Verify locked state banner is visible
- `verifyFormIsReadOnly(page)`: Verify form is in read-only mode (save button hidden)
- `verifyReworkCommentsVisible(page)`: Verify rework comments panel is visible
- `verifyReworkLimitReached(page)`: Verify rework limit reached message
- `verifyCompletionPercentage(page, expectedPercentage)`: Verify completion percentage

**Utility Helpers:**

- `waitForAPIRequest(page, urlPattern)`: Wait for specific API request to complete

**Example:**

```typescript
import { navigateToBLGUDashboard, fillTextField, saveForm } from "./fixtures";

test("Fill and save form", async ({ page }) => {
  await navigateToBLGUDashboard(page);
  await clickFirstIndicator(page);
  await fillTextField(page, 'input[type="text"]', "Test Project");
  await saveForm(page);
});
```

### `index.ts`

Central export file for all fixtures.

**Usage:**

```typescript
// Import everything from fixtures
import * from './fixtures';

// Or import specific items
import { loginAsBLGU, FORM_FIELD_VALUES, saveForm } from './fixtures';
```

## Test User Setup

Before running E2E tests, ensure these test users exist in your database:

### BLGU Test User

- **Email**: `blgu.test@example.com`
- **Password**: `TestPassword123!`
- **Role**: `BLGU_USER`
- **Barangay ID**: Must be assigned to a barangay
- **Assessment ID**: Should have assessment ID 68 (or update `TEST_ASSESSMENT_ID` in fixtures)

### Assessor Test User

- **Email**: `assessor.test@example.com`
- **Password**: `TestPassword123!`
- **Role**: `ASSESSOR`

You can create these users manually or via database seeding scripts.

## File Upload Testing

The `MOV_TEST_FILES` constants reference test files that should be placed in:

```
apps/web/tests/e2e/fixtures/files/
  ├── test-document.pdf
  ├── test-image.jpg
  └── test-screenshot.png
```

Create sample files in this directory for file upload testing.

## Customization

### Update Test Assessment ID

If you're using a different assessment ID for testing, update the constant:

```typescript
// In assessment-data.ts
export const TEST_ASSESSMENT_ID = 123; // Your assessment ID
```

### Add New Test Data

To add new form field values:

```typescript
// In assessment-data.ts
export const FORM_FIELD_VALUES = {
  TEXT: {
    projectName: "Your Test Project",
    // Add more...
  },
  // Add more field types...
};
```

### Add New Helper Functions

To add new helper functions:

```typescript
// In helpers.ts
export async function yourNewHelper(page: Page, param: string) {
  // Implementation
}
```

Then export from `index.ts`:

```typescript
// In index.ts
export * from "./helpers";
```

## Best Practices

1. **Use helpers for repetitive operations**: Don't duplicate code - create helpers
2. **Use constants for test data**: Avoid hardcoding strings in tests
3. **Add meaningful waits**: Use explicit waits (`waitForURL`, `waitForSelector`) instead of
   arbitrary timeouts
4. **Verify state changes**: Always verify that actions had the expected effect
5. **Keep tests independent**: Each test should be able to run standalone
6. **Use descriptive console logs**: Help debug test failures with clear logging

## Related Documentation

- [Epic 5 PRD](../../../../../tasks/tasks-prd-blgu-table-assessment-workflow/epic-5-submission-rework-workflow.md)
- [Epic 6 PRD](../../../../../tasks/tasks-prd-blgu-table-assessment-workflow/epic-6-testing-integration.md)
- [E2E Tests README](../README.md)
- [Playwright Documentation](https://playwright.dev)
