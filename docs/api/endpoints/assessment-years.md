# Assessment Years API Endpoints

**Base URL:** `/api/v1/assessment-years` **Tags:** `assessment-years`

## Overview

The Assessment Years API provides endpoints for managing annual SGLGB assessment cycles. This
includes creating year configurations, setting phase deadlines, and controlling the year lifecycle
(activation and publication).

**Authorization:** All endpoints require authentication. Most operations require `MLGOO_DILG` role.

---

## Endpoints

### List All Assessment Years

```
GET /api/v1/assessment-years
```

Returns all assessment years ordered by year descending.

**Authorization:** `MLGOO_DILG` only

**Query Parameters:**

| Parameter             | Type    | Required | Description                                           |
| --------------------- | ------- | -------- | ----------------------------------------------------- |
| `include_unpublished` | boolean | No       | Include unpublished years (default: `true` for MLGOO) |

**Response:** `200 OK`

```json
{
  "years": [
    {
      "id": 1,
      "year": 2025,
      "assessment_period_start": "2025-01-01T00:00:00Z",
      "assessment_period_end": "2025-10-31T23:59:59Z",
      "phase1_deadline": "2025-03-31T23:59:59Z",
      "rework_deadline": "2025-05-31T23:59:59Z",
      "phase2_deadline": "2025-07-31T23:59:59Z",
      "calibration_deadline": "2025-09-30T23:59:59Z",
      "is_active": true,
      "is_published": false,
      "description": "SGLGB 2025 Assessment Cycle",
      "created_at": "2024-12-01T10:00:00Z",
      "activated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "active_year": 2025
}
```

---

### Create Assessment Year

```
POST /api/v1/assessment-years
```

Creates a new assessment year configuration. The year is created in an inactive, unpublished state.

**Authorization:** `MLGOO_DILG` only

**Request Body:**

```json
{
  "year": 2026,
  "assessment_period_start": "2026-01-01T00:00:00Z",
  "assessment_period_end": "2026-10-31T23:59:59Z",
  "phase1_deadline": "2026-03-31T23:59:59Z",
  "rework_deadline": "2026-05-31T23:59:59Z",
  "phase2_deadline": "2026-07-31T23:59:59Z",
  "calibration_deadline": "2026-09-30T23:59:59Z",
  "description": "SGLGB 2026 Assessment Cycle"
}
```

| Field                     | Type     | Required | Description                           |
| ------------------------- | -------- | -------- | ------------------------------------- |
| `year`                    | integer  | Yes      | The assessment year (e.g., 2026)      |
| `assessment_period_start` | datetime | Yes      | Start of the assessment period        |
| `assessment_period_end`   | datetime | Yes      | End of the assessment period          |
| `phase1_deadline`         | datetime | No       | Phase 1 (initial submission) deadline |
| `rework_deadline`         | datetime | No       | Rework submission deadline            |
| `phase2_deadline`         | datetime | No       | Phase 2 (final submission) deadline   |
| `calibration_deadline`    | datetime | No       | Calibration/validation deadline       |
| `description`             | string   | No       | Optional description or notes         |

**Response:** `201 Created`

```json
{
  "id": 2,
  "year": 2026,
  "assessment_period_start": "2026-01-01T00:00:00Z",
  "assessment_period_end": "2026-10-31T23:59:59Z",
  "phase1_deadline": "2026-03-31T23:59:59Z",
  "rework_deadline": "2026-05-31T23:59:59Z",
  "phase2_deadline": "2026-07-31T23:59:59Z",
  "calibration_deadline": "2026-09-30T23:59:59Z",
  "is_active": false,
  "is_published": false,
  "description": "SGLGB 2026 Assessment Cycle",
  "created_at": "2025-12-01T10:00:00Z"
}
```

**Errors:**

| Status | Description                        |
| ------ | ---------------------------------- |
| `400`  | Year already exists                |
| `403`  | User does not have MLGOO_DILG role |
| `422`  | Invalid request body               |

---

### Get Assessment Year

```
GET /api/v1/assessment-years/{year}
```

