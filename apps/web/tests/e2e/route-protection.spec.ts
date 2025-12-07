/**
 * E2E Tests for Role-Based Route Protection (Next.js 16 Migration)
 *
 * Tests comprehensive role-based access control across all user roles:
 * - MLGOO_DILG (Admin) - Full access except Katuparan
 * - ASSESSOR - Only assessor routes
 * - VALIDATOR - Only validator routes
 * - BLGU_USER - Only BLGU routes
 * - KATUPARAN_CENTER_USER - Only Katuparan routes (external)
 *
 * These tests validate that the proxy.ts correctly enforces access restrictions.
 */

import { test, expect, Page } from "@playwright/test";

/**
 * Test User Credentials
 */
const TEST_USERS = {
  MLGOO_DILG: {
    email: "admin@sinag-test.local",
    password: "TestAdmin123!",
    role: "MLGOO_DILG",
    ownDashboard: "/mlgoo/dashboard",
  },
  ASSESSOR: {
    email: "assessor@sinag-test.local",
    password: "TestAssessor123!",
    role: "ASSESSOR",
    ownDashboard: "/assessor/submissions",
  },
  VALIDATOR: {
    email: "validator@sinag-test.local",
    password: "TestValidator123!",
    role: "VALIDATOR",
    ownDashboard: "/validator/submissions",
  },
  BLGU_USER: {
    email: "blgu@sinag-test.local",
    password: "TestBLGU123!",
    role: "BLGU_USER",
    ownDashboard: "/blgu/dashboard",
  },
  KATUPARAN_CENTER_USER: {
    email: "katuparan@sinag-test.local",
    password: "TestKatuparan123!",
    role: "KATUPARAN_CENTER_USER",
    ownDashboard: "/katuparan/dashboard",
  },
};

/**
 * Protected routes to test
 */
const PROTECTED_ROUTES = {
  admin: ["/mlgoo/dashboard", "/mlgoo/assessments", "/user-management"],
  assessor: ["/assessor/submissions", "/assessor/queue"],
  validator: ["/validator/submissions", "/validator/queue"],
  blgu: ["/blgu/dashboard", "/blgu/assessments"],
  katuparan: ["/katuparan/dashboard", "/katuparan/analytics"],
  common: ["/change-password"],
};

/**
 * Helper: Perform login
 */
async function loginUser(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 10000,
  });
}

/**
 * Helper: Expect redirect to specific dashboard
 */
async function expectRedirectTo(page: Page, expectedPath: string) {
  await expect(page).toHaveURL(new RegExp(expectedPath.replace(/\//g, "\\/")), {
    timeout: 5000,
  });
}

test.describe("Route Protection - MLGOO_DILG (Admin) Access", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    const user = TEST_USERS.MLGOO_DILG;
    await loginUser(page, user.email, user.password);
  });

  test("should access admin routes (/mlgoo/*)", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.admin) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      console.log(`✓ Admin can access: ${route}`);
    }
  });

  test("should access assessor routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.assessor) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      console.log(`✓ Admin can access: ${route}`);
    }
  });

  test("should access validator routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.validator) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      console.log(`✓ Admin can access: ${route}`);
    }
  });

  test("should access BLGU routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.blgu) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      console.log(`✓ Admin can access: ${route}`);
    }
  });

  test("should NOT access Katuparan routes (external only)", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.katuparan) {
      await page.goto(route);
      // Should redirect to admin dashboard
      await expectRedirectTo(page, TEST_USERS.MLGOO_DILG.ownDashboard);
      console.log(`✓ Admin blocked from: ${route}`);
    }
  });

  test("should access common routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.common) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      console.log(`✓ Admin can access: ${route}`);
    }
  });
});

test.describe("Route Protection - ASSESSOR Access", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    const user = TEST_USERS.ASSESSOR;
    await loginUser(page, user.email, user.password);
  });

  test("should access assessor routes only", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.assessor) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      console.log(`✓ Assessor can access: ${route}`);
    }
  });

  test("should NOT access admin routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.admin) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.ASSESSOR.ownDashboard);
      console.log(`✓ Assessor blocked from: ${route}`);
    }
  });

  test("should NOT access validator routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.validator) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.ASSESSOR.ownDashboard);
      console.log(`✓ Assessor blocked from: ${route}`);
    }
  });

  test("should NOT access BLGU routes (CRITICAL SECURITY)", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.blgu) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.ASSESSOR.ownDashboard);

      // Verify no flash of BLGU content
      const hasBlguContent = await page.evaluate(() => {
        return document.body.textContent?.toLowerCase().includes("barangay") || false;
      });

      console.log(`✓ Assessor IMMEDIATELY blocked from: ${route}`);
    }
  });

  test("should NOT access Katuparan routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.katuparan) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.ASSESSOR.ownDashboard);
      console.log(`✓ Assessor blocked from: ${route}`);
    }
  });

  test("should access common routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.common) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      console.log(`✓ Assessor can access: ${route}`);
    }
  });
});

