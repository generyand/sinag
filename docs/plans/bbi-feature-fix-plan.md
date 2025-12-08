# BBI Feature Fix Plan

> **Created:** 2025-12-08
> **Status:** Implementation Complete - Pending Testing
> **Branch:** `fix/bbi-fixes`

---

## Progress Tracker

### Phase 1: Schema Changes
- [x] 1.1 Update `BBIResult` model in `apps/api/app/db/models/bbi.py`
  - [x] Add `barangay_id` field (FK to barangays)
  - [x] Add `assessment_year` field (Integer)
  - [x] Add `indicator_id` field (FK to indicators)
  - [x] Remove legacy `status` field
  - [x] Update `compliance_rating` to String (not Enum)
  - [x] Rename `calculation_date` to `calculated_at`
  - [x] Add unique constraint (barangay_id, assessment_year, bbi_id)
- [x] 1.2 Update `BBIStatus` enum in `apps/api/app/db/enums.py`
  - [x] Remove legacy `FUNCTIONAL` / `NON_FUNCTIONAL` values
  - [x] Keep only 4-tier values
- [x] 1.3 Add `bbi_results` relationship to `Barangay` model
- [x] 1.4 Create Alembic migration
- [x] 1.5 Run migration and verify

### Phase 2: Service Layer Changes
- [x] 2.1 Add `BBI_CONFIG` dictionary to `bbi_service.py`
- [x] 2.2 Update `_get_compliance_rating` method (add 0% = NON_FUNCTIONAL)
- [x] 2.3 Rewrite `calculate_bbi_compliance` method
  - [x] Get barangay_id from assessment
  - [x] Get sub-indicators (children of BBI indicator)
  - [x] Count passed sub-indicators from `validation_status`
  - [x] Calculate percentage
  - [x] Upsert BBIResult with new fields
- [x] 2.4 Update `calculate_all_bbi_compliance` method
- [x] 2.5 Update `_get_or_create_bbi_for_indicator` to use BBI_CONFIG

### Phase 3: Trigger Integration
- [x] 3.1 Find where assessment status changes to COMPLETED
- [x] 3.2 Add BBI calculation trigger in `mlgoo_service.py`
- [ ] 3.3 Test trigger fires correctly

### Phase 4: Schema Updates (Pydantic)
- [x] 4.1 Update `BBIResultResponse` schema
- [x] 4.2 Update `BBIComplianceResult` schema
- [x] 4.3 Add new endpoint schemas if needed

### Phase 5: API Endpoints
- [x] 5.1 Update existing BBI endpoints
- [x] 5.2 Add `GET /api/v1/bbis/compliance/barangay/{barangay_id}` endpoint
- [x] 5.3 Add year filter to endpoints

### Phase 6: Frontend Updates
- [x] 6.1 Update `BBIPreviewPanel.tsx`
- [x] 6.2 Update `BBIComplianceSection.tsx`
- [x] 6.3 Update `BBIComplianceCard.tsx`
- [ ] 6.4 Regenerate types with `pnpm generate-types` (run when API is live)

### Phase 7: Testing
- [x] 7.1 Write unit tests for rating calculation
- [x] 7.2 Write unit tests for sub-indicator counting
- [ ] 7.3 Write integration tests for full flow
- [ ] 7.4 Manual testing

### Phase 8: Cleanup
- [ ] 8.1 Remove unused code/methods
- [ ] 8.2 Update documentation
- [ ] 8.3 Code review

---

## Problem Summary

The BBI (Barangay-based Institutions) feature has multiple issues:

1. **Wrong data model** - BBIResult linked to Assessment instead of Barangay
2. **Wrong source of truth** - Using assessment_responses instead of validator decisions
3. **Missing year tracking** - No assessment_year in BBIResult
4. **Legacy status field** - Using old FUNCTIONAL/NON_FUNCTIONAL instead of 4-tier rating
5. **Missing 0% distinction** - No difference between 0% (Non Functional) and 1-49% (Low Functional)

---

## Official BBI Mapping

