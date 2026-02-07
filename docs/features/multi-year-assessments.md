# Multi-Year Assessment Support

**Version:** 1.1 **Date:** February 2026 **Status:** Implemented

## Overview

SINAG now supports managing multiple assessment years, enabling the DILG to track historical
assessments and prepare future assessment cycles. This feature introduces a unified `AssessmentYear`
model that combines year configuration, phase deadlines, and lifecycle management into a single
cohesive system.

## Key Concepts

### Assessment Year

An **Assessment Year** represents a complete SGLGB assessment cycle for a calendar year (e.g.,
2025). Each assessment year contains:

- **Year number**: The calendar year (e.g., 2025)
- **Assessment period**: Start and end dates for when assessments can be submitted
- **Phase deadlines**: Due dates for each workflow phase
- **Lifecycle states**: Active and published status flags

### Active vs Published

Understanding the distinction between "Active" and "Published" is critical:

| State         | Meaning                                                                                                   | Who Can Access                             |
| ------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Active**    | The year currently accepting new submissions and workflow actions. Only ONE year can be active at a time. | BLGU_USER, ASSESSOR, VALIDATOR, MLGOO_DILG |
| **Published** | The year's data is visible for external analytics and reporting. Multiple years can be published.         | KATUPARAN_CENTER_USER (read-only)          |

**Important Rules:**

1. **Only one active year at a time** - Activating a new year automatically deactivates the previous
   one
2. **Active does not mean Published** - A year can be active (accepting submissions) but not yet
   published (hidden from Katuparan Center)
3. **Published does not mean Active** - Historical years can remain published for analytics while a
   new year is active

### Year Lifecycle

```
CREATE (inactive, unpublished)
    |
    v
ACTIVATE (active, unpublished)  <-- BLGU can submit, Assessors/Validators can work
    |
    v
PUBLISH (active, published)     <-- Katuparan Center can now see data
    |
    v
DEACTIVATE (inactive, published) <-- Historical data remains visible
    |
    v
UNPUBLISH (inactive, unpublished) <-- Fully archived (optional)
```

## Database Changes

### AssessmentYear Model

The new `assessment_years` table unifies the legacy `assessment_year_configs` and
`assessment_cycles` tables:

```sql
CREATE TABLE assessment_years (
    id SERIAL PRIMARY KEY,
    year INTEGER UNIQUE NOT NULL,          -- e.g., 2025

    -- Assessment period boundaries
    assessment_period_start TIMESTAMPTZ NOT NULL,
    assessment_period_end TIMESTAMPTZ NOT NULL,

    -- Phase deadlines
    phase1_deadline TIMESTAMPTZ,           -- Initial submission deadline
    rework_deadline TIMESTAMPTZ,           -- Rework submission deadline
    phase2_deadline TIMESTAMPTZ,           -- Final submission deadline
    calibration_deadline TIMESTAMPTZ,      -- Calibration/validation deadline

    -- Deadline window configuration (duration in days)
    submission_window_days INTEGER,        -- Days for initial submission (~30-60)
    rework_window_days INTEGER,            -- Days for BLGU to resubmit after rework
    calibration_window_days INTEGER,       -- Days for BLGU to resubmit after calibration

    -- Lifecycle flags
    is_active BOOLEAN DEFAULT FALSE,       -- Only ONE can be true
    is_published BOOLEAN DEFAULT FALSE,    -- Visible to Katuparan Center

    -- Audit fields
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    activated_by_id INTEGER REFERENCES users(id),
    deactivated_at TIMESTAMPTZ,
    deactivated_by_id INTEGER REFERENCES users(id)
);

-- Partial unique index ensures only one active year
CREATE UNIQUE INDEX uq_assessment_years_single_active
ON assessment_years (is_active) WHERE is_active = true;
```

### Assessment Model Changes

The `assessments` table now includes:

```sql
ALTER TABLE assessments ADD COLUMN assessment_year INTEGER NOT NULL;
ALTER TABLE assessments ADD CONSTRAINT fk_assessments_assessment_year
    FOREIGN KEY (assessment_year) REFERENCES assessment_years(year);

-- Each BLGU can only have one assessment per year
ALTER TABLE assessments ADD CONSTRAINT uq_assessment_blgu_year
    UNIQUE (blgu_user_id, assessment_year);
```

### Indicator Year Filtering

Indicators now support year-based effectivity:

```sql
ALTER TABLE indicators ADD COLUMN effective_from_year INTEGER;
ALTER TABLE indicators ADD COLUMN effective_to_year INTEGER;
```

- `effective_from_year = NULL`: Indicator applies starting from the beginning of time
- `effective_to_year = NULL`: Indicator applies indefinitely (ongoing)
- Both `NULL`: Indicator applies to all assessment years

