# Assessments API

The Assessments API provides endpoints for BLGU users to manage their self-assessment submissions
for the SGLGB (Seal of Good Local Governance for Barangays) process. This API handles the complete
lifecycle of barangay assessments from draft creation through submission and validation.

## Overview

**Base Path**: `/api/v1/assessments`

**Authentication**: All endpoints require authentication. Most endpoints are restricted to BLGU_USER
role unless otherwise specified.

**Workflow Context**: These endpoints support Stage 1 (Initial BLGU Submission) and Stage 2
(Assessor Review) of the SGLGB workflow.

**Type Generation**: After modifying any assessment endpoint or schema, run `pnpm generate-types` to
update frontend types.

---

## Multi-Year Assessment Support

As of December 2024, assessment endpoints support multi-year filtering. The following endpoints
accept an optional `year` query parameter:

| Endpoint             | Default Behavior |
| -------------------- | ---------------- |
| `GET /dashboard`     | Uses active year |
| `GET /my-assessment` | Uses active year |
| `GET /all-validated` | Uses active year |

If no `year` parameter is provided, endpoints default to the currently **active** assessment year.
If no year is active, a `400 Bad Request` error is returned with the message "No active assessment
year found."

See also: [Assessment Years API](/docs/api/endpoints/assessment-years.md)

---

## Endpoints

### GET /api/v1/assessments/dashboard

Get dashboard data for the logged-in BLGU user's assessment.

**Authentication**: BLGU_USER role required

**Workflow Stage**: Stage 1 (BLGU Submission) - Dashboard Overview

**Description**: Returns dashboard-specific data optimized for overview and progress tracking,
including progress statistics, governance area summaries, performance metrics, and recent feedback.
Automatically creates an assessment if one doesn't exist for the BLGU user (for the active year
only).

**Query Parameters**:

| Parameter | Type    | Required | Description                                                                       |
| --------- | ------- | -------- | --------------------------------------------------------------------------------- |
| `year`    | integer | No       | Assessment year (e.g., 2025). Defaults to active year. Must be between 2020-2100. |

**Request Body**: None

**Response** (200 OK):

```json
{
  "assessment_id": 123,
  "status": "DRAFT",
  "progress": {
    "total_indicators": 29,
    "completed_indicators": 15,
    "completion_percentage": 51.7
  },
  "governance_area_progress": [
    {
      "area_id": 1,
      "area_name": "Financial Administration",
      "completed": 3,
      "total": 5,
      "percentage": 60.0
    }
  ],
  "performance_metrics": {
    "responses_requiring_rework": 2,
    "responses_with_feedback": 8,
    "responses_with_movs": 12
  },
  "recent_feedback": [
    {
      "indicator_name": "Budget Transparency",
      "comment": "Please provide updated financial reports",
      "timestamp": "2025-01-10T14:30:00Z"
    }
  ],
  "created_at": "2025-01-05T09:00:00Z",
  "updated_at": "2025-01-10T15:45:00Z"
}
```

**Errors**:

- `403 Forbidden`: User does not have BLGU_USER role
- `500 Internal Server Error`: Failed to retrieve dashboard data

---

### GET /api/v1/assessments/my-assessment

Get the complete assessment data for the logged-in BLGU user.

**Authentication**: BLGU_USER role required

**Workflow Stage**: Stage 1 (BLGU Submission) - Form Data

**Description**: Returns the full assessment data including assessment status, all governance areas
with their indicators, form schemas for each indicator, existing response data, MOVs (Means of
Verification), and feedback comments from assessors. Automatically creates an assessment if one
doesn't exist (for the active year only).

**Query Parameters**:

| Parameter | Type    | Required | Description                                                                       |
| --------- | ------- | -------- | --------------------------------------------------------------------------------- |
| `year`    | integer | No       | Assessment year (e.g., 2025). Defaults to active year. Must be between 2020-2100. |

**Request Body**: None

**Response** (200 OK):

