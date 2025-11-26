# Users API

The Users API provides endpoints for user management, profile updates, and user administration. This API supports creating users, assigning roles with proper governance area and barangay assignments, and managing user accounts throughout the SGLGB assessment lifecycle.

## Overview

**Base Path**: `/api/v1/users`

**Authentication**: All endpoints require authentication. Most endpoints require MLGOO_DILG (admin) role unless otherwise specified.

**Role-Based Assignment Rules**: The system enforces strict validation rules for user role assignments based on the six SINAG user roles.

**Type Generation**: After modifying any user endpoint or schema, run `pnpm generate-types` to update frontend types.

---

## Role-Based Assignment System

SINAG implements four distinct user roles with specific field requirements:

### User Roles

1. **MLGOO_DILG** (Admin Role)
   - System administrators with full access
   - No governance area or barangay assignments required
   - System-wide access to all features

2. **VALIDATOR**
   - DILG validators assigned to specific governance areas
   - **Required field**: `validator_area_id` (governance area assignment)
   - Can only validate assessments within assigned governance area
   - Introduced November 2025 following DILG consultation

3. **ASSESSOR**
   - DILG assessors with flexible barangay access
   - No pre-assigned governance areas
   - Can select barangays arbitrarily during assessment workflow
   - No governance area or barangay assignments required

4. **BLGU_USER**
   - Barangay-level users who submit assessments
   - **Required field**: `barangay_id` (barangay assignment)
   - Limited to their assigned barangay's data

### Assignment Validation Rules

```python
VALIDATOR role   → Requires validator_area_id (governance area)
                   Clears barangay_id automatically

BLGU_USER role   → Requires barangay_id (barangay assignment)
                   Clears validator_area_id automatically

ASSESSOR role    → No assignments required
                   Clears both validator_area_id and barangay_id

MLGOO_DILG role  → No assignments required
                   Clears both validator_area_id and barangay_id
```

---

## Endpoints

### GET /api/v1/users/me

Get current user information.

**Authentication**: All authenticated users

**Workflow Stage**: All stages (Profile View)

**Description**: Returns the profile information of the authenticated user, including their role, assignments, and account status.

**Request Body**: None

**Response** (200 OK):
```json
{
  "id": 45,
  "email": "juan@barangay-sanisidro.gov.ph",
  "name": "Juan Dela Cruz",
  "role": "BLGU_USER",
  "phone_number": "+63 917 123 4567",
  "validator_area_id": null,
  "barangay_id": 10,
  "is_active": true,
  "is_superuser": false,
  "must_change_password": false,
  "created_at": "2025-01-01T08:00:00Z",
  "updated_at": "2025-01-10T14:30:00Z"
}
```

**Errors**:
- `401 Unauthorized`: User not authenticated

---

### PUT /api/v1/users/me

Update current user information.

**Authentication**: All authenticated users

**Workflow Stage**: All stages (Profile Edit)

**Description**: Allows users to update their own profile information. Users cannot change their own role or admin-controlled fields.

**Request Body**:
```json
{
  "name": "Juan P. Dela Cruz",
  "email": "juan.delacruz@barangay-sanisidro.gov.ph",
  "phone_number": "+63 917 999 8888"
}
```

**Response** (200 OK):
```json
{
  "id": 45,
  "email": "juan.delacruz@barangay-sanisidro.gov.ph",
  "name": "Juan P. Dela Cruz",
  "role": "BLGU_USER",
  "phone_number": "+63 917 999 8888",
  "validator_area_id": null,
  "barangay_id": 10,
  "is_active": true,
  "is_superuser": false,
  "must_change_password": false,
  "created_at": "2025-01-01T08:00:00Z",
  "updated_at": "2025-01-15T09:45:00Z"
}
```

**Errors**:
- `404 Not Found`: User not found

---

### GET /api/v1/users

Get paginated list of users with optional filtering.

**Authentication**: MLGOO_DILG role required

**Workflow Stage**: User Management

**Description**: Returns a paginated list of all users in the system with optional search and filtering capabilities. Supports filtering by role, active status, and searching by name/email.

