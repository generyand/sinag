# Assessors API

The Assessors API provides endpoints for DILG assessors and validators to manage their submission queue, validate assessment responses, request rework from BLGUs, request calibration (validators only), manage MOV annotations, and perform table assessments. This API supports the complete assessor workflow from initial review through final validation.

**Last Updated**: 2025-12-06

## Overview

**Base Path**: `/api/v1/assessor`

**Authentication**: All endpoints require VALIDATOR or ASSESSOR role (with governance area-based filtering for VALIDATOR).

**Workflow Context**: These endpoints support Stage 2 (Assessor Review and Validation), Stage 3 (Table Assessment), and Validator Calibration of the SGLGB workflow.

**Type Generation**: After modifying any assessor endpoint or schema, run `pnpm generate-types` to update frontend types.

**Governance Area Filtering**: VALIDATOR role users see only assessments within their assigned governance area. ASSESSOR role users have flexible access to any barangay.

**Calibration Support**: Validators can request calibration for their governance area, which routes the assessment back to the same Validator after BLGU corrections.

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
        "validation_status": "PASS",
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
  "validation_status": "PASS",
  "public_comment": "Budget documentation is comprehensive and meets all requirements. Well organized.",
  "internal_note": "Cross-checked with municipal records - amounts match. BLGU is well-prepared.",
  "assessor_remarks": "All budget transparency requirements satisfied. Supporting documents are complete."
}
```

**Validation Status Options**:
- `PASS`: Indicator fully complies with requirements
- `FAIL`: Indicator does not meet requirements
- `CONDITIONAL`: Indicator meets requirements with minor issues (conditional pass)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Assessment response validated successfully",
  "assessment_response_id": 789,
  "validation_status": "PASS"
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

**Description**: For **Assessors**: Changes the assessment status to `AWAITING_FINAL_VALIDATION`, forwarding to validators. For **Validators**: Changes status to `AWAITING_MLGOO_APPROVAL` (or `COMPLETED` if MLGOO approval is not required), permanently locking the assessment. This action can only be performed if all assessment responses have been reviewed (have a validation status). The user must have permission to review assessments in their governance area.

**Business Rules**:
- All assessment responses must have a validation status (PASS, FAIL, CONDITIONAL)
- Assessor finalization: Status → `AWAITING_FINAL_VALIDATION`
- Validator finalization: Status → `AWAITING_MLGOO_APPROVAL` or `COMPLETED`
- Assessment is permanently locked after final completion
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
  "status": "AWAITING_MLGOO_APPROVAL",
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

### POST /api/v1/assessor/assessments/{assessment_id}/request-calibration

Request calibration for an assessment (Validator only).

**Authentication**: VALIDATOR role required

**Workflow Stage**: Validator Calibration (after Stage 2)

**Description**: Allows a Validator to request calibration for indicators in their assigned governance area. The assessment is sent back to BLGU for targeted corrections and will return to the same Validator (not the general Assessor queue). Generates an AI-powered calibration summary in multiple languages to help BLGU understand the issues.

**Business Rules**:
- Only Validators can request calibration (Assessors cannot)
- Calibration is limited to the Validator's assigned governance area
- After BLGU corrections, assessment returns to the same Validator
- Supports parallel calibration - multiple Validators can request calibration for different areas simultaneously
- Generates AI summary in Bisaya (ceb), English (en), and Tagalog (fil)

**Path Parameters**:
- `assessment_id` (integer, required): The ID of the assessment to calibrate

**Request Body**:
```json
{
  "reason": "Optional reason for calibration request",
  "indicator_ids": [5, 7, 12]  // Optional: specific indicators to flag
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Calibration requested successfully",
  "assessment_id": 123,
  "is_calibration_rework": true,
  "calibration_validator_id": 45,
  "calibration_governance_area_id": 2,
  "calibration_governance_area_name": "Disaster Preparedness",
  "pending_calibrations_count": 1
}
```

**Errors**:
- `403 Forbidden`: User is not a Validator or not assigned to the assessment's governance area
- `404 Not Found`: Assessment not found
- `400 Bad Request`: Assessment is not in a valid state for calibration

---

## MOV Annotation Endpoints

These endpoints allow assessors and validators to annotate uploaded MOV files (PDFs and images) with highlights, rectangles, and comments.

### POST /api/v1/assessor/movs/{mov_file_id}/annotations

Create an annotation on a MOV file.

**Authentication**: ASSESSOR or VALIDATOR role required

**Description**: Creates an annotation on a MOV file. Supports rectangle annotations for images and page-based annotations for PDFs. Annotations are visible to BLGU users during rework/calibration.

**Path Parameters**:
- `mov_file_id` (integer, required): The ID of the MOV file to annotate

**Request Body**:
```json
{
  "annotation_type": "rectangle",
  "page": 1,
  "rect": {
    "x": 10.5,
    "y": 20.3,
    "width": 100.0,
    "height": 50.0
  },
  "comment": "This section is incomplete. Please provide the missing budget breakdown."
}
```

**Annotation Types**:
- `highlight`: Text highlight (PDF only)
- `underline`: Text underline (PDF only)
- `rectangle`: Rectangle annotation (PDF and images)

**Response** (200 OK):
```json
{
  "id": 789,
  "mov_file_id": 456,
  "annotation_type": "rectangle",
  "page": 1,
  "rect": {"x": 10.5, "y": 20.3, "width": 100.0, "height": 50.0},
  "comment": "This section is incomplete...",
  "created_by_id": 45,
  "created_at": "2025-11-27T10:30:00Z"
}
```

**Errors**:
- `403 Forbidden`: User does not have permission to annotate this MOV
- `404 Not Found`: MOV file not found

---

### GET /api/v1/assessor/movs/{mov_file_id}/annotations

Get all annotations for a MOV file.

**Authentication**: ASSESSOR or VALIDATOR role required

**Path Parameters**:
- `mov_file_id` (integer, required): The ID of the MOV file

**Response** (200 OK):
```json
[
  {
    "id": 789,
    "mov_file_id": 456,
    "annotation_type": "rectangle",
    "page": 1,
    "rect": {"x": 10.5, "y": 20.3, "width": 100.0, "height": 50.0},
    "comment": "This section is incomplete...",
    "created_by_id": 45,
    "created_at": "2025-11-27T10:30:00Z"
  }
]
```

---

### GET /api/v1/assessor/assessments/{assessment_id}/annotations

Get all annotations for an entire assessment.

**Authentication**: ASSESSOR or VALIDATOR role required

**Description**: Returns all MOV annotations for an assessment, grouped by indicator and MOV file. Useful for displaying a summary view of all feedback.

**Path Parameters**:
- `assessment_id` (integer, required): The ID of the assessment

**Response** (200 OK):
```json
{
  "assessment_id": 123,
  "total_annotations": 5,
  "annotations_by_indicator": {
    "5": [
      {
        "id": 789,
        "mov_file_id": 456,
        "mov_filename": "budget_report.pdf",
        "annotation_type": "rectangle",
        "page": 1,
        "rect": {...},
        "comment": "..."
      }
    ],
    "7": [...]
  }
}
```

---

### PATCH /api/v1/assessor/annotations/{annotation_id}

Update an existing annotation.

**Authentication**: ASSESSOR or VALIDATOR role required

**Description**: Updates an annotation's comment or position. Only the annotation creator can update it.

**Path Parameters**:
- `annotation_id` (integer, required): The ID of the annotation to update

**Request Body**:
```json
{
  "comment": "Updated comment text",
  "rect": {"x": 15.0, "y": 25.0, "width": 100.0, "height": 50.0}
}
```

**Response** (200 OK):
```json
{
  "id": 789,
  "comment": "Updated comment text",
  "rect": {"x": 15.0, "y": 25.0, "width": 100.0, "height": 50.0},
  "updated_at": "2025-11-27T11:00:00Z"
}
```

**Errors**:
- `403 Forbidden`: User is not the annotation creator
- `404 Not Found`: Annotation not found

---

### DELETE /api/v1/assessor/annotations/{annotation_id}

Delete an annotation.

**Authentication**: ASSESSOR or VALIDATOR role required

**Description**: Deletes an annotation. Only the annotation creator can delete it.

**Path Parameters**:
- `annotation_id` (integer, required): The ID of the annotation to delete

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Annotation deleted successfully"
}
```