```json
{
  "assessment": {
    "id": 123,
    "status": "DRAFT",
    "blgu_user_id": 45,
    "created_at": "2025-01-05T09:00:00Z",
    "updated_at": "2025-01-10T15:45:00Z",
    "submitted_at": null,
    "validated_at": null
  },
  "governance_areas": [
    {
      "id": 1,
      "name": "Financial Administration",
      "code": "GA-1",
      "indicators": [
        {
          "id": 5,
          "name": "Budget Transparency",
          "description": "Barangay must maintain transparent budget records",
          "form_schema": {
            "fields": [
              {
                "field_id": "budget_published",
                "type": "radio",
                "label": "Is the budget published publicly?",
                "required": true,
                "options": [
                  { "id": "yes", "label": "Yes" },
                  { "id": "no", "label": "No" }
                ]
              }
            ]
          },
          "response_data": {
            "budget_published": "yes"
          },
          "movs": [
            {
              "id": 101,
              "file_name": "budget_2025.pdf",
              "file_url": "https://storage.supabase.co/...",
              "uploaded_at": "2025-01-08T10:00:00Z"
            }
          ],
          "feedback_comments": [
            {
              "comment": "Budget is clear but needs more detail on expenditures",
              "created_at": "2025-01-09T14:30:00Z",
              "is_public": true
            }
          ]
        }
      ]
    }
  ]
}
```

**Errors**:

- `403 Forbidden`: User does not have BLGU_USER role
- `500 Internal Server Error`: Failed to retrieve assessment data

---

### GET /api/v1/assessments/responses/{response_id}

Get a specific assessment response by ID.

**Authentication**: BLGU_USER role required

**Workflow Stage**: Stage 1 (BLGU Submission)

**Description**: Returns a single assessment response with all related data including response data
(JSON), completion status, MOVs, and feedback comments. The response must belong to the current
user's assessment.

**Path Parameters**:

- `response_id` (integer, required): The ID of the assessment response

**Request Body**: None

**Response** (200 OK):

```json
{
  "id": 789,
  "assessment_id": 123,
  "indicator_id": 5,
  "response_data": {
    "budget_published": "yes",
    "budget_amount": 500000
  },
  "is_completed": true,
  "requires_rework": false,
  "validation_status": "Passed",
  "generated_remark": "All requirements met",
  "assessor_remarks": "Good documentation provided",
  "created_at": "2025-01-06T10:00:00Z",
  "updated_at": "2025-01-10T14:30:00Z"
}
```

**Errors**:

- `403 Forbidden`: Response does not belong to current user's assessment
- `404 Not Found`: Assessment response not found

---

### PUT /api/v1/assessments/responses/{response_id}

Update an assessment response with validation.

**Authentication**: BLGU_USER role required

**Workflow Stage**: Stage 1 (BLGU Submission)

**Description**: Updates the response data and validates it against the indicator's form schema. The
response data must conform to the JSON schema defined in the indicator's form_schema field. Only
responses in DRAFT or NEEDS_REWORK status can be updated.

**Business Rules**:

- Only responses belonging to the current user's assessment can be updated
- Response data is validated against the indicator's form schema
- Completion status is automatically updated based on response data
- Assessment must be in DRAFT or NEEDS_REWORK status

**Path Parameters**:

- `response_id` (integer, required): The ID of the assessment response

**Request Body**:

```json
{
  "response_data": {
    "budget_published": "yes",
    "budget_amount": 750000,
    "fiscal_year": "2025"
  },
  "is_completed": true
}
```

**Response** (200 OK):

```json
{
  "id": 789,
  "assessment_id": 123,
  "indicator_id": 5,
  "response_data": {
    "budget_published": "yes",
    "budget_amount": 750000,
    "fiscal_year": "2025"
  },
  "is_completed": true,
  "requires_rework": false,
  "validation_status": null,
  "created_at": "2025-01-06T10:00:00Z",
  "updated_at": "2025-01-11T09:15:00Z"
}
```

**Errors**:

- `400 Bad Request`: Assessment status does not allow updates (must be DRAFT or NEEDS_REWORK)
- `403 Forbidden`: Response does not belong to current user's assessment
- `404 Not Found`: Assessment response not found
- `422 Unprocessable Entity`: Response data does not match form schema

