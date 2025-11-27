# BLGU Dashboard Restructure: Phase 1, Phase 2, and Verdict Sections

## Overview

Restructure the BLGU dashboard to display three distinct sections:
1. **Phase 1** - Initial self-assessment (Assessor review workflow)
2. **Phase 2** - Table validation/calibration (Validator review workflow)
3. **Verdict** - SGLGB classification result

This allows BLGU users to review completed phases anytime, providing better visibility into their assessment journey.

## Current State Analysis

### Assessment Status Flow
```
DRAFT → SUBMITTED → IN_REVIEW → [REWORK →] → AWAITING_FINAL_VALIDATION → COMPLETED
        └── Phase 1 ──────────────────────┘   └───── Phase 2 ─────────┘   └ Verdict ┘
```

### Key Database Fields (No Changes Needed)
- `status`: AssessmentStatus enum
- `rework_count`: 0 or 1 (Phase 1 rework)
- `calibration_count`: Per-area calibration tracking (Phase 2)
- `is_calibration_rework`: True when in Validator calibration
- `final_compliance_status`: PASSED/FAILED (Verdict)
- `submitted_at`: Phase 1 submission timestamp
- `validated_at`: Final validation timestamp

## Proposed UI Design

### Phase Section Component
Each phase will be a collapsible card showing:
- Phase status (In Progress / Completed / Locked)
- Phase-specific actions and information
- Timeline indicator

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│  Assessment Dashboard                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Phase 1: Initial Assessment ─────────────────────────┐  │
│  │ Status: [In Progress / Completed / Under Review]      │  │
│  │                                                       │  │
│  │ • Completion metrics (when editable)                  │  │
│  │ • Rework feedback (if REWORK status)                  │  │
│  │ • Indicator navigation                                │  │
│  │ • Submit/Resubmit button                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Phase 2: Table Validation ───────────────────────────┐  │
│  │ Status: [Not Started / In Progress / Completed]       │  │
│  │                                                       │  │
│  │ • Validator calibration feedback (if applicable)      │  │
│  │ • Calibration governance area info                    │  │
│  │ • Submit for calibration button                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Verdict: SGLGB Result ───────────────────────────────┐  │
│  │ Status: [Pending / Available]                         │  │
│  │                                                       │  │
│  │ • Final compliance status (PASSED/FAILED)             │  │
│  │ • Area results breakdown                              │  │
│  │ • AI recommendations (CapDev)                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### 1. Create Phase Section Components (Frontend)

#### A. Create `PhaseCard` base component
**File**: `apps/web/src/components/features/blgu-phases/PhaseCard.tsx`
- Collapsible card with status badge
- Active/completed/locked visual states
- Timeline connector

#### B. Create `Phase1Section` component
**File**: `apps/web/src/components/features/blgu-phases/Phase1Section.tsx`
- Shows Phase 1 content (Initial Assessment)
- Status logic:
  - `DRAFT` → "In Progress" (editable)
  - `SUBMITTED`/`IN_REVIEW` → "Under Review" (locked)
  - `REWORK` → "Needs Rework" (editable, shows feedback)
  - `AWAITING_FINAL_VALIDATION`/`COMPLETED` → "Completed" (locked, review-only)
- Contains: CompletionMetricsCard, ReworkIndicatorsPanel, AISummaryPanel, IndicatorNavigationList

#### C. Create `Phase2Section` component
**File**: `apps/web/src/components/features/blgu-phases/Phase2Section.tsx`
- Shows Phase 2 content (Table Validation)
- Status logic:
  - Before `AWAITING_FINAL_VALIDATION` → "Not Started"
  - `AWAITING_FINAL_VALIDATION` + `is_calibration_rework` → "Calibration Requested" (shows feedback)
  - `AWAITING_FINAL_VALIDATION` → "In Progress"
  - `COMPLETED` → "Completed"
- Contains: Calibration feedback, governance area info

#### D. Create `VerdictSection` component
**File**: `apps/web/src/components/features/blgu-phases/VerdictSection.tsx`
- Shows SGLGB Result (Verdict)
- Status logic:
  - Not `COMPLETED` → "Pending" (show placeholder)
  - `COMPLETED` → "Available" (show result)
- Contains: Compliance status card, area results, AI recommendations

#### E. Create barrel export
**File**: `apps/web/src/components/features/blgu-phases/index.ts`

### 2. Update BLGU Dashboard Page

