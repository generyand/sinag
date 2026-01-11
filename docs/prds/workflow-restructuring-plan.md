# SINAG Workflow Restructuring Implementation Plan

## Overview

Swap ASSESSOR and VALIDATOR roles and implement per-area submission for BLGUs.

See [workflow-restructuring-visualization.md](./workflow-restructuring-visualization.md) for Mermaid
diagrams.

---

## Design Decisions

| Decision                  | Choice                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| Validator visibility      | Only after ALL 6 assessors approve their areas                     |
| Partial rework            | BLGU can submit other areas while one is in rework                 |
| Validator-BLGU assignment | Clusters assigned, validators decide IRL (no system enforcement)   |
| Calibration scope         | For specific indicators                                            |
| Status tracking           | Per-area status                                                    |
| Assessor queue            | Only see explicitly submitted areas                                |
| Migration strategy        | Clean reset - revert to first-submitted, discard rework history    |
| Field naming              | Rename `validator_area_id` → `assessor_area_id`                    |
| Notification              | Yes, notify BLGU when all 6 assessors approve (moves to validator) |
| Assessor visibility       | Don't show which assessor is assigned on BLGU dashboard            |
| Rework limit              | 1 total, compiled from all 6 assessors (all rework = 1 round)      |
| Calibration limit         | 1 total from Validator                                             |
| RE-Calibration flow       | MLGOO → BLGU → Validator → MLGOO (final approval)                  |

---

## Current vs New System

| Aspect         | Current                                                   | New                                                             |
| -------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| **ASSESSOR**   | System-wide, reviews ALL areas, requests REWORK           | Area-specific (6 users), reviews ASSIGNED area, requests REWORK |
| **VALIDATOR**  | Area-specific (`validator_area_id`), requests CALIBRATION | System-wide (3 users), reviews ALL areas, requests CALIBRATION  |
| **Field**      | `validator_area_id` for VALIDATOR                         | `assessor_area_id` for ASSESSOR                                 |
| **User Count** | Variable                                                  | 6 Assessors, 3 Validators                                       |

### New Workflow

```
BLGU → Submit Area(s) → ASSESSOR (area-specific) → [All 6 approved] → VALIDATOR (system-wide) → MLGOO
                              ↓ REWORK                                       ↓ CALIBRATION        ↓ RE-CALIBRATION
                                                                             ↑______________________________________|
                                                                             (RE-CALIBRATION goes back to VALIDATOR)
```

**RE-CALIBRATION Flow**: MLGOO → BLGU fixes → VALIDATOR reviews → MLGOO approves

---

## Phase 1: Database Migration

### 1.1 Create Migration File

**File**: `apps/api/alembic/versions/xxxx_swap_assessor_validator_roles.py`

**Steps**:

1. Add temporary enum values (`ASSESSOR_TEMP`, `VALIDATOR_TEMP`)
2. Swap user data to temporary values
3. Swap to final values (old ASSESSORs → VALIDATORs, old VALIDATORs → ASSESSORs)
4. Rename column `validator_area_id` → `assessor_area_id`
5. Add new JSON fields for per-area tracking
6. Reset reworked assessments (clean reset)
7. Clean up temporary enum values

```sql
-- Step 1: Add temporary enum values
ALTER TYPE user_role_enum ADD VALUE 'ASSESSOR_TEMP';
ALTER TYPE user_role_enum ADD VALUE 'VALIDATOR_TEMP';

-- Step 2: Swap to temporary values
UPDATE users SET role = 'ASSESSOR_TEMP' WHERE role = 'ASSESSOR';
UPDATE users SET role = 'VALIDATOR_TEMP' WHERE role = 'VALIDATOR';

-- Step 3: Swap to final values
UPDATE users SET role = 'VALIDATOR' WHERE role = 'ASSESSOR_TEMP';
UPDATE users SET role = 'ASSESSOR' WHERE role = 'VALIDATOR_TEMP';

-- Step 4: Rename column
ALTER TABLE users RENAME COLUMN validator_area_id TO assessor_area_id;

-- Step 5: Add new fields to assessments
ALTER TABLE assessments ADD COLUMN area_submission_status JSONB DEFAULT '{}';
ALTER TABLE assessments ADD COLUMN area_assessor_approved JSONB DEFAULT '{}';

-- Step 6: Reset reworked assessments (clean reset)
UPDATE assessments
SET
    status = 'SUBMITTED',
    rework_comments = NULL,
    rework_count = 0,
    rework_requested_at = NULL,
    rework_submitted_at = NULL,
    rework_summary = NULL
WHERE status = 'REWORK';

-- Step 7: Initialize area_submission_status for existing SUBMITTED assessments
-- (Will be handled in Python migration code)
```

