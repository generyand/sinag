# Hard-Coded Indicators Implementation Plan

**Document Version:** 1.1
**Date Created:** 2025-11-16
**Last Updated:** 2025-11-16
**Status:** Phase 7 Complete - All 29 Indicators Defined

---

## Table of Contents

1. [Overview](#overview)
2. [Decision Context](#decision-context)
3. [Architecture](#architecture)
4. [BBI Functionality System](#bbi-functionality-system)
5. [Implementation Phases](#implementation-phases)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Frontend Integration](#frontend-integration)
9. [Progress Tracking](#progress-tracking)
10. [Reference Materials](#reference-materials)

---

## Overview

This document outlines the plan to **hard-code all 29 SGLGB indicators** as Python dataclass definitions that are seeded into the database, replacing the original dynamic Indicator Builder approach.

### Key Decisions

- ✅ **Abandon** the dynamic Indicator Builder UI
- ✅ **Hard-code** all 29 indicators as Python definitions
- ✅ **Seed** indicators via Alembic migrations
- ✅ **Simplify** validation logic (no complex calculation engine)
- ✅ **Normalize** checklist items into separate table (not JSONB)

### Goals

1. Reduce complexity by eliminating dynamic form builder
2. Ensure consistency across all 29 SGLGB indicators
3. Maintain version control through code (not database changes)
4. Enable faster development and easier testing
5. Provide clear, auditable indicator definitions

---

## Decision Context

### Why Hard-Code?

After analyzing real SGLGB paper forms (BLGU view, Validator view, and Governance Assessment Report), we discovered:

1. **Indicators are static**: SGLGB indicators rarely change (they're defined by DILG)
2. **Validation is simple**: Validators check boxes, not enter complex data
3. **Upload structure is consistent**:
   - BLGUs upload documents at sub-indicator level (e.g., 2 files for 1.1.1)
   - Checklist items (a, b, c, ...) are **sections within uploaded documents**, not separate uploads
   - Validators verify sections and manually enter document counts

4. **Over-engineering**: The v1.4 Indicator Builder specification assumed:
   - 9 MOV checklist item types (reality: need only 2-3)
   - Complex calculation schemas (reality: simple ALL_ITEMS_REQUIRED logic)
   - Dynamic form generation (reality: static 29 indicators)

### What Changed?

| Original Approach | Hard-Coded Approach |
|-------------------|---------------------|
| Dynamic Indicator Builder UI | Python dataclass definitions |
| JSONB `mov_checklist_items` | Normalized `checklist_items` table |
| 9 MOV item types | 2-3 simple item types |
| Complex calculation engine | Simple validation rules |
| User-created indicators | Fixed 29 SGLGB indicators |

---

## Architecture

### Component Overview

```
Python Definitions (Code)
  ↓
Alembic Migration (Seeder)
  ↓
PostgreSQL Database (indicators + checklist_items tables)
  ↓
FastAPI Endpoints (GET by code, GET tree)
  ↓
Pydantic Schemas → TypeScript Types
  ↓
Frontend Components (BLGU / Validator / GAR views)
```

### Directory Structure

```
apps/api/
├── app/
│   ├── indicators/                    # NEW: Hard-coded indicator definitions
│   │   ├── __init__.py
│   │   ├── base.py                    # Base dataclasses (Indicator, SubIndicator, ChecklistItem)
│   │   ├── seeder.py                  # Database seeding service
│   │   └── definitions/               # Individual indicator definitions
│   │       ├── __init__.py            # Exports ALL_INDICATORS
│   │       ├── indicator_1_1.py       # ✅ COMPLETED
│   │       ├── indicator_1_2.py       # 🔄 TODO
│   │       ├── indicator_1_3.py       # 🔄 TODO
│   │       ├── ...
│   │       └── indicator_6_3.py       # 🔄 TODO (28 more indicators)
│   │
│   ├── db/models/
│   │   └── governance_area.py         # ✅ Updated: Indicator + ChecklistItem models
│   │
│   ├── schemas/
│   │   └── indicator.py               # ✅ Updated: SimplifiedIndicatorResponse, etc.
│   │
│   └── api/v1/
│       └── indicators.py              # ✅ Updated: GET /code/{code}, GET /code/{code}/tree
│
└── alembic/versions/
    ├── 00bed49217f7_add_checklist_items_table.py      # ✅ Schema migration
    └── cbeaa8a6cd8d_seed_indicator_1_1.py             # ✅ Seeding migration
```

---

## BBI Functionality System

### What are BBIs?

**BBIs (Barangay-Based Institutions)** are mandatory organizational structures that each barangay must establish and maintain for local governance. The SGLGB assessment includes 9 mandatory BBIs:

### 9 Mandatory BBIs

**IMPORTANT:** BBIs (Barangay-Based Institutions) are **local organizations that exist within each barangay**. Each of the 25 barangays has its own instances of these institutions.

| # | BBI | Full Name | Governance Area |
|---|-----|-----------|-----------------|
| 1 | **BDRRMC** | Barangay Disaster Risk Reduction and Management Committee | Core 2: Disaster Preparedness |
| 2 | **BADAC** | Barangay Anti-Drug Abuse Council | Core 3: Safety, Peace and Order |
| 3 | **BPOC** | Barangay Peace and Order Committee | Core 3: Safety, Peace and Order |
| 4 | **LT** | Lupong Tagapamayapa | Core 3: Safety, Peace and Order |
| 5 | **VAW Desk** | Barangay Violence Against Women Desk | Essential 1: Social Protection |
| 6 | **BDC** | Barangay Development Council | Essential 1: Social Protection |
| 7 | **BCPC** | Barangay Council for the Protection of Children | Essential 1: Social Protection |
| 8 | **BNC** | Barangay Nutrition Committee | Essential 1: Social Protection |
| 9 | **BESWMC** | Barangay Ecological Solid Waste Management Committee | Essential 3: Environmental Management |

**Key Clarification:**
- Each barangay has its **OWN** BDRRMC, BADAC, BPOC, LT, VAW Desk, BDC, BCPC, BNC, BESWMC
- BBI functionality is assessed **per barangay**, not system-wide
- Example: "Barangay A's BDRRMC is Functional" vs "Barangay B's BDRRMC is Non-Functional"

---

### BBI Functionality Determination

**Key Principle:** Each BBI has **ONE dedicated functionality indicator** that determines whether the BBI is "Functional" or "Non-Functional".

**Relationship Direction:**
```
Indicator Result → Determines BBI Status
(ONE-WAY relationship, no cross-references)
```

**Example:**
```
Assessment for Barangay "San Antonio"
  ↓
Indicator 2.1 (BDRRMC Functionality) validates:
  ├─ EO/ordinance establishing BDRRMC ✓
  ├─ Annual work and financial plan ✓
  ├─ Accomplishment report ✓
  └─ Validation Result: PASSED

Therefore:
  → Barangay "San Antonio"'s BDRRMC Status = "Functional"
  → (This does NOT affect other barangays' BDRRMC status)
```

**Important Notes:**
- ✅ Each BBI is assessed by **ONE indicator only**
- ✅ Indicator pass/fail **directly determines** BBI status
- ❌ **No cross-references**: Other indicators do NOT check BBI status
- ✅ BBI status is stored for **reporting and analytics only**

---

### BBI-to-Indicator Mapping

According to official SGLGB documentation, here is the complete BBI-to-indicator mapping:

| # | BBI Name | Abbreviation | Governance Area | Indicator Code | Indicator Name |
|---|----------|--------------|-----------------|----------------|----------------|
| 1 | Barangay Disaster Risk Reduction and Management Committee | **BDRRMC** | Core 2: Disaster Preparedness | **2.1** | Functionality of the Barangay Disaster Risk Reduction and Management Committee (BDRRMC) |
| 2 | Barangay Anti-Drug Abuse Council | **BADAC** | Core 3: Safety, Peace and Order | **3.1** | Functionality of the Barangay Anti-Drug Abuse Council (BADAC) |
| 3 | Barangay Peace and Order Committee | **BPOC** | Core 3: Safety, Peace and Order | **3.2** | Functionality of the Barangay Peace and Order Committee (BPOC) |
| 4 | Lupong Tagapamayapa | **LT** | Core 3: Safety, Peace and Order | **3.3** | Functionality of the Lupong Tagapamayapa (LT) |
| 5 | Barangay Violence Against Women (VAW) Desk | **VAW Desk** | Essential 1: Social Protection | **4.1** | Functionality of Barangay Violence Against Women (VAW) Desk |
| 6 | Barangay Development Council | **BDC** | Essential 1: Social Protection | **4.3** | Functionality of the Barangay Development Council (BDC) |
| 7 | Barangay Council for the Protection of Children | **BCPC** | Essential 1: Social Protection | **4.5** | Functionality of the Barangay Council for the Protection of Children (BCPC) |
| 8 | Barangay Nutrition Committee | **BNC** | Essential 1: Social Protection | **4.8** | Functionality of the Barangay Nutrition Committee (BNC) |
| 9 | Barangay Ecological Solid Waste Management Committee | **BESWMC** | Essential 3: Environmental Management | **6.1** | Functionality of the Barangay Ecological Solid Waste Management Committee (BESWMC) |

**Total:** 9 BBI indicators

**⚠️ IMPORTANT CORRECTIONS BASED ON OFFICIAL DOCUMENTATION:**
- **BADAC** → Indicator **3.1** (NOT 3.3)
- **BPOC** (NOT BPSO) → Indicator **3.2** (NOT 3.1)
- **Lupong Tagapamayapa** → Indicator **3.3**
- **VAW Desk** → Indicator **4.1** (NOT 3.4)
- **BDC** (NOT BPLS) → Indicator **4.3**
- **BCPC** → Indicator **4.5** (NOT 4.1)
- **BNC** → Indicator **4.8** (NOT 4.2)
- **BESWMC** → Indicator **6.1** (NOT 6.2)
- There is **NO** BPLS, BENRO, or indicator 5.1 as BBI in the official mapping

**IMPORTANT CORRECTION:**
- **BFDP (1.1) is NOT a BBI!** BFDP is a policy/compliance requirement, not a barangay-based institution.
- The `is_bbi` flag for indicator 1.1 should be **false** (it was incorrectly marked as true earlier)

---

### Database Schema for BBIs

The system uses two tables to track BBI functionality:

#### 1. `bbis` Table

Stores the 9 mandatory BBI definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `name` | VARCHAR | Full BBI name (e.g., "Barangay Disaster Risk Reduction and Management Committee") |
| `abbreviation` | VARCHAR | Short name (e.g., "BDRRMC") |
| `description` | TEXT | Optional description |
| `governance_area_id` | INTEGER | FK to governance_areas |
| `functionality_indicator_id` | INTEGER | **FK to indicators** - The ONE indicator that assesses this BBI |
| `is_active` | BOOLEAN | Active status |
| `mapping_rules` | JSON | **DEPRECATED** - Not needed for hard-coded approach |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Key Field:** `functionality_indicator_id` - Links the BBI to its dedicated functionality assessment indicator.

---

#### 2. `bbi_results` Table

Stores BBI functionality status **per barangay assessment**.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `assessment_id` | INTEGER | FK to assessments (which belongs to a specific barangay) |
| `bbi_id` | INTEGER | FK to bbis |
| `status` | ENUM | "Functional" or "Non-Functional" |
| `calculation_details` | JSON | Optional audit trail |
| `calculation_date` | TIMESTAMP | When status was calculated |

**Status Enum:** `BBIStatus`
- `Functional` - BBI's functionality indicator **PASSED** for this specific barangay
- `Non-Functional` - BBI's functionality indicator **FAILED** for this specific barangay

**Important:** Each `bbi_results` record represents the functionality of a BBI **in a specific barangay**, not system-wide.

**Example Data:**
```sql
-- Barangay "San Antonio" (assessment_id=1)
INSERT INTO bbi_results (assessment_id, bbi_id, status)
VALUES (1, 1, 'Functional');  -- San Antonio's BDRRMC is Functional

-- Barangay "San Jose" (assessment_id=2)
INSERT INTO bbi_results (assessment_id, bbi_id, status)
VALUES (2, 1, 'Non-Functional');  -- San Jose's BDRRMC is Non-Functional

-- Both records are for BDRRMC (bbi_id=1) but for different barangays
```

---

### BBI Status Update Logic

When a BBI functionality indicator is validated, the system updates the BBI status:

```python
def update_bbi_status(
    db: Session,
    assessment_id: int,
    indicator_id: int,
    indicator_passed: bool
) -> None:
    """
    Update BBI status when a BBI functionality indicator is validated.

    Args:
        assessment_id: The assessment being validated
        indicator_id: The indicator that was just validated
        indicator_passed: Whether the indicator passed validation
    """
    # Check if this indicator assesses a BBI
    bbi = db.query(BBI).filter(
        BBI.functionality_indicator_id == indicator_id
    ).first()

    if not bbi:
        # This indicator doesn't assess a BBI, nothing to update
        return

    # Determine BBI status based on indicator result
    bbi_status = BBIStatus.Functional if indicator_passed else BBIStatus.NonFunctional

    # Update or create BBI result for this assessment
    bbi_result = db.query(BBIResult).filter(
        BBIResult.assessment_id == assessment_id,
        BBIResult.bbi_id == bbi.id
    ).first()

    if bbi_result:
        # Update existing result
        bbi_result.status = bbi_status
        bbi_result.calculation_date = datetime.utcnow()
    else:
        # Create new result
        bbi_result = BBIResult(
            assessment_id=assessment_id,
            bbi_id=bbi.id,
            status=bbi_status,
            calculation_date=datetime.utcnow()
        )
        db.add(bbi_result)

    db.commit()
```

---

### Implementation Requirements

To properly support the BBI functionality system, we need to:

#### 1. Add `functionality_indicator_id` Field to `bbis` Table

**Migration needed:**
```python
def upgrade():
    op.add_column('bbis',
        sa.Column('functionality_indicator_id', sa.Integer(),
                  sa.ForeignKey('indicators.id'), nullable=True))
    op.create_index('ix_bbis_functionality_indicator_id',
                    'bbis', ['functionality_indicator_id'])
```

#### 2. Seed the 9 Mandatory BBIs

**Create migration to seed BBIs:**
```python
def upgrade():
    from sqlalchemy.orm import Session
    from app.db.models.bbi import BBI
    from app.db.models.governance_area import Indicator

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Find indicators by code
        indicator_2_1 = session.query(Indicator).filter_by(indicator_code='2.1').first()
        indicator_3_3 = session.query(Indicator).filter_by(indicator_code='3.3').first()
        # ... etc

        # Create BBIs
        bbis = [
            BBI(
                name="Barangay Disaster Risk Reduction and Management Committee",
                abbreviation="BDRRMC",
                governance_area_id=2,
                functionality_indicator_id=indicator_2_1.id,
                is_active=True
            ),
            BBI(
                name="Barangay Anti-Drug Abuse Council",
                abbreviation="BADAC",
                governance_area_id=3,
                functionality_indicator_id=indicator_3_3.id,
                is_active=True
            ),
            # ... 7 more BBIs
        ]

        for bbi in bbis:
            session.add(bbi)

        session.commit()
    except Exception as e:
        session.rollback()
        raise
```

#### 3. Update Indicator Seeder to Mark BBI Indicators

When seeding indicators, ensure `is_bbi=True` for the 9 BBI functionality indicators:

```python
# In indicator definitions
INDICATOR_2_1 = Indicator(
    code="2.1",
    name="Functionality of BDRRMC",
    governance_area_id=2,
    is_bbi=True,  # ← Mark as BBI indicator
    # ...
)
```

#### 4. Add BBI Status Calculation Service

**Create service:** `apps/api/app/services/bbi_service.py`

```python
class BBIService:
    def calculate_bbi_status_for_assessment(
        self,
        db: Session,
        assessment_id: int
    ) -> List[BBIResult]:
        """
        Calculate BBI functionality status for all BBIs in an assessment.

        Called when assessment is finalized.
        """
        # Get all indicator responses for this assessment
        # For each BBI, check if its functionality indicator passed
        # Create/update BBIResult records
        pass

    def get_bbi_results_for_assessment(
        self,
        db: Session,
        assessment_id: int
    ) -> List[BBIResult]:
        """
        Get all BBI functionality results for an assessment.
        """
        return db.query(BBIResult).filter(
            BBIResult.assessment_id == assessment_id
        ).all()
```

---

## Implementation Phases

### ✅ Phase 1: Database Schema (COMPLETED)

**Objective:** Create normalized database structure for hard-coded indicators

**Migration:** `00bed49217f7_add_checklist_items_table_for_hard_.py`

**Changes:**
1. Created `checklist_items` table:
   - `id`, `indicator_id` (FK), `item_id`, `label`, `group_name`
   - `mov_description`, `required`, `requires_document_count`
   - `display_order`, `created_at`, `updated_at`

2. Added fields to `indicators` table:
   - `validation_rule` (VARCHAR) - e.g., "ALL_ITEMS_REQUIRED"
   - `is_bbi` (BOOLEAN) - Is this a BBI indicator?
   - `effective_date` (DATE) - When this version became active
   - `retired_date` (DATE) - When this version was retired

3. Updated SQLAlchemy models:
   - `ChecklistItem` model with relationship to `Indicator`
   - `Indicator.checklist_items` relationship with cascade delete

**Status:** ✅ Migration applied successfully

---

### ✅ Phase 2: Python Indicator Definitions (COMPLETED)

**Objective:** Define Python dataclasses and create first indicator

**Files Created:**
- `apps/api/app/indicators/base.py` - Base dataclasses
- `apps/api/app/indicators/seeder.py` - Database seeding service
- `apps/api/app/indicators/definitions/indicator_1_1.py` - First indicator

**Base Structure:**

```python
@dataclass
class ChecklistItem:
    id: str                              # "1_1_1_a"
    label: str                           # "a. Barangay Financial Report"
    required: bool = True
    group_name: Optional[str] = None     # "ANNUAL REPORT"
    mov_description: Optional[str] = None
    requires_document_count: bool = False
    display_order: int = 0

@dataclass
class SubIndicator:
    code: str                            # "1.1.1"
    name: str
    checklist_items: List[ChecklistItem]
    upload_instructions: Optional[str] = None
    validation_rule: str = "ALL_ITEMS_REQUIRED"

@dataclass
class Indicator:
    code: str                            # "1.1"
    name: str
    governance_area_id: int
    children: List[SubIndicator]
    is_bbi: bool = False
    is_profiling_only: bool = False
    description: Optional[str] = None
    sort_order: int = 0
```

**Indicator 1.1 Structure:**

```
1.1 - BFDP Compliance (Parent, BBI)
├── 1.1.1 - Posted CY 2023 financial documents (7 checklist items)
│   ├── ANNUAL REPORT (5 items: a-e)
│   ├── QUARTERLY REPORT (1 item: f - requires count)
│   └── MONTHLY REPORT (1 item: g - requires count)
└── 1.1.2 - Accomplished and signed BFR (1 checklist item)
```

**Status:** ✅ Indicator 1.1 defined and seeded

---

### ✅ Phase 3: Database Seeding (COMPLETED)

**Objective:** Seed Indicator 1.1 into database via migration

**Migration:** `cbeaa8a6cd8d_seed_indicator_1_1_bfdp_compliance.py`

**Seeder Logic:**
```python
def seed_indicators(indicators: List[Indicator], db: Session):
    for indicator_def in indicators:
        # Create parent indicator
        parent = IndicatorModel(...)
        db.add(parent)
        db.flush()

        # Create sub-indicators
        for child_def in indicator_def.children:
            sub = IndicatorModel(parent_id=parent.id, ...)
            db.add(sub)
            db.flush()

            # Create checklist items
            for item_def in child_def.checklist_items:
                item = ChecklistItemModel(indicator_id=sub.id, ...)
                db.add(item)

        db.commit()
```

**Verification:**
- ✅ Parent indicator created: ID 671, Code "1.1"
- ✅ Sub-indicators created: ID 672 (1.1.1), ID 673 (1.1.2)
- ✅ Checklist items created: 8 total items

**Status:** ✅ Migration ran successfully

---

### ✅ Phase 4: Pydantic Schemas (COMPLETED)

**Objective:** Create API response schemas for hard-coded indicators

**File:** `apps/api/app/schemas/indicator.py`

**New Schemas:**

```python
class ChecklistItemResponse(BaseModel):
    id: int
    item_id: str                    # "1_1_1_a"
    label: str
    group_name: Optional[str]
    mov_description: Optional[str]
    required: bool
    requires_document_count: bool
    display_order: int

class SimplifiedIndicatorResponse(BaseModel):
    id: int
    indicator_code: str             # "1.1.1"
    name: str
    governance_area_id: int
    parent_id: Optional[int]
    is_bbi: bool
    validation_rule: str
    governance_area: Optional[GovernanceAreaNested]
    checklist_items: List[ChecklistItemResponse]
    children: List["SimplifiedIndicatorResponse"]  # Recursive

class IndicatorTreeResponse(BaseModel):
    id: int
    indicator_code: str             # "1.1" (parent only)
    name: str
    is_bbi: bool
    children: List[SimplifiedIndicatorResponse]
    governance_area: Optional[GovernanceAreaNested]
```

**Status:** ✅ Schemas created and working

---

### ✅ Phase 5: API Endpoints (COMPLETED)

**Objective:** Create endpoints to retrieve indicator structure

**File:** `apps/api/app/api/v1/indicators.py`

**New Endpoints:**

#### 1. Get Single Indicator by Code
```http
GET /api/v1/indicators/code/{indicator_code}
```

**Use Cases:**
- Get sub-indicator for BLGU submission form (e.g., "1.1.1")
- Get sub-indicator for Validator review interface

**Returns:** `SimplifiedIndicatorResponse`

**Example:**
```bash
curl http://localhost:8000/api/v1/indicators/code/1.1.1
```

**Response:**
```json
{
  "id": 672,
  "indicator_code": "1.1.1",
  "name": "Posted the following CY 2023 financial documents in the BFDP board",
  "governance_area_id": 1,
  "parent_id": 671,
  "is_bbi": false,
  "validation_rule": "ALL_ITEMS_REQUIRED",
  "governance_area": {
    "id": 1,
    "name": "Financial Administration and Sustainability",
    "area_type": "Core"
  },
  "checklist_items": [
    {
      "id": 9,
      "item_id": "1_1_1_a",
      "label": "a. Barangay Financial Report",
      "group_name": "ANNUAL REPORT",
      "mov_description": "Barangay Financial Report",
      "required": true,
      "requires_document_count": false,
      "display_order": 1
    },
    // ... 6 more items
  ],
  "children": []
}
```

#### 2. Get Full Indicator Tree
```http
GET /api/v1/indicators/code/{indicator_code}/tree
```

**Use Cases:**
- Get parent indicator with all sub-indicators (e.g., "1.1")
- Display full indicator hierarchy in Governance Assessment Report

**Returns:** `IndicatorTreeResponse`

**Example:**
```bash
curl http://localhost:8000/api/v1/indicators/code/1.1/tree
```

**Response:**
```json
{
  "id": 671,
  "indicator_code": "1.1",
  "name": "Compliance with the Barangay Full Disclosure Policy (BFDP)",
  "is_bbi": true,
  "children": [
    {
      "id": 672,
      "indicator_code": "1.1.1",
      "name": "Posted the following CY 2023 financial documents...",
      "checklist_items": [ /* 7 items */ ]
    },
    {
      "id": 673,
      "indicator_code": "1.1.2",
      "name": "Accomplished and signed BFR...",
      "checklist_items": [ /* 1 item */ ]
    }
  ]
}
```

**Status:** ✅ Both endpoints tested and working

---

### ✅ Phase 6: TypeScript Type Generation (COMPLETED)

**Objective:** Generate frontend types from FastAPI OpenAPI spec

**Command:**
```bash
pnpm generate-types
```

**Generated Files:**
- `packages/shared/src/generated/schemas/indicators/ChecklistItemResponse.ts`
- `packages/shared/src/generated/schemas/indicators/SimplifiedIndicatorResponse.ts`
- `packages/shared/src/generated/schemas/indicators/IndicatorTreeResponse.ts`
- `packages/shared/src/generated/endpoints/indicators/indicators.ts` (React Query hooks)

**Usage in Frontend:**
```typescript
import { useGetIndicatorByCode } from '@sinag/shared';

const { data: indicator } = useGetIndicatorByCode('1.1.1');
```

**Status:** ✅ Types generated successfully

---

### ✅ Phase 7: Create Remaining Indicators (COMPLETED)

**Objective:** Define and seed all 29 SGLGB indicators

#### Indicator List

| Code | Name | Governance Area | BBI | BBI Name | Status |
|------|------|-----------------|-----|----------|--------|
| **1.1** | BFDP Compliance | Financial Admin | ❌ | - | ✅ COMPLETED |
| **1.2** | Tax Revenue Generation | Financial Admin | ❌ | - | ✅ COMPLETED |
| **1.3** | Budget Approval Timeframe | Financial Admin | ❌ | - | ✅ COMPLETED |
| **1.4** | Human Resource Adequacy | Financial Admin | ❌ | - | ✅ COMPLETED |
| **1.5** | CitCha Posting | Financial Admin | ❌ | - | ✅ COMPLETED |
| **1.6** | Allotment for Gender and Development | Financial Admin | ❌ | - | ✅ COMPLETED |
| **1.7** | Barangay Assembly | Financial Admin | ❌ | - | ✅ COMPLETED |
| **2.1** | BDRRMC Functionality | Disaster Preparedness | ✅ | BDRRMC | ✅ COMPLETED |
| **2.2** | LDRMP and LCCAP Preparation | Disaster Preparedness | ❌ | - | ✅ COMPLETED |
| **2.3** | DRRM Fund Allocation | Disaster Preparedness | ❌ | - | ✅ COMPLETED |
| **3.1** | BADAC Functionality | Safety & Peace | ✅ | BADAC | ✅ COMPLETED |
| **3.2** | BPOC Functionality | Safety & Peace | ✅ | BPOC | ✅ COMPLETED |
| **3.3** | Lupong Tagapamayapa Functionality | Safety & Peace | ✅ | LT | ✅ COMPLETED |
| **3.4** | Crime Prevention Measures | Safety & Peace | ❌ | - | ✅ COMPLETED |
| **3.5** | Street Lighting | Safety & Peace | ❌ | - | ✅ COMPLETED |
| **3.6** | CCTV Installation | Safety & Peace | ❌ | - | ✅ COMPLETED |
| **4.1** | VAW Desk Functionality | Social Protection | ✅ | VAW Desk | ✅ COMPLETED |
| **4.2** | OSY Youth Development Program | Social Protection | ❌ | - | ✅ COMPLETED |
| **4.3** | BDC Functionality | Social Protection | ✅ | BDC | ✅ COMPLETED |
| **4.4** | Senior Citizens Affairs | Social Protection | ❌ | - | ✅ COMPLETED |
| **4.5** | BCPC Functionality | Social Protection | ✅ | BCPC | ✅ COMPLETED |
| **4.6** | PWD Affairs | Social Protection | ❌ | - | ✅ COMPLETED |
| **4.7** | Solo Parents Welfare | Social Protection | ❌ | - | ✅ COMPLETED |
| **4.8** | BNC Functionality | Social Protection | ✅ | BNC | ✅ COMPLETED |
| **4.9** | HAPAG sa Barangay Project | Social Protection | ❌ | - | ✅ COMPLETED |
| **5.1** | Business One-Stop-Shop | Business-Friendliness | ❌ | - | ✅ COMPLETED |
| **5.2** | EODB Law Compliance | Business-Friendliness | ❌ | - | ✅ COMPLETED |
| **5.3** | Business Permit Fees Ordinance | Business-Friendliness | ❌ | - | ✅ COMPLETED |
| **6.1** | BESWMC Functionality | Environmental Mgmt | ✅ | BESWMC | ✅ COMPLETED |
| **6.2** | MRF Establishment | Environmental Mgmt | ❌ | - | ✅ COMPLETED |
| **6.3** | Waste Segregation Support | Environmental Mgmt | ❌ | - | ✅ COMPLETED |

**Total:** 29 indicators (29 completed, 0 remaining)

**9 BBI Indicators** (9 mandatory barangay-based institutions):
1. **2.1** - BDRRMC Functionality → **BDRRMC**
2. **3.1** - BADAC Functionality → **BADAC**
3. **3.2** - BPOC Functionality → **BPOC**
4. **3.3** - Lupong Tagapamayapa Functionality → **LT**
5. **4.1** - VAW Desk Functionality → **VAW Desk**
6. **4.3** - BDC Functionality → **BDC**
7. **4.5** - BCPC Functionality → **BCPC**
8. **4.8** - BNC Functionality → **BNC**
9. **6.1** - BESWMC Functionality → **BESWMC**

**Notes:**
- Indicator 1.1 (BFDP Compliance) is **NOT a BBI indicator** - BFDP is a policy compliance requirement
- The official mapping differs from earlier assumptions (verified against SGLGB documentation)

#### Implementation Steps per Indicator

For each indicator (1.2 through 6.3):

1. **Analyze Source Material**
   - Review paper forms (BLGU view, Validator view, GAR)
   - Identify sub-indicators
   - Extract checklist items with groups

2. **Create Definition File**
   ```bash
   # Create new file
   touch apps/api/app/indicators/definitions/indicator_X_Y.py
   ```

3. **Define Structure**
   ```python
   # apps/api/app/indicators/definitions/indicator_X_Y.py
   from app.indicators.base import Indicator, SubIndicator, ChecklistItem

   INDICATOR_X_Y = Indicator(
       code="X.Y",
       name="Indicator Name",
       governance_area_id=N,  # 1-6
       is_bbi=True/False,
       sort_order=N,
       description="...",
       children=[
           SubIndicator(
               code="X.Y.Z",
               name="Sub-indicator name",
               upload_instructions="...",
               validation_rule="ALL_ITEMS_REQUIRED",
               checklist_items=[
                   ChecklistItem(
                       id="X_Y_Z_a",
                       label="a. Item name",
                       group_name="GROUP NAME",
                       mov_description="...",
                       required=True,
                       requires_document_count=False,
                       display_order=1
                   ),
                   # ... more items
               ]
           )
       ]
   )
   ```

4. **Export from __init__.py**
   ```python
   # apps/api/app/indicators/definitions/__init__.py
   from .indicator_1_1 import INDICATOR_1_1
   from .indicator_1_2 import INDICATOR_1_2
   # ... add new indicator

   ALL_INDICATORS = [
       INDICATOR_1_1,
       INDICATOR_1_2,
       # ... add to list
   ]
   ```

5. **Create Seeding Migration**
   ```bash
   cd apps/api
   alembic revision -m "seed_indicator_X_Y_name"
   ```

6. **Write Migration**
   ```python
   def upgrade() -> None:
       from sqlalchemy.orm import Session
       from app.indicators.definitions import INDICATOR_X_Y
       from app.indicators.seeder import seed_indicators

       bind = op.get_bind()
       session = Session(bind=bind)

       try:
           seed_indicators([INDICATOR_X_Y], session)
           print("✅ Indicator X.Y seeded successfully")
       except Exception as e:
           print(f"❌ Error: {e}")
           session.rollback()
           raise
       finally:
           session.close()
   ```

7. **Run Migration**
   ```bash
   alembic upgrade head
   ```

8. **Test API Endpoints**
   ```bash
   # Test sub-indicator
   curl http://localhost:8000/api/v1/indicators/code/X.Y.Z | jq

   # Test full tree
   curl http://localhost:8000/api/v1/indicators/code/X.Y/tree | jq
   ```

9. **Regenerate Types**
   ```bash
   pnpm generate-types
   ```

**Estimated Time:** 30-45 minutes per indicator × 29 = ~14-21 hours

**Status:** ✅ 29 of 29 completed (100% complete) - Completed on 2025-11-16

---

### 🔄 Phase 8: BBI System Implementation (TODO)

**Objective:** Connect indicators to BBIs and implement BBI functionality tracking

#### Phase 8.1: Database Schema Updates

**Migration 1: Add `functionality_indicator_id` to `bbis` table**

```bash
cd apps/api
alembic revision -m "add_functionality_indicator_id_to_bbis"
```

```python
def upgrade() -> None:
    # Add new column
    op.add_column('bbis',
        sa.Column('functionality_indicator_id', sa.Integer(),
                  sa.ForeignKey('indicators.id', ondelete='SET NULL'),
                  nullable=True))

    # Add index
    op.create_index('ix_bbis_functionality_indicator_id',
                    'bbis', ['functionality_indicator_id'])

def downgrade() -> None:
    op.drop_index('ix_bbis_functionality_indicator_id', table_name='bbis')
    op.drop_column('bbis', 'functionality_indicator_id')
```

**Migration 2: Seed the 9 Mandatory BBIs**

After all 29 indicators are created, seed the BBIs:

```bash
alembic revision -m "seed_mandatory_bbis"
```

```python
def upgrade() -> None:
    from sqlalchemy.orm import Session
    from app.db.models.bbi import BBI
    from app.db.models.governance_area import Indicator

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Clear existing test BBIs
        session.execute(text("DELETE FROM bbis WHERE id IN (1, 3, 4)"))

        # Find indicators by code
        indicators = {
            '2.1': session.query(Indicator).filter_by(indicator_code='2.1').first(),
            '3.3': session.query(Indicator).filter_by(indicator_code='3.3').first(),
            '3.1': session.query(Indicator).filter_by(indicator_code='3.1').first(),
            '4.1': session.query(Indicator).filter_by(indicator_code='4.1').first(),
            '4.2': session.query(Indicator).filter_by(indicator_code='4.2').first(),
            '3.4': session.query(Indicator).filter_by(indicator_code='3.4').first(),
            '5.1': session.query(Indicator).filter_by(indicator_code='5.1').first(),
            '6.1': session.query(Indicator).filter_by(indicator_code='6.1').first(),
            '6.2': session.query(Indicator).filter_by(indicator_code='6.2').first(),
        }

        # Create the 9 mandatory BBIs
        bbis = [
            BBI(
                name="Barangay Disaster Risk Reduction and Management Committee",
                abbreviation="BDRRMC",
                description="Mandated by RA 10121",
                governance_area_id=2,  # Disaster Preparedness
                functionality_indicator_id=indicators['2.1'].id,
                is_active=True
            ),
            BBI(
                name="Barangay Anti-Drug Abuse Council",
                abbreviation="BADAC",
                description="Mandated by RA 9165",
                governance_area_id=3,  # Safety, Peace and Order
                functionality_indicator_id=indicators['3.3'].id,
                is_active=True
            ),
            BBI(
                name="Barangay Peace and Safety Office",
                abbreviation="BPSO",
                description="Formerly BPOC, mandated by various laws",
                governance_area_id=3,  # Safety, Peace and Order
                functionality_indicator_id=indicators['3.1'].id,
                is_active=True
            ),
            BBI(
                name="Barangay Council for the Protection of Children",
                abbreviation="BCPC",
                description="Mandated by RA 7610 and RA 9344",
                governance_area_id=4,  # Social Protection
                functionality_indicator_id=indicators['4.1'].id,
                is_active=True
            ),
            BBI(
                name="Barangay Nutrition Committee",
                abbreviation="BNC",
                description="Mandated by PD 1569",
                governance_area_id=4,  # Social Protection
                functionality_indicator_id=indicators['4.2'].id,
                is_active=True
            ),
            BBI(
                name="Violence Against Women and Children Desk",
                abbreviation="VAWC Desk",
                description="Mandated by RA 9262 and RA 7610",
                governance_area_id=4,  # Social Protection
                functionality_indicator_id=indicators['3.4'].id,
                is_active=True
            ),
            BBI(
                name="Barangay Permits and Licensing System",
                abbreviation="BPLS",
                description="Streamlined business permitting",
                governance_area_id=5,  # Business-Friendliness
                functionality_indicator_id=indicators['5.1'].id,
                is_active=True
            ),
            BBI(
                name="Barangay Environment and Natural Resources Office",
                abbreviation="BENRO",
                description="Environmental management body",
                governance_area_id=6,  # Environmental Management
                functionality_indicator_id=indicators['6.1'].id,
                is_active=True
            ),
            BBI(
                name="Barangay Ecological Solid Waste Management Committee",
                abbreviation="BESWMC",
                description="Mandated by RA 9003",
                governance_area_id=6,  # Environmental Management
                functionality_indicator_id=indicators['6.2'].id,
                is_active=True
            ),
        ]

        for bbi in bbis:
            session.add(bbi)

        session.commit()
        print("✅ 9 mandatory BBIs seeded successfully")

    except Exception as e:
        print(f"❌ Error seeding BBIs: {e}")
        session.rollback()
        raise
    finally:
        session.close()

def downgrade() -> None:
    # Delete the 9 mandatory BBIs
    op.execute("""
        DELETE FROM bbis
        WHERE abbreviation IN (
            'BDRRMC', 'BADAC', 'BPSO', 'BCPC', 'BNC',
            'VAWC Desk', 'BPLS', 'BENRO', 'BESWMC'
        )
    """)
```

---

#### Phase 8.2: BBI Service Implementation

**Create:** `apps/api/app/services/bbi_service.py`

```python
"""
BBI Service - Handles BBI functionality status calculation and retrieval.
"""

from typing import List
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.models.bbi import BBI, BBIResult
from app.db.enums import BBIStatus


class BBIService:
    """Service for managing BBI (Barangay-Based Institution) functionality status."""

    def update_bbi_status(
        self,
        db: Session,
        assessment_id: int,
        indicator_id: int,
        indicator_passed: bool
    ) -> BBIResult | None:
        """
        Update BBI status when a BBI functionality indicator is validated.

        Args:
            db: Database session
            assessment_id: The assessment being validated
            indicator_id: The indicator that was just validated
            indicator_passed: Whether the indicator passed validation

        Returns:
            BBIResult if this indicator assesses a BBI, None otherwise
        """
        # Check if this indicator assesses a BBI
        bbi = db.query(BBI).filter(
            BBI.functionality_indicator_id == indicator_id
        ).first()

        if not bbi:
            # This indicator doesn't assess a BBI, nothing to update
            return None

        # Determine BBI status based on indicator result
        bbi_status = BBIStatus.Functional if indicator_passed else BBIStatus.NonFunctional

        # Update or create BBI result for this assessment
        bbi_result = db.query(BBIResult).filter(
            BBIResult.assessment_id == assessment_id,
            BBIResult.bbi_id == bbi.id
        ).first()

        if bbi_result:
            # Update existing result
            bbi_result.status = bbi_status
            bbi_result.calculation_date = datetime.utcnow()
            bbi_result.calculation_details = {
                "indicator_id": indicator_id,
                "indicator_passed": indicator_passed,
                "updated_at": datetime.utcnow().isoformat()
            }
        else:
            # Create new result
            bbi_result = BBIResult(
                assessment_id=assessment_id,
                bbi_id=bbi.id,
                status=bbi_status,
                calculation_date=datetime.utcnow(),
                calculation_details={
                    "indicator_id": indicator_id,
                    "indicator_passed": indicator_passed,
                    "created_at": datetime.utcnow().isoformat()
                }
            )
            db.add(bbi_result)

        db.commit()
        db.refresh(bbi_result)

        return bbi_result

    def get_bbi_results_for_assessment(
        self,
        db: Session,
        assessment_id: int
    ) -> List[BBIResult]:
        """
        Get all BBI functionality results for an assessment.

        Args:
            db: Database session
            assessment_id: Assessment ID

        Returns:
            List of BBIResult objects
        """
        return db.query(BBIResult).filter(
            BBIResult.assessment_id == assessment_id
        ).all()

    def get_all_bbis(self, db: Session) -> List[BBI]:
        """
        Get all active BBIs.

        Args:
            db: Database session

        Returns:
            List of BBI objects
        """
        return db.query(BBI).filter(BBI.is_active == True).all()


# Singleton instance
bbi_service = BBIService()
```

---

#### Phase 8.3: Integration with Validation Workflow

Update the validation service to call BBI service when BBI functionality indicators are validated:

```python
# In apps/api/app/services/indicator_service.py or assessment_service.py

from app.services.bbi_service import bbi_service

def validate_indicator(
    db: Session,
    assessment_id: int,
    indicator_id: int,
    checked_items: List[str],
    document_counts: Dict[str, int]
) -> ValidationResult:
    """
    Validate an indicator submission.
    """
    # ... existing validation logic ...

    validation_passed = # ... determine if indicator passed

    # Update BBI status if this is a BBI functionality indicator
    bbi_result = bbi_service.update_bbi_status(
        db=db,
        assessment_id=assessment_id,
        indicator_id=indicator_id,
        indicator_passed=validation_passed
    )

    if bbi_result:
        print(f"✅ Updated BBI status: {bbi_result.bbi.abbreviation} = {bbi_result.status}")

    return ValidationResult(
        passed=validation_passed,
        # ... other fields
    )
```

---

#### Phase 8.4: API Endpoints for BBI Results

**Add to:** `apps/api/app/api/v1/bbis.py` (or create new router)

```python
@router.get("/assessments/{assessment_id}/bbi-results", response_model=List[BBIResultResponse])
def get_bbi_results_for_assessment(
    *,
    db: Session = Depends(deps.get_db),
    assessment_id: int,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get BBI functionality results for an assessment.

    Returns the functional/non-functional status of all BBIs.
    """
    results = bbi_service.get_bbi_results_for_assessment(db, assessment_id)
    return results
```

**Status:** 🔄 TODO - Implement after all 29 indicators are created

---

### 🔄 Phase 9: Validation Service Simplification (TODO)

**Objective:** Implement simple validation logic for sub-indicators and parent indicator aggregation

This phase covers TWO types of validation:
1. **Sub-indicator validation** (e.g., 1.1.1, 1.1.2) - Based on checklist items
2. **Parent indicator aggregation** (e.g., 1.1) - Based on child indicator results

---

#### Phase 9.1: Sub-Indicator Validation

**Objective:** Validate sub-indicators based on checklist items and validation rules

**Implementation:** Create `apps/api/app/services/indicator_validation_service.py`

```python
"""
Indicator Validation Service - Simple validation logic for hard-coded indicators.
"""

from typing import List, Dict
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.models.governance_area import Indicator, ChecklistItem


class ValidationResult:
    """Result of indicator validation."""
    def __init__(
        self,
        indicator_id: int,
        passed: bool,
        status: str,
        missing_items: List[str] = None,
        missing_counts: List[str] = None
    ):
        self.indicator_id = indicator_id
        self.passed = passed
        self.status = status  # "Passed", "Failed", "Pending"
        self.missing_items = missing_items or []
        self.missing_counts = missing_counts or []


class IndicatorValidationService:
    """Service for validating indicator submissions."""

    def validate_sub_indicator(
        self,
        db: Session,
        indicator_id: int,
        checked_items: List[str],
        document_counts: Dict[str, int]
    ) -> ValidationResult:
        """
        Validate a sub-indicator based on checked checklist items.

        Args:
            db: Database session
            indicator_id: Sub-indicator ID (e.g., 1.1.1)
            checked_items: List of item_ids that validator checked (e.g., ["1_1_1_a", "1_1_1_b"])
            document_counts: Dict of item_id to document count (e.g., {"1_1_1_f": 3})

        Returns:
            ValidationResult with pass/fail status
        """
        # Get indicator with checklist items
        indicator = db.query(Indicator).filter_by(id=indicator_id).first()

        if not indicator:
            raise ValueError(f"Indicator {indicator_id} not found")

        if indicator.parent_id is None:
            raise ValueError(f"Indicator {indicator_id} is a parent indicator. Use validate_parent_indicator instead.")

        # Get all required checklist items
        required_items = [item for item in indicator.checklist_items if item.required]

        # Validate based on validation_rule
        if indicator.validation_rule == "ALL_ITEMS_REQUIRED":
            return self._validate_all_items_required(
                indicator,
                required_items,
                checked_items,
                document_counts
            )
        elif indicator.validation_rule == "ANY_ITEM_REQUIRED":
            return self._validate_any_item_required(
                indicator,
                required_items,
                checked_items,
                document_counts
            )
        else:
            # Custom validation logic (to be implemented per indicator)
            raise NotImplementedError(f"Validation rule '{indicator.validation_rule}' not implemented")

    def _validate_all_items_required(
        self,
        indicator: Indicator,
        required_items: List[ChecklistItem],
        checked_items: List[str],
        document_counts: Dict[str, int]
    ) -> ValidationResult:
        """
        ALL_ITEMS_REQUIRED: All required checklist items must be checked.
        """
        missing_items = []
        missing_counts = []

        for item in required_items:
            # Check if item is checked
            if item.item_id not in checked_items:
                missing_items.append(item.item_id)
                continue

            # If item requires document count, check if count is provided
            if item.requires_document_count:
                count = document_counts.get(item.item_id, 0)
                if count < 1:
                    missing_counts.append(item.item_id)

        # Determine pass/fail
        passed = len(missing_items) == 0 and len(missing_counts) == 0
        status = "Passed" if passed else "Failed"

        return ValidationResult(
            indicator_id=indicator.id,
            passed=passed,
            status=status,
            missing_items=missing_items,
            missing_counts=missing_counts
        )

    def _validate_any_item_required(
        self,
        indicator: Indicator,
        required_items: List[ChecklistItem],
        checked_items: List[str],
        document_counts: Dict[str, int]
    ) -> ValidationResult:
        """
        ANY_ITEM_REQUIRED: At least one required item must be checked.
        """
        # Check if ANY required item is checked
        any_checked = any(item.item_id in checked_items for item in required_items)

        # If items require document counts, verify at least one has a count
        items_needing_counts = [
            item for item in required_items
            if item.requires_document_count and item.item_id in checked_items
        ]

        if items_needing_counts:
            any_has_count = any(
                document_counts.get(item.item_id, 0) > 0
                for item in items_needing_counts
            )
        else:
            any_has_count = True  # No items need counts

        passed = any_checked and any_has_count
        status = "Passed" if passed else "Failed"

        return ValidationResult(
            indicator_id=indicator.id,
            passed=passed,
            status=status,
            missing_items=[] if any_checked else [item.item_id for item in required_items],
            missing_counts=[] if any_has_count else [item.item_id for item in items_needing_counts]
        )


# Singleton instance
indicator_validation_service = IndicatorValidationService()
```

---

#### Phase 9.2: Parent Indicator Aggregation

**Objective:** Aggregate child indicator results to determine parent indicator status

**Key Principle:**
- Parent indicators (e.g., 1.1) **do NOT have checklist items**
- Parent status is **aggregated from child statuses**
- Default logic: **ALL children must PASS** for parent to PASS

**Implementation:** Add to `indicator_validation_service.py`

```python
class IndicatorValidationService:
    # ... existing methods ...

    def aggregate_parent_indicator(
        self,
        db: Session,
        parent_indicator_id: int,
        child_validation_results: Dict[int, ValidationResult]
    ) -> ValidationResult:
        """
        Aggregate child indicator validation results to determine parent status.

        Args:
            db: Database session
            parent_indicator_id: Parent indicator ID (e.g., 1.1)
            child_validation_results: Dict of child_indicator_id → ValidationResult

        Returns:
            ValidationResult for parent indicator

        Example:
            For indicator 1.1 with children 1.1.1 and 1.1.2:
            - If 1.1.1 PASSED and 1.1.2 PASSED → 1.1 PASSED
            - If 1.1.1 PASSED and 1.1.2 FAILED → 1.1 FAILED
            - If any child PENDING → 1.1 PENDING
        """
        # Get parent indicator
        parent = db.query(Indicator).filter_by(id=parent_indicator_id).first()

        if not parent:
            raise ValueError(f"Indicator {parent_indicator_id} not found")

        if parent.parent_id is not None:
            raise ValueError(f"Indicator {parent_indicator_id} is not a parent indicator")

        # Get all child indicators
        children = db.query(Indicator).filter(
            Indicator.parent_id == parent_indicator_id
        ).all()

        if not children:
            raise ValueError(f"Parent indicator {parent_indicator_id} has no children")

        # Check if all children have been validated
        child_statuses = []
        for child in children:
            result = child_validation_results.get(child.id)
            if not result:
                # Child not yet validated
                return ValidationResult(
                    indicator_id=parent_indicator_id,
                    passed=False,
                    status="Pending"
                )
            child_statuses.append(result.status)

        # Apply aggregation logic based on parent's validation_rule
        # Default: ALL children must PASS
        if parent.validation_rule == "ALL_ITEMS_REQUIRED" or parent.validation_rule is None:
            # ALL children must PASS for parent to PASS
            all_passed = all(status == "Passed" for status in child_statuses)
            any_pending = any(status == "Pending" for status in child_statuses)

            if any_pending:
                status = "Pending"
                passed = False
            elif all_passed:
                status = "Passed"
                passed = True
            else:
                status = "Failed"
                passed = False

        elif parent.validation_rule == "ANY_ITEM_REQUIRED":
            # At least ONE child must PASS for parent to PASS
            any_passed = any(status == "Passed" for status in child_statuses)
            any_pending = any(status == "Pending" for status in child_statuses)

            if any_pending and not any_passed:
                status = "Pending"
                passed = False
            elif any_passed:
                status = "Passed"
                passed = True
            else:
                status = "Failed"
                passed = False
        else:
            raise NotImplementedError(f"Aggregation rule '{parent.validation_rule}' not implemented")

        return ValidationResult(
            indicator_id=parent_indicator_id,
            passed=passed,
            status=status
        )
```

---

#### Phase 9.3: Integration with Assessment Workflow

**Workflow for validating an assessment:**

```python
# Example: Validating indicator 1.1 (BFDP Compliance) for an assessment

from app.services.indicator_validation_service import indicator_validation_service
from app.services.bbi_service import bbi_service

def validate_assessment_indicator(
    db: Session,
    assessment_id: int,
    parent_indicator_code: str,  # e.g., "1.1"
    sub_indicator_validations: Dict[str, Dict]
) -> Dict:
    """
    Validate a parent indicator for an assessment.

    Args:
        assessment_id: Assessment ID
        parent_indicator_code: Parent indicator code (e.g., "1.1")
        sub_indicator_validations: Dict of sub-indicator validations
            Example:
            {
                "1.1.1": {
                    "checked_items": ["1_1_1_a", "1_1_1_b", ...],
                    "document_counts": {"1_1_1_f": 3, "1_1_1_g": 9}
                },
                "1.1.2": {
                    "checked_items": ["1_1_2_a"],
                    "document_counts": {}
                }
            }

    Returns:
        Validation summary with parent and child results
    """
    # Step 1: Get parent indicator
    parent = db.query(Indicator).filter_by(indicator_code=parent_indicator_code).first()

    # Step 2: Validate each sub-indicator
    child_results = {}
    for child in parent.children:
        validation_data = sub_indicator_validations.get(child.indicator_code)

        if not validation_data:
            # Child not validated yet
            child_results[child.id] = ValidationResult(
                indicator_id=child.id,
                passed=False,
                status="Pending"
            )
            continue

        # Validate sub-indicator
        result = indicator_validation_service.validate_sub_indicator(
            db=db,
            indicator_id=child.id,
            checked_items=validation_data["checked_items"],
            document_counts=validation_data.get("document_counts", {})
        )
        child_results[child.id] = result

        # Save sub-indicator result to database
        # (Store in assessment_responses or similar table)

    # Step 3: Aggregate to parent indicator
    parent_result = indicator_validation_service.aggregate_parent_indicator(
        db=db,
        parent_indicator_id=parent.id,
        child_validation_results=child_results
    )

    # Step 4: Update BBI status if this is a BBI indicator
    if parent.is_bbi:
        bbi_result = bbi_service.update_bbi_status(
            db=db,
            assessment_id=assessment_id,
            indicator_id=parent.id,
            indicator_passed=parent_result.passed
        )

    # Step 5: Return summary
    return {
        "parent_indicator": {
            "code": parent.indicator_code,
            "name": parent.name,
            "status": parent_result.status,
            "passed": parent_result.passed
        },
        "children": [
            {
                "code": child.indicator_code,
                "name": child.name,
                "status": child_results[child.id].status,
                "passed": child_results[child.id].passed
            }
            for child in parent.children
        ]
    }
```

---

#### Phase 9.4: Database Schema for Storing Validation Results

We need to store validation results for both sub-indicators and parent indicators.

**Option 1: Use existing `assessment_responses` table**

Add fields to track validation results:
```python
# In assessment_responses table
indicator_validation_status: str  # "Passed", "Failed", "Pending"
checked_items: List[str]  # JSON array of checked item_ids
document_counts: Dict[str, int]  # JSON object of item_id → count
validated_at: datetime
validated_by_user_id: int
```

**Option 2: Create new `indicator_validations` table**

```sql
CREATE TABLE indicator_validations (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id),
    indicator_id INTEGER NOT NULL REFERENCES indicators(id),
    validation_status VARCHAR(20) NOT NULL,  -- "Passed", "Failed", "Pending"
    is_parent BOOLEAN NOT NULL DEFAULT FALSE,
    checked_items JSONB,  -- For sub-indicators
    document_counts JSONB,  -- For sub-indicators
    validated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    validated_by_user_id INTEGER REFERENCES users(id),
    UNIQUE(assessment_id, indicator_id)
);
```

---

#### Phase 9.5: Example Validation Flow

**Scenario: Validating Indicator 1.1 (BFDP Compliance)**

```
Step 1: Validator reviews BLGU submission for 1.1.1
  ↓
Step 2: Validator checks items:
  - 1_1_1_a ✓ (Barangay Financial Report)
  - 1_1_1_b ✓ (Barangay Budget)
  - ... (all 7 items checked)
  - Document counts: {1_1_1_f: 3, 1_1_1_g: 9}
  ↓
Step 3: System validates 1.1.1
  - validation_rule = "ALL_ITEMS_REQUIRED"
  - All required items checked? YES
  - All required counts provided? YES
  - Result: 1.1.1 = PASSED ✓
  ↓
Step 4: Validator reviews BLGU submission for 1.1.2
  ↓
Step 5: Validator checks items:
  - 1_1_2_a ✓ (Received stamp from DILG)
  ↓
Step 6: System validates 1.1.2
  - validation_rule = "ALL_ITEMS_REQUIRED"
  - All required items checked? YES
  - Result: 1.1.2 = PASSED ✓
  ↓
Step 7: System aggregates to parent 1.1
  - Children: [1.1.1 = PASSED, 1.1.2 = PASSED]
  - validation_rule = "ALL_ITEMS_REQUIRED" (default)
  - All children passed? YES
  - Result: 1.1 = PASSED ✓
  ↓
Step 8: System updates BBI status
  - Indicator 1.1 is BBI (BFDP)
  - 1.1 PASSED → BFDP = "Functional" ✓
```

---

**Status:** 🔄 TODO - Implement after indicators are created

---

### 🔄 Phase 9: Frontend Components (TODO)

**Objective:** Build UI components for BLGU, Validator, and GAR views

#### 9.1 BLGU Submission Interface

**Component:** `BLGUIndicatorSubmissionForm`

**Features:**
- Display sub-indicator name and description
- Show upload instructions (e.g., "Upload: 1. BFDP Monitoring Form A, 2. Two (2) Photo Documentation")
- File upload area
- Display checklist items (read-only for BLGU)
- Submit button

**Layout:**
```
┌─────────────────────────────────────────┐
│ 1.1.1 - Posted CY 2023 financial docs   │
├─────────────────────────────────────────┤
│ Upload Instructions:                    │
│ 1. BFDP Monitoring Form A               │
│ 2. Two (2) Photo Documentation          │
│                                         │
│ [📎 Upload Files]                       │
│                                         │
│ Checklist Items:                        │
│ ANNUAL REPORT                           │
│   a. Barangay Financial Report          │
│   b. Barangay Budget                    │
│   ...                                   │
│                                         │
│ [Submit for Validation]                 │
└─────────────────────────────────────────┘
```

**API Usage:**
```typescript
const { data: indicator } = useGetIndicatorByCode('1.1.1');
```

**Status:** 🔄 TODO

---

#### 9.2 Validator Review Interface

**Component:** `ValidatorIndicatorReview`

**Features:**
- Display uploaded documents
- Checklist items grouped by `group_name`
- Checkboxes for validators to mark verified items
- Document count input for items with `requires_document_count: true`
- Validation status (Passed/Failed) based on checked items
- Submit validation button

**Layout:**
```
┌─────────────────────────────────────────┐
│ 1.1.1 - Posted CY 2023 financial docs   │
├─────────────────────────────────────────┤
│ Uploaded Documents:                     │
│ 📄 BFDP_Monitoring_Form_A.pdf           │
│ 📷 Photo1.jpg, Photo2.jpg               │
│                                         │
│ ANNUAL REPORT                           │
│ ☑ a. Barangay Financial Report          │
│ ☑ b. Barangay Budget                    │
│ ☑ c. Summary of Income and Expenditures │
│ ☐ d. 20% Component NTA Utilization      │
│ ☑ e. Annual Procurement Plan            │
│                                         │
│ QUARTERLY REPORT                        │
│ ☑ f. List of Notices of Award           │
│    Document Count: [__3__]              │
│                                         │
│ MONTHLY REPORT                          │
│ ☑ g. Itemized Monthly Collections       │
│    Document Count: [__9__]              │
│                                         │
│ Status: ❌ Failed (1 required item)     │
│                                         │
│ [Submit Validation]                     │
└─────────────────────────────────────────┘
```

**API Usage:**
```typescript
const { data: indicator } = useGetIndicatorByCode('1.1.1');

const submitValidation = async () => {
  await validateIndicator({
    indicatorId: indicator.id,
    checkedItems: ['1_1_1_a', '1_1_1_b', ...],
    documentCounts: {
      '1_1_1_f': 3,
      '1_1_1_g': 9
    }
  });
};
```

**Status:** 🔄 TODO

---

#### 9.3 Governance Assessment Report (GAR) View

**Component:** `GARIndicatorDisplay`

**Features:**
- Display parent indicator with all sub-indicators
- Show validation results for each sub-indicator
- Display checked items and document counts
- Final Pass/Fail status
- Print-friendly layout

**Layout:**
```
┌────────────────────────────────────────────────┐
│ 1.1 - BFDP Compliance (BBI) ✅ PASSED          │
├────────────────────────────────────────────────┤
│                                                │
│ 1.1.1 - Posted CY 2023 financial documents    │
│ Status: ✅ PASSED                              │
│                                                │
│ ANNUAL REPORT                                  │
│   ✅ a. Barangay Financial Report              │
│   ✅ b. Barangay Budget                        │
│   ✅ c. Summary of Income and Expenditures     │
│   ✅ d. 20% Component NTA Utilization          │
│   ✅ e. Annual Procurement Plan                │
│                                                │
│ QUARTERLY REPORT                               │
│   ✅ f. List of Notices of Award (Count: 3)    │
│                                                │
│ MONTHLY REPORT                                 │
│   ✅ g. Itemized Monthly Collections (Count: 9)│
│                                                │
│ ─────────────────────────────────────────────  │
│                                                │
│ 1.1.2 - Accomplished and signed BFR            │
│ Status: ✅ PASSED                              │
│                                                │
│   ✅ a. Received stamp from DILG               │
│                                                │
└────────────────────────────────────────────────┘
```

**API Usage:**
```typescript
const { data: indicatorTree } = useGetIndicatorTree('1.1');
```

**Status:** 🔄 TODO

---

### 🔄 Phase 10: Testing & Quality Assurance (TODO)

**Objective:** Comprehensive testing of hard-coded indicator system

#### Test Coverage

1. **Unit Tests** (`pytest`)
   - Test indicator seeder
   - Test validation logic
   - Test API endpoints
   - Test checklist item retrieval

2. **Integration Tests**
   - Test full BLGU submission workflow
   - Test validator review workflow
   - Test GAR generation

3. **E2E Tests** (`Playwright`)
   - Test BLGU file upload
   - Test validator checkbox validation
   - Test document count input
   - Test validation status updates

4. **Data Validation**
   - Verify all 29 indicators seeded correctly
   - Verify all checklist items present
   - Verify BBI flags correct
   - Verify governance area assignments

**Status:** 🔄 TODO

---

## Database Schema

### Indicators Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `indicator_code` | VARCHAR | e.g., "1.1", "1.1.1" |
| `name` | VARCHAR | Indicator name |
| `description` | VARCHAR | Optional description |
| `governance_area_id` | INTEGER | FK to governance_areas |
| `parent_id` | INTEGER | FK to indicators (for sub-indicators) |
| `is_bbi` | BOOLEAN | Is this a BBI indicator? |
| `is_active` | BOOLEAN | Is this indicator active? |
| `is_auto_calculable` | BOOLEAN | Use automatic validation? |
| `is_profiling_only` | BOOLEAN | Profiling-only flag |
| `validation_rule` | VARCHAR | e.g., "ALL_ITEMS_REQUIRED" |
| `sort_order` | INTEGER | Display order |
| `effective_date` | DATE | When this version became active |
| `retired_date` | DATE | When this version was retired |
| `version` | INTEGER | Version number |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Deprecated Fields** (kept for backward compatibility):
- `form_schema` (JSONB) - Replaced by checklist_items table
- `calculation_schema` (JSONB) - Replaced by validation_rule
- `mov_checklist_items` (JSONB) - Replaced by checklist_items table

---

### Checklist Items Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `indicator_id` | INTEGER | FK to indicators (CASCADE DELETE) |
| `item_id` | VARCHAR(20) | Unique item ID (e.g., "1_1_1_a") |
| `label` | TEXT | Display text (e.g., "a. Barangay Financial Report") |
| `group_name` | VARCHAR(100) | Group header (e.g., "ANNUAL REPORT") |
| `mov_description` | TEXT | Means of Verification description |
| `required` | BOOLEAN | Is this item required for pass? |
| `requires_document_count` | BOOLEAN | Needs document count input? |
| `display_order` | INTEGER | Sort order within indicator |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Constraints:**
- Unique: `(indicator_id, item_id)`
- Foreign Key: `indicator_id` → `indicators.id` (ON DELETE CASCADE)

---

### Relationships

```
governance_areas (6 areas)
  ↓ (1:N)
indicators (parent indicators, parent_id = NULL)
  ↓ (1:N)
indicators (sub-indicators, parent_id = parent.id)
  ↓ (1:N)
checklist_items
```

**Example Data:**

```sql
-- Parent Indicator
INSERT INTO indicators (id, indicator_code, name, governance_area_id, parent_id, is_bbi)
VALUES (671, '1.1', 'BFDP Compliance', 1, NULL, true);

-- Sub-Indicator
INSERT INTO indicators (id, indicator_code, name, governance_area_id, parent_id, validation_rule)
VALUES (672, '1.1.1', 'Posted CY 2023 financial documents', 1, 671, 'ALL_ITEMS_REQUIRED');

-- Checklist Item
INSERT INTO checklist_items (indicator_id, item_id, label, group_name, display_order)
VALUES (672, '1_1_1_a', 'a. Barangay Financial Report', 'ANNUAL REPORT', 1);
```

---

## API Endpoints

### Current Endpoints

#### 1. List All Indicators (Existing)
```http
GET /api/v1/indicators
```
Returns all indicators (flat list)

---

#### 2. Get Indicator by ID (Existing)
```http
GET /api/v1/indicators/{id}
```
Returns indicator by database ID

---

#### 3. Get Indicator by Code (NEW)
```http
GET /api/v1/indicators/code/{indicator_code}
```

**Parameters:**
- `indicator_code` (path): e.g., "1.1.1", "2.1.2"

**Returns:** `SimplifiedIndicatorResponse`

**Use Cases:**
- BLGU submission form
- Validator review interface

**Example Request:**
```bash
curl http://localhost:8000/api/v1/indicators/code/1.1.1
```

**Example Response:**
```json
{
  "id": 672,
  "indicator_code": "1.1.1",
  "name": "Posted the following CY 2023 financial documents in the BFDP board",
  "governance_area_id": 1,
  "parent_id": 671,
  "is_bbi": false,
  "is_active": true,
  "validation_rule": "ALL_ITEMS_REQUIRED",
  "governance_area": {
    "id": 1,
    "name": "Financial Administration and Sustainability",
    "area_type": "Core"
  },
  "checklist_items": [
    {
      "id": 9,
      "item_id": "1_1_1_a",
      "label": "a. Barangay Financial Report",
      "group_name": "ANNUAL REPORT",
      "mov_description": "Barangay Financial Report",
      "required": true,
      "requires_document_count": false,
      "display_order": 1
    }
  ],
  "children": []
}
```

---

#### 4. Get Indicator Tree (NEW)
```http
GET /api/v1/indicators/code/{indicator_code}/tree
```

**Parameters:**
- `indicator_code` (path): Parent indicator code only (e.g., "1.1", "2.1")

**Returns:** `IndicatorTreeResponse`

**Use Cases:**
- Governance Assessment Report (GAR)
- Full indicator hierarchy display

**Example Request:**
```bash
curl http://localhost:8000/api/v1/indicators/code/1.1/tree
```

**Example Response:**
```json
{
  "id": 671,
  "indicator_code": "1.1",
  "name": "Compliance with the Barangay Full Disclosure Policy (BFDP)",
  "description": "Posted the following CY 2023 financial documents...",
  "governance_area_id": 1,
  "is_bbi": true,
  "is_active": true,
  "governance_area": {
    "id": 1,
    "name": "Financial Administration and Sustainability",
    "area_type": "Core"
  },
  "children": [
    {
      "id": 672,
      "indicator_code": "1.1.1",
      "name": "Posted the following CY 2023 financial documents in the BFDP board",
      "governance_area_id": 1,
      "parent_id": 671,
      "is_bbi": false,
      "is_active": true,
      "validation_rule": "ALL_ITEMS_REQUIRED",
      "checklist_items": [ /* 7 items */ ],
      "children": []
    },
    {
      "id": 673,
      "indicator_code": "1.1.2",
      "name": "Accomplished and signed BFR with received stamp from DILG",
      "governance_area_id": 1,
      "parent_id": 671,
      "is_bbi": false,
      "is_active": true,
      "validation_rule": "ALL_ITEMS_REQUIRED",
      "checklist_items": [ /* 1 item */ ],
      "children": []
    }
  ]
}
```

---

### Planned Endpoints

#### 5. Validate Indicator Submission (TODO)
```http
POST /api/v1/indicators/{indicator_id}/validate
```

**Request Body:**
```json
{
  "checked_items": ["1_1_1_a", "1_1_1_b", "1_1_1_c"],
  "document_counts": {
    "1_1_1_f": 3,
    "1_1_1_g": 9
  }
}
```

**Response:**
```json
{
  "indicator_id": 672,
  "indicator_code": "1.1.1",
  "passed": true,
  "status": "Passed",
  "missing_items": [],
  "missing_counts": []
}
```

---

## Frontend Integration

### Generated TypeScript Types

After running `pnpm generate-types`, the following types are available:

```typescript
// packages/shared/src/generated/schemas/indicators/

export interface ChecklistItemResponse {
  id: number;
  item_id: string;
  label: string;
  group_name?: string;
  mov_description?: string;
  required: boolean;
  requires_document_count: boolean;
  display_order: number;
}

export interface SimplifiedIndicatorResponse {
  id: number;
  indicator_code: string;
  name: string;
  description?: string;
  governance_area_id: number;
  parent_id?: number;
  is_bbi: boolean;
  is_active: boolean;
  validation_rule: string;
  governance_area?: GovernanceAreaNested;
  checklist_items: ChecklistItemResponse[];
  children: SimplifiedIndicatorResponse[];
}

export interface IndicatorTreeResponse {
  id: number;
  indicator_code: string;
  name: string;
  description?: string;
  governance_area_id: number;
  is_bbi: boolean;
  is_active: boolean;
  children: SimplifiedIndicatorResponse[];
  governance_area?: GovernanceAreaNested;
}
```

---

### React Query Hooks

```typescript
// packages/shared/src/generated/endpoints/indicators/

// Get indicator by code
export const useGetIndicatorByCode = (indicatorCode: string) => {
  return useQuery({
    queryKey: ['indicators', 'code', indicatorCode],
    queryFn: () => getIndicatorByCode(indicatorCode)
  });
};

// Get indicator tree
export const useGetIndicatorTree = (indicatorCode: string) => {
  return useQuery({
    queryKey: ['indicators', 'code', indicatorCode, 'tree'],
    queryFn: () => getIndicatorTree(indicatorCode)
  });
};
```

---

### Usage Examples

#### BLGU Submission Form

```tsx
import { useGetIndicatorByCode } from '@sinag/shared';

export function BLGUSubmissionForm({ indicatorCode }: { indicatorCode: string }) {
  const { data: indicator, isLoading } = useGetIndicatorByCode(indicatorCode);

  if (isLoading) return <Spinner />;
  if (!indicator) return <Error />;

  return (
    <div>
      <h2>{indicator.name}</h2>

      {/* Upload Instructions */}
      <section>
        <h3>Upload Instructions</h3>
        <p>{indicator.upload_instructions}</p>
        <FileUpload />
      </section>

      {/* Checklist Items (Read-only for BLGU) */}
      <section>
        <h3>Checklist Items</h3>
        {groupBy(indicator.checklist_items, 'group_name').map(group => (
          <div key={group.name}>
            <h4>{group.name}</h4>
            {group.items.map(item => (
              <div key={item.item_id}>{item.label}</div>
            ))}
          </div>
        ))}
      </section>

      <button>Submit for Validation</button>
    </div>
  );
}
```

---

#### Validator Review Interface

```tsx
import { useGetIndicatorByCode } from '@sinag/shared';
import { useState } from 'react';

export function ValidatorReview({ indicatorCode }: { indicatorCode: string }) {
  const { data: indicator } = useGetIndicatorByCode(indicatorCode);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});

  const handleCheckItem = (itemId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const handleSubmitValidation = async () => {
    await validateIndicator({
      indicatorId: indicator.id,
      checkedItems: Array.from(checkedItems),
      documentCounts
    });
  };

  const requiredItems = indicator.checklist_items.filter(item => item.required);
  const allRequiredChecked = requiredItems.every(item => checkedItems.has(item.item_id));
  const passed = allRequiredChecked &&
    requiredItems
      .filter(item => item.requires_document_count)
      .every(item => (documentCounts[item.item_id] || 0) > 0);

  return (
    <div>
      <h2>{indicator.name}</h2>

      {/* Checklist */}
      {groupBy(indicator.checklist_items, 'group_name').map(group => (
        <div key={group.name}>
          <h3>{group.name}</h3>
          {group.items.map(item => (
            <div key={item.item_id}>
              <Checkbox
                checked={checkedItems.has(item.item_id)}
                onChange={() => handleCheckItem(item.item_id)}
              />
              <label>{item.label}</label>

              {item.requires_document_count && (
                <input
                  type="number"
                  placeholder="Count"
                  value={documentCounts[item.item_id] || ''}
                  onChange={e => setDocumentCounts({
                    ...documentCounts,
                    [item.item_id]: parseInt(e.target.value)
                  })}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      <div className={passed ? 'text-green-600' : 'text-red-600'}>
        Status: {passed ? '✅ Passed' : '❌ Failed'}
      </div>

      <button onClick={handleSubmitValidation}>Submit Validation</button>
    </div>
  );
}
```

---

#### GAR Display

```tsx
import { useGetIndicatorTree } from '@sinag/shared';

export function GARIndicatorDisplay({ indicatorCode }: { indicatorCode: string }) {
  const { data: tree } = useGetIndicatorTree(indicatorCode);

  if (!tree) return null;

  return (
    <div className="gar-indicator">
      <h2>
        {tree.indicator_code} - {tree.name}
        {tree.is_bbi && <span className="badge">BBI</span>}
      </h2>

      {tree.children.map(subIndicator => (
        <div key={subIndicator.id} className="sub-indicator">
          <h3>{subIndicator.indicator_code} - {subIndicator.name}</h3>

          {groupBy(subIndicator.checklist_items, 'group_name').map(group => (
            <div key={group.name}>
              <h4>{group.name}</h4>
              {group.items.map(item => (
                <div key={item.item_id} className="checklist-item">
                  {item.checked ? '✅' : '❌'} {item.label}
                  {item.requires_document_count && ` (Count: ${item.count})`}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

## Progress Tracking

### Overall Progress

| Phase | Status | Completion |
|-------|--------|------------|
| 1. Database Schema | ✅ Complete | 100% |
| 2. Python Definitions | ✅ Complete | 100% |
| 3. Database Seeding | ✅ Complete | 100% |
| 4. Pydantic Schemas | ✅ Complete | 100% |
| 5. API Endpoints | ✅ Complete | 100% |
| 6. Type Generation | ✅ Complete | 100% |
| 7. All 29 Indicators | ✅ Complete | 100% (29/29) |
| 8. BBI System Implementation | 🔄 Todo | 0% |
| 9. Validation Service | 🔄 Todo | 0% |
| 10. Frontend Components | 🔄 Todo | 0% |
| 11. Testing & QA | 🔄 Todo | 0% |

**Overall Completion:** ~64% (All indicator definitions complete, ready for BBI system and validation implementation)

---

### Indicator Progress

**All 29 indicators completed on 2025-11-16**

| Governance Area | Indicators | Status |
|----------------|-----------|--------|
| 1. Financial Administration | 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7 (7 total) | ✅ Complete |
| 2. Disaster Preparedness | 2.1, 2.2, 2.3 (3 total) | ✅ Complete |
| 3. Safety, Peace and Order | 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 (6 total) | ✅ Complete |
| 4. Social Protection | 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9 (9 total) | ✅ Complete |
| 5. Business-Friendliness | 5.1, 5.2, 5.3 (3 total) | ✅ Complete |
| 6. Environmental Management | 6.1, 6.2, 6.3 (3 total) | ✅ Complete |

**BBI Indicators (9 total):** All completed
- 2.1 (BDRRMC), 3.1 (BADAC), 3.2 (BPOC), 3.3 (LT), 4.1 (VAW Desk), 4.3 (BDC), 4.5 (BCPC), 4.8 (BNC), 6.1 (BESWMC)

---

### Migration History

| Migration | Description | Status | Date |
|-----------|-------------|--------|------|
| `00bed49217f7` | Add checklist_items table | ✅ Applied | 2025-11-16 |
| `cbeaa8a6cd8d` | Seed indicator 1.1 | ✅ Applied | 2025-11-16 |

---

## Reference Materials

### Source Documents

1. **SGLGB Paper Forms** (provided as images)
   - BLGU View - Shows upload requirements
   - Validator View - Shows checklist verification interface
   - Governance Assessment Report - Shows final output format

2. **Indicator Builder Specification v1.4**
   - Location: `docs/indicator-builder-specification.md`
   - Status: Reference only (over-engineered for our use case)
   - Key sections to reference:
     - MOV checklist item structure
     - Validation status definitions
     - BBI functionality requirements

3. **DILG Memorandum Circulars**
   - DILG MC No. 2014-81 (BFDP)
   - DILG MC No. 2022-027 (BFDP Updates)

---

### Related Files

- **Backend Models:** `apps/api/app/db/models/governance_area.py`
- **Backend Schemas:** `apps/api/app/schemas/indicator.py`
- **Backend Routers:** `apps/api/app/api/v1/indicators.py`
- **Indicator Definitions:** `apps/api/app/indicators/definitions/`
- **Migration Files:** `apps/api/alembic/versions/`
- **Frontend Types:** `packages/shared/src/generated/schemas/indicators/`

---

### Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-16 | Hard-code all 29 indicators | SGLGB indicators are static, rarely change |
| 2025-11-16 | Normalize checklist_items table | Better query performance, cleaner schema |
| 2025-11-16 | Simplify validation logic | Validators check boxes, not complex calculations |
| 2025-11-16 | Document upload at sub-indicator level | Matches real-world BLGU submission workflow |
| 2025-11-16 | Checklist items = sections within documents | Not separate file uploads |

---

## Next Steps

### Phase 8: BBI System Implementation (NEXT PRIORITY)

**Objective:** Connect the 9 BBI functionality indicators to the BBI tracking system

1. **Database Schema Updates**
   - Add `functionality_indicator_id` to `bbis` table
   - Create migration to seed the 9 mandatory BBIs
   - Link each BBI to its corresponding functionality indicator

2. **BBI Service Implementation**
   - Create `bbi_service.py` with status update logic
   - Implement automatic BBI status calculation when indicators are validated
   - Add endpoints to retrieve BBI functionality results per assessment

3. **Integration with Validation Workflow**
   - Update validation service to call BBI service
   - Ensure BBI status updates when BBI indicators pass/fail

### Phase 9: Validation Service (FOLLOWING PRIORITY)

**Objective:** Implement simple validation logic for indicators

1. **Sub-Indicator Validation**
   - Implement ALL_ITEMS_REQUIRED validation rule
   - Implement ANY_ITEM_REQUIRED validation rule
   - Handle document count requirements

2. **Parent Indicator Aggregation**
   - Aggregate child indicator results to parent
   - Determine parent pass/fail based on children

3. **Database Schema for Validation Results**
   - Store validation results per assessment
   - Track checked items and document counts

### Phase 10: Frontend Components

1. **BLGU Submission Interface** - File upload with checklist preview
2. **Validator Review Interface** - Interactive checklist with validation
3. **GAR Display** - Print-friendly assessment report

### Phase 11: Testing & QA

1. **Unit Tests** - Test validation logic, BBI service, API endpoints
2. **Integration Tests** - Test full workflows
3. **E2E Tests** - Test user journeys
4. **Data Validation** - Verify all 29 indicators seeded correctly

---

## Appendix

### Governance Area Mapping

| ID | Name | Type | Indicators |
|----|------|------|------------|
| 1 | Financial Administration and Sustainability | Core | 1.1, 1.2, 1.3 |
| 2 | Disaster Preparedness | Core | 2.1, 2.2, 2.3 |
| 3 | Safety, Peace and Order | Core | 3.1, 3.2, 3.3, 3.4 |
| 4 | Social Protection and Sensitivity | Essential | 4.1, 4.2, 4.3, 4.4, 4.5 |
| 5 | Business-Friendliness and Competitiveness | Essential | 5.1, 5.2 |
| 6 | Environmental Management | Essential | 6.1, 6.2, 6.3 |

---

### Validation Rules

| Rule | Description | Logic |
|------|-------------|-------|
| `ALL_ITEMS_REQUIRED` | All required items must be checked | `passed = all(required_items_checked)` |
| `ANY_ITEM_REQUIRED` | At least one item must be checked | `passed = any(items_checked)` |
| `CUSTOM` | Custom validation logic | To be implemented per indicator |

---

### Document Conventions

**Indicator Code Format:**
- Parent: `X.Y` (e.g., `1.1`)
- Sub-indicator: `X.Y.Z` (e.g., `1.1.1`)

**Checklist Item ID Format:**
- Pattern: `X_Y_Z_a` (e.g., `1_1_1_a`)
- Replace dots with underscores
- Append letter suffix

**Group Names:**
- Use UPPERCASE (e.g., `ANNUAL REPORT`)
- Group related items together
- Order groups logically (Annual → Quarterly → Monthly)

---

**End of Document**
