# Database Migrations Guide

> **TODO**: Document Alembic migration workflow including:
>
> - When to create migrations
> - Auto-generating migrations
> - Manual migration editing
> - Testing migrations
> - Rolling back migrations
> - Handling migration conflicts
> - Production migration strategy
> - Best practices for schema changes

## Alembic Workflow

### Creating a Migration

```bash
cd apps/api

# Auto-generate migration from model changes
alembic revision --autogenerate -m "description of changes"

# Create blank migration (for data migrations)
alembic revision -m "description"
```

### Applying Migrations

```bash
# Upgrade to latest
alembic upgrade head

# Upgrade by specific number of revisions
alembic upgrade +1

# Downgrade one revision
alembic downgrade -1

# Downgrade to specific revision
alembic downgrade <revision_id>
```

### Reviewing Migrations

```bash
# Show current revision
alembic current

# Show migration history
alembic history

# Show SQL for migration (without applying)
alembic upgrade head --sql
```

## Best Practices

> **TODO**: Document best practices:
>
> - Always review auto-generated migrations
> - Test migrations on a copy of production data
> - Write both upgrade() and downgrade()
> - Handle data migrations separately
> - Never edit applied migrations

## Common Scenarios

> **TODO**: Document solutions for:
>
> - Adding a new column
> - Renaming a column
> - Adding a foreign key
> - Creating indexes
> - Data migrations
> - Handling nullable vs non-nullable columns

## Troubleshooting

> **TODO**: Document common migration issues and solutions