---

### POST /api/v1/assessments/responses

Create a new assessment response.

**Authentication**: BLGU_USER role required

**Workflow Stage**: Stage 1 (BLGU Submission)

**Description**: Creates a new response for a specific indicator in the user's assessment. The
response data is validated against the indicator's form schema.

**Request Body**:

```json
{
  "assessment_id": 123,
  "indicator_id": 7,
  "response_data": {
    "community_programs": "yes",
    "program_count": 5
  },
  "is_completed": false
}
```

**Response** (201 Created):

```json
{
  "id": 790,
  "assessment_id": 123,
  "indicator_id": 7,
  "response_data": {
    "community_programs": "yes",
    "program_count": 5
  },
  "is_completed": false,
  "requires_rework": false,
  "validation_status": null,
  "created_at": "2025-01-11T10:00:00Z",
  "updated_at": "2025-01-11T10:00:00Z"
}
```

**Errors**:

- `403 Forbidden`: Assessment does not belong to current user
- `404 Not Found`: Assessment not found for current user
- `422 Unprocessable Entity`: Response data validation failed

---

### POST /api/v1/assessments/{assessment_id}/submit

Submit an assessment for assessor review.

**Authentication**: BLGU_USER role required

**Workflow Stage**: Stage 1 → Stage 2 Transition (Submission)

**Description**: Submits the assessment for review. Runs a preliminary compliance check before
submission to ensure no "YES" answers exist without corresponding MOVs (Means of Verification).
Updates assessment status to "SUBMITTED" and sets submission timestamp.

**Path Parameters**:

- `assessment_id` (integer, required): The ID of the assessment to submit

**Request Body**: None

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Assessment submitted successfully",
  "assessment_id": 123,
  "submitted_at": "2025-01-11T14:00:00Z"
}
```

**Errors**:

- `400 Bad Request`: Submission failed (YES answers without MOV detected, or incomplete indicators)
- `403 Forbidden`: Only BLGU users can submit assessments, or assessment doesn't belong to user
- `404 Not Found`: Assessment not found

---

### POST /api/v1/assessments/{assessment_id}/resubmit

Resubmit an assessment after completing rework.

**Authentication**: BLGU_USER role required

**Workflow Stage**: Stage 2 (Rework Cycle Completion)

**Description**: Allows a BLGU user to resubmit their assessment after addressing the assessor's
rework comments. The assessment must be in REWORK status and pass validation again. No further
rework is allowed after resubmission (rework_count = 1).

**Business Rules**:

- Assessment must be in REWORK status
- Assessment must pass validation (completeness + MOVs)
- Only one rework cycle is allowed per assessment

**Path Parameters**:

- `assessment_id` (integer, required): The ID of the assessment to resubmit

**Request Body**: None

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Assessment resubmitted successfully",
  "assessment_id": 123,
  "resubmitted_at": "2025-01-15T10:30:00Z",
  "rework_count": 1
}
```

**Errors**:

- `400 Bad Request`: Invalid status or validation failed
- `403 Forbidden`: User not authorized to resubmit
- `404 Not Found`: Assessment not found

---

### POST /api/v1/assessments/responses/{response_id}/movs

Upload a MOV (Means of Verification) file for an assessment response.

**Authentication**: BLGU_USER role required

**Workflow Stage**: Stage 1 (BLGU Submission)

**Description**: Creates a record of the uploaded file in the database. The actual file upload to
Supabase Storage should be handled by the frontend before calling this endpoint.

**Path Parameters**:

- `response_id` (integer, required): The ID of the assessment response

**Request Body**:

```json
{
  "response_id": 789,
  "file_name": "financial_report_2025.pdf",
  "file_url": "https://storage.supabase.co/object/public/movs/123/789/financial_report_2025.pdf",
  "file_size": 2457600,
  "file_type": "application/pdf"
}
```

**Response** (201 Created):

```json
{
  "id": 456,
  "response_id": 789,
  "file_name": "financial_report_2025.pdf",
  "file_url": "https://storage.supabase.co/object/public/movs/123/789/financial_report_2025.pdf",
  "file_size": 2457600,
  "file_type": "application/pdf",
  "uploaded_by": "BLGU User",
  "uploaded_at": "2025-01-11T11:00:00Z",
  "status": "UPLOADED"
}
```