| BBI | Indicator | Sub-indicators | Area |
|-----|-----------|----------------|------|
| BDRRMC | 2.1 | 4 | Core 2 |
| BADAC | 3.1 | 10 | Core 3 |
| BPOC | 3.2 | 3 | Core 3 |
| VAW Desk | 4.1 | 7 | Essential 1 |
| BDC | 4.3 | 4 | Essential 1 |
| BCPC | 4.5 | 6 | Essential 1 |
| BESWMC | 6.1 | 4 | Essential 3 |

**Total: 7 BBIs**

---

## Uniform Percentage-Based Rating System

| Compliance Rate | Adjectival Rating |
|-----------------|-------------------|
| 75% - 100% | Highly Functional |
| 50% - 74% | Moderately Functional |
| 1% - 49% | Low Functional |
| 0% | Non Functional |

**Calculation:** `(Passed Sub-indicators / Total Sub-indicators) × 100%`

**Source of Truth:** `AssessmentResponse.validation_status` for each sub-indicator (set by validators)

**Trigger:** Calculate when Assessment reaches `COMPLETED` status

---

## Schema Changes

### 1. Update BBIResult Model

**File:** `apps/api/app/db/models/bbi.py`

**Changes:**
- Add `barangay_id` (FK to barangays)
- Add `assessment_year` (Integer)
- Add `indicator_id` (FK to indicators - the parent BBI indicator)
- Remove `status` field (legacy enum)
- Update `compliance_rating` to use new 4-tier values
- Add unique constraint on (barangay_id, assessment_year, bbi_id)

```python
class BBIResult(Base):
    """
    BBIResult stores the calculated BBI functionality for a specific barangay and year.

    Compliance is calculated based on validator decisions (AssessmentResponse.validation_status)
    for sub-indicators of each BBI indicator.
    """

    __tablename__ = "bbi_results"

    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Direct links for efficient queries
    barangay_id: Mapped[int] = mapped_column(
        ForeignKey("barangays.id"), nullable=False, index=True
    )
    assessment_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    # Reference to the assessment that triggered this calculation
    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("assessments.id"), nullable=False, index=True
    )

    # BBI type (e.g., BDRRMC, BADAC, etc.)
    bbi_id: Mapped[int] = mapped_column(ForeignKey("bbis.id"), nullable=False, index=True)

    # Parent BBI indicator (e.g., 2.1, 3.1, etc.) - for audit trail
    indicator_id: Mapped[int] = mapped_column(
        ForeignKey("indicators.id"), nullable=False, index=True
    )

    # Compliance data (4-tier system)
    compliance_percentage: Mapped[float] = mapped_column(
        Float, nullable=False, comment="Compliance rate 0-100%"
    )
    compliance_rating: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        comment="4-tier rating: HIGHLY_FUNCTIONAL, MODERATELY_FUNCTIONAL, LOW_FUNCTIONAL, NON_FUNCTIONAL",
    )
    sub_indicators_passed: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="Number of sub-indicators that passed"
    )
    sub_indicators_total: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="Total number of sub-indicators evaluated"
    )
    sub_indicator_results: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, comment="Detailed pass/fail results for each sub-indicator"
    )

    # Timestamps
    calculated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=func.now())

    # Relationships
    barangay = relationship("Barangay", back_populates="bbi_results")
    assessment = relationship("Assessment", back_populates="bbi_results")
    bbi = relationship("BBI", back_populates="bbi_results")
    indicator = relationship("Indicator")

    # Unique constraint: One result per barangay + year + BBI type
    __table_args__ = (
        UniqueConstraint(
            'barangay_id', 'assessment_year', 'bbi_id',
            name='uq_bbi_result_per_barangay_year_bbi'
        ),
    )
```

### 2. Update BBIStatus Enum

**File:** `apps/api/app/db/enums.py`

**Changes:** Remove legacy values, keep only 4-tier ratings

```python
class BBIStatus(str, enum.Enum):
    """
    4-tier BBI functionality rating based on compliance percentage.

    | Compliance Rate | Rating |
    |-----------------|--------|
    | 75% - 100%      | HIGHLY_FUNCTIONAL |
    | 50% - 74%       | MODERATELY_FUNCTIONAL |
    | 1% - 49%        | LOW_FUNCTIONAL |
    | 0%              | NON_FUNCTIONAL |
    """
    HIGHLY_FUNCTIONAL = "HIGHLY_FUNCTIONAL"
    MODERATELY_FUNCTIONAL = "MODERATELY_FUNCTIONAL"
    LOW_FUNCTIONAL = "LOW_FUNCTIONAL"
    NON_FUNCTIONAL = "NON_FUNCTIONAL"
```

