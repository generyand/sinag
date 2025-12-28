# BBI Functionality Compliance Rate Implementation Plan

## Overview

Implement percentage-based BBI functionality ratings following DILG MC 2024-417 guidelines. Each BBI
will have a compliance rate calculated from sub-indicator pass/fail status, mapped to a 3-tier
adjectival rating.

### Rating Tiers (per DILG MC)

| Compliance Rate | Adjectival Rating     |
| --------------- | --------------------- |
| 75% - 100%      | Highly Functional     |
| 50% - 74%       | Moderately Functional |
| Below 50%       | Low Functional        |

### Calculation Logic

```
Sub-indicator PASSES if: All required checklist items are checked/satisfied
Sub-indicator FAILS if: Any required checklist item is not satisfied

Compliance Rate = (Passed Sub-Indicators / Total Sub-Indicators) × 100%
```

---

## Phase 1: Backend Schema Changes

### 1.1 Extend BBIStatus Enum

**File**: `apps/api/app/db/enums.py`

```python
class BBIStatus(str, enum.Enum):
    HIGHLY_FUNCTIONAL = "HIGHLY_FUNCTIONAL"        # 75-100%
    MODERATELY_FUNCTIONAL = "MODERATELY_FUNCTIONAL"  # 50-74%
    LOW_FUNCTIONAL = "LOW_FUNCTIONAL"              # <50%
    # Legacy values for backward compatibility
    FUNCTIONAL = "FUNCTIONAL"
    NON_FUNCTIONAL = "NON_FUNCTIONAL"
```

### 1.2 Extend BBIResult Model

**File**: `apps/api/app/db/models/bbi.py`

Add new fields to `BBIResult`:

- `compliance_percentage: Float` - Calculated percentage (0-100)
- `compliance_rating: BBIStatus` - 3-tier rating
- `sub_indicator_results: JSON` - Details of each sub-indicator's pass/fail

### 1.3 Database Migration

Create Alembic migration to:

1. Add new enum values to `bbi_status_enum`
2. Add `compliance_percentage` column (Float, nullable)
3. Add `compliance_rating` column (using extended enum)
4. Add `sub_indicator_results` column (JSONB, nullable)

---

## Phase 2: Backend Service Logic

### 2.1 Update BBI Service Calculation

**File**: `apps/api/app/services/bbi_service.py`

New calculation method:

```python
def calculate_bbi_compliance(
    self,
    db: Session,
    bbi_id: int,
    assessment_id: int
) -> BBIResult:
    """
    Calculate BBI compliance rate based on sub-indicator checklist results.

    1. Get the BBI's linked indicator (e.g., 2.1 for BDRRMC)
    2. Get all sub-indicators (e.g., 2.1.1, 2.1.2, 2.1.3, 2.1.4)
    3. For each sub-indicator, check if all required checklist items passed
    4. Calculate percentage: passed_sub_indicators / total_sub_indicators
    5. Map to 3-tier rating
    """
```

### 2.2 Sub-Indicator Pass/Fail Logic

```python
def _evaluate_sub_indicator(
    self,
    db: Session,
    assessment_id: int,
    sub_indicator: Indicator
) -> dict:
    """
    Evaluate if a sub-indicator passes based on checklist items.

    Returns:
        {
            "code": "2.1.1",
            "name": "Structure",
            "passed": True/False,
            "checklist_results": {
                "2_1_1_eo": True,
                "2_1_1_date": True
            }
        }
    """
```

### 2.3 Rating Determination

```python
def _get_compliance_rating(self, percentage: float) -> BBIStatus:
    if percentage >= 75:
        return BBIStatus.HIGHLY_FUNCTIONAL
    elif percentage >= 50:
        return BBIStatus.MODERATELY_FUNCTIONAL
    else:
        return BBIStatus.LOW_FUNCTIONAL
```

---

## Phase 3: Backend Schema Updates

### 3.1 Update BBI Schemas

**File**: `apps/api/app/schemas/bbi.py`

```python
class BBIComplianceResult(BaseModel):
    bbi_id: int
    bbi_name: str
    bbi_abbreviation: str
    assessment_id: int
    compliance_percentage: float
    compliance_rating: str  # HIGHLY_FUNCTIONAL, MODERATELY_FUNCTIONAL, LOW_FUNCTIONAL
    sub_indicators_passed: int
    sub_indicators_total: int
    sub_indicator_results: list[SubIndicatorResult]
    calculation_date: datetime

class SubIndicatorResult(BaseModel):
    code: str  # e.g., "2.1.1"
    name: str  # e.g., "Structure"
    passed: bool
    checklist_summary: dict  # Summary of checklist item results
```

### 3.2 New API Response Schema

```python
class AssessmentBBIComplianceResponse(BaseModel):
    assessment_id: int
    barangay_name: str
    bbi_results: list[BBIComplianceResult]
    overall_summary: dict  # Aggregate stats
```

---

## Phase 4: API Endpoints

### 4.1 New/Updated Endpoints

**File**: `apps/api/app/api/v1/bbis.py`

```python
# Get BBI compliance for an assessment (with percentage details)
GET /api/v1/bbis/compliance/assessment/{assessment_id}
Response: AssessmentBBIComplianceResponse

# Get single BBI compliance detail
GET /api/v1/bbis/{bbi_id}/compliance/assessment/{assessment_id}
Response: BBIComplianceResult
```

### 4.2 Update Existing Endpoints

