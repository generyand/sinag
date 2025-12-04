# Test Execution Guide - Next.js 16 Migration

## Overview

This guide provides step-by-step instructions for running all tests created to validate the Next.js 16 migration in the SINAG application.

## Test Suite Summary

### Unit Tests (Vitest)
- **proxy.test.ts** - Tests proxy authentication and routing logic (90+ test cases)
- **validation-page.test.tsx** - Tests async params handling for Validator page
- **assessment-detail-page.test.tsx** - Tests async params handling for MLGOO page

### E2E Tests (Playwright)
- **authentication.spec.ts** - Tests login/logout flows for all 5 roles (30+ test cases)
- **route-protection.spec.ts** - Tests role-based access control (80+ test cases)

**Total Test Cases: ~200+**

## Prerequisites

### 1. Environment Setup
```bash
# Ensure you're in the web app directory
cd apps/web

# Install dependencies
pnpm install

# Install Playwright browsers (for E2E tests)
npx playwright install --with-deps
```

### 2. Test Database Setup (for E2E tests)
The E2E tests require test users to exist in your database. Create these users with the following credentials:

```sql
-- MLGOO_DILG (Admin)
INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
VALUES ('admin@sinag-test.local', '[hash]', 'MLGOO_DILG', 'Test', 'Admin', true);

-- ASSESSOR
INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
VALUES ('assessor@sinag-test.local', '[hash]', 'ASSESSOR', 'Test', 'Assessor', true);

-- VALIDATOR
INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, validator_area_id)
VALUES ('validator@sinag-test.local', '[hash]', 'VALIDATOR', 'Test', 'Validator', true, 1);

-- BLGU_USER
INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, barangay_id)
VALUES ('blgu@sinag-test.local', '[hash]', 'BLGU_USER', 'Test', 'BLGU', true, 1);

-- KATUPARAN_CENTER_USER
INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
VALUES ('katuparan@sinag-test.local', '[hash]', 'KATUPARAN_CENTER_USER', 'Test', 'Katuparan', true);
```

Password for all test users: `TestPassword123!`

### 3. Backend API Setup (for E2E tests)
```bash
# In a separate terminal, start the backend API
cd apps/api
pnpm dev:api

# Or use docker-compose for full stack
./scripts/docker-dev.sh up
```

## Running Tests

### Option 1: Run All Tests
```bash
# Run all unit and integration tests
pnpm test

# Run all E2E tests
pnpm test:e2e
```

### Option 2: Run Tests by Category

#### Unit Tests Only
```bash
# Run all unit tests
pnpm test

# Run proxy tests only
pnpm test src/tests/proxy.test.ts

# Run async params tests only
pnpm test src/app/(app)/validator/submissions/__tests__/validation-page.test.tsx
pnpm test src/app/(app)/mlgoo/assessments/__tests__/assessment-detail-page.test.tsx

# Run with coverage
pnpm test:coverage
```

#### E2E Tests Only
```bash
# Run all E2E tests
pnpm test:e2e

# Run authentication tests only
pnpm test:e2e tests/e2e/authentication.spec.ts

# Run route protection tests only
pnpm test:e2e tests/e2e/route-protection.spec.ts

# Run in UI mode (interactive debugging)
pnpm test:e2e:ui

# Run in headed mode (visible browser)
pnpm test:e2e:headed
```

### Option 3: Run Tests in Watch Mode
```bash
# Unit tests watch mode (useful during development)
pnpm test:watch

# Will re-run tests automatically when files change
```

### Option 4: Run Specific Test Suites
```bash
# Run only authentication tests in a specific suite
pnpm test -- --grep "Authentication checking"

# Run only role-based access control tests
pnpm test -- --grep "Role-Based Access Control"

# Run E2E tests for a specific role
pnpm test:e2e -- --grep "MLGOO_DILG"
```

## Test Execution Order (Recommended)

For a comprehensive validation of the migration, run tests in this order:

### Phase 1: Unit Tests (Fast, No External Dependencies)
```bash
# 1. Test proxy authentication logic
pnpm test src/tests/proxy.test.ts

# 2. Test async params handling
pnpm test src/app/(app)/validator/submissions/__tests__/
pnpm test src/app/(app)/mlgoo/assessments/__tests__/
```

Expected output:
- ✓ ~90 passing tests for proxy.test.ts
- ✓ ~30 passing tests for async params

### Phase 2: E2E Authentication Tests (Requires Backend)
```bash
# Ensure backend is running first!
pnpm test:e2e tests/e2e/authentication.spec.ts
```

Expected output:
- ✓ Login flows for all 5 roles
- ✓ Session persistence tests
- ✓ Logout functionality
- ✓ Redirect after login tests

### Phase 3: E2E Route Protection Tests (Comprehensive)
```bash
# This is the most comprehensive test suite
pnpm test:e2e tests/e2e/route-protection.spec.ts
```

