// 🔐 Authentication Test Fixtures
// Epic 6 Story 6.1 - E2E Workflow Testing
// Optimized with auth state persistence for faster test execution
/* eslint-disable react-hooks/rules-of-hooks */

import { test as base, expect, Page, BrowserContext } from "@playwright/test";
import fs from "fs";

/**
 * Test user credentials for E2E tests
 * These MUST match the users created by seed_e2e_users.py
 */
export const TEST_USERS = {
  BLGU: {
    email: "blgu@sinag-test.local",
    password: "TestBLGU123!",
    role: "BLGU_USER",
    storageState: ".playwright/auth/blgu.json",
  },
  ASSESSOR: {
    email: "assessor@sinag-test.local",
    password: "TestAssessor123!",
    role: "ASSESSOR",
    storageState: ".playwright/auth/assessor.json",
  },
  VALIDATOR: {
    email: "validator@sinag-test.local",
    password: "TestValidator123!",
    role: "VALIDATOR",
    storageState: ".playwright/auth/validator.json",
  },
  MLGOO: {
    email: "admin@sinag-test.local",
    password: "TestAdmin123!",
    role: "MLGOO_DILG",
    storageState: ".playwright/auth/mlgoo.json",
  },
  KATUPARAN: {
    email: "katuparan@sinag-test.local",
    password: "TestKatuparan123!",
    role: "KATUPARAN_CENTER_USER",
    storageState: ".playwright/auth/katuparan.json",
  },
} as const;

/**
 * Ensure auth storage directory exists
 */
function ensureAuthDir() {
  const dir = ".playwright/auth";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Check if auth state file exists and is recent (< 1 hour old)
 */
function isAuthStateValid(storageStatePath: string): boolean {
  if (!fs.existsSync(storageStatePath)) {
    return false;
  }
  try {
    const stats = fs.statSync(storageStatePath);
    const ageMs = Date.now() - stats.mtimeMs;
    return ageMs < 60 * 60 * 1000; // 1 hour
  } catch {
    return false;
  }
}

/**
 * Login and save auth state for reuse
 */
async function loginAndSaveState(
  page: Page,
  email: string,
  password: string,
  storageStatePath: string
): Promise<void> {
  ensureAuthDir();

  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);

  // Use ID selectors (matching LoginForm.tsx)
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');

  // Wait for successful redirect away from login
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15000,
  });

  // Save storage state for future tests
  await page.context().storageState({ path: storageStatePath });
}

/**
 * Login helper function for BLGU users
 */
export async function loginAsBLGU(page: Page) {
  await page.goto("/login");

  await page.fill("#email", TEST_USERS.BLGU.email);
  await page.fill("#password", TEST_USERS.BLGU.password);
  await page.click('button[type="submit"]');

  // Wait for navigation to BLGU dashboard
  await page.waitForURL("**/blgu/**", { timeout: 10000 });
}

/**
 * Login helper function for Assessor users
 */
export async function loginAsAssessor(page: Page) {
  await page.goto("/login");

  await page.fill("#email", TEST_USERS.ASSESSOR.email);
  await page.fill("#password", TEST_USERS.ASSESSOR.password);
  await page.click('button[type="submit"]');

  // Wait for navigation to Assessor dashboard
  await page.waitForURL("**/assessor/**", { timeout: 10000 });
}

/**
 * Login helper function for Validator users
 */
export async function loginAsValidator(page: Page) {
  await page.goto("/login");

  await page.fill("#email", TEST_USERS.VALIDATOR.email);
  await page.fill("#password", TEST_USERS.VALIDATOR.password);
  await page.click('button[type="submit"]');

  // Wait for navigation to Validator dashboard
  await page.waitForURL("**/validator/**", { timeout: 10000 });
}

/**
 * Login helper function for MLGOO/Admin users
 */
export async function loginAsMLGOO(page: Page) {
  await page.goto("/login");

  await page.fill("#email", TEST_USERS.MLGOO.email);
  await page.fill("#password", TEST_USERS.MLGOO.password);
  await page.click('button[type="submit"]');

  // Wait for navigation to MLGOO dashboard
  await page.waitForURL("**/mlgoo/**", { timeout: 10000 });
}

/**
 * Logout helper function
 */
export async function logout(page: Page) {
  const logoutButton = page.locator(
    'button:has-text("Logout"), button:has-text("Sign Out"), button:has-text("Log out")'
  );
  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL(/\/login/, { timeout: 5000 });
  }
}

// ============================================================================
// Pre-authenticated Page Fixtures
// Use these to skip login in every test for ~2-3s savings per test
// ============================================================================

type AuthFixtures = {
  blguPage: Page;
  assessorPage: Page;
  validatorPage: Page;
  mlgooPage: Page;
  katuparanPage: Page;
};

/**
 * Extended test with pre-authenticated page fixtures
 *
 * Usage:
 *   import { test } from './fixtures/auth';
 *   test('my test', async ({ blguPage }) => {
 *     await blguPage.goto('/blgu/dashboard');
 *     // Already logged in!
 *   });
 */
export const test = base.extend<AuthFixtures>({
  blguPage: async ({ browser }, use) => {
    const user = TEST_USERS.BLGU;
    let context: BrowserContext;

    if (isAuthStateValid(user.storageState)) {
      context = await browser.newContext({ storageState: user.storageState });
    } else {
      context = await browser.newContext();
      const page = await context.newPage();
      await loginAndSaveState(page, user.email, user.password, user.storageState);
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  assessorPage: async ({ browser }, use) => {
    const user = TEST_USERS.ASSESSOR;
    let context: BrowserContext;

    if (isAuthStateValid(user.storageState)) {
      context = await browser.newContext({ storageState: user.storageState });
    } else {
      context = await browser.newContext();
      const page = await context.newPage();
      await loginAndSaveState(page, user.email, user.password, user.storageState);
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  validatorPage: async ({ browser }, use) => {
    const user = TEST_USERS.VALIDATOR;
    let context: BrowserContext;

    if (isAuthStateValid(user.storageState)) {
      context = await browser.newContext({ storageState: user.storageState });
    } else {
      context = await browser.newContext();
      const page = await context.newPage();
      await loginAndSaveState(page, user.email, user.password, user.storageState);
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  mlgooPage: async ({ browser }, use) => {
    const user = TEST_USERS.MLGOO;
    let context: BrowserContext;

    if (isAuthStateValid(user.storageState)) {
      context = await browser.newContext({ storageState: user.storageState });
    } else {
      context = await browser.newContext();
      const page = await context.newPage();
      await loginAndSaveState(page, user.email, user.password, user.storageState);
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  katuparanPage: async ({ browser }, use) => {
    const user = TEST_USERS.KATUPARAN;
    let context: BrowserContext;

    if (isAuthStateValid(user.storageState)) {
      context = await browser.newContext({ storageState: user.storageState });
    } else {
      context = await browser.newContext();
      const page = await context.newPage();
      await loginAndSaveState(page, user.email, user.password, user.storageState);
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
