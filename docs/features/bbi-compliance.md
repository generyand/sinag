# BBI Compliance Rating System

> **Status:** Implemented (December 2025) **Reference:** DILG MC 2024-417

This document describes the Barangay-Based Institutions (BBI) compliance rating system implemented
in SINAG following the DILG Memorandum Circular 2024-417 guidelines.

## Overview

The BBI system tracks the functionality status of 7 mandatory barangay-based institutions. Each
BBI's compliance is calculated based on sub-indicator validation results and mapped to a 4-tier
rating system.

## The 7 Barangay-Based Institutions

| BBI | Abbreviation | Full Name                                                 | Indicator Code | Sub-indicators |
| --- | ------------ | --------------------------------------------------------- | -------------- | -------------- |
| 1   | BDRRMC       | Barangay Disaster Risk Reduction and Management Committee | 2.1            | 4              |
| 2   | BADAC        | Barangay Anti-Drug Abuse Council                          | 3.1            | 10             |
| 3   | BPOC         | Barangay Peace and Order Committee                        | 3.2            | 3              |
| 4   | VAW Desk     | Barangay Violence Against Women Desk                      | 4.1            | 7              |
| 5   | BDC          | Barangay Development Council                              | 4.3            | 4              |
| 6   | BCPC         | Barangay Council for the Protection of Children           | 4.5            | 6              |
| 7   | BESWMC       | Barangay Ecological Solid Waste Management Committee      | 6.1            | 4              |

## 4-Tier Rating System

Per DILG MC 2024-417, BBI functionality is determined by compliance rate:

| Compliance Rate | Adjectival Rating     | Color Code   |
| --------------- | --------------------- | ------------ |
| 75% - 100%      | HIGHLY_FUNCTIONAL     | Green        |
| 50% - 74%       | MODERATELY_FUNCTIONAL | Yellow/Amber |
| 1% - 49%        | LOW_FUNCTIONAL        | Orange       |
| 0%              | NON_FUNCTIONAL        | Red          |

### Calculation Formula

```
Compliance Rate = (Passed Sub-Indicators / Total Sub-Indicators) x 100%
```

### Source of Truth

The compliance rating is based on **validator decisions** (`AssessmentResponse.validation_status`),
not the initial BLGU responses. This ensures the rating reflects the official DILG validation.

## Data Model

### BBIResult Schema

```python
class BBIResult:
    id: int                          # Primary key
    barangay_id: int                 # FK to barangays (direct link)
    assessment_year: int             # Year of assessment
    assessment_id: int               # FK to assessments (trigger source)
    bbi_id: int                      # FK to bbis table
    indicator_id: int                # FK to indicators (parent BBI indicator)

    # Compliance data
    compliance_percentage: float     # 0-100%
    compliance_rating: str           # 4-tier rating value
    sub_indicators_passed: int       # Count of passed sub-indicators
    sub_indicators_total: int        # Total sub-indicators evaluated
    sub_indicator_results: dict      # Detailed pass/fail per sub-indicator

    # Timestamps
    calculated_at: datetime          # When calculation was performed
```

### Unique Constraint

One result per barangay + year + BBI combination:

```sql
UNIQUE (barangay_id, assessment_year, bbi_id)
```

This allows tracking BBI functionality across multiple assessment years.

## Calculation Trigger

BBI compliance is calculated automatically when an assessment reaches `COMPLETED` status:

```python
# In mlgoo_service.py - after MLGOO approves assessment
assessment.status = AssessmentStatus.COMPLETED
bbi_service.calculate_all_bbi_compliance(db, assessment)
```

The calculation:

1. Finds all indicators marked as BBIs (`is_bbi=True`)
2. For each BBI indicator, gets its sub-indicators (children)
3. Counts sub-indicators where `validation_status == PASS`
4. Calculates percentage and maps to 4-tier rating
5. Upserts the BBIResult (updates if exists, creates if not)

## API Endpoints

### Get BBI Results by Barangay

```http
GET /api/v1/bbis/compliance/barangay/{barangay_id}?year={year}
```

Returns all 7 BBI results for a specific barangay and assessment year.

**Response:**

