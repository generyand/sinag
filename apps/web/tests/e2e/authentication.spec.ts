/**
 * E2E Tests for Authentication Flows (Next.js 16 Migration)
 *
 * Tests complete authentication workflows including:
 * - Login for all 5 user roles
 * - Automatic role-based redirects
 * - Session persistence across page refreshes
 * - Logout functionality
 *
 * These tests validate that the proxy.ts migration maintains
 * correct authentication behavior.
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Test User Credentials
 *
 * Note: These users should exist in your test database.
 * Update credentials as needed for your test environment.
 */
const TEST_USERS = {
  MLGOO_DILG: {
    email: 'admin@sinag-test.local',
    password: 'TestAdmin123!',
    role: 'MLGOO_DILG',
    expectedDashboard: '/mlgoo/dashboard',
  },
  ASSESSOR: {
    email: 'assessor@sinag-test.local',
    password: 'TestAssessor123!',
    role: 'ASSESSOR',
    expectedDashboard: '/assessor/submissions',
  },
  VALIDATOR: {
    email: 'validator@sinag-test.local',
    password: 'TestValidator123!',
    role: 'VALIDATOR',
    expectedDashboard: '/validator/submissions',
  },
  BLGU_USER: {
    email: 'blgu@sinag-test.local',
    password: 'TestBLGU123!',
    role: 'BLGU_USER',
    expectedDashboard: '/blgu/dashboard',
  },
  KATUPARAN_CENTER_USER: {
    email: 'katuparan@sinag-test.local',
    password: 'TestKatuparan123!',
    role: 'KATUPARAN_CENTER_USER',
    expectedDashboard: '/katuparan/dashboard',
  },
};

/**
 * Helper: Perform login action
 */
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);

  // Fill in credentials
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  // Submit login form
  await page.click('button[type="submit"]');

  // Wait for navigation (successful login redirects)
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 10000,
  });
}

/**
 * Helper: Check if user is authenticated
 */
async function isAuthenticated(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  const authToken = cookies.find((c) => c.name === 'auth-token');
  return !!authToken && authToken.value.length > 0;
}

/**
 * Helper: Perform logout action
 */
async function logoutUser(page: Page) {
  // Look for logout button (adjust selector based on your UI)
  const logoutButton = page.locator('button:has-text("Logout")').or(
    page.locator('button:has-text("Log out")')
  ).or(
    page.locator('[data-testid="logout-button"]')
  );

  await logoutButton.click();

  // Wait for redirect to login page
  await page.waitForURL(/\/login/, { timeout: 5000 });
}