### 1.2 Per-Area Submission Schema

**Add to `assessments` table**:

```python
# Per-area status tracking
area_submission_status = Column(JSON, default={})
# Format:
# {
#   "1": {"status": "approved", "submitted_at": "...", "approved_at": "...", "assessor_id": "..."},
#   "2": {"status": "in_review", "submitted_at": "..."},
#   "3": {"status": "draft"},
#   "4": {"status": "rework", "submitted_at": "...", "rework_requested_at": "...", "rework_comments": "...", "assessor_id": "..."},
#   ...
# }

# Per-area approval tracking (quick lookup)
area_assessor_approved = Column(JSON, default={})
# Format: {"1": true, "2": false, "3": false, "4": false, "5": true, "6": false}
```

### Area Status Values

| Status      | Description                          |
| ----------- | ------------------------------------ |
| `draft`     | BLGU still working on this area      |
| `submitted` | BLGU submitted, waiting for assessor |
| `in_review` | Assessor is currently reviewing      |
| `rework`    | Assessor requested changes           |
| `approved`  | Assessor approved this area          |

### Compiled Rework Mechanism

**Key Rule**: All 6 assessors' rework requests count as **1 rework round**.

**How it works**:

1. BLGU submits all 6 areas
2. Assessors review their assigned areas independently
3. Some assessors may request rework, others may approve
4. BLGU sees all rework requests compiled together (from multiple areas)
5. BLGU fixes ALL areas that need rework
6. BLGU resubmits ALL rework areas together
7. This counts as the **1 allowed rework round**
8. After resubmission, assessors can only **approve** (no more rework allowed)

**Data structure**:

```python
# Assessment-level rework tracking
rework_round_used = Column(Boolean, default=False)  # True after first rework cycle

# Per-area rework tracking (in area_submission_status)
# {
#   "1": {"status": "rework", "rework_comments": "...", "is_resubmission": false},
#   "2": {"status": "approved"},
#   "3": {"status": "rework", "rework_comments": "...", "is_resubmission": false},
#   ...
# }
```

**Validation rules**:

- If `rework_round_used = True`, assessors cannot request rework again
- Assessors can only approve or wait for other areas to complete
- System enforces this at the API level

### Calibration Limit (Validator)

**Key Rule**: Only **1 calibration round** is allowed per assessment.

**How it works**:

1. Validator reviews all 6 governance areas
2. Validator can APPROVE or request CALIBRATION (for specific indicators)
3. If CALIBRATION requested, BLGU fixes and resubmits
4. System sets: `calibration_round_used = TRUE`
5. After resubmission, Validator can only **APPROVE** (no more calibration allowed)

**Data structure**:

```python
# Assessment-level calibration tracking
calibration_round_used = Column(Boolean, default=False)  # True after first calibration cycle
```

**Validation rules**:

- If `calibration_round_used = True`, Validator cannot request calibration again
- Validator can only approve to move to MLGOO
- System enforces this at the API level

### RE-Calibration Flow (MLGOO)

**Flow**: MLGOO → BLGU fixes → VALIDATOR reviews → MLGOO approves

After RE-CALIBRATION:

1. MLGOO requests RE-CALIBRATION for specific indicators
2. BLGU fixes the flagged items
3. **Assessment goes to VALIDATOR first** (not directly back to MLGOO)
4. VALIDATOR reviews and approves
5. Assessment returns to MLGOO for final approval
6. MLGOO approves → COMPLETED

### Notifications

**New notification triggers**:

| Event                        | Recipient     | Message                                                             |
| ---------------------------- | ------------- | ------------------------------------------------------------------- |
| All 6 assessors approved     | BLGU          | "Your assessment is now with the Validator for review"              |
| Area approved                | BLGU          | "Governance Area [X] has been approved by the Assessor"             |
| Area rework requested        | BLGU          | "Governance Area [X] requires changes. Please review the comments." |
| Rework resubmitted           | Assessor      | "Barangay [X] has resubmitted Governance Area [Y]"                  |
| All rework areas resubmitted | All Assessors | "Barangay [X] has completed rework for all flagged areas"           |

