# Assessors API

The Assessors API provides endpoints for DILG assessors and validators to manage their submission queue, validate assessment responses, request rework from BLGUs, and perform table assessments. This API supports the complete assessor workflow from initial review through final validation.

## Overview

**Base Path**: `/api/v1/assessor`

**Authentication**: All endpoints require VALIDATOR or ASSESSOR role (with governance area-based filtering for VALIDATOR).

**Workflow Context**: These endpoints support Stage 2 (Assessor Review and Validation) and Stage 3 (Table Assessment) of the SGLGB workflow.

**Type Generation**: After modifying any assessor endpoint or schema, run `pnpm generate-types` to update frontend types.

**Governance Area Filtering**: VALIDATOR role users see only assessments within their assigned governance area. ASSESSOR role users have flexible access to any barangay.

---

## Endpoints

### GET /api/v1/assessor/queue

Get the assessor's secure submissions queue.

**Authentication**: ASSESSOR or VALIDATOR role required

**Workflow Stage**: Stage 2 (Assessor Review Queue)

**Description**: Returns a list of submissions filtered by the assessor's governance area (for VALIDATORs) or all submissions (for ASSESSORs). The queue shows assessments that are ready for review, in progress, or requiring attention.

**Request Body**: None

**Response** (200 OK):
```json
[
  {
    "assessment_id": 123,
    "barangay_name": "Barangay San Isidro",
    "submission_date": "2025-01-11T14:00:00Z",
    "status": "SUBMITTED",
    "updated_at": "2025-01-11T14:00:00Z"
  },
  {
    "assessment_id": 125,
    "barangay_name": "Barangay Santa Cruz",
    "submission_date": "2025-01-10T09:30:00Z",
    "status": "IN_REVIEW",
    "updated_at": "2025-01-12T11:15:00Z"
  },
  {
    "assessment_id": 130,
    "barangay_name": "Barangay Poblacion",
    "submission_date": "2025-01-09T16:45:00Z",
    "status": "SUBMITTED",
    "updated_at": "2025-01-09T16:45:00Z"
  }
]
```

**Errors**:
- `403 Forbidden`: User does not have ASSESSOR or VALIDATOR role

---

### GET /api/v1/assessor/assessments/{assessment_id}

Get detailed assessment data for assessor review.

**Authentication**: ASSESSOR or VALIDATOR role required

**Workflow Stage**: Stage 2 (Assessor Review Detail View)

**Description**: Returns full assessment details including assessment metadata, BLGU user information, barangay details, all responses with indicators and technical notes, MOVs (Means of Verification), and feedback comments from assessors. Technical notes provide guidance during the review process.

**Business Rules**:
- VALIDATORs can only access assessments within their assigned governance area
- ASSESSORs can access any assessment

**Path Parameters**:
- `assessment_id` (integer, required): The ID of the assessment to retrieve

