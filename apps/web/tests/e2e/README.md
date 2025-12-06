# E2E Tests for SINAG Platform

This directory contains Playwright E2E tests for the SINAG governance assessment platform.

## Overview

The E2E tests cover multiple epics and user workflows:

### Epic 3: Dynamic Form Rendering Engine
- **Form Workflow Tests** ([blgu-form-workflow.spec.ts](blgu-form-workflow.spec.ts)): Complete form filling, saving, and data persistence
- **Completion Feedback Tests** ([completion-feedback.spec.ts](completion-feedback.spec.ts)): Real-time completion tracking as users fill forms
- **MOV File Upload Tests** ([mov-file-upload.spec.ts](mov-file-upload.spec.ts)): File upload functionality

### Epic 5: Submission & Rework Workflow
- **Submission Workflow Tests** ([epic5-submission-workflow.spec.ts](epic5-submission-workflow.spec.ts)): Complete BLGU submission and assessor rework workflow
  - BLGU assessment submission with locked state
  - Assessor review and rework request
  - BLGU rework with comments visibility
  - Resubmission and rework limit enforcement

### Test Fixtures
- **Fixtures Directory** ([fixtures/](fixtures/)): Reusable authentication, test data, and helper functions
  - See [fixtures/README.md](fixtures/README.md) for detailed documentation

## Running the Tests

### Prerequisites

1. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

2. Ensure the development server is running or will be started automatically by Playwright

### Test Commands

You can run tests from either the **project root** or the **apps/web** directory:

**From project root (recommended for CI/monorepo workflows):**
```bash
# Run all E2E tests (headless mode)
pnpm exec playwright test

# Run with Playwright UI (recommended for debugging)
pnpm exec playwright test --ui

# Run in headed mode (see browser)
pnpm exec playwright test --headed

# Run specific test file
pnpm exec playwright test authentication.spec.ts

# Run only Chromium (faster)
pnpm exec playwright test --project=chromium
```

**From apps/web directory (uses pnpm scripts):**
```bash
cd apps/web

# Run all E2E tests (headless mode)
pnpm test:e2e

# Run with Playwright UI (recommended for debugging)
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Debug mode (step through tests)
pnpm test:e2e:debug
```

## Test Files

### `blgu-form-workflow.spec.ts`

Tests the complete BLGU user workflow:

1. **Complete Form Workflow Test**
   - User logs in
   - Navigates to dashboard
   - Clicks on indicator to open form
   - Fills in various field types (text, number, radio, select)
   - Saves form data
   - Navigates back to dashboard
   - Returns to form
   - Verifies saved data persists

2. **Form Validation Test**
   - Attempts to save without required fields
   - Verifies validation errors display

3. **Field Type Rendering Test**
   - Verifies schema-driven field types render correctly

### `completion-feedback.spec.ts`

Tests real-time completion feedback:

1. **Real-time Updates Test**
   - Tracks completion status as fields are filled incrementally
   - Verifies completion feedback updates (e.g., "1/5", "2/5", "5/5")

2. **Success Message Test**
   - Fills complete form
   - Verifies success message displays on completion

3. **Percentage Tracking Test**
   - Monitors completion percentage/fraction updates

### `epic5-submission-workflow.spec.ts`

Tests the complete Epic 5.0 submission and rework workflow:

1. **BLGU Dashboard Test**
   - BLGU user logs in and views assessment dashboard
   - Verifies assessment appears with DRAFT status

2. **Form Filling Test**
   - BLGU fills dynamic form fields (text, number, textarea, radio)
   - Saves form data
   - Verifies save success

3. **Assessment Submission Test**
   - BLGU submits completed assessment
   - Verifies status changes to SUBMITTED
   - Verifies submit button behavior

4. **Locked State Test**
   - BLGU sees locked state banner after submission
   - Navigates to form and verifies it's read-only (save button hidden)

5. **Assessor Review Test**
   - Assessor logs in and views submitted assessments list
   - Verifies assessor can access submitted assessment

6. **Request Rework Test**
   - Assessor requests rework with comments
   - Verifies rework request is submitted
   - Verifies status changes to REWORK