**Implementation**:

- Use existing notification service
- Add Celery task for batch notifications
- Consider email + in-app notifications

---

## Phase 2: Backend Model Updates

### 2.1 Update Enums

**File**: `apps/api/app/db/enums.py`

Update `UserRole` docstring:

```python
class UserRole(str, enum.Enum):
    """
    User roles in the SINAG system.

    - MLGOO_DILG: Admin/Chairman role with system-wide access
    - ASSESSOR: Area-specific (6 users for 6 governance areas) - uses assessor_area_id
                Reviews ASSIGNED governance area, can request REWORK
    - VALIDATOR: System-wide (3 DILG team members) - no area restriction
                 Reviews ALL governance areas, can request CALIBRATION
    - BLGU_USER: BLGU user role with specific barangay assignment
    - KATUPARAN_CENTER_USER: External user with read-only access
    """
```

### 2.2 Update User Model

**File**: `apps/api/app/db/models/user.py`

```python
# Rename field
assessor_area_id = Column(
    SmallInteger,
    ForeignKey("governance_areas.id"),
    nullable=True
)  # Only used when role is ASSESSOR

# Update relationship
assessor_area = relationship("GovernanceArea", back_populates="assessors")
```

### 2.3 Update GovernanceArea Model

**File**: `apps/api/app/db/models/governance_area.py`

```python
# Update relationship name
assessors = relationship("User", back_populates="assessor_area")  # was "validators"
```

### 2.4 Update Assessment Model

**File**: `apps/api/app/db/models/assessment.py`

```python
# Add new fields for per-area submission tracking
area_submission_status = Column(JSON, nullable=True, default=dict)
area_assessor_approved = Column(JSON, nullable=True, default=dict)

# Helper methods
def all_areas_approved(self) -> bool:
    """Check if all 6 governance areas are approved by assessors."""
    if not self.area_assessor_approved:
        return False
    return all(self.area_assessor_approved.get(str(i), False) for i in range(1, 7))

def get_area_status(self, governance_area_id: int) -> str:
    """Get the status of a specific governance area."""
    if not self.area_submission_status:
        return "draft"
    area_data = self.area_submission_status.get(str(governance_area_id), {})
    return area_data.get("status", "draft")
```

---

## Phase 3: Service Layer Updates

### 3.1 Update Assessor Service

**File**: `apps/api/app/services/assessor_service.py`

**Key logic changes**:

1. **`get_assessor_queue()`**: Filter by role and area

   ```python
   def get_assessor_queue(self, db: Session, user: User) -> list[Assessment]:
       """
       Get queue based on user role:
       - ASSESSOR: Only assessments where their area is submitted/in_review
       - VALIDATOR: Only assessments where ALL 6 areas are approved
       """
       if user.role == UserRole.ASSESSOR:
           # Area-specific: show assessments where their area is submitted
           area_id = str(user.assessor_area_id)
           return db.query(Assessment).filter(
               Assessment.area_submission_status[area_id]['status'].astext.in_(['submitted', 'in_review', 'rework'])
           ).all()

       elif user.role == UserRole.VALIDATOR:
           # System-wide: show assessments where all 6 areas approved
           return db.query(Assessment).filter(
               Assessment.status == AssessmentStatus.AWAITING_VALIDATION
           ).all()
   ```

2. **`send_assessment_for_rework()`**: Now ASSESSOR action (area-specific)

   ```python
   def send_area_for_rework(
       self, db: Session, assessment_id: int,
       governance_area_id: int, comments: str, assessor: User
   ) -> Assessment:
       """Send a specific governance area for rework."""
       # Validate assessor has permission for this area
       if assessor.assessor_area_id != governance_area_id:
           raise HTTPException(403, "You can only request rework for your assigned area")

       # Update area status
       assessment.area_submission_status[str(governance_area_id)] = {
           "status": "rework",
           "rework_requested_at": datetime.utcnow().isoformat(),
           "rework_comments": comments,
           "assessor_id": str(assessor.id)
       }
       assessment.area_assessor_approved[str(governance_area_id)] = False
       # ... save and return
   ```