### 3. Add Relationship to Barangay Model

**File:** `apps/api/app/db/models/barangay.py`

**Add:**
```python
bbi_results = relationship("BBIResult", back_populates="barangay", cascade="all, delete-orphan")
```

### 4. Create Migration

```bash
cd apps/api
alembic revision --autogenerate -m "update bbi_results schema with barangay_id and assessment_year"
alembic upgrade head
```

---

## Service Layer Changes

### 1. Update BBI Service

**File:** `apps/api/app/services/bbi_service.py`

#### A. Add BBI Configuration

```python
# BBI metadata configuration
BBI_CONFIG = {
    "2.1": {"abbreviation": "BDRRMC", "name": "Barangay Disaster Risk Reduction and Management Committee"},
    "3.1": {"abbreviation": "BADAC", "name": "Barangay Anti-Drug Abuse Council"},
    "3.2": {"abbreviation": "BPOC", "name": "Barangay Peace and Order Committee"},
    "4.1": {"abbreviation": "VAW Desk", "name": "Barangay Violence Against Women Desk"},
    "4.3": {"abbreviation": "BDC", "name": "Barangay Development Council"},
    "4.5": {"abbreviation": "BCPC", "name": "Barangay Council for the Protection of Children"},
    "6.1": {"abbreviation": "BESWMC", "name": "Barangay Ecological Solid Waste Management Committee"},
}
```

#### B. Update `_get_compliance_rating` Method

```python
def _get_compliance_rating(self, percentage: float) -> BBIStatus:
    """
    Map compliance percentage to 4-tier functionality rating.

    | Compliance Rate | Rating |
    |-----------------|--------|
    | 75% - 100%      | HIGHLY_FUNCTIONAL |
    | 50% - 74%       | MODERATELY_FUNCTIONAL |
    | 1% - 49%        | LOW_FUNCTIONAL |
    | 0%              | NON_FUNCTIONAL |
    """
    if percentage >= 75:
        return BBIStatus.HIGHLY_FUNCTIONAL
    elif percentage >= 50:
        return BBIStatus.MODERATELY_FUNCTIONAL
    elif percentage > 0:
        return BBIStatus.LOW_FUNCTIONAL
    else:
        return BBIStatus.NON_FUNCTIONAL
```

#### C. Update `calculate_bbi_compliance` Method

**Key changes:**
1. Get sub-indicator pass/fail from `AssessmentResponse.validation_status`
2. Calculate percentage: `(passed / total) × 100`
3. Store result with `barangay_id` and `assessment_year`

