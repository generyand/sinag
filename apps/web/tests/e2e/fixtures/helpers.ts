// 🛠️ E2E Test Helper Functions
// Epic 6 Story 6.1 - E2E Workflow Testing

import { Page, expect } from "@playwright/test";

/**
 * Navigate to BLGU dashboard
 */
export async function navigateToBLGUDashboard(page: Page) {
  await page.goto("/blgu/dashboard");
  await expect(page).toHaveURL(/\/blgu\/dashboard/);
  await expect(page.locator("h1")).toContainText(/dashboard/i, { timeout: 10000 });
}

/**
 * Navigate to a specific indicator form
 */
export async function navigateToIndicatorForm(
  page: Page,
  assessmentId: number,
  indicatorId: number
) {
  const url = `/blgu/assessment/${assessmentId}/indicator/${indicatorId}`;
  await page.goto(url);
  await page.waitForURL(`**${url}`, { timeout: 10000 });

  // Wait for form to load
  await expect(page.locator("form")).toBeVisible({ timeout: 10000 });
}

/**
 * Click on an indicator from the dashboard
 */
export async function clickFirstIndicator(page: Page): Promise<string> {
  // Wait for indicator cards to be visible
  const indicatorCard = page
    .locator('[data-testid="indicator-card"], a[href*="/indicator/"]')
    .first();
  await expect(indicatorCard).toBeVisible({ timeout: 10000 });

  // Get the href to extract indicator ID
  const href = (await indicatorCard.getAttribute("href")) || "";

  await indicatorCard.click();

  // Wait for navigation
  await page.waitForURL("**/indicator/**", { timeout: 10000 });

  return href;
}

/**
 * Fill a text input field
 */
export async function fillTextField(page: Page, selector: string, value: string) {
  const input = page.locator(selector);
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.fill(value);
}

/**
 * Fill a number input field
 */
export async function fillNumberField(page: Page, selector: string, value: string) {
  const input = page.locator(selector);
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.fill(value);
}

/**
 * Fill a textarea field
 */
export async function fillTextArea(page: Page, selector: string, value: string) {
  const textarea = page.locator(selector);
  await expect(textarea).toBeVisible({ timeout: 5000 });
  await textarea.fill(value);
}

/**
 * Select a radio button option
 */
export async function selectRadioOption(page: Page, selector: string) {
  const radio = page.locator(selector);
  await expect(radio).toBeVisible({ timeout: 5000 });
  await radio.click();
}

/**
 * Select checkbox options
 */
export async function selectCheckboxOptions(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const checkbox = page.locator(selector);
    await expect(checkbox).toBeVisible({ timeout: 5000 });
    await checkbox.click();
  }
}

/**
 * Select a date using date picker
 */
export async function selectDate(page: Page, selector: string, dateValue: string) {
  const dateInput = page.locator(selector);
  await expect(dateInput).toBeVisible({ timeout: 5000 });

  // Try to fill directly (works for native date inputs)
  await dateInput.fill(dateValue);
}

/**
 * Upload a file to a file input
 */
export async function uploadFile(page: Page, fileInputSelector: string, filePath: string) {
  const fileInput = page.locator(fileInputSelector);
  await fileInput.setInputFiles(filePath);

  // Wait for upload indicator to appear and disappear, or for success state
  const uploadingIndicator = page.locator('[data-uploading="true"], .uploading, text=/uploading/i');
  const successIndicator = page.locator(
    "[data-upload-success], .upload-success, text=/uploaded|complete/i"
  );

  // Either wait for success indicator or for uploading to finish
  await Promise.race([
    successIndicator.waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
    uploadingIndicator.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {}),
  ]);
}

/**
 * Click the save button and wait for success
 */
export async function saveForm(page: Page) {
  const saveButton = page.locator('button:has-text("Save Responses"), button:has-text("Save")');
  await expect(saveButton).toBeVisible({ timeout: 5000 });
  await expect(saveButton).toBeEnabled();

  await saveButton.click();

  // Wait for success toast or network idle
  const successToast = page.locator(
    '[role="alert"]:has-text("saved"), .toast-success, text=/saved|success/i'
  );
  await Promise.race([
    successToast.waitFor({ state: "visible", timeout: 5000 }).catch(() => {}),
    page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {}),
  ]);
}

/**
 * Verify assessment status on dashboard
 */
export async function verifyAssessmentStatus(page: Page, expectedStatus: string) {
  // Navigate to dashboard if not already there
  if (!page.url().includes("/blgu/dashboard")) {
    await navigateToBLGUDashboard(page);
  }

  // Look for status badge or text
  const statusElement = page.locator(
    `text=/status.*${expectedStatus}/i, [data-status="${expectedStatus}"]`
  );
  await expect(statusElement).toBeVisible({ timeout: 10000 });
}