3. **`approve_area()`**: New method for area approval

   ```python
   def approve_area(
       self, db: Session, assessment_id: int,
       governance_area_id: int, assessor: User
   ) -> Assessment:
       """Approve a specific governance area."""
       # Validate assessor has permission
       if assessor.assessor_area_id != governance_area_id:
           raise HTTPException(403, "You can only approve your assigned area")

       # Update area status
       assessment.area_submission_status[str(governance_area_id)] = {
           "status": "approved",
           "approved_at": datetime.utcnow().isoformat(),
           "assessor_id": str(assessor.id)
       }
       assessment.area_assessor_approved[str(governance_area_id)] = True

       # Check if all areas approved → move to AWAITING_VALIDATION
       if assessment.all_areas_approved():
           assessment.status = AssessmentStatus.AWAITING_VALIDATION

       # ... save and return
   ```

4. **`submit_for_calibration()`**: Now VALIDATOR action
   ```python
   def submit_for_calibration(
       self, db: Session, assessment_id: int,
       indicator_ids: list[int], comments: str, validator: User
   ) -> Assessment:
       """Request calibration for specific indicators."""
       # VALIDATOR can calibrate any area (system-wide)
       # Update calibration fields with specific indicator IDs
       # ... existing calibration logic
   ```

### 3.2 New Area Submission Service

**File**: `apps/api/app/services/area_submission_service.py`

```python
class AreaSubmissionService:
    def submit_area(
        self, db: Session, assessment_id: int,
        governance_area_id: int, user: User
    ) -> Assessment:
        """Mark a specific governance area as submitted for review."""
        assessment = self._get_assessment(db, assessment_id, user)

        # Validate user owns this assessment
        if assessment.barangay_id != user.barangay_id:
            raise HTTPException(403, "Not your assessment")

        # Validate area has required data
        self._validate_area_complete(db, assessment, governance_area_id)

        # Update area status
        assessment.area_submission_status[str(governance_area_id)] = {
            "status": "submitted",
            "submitted_at": datetime.utcnow().isoformat()
        }

        # Update overall assessment status if first submission
        if assessment.status == AssessmentStatus.DRAFT:
            assessment.status = AssessmentStatus.SUBMITTED

        db.commit()
        return assessment

    def get_area_status(
        self, db: Session, assessment_id: int
    ) -> dict:
        """Get submission status for all governance areas."""
        assessment = db.query(Assessment).get(assessment_id)
        return {
            "area_submission_status": assessment.area_submission_status,
            "area_assessor_approved": assessment.area_assessor_approved,
            "all_areas_approved": assessment.all_areas_approved()
        }

    def resubmit_area(
        self, db: Session, assessment_id: int,
        governance_area_id: int, user: User
    ) -> Assessment:
        """Resubmit an area after rework."""
        assessment = self._get_assessment(db, assessment_id, user)

        # Validate area is in rework status
        current_status = assessment.get_area_status(governance_area_id)
        if current_status != "rework":
            raise HTTPException(400, "Area is not in rework status")

        # Update area status to submitted
        area_data = assessment.area_submission_status.get(str(governance_area_id), {})
        area_data["status"] = "submitted"
        area_data["resubmitted_at"] = datetime.utcnow().isoformat()
        assessment.area_submission_status[str(governance_area_id)] = area_data

        db.commit()
        return assessment
```

---

## Phase 4: API Updates

### 4.1 Update Dependencies

**File**: `apps/api/app/api/deps.py`

```python
async def get_current_assessor_user(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> User:
    """
    Get current ASSESSOR user (area-specific).
    Must have ASSESSOR role AND assessor_area_id assigned.
    """
    if current_user.role != UserRole.ASSESSOR:
        raise HTTPException(403, "ASSESSOR role required")

    user_with_area = (
        db.query(User)
        .options(joinedload(User.assessor_area))
        .filter(User.id == current_user.id)
        .first()
    )

    if user_with_area.assessor_area is None:
        raise HTTPException(403, "Assessor must have assigned governance area")

    return user_with_area

async def get_current_validator_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get current VALIDATOR user (system-wide).
    Must have VALIDATOR role. No area restriction.
    """
    if current_user.role != UserRole.VALIDATOR:
        raise HTTPException(403, "VALIDATOR role required")
    return current_user

# Update combined dependency
async def get_current_assessor_or_validator(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> User:
    """
    Accepts both ASSESSOR and VALIDATOR roles.
    - ASSESSOR: Must have assessor_area_id assigned
    - VALIDATOR: System-wide access (no area required)
    """
    if current_user.role not in (UserRole.ASSESSOR, UserRole.VALIDATOR):
        raise HTTPException(403, "ASSESSOR or VALIDATOR role required")

    if current_user.role == UserRole.ASSESSOR:
        # Load with area relationship
        user_with_area = (
            db.query(User)
            .options(joinedload(User.assessor_area))
            .filter(User.id == current_user.id)
            .first()
        )
        if user_with_area.assessor_area is None:
            raise HTTPException(403, "Assessor must have assigned governance area")
        return user_with_area

    return current_user
```

