# Developer Guides

Step-by-step guides for common development tasks in the SINAG project.

## Available Guides

### Development Workflow
- [Adding Features](./adding-features.md) - Complete workflow for adding new features
- [Database Migrations](./database-migrations.md) - Working with Alembic migrations
- [Testing](./testing.md) - Testing strategy and guidelines
- [Service Layer Pattern](./service-layer-pattern.md) - Backend architectural pattern
- [Type Generation](./type-generation.md) - End-to-end type safety workflow
- [Maintaining Changelog](./maintaining-changelog.md) - How to update CHANGELOG.md
- [Deployment](./deployment.md) - Deployment procedures

### UI Implementation Guides
- [UI Implementation: Navigation & Logos](./ui-implementation-navigation-and-logos.md) - Next/Previous navigation and governance area logos
- [UI Implementation: Tree Navigation](./ui-implementation-tree-navigation.md) - Tree hierarchical navigation for BLGU assessments

## Quick Reference

### Adding a New API Endpoint

1. Update or create SQLAlchemy model
2. Create Alembic migration
3. Define Pydantic schemas
4. Implement service layer logic
5. Create thin router endpoint
6. Run `pnpm generate-types`
7. Write tests

See [Adding Features](./adding-features.md) for detailed steps.

### Running Tests

```bash
# All tests
pnpm test

# Backend only
cd apps/api && pytest

# Frontend only
cd apps/web && pnpm test
```

See [Testing](./testing.md) for more information.

### Database Migrations

```bash
cd apps/api
alembic revision --autogenerate -m "description"
alembic upgrade head
```

See [Database Migrations](./database-migrations.md) for complete workflow.

### Updating Changelog

```bash
# Interactive changelog update
/changelog add

# Prepare a release
/changelog release

# View unreleased changes
/changelog show
```

See [Maintaining Changelog](./maintaining-changelog.md) for guidelines.