```python
def calculate_bbi_compliance(
    self,
    db: Session,
    assessment: Assessment,
    bbi_indicator: Indicator,
) -> BBIResult:
    """
    Calculate BBI compliance for a specific BBI indicator.

    Source of truth: AssessmentResponse.validation_status (validator decisions)
    """
    # Get barangay from assessment
    barangay_id = assessment.blgu_user.barangay_id
    assessment_year = assessment.assessment_year

    # Get sub-indicators (children of the BBI indicator)
    sub_indicators = (
        db.query(Indicator)
        .filter(Indicator.parent_id == bbi_indicator.id)
        .order_by(Indicator.sort_order)
        .all()
    )

    # Count passed sub-indicators based on validator decisions
    passed_count = 0
    total_count = len(sub_indicators)
    sub_indicator_details = []

    for sub_ind in sub_indicators:
        # Get the assessment response for this sub-indicator
        response = (
            db.query(AssessmentResponse)
            .filter(
                AssessmentResponse.assessment_id == assessment.id,
                AssessmentResponse.indicator_id == sub_ind.id,
            )
            .first()
        )

        # Check if validator marked it as PASS
        is_passed = (
            response is not None
            and response.validation_status == ValidationStatus.PASS
        )

        if is_passed:
            passed_count += 1

        sub_indicator_details.append({
            "indicator_id": sub_ind.id,
            "indicator_code": sub_ind.indicator_code,
            "indicator_name": sub_ind.name,
            "passed": is_passed,
            "validation_status": response.validation_status.value if response and response.validation_status else None,
        })

    # Calculate compliance percentage
    compliance_percentage = (passed_count / total_count * 100) if total_count > 0 else 0.0
    compliance_rating = self._get_compliance_rating(compliance_percentage)

    # Get or create BBI record
    bbi = self._get_or_create_bbi_for_indicator(db, bbi_indicator)

    # Upsert BBIResult (update if exists, create if not)
    bbi_result = (
        db.query(BBIResult)
        .filter(
            BBIResult.barangay_id == barangay_id,
            BBIResult.assessment_year == assessment_year,
            BBIResult.bbi_id == bbi.id,
        )
        .first()
    )

    if bbi_result:
        # Update existing
        bbi_result.assessment_id = assessment.id
        bbi_result.indicator_id = bbi_indicator.id
        bbi_result.compliance_percentage = compliance_percentage
        bbi_result.compliance_rating = compliance_rating.value
        bbi_result.sub_indicators_passed = passed_count
        bbi_result.sub_indicators_total = total_count
        bbi_result.sub_indicator_results = sub_indicator_details
        bbi_result.calculated_at = datetime.utcnow()
    else:
        # Create new
        bbi_result = BBIResult(
            barangay_id=barangay_id,
            assessment_year=assessment_year,
            assessment_id=assessment.id,
            bbi_id=bbi.id,
            indicator_id=bbi_indicator.id,
            compliance_percentage=compliance_percentage,
            compliance_rating=compliance_rating.value,
            sub_indicators_passed=passed_count,
            sub_indicators_total=total_count,
            sub_indicator_results=sub_indicator_details,
        )
        db.add(bbi_result)

    db.flush()
    return bbi_result
```

#### D. Add Trigger on Assessment Completion

**File:** `apps/api/app/services/mlgoo_service.py`

When assessment status changes to `COMPLETED`, trigger BBI calculation:

```python
# After setting assessment.status = AssessmentStatus.COMPLETED
bbi_service.calculate_all_bbi_compliance(db, assessment)
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `apps/api/app/db/models/bbi.py` | Update BBIResult schema |
| `apps/api/app/db/models/barangay.py` | Add bbi_results relationship |
| `apps/api/app/db/enums.py` | Update BBIStatus enum (remove legacy) |
| `apps/api/app/services/bbi_service.py` | Update calculation logic |
| `apps/api/app/services/mlgoo_service.py` | Trigger BBI calc on COMPLETED |
| `apps/api/app/schemas/bbi.py` | Update response schemas |
| `apps/api/app/api/v1/bbis.py` | Update endpoints if needed |
| `apps/api/alembic/versions/` | New migration file |

---

## Testing Plan

1. **Unit Tests:**
   - Test 4-tier rating calculation (0%, 1-49%, 50-74%, 75-100%)
   - Test sub-indicator counting from validation_status
   - Test upsert logic (update existing vs create new)

2. **Integration Tests:**
   - Complete assessment flow → verify BBI results created
   - Verify barangay_id and assessment_year stored correctly
   - Verify unique constraint prevents duplicates

3. **Manual Testing:**
   - Complete an assessment as MLGOO
   - Query `GET /api/v1/bbis/compliance/barangay/{barangay_id}`
   - Verify all 7 BBIs have results with correct ratings

---

## Migration Strategy

1. Create migration to add new columns (nullable initially)
2. Backfill existing data from assessment relationships
3. Add NOT NULL constraints and unique constraint
4. Remove legacy `status` column

---

## Summary of Changes

| Change | Impact |
|--------|--------|
| Add `barangay_id` to BBIResult | Direct barangay lookup |
| Add `assessment_year` to BBIResult | Year-over-year tracking |
| Add `indicator_id` to BBIResult | Audit trail |
| Remove legacy `status` field | Clean 4-tier system |
| Fix 0% = NON_FUNCTIONAL | Correct rating |
| Source from validation_status | Validator decisions as truth |
| Trigger on COMPLETED | Automatic calculation |