7. **Rework Comments Test**
   - BLGU logs in and sees rework comments panel
   - Verifies comments are visible
   - Verifies form is unlocked for editing (save button visible)

8. **Resubmission Test**
   - BLGU resubmits assessment after making edits
   - Verifies status changes back to SUBMITTED
   - Verifies rework_count remains 1

9. **Rework Limit Test**
   - Assessor attempts to request second rework
   - Verifies rework limit message is displayed
   - Verifies Request Rework button is disabled

10. **Full Workflow Integration Test** (skipped)
    - Complete end-to-end workflow test
    - Requires database seeding setup

## Test Data

### Epic 3 Tests
The Epic 3 tests use test user credentials:
- **Email**: `blgu.test@example.com`
- **Password**: `TestPassword123!`

### Epic 5 Tests
The Epic 5 tests use fixtures from the `fixtures/` directory. Test users required:

**BLGU User:**
- **Email**: `blgu.test@example.com`
- **Password**: `TestPassword123!`
- **Role**: `BLGU_USER`

**Assessor User:**
- **Email**: `assessor.test@example.com`
- **Password**: `TestPassword123!`
- **Role**: `ASSESSOR`

**Note**: Create these users in your test database before running Epic 5 tests. See [fixtures/README.md](fixtures/README.md) for detailed fixture documentation.

## Configuration

E2E test configuration is in the **root** `playwright.config.ts` (not in `apps/web/`):
- **Test Directory**: `./apps/web/tests/e2e` - All E2E tests are here
- **Base URL**: `http://localhost:3000` (configurable via `NEXT_PUBLIC_APP_URL`)
- **Auto-start**: Playwright automatically starts Next.js dev server before running tests
- **Browsers**:
  - **CI**: Chromium only (faster)
  - **Local**: Chromium, Firefox, and WebKit (run `--project=chromium` for faster local runs)
- **Retries**: 0 locally, 2 in CI
- **Screenshots**: Only on failure
- **Trace**: On first retry

The configuration has been consolidated to the root level for the entire monorepo. There is no separate `apps/web/playwright.config.ts`.

## Selectors and Data Attributes

The tests use a combination of:
- **Test IDs**: `data-testid` attributes for reliable element selection
- **Role-based selectors**: `role="combobox"`, `role="alert"`, etc.
- **Text matching**: For buttons and labels

## Adding New E2E Tests

1. Create a new `.spec.ts` file in `tests/e2e/`
2. Import Playwright test utilities:
   ```typescript
   import { test, expect } from '@playwright/test';
   ```
3. Use descriptive test names and group related tests with `test.describe()`
4. Add authentication in `beforeEach` if needed
5. Use waitFor patterns for async operations
6. Add meaningful console.log statements for test progress tracking

## Best Practices

- ✅ Use `data-testid` attributes for critical elements
- ✅ Wait for navigation and state changes explicitly
- ✅ Use fallback selectors when elements might not be present
- ✅ Add timeout configurations for slow operations
- ✅ Verify data persistence after reload
- ✅ Test both happy path and error scenarios
- ✅ Keep tests independent and idempotent

## Troubleshooting

### Tests failing due to missing elements

- Check if the application is running on the correct port
- Verify test user credentials are correct
- Use `test:e2e:headed` to see what's happening
- Add more explicit waits for async operations

### Timeout errors

- Increase timeout in `page.waitFor*` calls
- Ensure the dev server is running
- Check network conditions

### Authentication issues

- Verify test user exists in the database
- Check authentication flow matches current implementation
- Update login selectors if UI changed

## Related Documentation

- [Epic 3 PRD](../../../../tasks/tasks-prd-blgu-table-assessment-workflow/epic-3-dynamic-form-rendering-engine.md)
- [Epic 5 PRD](../../../../tasks/tasks-prd-blgu-table-assessment-workflow/epic-5-submission-rework-workflow.md)
- [Epic 6 PRD](../../../../tasks/tasks-prd-blgu-table-assessment-workflow/epic-6-testing-integration.md)
- [Test Fixtures Documentation](fixtures/README.md)
- [Playwright Documentation](https://playwright.dev)
- [Next.js Testing Documentation](https://nextjs.org/docs/testing)
