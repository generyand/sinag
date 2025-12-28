# Test Migration Health

Test database migrations for health by running upgrade and downgrade cycles on a temporary Docker
Postgres database.

## Instructions

When this command is invoked, perform the following steps:

### 1. Check for New/Modified Migrations

First, identify any new or modified migration files:

```bash
cd apps/api && git status alembic/versions/
```

### 2. Run the Migration Health Check Script

Execute the migration test script:

```bash
./scripts/test-migration.sh
```

Or test a specific migration:

```bash
./scripts/test-migration.sh <revision_id>
```

### 3. Interpret Results

The script will:

1. Spin up a temporary Postgres container
2. Run all migrations (upgrade)
3. Test downgrade to previous revision
4. Test upgrade again
5. Clean up the container

**Expected output for healthy migrations:**

- All upgrade/downgrade/re-upgrade steps should pass
- No SQL errors or constraint violations

### 4. Common Issues to Watch For

If the test fails, check for:

1. **Missing dependencies**: Ensure tables/columns exist before referencing them
2. **Data loss on downgrade**: Downgrade should be reversible where possible
3. **Constraint violations**: Foreign keys, unique constraints, NOT NULL
4. **Syntax errors**: Invalid SQL in raw execute statements
5. **Idempotency issues**: Migration should be safe to run multiple times

### 5. Report Results

After running, report:

- Whether all tests passed
- Any errors encountered
- Suggestions for fixing issues

## Quick Reference

| Command                             | Description                 |
| ----------------------------------- | --------------------------- |
| `./scripts/test-migration.sh`       | Test all pending migrations |
| `./scripts/test-migration.sh head`  | Test up to latest           |
| `./scripts/test-migration.sh <rev>` | Test specific revision      |
| `uv run alembic heads`              | Show current head revisions |
| `uv run alembic history`            | Show migration history      |

## Prerequisites

- Docker must be installed and running
- Port 5433 must be available (used for test container)