Returns details for a specific assessment year.

**Authorization:** `MLGOO_DILG` only

**Path Parameters:**

| Parameter | Type    | Description                      |
| --------- | ------- | -------------------------------- |
| `year`    | integer | The assessment year (e.g., 2025) |

**Response:** `200 OK`

```json
{
  "id": 1,
  "year": 2025,
  "assessment_period_start": "2025-01-01T00:00:00Z",
  "assessment_period_end": "2025-10-31T23:59:59Z",
  "phase1_deadline": "2025-03-31T23:59:59Z",
  "rework_deadline": "2025-05-31T23:59:59Z",
  "phase2_deadline": "2025-07-31T23:59:59Z",
  "calibration_deadline": "2025-09-30T23:59:59Z",
  "is_active": true,
  "is_published": false,
  "description": "SGLGB 2025 Assessment Cycle",
  "created_at": "2024-12-01T10:00:00Z",
  "activated_at": "2025-01-01T00:00:00Z",
  "activated_by_id": 1
}
```

**Errors:**

| Status | Description    |
| ------ | -------------- |
| `404`  | Year not found |

---

### Update Assessment Year

```
PUT /api/v1/assessment-years/{year}
```

Updates an existing assessment year configuration.

**Authorization:** `MLGOO_DILG` only

**Path Parameters:**

| Parameter | Type    | Description                   |
| --------- | ------- | ----------------------------- |
| `year`    | integer | The assessment year to update |

**Request Body:**

```json
{
  "assessment_period_end": "2025-11-30T23:59:59Z",
  "calibration_deadline": "2025-10-31T23:59:59Z",
  "description": "Extended assessment period"
}
```

All fields are optional. Only provided fields are updated.

**Response:** `200 OK`

Returns the updated year object.

---

### Delete Assessment Year

```
DELETE /api/v1/assessment-years/{year}
```

Deletes an assessment year. Only allowed if:

- Year is not active
- No assessments are linked to the year

**Authorization:** `MLGOO_DILG` only

**Response:** `204 No Content`

**Errors:**

| Status | Description                                  |
| ------ | -------------------------------------------- |
| `400`  | Cannot delete active year (deactivate first) |
| `400`  | Cannot delete year with linked assessments   |
| `404`  | Year not found                               |

---

### Activate Assessment Year

```
POST /api/v1/assessment-years/{year}/activate
```

Activates an assessment year. This will:

1. Deactivate the currently active year (if any)
2. Activate the specified year
3. Optionally trigger bulk assessment creation for all BLGU users

**Authorization:** `MLGOO_DILG` only

**Path Parameters:**

| Parameter | Type    | Description          |
| --------- | ------- | -------------------- |
| `year`    | integer | The year to activate |

**Query Parameters:**

| Parameter                 | Type    | Required | Description                                              |
| ------------------------- | ------- | -------- | -------------------------------------------------------- |
| `create_bulk_assessments` | boolean | No       | Create draft assessments for all BLGUs (default: `true`) |

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Assessment year 2025 has been activated.",
  "year": 2025,
  "activated_at": "2025-01-01T00:00:00Z",
  "previous_active_year": 2024,
  "assessments_created": null
}
```

**Notes:**

- `assessments_created` is `null` when bulk creation runs asynchronously via Celery
- The bulk creation task creates DRAFT assessments for all BLGU users who don't already have an
  assessment for the year

**Errors:**

| Status | Description    |
| ------ | -------------- |
| `404`  | Year not found |

---

### Deactivate Assessment Year

```
POST /api/v1/assessment-years/{year}/deactivate
```

Deactivates an assessment year. After deactivation, no year will be active.

**Authorization:** `MLGOO_DILG` only

**Response:** `200 OK`

Returns the updated year object with `is_active: false`.

**Errors:**

| Status | Description                  |
| ------ | ---------------------------- |
| `400`  | Year is not currently active |
| `404`  | Year not found               |

---

### Publish Assessment Year

```
POST /api/v1/assessment-years/{year}/publish
```

Publishes an assessment year, making its data visible to Katuparan Center users.

**Authorization:** `MLGOO_DILG` only

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Assessment year 2025 has been published.",
  "year": 2025,
  "is_published": true
}
```

