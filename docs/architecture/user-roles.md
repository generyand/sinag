# User Roles and Permissions

The SINAG system implements role-based access control (RBAC) with five distinct user roles.

**Last Updated:** 2026-01-11

## Role Definitions

### 1. MLGOO_DILG (Admin Role)

- System administrators with full access to all features
- Can manage users, view all submissions, access analytics
- No barangay or governance area assignments (system-wide access)
- Replaces the legacy SUPERADMIN role

### 2. ASSESSOR (Area-Specific)

- DILG assessors assigned to one of 6 governance areas
- **Required field**: `assessor_area_id` (governance area assignment)
- Can only review indicators within their assigned governance area
- Can review MOVs and leave comments for their area
- Cannot set Pass/Fail status (only Validators can)
- Can request rework for their area (one independent rework round per governance area)
- Can approve their area (triggers status transition when all 6 areas approved)

### 3. VALIDATOR (System-Wide)

- DILG validators with system-wide access to all governance areas
- No governance area restriction (reviews entire assessment after all 6 assessors approve)
- Validates assessments in `AWAITING_FINAL_VALIDATION` status
- Can determine Pass/Fail/Conditional status for all indicators
- Can request calibration (routes back to BLGU, then returns to Validator)
- Has access to Analytics page (shared with MLGOO_DILG) to view BBI compliance and municipal
  overview

### 4. BLGU_USER

- Barangay-level users who submit assessments
- **Required field**: `barangay_id` (barangay assignment)
- Limited to their assigned barangay's data
- Can upload MOVs and respond to feedback

### 5. KATUPARAN_CENTER_USER (External Stakeholder)

- External user from Katuparan Center with read-only analytics access
- Can view aggregated, anonymized SGLGB data for research
- No access to individual barangay data (privacy protection)
- Uses `/api/v1/external/analytics/*` endpoints

## Role-Based Field Requirements

The system enforces strict role-based field validation:

```python
# Enforced by user_service.py
ASSESSOR role  → Requires assessor_area_id (governance area assignment)
                 Clears barangay_id automatically

VALIDATOR role → No area assignment required (system-wide access)
                 Clears barangay_id and assessor_area_id automatically

BLGU_USER role → Requires barangay_id
                 Clears assessor_area_id automatically

MLGOO_DILG role → No assignments required
                  Clears both assessor_area_id and barangay_id

KATUPARAN_CENTER_USER → No assignments required
                        External read-only access
```

## Database Schema

The User model includes these role-related fields:

| Field                 | Type               | Description                                                         |
| --------------------- | ------------------ | ------------------------------------------------------------------- |
| `role`                | String enum        | MLGOO_DILG, VALIDATOR, ASSESSOR, BLGU_USER, KATUPARAN_CENTER_USER   |
| `assessor_area_id`    | Integer (nullable) | FK to governance_areas table (for ASSESSOR role only)               |
| `barangay_id`         | Integer (nullable) | FK to barangays table (for BLGU_USER role only)                     |
| `municipal_office_id` | Integer (nullable) | FK to municipal_offices table (municipal office assignment)         |
| `preferred_language`  | String(3)          | Preferred language for AI summaries: ceb, fil, or en (default: ceb) |

**Note**: The field `validator_area_id` was renamed to `assessor_area_id` in January 2026 as part of
the workflow restructuring where Assessors became area-specific and Validators became system-wide.

## Admin Endpoints

All admin endpoints require `MLGOO_DILG` role:

- `POST /api/v1/users/` - Create new user
- `GET /api/v1/users/` - List all users (paginated, filterable)
- `GET /api/v1/users/{user_id}` - Get user by ID
- `PUT /api/v1/users/{user_id}` - Update user
- `DELETE /api/v1/users/{user_id}` - Deactivate user (soft delete)
- `POST /api/v1/users/{user_id}/activate` - Activate user
- `POST /api/v1/users/{user_id}/reset-password` - Reset password
- `GET /api/v1/users/stats/dashboard` - User statistics for admin dashboard

## Self-Service Endpoints

Available to all authenticated users:

- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update own profile
- `PATCH /api/v1/users/me/language` - Update preferred language (ceb, fil, en)
- `POST /api/v1/users/me/logo` - Upload profile logo
- `DELETE /api/v1/users/me/logo` - Delete profile logo

See `apps/api/app/api/v1/users.py` for implementation.

## Analytics Access

The Analytics page (`/analytics`) provides municipal-level overview and BBI compliance data.

| Role                  | Analytics Access        | Notes                                               |
| --------------------- | ----------------------- | --------------------------------------------------- |
| MLGOO_DILG            | Full access             | System-wide analytics                               |
| VALIDATOR             | Full access             | Added Dec 2025 for BBI visibility during validation |
| ASSESSOR              | No access               | -                                                   |
| BLGU_USER             | No access               | -                                                   |
| KATUPARAN_CENTER_USER | External analytics only | Uses `/external-analytics` endpoint                 |

## Navigation Links by Role

| Role                  | Sidebar Navigation                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| MLGOO_DILG            | Dashboard, Submission Queue, Analytics & Reports, Assessment Cycles, User Management, System Settings, Profile |
| VALIDATOR             | Submissions Queue, Validation History, Analytics, Profile                                                      |
| ASSESSOR              | Submissions Queue, Review History, Profile                                                                     |
| BLGU_USER             | Dashboard, My Assessments, Insights, Profile                                                                   |
| KATUPARAN_CENTER_USER | Dashboard, Profile                                                                                             |

See `apps/web/src/lib/navigation.ts` for navigation configuration.
