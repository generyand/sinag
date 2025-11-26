# Business Workflows Documentation

This section documents the SGLGB assessment workflows implemented in SINAG.

## Overview

SINAG implements a complete digital workflow for the Seal of Good Local Governance for Barangays (SGLGB) assessment process.

## Workflow Documents

- [BLGU Assessment](./blgu-assessment.md) - BLGU self-assessment submission workflow
- [Assessor Validation](./assessor-validation.md) - Assessor review and rework cycle
- [Classification Algorithm](./classification-algorithm.md) - Automated "3+1" SGLGB scoring
- [Intelligence Layer](./intelligence-layer.md) - AI-powered insights and recommendations

## Workflow Stages

### 1. BLGU Self-Assessment
BLGUs complete a self-evaluation document (SED) and upload Means of Verification (MOVs).

### 2. Assessor Review (Rework Cycle)
DILG Area Assessors review submissions and provide consolidated rework feedback. One rework cycle is allowed.

### 3. Table Validation
In-person validation meeting where assessors use SINAG as a live compliance checklist.

### 4. Classification
Automated "3+1" SGLGB logic calculates official pass/fail result from validated data.

### 5. Intelligence & Insights
Gemini API generates CapDev recommendations based on assessment outcomes.

### 6. Gap Analysis
System compares initial submission vs. final validation to identify common weaknesses.

## Actors and Roles

- **BLGU**: Barangay users who submit self-assessments
- **Assessor**: DILG Area Assessors who validate submissions
- **MLGOO-DILG**: Municipal administrators who manage the system
- **Admin**: System administrators