Update `GET /api/v1/bbis/results/assessment/{assessment_id}` to include:

- `compliance_percentage`
- `compliance_rating`
- `sub_indicator_results`

---

## Phase 5: Frontend - BLGU Dashboard

### 5.1 Add BBI Status to Verdict Section

**File**: `apps/web/src/components/features/blgu/dashboard/VerdictSection.tsx`

Add a new card showing BBI functionality ratings when assessment is COMPLETED:

```tsx
<BBIVerdictCard assessmentId={assessment.id} showWhen={assessment.status === "COMPLETED"} />
```

### 5.2 Create BBIVerdictCard Component

**File**: `apps/web/src/components/features/blgu/dashboard/BBIVerdictCard.tsx`

Display:

- List of 7 BBIs with their compliance ratings
- Color-coded badges (Green=Highly, Yellow=Moderate, Red=Low)
- Percentage for each BBI
- Expandable view showing sub-indicator breakdown

---

## Phase 6: Frontend - GAR Report

### 6.1 Add BBI Section to GAR

**File**: `apps/web/src/components/features/reports/GARReportDisplay.tsx`

Add new section after governance areas showing BBI functionality:

```tsx
<BBIComplianceSection assessmentId={selectedAssessment.id} barangayName={selectedBarangay.name} />
```

### 6.2 Include in Export

Update PDF/Excel export to include BBI compliance table with:

- BBI name
- Compliance percentage
- Adjectival rating
- Sub-indicator breakdown

---

## Phase 7: Frontend - Validator Page

### 7.1 Show BBI Preview During Validation

**File**: `apps/web/src/app/(app)/validator/submissions/[id]/page.tsx`

Add read-only BBI status preview panel:

- Shows current compliance calculation based on checked items
- Updates in real-time as validator checks/unchecks items
- Informational only (validators don't directly set BBI status)

---

## Phase 8: Frontend - MLGOO Analytics

### 8.1 BBI Analytics Summary

**File**: `apps/web/src/app/(app)/mlgoo/dashboard/page.tsx`

Add KPI card showing aggregate BBI stats:

- Total barangays with Highly Functional BBIs
- Percentage breakdown by rating tier
- Trend vs previous cycle

### 8.2 Detailed BBI Analytics Tab

Leverage existing `BBIFunctionalityWidget` in analytics page (already implemented).

---

## Implementation Order

### Week 1: Backend Foundation

1. [ ] Extend BBIStatus enum
2. [ ] Create database migration
3. [ ] Update BBIResult model
4. [ ] Implement compliance calculation service
5. [ ] Update/create API endpoints
6. [ ] Update schemas
7. [ ] Run `pnpm generate-types`

### Week 2: Frontend Integration

1. [ ] BLGU Dashboard - BBIVerdictCard
2. [ ] GAR Report - BBIComplianceSection
3. [ ] GAR Export - Include BBI data
4. [ ] Validator - BBI preview panel
5. [ ] MLGOO Dashboard - BBI KPI card

### Week 3: Testing & Polish

1. [ ] Unit tests for calculation logic
2. [ ] Integration tests for API endpoints
3. [ ] E2E tests for frontend flows
4. [ ] UI polish and responsive design
5. [ ] Documentation updates

---

## Files to Modify

### Backend

- `apps/api/app/db/enums.py` - Extend BBIStatus enum
- `apps/api/app/db/models/bbi.py` - Add compliance fields to BBIResult
- `apps/api/app/services/bbi_service.py` - New compliance calculation logic
- `apps/api/app/schemas/bbi.py` - New response schemas
- `apps/api/app/api/v1/bbis.py` - New/updated endpoints
- `apps/api/alembic/versions/` - New migration file

### Frontend

- `apps/web/src/components/features/blgu/dashboard/VerdictSection.tsx`
- `apps/web/src/components/features/blgu/dashboard/BBIVerdictCard.tsx` (new)
- `apps/web/src/components/features/reports/GARReportDisplay.tsx`
- `apps/web/src/components/features/reports/BBIComplianceSection.tsx` (new)
- `apps/web/src/app/(app)/validator/submissions/[id]/page.tsx`
- `apps/web/src/app/(app)/mlgoo/dashboard/page.tsx`

### Generated (auto)

- `packages/shared/src/generated/` - After running `pnpm generate-types`

---

## Data Flow

```
Validator checks checklist items during validation
    ↓
ChecklistItemResponse stored in assessment_responses
    ↓
BBI Service reads checklist results for each sub-indicator
    ↓
Calculate: passed_sub_indicators / total_sub_indicators
    ↓
Map percentage to rating tier (Highly/Moderately/Low Functional)
    ↓
Store in bbi_results table with compliance_percentage, compliance_rating
    ↓
API returns BBIComplianceResult with full breakdown
    ↓
Frontend displays rating with visual indicators
```

---

## Open Questions

1. **When to calculate BBI compliance?**
   - Option A: Real-time during validation (updates as items are checked)
   - Option B: On assessment finalization only
   - **Recommendation**: On finalization, with preview during validation

2. **Backward compatibility?**
   - Existing BBIResult records have only FUNCTIONAL/NON_FUNCTIONAL
   - **Recommendation**: Keep legacy values, calculate new values for new assessments

3. **What if a BBI indicator has no sub-indicators?**
   - Some indicators might be flat (no children)
   - **Recommendation**: Treat as single sub-indicator (100% or 0%)