**Request Body**: None

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Assessment details retrieved successfully",
  "assessment_id": 123,
  "assessment": {
    "id": 123,
    "status": "SUBMITTED",
    "blgu_user": {
      "id": 45,
      "name": "Juan Dela Cruz",
      "email": "juan@barangay-sanisidro.gov.ph"
    },
    "barangay": {
      "id": 10,
      "name": "Barangay San Isidro",
      "municipality": "Dumaguete City",
      "province": "Negros Oriental"
    },
    "submitted_at": "2025-01-11T14:00:00Z",
    "responses": [
      {
        "id": 789,
        "indicator": {
          "id": 5,
          "name": "Budget Transparency",
          "description": "Barangay must maintain transparent budget records",
          "technical_notes": "Verify that budget is published in accessible format (PDF/print) and updated quarterly"
        },
        "response_data": {
          "budget_published": "yes",
          "budget_amount": 500000
        },
        "is_completed": true,
        "validation_status": "PASSED",
        "assessor_remarks": "Budget documentation is comprehensive",
        "movs": [
          {
            "id": 456,
            "file_name": "budget_2025.pdf",
            "file_url": "https://storage.supabase.co/...",
            "uploaded_by": "BLGU User",
            "uploaded_at": "2025-01-08T10:00:00Z"
          }
        ],
        "feedback_comments": [
          {
            "comment": "Good documentation, but needs more detail on expenditures",
            "is_public": true,
            "created_at": "2025-01-09T14:30:00Z"
          }
        ]
      }
    ],
    "created_at": "2025-01-05T09:00:00Z",
    "updated_at": "2025-01-11T14:00:00Z"
  }
}
```

**Errors**:
- `403 Forbidden`: User does not have permission to view this assessment (VALIDATOR accessing outside assigned area)
- `404 Not Found`: Assessment not found

---

### POST /api/v1/assessor/assessment-responses/{response_id}/validate

Validate an assessment response.

**Authentication**: ASSESSOR or VALIDATOR role required

**Workflow Stage**: Stage 2 (Assessment Validation)

**Description**: Validates a specific assessment response with a validation status (Pass/Fail/Conditional Pass/Not Applicable/Pending). Saves public comments (visible to BLGU), internal notes (visible only to assessors), and assessor remarks for validators to review.

**Business Rules**:
- Public comments are visible to BLGU users
- Internal notes are visible only to DILG staff
- Assessor remarks are saved to assessment_response for validators
- VALIDATORs can only validate responses within their assigned governance area

**Path Parameters**:
- `response_id` (integer, required): The ID of the assessment response to validate

**Request Body**:
```json
{
  "validation_status": "PASSED",
  "public_comment": "Budget documentation is comprehensive and meets all requirements. Well organized.",
  "internal_note": "Cross-checked with municipal records - amounts match. BLGU is well-prepared.",
  "assessor_remarks": "All budget transparency requirements satisfied. Supporting documents are complete."
}
```

**Validation Status Options**:
- `PASSED`: Indicator fully complies with requirements
- `FAILED`: Indicator does not meet requirements
- `CONDITIONAL_PASS`: Indicator meets requirements with minor issues
- `NOT_APPLICABLE`: Indicator does not apply to this barangay
- `PENDING`: Validation not yet complete

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Assessment response validated successfully",
  "assessment_response_id": 789,
  "validation_status": "PASSED"
}
```

**Errors**:
- `403 Forbidden`: User does not have permission to validate this response
- `404 Not Found`: Assessment response not found

---

### POST /api/v1/assessor/assessment-responses/{response_id}/movs

Upload a MOV (Means of Verification) for an assessment response (JSON-based).

**Authentication**: ASSESSOR or VALIDATOR role required

**Workflow Stage**: Stage 3 (Table Assessment - Assessor MOV Upload)

**Description**: Allows assessors to upload MOVs for assessment responses they are reviewing. This is for JSON-based uploads where the file has already been uploaded to Supabase Storage. The assessor must have permission to review responses in the same governance area as the assessment response's indicator.

**Note**: For multipart file uploads, use the `/movs/upload` endpoint instead.

**Path Parameters**:
- `response_id` (integer, required): The ID of the assessment response

**Request Body**:
```json
{
  "response_id": 789,
  "file_name": "assessor_verification_report.pdf",
  "file_url": "https://storage.supabase.co/object/public/movs/assessor/789/verification_report.pdf",
  "file_size": 1024000,
  "file_type": "application/pdf"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "MOV uploaded successfully",
  "mov_id": 457,
  "storage_path": "movs/assessor/789/verification_report.pdf",
  "mov": {
    "id": 457,
    "response_id": 789,
    "file_name": "assessor_verification_report.pdf",
    "file_url": "https://storage.supabase.co/object/public/movs/assessor/789/verification_report.pdf",
    "uploaded_by": "Assessor",
    "uploaded_at": "2025-01-12T10:30:00Z"
  }
}
```

**Errors**:
- `400 Bad Request`: MOV response_id does not match URL parameter
- `403 Forbidden`: User does not have permission to upload MOV for this response

---

### POST /api/v1/assessor/assessment-responses/{response_id}/movs/upload

Upload a MOV file via multipart/form-data for an assessment response.