**File**: `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
- Replace current flat layout with phase sections
- Keep existing data fetching (useGetBlguDashboardAssessmentId)
- Distribute existing components into phase sections

### 3. Backend Schema Enhancement (Optional)

**File**: `apps/api/app/schemas/blgu_dashboard.py`
- Add computed `phase` field to response:
  ```python
  phase: Literal["phase1", "phase2", "verdict"] = Field(
      ..., description="Current active phase based on status"
  )
  phase1_completed_at: Optional[datetime] = None
  phase2_completed_at: Optional[datetime] = None
  ```

### 4. Update Type Generation
```bash
pnpm generate-types
```

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `apps/web/src/components/features/blgu-phases/PhaseCard.tsx` | Base phase card component |
| `apps/web/src/components/features/blgu-phases/Phase1Section.tsx` | Phase 1 content |
| `apps/web/src/components/features/blgu-phases/Phase2Section.tsx` | Phase 2 content |
| `apps/web/src/components/features/blgu-phases/VerdictSection.tsx` | Verdict content |
| `apps/web/src/components/features/blgu-phases/index.ts` | Barrel export |

### Modified Files
| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/blgu/dashboard/page.tsx` | Use new phase section components |
| `apps/api/app/schemas/blgu_dashboard.py` | Add phase field (optional) |
| `apps/api/app/api/v1/blgu_dashboard.py` | Compute phase field (optional) |

## Phase Status Determination Logic

```typescript
function determinePhase(status: AssessmentStatus, isCalibrationRework: boolean): {
  phase1Status: 'in_progress' | 'under_review' | 'needs_rework' | 'completed';
  phase2Status: 'not_started' | 'in_progress' | 'calibration' | 'completed';
  verdictStatus: 'pending' | 'available';
} {
  // Phase 1 Logic
  const phase1Status =
    status === 'DRAFT' ? 'in_progress' :
    status === 'SUBMITTED' || status === 'IN_REVIEW' ? 'under_review' :
    status === 'REWORK' && !isCalibrationRework ? 'needs_rework' :
    'completed';

  // Phase 2 Logic
  const phase2Status =
    ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'REWORK'].includes(status) && !isCalibrationRework ? 'not_started' :
    status === 'AWAITING_FINAL_VALIDATION' ? 'in_progress' :
    status === 'REWORK' && isCalibrationRework ? 'calibration' :
    status === 'COMPLETED' ? 'completed' :
    'not_started';

  // Verdict Logic
  const verdictStatus = status === 'COMPLETED' ? 'available' : 'pending';

  return { phase1Status, phase2Status, verdictStatus };
}
```

## Visual Design Notes

### Phase Card States
1. **Active** (current phase): Yellow border, expanded by default
2. **Completed**: Green checkmark, collapsed by default, can expand to review
3. **Locked/Not Started**: Gray border, collapsed, shows "Coming soon" or status info

### Timeline Connector
Vertical line connecting the three phases with status indicators:
- Green circle with checkmark = Completed
- Yellow circle with spinner = In Progress
- Gray circle = Not Started

## Design Decisions (Confirmed)

1. **Verdict Section Visibility**: Show "Pending" placeholder before completion
   - BLGU users will see the Verdict section at all times
   - Shows "Pending" state until assessment reaches COMPLETED status
   - Provides transparency about what's coming next

2. **Completed Phase 1 Review**: Full read-only data
   - Show all indicators with completion status
   - Display assessor feedback history (if any)
   - All data is read-only when phase is completed

3. **Timeline**: Yes, with milestone dates
   - Show visual timeline with key dates:
     - `submitted_at`: When BLGU first submitted
     - `rework_requested_at`: When assessor requested rework (if applicable)
     - `validated_at`: When final validation completed
   - Timeline connects the three phases visually

## Additional Component: PhaseTimeline

**File**: `apps/web/src/components/features/blgu-phases/PhaseTimeline.tsx`
- Vertical timeline showing phase progression
- Key milestone dates displayed
- Visual indicators for completed/in-progress/pending states

## Updated File Changes Summary

### New Files (6 total)
| File | Purpose |
|------|---------|
| `apps/web/src/components/features/blgu-phases/PhaseCard.tsx` | Base phase card component |
| `apps/web/src/components/features/blgu-phases/Phase1Section.tsx` | Phase 1 content |
| `apps/web/src/components/features/blgu-phases/Phase2Section.tsx` | Phase 2 content |
| `apps/web/src/components/features/blgu-phases/VerdictSection.tsx` | Verdict content |
| `apps/web/src/components/features/blgu-phases/PhaseTimeline.tsx` | Timeline with dates |
| `apps/web/src/components/features/blgu-phases/index.ts` | Barrel export |

### Modified Files
| File | Changes |
|------|---------|
| `apps/web/src/app/(app)/blgu/dashboard/page.tsx` | Use new phase section components |
| `apps/api/app/schemas/blgu_dashboard.py` | Add timeline date fields |
| `apps/api/app/api/v1/blgu_dashboard.py` | Return timeline dates |