## API Endpoints

### Assessment Year Management

| Endpoint                                     | Method | Description                              | Role Required     |
| -------------------------------------------- | ------ | ---------------------------------------- | ----------------- |
| `/api/v1/assessment-years`                   | GET    | List all assessment years                | All authenticated |
| `/api/v1/assessment-years`                   | POST   | Create new assessment year               | MLGOO_DILG        |
| `/api/v1/assessment-years/accessible`        | GET    | Get years accessible to current user     | All authenticated |
| `/api/v1/assessment-years/simple`            | GET    | Simplified year list for dropdowns       | All authenticated |
| `/api/v1/assessment-years/active`            | GET    | Get currently active year config         | All authenticated |
| `/api/v1/assessment-years/active/number`     | GET    | Get active year number and previous year | All authenticated |
| `/api/v1/assessment-years/{year}`            | GET    | Get specific year details                | All authenticated |
| `/api/v1/assessment-years/{year}`            | PATCH  | Update year configuration                | MLGOO_DILG        |
| `/api/v1/assessment-years/{year}`            | DELETE | Delete year (if no assessments)          | MLGOO_DILG        |
| `/api/v1/assessment-years/{year}/activate`   | POST   | Activate year (deactivates others)       | MLGOO_DILG        |
| `/api/v1/assessment-years/{year}/deactivate` | POST   | Deactivate year                          | MLGOO_DILG        |
| `/api/v1/assessment-years/{year}/publish`    | POST   | Make visible to Katuparan Center         | MLGOO_DILG        |
| `/api/v1/assessment-years/{year}/unpublish`  | POST   | Hide from Katuparan Center               | MLGOO_DILG        |
| `/api/v1/assessment-years/{year}/phase`      | GET    | Get current assessment phase for year    | All authenticated |

**Access Control Notes:**

- `GET /` (list): MLGOO_DILG sees all years; other roles see only published years
- `GET /{year}`: MLGOO_DILG can view any year; other roles can only view published years
- `GET /simple`: Returns minimal data (year, is_active, is_published) for dropdown selectors
- `GET /active/number`: Returns `{ year, previous_year }` for convenience
- `GET /{year}/phase`: Returns current phase (`pre_assessment`, `phase1`, `rework`, `phase2`,
  `calibration`, `completed`, or `unknown`)

### Year-Filtered Endpoints

The following endpoints now accept an optional `year` query parameter:

```
GET /api/v1/assessments/dashboard?year=2025
GET /api/v1/assessments/my-assessment?year=2025
GET /api/v1/assessments/all-validated?year=2025
GET /api/v1/indicators/tree/{governance_area_id}?year=2025
GET /api/v1/analytics/summary?year=2025
GET /api/v1/gar/barangays?year=2025
```

If `year` is not provided, these endpoints default to the **active year**.

## Role-Based Year Access

Different roles have different access to assessment years:

| Role                      | Accessible Years                         |
| ------------------------- | ---------------------------------------- |
| **MLGOO_DILG**            | All years (published and unpublished)    |
| **KATUPARAN_CENTER_USER** | All published years only                 |
| **BLGU_USER**             | All years with assessments + active year |
| **ASSESSOR / VALIDATOR**  | Active year only                         |

## Frontend Integration

### Year Selector Component

The `YearSelector` component provides a dropdown for switching between accessible years:

```tsx
import { YearSelector } from "@/components/features/year-selector";

function Dashboard() {
  return (
    <div>
      <YearSelector />
      {/* Dashboard content filtered by selected year */}
    </div>
  );
}
```

### Zustand Store

The selected year is persisted in localStorage via Zustand:

```tsx
import { useAssessmentYearStore } from "@/lib/stores/useAssessmentYearStore";

function MyComponent() {
  const { selectedYear, setSelectedYear } = useAssessmentYearStore();

  // Use selectedYear in API queries
  const { data } = useGetDashboard({ year: selectedYear });
}
```

### React Query Hooks

Generated hooks automatically include year parameters:

```tsx
import { useGetAssessmentYears, useActivateYear } from "@sinag/shared";

function YearManagement() {
  const { data: years } = useGetAssessmentYears();
  const activateMutation = useActivateYear();

  const handleActivate = (year: number) => {
    activateMutation.mutate({ year });
  };
}
```

## Bulk Assessment Creation

When a year is activated, the system can automatically create draft assessments for all BLGU users
who don't already have an assessment for that year. This is handled by Celery background tasks
defined in `apps/api/app/workers/assessment_year_worker.py`.

### Tasks