**Errors**:

- `400 Bad Request`: MOV response_id does not match URL parameter
- `403 Forbidden`: Response does not belong to current user's assessment
- `404 Not Found`: Assessment response not found

---

### DELETE /api/v1/assessments/movs/{mov_id}

Delete a MOV (Means of Verification) file.

**Authentication**: BLGU_USER role required

**Workflow Stage**: Stage 1 (BLGU Submission)

**Description**: Removes the MOV record from the database. The actual file deletion from Supabase
Storage should be handled separately by the frontend.

**Path Parameters**:

- `mov_id` (integer, required): The ID of the MOV to delete

**Request Body**: None

**Response** (200 OK):

```json
{
  "message": "MOV deleted successfully"
}
```

**Errors**:

- `403 Forbidden`: MOV does not belong to current user's assessment
- `404 Not Found`: MOV not found

---

### POST /api/v1/assessments/{assessment_id}/answers

Save form responses for an assessment.

**Authentication**: BLGU_USER or ASSESSOR role

**Workflow Stage**: Stage 1 (BLGU Submission) or Stage 3 (Table Validation)

**Description**: Saves form field responses for a specific indicator in an assessment. Performs
comprehensive field validation against the indicator's form schema.

**Permissions**:

- BLGU users can save answers for their own assessments
- Assessors can save answers for any assessment (for table validation)

**Path Parameters**:

- `assessment_id` (integer, required): The ID of the assessment

**Query Parameters**:

- `indicator_id` (integer, required): The ID of the indicator

**Request Body**:

```json
{
  "responses": [
    { "field_id": "budget_published", "value": "yes" },
    { "field_id": "budget_amount", "value": 500000 },
    { "field_id": "programs", "value": ["education", "health", "infrastructure"] }
  ]
}
```

**Field Type Validation**:

- `text/textarea`: value must be string
- `number`: value must be numeric (int or float)
- `date`: value must be ISO date string
- `select/radio`: value must be string matching one of the field's option IDs
- `checkbox`: value must be array of strings matching the field's option IDs

**Response** (200 OK):

```json
{
  "message": "Responses saved successfully",
  "assessment_id": 123,
  "indicator_id": 5,
  "saved_count": 3
}
```

**Errors**:

- `400 Bad Request`: Assessment is locked for editing (status is SUBMITTED or VALIDATED)
- `403 Forbidden`: User not authorized to modify this assessment
- `404 Not Found`: Assessment or indicator not found
- `422 Unprocessable Entity`: Field validation errors (field not found, type mismatch, invalid
  option)

---

### GET /api/v1/assessments/{assessment_id}/answers

Retrieve saved form responses for a specific indicator in an assessment.

**Authentication**: BLGU_USER or ASSESSOR role

**Workflow Stage**: Stage 1 (BLGU Submission) or Stage 2 (Assessor Review)

**Description**: Retrieves the saved form field responses for a specific indicator. Returns empty
array if no responses saved yet.

**Permissions**:

- BLGU users can retrieve answers for their own assessments
- Assessors can retrieve answers for any assessment

**Path Parameters**:

- `assessment_id` (integer, required): The ID of the assessment

**Query Parameters**:

- `indicator_id` (integer, required): The ID of the indicator

**Request Body**: None

**Response** (200 OK):

```json
{
  "assessment_id": 123,
  "indicator_id": 5,
  "responses": [
    { "field_id": "budget_published", "value": "yes" },
    { "field_id": "budget_amount", "value": 500000 }
  ],
  "created_at": "2025-01-08T12:00:00Z",
  "updated_at": "2025-01-08T12:30:00Z"
}
```

**Errors**:

- `403 Forbidden`: User not authorized to view this assessment
- `404 Not Found`: Assessment not found

---

### POST /api/v1/assessments/{assessment_id}/validate-completeness

Validate completeness of all indicators in an assessment.

**Authentication**: All authenticated users

