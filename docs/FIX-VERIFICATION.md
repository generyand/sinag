# Fix Verification Summary

## Task 1: Per-Area Submission Bug Fix

### Problem

When BLGU Laperas submitted only Business Friendliness (Area 5), the system incorrectly:

- Treated it as if ALL governance areas were submitted
- Showed "ASSESSMENT SUBMITTED" banner (yellow circle)
- Sent notifications to ALL assessors (violet circle)

### Expected Behavior

- Only the assessor assigned to Area 5 should receive notification
- "ASSESSMENT SUBMITTED" banner should only show when ALL 6 areas are submitted
- Assessment status should remain DRAFT until all areas are submitted
- Each assessor should only see assessments where THEIR area has been submitted

### Root Cause Analysis

There was a **mismatch** between the per-area submission logic and the assessor queue query:

1. **area_submission_service.py** (per-area fix):
   - Kept status as `DRAFT` until ALL 6 areas submitted
   - Only set `submitted_at` when ALL 6 areas submitted

2. **assessor_service.py** (queue query):
   - Filtered by `status.in_([SUBMITTED, IN_REVIEW, ...])` - **DRAFT was NOT included**
   - Filtered by `submitted_at.isnot(None)`

**Result**: When BLGU submitted only Area 5, the assessment didn't appear in ANY assessor's queue
(not even Area 5's assessor) because:

- Status was DRAFT (not in the filter list)
- submitted_at was NULL

The bug seen in the screenshot was likely from legacy data where status was already SUBMITTED.

### Fix Applied

**File 1**: `apps/api/app/services/area_submission_service.py`

**Changes**:

1. Set `submitted_at` when FIRST area is submitted (not just when all areas submitted)
   - This allows the assessment to appear in assessor queues
   - The per-area filtering ensures only the correct assessor sees it
2. Keep status as DRAFT until ALL 6 areas are submitted (unchanged)
3. Handle edge case where status might already be SUBMITTED (legacy data)

```python
# CRITICAL FIX: Set submitted_at when FIRST area is submitted
if assessment.submitted_at is None:
    assessment.submitted_at = now
    logger.info(f"First area ({governance_area_id}) submitted...")
```

**File 2**: `apps/api/app/services/assessor_service.py`

**Changes**:

1. Include DRAFT in the status filter for assessors
   - Per-area workflow keeps status as DRAFT until all areas submitted
   - The Python loop filters by per-area status to show only relevant assessments

```python
query = query.filter(
    Assessment.status.in_(
        [
            AssessmentStatus.DRAFT,  # Per-area workflow: status stays DRAFT
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.IN_REVIEW,
            ...
        ]
    ),
)
```

**Notification Logic**: Already correct

- Uses `notify_assessors_for_governance_area()` which filters by
  `assessor_area_id == governance_area_id`
- Only sends to assessors assigned to the specific governance area

**Frontend Banner Logic**: Already correct

- `LockedStateBanner.tsx` returns `null` for DRAFT status
- With backend fix, status remains DRAFT until all areas submitted, so banner won't show

### Verification Steps

1. BLGU submits Area 5 only:
   - `area_submission_status["5"] = {"status": "submitted", ...}`
   - `submitted_at` is set (first area timestamp)
   - Status remains DRAFT
   - Notification sent ONLY to Area 5 assessor

2. Area 5 assessor sees it in queue:
   - Query passes: status=DRAFT is now included, submitted_at is set
   - Per-area filter passes: Area 5 status is "submitted"

3. Area 6 (Social Protection) assessor does NOT see it:
   - Query passes: same as above
   - Per-area filter FAILS: Area 6 status is "draft" -> `continue` (skipped)

4. Frontend banner does NOT show:
   - Status is DRAFT -> `LockedStateBanner` returns null

---

## Task 2: Per-Area Rework Implementation Status

**Status**: **YES, PER-AREA REWORK IS IMPLEMENTED CORRECTLY**

### Per-Area Rework Logic

Each governance area (1-6) has its own independent `rework_used` flag:

**Location**: `apps/api/app/services/assessor_service.py`

```python
# Line 1542: Check per-area rework usage
if area_data.get("rework_used", False):
    raise ValueError("Rework round has already been used for this governance area...")

# Line 1581: Mark per-area rework as used
area_data = {
    "status": "rework",
    "rework_used": True,  # Per-area flag
    ...
}
```

### Rework Structure (Correct)

```
Area 1: 1 independent rework
Area 2: 1 independent rework
Area 3: 1 independent rework
Area 4: 1 independent rework
Area 5: 1 independent rework
Area 6: 1 independent rework
```

NOT a shared rework across all areas.

---

## Task 3: STAGING Rework Revert Script

**Script**: `apps/api/scripts/revert_staging_rework.py`

### What it does

| Requirement                                     | Status    | Implementation                            |
| ----------------------------------------------- | --------- | ----------------------------------------- |
| Revert area status from "rework" -> "submitted" | Done      | Lines 103-109                             |
| Remove resubmitted files (soft delete)          | Done      | Lines 124-140                             |
| Reset `rework_used = False` for all areas       | Done      | Line 112                                  |
| Preserve assessor notes (FeedbackComment)       | Done      | Not touched                               |
| Set correct status after revert                 | **Fixed** | Now sets DRAFT if not all areas submitted |

### Fix Applied to Revert Script

The script was setting status to SUBMITTED after revert, but with per-area workflow it should be
DRAFT if not all areas are submitted.

```python
# Determine correct status based on per-area workflow
if all_areas_submitted:
    assessment.status = AssessmentStatus.SUBMITTED
else:
    # Per-area workflow: Keep as DRAFT until all areas submitted
    assessment.status = AssessmentStatus.DRAFT
```

### How to Run

```bash
cd apps/api
python scripts/revert_staging_rework.py
```

---

## Task 4: Disable Maintenance Page

Set environment variable in STAGING:

```
NEXT_PUBLIC_MAINTENANCE_MODE=false
```

---

## Summary

| Task                    | Status                         | Files Changed                                       |
| ----------------------- | ------------------------------ | --------------------------------------------------- |
| Per-area submission bug | **FIXED**                      | `area_submission_service.py`, `assessor_service.py` |
| Per-area rework         | **Verified** (already correct) | No changes needed                                   |
| Revert script           | **FIXED**                      | `revert_staging_rework.py`                          |
| Maintenance mode        | **Instructions**               | Set env var                                         |

**Ready for testing and deployment!**