### 4.2 Update Assessor Router

**File**: `apps/api/app/api/v1/assessor.py`

Add per-area submission endpoints:

```python
@router.post("/assessments/{assessment_id}/areas/{area_id}/submit", tags=["blgu"])
async def submit_area_for_review(
    assessment_id: int,
    area_id: int,
    user: User = Depends(get_current_blgu_user),
    db: Session = Depends(get_db),
):
    """BLGU submits a specific governance area for assessor review."""
    return area_submission_service.submit_area(db, assessment_id, area_id, user)

@router.post("/assessments/{assessment_id}/areas/{area_id}/resubmit", tags=["blgu"])
async def resubmit_area(
    assessment_id: int,
    area_id: int,
    user: User = Depends(get_current_blgu_user),
    db: Session = Depends(get_db),
):
    """BLGU resubmits an area after rework."""
    return area_submission_service.resubmit_area(db, assessment_id, area_id, user)

@router.get("/assessments/{assessment_id}/area-status", tags=["assessments"])
async def get_area_submission_status(
    assessment_id: int,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get submission status for all governance areas."""
    return area_submission_service.get_area_status(db, assessment_id)

@router.post("/assessments/{assessment_id}/areas/{area_id}/approve", tags=["assessor"])
async def approve_area(
    assessment_id: int,
    area_id: int,
    assessor: User = Depends(get_current_assessor_user),
    db: Session = Depends(get_db),
):
    """Assessor approves their assigned governance area."""
    return assessor_service.approve_area(db, assessment_id, area_id, assessor)

@router.post("/assessments/{assessment_id}/areas/{area_id}/rework", tags=["assessor"])
async def send_area_for_rework(
    assessment_id: int,
    area_id: int,
    data: ReworkRequest,
    assessor: User = Depends(get_current_assessor_user),
    db: Session = Depends(get_db),
):
    """Assessor requests rework for their assigned governance area."""
    return assessor_service.send_area_for_rework(db, assessment_id, area_id, data.comments, assessor)
```

### 4.3 Update Schemas

**Files**:

- `apps/api/app/schemas/user.py`: `validator_area_id` → `assessor_area_id`
- `apps/api/app/schemas/assessor.py`: Update queue item schema
- `apps/api/app/schemas/assessment.py`: Add area submission status schema

```python
# apps/api/app/schemas/assessment.py
class AreaStatus(BaseModel):
    status: Literal["draft", "submitted", "in_review", "rework", "approved"]
    submitted_at: datetime | None = None
    approved_at: datetime | None = None
    rework_requested_at: datetime | None = None
    rework_comments: str | None = None
    resubmitted_at: datetime | None = None
    assessor_id: str | None = None

class AreaSubmissionStatus(BaseModel):
    area_submission_status: dict[str, AreaStatus]
    area_assessor_approved: dict[str, bool]
    all_areas_approved: bool
```

---

## Phase 5: Frontend Updates

### 5.1 Navigation Configuration

**File**: `apps/web/src/lib/navigation.ts`

```typescript
// ASSESSOR navigation (area-specific)
export const assessorNavigation: NavItem[] = [
  { name: "My Area Queue", href: "/assessor/queue", icon: ClipboardList },
  { name: "Review History", href: "/assessor/history", icon: History },
  { name: "Profile", href: "/assessor/profile", icon: User },
];

// VALIDATOR navigation (system-wide)
export const validatorNavigation: NavItem[] = [
  { name: "Validation Queue", href: "/validator/queue", icon: ClipboardCheck },
  { name: "Validation History", href: "/validator/history", icon: History },
  { name: "Profile", href: "/validator/profile", icon: User },
];
```

### 5.2 Page Routes

**Directories**:

