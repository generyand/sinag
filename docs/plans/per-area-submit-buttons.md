# Per-Governance-Area Submit Buttons for BLGU Assessment

## Overview

Convert BLGU assessment submission from a single global "Submit Assessment" button to
per-governance-area submit buttons. Each of the 6 governance areas will have its own submit button,
allowing BLGUs to submit areas independently to their assigned assessors.

**Current Flow:**

```
BLGU fills all 6 areas → Clicks "Submit Assessment" → ENTIRE assessment submitted
```

**New Flow:**

```
BLGU fills Area 1 → Clicks "Submit" on Area 1 → Area 1 sent to Assessor 1
BLGU fills Area 2 → Clicks "Submit" on Area 2 → Area 2 sent to Assessor 2
... (repeat for all 6 areas independently)
```

## Backend Status (No Changes Needed)

The backend infrastructure already exists:

- `area_submission_service.py` - `submit_area()` and `resubmit_area()` methods
- API endpoints at `POST /assessments/{id}/areas/{area_id}/submit` and `/resubmit`
- Generated hooks: `usePostAssessmentsAssessmentIdAreasGovernanceAreaIdSubmit`
- `area_submission_status` JSON field tracks each area's status

---

## Implementation Plan

### Step 1: Create `AreaSubmitButton.tsx` Component

**File:** `apps/web/src/components/features/assessments/tree-navigation/AreaSubmitButton.tsx`

Create a new component that:

- Shows "Submit" button when area is 100% complete and in `draft` status
- Shows "Resubmit" button when area is in `rework` status and complete
- Shows status badges for `submitted`, `in_review`, `approved` states
- Includes confirmation dialog before submission
- Uses `usePostAssessmentsAssessmentIdAreasGovernanceAreaIdSubmit` hook

**Button States:** | Area Status | Area Complete | Shows | |-------------|---------------|-------| |
draft | No | Nothing | | draft | Yes | "Submit" button (green) | | submitted | - | "Submitted" badge
| | in_review | - | "In Review" badge | | rework | Yes | "Resubmit" button (orange) | | approved | -
| "Approved" badge (green) |

### Step 2: Modify `AssessmentTreeNode.tsx`

**File:** `apps/web/src/components/features/assessments/tree-navigation/AssessmentTreeNode.tsx`

Add new props and render `AreaSubmitButton` for area-type nodes:

- `assessmentId: string`
- `areaStatus: AreaStatusType`
- `assessmentStatus: string`
- `onAreaSubmitSuccess: () => void`

**Layout:** `[Chevron] [Logo] [Area Name] [Progress 9/9] [Submit Button/Badge]`

### Step 3: Modify `TreeNavigator.tsx`

**File:** `apps/web/src/components/features/assessments/tree-navigation/TreeNavigator.tsx`

- Add `useGetAssessmentsAssessmentIdAreaStatus` hook to fetch per-area status
- Pass area status data to each `AssessmentTreeNode`
- Handle refetch after successful submission

### Step 4: Modify `AssessmentHeader.tsx`

**File:** `apps/web/src/components/features/assessments/AssessmentHeader.tsx`

- Remove the global "Submit Assessment" button (lines ~395-563)
- Keep progress stats (indicators count, completion percentage)
- Optionally add "X/6 areas submitted" summary

### Step 5: Add Type Definitions

**File:** `apps/web/src/types/assessment.ts`

```typescript
export type AreaStatusType = "draft" | "submitted" | "in_review" | "rework" | "approved";

export interface AreaSubmissionStatus {
  status: AreaStatusType;
  submitted_at?: string;
  approved_at?: string;
  rework_requested_at?: string;
  rework_comments?: string;
}
```

---

## Files to Modify

| File                                                                                  | Action                                            |
| ------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `apps/web/src/components/features/assessments/tree-navigation/AreaSubmitButton.tsx`   | **CREATE** - New per-area submit button component |
| `apps/web/src/components/features/assessments/tree-navigation/AssessmentTreeNode.tsx` | **MODIFY** - Add props, render AreaSubmitButton   |
| `apps/web/src/components/features/assessments/tree-navigation/TreeNavigator.tsx`      | **MODIFY** - Fetch area status, pass to nodes     |
| `apps/web/src/components/features/assessments/AssessmentHeader.tsx`                   | **MODIFY** - Remove global submit button          |
| `apps/web/src/types/assessment.ts`                                                    | **MODIFY** - Add area status types                |

---

## UI Design

**Sidebar Area Row:**

```
[>] [Icon] Financial Ad... 9/9  [Submit]
[>] [Icon] Disaster Pre... 9/9  [Submit]
[>] [Icon] Safety, Pe...  22/22 [Submitted ✓]
[>] [Icon] Social Prot... 0/34  (no button - incomplete)
[>] [Icon] Business-Fr... 4/4   [Submit]
[>] [Icon] Environment... 6/6   [Submit]
```

**Confirmation Dialog:**

```
Title: Submit Financial Administration for Review?

Once submitted, this area will be locked for editing.
The assigned assessor will review your submission.

[Cancel] [Submit Area]
```

---

## Verification

1. **Test initial submission:** Complete one area, verify submit button appears, submit, verify
   status changes to "Submitted"
2. **Test partial submission:** Submit 2-3 areas, verify others still show submit buttons
3. **Test rework flow:** Have assessor send area back, verify "Resubmit" button appears
4. **Test locking:** Submit all areas, verify no more submit buttons shown
5. **Verify assessor receives:** Check assessor queue shows only their assigned area