**Errors**:
- `403 Forbidden`: User is not the annotation creator
- `404 Not Found`: Annotation not found

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
      "AWAITING_FINAL_VALIDATION": 7,
      "AWAITING_MLGOO_APPROVAL": 3,
      "COMPLETED": 12
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
PASS = "PASS"                              # Fully complies
FAIL = "FAIL"                              # Does not meet requirements
CONDITIONAL = "CONDITIONAL"                # Meets with minor issues (conditional pass)
```

**Note**: The actual enum values in code are `PASS`, `FAIL`, and `CONDITIONAL` (not `PASSED`/`FAILED`/`CONDITIONAL_PASS`). Ensure API requests use the correct values.

### AssessmentStatus Enum

```python
DRAFT = "DRAFT"                            # Initial BLGU state
SUBMITTED = "SUBMITTED"                    # Submitted for review
IN_REVIEW = "IN_REVIEW"                    # Under assessor review
REWORK = "REWORK"                          # Sent back for corrections
AWAITING_FINAL_VALIDATION = "AWAITING_FINAL_VALIDATION"  # Assessor finalized, awaiting validator
AWAITING_MLGOO_APPROVAL = "AWAITING_MLGOO_APPROVAL"      # Validators done, awaiting MLGOO approval
COMPLETED = "COMPLETED"                    # Final validated and approved state
```

**Legacy Status Mappings** (for backward compatibility):
- `SUBMITTED_FOR_REVIEW` → `SUBMITTED`
- `NEEDS_REWORK` → `REWORK`
- `VALIDATED` → `COMPLETED`

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

### Calibration Limits

- **One calibration** per governance area is allowed
- Calibration is requested by Validators (not Assessors)
- After BLGU submits for calibration, assessment returns to the same Validator
- `calibration_count` field tracks calibrations (max value: 1 per area)
- Multiple Validators can request calibration for different areas simultaneously (parallel calibration)

### Validation Completeness

- All assessment responses must have a validation status before finalization
- Validation status options: `PASS`, `FAIL`, `CONDITIONAL`
- System checks completeness before allowing finalization

### Comment Visibility

- **Public comments**: Visible to BLGU users (guidance and feedback)
- **Assessor remarks**: Saved to assessment_response for validators to review
- **MOV annotations**: Visible to BLGU users during rework/calibration

### AI Summary Generation

- Rework summaries generated when Assessor sends for rework
- Calibration summaries generated when Validator requests calibration
- Summaries available in three languages: Bisaya (ceb), English (en), Tagalog (fil)
- Language preference stored in `users.preferred_language`

---

## Permission Matrix

| Action | BLGU_USER | ASSESSOR | VALIDATOR | MLGOO_DILG |
|--------|-----------|----------|-----------|------------|
| View queue | - | All | Area only | All |
| View assessment details | Own only | All | Area only | All |
| Validate responses | - | All | Area only | All |
| Upload assessor MOVs | - | All | Area only | All |
| Send for rework | - | All | - | All |
| Request calibration | - | - | Area only | - |
| Create MOV annotations | - | All | Area only | All |
| Finalize assessment | - | All | Area only | All |
| Trigger classification | - | All | Area only | All |
| View analytics | - | All | Area only | All |

**Legend**:
- **Own only**: User can access their own resources only
- **Area only**: User can access resources within their assigned governance area
- **All**: User can access all resources
- **-**: Action not permitted for this role

---

## Notes

- **Type Generation**: Always run `pnpm generate-types` after modifying assessor endpoints or schemas
- **Governance Area Security**: The system enforces governance area filtering at the service layer using the `get_current_area_assessor_user` dependency
- **Table Assessment**: The MOV upload endpoints support both JSON-based and multipart file uploads for flexibility
- **3+1 Rule**: Classification is automatic during finalization but can be manually triggered for testing
- **Analytics**: Minimal implementation that can be extended as UI requirements grow
- **Calibration**: Introduced in November 2025 to support Validator-specific targeted corrections
- **Parallel Calibration**: Multiple Validators can request calibration simultaneously for different governance areas
- **AI Summaries**: Multi-language support (Bisaya, English, Tagalog) for rework and calibration summaries
- **MOV Annotations**: Interactive annotations on PDFs and images, visible to BLGU during rework/calibration

---

## Related Documentation

- [Assessor Validation Workflow](../../workflows/assessor-validation.md) - Complete workflow documentation
- [BLGU Assessment Workflow](../../workflows/blgu-assessment.md) - BLGU submission and rework/calibration handling
- [Intelligence Layer](../../workflows/intelligence-layer.md) - AI-generated summaries and recommendations
- [User Roles and Permissions](../../../CLAUDE.md#user-roles-and-permissions) - Complete role definitions