/**
 * Click submit assessment button on dashboard
 */
export async function submitAssessment(page: Page) {
  const submitButton = page.locator(
    'button:has-text("Submit Assessment"), button:has-text("Submit for Review")'
  );
  await expect(submitButton).toBeVisible({ timeout: 5000 });
  await expect(submitButton).toBeEnabled();

  await submitButton.click();

  // Confirm dialog if present
  const confirmButton = page
    .locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Submit")')
    .last();
  if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmButton.click();
  }

  // Wait for submission to complete - look for success message or status change
  const successIndicator = page.locator('text=/submitted|success/i, [data-status="SUBMITTED"]');
  await Promise.race([
    successIndicator.waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
    page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {}),
  ]);
}

/**
 * Click resubmit assessment button on dashboard
 */
export async function resubmitAssessment(page: Page) {
  const resubmitButton = page.locator(
    'button:has-text("Resubmit Assessment"), button:has-text("Resubmit")'
  );
  await expect(resubmitButton).toBeVisible({ timeout: 5000 });
  await expect(resubmitButton).toBeEnabled();

  await resubmitButton.click();

  // Confirm dialog if present
  const confirmButton = page
    .locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Resubmit")')
    .last();
  if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmButton.click();
  }

  // Wait for resubmission to complete
  const successIndicator = page.locator("text=/resubmitted|submitted|success/i");
  await Promise.race([
    successIndicator.waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
    page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {}),
  ]);
}

/**
 * Verify locked state banner is visible
 */
export async function verifyLockedStateBanner(page: Page) {
  const lockedBanner = page
    .locator(
      '[data-testid="locked-state-banner"], .locked-state-banner, text=/locked|cannot edit|read-only/i'
    )
    .first();
  await expect(lockedBanner).toBeVisible({ timeout: 5000 });
}

/**
 * Verify form is in read-only mode (save button hidden)
 */
export async function verifyFormIsReadOnly(page: Page) {
  const saveButton = page.locator('button:has-text("Save Responses"), button:has-text("Save")');
  await expect(saveButton).not.toBeVisible();
}

/**
 * Verify rework comments panel is visible
 */
export async function verifyReworkCommentsVisible(page: Page) {
  const commentsPanel = page
    .locator('[data-testid="rework-comments-panel"], text=/assessor feedback|action required/i')
    .first();
  await expect(commentsPanel).toBeVisible({ timeout: 5000 });
}

/**
 * Navigate to Assessor review page for an assessment
 */
export async function navigateToAssessorReviewPage(page: Page, assessmentId: number) {
  const url = `/assessor/review/${assessmentId}`;
  await page.goto(url);
  await page.waitForURL(`**${url}`, { timeout: 10000 });
}

/**
 * Request rework as Assessor
 */
export async function requestRework(page: Page, comment: string) {
  // Click Request Rework button
  const requestReworkButton = page.locator('button:has-text("Request Rework")');
  await expect(requestReworkButton).toBeVisible({ timeout: 5000 });
  await requestReworkButton.click();

  // Fill rework comment
  const commentTextarea = page.locator(
    'textarea[name="comment"], textarea[placeholder*="comment"]'
  );
  await expect(commentTextarea).toBeVisible({ timeout: 5000 });
  await commentTextarea.fill(comment);

  // Submit rework request
  const submitButton = page
    .locator('button:has-text("Submit"), button:has-text("Request Rework")')
    .last();
  await submitButton.click();

  // Confirm dialog if present
  const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').last();
  if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmButton.click();
  }

  // Wait for request to complete
  const successIndicator = page.locator("text=/rework|requested|success/i");
  await Promise.race([
    successIndicator.waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
    page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {}),
  ]);
}

/**
 * Verify rework limit reached message
 */
export async function verifyReworkLimitReached(page: Page) {
  const limitMessage = page.locator("text=/rework limit reached|maximum rework|one rework cycle/i");
  await expect(limitMessage).toBeVisible({ timeout: 5000 });
}

/**
 * Verify completion percentage on dashboard
 */
export async function verifyCompletionPercentage(page: Page, expectedPercentage: number) {
  const percentageText = page.locator(`text=/${expectedPercentage}%/`);
  await expect(percentageText).toBeVisible({ timeout: 5000 });
}

/**
 * Wait for API request to complete
 */
export async function waitForAPIRequest(page: Page, urlPattern: string | RegExp) {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === "string") {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 10000 }
  );
}
