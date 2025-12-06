# User Roles and Permissions

The SINAG system implements role-based access control (RBAC) with five distinct user roles.

## Role Definitions

### 1. MLGOO_DILG (Admin Role)
- System administrators with full access to all features
- Can manage users, view all submissions, access analytics
- No barangay or governance area assignments (system-wide access)
- Replaces the legacy SUPERADMIN role

### 2. VALIDATOR
- DILG validators assigned to specific governance areas
- Validates assessments for barangays within their assigned governance area
- **Required field**: `validator_area_id` (governance area assignment)
- Can determine Pass/Fail/Conditional status for indicators
- Can request calibration (routes back to same Validator)

### 3. ASSESSOR
- DILG assessors who can work with any barangay
- No pre-assigned governance areas (flexible assignment)
- Can review MOVs and leave comments
- Cannot set Pass/Fail status (only Validators can)
- Can request rework (one cycle allowed)

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
VALIDATOR role → Requires validator_area_id
                 Clears barangay_id automatically

BLGU_USER role → Requires barangay_id
                 Clears validator_area_id automatically

ASSESSOR role  → No assignments required
                 Clears both validator_area_id and barangay_id

MLGOO_DILG role → No assignments required
                  Clears both validator_area_id and barangay_id

KATUPARAN_CENTER_USER → No assignments required
                        External read-only access
```

## Database Schema

The User model includes these role-related fields:

| Field | Type | Description |
|-------|------|-------------|
| `role` | String enum | MLGOO_DILG, VALIDATOR, ASSESSOR, BLGU_USER, KATUPARAN_CENTER_USER |
| `validator_area_id` | Integer (nullable) | FK to governance_areas table |
| `barangay_id` | Integer (nullable) | FK to barangays table |

**Note**: The field `governance_area_id` was renamed to `validator_area_id` in November 2025.

## Admin Endpoints

All admin endpoints require `MLGOO_DILG` role:

- `POST /api/v1/users/` - Create new user
- `GET /api/v1/users/` - List all users
- `PUT /api/v1/users/{user_id}` - Update user
- `DELETE /api/v1/users/{user_id}` - Deactivate user
- `POST /api/v1/users/{user_id}/activate` - Activate user
- `POST /api/v1/users/{user_id}/reset-password` - Reset password

See `apps/api/app/api/v1/users.py` for implementation.
