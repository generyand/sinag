# Workflow Restructuring Migration Guide (January 2026)

## Overview

This guide documents the workflow restructuring implemented in January 2026 that swaps the area
assignment behavior between Assessors and Validators. This is a significant change to how the
assessment validation workflow operates.

## Summary of Changes

### Role Behavior Changes

| Role      | Before (Nov 2025)                   | After (Jan 2026)                          |
| --------- | ----------------------------------- | ----------------------------------------- |
| ASSESSOR  | System-wide access (any barangay)   | Area-specific (assigned to 1 of 6 areas)  |
| VALIDATOR | Area-specific (`validator_area_id`) | System-wide access (all governance areas) |

### Field Changes

| Old Field           | New Field          | Purpose                                                   |
| ------------------- | ------------------ | --------------------------------------------------------- |
| `validator_area_id` | `assessor_area_id` | Renamed to reflect that Assessors (not Validators) use it |

### New Assessment Model Fields

| Field                    | Type    | Purpose                                               |
| ------------------------ | ------- | ----------------------------------------------------- |
| `area_submission_status` | JSONB   | Per-area status tracking (draft, submitted, approved) |
| `area_assessor_approved` | JSONB   | Quick lookup for area approval status                 |
| `rework_round_used`      | Boolean | Tracks if rework round has been used                  |
| `calibration_round_used` | Boolean | Tracks if calibration round has been used             |

### New API Endpoints

| Endpoint                                                  | Purpose                        |
| --------------------------------------------------------- | ------------------------------ |
| `POST /assessor/assessments/{id}/areas/{area_id}/approve` | Assessor approves their area   |
| `POST /assessor/assessments/{id}/areas/{area_id}/rework`  | Assessor sends area for rework |

## Breaking Changes

### 1. Database Schema Changes

**New fields on Assessment model:**

```python
# Total governance areas constant
TOTAL_GOVERNANCE_AREAS = 6

# Per-area tracking
area_submission_status: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
area_assessor_approved: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
rework_round_used: Mapped[bool] = mapped_column(default=False, nullable=False)
calibration_round_used: Mapped[bool] = mapped_column(default=False, nullable=False)
```

**Renamed field on User model:**

```sql
ALTER TABLE users RENAME COLUMN validator_area_id TO assessor_area_id;
```

### 2. Backend API Changes

#### Assessor Queue Filtering

**Before:**

- Assessors saw all submitted assessments (system-wide access)

**After:**

- Assessors only see assessments where their governance area is pending review
- Assessments where their area is already approved are hidden from queue

```python
# New filtering logic
is_assessor = user.role == UserRole.ASSESSOR and user.assessor_area_id is not None

# Skip assessments where assessor's area is already approved
area_status = assessment.get_area_status(assessor.assessor_area_id)
if area_status == "approved":
    continue  # Don't show in queue
```

#### Validator Queue Filtering

**Before:**

- Validators only saw assessments in their assigned governance area

**After:**

- Validators see all assessments in `AWAITING_FINAL_VALIDATION` status
- System-wide access (no area restriction)

```python
is_validator = user.role == UserRole.VALIDATOR

query = query.filter(
    Assessment.status.in_([
        AssessmentStatus.AWAITING_FINAL_VALIDATION,
        AssessmentStatus.REWORK,  # For parallel calibration
    ])
)
```

#### Finalize Endpoint Blocking

**Before:**

- Assessors could call `finalize_assessment()` to move assessment forward

**After:**

- Assessors are blocked from using `finalize_assessment()`
- Assessors must use per-area `approve_area()` endpoint instead

### 3. Frontend Changes

#### AssessorValidationClient.tsx

**New imports:**

```typescript
import {
  usePostAssessorAssessmentsAssessmentIdAreasGovernanceAreaIdApprove,
  usePostAssessorAssessmentsAssessmentIdAreasGovernanceAreaIdRework,
} from "@sinag/shared";
```

**New mutations:**

```typescript
const areaApproveMut = usePostAssessorAssessmentsAssessmentIdAreasGovernanceAreaIdApprove();
const areaReworkMut = usePostAssessorAssessmentsAssessmentIdAreasGovernanceAreaIdRework();
```

**Role detection:**

```typescript
const isAssessor = userRole === "ASSESSOR";
const assessorAreaId = user?.assessor_area_id ?? null;
const isAssessorWithoutArea = isAssessor && !assessorAreaId;
```

## Status Flow Changes

### Before (Nov 2025)

```
SUBMITTED → Assessor Reviews → Finalize → AWAITING_FINAL_VALIDATION → Validator Reviews
```

### After (Jan 2026)

```
SUBMITTED → 6 Assessors Review Per-Area → All 6 Approve → AWAITING_FINAL_VALIDATION → Validator Reviews
```

The key difference is that status now moves to `AWAITING_FINAL_VALIDATION` only when all 6
governance areas have been approved by their respective assessors.

## Migration Steps

### For Developers

1. **Pull latest code**

   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Run database migration**

   ```bash
   cd apps/api
   alembic upgrade head
   ```

3. **Regenerate TypeScript types**

   ```bash
   pnpm generate-types
   ```

4. **Update any custom code** that references `validator_area_id` to use `assessor_area_id`

### For Production Deployment

1. **Backup database before migration**

2. **Run migration during maintenance window**

   ```bash
   cd apps/api
   alembic upgrade head
   ```

3. **Verify migration success**

   ```bash
   # Check new fields exist
   psql -d sinag -c "\\d assessments" | grep area_

   # Check field rename
   psql -d sinag -c "\\d users" | grep assessor_area_id
   ```

4. **Update existing VALIDATOR users** to remove area assignments (they no longer need them)

5. **Assign ASSESSOR users** to their governance areas via `assessor_area_id`

## Testing Checklist

### Backend Tests

- [ ] Assessor can only approve their assigned governance area
- [ ] Assessor is blocked from approving other governance areas
- [ ] Assessor is blocked from using `finalize_assessment()`
- [ ] Validator can see all governance areas (system-wide)
- [ ] All 6 areas must be approved before status moves to `AWAITING_FINAL_VALIDATION`
- [ ] `rework_round_used` is set to `true` after first rework request

### Frontend Tests

- [ ] Assessor queue only shows relevant assessments
- [ ] Assessor sees only their governance area in tree navigation
- [ ] Header shows governance area context for assessors
- [ ] Progress shows "X/6 areas approved"
- [ ] Per-area approve/rework buttons work correctly

## Rollback Procedure

If issues arise, rollback using:

```bash
cd apps/api
alembic downgrade -1
```

**Warning**: This will:

- Revert `assessor_area_id` to `validator_area_id`
- Remove per-area tracking fields
- Require frontend redeployment with old code

## Support

For questions or issues:

- Check [docs/workflows/assessor-validation.md](../workflows/assessor-validation.md) for detailed
  workflow
- Check [docs/architecture/user-roles.md](../architecture/user-roles.md) for role definitions
- Contact development team

## Changelog

**January 2026**

- Swapped area assignment between Assessors and Validators
- Added per-area approval workflow (6 assessors for 6 areas)
- Added new per-area endpoints
- Updated frontend to use per-area mutations for assessors