**Workflow Stage**: Stage 1 (Pre-Submission Check)

**Description**: Checks if all required fields are filled for all indicators. Does NOT expose
compliance status (Pass/Fail) - only checks completeness.

**Path Parameters**:

- `assessment_id` (integer, required): The ID of the assessment

**Request Body**: None

**Response** (200 OK):

```json
{
  "is_complete": false,
  "total_indicators": 29,
  "complete_indicators": 25,
  "incomplete_indicators": 4,
  "incomplete_details": [
    {
      "indicator_id": 5,
      "indicator_title": "Financial Management",
      "missing_required_fields": ["budget_amount", "fiscal_year"]
    },
    {
      "indicator_id": 12,
      "indicator_title": "Community Programs",
      "missing_required_fields": ["program_count"]
    }
  ]
}
```

**Errors**:

- `404 Not Found`: Assessment not found

---

### POST /api/v1/assessments/{assessment_id}/request-rework

Request rework on a submitted assessment (Assessor/Validator action).

**Authentication**: ASSESSOR, VALIDATOR, or MLGOO_DILG role

**Workflow Stage**: Stage 2 (Assessor Review → Rework Request)

**Description**: Allows an assessor/validator to request changes to a BLGU submission. Only one
rework cycle is allowed per assessment (enforced by rework_count check).

**Business Rules**:

- Assessment must be in SUBMITTED status
- rework_count must be less than 1 (only one rework cycle allowed)
- Comments are required (min 10 characters)
- Unlocks assessment for BLGU editing

**Path Parameters**:

- `assessment_id` (integer, required): The ID of the assessment

**Request Body**:

```json
{
  "comments": "Please provide more detailed documentation for the budget allocation process. The current submission lacks supporting evidence for expenditure categories."
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Rework requested successfully",
  "assessment_id": 123,
  "rework_count": 1,
  "rework_requested_at": "2025-01-12T14:00:00Z"
}
```

**Errors**:

- `400 Bad Request`: Invalid status or rework limit reached
- `403 Forbidden`: User not authorized (must be assessor/validator)
- `404 Not Found`: Assessment not found

---

### GET /api/v1/assessments/{assessment_id}/submission-status

Get the submission status of an assessment.

**Authentication**: All authenticated users (with role-based restrictions)

**Workflow Stage**: All stages (Status Check)

**Description**: Provides comprehensive information about an assessment's submission state,
including current status, lock state, rework information, and validation results.

**Authorization**:

- BLGU_USER: Can only check their own assessments
- ASSESSOR/VALIDATOR/MLGOO_DILG: Can check any assessment

**Path Parameters**:

- `assessment_id` (integer, required): The ID of the assessment

**Request Body**: None

**Response** (200 OK):

```json
{
  "assessment_id": 123,
  "status": "REWORK",
  "is_locked": false,
  "rework_count": 1,
  "rework_comments": "Please provide more detailed documentation for the budget allocation process.",
  "rework_requested_at": "2025-01-12T14:00:00Z",
  "rework_requested_by": 78,
  "validation_result": {
    "is_valid": true,
    "error_message": null,
    "incomplete_indicators": [],
    "missing_movs": []
  }
}
```

**Errors**:

- `403 Forbidden`: BLGU user trying to access another barangay's assessment
- `404 Not Found`: Assessment not found

---

### GET /api/v1/assessments/list

Get all validated assessments with compliance status (Admin endpoint).

**Authentication**: MLGOO_DILG or SUPERADMIN role

**Workflow Stage**: Stage 4 (Intelligence & Reporting)

**Description**: Returns a list of all validated assessments with their compliance status, area
results, and barangay information. Used for MLGOO reports dashboard.

**Query Parameters**:

- `status` (AssessmentStatus, optional): Filter by assessment status (defaults to VALIDATED)

**Request Body**: None

**Response** (200 OK):