**Authentication**: ASSESSOR or VALIDATOR role required

**Workflow Stage**: Stage 3 (Table Assessment - Assessor MOV Upload)

**Description**: Accepts a file upload and handles the complete flow: validates assessor permissions, uploads file to Supabase Storage via storage_service, creates MOV record marked as "Uploaded by Assessor", and returns the stored path and MOV entity. The assessor must have permission to review responses in the same governance area as the assessment response's indicator.

**Path Parameters**:
- `response_id` (integer, required): The ID of the assessment response

**Request Body** (multipart/form-data):
- `file` (file, required): The MOV file to upload
- `filename` (string, optional): Custom filename (if not provided, uses file.filename)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "MOV file uploaded successfully",
  "mov_id": 458,
  "storage_path": "movs/assessor/789/table_assessment_photo.jpg",
  "mov": {
    "id": 458,
    "response_id": 789,
    "file_name": "table_assessment_photo.jpg",
    "file_url": "https://storage.supabase.co/object/public/movs/assessor/789/table_assessment_photo.jpg",
    "uploaded_by": "Assessor",
    "uploaded_at": "2025-01-12T14:15:00Z"
  }
}
```

**Errors**:
- `403 Forbidden`: User does not have permission to upload MOV for this response
- `500 Internal Server Error`: File upload failed

---

### POST /api/v1/assessor/assessments/{assessment_id}/rework

Send assessment back to BLGU user for rework.

**Authentication**: ASSESSOR or VALIDATOR role required

**Workflow Stage**: Stage 2 (Rework Request)

**Description**: Changes the assessment status to 'REWORK' and triggers a notification to the BLGU user. This endpoint fails with a 403 error if the assessment's rework_count is not 0 (meaning it has already been sent for rework once). The assessor must have permission to review assessments in their governance area.

**Business Rules**:
- Only one rework cycle is allowed per assessment
- Assessment must be in SUBMITTED or IN_REVIEW status
- Unlocks assessment for BLGU editing
- BLGU user receives notification with rework comments

**Path Parameters**:
- `assessment_id` (integer, required): The ID of the assessment to send for rework

**Request Body**: None (rework comments are provided via separate endpoint)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Assessment sent for rework successfully",
  "assessment_id": 123,
  "rework_count": 1,
  "status": "REWORK"
}
```

**Errors**:
- `400 Bad Request`: Invalid status or rework limit reached
- `403 Forbidden`: User does not have permission to send this assessment for rework
- `404 Not Found`: Assessment not found

---

### POST /api/v1/assessor/assessments/{assessment_id}/finalize

Finalize assessment validation, permanently locking it.

**Authentication**: ASSESSOR or VALIDATOR role required

**Workflow Stage**: Stage 2 → Stage 3 Transition (Finalization)

**Description**: Changes the assessment status to 'VALIDATED', permanently locking the assessment from further edits by either the BLGU or the Assessor. This action can only be performed if all assessment responses have been reviewed (have a validation status). The assessor must have permission to review assessments in their governance area.

**Business Rules**:
- All assessment responses must have a validation status (PASSED, FAILED, CONDITIONAL_PASS, NOT_APPLICABLE)
- Assessment is permanently locked after finalization
- Triggers classification algorithm (3+1 rule) automatically
- Sets validated_at timestamp

**Path Parameters**:
- `assessment_id` (integer, required): The ID of the assessment to finalize