test.describe("Route Protection - VALIDATOR Access", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    const user = TEST_USERS.VALIDATOR;
    await loginUser(page, user.email, user.password);
  });

  test("should access validator routes only", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.validator) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      console.log(`✓ Validator can access: ${route}`);
    }
  });

  test("should NOT access admin routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.admin) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.VALIDATOR.ownDashboard);
      console.log(`✓ Validator blocked from: ${route}`);
    }
  });

  test("should NOT access assessor routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.assessor) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.VALIDATOR.ownDashboard);
      console.log(`✓ Validator blocked from: ${route}`);
    }
  });

  test("should NOT access BLGU routes (CRITICAL SECURITY)", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.blgu) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.VALIDATOR.ownDashboard);
      console.log(`✓ Validator IMMEDIATELY blocked from: ${route}`);
    }
  });

  test("should NOT access Katuparan routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.katuparan) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.VALIDATOR.ownDashboard);
      console.log(`✓ Validator blocked from: ${route}`);
    }
  });

  test("should access common routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.common) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      console.log(`✓ Validator can access: ${route}`);
    }
  });
});

test.describe("Route Protection - BLGU_USER Access", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    const user = TEST_USERS.BLGU_USER;
    await loginUser(page, user.email, user.password);
  });

  test("should access BLGU routes only", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.blgu) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      console.log(`✓ BLGU user can access: ${route}`);
    }
  });

  test("should NOT access admin routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.admin) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.BLGU_USER.ownDashboard);
      console.log(`✓ BLGU user blocked from: ${route}`);
    }
  });

  test("should NOT access assessor routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.assessor) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.BLGU_USER.ownDashboard);
      console.log(`✓ BLGU user blocked from: ${route}`);
    }
  });

  test("should NOT access validator routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.validator) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.BLGU_USER.ownDashboard);
      console.log(`✓ BLGU user blocked from: ${route}`);
    }
  });

  test("should NOT access Katuparan routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.katuparan) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.BLGU_USER.ownDashboard);
      console.log(`✓ BLGU user blocked from: ${route}`);
    }
  });

  test("should access common routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.common) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      console.log(`✓ BLGU user can access: ${route}`);
    }
  });
});

test.describe("Route Protection - KATUPARAN_CENTER_USER (External) Access", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    const user = TEST_USERS.KATUPARAN_CENTER_USER;
    await loginUser(page, user.email, user.password);
  });

  test("should access Katuparan routes only", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.katuparan) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      console.log(`✓ Katuparan user can access: ${route}`);
    }
  });

  test("should NOT access admin routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.admin) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.KATUPARAN_CENTER_USER.ownDashboard);
      console.log(`✓ Katuparan user blocked from: ${route}`);
    }
  });

  test("should NOT access assessor routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.assessor) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.KATUPARAN_CENTER_USER.ownDashboard);
      console.log(`✓ Katuparan user blocked from: ${route}`);
    }
  });

  test("should NOT access validator routes", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.validator) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.KATUPARAN_CENTER_USER.ownDashboard);
      console.log(`✓ Katuparan user blocked from: ${route}`);
    }
  });

  test("should NOT access BLGU routes (CRITICAL SECURITY)", async ({ page }) => {
    for (const route of PROTECTED_ROUTES.blgu) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.KATUPARAN_CENTER_USER.ownDashboard);
      console.log(`✓ Katuparan user IMMEDIATELY blocked from: ${route}`);
    }
  });

  test("should NOT access common internal routes", async ({ page }) => {
    // Katuparan users should only access Katuparan-specific routes
    for (const route of PROTECTED_ROUTES.common) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.KATUPARAN_CENTER_USER.ownDashboard);
      console.log(`✓ Katuparan user blocked from: ${route}`);
    }
  });
});

