import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 *
 * Optimized for CI performance:
 * - Parallel execution with 2 workers
 * - Reduced timeouts to fail fast
 * - Starts both frontend and backend in CI
 */
export default defineConfig({
  testDir: "./apps/web/tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Use 4 workers in CI for faster parallel execution
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [["html"], ["github"]] : "html",

  // Global timeout per test (reduced from default 30s)
  timeout: 15000,

  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Reduce action timeout
    actionTimeout: 10000,
    // Reduce navigation timeout
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    // Backend API server (required for auth and data)
    {
      command: "cd apps/api && uv run uvicorn main:app --host 0.0.0.0 --port 8000",
      url: "http://localhost:8000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        DATABASE_URL:
          process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/test_db",
        SECRET_KEY: process.env.SECRET_KEY || "test-secret-key-for-e2e-tests-1234567890abcdef",
        CELERY_BROKER_URL: process.env.CELERY_BROKER_URL || "redis://localhost:6379/0",
        REDIS_CACHE_URL: process.env.REDIS_CACHE_URL || "redis://localhost:6379/0",
        SUPABASE_URL: process.env.SUPABASE_URL || "https://example.supabase.co",
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "test-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-role-key",
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "test-gemini-key",
        FAIL_FAST: "false",
        REQUIRE_CELERY: "false",
        REQUIRE_GEMINI: "false",
      },
    },
    // Frontend Next.js server
    {
      command: "pnpm dev:web",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        // API URL for frontend to communicate with backend
        NEXT_PUBLIC_API_URL: "http://localhost:8000",
        NEXT_PUBLIC_API_V1_URL: "http://localhost:8000/api/v1",
      },
    },
  ],
});