---

### Unpublish Assessment Year

```
POST /api/v1/assessment-years/{year}/unpublish
```

Unpublishes an assessment year, hiding it from Katuparan Center users.

**Authorization:** `MLGOO_DILG` only

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Assessment year 2025 has been unpublished.",
  "year": 2025,
  "is_published": false
}
```

---

### Get Accessible Years

```
GET /api/v1/assessment-years/accessible
```

Returns years accessible to the current user based on their role.

**Authorization:** Any authenticated user

**Response:** `200 OK`

```json
{
  "years": [2025, 2024],
  "active_year": 2025,
  "role": "BLGU_USER"
}
```

**Access Rules by Role:**

| Role                     | Accessible Years                      |
| ------------------------ | ------------------------------------- |
| `MLGOO_DILG`             | All years (published and unpublished) |
| `KATUPARAN_CENTER_USER`  | All published years                   |
| `BLGU_USER`              | All years they have assessments for   |
| `ASSESSOR` / `VALIDATOR` | Active year only                      |

---

## Schemas

### AssessmentYearCreate

```typescript
interface AssessmentYearCreate {
  year: number; // Required: e.g., 2025
  assessment_period_start: string; // Required: ISO 8601 datetime
  assessment_period_end: string; // Required: ISO 8601 datetime
  phase1_deadline?: string; // Optional: ISO 8601 datetime
  rework_deadline?: string; // Optional: ISO 8601 datetime
  phase2_deadline?: string; // Optional: ISO 8601 datetime
  calibration_deadline?: string; // Optional: ISO 8601 datetime
  description?: string; // Optional: Notes
}
```

### AssessmentYearUpdate

```typescript
interface AssessmentYearUpdate {
  assessment_period_start?: string;
  assessment_period_end?: string;
  phase1_deadline?: string;
  rework_deadline?: string;
  phase2_deadline?: string;
  calibration_deadline?: string;
  description?: string;
}
```

### AssessmentYearResponse

```typescript
interface AssessmentYearResponse {
  id: number;
  year: number;
  assessment_period_start: string;
  assessment_period_end: string;
  phase1_deadline?: string;
  rework_deadline?: string;
  phase2_deadline?: string;
  calibration_deadline?: string;
  is_active: boolean;
  is_published: boolean;
  description?: string;
  created_at: string;
  updated_at?: string;
  activated_at?: string;
  activated_by_id?: number;
  deactivated_at?: string;
  deactivated_by_id?: number;
}
```

### AssessmentYearListResponse

```typescript
interface AssessmentYearListResponse {
  years: AssessmentYearResponse[];
  active_year: number | null;
}
```

### AccessibleYearsResponse

```typescript
interface AccessibleYearsResponse {
  years: number[]; // List of accessible year numbers
  active_year: number | null; // Currently active year (if accessible)
  role: string; // User's role
}
```

### ActivateYearResponse

```typescript
interface ActivateYearResponse {
  success: boolean;
  message: string;
  year: number;
  activated_at: string;
  previous_active_year: number | null;
  assessments_created: number | null; // null if async
}
```

### PublishYearResponse

```typescript
interface PublishYearResponse {
  success: boolean;
  message: string;
  year: number;
  is_published: boolean;
}
```

---

## Frontend Integration

After any changes to these endpoints, regenerate TypeScript types:

```bash
pnpm generate-types
```

This generates React Query hooks in `packages/shared/src/generated/endpoints/assessment-years/`:

```typescript
import {
  useGetAssessmentYears,
  useCreateAssessmentYear,
  useActivateYear,
  usePublishYear,
  useGetAccessibleYears,
} from "@sinag/shared";
```

---

## Related Documentation

- [Multi-Year Assessments Feature](/docs/features/multi-year-assessments.md)
- [Database Schema - Assessment Years](/docs/architecture/database-schema.md#assessment-years)
- [Assessments API Endpoints](/docs/api/endpoints/assessments.md)