**Query Parameters**:
- `page` (integer, optional): Page number (default: 1, min: 1)
- `size` (integer, optional): Page size (default: 10, min: 1, max: 100)
- `search` (string, optional): Search in name and email fields
- `role` (string, optional): Filter by role (MLGOO_DILG, VALIDATOR, ASSESSOR, BLGU_USER)
- `is_active` (boolean, optional): Filter by active status

**Request Body**: None

**Response** (200 OK):
```json
{
  "users": [
    {
      "id": 1,
      "email": "admin@dilg.gov.ph",
      "name": "DILG Admin",
      "role": "MLGOO_DILG",
      "phone_number": "+63 917 111 1111",
      "validator_area_id": null,
      "barangay_id": null,
      "is_active": true,
      "is_superuser": true,
      "must_change_password": false,
      "created_at": "2024-12-01T08:00:00Z",
      "updated_at": "2025-01-01T10:00:00Z"
    },
    {
      "id": 2,
      "email": "validator@dilg.gov.ph",
      "name": "Maria Santos",
      "role": "VALIDATOR",
      "phone_number": "+63 917 222 2222",
      "validator_area_id": 1,
      "barangay_id": null,
      "is_active": true,
      "is_superuser": false,
      "must_change_password": false,
      "created_at": "2024-12-05T09:00:00Z",
      "updated_at": "2025-01-05T11:30:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "size": 10,
  "total_pages": 5
}
```

**Errors**:
- `403 Forbidden`: User does not have MLGOO_DILG role

---

### POST /api/v1/users

Create a new user (Admin only).

**Authentication**: MLGOO_DILG role required

**Workflow Stage**: User Management (User Creation)

**Description**: Creates a new user account with role-based field validation. The service layer enforces assignment rules and returns 400 Bad Request for invalid combinations.

**Role-Based Requirements**:
- **VALIDATOR**: Must provide `validator_area_id` (governance area assignment)
- **BLGU_USER**: Must provide `barangay_id` (barangay assignment)
- **ASSESSOR**: No assignments required
- **MLGOO_DILG**: No assignments required

**Request Body**:
```json
{
  "email": "new.validator@dilg.gov.ph",
  "name": "Pedro Reyes",
  "password": "SecurePassword123!",
  "role": "VALIDATOR",
  "phone_number": "+63 917 333 3333",
  "validator_area_id": 2,
  "is_active": true,
  "is_superuser": false,
  "must_change_password": true
}
```