**Request Body**: None

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Assessment finalized successfully",
  "assessment_id": 123,
  "status": "VALIDATED",
  "validated_at": "2025-01-15T16:00:00Z",
  "final_compliance_status": "PASSED"
}
```

**Errors**:
- `400 Bad Request`: Not all responses have been validated
- `403 Forbidden`: User does not have permission to finalize this assessment
- `404 Not Found`: Assessment not found

---

### POST /api/v1/assessor/assessments/{assessment_id}/classify

Manually trigger the classification algorithm for an assessment.

**Authentication**: ASSESSOR or VALIDATOR role required

**Workflow Stage**: Stage 4 (Classification)

**Description**: Applies the "3+1" SGLGB compliance rule to determine if the barangay has passed or failed the assessment. This endpoint is primarily for testing purposes - classification automatically runs during finalization. The assessor must have permission to review assessments in their governance area.

**3+1 Rule**:
- Barangay must pass at least 3 out of 6 governance areas
- PLUS pass all Basic Barangay Indicators (BBIs) - mandatory requirements

**Path Parameters**:
- `assessment_id` (integer, required): The ID of the assessment to classify

**Request Body**: None

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Assessment classified successfully",
  "assessment_id": 123,
  "final_compliance_status": "PASSED",
  "area_results": {
    "GA-1": {"passed": 4, "failed": 1, "total": 5, "percentage": 80.0},
    "GA-2": {"passed": 5, "failed": 0, "total": 5, "percentage": 100.0},
    "GA-3": {"passed": 3, "failed": 2, "total": 5, "percentage": 60.0},
    "GA-4": {"passed": 4, "failed": 1, "total": 5, "percentage": 80.0},
    "GA-5": {"passed": 2, "failed": 3, "total": 5, "percentage": 40.0},
    "GA-6": {"passed": 4, "failed": 1, "total": 5, "percentage": 80.0}
  },
  "passed_areas": 4,
  "failed_areas": 2,
  "bbi_compliance": true,
  "rule_applied": "3+1"
}
```

**Errors**:
- `404 Not Found`: Assessment not found
- `500 Internal Server Error`: Classification failed

---

### GET /api/v1/assessor/analytics

Get analytics data for the assessor's governance area.

**Authentication**: ASSESSOR or VALIDATOR role required

**Workflow Stage**: Stage 2 (Analytics Dashboard)

**Description**: Returns comprehensive analytics including performance overview (totals, pass/fail counts, pass rate, trend series), systemic weaknesses/hotspots (top underperforming indicators/areas with affected barangays and reasons), and workflow metrics (counts/durations by status, average review times, and rework metrics).

**Business Rules**:
- VALIDATORs see analytics filtered by their assigned governance area
- ASSESSORs see system-wide analytics (all governance areas)
- Analytics are calculated using existing assessment and response data

**Request Body**: None

**Response** (200 OK):
```json
{
  "overview": {
    "total_assessed": 50,
    "passed": 35,
    "failed": 15,
    "pass_rate": 70.0,
    "trend_series": [
      {"month": "January", "passed": 10, "failed": 5},
      {"month": "February", "passed": 15, "failed": 5},
      {"month": "March", "passed": 10, "failed": 5}
    ]
  },
  "hotspots": [
    {
      "indicator": "Budget Transparency",
      "indicator_id": 5,
      "failed_count": 20,
      "barangays": ["Barangay A", "Barangay B", "Barangay C"],
      "reason": "Incomplete budget documentation and lack of quarterly updates"
    },
    {
      "indicator": "Community Participation",
      "indicator_id": 12,
      "failed_count": 18,
      "barangays": ["Barangay D", "Barangay E", "Barangay F"],
      "reason": "Insufficient evidence of community consultation processes"
    }
  ],
  "workflow": {
    "avg_time_to_first_review": 2.5,
    "avg_rework_cycle_time": 5.3,
    "total_reviewed": 50,
    "rework_rate": 30.0,
    "counts_by_status": {
      "DRAFT": 10,
      "SUBMITTED": 15,
      "IN_REVIEW": 5,
      "REWORK": 8,
      "VALIDATED": 12
    }
  }
}
```

**Errors**:
- `403 Forbidden`: User does not have ASSESSOR or VALIDATOR role
- `500 Internal Server Error`: Failed to retrieve analytics

---

## Data Models

### ValidationStatus Enum

```python
PASSED = "PASSED"                          # Fully complies
FAILED = "FAILED"                          # Does not meet requirements
CONDITIONAL_PASS = "CONDITIONAL_PASS"      # Meets with minor issues
NOT_APPLICABLE = "NOT_APPLICABLE"          # Does not apply
PENDING = "PENDING"                        # Not yet validated
```