- `apps/web/src/app/(app)/assessor/` - Area-specific functionality
- `apps/web/src/app/(app)/validator/` - System-wide functionality

### 5.3 BLGU Per-Area Submission UI

**New Components**:

- `apps/web/src/components/features/blgu/AreaSubmissionPanel.tsx`
- `apps/web/src/components/features/blgu/AreaProgressCard.tsx`
- `apps/web/src/components/features/blgu/AreaStatusBadge.tsx`

**Key Features**:

- Show per-area progress cards on dashboard
- "Submit Area" button for each area
- Rework indicator with "View Comments" and "Resubmit" actions
- Visual status badges (draft, submitted, in_review, rework, approved)

### 5.4 User Management

**File**: `apps/web/src/components/features/users/UserForm.tsx`

- Update labels: "Validator Area" → "Assessor Area"
- Show area selector for ASSESSOR role (not VALIDATOR)
- VALIDATOR role should not require area selection

---

## Phase 6: Type Generation & Testing

### 6.1 Regenerate Types

```bash
pnpm generate-types
```

### 6.2 Test Migration

```bash
./scripts/test-migration.sh
```

### 6.3 Update Tests

- `apps/api/tests/api/v1/test_assessor.py`
- `apps/api/tests/services/test_assessor_service.py`
- `apps/api/tests/services/test_area_submission_service.py` (new)

---

## Phase 7: Documentation Updates

### 7.1 Update Workflow Documentation

**File**: `docs/workflows/assessor-validation.md`

### 7.2 Update CLAUDE.md

**File**: `CLAUDE.md`

Update User Roles table:

```markdown
| Role       | Responsibility                                     | Required Field     |
| ---------- | -------------------------------------------------- | ------------------ |
| MLGOO_DILG | System-wide admin, final approval                  | None               |
| ASSESSOR   | Reviews ASSIGNED governance area, requests REWORK  | `assessor_area_id` |
| VALIDATOR  | Reviews ALL governance areas, requests CALIBRATION | None               |
| BLGU_USER  | Submit assessments with MOVs                       | `barangay_id`      |
```

---

## Critical Files Summary

| File                                                  | Changes                                         |
| ----------------------------------------------------- | ----------------------------------------------- |
| `apps/api/alembic/versions/xxxx_*.py`                 | Migration script                                |
| `apps/api/app/db/enums.py`                            | Update docstrings                               |
| `apps/api/app/db/models/user.py`                      | Rename `validator_area_id` → `assessor_area_id` |
| `apps/api/app/db/models/assessment.py`                | Add per-area fields                             |
| `apps/api/app/db/models/governance_area.py`           | Update relationship                             |
| `apps/api/app/services/assessor_service.py`           | Swap role logic                                 |
| `apps/api/app/services/area_submission_service.py`    | New service                                     |
| `apps/api/app/api/deps.py`                            | Update dependencies                             |
| `apps/api/app/api/v1/assessor.py`                     | Add area submission endpoints                   |
| `apps/api/app/schemas/*.py`                           | Update field names                              |
| `apps/web/src/lib/navigation.ts`                      | Swap navigation                                 |
| `apps/web/src/app/(app)/blgu/**`                      | Per-area submission UI                          |
| `apps/web/src/components/features/users/UserForm.tsx` | Update form                                     |

---

## Verification Steps

1. **Run migration test**: `./scripts/test-migration.sh`
2. **Start API**: `pnpm dev:api` - verify no startup errors
3. **Test type generation**: `pnpm generate-types` - verify success
4. **Manual testing**:
   - Login as old VALIDATOR → should now be ASSESSOR with area
   - Login as old ASSESSOR → should now be VALIDATOR without area
   - BLGU can submit individual governance areas
   - ASSESSOR sees only submitted areas for their assigned governance area
   - VALIDATOR sees only assessments where ALL 6 areas are approved
   - Reworked assessments should be reset to SUBMITTED status
5. **Run tests**: `pnpm test`

---

## Rollback Strategy

1. Run `alembic downgrade -1` to reverse migration
2. Git revert frontend changes
3. Redeploy previous version

---

## Related Documents

- [Workflow Visualization](./workflow-restructuring-visualization.md) - Mermaid diagrams
- [Current Assessor Validation Workflow](../workflows/assessor-validation.md)
- [BLGU Assessment Workflow](../workflows/blgu-assessment.md)