```json
[
  {
    "assessment_id": 123,
    "barangay_id": 45,
    "barangay_name": "Barangay San Isidro",
    "status": "VALIDATED",
    "final_compliance_status": "PASSED",
    "validated_at": "2025-01-15T16:00:00Z",
    "area_results": {
      "GA-1": { "passed": 4, "failed": 1, "total": 5 },
      "GA-2": { "passed": 5, "failed": 0, "total": 5 }
    },
    "ai_recommendations": {
      "strengths": ["Strong financial management", "Excellent community programs"],
      "improvement_areas": ["Transparency reporting needs enhancement"]
    }
  }
]
```

**Errors**:

- `403 Forbidden`: User does not have admin privileges
- `500 Internal Server Error`: Failed to retrieve assessments

---

### POST /api/v1/assessments/{id}/generate-insights

Generate AI-powered insights for a validated assessment (Background task).

**Authentication**: All authenticated users

**Workflow Stage**: Stage 4 (Intelligence Layer)

**Description**: Dispatches a background Celery task to generate AI insights using the Gemini API.
The task runs asynchronously with automatic retry logic (max 3 attempts with exponential backoff).
Results are stored in the ai_recommendations field.

**Business Rules**:

- Only works for assessments with VALIDATED status
- Returns 202 Accepted immediately (asynchronous processing)
- Results are cached to avoid duplicate API calls
- Frontend should poll assessment endpoint to check for ai_recommendations field

**Path Parameters**:

- `id` (integer, required): The ID of the assessment

**Request Body**: None

**Response** (202 Accepted):

```json
{
  "message": "AI insight generation started",
  "assessment_id": 123,
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "processing"
}
```

**Response** (200 OK - if insights already cached):

```json
{
  "message": "AI insights already generated",
  "assessment_id": 123,
  "insights_cached": true,
  "status": "completed"
}
```

**Errors**:

- `400 Bad Request`: Assessment must be validated to generate insights
- `404 Not Found`: Assessment not found

---

## Data Models

### AssessmentStatus Enum

```python
DRAFT = "DRAFT"                        # Initial state
SUBMITTED = "SUBMITTED"                # After BLGU submission
REWORK = "REWORK"                      # Assessor requested changes
IN_REVIEW = "IN_REVIEW"                # Assessor reviewing
VALIDATED = "VALIDATED"                # Final validated state
```

### ComplianceStatus Enum

```python
PASSED = "PASSED"                      # Passed 3+1 rule
FAILED = "FAILED"                      # Failed 3+1 rule
PENDING = "PENDING"                    # Not yet classified
```

### Assessment Lifecycle

```
DRAFT → SUBMITTED → IN_REVIEW → VALIDATED
          ↓              ↓
        REWORK ←────────┘
          ↓
      SUBMITTED (resubmission, rework_count=1)
```

---

## Business Rules

### Rework Cycle Limits

- Only **one rework cycle** is allowed per assessment
- After resubmission, the assessment proceeds directly to validation
- `rework_count` field enforces this limit (max value: 1)

### Validation Requirements

1. **Completeness**: All required fields must be filled for all indicators
2. **MOVs**: All "YES" answers must have corresponding MOV files uploaded
3. **Schema Compliance**: Response data must match indicator form_schema

### Permission Matrix

| Action                | BLGU_USER | ASSESSOR | VALIDATOR | MLGOO_DILG |
| --------------------- | --------- | -------- | --------- | ---------- |
| View own assessment   | ✓         | -        | -         | -          |
| Submit assessment     | ✓         | -        | -         | -          |
| Resubmit after rework | ✓         | -        | -         | -          |
| Request rework        | -         | ✓        | ✓         | ✓          |
| Save answers          | ✓ (own)   | ✓ (any)  | ✓ (any)   | ✓ (any)    |
| View all assessments  | -         | -        | -         | ✓          |
| Generate insights     | ✓         | ✓        | ✓         | ✓          |

---

## Notes

- **Type Generation**: Always run `pnpm generate-types` after modifying assessment endpoints or
  schemas
- **Celery Tasks**: The AI insights endpoint triggers background jobs - ensure Celery worker is
  running
- **MOV Storage**: Frontend handles actual file uploads to Supabase Storage before calling MOV
  endpoints
- **Form Validation**: All response data is validated against indicator form_schema for data
  integrity