**Response** (201 Created):
```json
{
  "id": 51,
  "email": "new.validator@dilg.gov.ph",
  "name": "Pedro Reyes",
  "role": "VALIDATOR",
  "phone_number": "+63 917 333 3333",
  "validator_area_id": 2,
  "barangay_id": null,
  "is_active": true,
  "is_superuser": false,
  "must_change_password": true,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: Invalid role/assignment combination (e.g., VALIDATOR without validator_area_id)
- `403 Forbidden`: User does not have MLGOO_DILG role
- `409 Conflict`: Email already exists

---

### GET /api/v1/users/{user_id}

Get user by ID.

**Authentication**: MLGOO_DILG role required

**Workflow Stage**: User Management (User Detail View)

**Description**: Returns detailed information for a specific user by ID.

**Path Parameters**:
- `user_id` (integer, required): The ID of the user to retrieve

**Request Body**: None

**Response** (200 OK):
```json
{
  "id": 45,
  "email": "juan@barangay-sanisidro.gov.ph",
  "name": "Juan Dela Cruz",
  "role": "BLGU_USER",
  "phone_number": "+63 917 123 4567",
  "validator_area_id": null,
  "barangay_id": 10,
  "is_active": true,
  "is_superuser": false,
  "must_change_password": false,
  "created_at": "2025-01-01T08:00:00Z",
  "updated_at": "2025-01-10T14:30:00Z"
}
```

**Errors**:
- `403 Forbidden`: User does not have MLGOO_DILG role
- `404 Not Found`: User not found

---

### PUT /api/v1/users/{user_id}

Update user by ID (Admin only).

**Authentication**: MLGOO_DILG role required

**Workflow Stage**: User Management (User Edit)

**Description**: Updates user information with role-based assignment validation. When changing a user's role, the service layer automatically clears incompatible assignments. Returns 400 Bad Request for invalid role/assignment combinations.

**Role Change Behavior**:
- Changing to VALIDATOR: Clears `barangay_id`, requires `validator_area_id`
- Changing to BLGU_USER: Clears `validator_area_id`, requires `barangay_id`
- Changing to ASSESSOR or MLGOO_DILG: Clears both `validator_area_id` and `barangay_id`

**Path Parameters**:
- `user_id` (integer, required): The ID of the user to update

**Request Body**:
```json
{
  "name": "Juan P. Dela Cruz Jr.",
  "email": "juan.delacruz@barangay-sanisidro.gov.ph",
  "role": "BLGU_USER",
  "phone_number": "+63 917 888 9999",
  "barangay_id": 10,
  "is_active": true
}
```

**Response** (200 OK):
```json
{
  "id": 45,
  "email": "juan.delacruz@barangay-sanisidro.gov.ph",
  "name": "Juan P. Dela Cruz Jr.",
  "role": "BLGU_USER",
  "phone_number": "+63 917 888 9999",
  "validator_area_id": null,
  "barangay_id": 10,
  "is_active": true,
  "is_superuser": false,
  "must_change_password": false,
  "created_at": "2025-01-01T08:00:00Z",
  "updated_at": "2025-01-15T11:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: Invalid role/assignment combination
- `403 Forbidden`: User does not have MLGOO_DILG role
- `404 Not Found`: User not found

---

### DELETE /api/v1/users/{user_id}

Deactivate user by ID (soft delete).

**Authentication**: MLGOO_DILG role required

**Workflow Stage**: User Management (User Deactivation)

**Description**: Soft deletes a user by setting `is_active` to false. The user account is preserved in the database but cannot log in. Admins cannot deactivate their own account.

**Path Parameters**:
- `user_id` (integer, required): The ID of the user to deactivate

**Request Body**: None

**Response** (200 OK):
```json
{
  "id": 45,
  "email": "juan@barangay-sanisidro.gov.ph",
  "name": "Juan Dela Cruz",
  "role": "BLGU_USER",
  "phone_number": "+63 917 123 4567",
  "validator_area_id": null,
  "barangay_id": 10,
  "is_active": false,
  "is_superuser": false,
  "must_change_password": false,
  "created_at": "2025-01-01T08:00:00Z",
  "updated_at": "2025-01-15T12:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: Cannot deactivate your own account
- `403 Forbidden`: User does not have MLGOO_DILG role
- `404 Not Found`: User not found

---

### POST /api/v1/users/{user_id}/activate

Activate user by ID.

**Authentication**: MLGOO_DILG role required

**Workflow Stage**: User Management (User Activation)

**Description**: Reactivates a previously deactivated user by setting `is_active` to true.

**Path Parameters**:
- `user_id` (integer, required): The ID of the user to activate

**Request Body**: None

**Response** (200 OK):
```json
{
  "id": 45,
  "email": "juan@barangay-sanisidro.gov.ph",
  "name": "Juan Dela Cruz",
  "role": "BLGU_USER",
  "phone_number": "+63 917 123 4567",
  "validator_area_id": null,
  "barangay_id": 10,
  "is_active": true,
  "is_superuser": false,
  "must_change_password": false,
  "created_at": "2025-01-01T08:00:00Z",
  "updated_at": "2025-01-15T13:00:00Z"
}
```

**Errors**:
- `403 Forbidden`: User does not have MLGOO_DILG role
- `404 Not Found`: User not found

---

### POST /api/v1/users/{user_id}/reset-password

Reset user password (Admin only).

**Authentication**: MLGOO_DILG role required

**Workflow Stage**: User Management (Password Reset)

**Description**: Resets a user's password to a new value and sets `must_change_password` to true, forcing the user to change their password on next login.

**Path Parameters**:
- `user_id` (integer, required): The ID of the user whose password to reset

**Request Body**:
```json
{
  "new_password": "TemporaryPassword123!"
}
```

**Response** (200 OK):
```json
{
  "message": "Password reset successfully"
}
```

**Errors**:
- `403 Forbidden`: User does not have MLGOO_DILG role
- `404 Not Found`: User not found

---

### GET /api/v1/users/stats/dashboard

Get user statistics for admin dashboard.

**Authentication**: MLGOO_DILG role required

**Workflow Stage**: Admin Dashboard

**Description**: Returns aggregate statistics about users in the system, including counts by role, active/inactive status, and recent user activity.

**Request Body**: None

**Response** (200 OK):
```json
{
  "total_users": 150,
  "active_users": 142,
  "inactive_users": 8,
  "users_by_role": {
    "MLGOO_DILG": 5,
    "VALIDATOR": 20,
    "ASSESSOR": 25,
    "BLGU_USER": 100
  },
  "users_created_last_30_days": 12,
  "users_requiring_password_change": 8
}
```

**Errors**:
- `403 Forbidden`: User does not have MLGOO_DILG role

---

## Data Models

### UserRole Enum

```python
MLGOO_DILG = "MLGOO_DILG"      # System administrator
VALIDATOR = "VALIDATOR"         # Area-specific validator
ASSESSOR = "ASSESSOR"           # Flexible assessor
BLGU_USER = "BLGU_USER"         # Barangay user
```

### User Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | integer | auto | Primary key |
| email | string | yes | Unique email address |
| name | string | yes | Full name |
| password | string | yes (create) | Hashed password |
| role | UserRole | yes | User role |
| phone_number | string | no | Contact number |
| validator_area_id | integer | conditional | Required for VALIDATOR role |
| barangay_id | integer | conditional | Required for BLGU_USER role |
| is_active | boolean | yes | Account active status |
| is_superuser | boolean | no | Superuser flag |
| must_change_password | boolean | yes | Force password change flag |
| created_at | datetime | auto | Creation timestamp |
| updated_at | datetime | auto | Last update timestamp |

---

## Business Rules

### Role Assignment Validation

The system enforces these rules at the service layer:

1. **VALIDATOR** role:
   - MUST have `validator_area_id` (governance area assignment)
   - MUST NOT have `barangay_id`
   - Service automatically clears `barangay_id` if provided

2. **BLGU_USER** role:
   - MUST have `barangay_id` (barangay assignment)
   - MUST NOT have `validator_area_id`
   - Service automatically clears `validator_area_id` if provided

3. **ASSESSOR** role:
   - MUST NOT have `validator_area_id`
   - MUST NOT have `barangay_id`
   - Service automatically clears both fields

4. **MLGOO_DILG** role:
   - MUST NOT have `validator_area_id`
   - MUST NOT have `barangay_id`
   - Service automatically clears both fields

### Password Security

- All passwords are hashed using bcrypt before storage
- New users default to `must_change_password = true`
- Password resets force password change on next login
- Minimum password requirements enforced at application layer

### Soft Deletion

- Users are never permanently deleted from the database
- Deactivation sets `is_active = false`
- Inactive users cannot log in
- Inactive users are excluded from default user lists

---

## Permission Matrix

| Action | BLGU_USER | ASSESSOR | VALIDATOR | MLGOO_DILG |
|--------|-----------|----------|-----------|------------|
| View own profile | ✓ | ✓ | ✓ | ✓ |
| Edit own profile | ✓ | ✓ | ✓ | ✓ |
| List all users | - | - | - | ✓ |
| View any user | - | - | - | ✓ |
| Create user | - | - | - | ✓ |
| Edit any user | - | - | - | ✓ |
| Deactivate user | - | - | - | ✓ |
| Activate user | - | - | - | ✓ |
| Reset password | - | - | - | ✓ |
| View user stats | - | - | - | ✓ |

---

## Notes

- **Type Generation**: Always run `pnpm generate-types` after modifying user endpoints or schemas
- **Role Migration**: When updating from legacy SUPERADMIN or AREA_ASSESSOR roles, use MLGOO_DILG and VALIDATOR respectively
- **Assignment Enforcement**: The service layer (not the database) enforces role-based assignment rules
- **Audit Trail**: All user changes are tracked via `updated_at` timestamp
- **Email Uniqueness**: Email addresses must be unique across the system
