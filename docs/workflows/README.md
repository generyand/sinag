# Business Workflows Documentation

This section documents the SGLGB assessment workflows implemented in SINAG.

## Overview

SINAG implements a complete digital workflow for the Seal of Good Local Governance for Barangays
(SGLGB) assessment process.

## Workflow Documents

- [BLGU Assessment](./blgu-assessment.md) - BLGU self-assessment submission workflow
- [Assessor Validation](./assessor-validation.md) - Assessor review, Validator calibration, and
  rework cycles
- [Classification Algorithm](./classification-algorithm.md) - Automated "3+1" SGLGB scoring
- [Intelligence Layer](./intelligence-layer.md) - AI-powered insights, recommendations, and
  multi-language summaries

## Workflow Stages

### 1. BLGU Self-Assessment

BLGUs complete a self-evaluation document (SED) and upload Means of Verification (MOVs).

### 2. Assessor Review (Rework Cycle)

DILG Assessors review submissions and provide consolidated rework feedback. One rework cycle is
allowed.

### 3. Validator Calibration

DILG Validators assigned to specific governance areas perform final validation. Validators can
request **calibration** - targeted corrections that route back to the same Validator (not the
general Assessor queue).

### 4. Table Validation

In-person validation meeting where validators use SINAG as a live compliance checklist.

### 5. Classification

Automated "3+1" SGLGB logic calculates official pass/fail result from validated data.

### 6. Intelligence & Insights

Gemini API generates CapDev recommendations and rework/calibration summaries in multiple languages
(Bisaya, English, Tagalog).

### 7. Gap Analysis

System compares initial submission vs. final validation to identify common weaknesses.

## Actors and Roles

| Role                       | Description                                      | Access Scope                  |
| -------------------------- | ------------------------------------------------ | ----------------------------- |
| **BLGU_USER**              | Barangay users who submit self-assessments       | Own barangay only             |
| **ASSESSOR**               | DILG Assessors who review and provide feedback   | All barangays                 |
| **VALIDATOR**              | DILG Validators who determine Pass/Fail status   | Assigned governance area only |
| **MLGOO_DILG**             | Municipal administrators with full system access | System-wide                   |
| **KATUPARAN_CENTER_USER**  | External stakeholder with read-only analytics    | Aggregated data only          |
| **UMDC_PEACE_CENTER_USER** | External stakeholder (filtered insights)         | Aggregated data only          |

## Workflow Comparison: Assessor vs Validator

| Aspect                     | Assessor      | Validator          |
| -------------------------- | ------------- | ------------------ |
| **Reviews submissions**    | Yes           | Yes                |
| **Provides feedback**      | Yes           | Yes                |
| **Sets Pass/Fail**         | No            | Yes                |
| **Requests rework**        | Yes (1 cycle) | No                 |
| **Requests calibration**   | No            | Yes (per area)     |
| **Governance area filter** | None          | Assigned area only |

## Key Concepts

### Rework vs Calibration

- **Rework**: Requested by Assessors during initial review. Assessment returns to general Assessor
  queue after BLGU corrections. Limited to one cycle per assessment.

- **Calibration**: Requested by Validators during final validation. Assessment returns to the **same
  Validator** who requested it. Limited to one cycle per governance area. Supports parallel
  calibration (multiple Validators can request calibration simultaneously).

### AI-Generated Summaries

When rework or calibration is requested, the system generates AI-powered summaries to help BLGU
users understand what needs to be corrected:

- **Rework Summary**: Overall assessment feedback from Assessor review
- **Calibration Summary**: Per-governance-area feedback from Validator review
- **Multi-language**: Supports Bisaya (ceb), English (en), and Tagalog (fil)
- **Stored fields**: `rework_summary`, `calibration_summary`, `calibration_summaries_by_area`

### Parallel Calibration

Multiple Validators can request calibration for different governance areas simultaneously:

```
Assessment in AWAITING_FINAL_VALIDATION
    |
    +-- Validator A (Area 1) --> Request Calibration
    +-- Validator B (Area 2) --> Request Calibration
    +-- Validator C (Area 3) --> Approve
    |
    v
BLGU Dashboard shows:
- pending_calibrations_count: 2
- calibration_governance_areas: [{area 1 details}, {area 2 details}]
- ai_summaries_by_area: {area_1: {ceb: ..., en: ...}, area_2: {...}}
```

## Related Documentation

- [Architecture Overview](../architecture.md)
- [API Endpoints - Assessors](../api/endpoints/assessors.md)
- [BLGU Dashboard API](../api/endpoints/blgu-dashboard.md)
- [User Roles and Permissions](../../CLAUDE.md#user-roles-and-permissions)
