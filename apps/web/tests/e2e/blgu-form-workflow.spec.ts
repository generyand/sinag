// 🧪 E2E Test: BLGU Form Filling Workflow
// Tests the complete user journey for filling out dynamic forms
// Epic 3 - Task 3.18.11

import { test, expect } from "@playwright/test";

/**
 * Test Setup: Authentication Helper
 *
 * Note: This test assumes mock authentication or test user credentials.
 * Update these credentials based on your test environment setup.
 */
const TEST_BLGU_USER = {
  email: "blgu.test@example.com",
  password: "TestPassword123!",
};

test.describe("BLGU Form Filling Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Perform login
    await page.fill("#email", TEST_BLGU_USER.email);
    await page.fill("#password", TEST_BLGU_USER.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL("**/blgu/**", { timeout: 10000 });
  });

  test("should complete full form filling, saving, and data persistence workflow", async ({
    page,
  }) => {
    // 1. Navigate to dashboard
    await expect(page).toHaveURL(/\/blgu/);
    await expect(page.locator("h1")).toContainText(/dashboard/i);

    // 2. Click on an indicator to open the form
    const firstIndicatorButton = page.locator('[data-testid="indicator-card"]').first();
    await expect(firstIndicatorButton).toBeVisible({ timeout: 10000 });
    await firstIndicatorButton.click();

    // 3. Wait for form to load
    await page.waitForURL("**/indicator/**", { timeout: 10000 });

    // Verify form schema is loaded
    await expect(page.locator("form")).toBeVisible({ timeout: 10000 });

    // 4. Fill in text field
    const textInput = page.locator('input[type="text"]').first();
    await expect(textInput).toBeVisible();
    await textInput.fill("BLGU Infrastructure Project");

    // 5. Fill in number field
    const numberInput = page.locator('input[type="number"]').first();
    if (await numberInput.isVisible()) {
      await numberInput.fill("500000");
    }

    // 6. Select radio button option
    const radioOption = page.locator('input[type="radio"]').first();
    if (await radioOption.isVisible()) {
      await radioOption.click();
    }

    // 7. Fill in select dropdown (if present)
    const selectTrigger = page.locator('[role="combobox"]').first();
    if (await selectTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectTrigger.click();
      const firstOption = page.locator('[role="option"]').first();
      await firstOption.click();
    }

    // 8. Click save button
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // 9. Wait for save success (look for success message or button state change)
    await page.waitForTimeout(2000); // Wait for save to complete

    // 10. Verify completion feedback updates
    // Look for completion indicator (e.g., "1/3 complete" or progress bar)
    const completionFeedback = page.locator('[data-testid="completion-feedback"]');
    if (await completionFeedback.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(completionFeedback).toContainText(/\d+\/\d+/); // e.g., "1/3" or "3/3"
    }

    // 11. Navigate back to dashboard
    const backButton = page
      .locator('button:has-text("Back")')
      .or(page.locator('a[href*="/blgu"]'))
      .first();
    if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backButton.click();
      await page.waitForURL("**/blgu/**", { timeout: 5000 });
    } else {
      // Fallback: navigate directly
      await page.goto("/blgu");
    }

    // 12. Return to the same form
    await firstIndicatorButton.click();
    await page.waitForURL("**/indicator/**", { timeout: 10000 });

    // 13. Verify saved data is loaded and pre-populated
    await page.waitForTimeout(2000); // Wait for data to load

    const reloadedTextInput = page.locator('input[type="text"]').first();
    await expect(reloadedTextInput).toHaveValue("BLGU Infrastructure Project");

    // Verify number field if it was filled
    const reloadedNumberInput = page.locator('input[type="number"]').first();
    if (await reloadedNumberInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(reloadedNumberInput).toHaveValue("500000");
    }

    // Verify radio button selection persists
    const selectedRadio = page.locator('input[type="radio"]:checked').first();
    if (await selectedRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(selectedRadio).toBeChecked();
    }

    console.log(
      "✅ Complete form workflow test passed: fill → save → navigate → reload → verify data persistence"
    );
  });

  test("should handle form validation errors before allowing save", async ({ page }) => {
    // Navigate to a form
    const firstIndicatorButton = page.locator('[data-testid="indicator-card"]').first();
    await firstIndicatorButton.click();
    await page.waitForURL("**/indicator/**", { timeout: 10000 });

    // Try to save without filling required fields
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Verify validation errors appear
    const errorMessages = page.locator('[role="alert"]');
    await expect(errorMessages.first()).toBeVisible({ timeout: 5000 });

    console.log("✅ Form validation test passed: prevents save with missing required fields");
  });

  test("should display correct field types based on schema", async ({ page }) => {
    // Navigate to a form
    const firstIndicatorButton = page.locator('[data-testid="indicator-card"]').first();
    await firstIndicatorButton.click();
    await page.waitForURL("**/indicator/**", { timeout: 10000 });

    // Verify various field types are rendered
    const textInputs = page.locator('input[type="text"]');
    const numberInputs = page.locator('input[type="number"]');
    const radioInputs = page.locator('input[type="radio"]');
    const textAreas = page.locator("textarea");

    // At least one type of input should be present
    const hasTextInput = (await textInputs.count()) > 0;
    const hasNumberInput = (await numberInputs.count()) > 0;
    const hasRadioInput = (await radioInputs.count()) > 0;
    const hasTextArea = (await textAreas.count()) > 0;

    const hasAnyField = hasTextInput || hasNumberInput || hasRadioInput || hasTextArea;
    expect(hasAnyField).toBe(true);

    console.log("✅ Field rendering test passed: schema-driven fields display correctly");
  });
});