### AssessmentStatus Enum

```python
DRAFT = "DRAFT"                            # Initial BLGU state
SUBMITTED = "SUBMITTED"                    # Submitted for review
IN_REVIEW = "IN_REVIEW"                    # Under assessor review
REWORK = "REWORK"                          # Sent back for corrections
VALIDATED = "VALIDATED"                    # Final validated state
```

### ComplianceStatus Enum

```python
PASSED = "PASSED"                          # Passed 3+1 rule
FAILED = "FAILED"                          # Failed 3+1 rule
PENDING = "PENDING"                        # Not yet classified
```

---

## Assessor Workflow

### Stage 2: Assessment Review

```
1. View Queue (/queue)
   ↓
2. Select Assessment (/assessments/{id})
   ↓
3. Review Each Response:
   - Validate response (/assessment-responses/{id}/validate)
   - Upload assessor MOVs if needed (/assessment-responses/{id}/movs/upload)
   - Add public comments and internal notes
   ↓
4. Decision:
   - Option A: Send for Rework (/assessments/{id}/rework)
   - Option B: Finalize (/assessments/{id}/finalize)
```

### Stage 3: Table Assessment

```
1. Conduct in-person validation
   ↓
2. Upload table assessment MOVs (/assessment-responses/{id}/movs/upload)
   ↓
3. Update validation status as needed
   ↓
4. Finalize assessment (/assessments/{id}/finalize)
```

### Stage 4: Classification

```
Automatic on finalization:
- Apply 3+1 rule
- Set final_compliance_status
- Generate area_results
```

---

## Business Rules

### Governance Area Filtering (VALIDATOR Role)

- **VALIDATOR** users have a `validator_area_id` field linking them to a specific governance area
- VALIDATORs can only access assessments containing indicators within their assigned area
- This ensures validators focus on their area of expertise
- **ASSESSOR** users have no governance area restrictions

### Rework Cycle Limits

- Only **one rework cycle** is allowed per assessment
- After BLGU resubmits, assessment proceeds to final validation
- `rework_count` field enforces this limit (max value: 1)

### Validation Completeness

- All assessment responses must have a validation status before finalization
- Validation status options: PASSED, FAILED, CONDITIONAL_PASS, NOT_APPLICABLE, PENDING
- System checks completeness before allowing finalization

### Comment Visibility

- **Public comments**: Visible to BLGU users (guidance and feedback)
- **Internal notes**: Visible only to DILG staff (coordination and internal observations)
- **Assessor remarks**: Saved to assessment_response for validators to review

---

## Permission Matrix

| Action | BLGU_USER | ASSESSOR | VALIDATOR | MLGOO_DILG |
|--------|-----------|----------|-----------|------------|
| View queue | - | ✓ (all) | ✓ (area) | ✓ (all) |
| View assessment details | ✓ (own) | ✓ (all) | ✓ (area) | ✓ (all) |
| Validate responses | - | ✓ (all) | ✓ (area) | ✓ (all) |
| Upload assessor MOVs | - | ✓ (all) | ✓ (area) | ✓ (all) |
| Send for rework | - | ✓ (all) | ✓ (area) | ✓ (all) |
| Finalize assessment | - | ✓ (all) | ✓ (area) | ✓ (all) |
| Trigger classification | - | ✓ (all) | ✓ (area) | ✓ (all) |
| View analytics | - | ✓ (all) | ✓ (area) | ✓ (all) |

**Legend**:
- ✓ (own): User can access their own resources only
- ✓ (area): User can access resources within their assigned governance area
- ✓ (all): User can access all resources

---

## Notes

- **Type Generation**: Always run `pnpm generate-types` after modifying assessor endpoints or schemas
- **Governance Area Security**: The system enforces governance area filtering at the service layer using the `get_current_area_assessor_user` dependency
- **Table Assessment**: The MOV upload endpoints support both JSON-based and multipart file uploads for flexibility
- **3+1 Rule**: Classification is automatic during finalization but can be manually triggered for testing
- **Analytics**: Minimal implementation that can be extended as UI requirements grow
