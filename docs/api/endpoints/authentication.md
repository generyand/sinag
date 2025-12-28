# Authentication API

The Authentication API provides endpoints for user login, password management, and session control.
This API uses JWT (JSON Web Token) based authentication with role-based access control.

## Overview

**Base Path**: `/api/v1/auth`

**Authentication**: Most endpoints are public (login), while others require active authentication.

**Security**: All passwords are hashed using bcrypt. JWTs include user ID, role, and password change
flags.

**Type Generation**: After modifying any authentication endpoint or schema, run
`pnpm generate-types` to update frontend types.

---

## Endpoints

### POST /api/v1/auth/login

Authenticate user and return JWT token.

**Authentication**: Public (no authentication required)

**Workflow Stage**: Authentication

**Description**: Validates user credentials against the database, checks if the user account is
active, generates a secure JWT token, and returns token with expiration info. Supports "remember me"
functionality for extended session duration.

**Request Body**:

```json
{
  "email": "juan@barangay-sanisidro.gov.ph",
  "password": "SecurePassword123!",
  "remember_me": false
}
```

**Response** (200 OK):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 604800
}
```

**Token Expiration**:

- `remember_me = false`: 7 days (604800 seconds)
- `remember_me = true`: 30 days (2592000 seconds)

**Errors**:

- `401 Unauthorized`: Incorrect email or password
- `400 Bad Request`: Inactive user account

---

### POST /api/v1/auth/change-password

Change user password.

**Authentication**: All authenticated users

**Workflow Stage**: Password Management

**Description**: Verifies the current password, updates the user's password, sets
`must_change_password` to false, and returns success message.

**Request Body**:

```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePassword456!"
}
```

**Response** (200 OK):

```json
{
  "message": "Password changed successfully"
}
```

**Errors**:

- `400 Bad Request`: Incorrect current password
- `401 Unauthorized`: User not authenticated

---

### POST /api/v1/auth/logout

Logout user and invalidate session.

**Authentication**: All authenticated users (optional)

**Workflow Stage**: Session Management

**Description**: Invalidates the user session. Currently returns success message. In production,
this will blacklist the JWT token and clear any session data.

**Request Body**: None

**Response** (200 OK):

```json
{
  "message": "Successfully logged out"
}
```

**Note**: Frontend should clear stored JWT token regardless of server response.

---

## Data Models

### JWT Token Structure

```json
{
  "sub": 45,
  "role": "BLGU_USER",
  "must_change_password": false,
  "exp": 1738080000,
  "iat": 1737475200
}
```

**Fields**:

- `sub`: User ID (subject)
- `role`: User role (MLGOO_DILG, VALIDATOR, ASSESSOR, BLGU_USER)
- `must_change_password`: Boolean flag for forced password change
- `exp`: Expiration timestamp (Unix epoch)
- `iat`: Issued at timestamp (Unix epoch)

---

## Business Rules

### Password Requirements

- Minimum length enforced at application layer
- Passwords are hashed using bcrypt before storage
- Current password must be verified before changing password
- `must_change_password` flag forces password change on first login

### Token Expiration

- **Standard**: 7 days (default)
- **Remember Me**: 30 days (extended session)
- Tokens include expiration timestamp in payload
- Frontend should refresh token before expiration

### Account Security

- Inactive accounts (`is_active = false`) cannot log in
- Multiple failed login attempts (rate limiting) should be implemented at infrastructure level
- Password reset by admin forces password change (`must_change_password = true`)

---

## Notes

- **Type Generation**: Always run `pnpm generate-types` after modifying auth endpoints
- **JWT Storage**: Frontend should store JWT in secure httpOnly cookie or encrypted localStorage
- **Token Refresh**: Not currently implemented - tokens expire after configured duration
- **Logout Implementation**: Currently client-side only - server-side token blacklisting is TODO