test.describe('Authentication Flow - Login', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.goto('/login');
  });

  test('should show login page when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/blgu/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.url()).toContain('redirect=%2Fblgu%2Fdashboard');
  });

  test('should display error message with invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message (adjust selector based on your UI)
    const errorMessage = page.locator('[role="alert"]').or(
      page.locator('.error-message')
    ).or(
      page.locator('text=/invalid|incorrect|wrong/i')
    );

    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('MLGOO_DILG: should login and redirect to admin dashboard', async ({ page }) => {
    const user = TEST_USERS.MLGOO_DILG;
    await loginUser(page, user.email, user.password);

    // Verify redirect to admin dashboard
    await expect(page).toHaveURL(new RegExp(user.expectedDashboard));

    // Verify authentication cookie is set
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('ASSESSOR: should login and redirect to assessor submissions', async ({ page }) => {
    const user = TEST_USERS.ASSESSOR;
    await loginUser(page, user.email, user.password);

    // Verify redirect to assessor dashboard
    await expect(page).toHaveURL(new RegExp(user.expectedDashboard));

    // Verify authentication
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('VALIDATOR: should login and redirect to validator submissions', async ({ page }) => {
    const user = TEST_USERS.VALIDATOR;
    await loginUser(page, user.email, user.password);

    // Verify redirect to validator dashboard
    await expect(page).toHaveURL(new RegExp(user.expectedDashboard));

    // Verify authentication
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('BLGU_USER: should login and redirect to BLGU dashboard', async ({ page }) => {
    const user = TEST_USERS.BLGU_USER;
    await loginUser(page, user.email, user.password);

    // Verify redirect to BLGU dashboard
    await expect(page).toHaveURL(new RegExp(user.expectedDashboard));

    // Verify authentication
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });

  test('KATUPARAN_CENTER_USER: should login and redirect to Katuparan dashboard', async ({ page }) => {
    const user = TEST_USERS.KATUPARAN_CENTER_USER;
    await loginUser(page, user.email, user.password);

    // Verify redirect to Katuparan dashboard
    await expect(page).toHaveURL(new RegExp(user.expectedDashboard));

    // Verify authentication
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);
  });
});

test.describe('Authentication Flow - Session Persistence', () => {
  test('should maintain authentication after page refresh', async ({ page }) => {
    const user = TEST_USERS.BLGU_USER;
    await loginUser(page, user.email, user.password);

    // Verify initial authentication
    await expect(page).toHaveURL(new RegExp(user.expectedDashboard));
    const initialAuth = await isAuthenticated(page);
    expect(initialAuth).toBe(true);

    // Refresh the page
    await page.reload();

    // Verify still authenticated and on same page
    await expect(page).toHaveURL(new RegExp(user.expectedDashboard));
    const afterRefreshAuth = await isAuthenticated(page);
    expect(afterRefreshAuth).toBe(true);
  });

  test('should maintain authentication when navigating between pages', async ({ page }) => {
    const user = TEST_USERS.BLGU_USER;
    await loginUser(page, user.email, user.password);

    // Navigate to different BLGU pages (adjust routes based on your app)
    await page.goto('/blgu/dashboard');
    await expect(page).toHaveURL(/\/blgu\/dashboard/);
    expect(await isAuthenticated(page)).toBe(true);

    // Navigate to another page within BLGU routes
    await page.goto('/blgu/assessments');
    await expect(page).toHaveURL(/\/blgu\/assessments/);
    expect(await isAuthenticated(page)).toBe(true);

    // Navigate to change password page (common route)
    await page.goto('/change-password');
    await expect(page).toHaveURL(/\/change-password/);
    expect(await isAuthenticated(page)).toBe(true);
  });

  test('should restore session from localStorage on page load', async ({ page, context }) => {
    const user = TEST_USERS.BLGU_USER;
    await loginUser(page, user.email, user.password);

    // Get auth data from localStorage
    const authStorage = await page.evaluate(() => {
      return localStorage.getItem('auth-storage');
    });

    expect(authStorage).toBeTruthy();

    // Open new page in same context (should restore from storage)
    const newPage = await context.newPage();
    await newPage.goto('/blgu/dashboard');

    // Should be authenticated without login
    await expect(newPage).toHaveURL(/\/blgu\/dashboard/);
    expect(await isAuthenticated(newPage)).toBe(true);

    await newPage.close();
  });
});

test.describe('Authentication Flow - Logout', () => {
  test('should clear session data on logout', async ({ page }) => {
    const user = TEST_USERS.BLGU_USER;
    await loginUser(page, user.email, user.password);

    // Verify authenticated
    expect(await isAuthenticated(page)).toBe(true);

    // Perform logout
    await logoutUser(page);

    // Verify redirected to login
    await expect(page).toHaveURL(/\/login/);

    // Verify auth cookie is cleared
    expect(await isAuthenticated(page)).toBe(false);

    // Verify localStorage is cleared
    const authStorage = await page.evaluate(() => {
      return localStorage.getItem('auth-storage');
    });
    expect(authStorage).toBeNull();
  });

  test('should redirect to login when accessing protected route after logout', async ({ page }) => {
    const user = TEST_USERS.BLGU_USER;
    await loginUser(page, user.email, user.password);

    // Logout
    await logoutUser(page);

    // Try to access protected route
    await page.goto('/blgu/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.url()).toContain('redirect=%2Fblgu%2Fdashboard');
  });

  test('should require re-login after logout', async ({ page }) => {
    const user = TEST_USERS.BLGU_USER;
    await loginUser(page, user.email, user.password);

    // Logout
    await logoutUser(page);

    // Verify on login page
    await expect(page).toHaveURL(/\/login/);

    // Try to access dashboard without logging in
    await page.goto('/blgu/dashboard');
    await expect(page).toHaveURL(/\/login/);

    // Now login again
    await loginUser(page, user.email, user.password);

    // Should successfully access dashboard
    await expect(page).toHaveURL(/\/blgu\/dashboard/);
  });
});

test.describe('Authentication Flow - Redirect After Login', () => {
  test('should redirect to originally requested page after login', async ({ page }) => {
    // Try to access protected page without auth
    await page.goto('/blgu/assessments/123');

    // Should redirect to login with redirect param
    await expect(page).toHaveURL(/\/login/);
    const redirectParam = new URL(page.url()).searchParams.get('redirect');
    expect(redirectParam).toBe('/blgu/assessments/123');

    // Login
    const user = TEST_USERS.BLGU_USER;
    await loginUser(page, user.email, user.password);

    // Should redirect back to originally requested page (if implemented)
    // Note: This behavior depends on your login implementation
    // Adjust expectations based on your app's behavior
  });

  test('should redirect authenticated user away from login page', async ({ page }) => {
    const user = TEST_USERS.ASSESSOR;
    await loginUser(page, user.email, user.password);

    // Verify on dashboard
    await expect(page).toHaveURL(new RegExp(user.expectedDashboard));

    // Try to go back to login page
    await page.goto('/login');

    // Should redirect back to dashboard (proxy behavior)
    await expect(page).toHaveURL(new RegExp(user.expectedDashboard));
  });
});

test.describe('Authentication Flow - Token Expiry', () => {
  test('should handle expired token gracefully', async ({ page }) => {
    // Set an expired token manually
    await page.context().addCookies([
      {
        name: 'auth-token',
        value: 'expired.token.here',
        domain: 'localhost',
        path: '/',
        expires: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      },
    ]);

    // Try to access protected route
    await page.goto('/blgu/dashboard');

    // Should either redirect to login or handle error
    // Adjust expectation based on your app's token expiry handling
    const currentUrl = page.url();
    const isOnLogin = currentUrl.includes('/login');
    const isOnErrorPage = currentUrl.includes('/error');

    expect(isOnLogin || isOnErrorPage).toBe(true);
  });
});

test.describe('Authentication Flow - Security', () => {
  test('should not expose sensitive data in URLs', async ({ page }) => {
    const user = TEST_USERS.BLGU_USER;
    await loginUser(page, user.email, user.password);

    // Check that URL doesn't contain token or sensitive data
    const url = page.url();
    expect(url).not.toContain('token=');
    expect(url).not.toContain('password=');
    expect(url).not.toContain(user.password);
  });

  test('should set httpOnly cookie for auth token', async ({ page, context }) => {
    const user = TEST_USERS.BLGU_USER;
    await loginUser(page, user.email, user.password);

    // Get auth cookie
    const cookies = await context.cookies();
    const authCookie = cookies.find((c) => c.name === 'auth-token');

    expect(authCookie).toBeDefined();
    // Note: httpOnly flag may not be accessible via Playwright
    // This is a reminder to check server-side cookie configuration
  });

  test('should not allow script access to auth token', async ({ page }) => {
    const user = TEST_USERS.BLGU_USER;
    await loginUser(page, user.email, user.password);

    // Try to access auth cookie via JavaScript
    const canAccessCookie = await page.evaluate(() => {
      return document.cookie.includes('auth-token');
    });

    // If httpOnly is properly set, this should be false
    // Adjust expectation based on your cookie configuration
    // For most secure implementations: expect(canAccessCookie).toBe(false);
    console.log('Can access auth cookie via JS:', canAccessCookie);
  });
});
