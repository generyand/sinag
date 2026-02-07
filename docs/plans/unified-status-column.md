# Plan: Unified STATUS Column and ACTIONS for Assessor/Validator Views

## Overview

Combine "Status (in this Area)" and "Overall Status" columns into a single **STATUS** column with 6
specific status labels, and align **ACTIONS** accordingly.

## Target State

### STATUS Column (Single Column)

| Status Label              | Condition                                          |
| ------------------------- | -------------------------------------------------- |
| Awaiting Assessment       | First submission, area_progress = 0                |
| Assessment In Progress    | First submission, area_progress > 0, not approved  |
| Sent for Rework           | submission_type = "rework_pending"                 |
| Awaiting Re-Review        | Resubmission, re_review_progress = 0               |
| Re-Assessment in Progress | Resubmission, re_review_progress > 0, not approved |
| Reviewed                  | area_status = "approved"                           |

### ACTIONS (Aligned with STATUS)

| STATUS                    | ACTION           | Style           |
| ------------------------- | ---------------- | --------------- |
| Awaiting Assessment       | Start Review     | Blue gradient   |
| Assessment In Progress    | Continue Review  | Blue outline    |
| Sent for Rework           | View             | Gray/ghost      |
| Awaiting Re-Review        | Re-Review        | Orange gradient |
| Re-Assessment in Progress | Resume Re-Review | Orange outline  |
| Reviewed                  | View             | Gray/ghost      |

---

## Implementation Steps

### Step 1: Backend - Add re_review_progress Field

**File:** `apps/api/app/schemas/assessor.py`

- Add `re_review_progress: int = 0` to `AssessorQueueItem` class

**File:** `apps/api/app/services/assessor_service.py` (lines 185-276)

- Calculate `re_review_progress` by counting responses where `updated_at >= rework_submitted_at`
- Add to returned item dict

```python
# Calculate re-review progress for resubmissions
re_review_progress = 0
if submission_type == "rework_resubmission" and a.rework_submitted_at:
    re_reviewed_count = sum(
        1 for r in area_responses
        if r.response_data
        and any(k.startswith("assessor_val_") for k in r.response_data.keys())
        and r.updated_at and r.updated_at >= a.rework_submitted_at
    )
    re_review_progress = round((re_reviewed_count / total_count * 100) if total_count > 0 else 0)
```

### Step 2: Generate Types

```bash
pnpm generate-types
```

### Step 3: Frontend Types

**File:** `apps/web/src/types/submissions.ts`

- Add `UnifiedStatus` type with 6 values
- Add `unifiedStatus` and `reReviewProgress` fields to `BarangaySubmission`

```typescript
export type UnifiedStatus =
  | "awaiting_assessment"
  | "assessment_in_progress"
  | "sent_for_rework"
  | "awaiting_re_review"
  | "re_assessment_in_progress"
  | "reviewed";
```

### Step 4: Status Configuration

**File:** `apps/web/src/components/features/submissions/utils/statusConfig.ts`

- Add `UNIFIED_STATUS_CONFIG` with label, colors, action config for each status
- Add `UNIFIED_STATUS_FILTER_OPTIONS` for filters

### Step 5: Assessor Page

**File:** `apps/web/src/app/(app)/assessor/submissions/page.tsx`

- Replace `mapStatusToAreaStatus` and `mapStatusToOverallStatus` with single `mapToUnifiedStatus`
- Update data transformation to use unified status
- Update filter logic

```typescript
function mapToUnifiedStatus(item: AssessorQueueItem): UnifiedStatus {
  if (item.area_status?.toLowerCase() === "approved") return "reviewed";
  if (item.submission_type === "rework_pending") return "sent_for_rework";
  if (item.submission_type === "rework_resubmission") {
    return (item.re_review_progress ?? 0) === 0
      ? "awaiting_re_review"
      : "re_assessment_in_progress";
  }
  return (item.area_progress ?? 0) === 0 ? "awaiting_assessment" : "assessment_in_progress";
}
```

### Step 6: Validator Page

**File:** `apps/web/src/app/(app)/validator/submissions/page.tsx`

- Apply same unified status mapping logic

### Step 7: SubmissionsTable

**File:** `apps/web/src/components/features/submissions/SubmissionsTable.tsx`

- Remove "Status (in this Area)" column
- Remove "Overall Status" column
- Add single "Status" column using unified status badge
- Update `getActionButton()` to use `UNIFIED_STATUS_CONFIG`

### Step 8: SubmissionsFilters

**File:** `apps/web/src/components/features/submissions/SubmissionsFilters.tsx`

- Replace `statusOptions` with `UNIFIED_STATUS_FILTER_OPTIONS`

---

## Files to Modify

| File                                                                  | Changes                               |
| --------------------------------------------------------------------- | ------------------------------------- |
| `apps/api/app/schemas/assessor.py`                                    | Add `re_review_progress` field        |
| `apps/api/app/services/assessor_service.py`                           | Calculate re_review_progress          |
| `apps/web/src/types/submissions.ts`                                   | Add `UnifiedStatus` type              |
| `apps/web/src/components/features/submissions/utils/statusConfig.ts`  | Add unified status config             |
| `apps/web/src/app/(app)/assessor/submissions/page.tsx`                | Unified status mapping                |
| `apps/web/src/app/(app)/validator/submissions/page.tsx`               | Unified status mapping                |
| `apps/web/src/components/features/submissions/SubmissionsTable.tsx`   | Single status column, updated actions |
| `apps/web/src/components/features/submissions/SubmissionsFilters.tsx` | New filter options                    |

---

## Verification

1. Run `pnpm dev` and test assessor submissions view
2. Verify all 6 status labels display correctly with proper colors
3. Verify actions match status criteria (button text and colors)
4. Test validator submissions view alignment
5. Test status filters work correctly
6. Run `pnpm type-check` for TypeScript errors
7. Run `pnpm lint` to check for issues