Expected output:
- ✓ Admin access tests (can access most routes except Katuparan)
- ✓ Assessor access tests (only assessor routes)
- ✓ Validator access tests (only validator routes)
- ✓ BLGU access tests (only BLGU routes)
- ✓ Katuparan access tests (only Katuparan routes)
- ✓ Cross-role security tests
- ✓ URL manipulation tests

## Interpreting Test Results

### Successful Test Run
```
✓ All tests passing
✓ No console errors
✓ All assertions met
✓ No unexpected redirects
✓ Session management working correctly
```

### Common Issues and Fixes

#### Issue 1: Proxy Unit Tests Failing
**Symptom**: Tests in `proxy.test.ts` fail with import errors

**Fix**:
```bash
# The proxy imports Next.js server modules which need proper mocking
# Check vitest.config.ts has correct Next.js mocks
```

#### Issue 2: E2E Tests Timeout
**Symptom**: Tests timeout waiting for navigation

**Fix**:
```bash
# 1. Ensure backend API is running
pnpm dev:api

# 2. Check test user credentials exist in database
# 3. Increase timeout in playwright.config.ts if needed
```

#### Issue 3: Authentication Tests Fail
**Symptom**: Login tests fail with "Invalid credentials"

**Fix**:
```bash
# Test users don't exist in database
# Create test users with correct passwords (see Prerequisites)
```

#### Issue 4: Route Protection Tests Fail
**Symptom**: Users can access routes they shouldn't

**Fix**:
```bash
# 1. Verify proxy.ts is correctly renamed from middleware.ts
# 2. Check proxy export name is "proxy" not "middleware"
# 3. Ensure cookies are set correctly after login
```

## Coverage Reports

### Generate Coverage Report
```bash
# Generate HTML coverage report
pnpm test:coverage

# Open coverage report in browser
open coverage/index.html
```

### Expected Coverage Targets
- **proxy.ts**: >95% coverage
- **Dynamic route pages**: >90% coverage
- **Overall application**: >80% coverage

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Next.js 16 Migration Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install
      - name: Run unit tests
        run: pnpm test --coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Start backend
        run: pnpm dev:api &
      - name: Wait for backend
        run: npx wait-on http://localhost:8000/health
      - name: Run E2E tests
        run: pnpm test:e2e
      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Debugging Failed Tests

### Unit Test Debugging
```bash
# Run with verbose output
pnpm test -- --reporter=verbose

# Run single test in isolation
pnpm test -- --grep "should redirect to login"

# Use Vitest UI for interactive debugging
pnpm test:ui
```

### E2E Test Debugging
```bash
# Run in headed mode to see browser
pnpm test:e2e:headed

# Run in debug mode with Playwright Inspector
pnpm test:e2e:debug

# Run specific test with trace
pnpm test:e2e tests/e2e/authentication.spec.ts --trace on
```

### Common Debugging Steps
1. Check console logs during test execution
2. Verify test environment variables are set correctly
3. Ensure test data exists in database
4. Check network requests in browser DevTools (E2E tests)
5. Review Playwright traces for E2E test failures

## Performance Benchmarks

Expected test execution times:

| Test Suite | Expected Time | Test Count |
|------------|---------------|------------|
| proxy.test.ts | <10s | 90+ |
| async params tests | <5s | 30+ |
| authentication.spec.ts | 30-60s | 30+ |
| route-protection.spec.ts | 60-120s | 80+ |
| **Total** | **~3-5 minutes** | **200+** |

## Post-Test Validation Checklist

After all tests pass, verify:

- [ ] All 5 user roles can log in successfully
- [ ] Role-based redirects work correctly
- [ ] No unauthorized access to protected routes
- [ ] Session persists across page refreshes
- [ ] Logout clears all session data
- [ ] Dynamic routes handle invalid params correctly
- [ ] No console errors in development mode
- [ ] No console errors in production build

## Next Steps After Successful Tests

1. **Run production build test**:
   ```bash
   pnpm build
   pnpm start
   # Manually test critical flows
   ```

2. **Deploy to staging environment**:
   - Run E2E tests against staging
   - Perform manual QA testing
   - Monitor for errors

3. **Monitor production after deployment**:
   - Watch error tracking (Sentry, etc.)
   - Monitor user authentication flows
   - Check for unexpected redirects

## Support and Troubleshooting

If tests continue to fail after following this guide:

1. Check the test plan document: `tests/nextjs-16-migration-test-plan.md`
2. Review proxy.ts implementation for correct Next.js 16 syntax
3. Verify all async params are properly awaited
4. Ensure test environment matches development environment
5. Consult Next.js 16 migration documentation: https://nextjs.org/docs/upgrading

## Conclusion

This comprehensive test suite validates that the Next.js 16 migration:
- ✓ Maintains authentication security
- ✓ Preserves role-based access control
- ✓ Handles dynamic route params correctly
- ✓ Provides proper user experience across all roles
- ✓ Prevents unauthorized access to protected routes

All tests passing indicates the migration was successful and the application is ready for deployment.
