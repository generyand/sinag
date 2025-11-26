# Database Utility Scripts

This directory contains database seeding and management utilities for development and testing environments.

## Prerequisites

- Backend environment configured (`apps/api/.env` with valid `DATABASE_URL`)
- Database accessible and migrations applied (`alembic upgrade head`)
- Python dependencies installed (use `uv` or standard `pip`)
- Active database connection (PostgreSQL via Supabase)

## Available Scripts

### seed-validators.py

Creates validator user accounts for governance areas 2-6.

**Purpose**: Quickly populate the database with validator accounts for testing the validator workflow introduced in November 2025 (Epic 3.0).

**Usage:**
```bash
# From project root
python scripts/database/seed-validators.py

# Or using uv
cd apps/api
uv run ../../scripts/database/seed-validators.py
```

**What it creates:**
- 5 validator accounts (one for each governance area 2-6)
- Email format: `validator.area[N]@dilg.gov.ph`
- Default password: `validator123`
- Role: `VALIDATOR`
- Each assigned to their respective governance area via `validator_area_id`

**Generated Credentials:**
```
validator.area2@dilg.gov.ph / validator123 (Governance Area 2)
validator.area3@dilg.gov.ph / validator123 (Governance Area 3)
validator.area4@dilg.gov.ph / validator123 (Governance Area 4)
validator.area5@dilg.gov.ph / validator123 (Governance Area 5)
validator.area6@dilg.gov.ph / validator123 (Governance Area 6)
```

**Safety:**
- Checks for existing users before creating (idempotent)
- Uses transactions (rolls back on error)
- Only creates if user doesn't already exist

---

### seed-assessment-data.py

Populates assessment responses for testing validator workflows.

**Purpose**: Add test assessment response data to existing assessments, useful for testing the validation workflow with data across multiple governance areas.

**Usage:**
```bash
# From project root
python scripts/database/seed-assessment-data.py

# Or using uv
cd apps/api
uv run ../../scripts/database/seed-assessment-data.py
```

**What it does:**
- Adds assessment responses for governance areas 4, 5, and 6
- Creates responses for the first 3 indicators in each area
- Sets validation status to `PASS`
- Marks responses as completed
- Useful for testing multi-area validation scenarios

**Notes:**
- Currently hardcoded to work with specific assessment IDs
- Modify the script if you need to target different assessments
- Safe to run multiple times (won't duplicate if responses exist)

---

### seed-complete-test.py

Creates a complete test dataset including users, assessments, and responses.

**Purpose**: Set up a comprehensive test environment in one command, ideal for QA testing or demonstrating the full SINAG workflow.

**Usage:**
```bash
# From project root
python scripts/database/seed-complete-test.py

# Or using uv
cd apps/api
uv run ../../scripts/database/seed-complete-test.py
```

**What it creates:**

1. **BLGU User Account:**
   - Email: `test.complete@blgu.local`
   - Password: `blgu123`
   - Role: `BLGU_USER`
   - Assigned to: Barangay "Test Complete Barangay"

2. **Assessment:**
   - Status: `AWAITING_FINAL_VALIDATION`
   - Associated with the BLGU user
   - Includes metadata (submitted_at, etc.)

3. **Assessment Responses:**
   - Creates responses for indicators across all 6 governance areas
   - Sets up realistic test data for validation workflow
   - Marks responses as completed and passing

4. **Validators (if not exist):**
   - Creates validator accounts for areas 2-6 (same as `seed-validators.py`)

**Generated Credentials:**
```
BLGU User:  test.complete@blgu.local / blgu123
Validators: validator.area[2-6]@dilg.gov.ph / validator123
```

**Use Cases:**
- Fresh environment setup for QA testing
- Demonstrating the complete BLGU → Validator workflow
- Integration testing with realistic data
- Training and onboarding new developers

---

## Common Workflows

### Setting up a fresh test environment

```bash
# 1. Ensure database is migrated
cd apps/api
alembic upgrade head

# 2. Create complete test dataset (includes validators)
python ../../scripts/database/seed-complete-test.py

# 3. Start the application
cd ../..
pnpm dev

# 4. Login and test:
#    - BLGU: test.complete@blgu.local / blgu123
#    - Validator: validator.area2@dilg.gov.ph / validator123
```

### Adding validators only

```bash
python scripts/database/seed-validators.py
```

### Adding assessment data to existing assessments

```bash
# Note: You may need to modify the script to target your assessment ID
python scripts/database/seed-assessment-data.py
```

---

## Safety and Best Practices

### Development Only
- **These scripts are for development and testing environments only**
- **Never run against production databases**
- Always verify the `DATABASE_URL` environment variable before running

### Transaction Safety
- All scripts use database transactions
- Automatic rollback on errors
- Won't leave the database in an inconsistent state

### Idempotency
- Scripts check for existing data before creating
- Safe to run multiple times
- Won't create duplicate users or data

### Environment Variables
All scripts load from `apps/api/.env`:
```env
DATABASE_URL=postgresql://user:password@host:port/database
```

Ensure this points to your development database, not production.

---

## Troubleshooting

### "DATABASE_URL not found in environment"
- Ensure `apps/api/.env` exists
- Verify `DATABASE_URL` is set in the file
- Check file path in error message

### "Password hashing error"
- Ensure `passlib` and `bcrypt` are installed
- Run `uv sync` or `pip install passlib[bcrypt]`

### "Table does not exist" errors
- Run database migrations: `cd apps/api && alembic upgrade head`
- Ensure you're connected to the correct database

### "User already exists" (not an error)
- Scripts are idempotent - this is expected behavior
- Existing users won't be modified or duplicated

---

## Script Maintenance

### Adding new governance areas
If governance areas 7-10 are added in the future, update `seed-validators.py`:

```python
validators_to_create = [
    # ... existing areas 2-6 ...
    ("validator.area7@dilg.gov.ph", "Validator Area 7", 7),
    ("validator.area8@dilg.gov.ph", "Validator Area 8", 8),
]
```

### Customizing passwords
Modify the hardcoded password in each script:

```python
hashed_pw = hash_password("your-custom-password")
```

### Extending seed-complete-test.py
The script can be extended to include:
- Multiple BLGU users
- Different assessment statuses (DRAFT, SUBMITTED, etc.)
- Assessor users for testing the full workflow
- MOV file uploads (would require file system operations)

---

## Related Documentation

- **User Roles**: See `CLAUDE.md` section "User Roles and Permissions"
- **Database Schema**: `apps/api/app/db/models/`
- **Migrations**: `apps/api/alembic/versions/`
- **Validator Workflow**: `docs/prds/prd-phase3-assessor-validation-rework-cycle.md`

---

## Contributing

When adding new database scripts:
1. Follow the naming convention: `seed-*.py` for seeding scripts
2. Use transactions for data safety
3. Make scripts idempotent (safe to run multiple times)
4. Add documentation to this README
5. Include clear error messages and validation
6. Test against a fresh database before committing
