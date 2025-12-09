# Testing Documentation

Testing guides and criteria for the SINAG platform.

## Available Documents

- **[Deployment Smoke Tests](./deployment-smoke-tests.md)** - Quick smoke tests to verify deployment
  success
- **[UAT Criteria](./uat-criteria.md)** - User Acceptance Testing criteria and checklists

## Testing Strategy

For comprehensive testing guidelines, see:

- [Testing Guide](../guides/testing.md) - Complete testing strategy and best practices

## Quick Reference

### Running Tests

```bash
# All tests
pnpm test

# Backend tests only
cd apps/api
pytest

# Backend tests with verbose output
cd apps/api
pytest -vv --log-cli-level=DEBUG

# Specific test file
cd apps/api
pytest tests/api/v1/test_auth.py

# Frontend tests
cd apps/web
pnpm test
```

### Test Coverage

```bash
# Backend coverage
cd apps/api
pytest --cov=app --cov-report=html

# View coverage report
open htmlcov/index.html
```

## Testing Phases

### 1. Development Testing

- Unit tests for services
- Integration tests for API endpoints
- Component tests for frontend

### 2. Pre-Deployment Testing

- Smoke tests (see [deployment-smoke-tests.md](./deployment-smoke-tests.md))
- End-to-end workflow testing
- Performance testing

### 3. User Acceptance Testing

- UAT criteria (see [uat-criteria.md](./uat-criteria.md))
- SGLGB workflow validation
- Role-based access control verification

---

**Last Updated**: November 19, 2025