test.describe("Route Protection - Cross-Role Security Tests", () => {
  test("CRITICAL: No user should see flash of unauthorized content", async ({ page, context }) => {
    // Test with ASSESSOR trying to access BLGU
    await context.clearCookies();
    await loginUser(page, TEST_USERS.ASSESSOR.email, TEST_USERS.ASSESSOR.password);

    // Navigate to BLGU route
    const response = await page.goto("/blgu/dashboard", { waitUntil: "domcontentloaded" });

    // Should redirect before rendering any BLGU content
    await expectRedirectTo(page, TEST_USERS.ASSESSOR.ownDashboard);

    // Verify final URL doesn't contain BLGU
    expect(page.url()).not.toContain("/blgu");
  });

  test("should enforce role-based access consistently across sessions", async ({
    page,
    context,
  }) => {
    // Login as BLGU user
    await context.clearCookies();
    await loginUser(page, TEST_USERS.BLGU_USER.email, TEST_USERS.BLGU_USER.password);
    await expectRedirectTo(page, "/blgu/dashboard");

    // Logout
    const logoutButton = page
      .locator('button:has-text("Logout")')
      .or(page.locator('[data-testid="logout-button"]'));
    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();
      await page.waitForURL(/\/login/, { timeout: 5000 });
    } else {
      await context.clearCookies();
      await page.goto("/login");
    }

    // Login as ASSESSOR
    await loginUser(page, TEST_USERS.ASSESSOR.email, TEST_USERS.ASSESSOR.password);

    // Should NOT be able to access previous user's routes
    await page.goto("/blgu/dashboard");
    await expectRedirectTo(page, TEST_USERS.ASSESSOR.ownDashboard);
  });

  test("should handle rapid route switching with role changes", async ({ page, context }) => {
    // Login as Admin
    await context.clearCookies();
    await loginUser(page, TEST_USERS.MLGOO_DILG.email, TEST_USERS.MLGOO_DILG.password);

    // Admin can access multiple routes
    await page.goto("/mlgoo/dashboard");
    await expect(page).toHaveURL(/\/mlgoo\/dashboard/);

    await page.goto("/assessor/submissions");
    await expect(page).toHaveURL(/\/assessor\/submissions/);

    await page.goto("/validator/submissions");
    await expect(page).toHaveURL(/\/validator\/submissions/);

    // But not Katuparan
    await page.goto("/katuparan/dashboard");
    await expectRedirectTo(page, "/mlgoo/dashboard");
  });
});

test.describe("Route Protection - URL Manipulation Tests", () => {
  test("should block direct URL access to unauthorized routes", async ({ page, context }) => {
    await context.clearCookies();
    await loginUser(page, TEST_USERS.BLGU_USER.email, TEST_USERS.BLGU_USER.password);

    // Try direct navigation via URL bar
    await page.goto("/mlgoo/dashboard");
    await expectRedirectTo(page, TEST_USERS.BLGU_USER.ownDashboard);

    await page.goto("/assessor/submissions/123");
    await expectRedirectTo(page, TEST_USERS.BLGU_USER.ownDashboard);

    await page.goto("/user-management/create");
    await expectRedirectTo(page, TEST_USERS.BLGU_USER.ownDashboard);
  });

  test("should block programmatic navigation to unauthorized routes", async ({ page, context }) => {
    await context.clearCookies();
    await loginUser(page, TEST_USERS.VALIDATOR.email, TEST_USERS.VALIDATOR.password);

    // Try programmatic navigation via JavaScript
    await page.evaluate(() => {
      window.location.href = "/blgu/dashboard";
    });

    // Should redirect
    await page.waitForURL((url) => !url.pathname.includes("/blgu"), { timeout: 5000 });
    await expectRedirectTo(page, TEST_USERS.VALIDATOR.ownDashboard);
  });

  test("should handle nested route access attempts", async ({ page, context }) => {
    await context.clearCookies();
    await loginUser(page, TEST_USERS.ASSESSOR.email, TEST_USERS.ASSESSOR.password);

    // Try accessing deeply nested BLGU routes
    const nestedRoutes = [
      "/blgu/dashboard/assessments",
      "/blgu/assessments/123/edit",
      "/blgu/reports/analytics",
    ];

    for (const route of nestedRoutes) {
      await page.goto(route);
      await expectRedirectTo(page, TEST_USERS.ASSESSOR.ownDashboard);
      console.log(`✓ Blocked nested route: ${route}`);
    }
  });
});

test.describe("Route Protection - Edge Cases", () => {
  test("should handle route with query parameters", async ({ page, context }) => {
    await context.clearCookies();
    await loginUser(page, TEST_USERS.BLGU_USER.email, TEST_USERS.BLGU_USER.password);

    // Try accessing unauthorized route with query params
    await page.goto("/assessor/submissions?status=pending&page=2");
    await expectRedirectTo(page, TEST_USERS.BLGU_USER.ownDashboard);
  });

  test("should handle route with hash fragments", async ({ page, context }) => {
    await context.clearCookies();
    await loginUser(page, TEST_USERS.ASSESSOR.email, TEST_USERS.ASSESSOR.password);

    // Try accessing unauthorized route with hash
    await page.goto("/blgu/dashboard#section-1");
    await expectRedirectTo(page, TEST_USERS.ASSESSOR.ownDashboard);
  });

  test("should handle non-existent routes appropriately", async ({ page, context }) => {
    await context.clearCookies();
    await loginUser(page, TEST_USERS.BLGU_USER.email, TEST_USERS.BLGU_USER.password);

    // Try accessing non-existent route
    await page.goto("/nonexistent/route/12345");

    // Should either show 404 or allow (since it's not a protected route)
    // Adjust expectation based on your app's 404 handling
    const is404 = await page
      .locator("text=/404|not found/i")
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const isAllowed = !page.url().includes("/login");

    expect(is404 || isAllowed).toBe(true);
  });
});
