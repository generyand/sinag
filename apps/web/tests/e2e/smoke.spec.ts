/**
 * Smoke Tests - Basic checks that the app is running
 *
 * These are simple tests to verify the frontend deploys correctly.
 * Run before every deployment to catch obvious breaks.
 */

import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");

    // Check page title exists
    await expect(page).toHaveTitle(/SINAG|Login/i);

    // Check login form elements are present (using id selectors)
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("landing page loads", async ({ page }) => {
    await page.goto("/");

    // Check that the landing page loads successfully
    await expect(page).toHaveTitle(/SINAG/i);
  });

  test("404 page works", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");

    // Should return 404 or show not found message
    const is404 = response?.status() === 404;
    const hasNotFoundText = await page
      .locator("text=/not found|404/i")
      .isVisible()
      .catch(() => false);

    expect(is404 || hasNotFoundText).toBeTruthy();
  });
});