| Task Name                                    | Trigger                  | Description                                           |
| -------------------------------------------- | ------------------------ | ----------------------------------------------------- |
| `assessment_year.create_bulk_assessments`    | Year activation          | Creates DRAFT assessments for all active BLGU users   |
| `assessment_year.create_assessment_for_blgu` | New BLGU user creation   | Creates a DRAFT assessment for a single BLGU user     |
| `assessment_year.finalize_year`              | Year transition / manual | Finalizes year, counts stats, publishes for Katuparan |

### Retry Policy

All tasks use the same retry configuration:

- **Max retries**: 3
- **Initial backoff**: 60 seconds
- **Max backoff**: 300 seconds
- **Retry jitter**: Enabled
- **Auto-retry on**: `OperationalError`, `SQLAlchemyError`, `ConnectionError`, `TimeoutError`
- **Batch size**: 100 (for bulk operations)

### Activation with `create_assessments` Parameter

The `POST /{year}/activate` endpoint accepts a `create_assessments` query parameter (default:
`true`). When enabled, it triggers the `create_bulk_assessments` Celery task asynchronously. The
actual count of created assessments is available later via the task result.

## Year Placeholder Resolution

Dynamic year placeholders in indicator definitions are resolved using `YearPlaceholderResolver`:

| Placeholder                 | Example for Year 2025         |
| --------------------------- | ----------------------------- |
| `{CURRENT_YEAR}`            | 2025                          |
| `{PREVIOUS_YEAR}`           | 2024                          |
| `{JAN_OCT_CURRENT_YEAR}`    | January to October 2025       |
| `{JAN_TO_OCT_CURRENT_YEAR}` | January to October 2025       |
| `{JUL_SEP_CURRENT_YEAR}`    | July-September 2025           |
| `{JUL_TO_SEP_CURRENT_YEAR}` | July-September 2025           |
| `{Q1_Q3_CURRENT_YEAR}`      | 1st to 3rd quarter of CY 2025 |
| `{DEC_31_CURRENT_YEAR}`     | December 31, 2025             |
| `{DEC_31_PREVIOUS_YEAR}`    | December 31, 2024             |
| `{CY_CURRENT_YEAR}`         | CY 2025                       |
| `{CY_PREVIOUS_YEAR}`        | CY 2024                       |
| `{MARCH_CURRENT_YEAR}`      | March 2025                    |
| `{OCT_31_CURRENT_YEAR}`     | October 31, 2025              |

**Note:** `{JAN_TO_OCT_CURRENT_YEAR}` and `{JUL_TO_SEP_CURRENT_YEAR}` are aliases for their shorter
forms without `_TO_`.

## Migration Notes

### For Developers

1. **Database Migration**: Run `alembic upgrade head` to apply the `add_assessment_year_support`
   migration
2. **Type Generation**: Run `pnpm generate-types` after the migration to update frontend types
3. **Existing Assessments**: The migration automatically assigns existing assessments to the
   currently active year (or 2025 if none is active)

### For Administrators

1. **Legacy Tables Preserved**: The old `assessment_year_configs` and `assessment_cycles` tables are
   kept for backward compatibility
2. **Default Year Created**: If no years exist, the migration creates a default 2025 year in active
   state
3. **Indicator Effectivity**: All existing indicators have `effective_from_year` and
   `effective_to_year` set to NULL (apply to all years)

## Common Operations

### Creating a New Assessment Year

1. Navigate to MLGOO Settings > Assessment Cycles
2. Click "Create New Year"
3. Fill in year number and deadlines
4. Save (year is created in inactive state)
5. Click "Activate" when ready to begin the cycle

### Transitioning to a New Year

1. Ensure all assessments in the current year are complete
2. Create the new year configuration
3. Activate the new year (automatically deactivates the old year)
4. Optionally publish the old year for Katuparan Center access

### Viewing Historical Assessments

1. Use the Year Selector dropdown to switch to a previous year
2. All dashboard data, assessments, and analytics will filter to that year
3. Note: Only MLGOO_DILG can see unpublished years

## Error Handling

| Error                                 | Cause                              | Solution                                                |
| ------------------------------------- | ---------------------------------- | ------------------------------------------------------- |
| "No active assessment year found"     | No year is currently active        | MLGOO should activate a year in Settings                |
| "Cannot delete active year"           | Attempted to delete an active year | Deactivate the year first                               |
| "Cannot delete year with assessments" | Year has linked assessments        | Archive assessments first or keep the year              |
| "Assessment year X already exists"    | Duplicate year creation            | Use the existing year or choose a different year number |

## Related Documentation

- [Database Schema](/docs/architecture/database-schema.md) - Full schema documentation
- [Assessment Workflow](/docs/workflows/assessor-validation.md) - Assessment lifecycle
- [API Endpoints: Assessment Years](/docs/api/endpoints/assessment-years.md) - Detailed API
  reference
- [User Roles](/docs/architecture/user-roles.md) - Role permissions