```json
{
  "barangay_id": 123,
  "barangay_name": "Barangay Example",
  "assessment_year": 2025,
  "bbi_results": [
    {
      "bbi_id": 1,
      "bbi_name": "Barangay Disaster Risk Reduction and Management Committee",
      "bbi_abbreviation": "BDRRMC",
      "indicator_code": "2.1",
      "compliance_percentage": 75.0,
      "compliance_rating": "HIGHLY_FUNCTIONAL",
      "sub_indicators_passed": 3,
      "sub_indicators_total": 4,
      "calculated_at": "2025-12-08T10:30:00Z"
    }
    // ... 6 more BBIs
  ]
}
```

### Get BBI Compliance for Assessment

```http
GET /api/v1/bbis/compliance/assessment/{assessment_id}
```

Returns BBI results linked to a specific assessment.

## Frontend Components

### BBIPreviewPanel

Located in `apps/web/src/components/features/validator/BBIPreviewPanel.tsx`

- Shows real-time BBI compliance preview during validation
- Displayed as a sticky footer panel (default: expanded)
- Updates as validators mark indicators Pass/Fail

### BBIComplianceCard

Located in `apps/web/src/components/features/blgu-phases/BBIComplianceCard.tsx`

- Shows BBI results on BLGU dashboard after assessment completion
- Color-coded badges for each rating tier

### BBIComplianceSection

Located in `apps/web/src/components/features/gar/BBIComplianceSection.tsx`

- Detailed BBI breakdown in GAR (Governance Assessment Report)
- Shows sub-indicator pass/fail details

### BBI Indicator Badges

In the tree navigator (`AssessmentTreeNode.tsx`), BBI indicators show a special badge:

- Indicator codes: 2.1, 3.1, 3.2, 4.1, 4.3, 4.5, 6.1
- Helps validators identify which indicators affect BBI functionality

## Role Access

| Role       | BBI Access                                                    |
| ---------- | ------------------------------------------------------------- |
| MLGOO_DILG | Full access - can view all BBI results, manage BBIs           |
| VALIDATOR  | Can view BBI preview during validation, access Analytics page |
| ASSESSOR   | Can view BBI results (read-only)                              |
| BLGU_USER  | Can view their barangay's BBI results after completion        |

## Configuration

BBI mapping is defined in `apps/api/app/services/bbi_service.py`:

```python
BBI_CONFIG = {
    "2.1": {"abbreviation": "BDRRMC", "name": "Barangay Disaster Risk Reduction..."},
    "3.1": {"abbreviation": "BADAC", "name": "Barangay Anti-Drug Abuse Council"},
    "3.2": {"abbreviation": "BPOC", "name": "Barangay Peace and Order Committee"},
    "4.1": {"abbreviation": "VAW Desk", "name": "Barangay Violence Against Women Desk"},
    "4.3": {"abbreviation": "BDC", "name": "Barangay Development Council"},
    "4.5": {"abbreviation": "BCPC", "name": "Barangay Council for the Protection..."},
    "6.1": {"abbreviation": "BESWMC", "name": "Barangay Ecological Solid Waste..."},
}
```

## Migration Notes

The BBI system was updated in December 2025:

### Previous System (Legacy)

- Binary status: FUNCTIONAL / NON_FUNCTIONAL
- Linked to Assessment only
- No year tracking

### Current System (4-Tier)

- 4-tier rating with 0% distinction
- Linked directly to Barangay
- Year-over-year tracking support
- Validator decisions as source of truth

### Migration Applied

```sql
-- Migration: update_bbi_results_schema.py
-- Added: barangay_id, assessment_year, indicator_id
-- Added: unique constraint (barangay_id, assessment_year, bbi_id)
-- Removed: legacy status field
```

## Related Documentation

- [User Roles](../architecture/user-roles.md) - Role-based access control
- [Assessor Validation Workflow](../workflows/assessor-validation.md) - Validation process
- [DILG MC 2024-SGLGB](../references/DILG-MC-2024-SGLGB.md) - Official guidelines

## Testing

BBI tests are located in:

- `apps/api/tests/services/test_bbi_service.py` - Service layer tests
- `apps/api/tests/api/v1/test_bbis.py` - API endpoint tests

Key test scenarios:

- 4-tier rating calculation (0%, 1-49%, 50-74%, 75-100%)
- Sub-indicator counting from validation_status
- Upsert logic (update existing vs create new)
- Trigger on assessment completion
