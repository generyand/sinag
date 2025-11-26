# SINAG API Documentation

Complete reference for the SINAG REST API - the backend service powering the Seal of Good Local Governance for Barangays (SGLGB) governance assessment platform.

## Overview

The SINAG API is a FastAPI-based RESTful service that handles assessment submissions, validator workflows, classification, and analytics for the DILG SGLGB program. It features end-to-end type safety with auto-generated TypeScript types, role-based access control, and comprehensive validation.

**Key Features:**
- JWT-based authentication with role-based access control (RBAC)
- Auto-generated OpenAPI documentation and TypeScript types
- Service layer architecture for maintainable business logic
- Tag-based endpoint organization for clear code generation
- Comprehensive error handling with detailed status codes
- Background job processing via Celery for AI operations

## Base URL and Versioning

### Development Environment

```
Base URL: http://localhost:8000
API v1:   http://localhost:8000/api/v1
```

### Production Environment

```
Base URL: https://[your-domain]
API v1:   https://[your-domain]/api/v1
```

### Environment Configuration

The frontend uses environment variables to configure API access:

```env
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_V1_URL=http://localhost:8000/api/v1
```

**Note**: All endpoint examples in this documentation assume the `/api/v1` prefix.

## API Version

**Current Version**: `v1`

All endpoints are prefixed with `/api/v1`. Future versions will use `/api/v2`, `/api/v3`, etc., allowing backward compatibility.

## Interactive Documentation

FastAPI provides auto-generated, interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
  - Interactive API explorer with request/response examples
  - "Try it out" functionality for testing endpoints
  - Auto-generated from OpenAPI spec

- **ReDoc**: http://localhost:8000/redoc
  - Clean, readable API reference documentation
  - Better for browsing and understanding API structure

- **OpenAPI Spec**: http://localhost:8000/openapi.json
  - Machine-readable API specification
  - Used by Orval to generate TypeScript types

**Workflow**: When adding or modifying endpoints, the OpenAPI spec updates automatically, and running `pnpm generate-types` creates TypeScript types and React Query hooks for the frontend.

## Authentication

The SINAG API uses JWT (JSON Web Token) bearer authentication for all protected endpoints.

### Authentication Flow

1. **Login**: User submits credentials to `/api/v1/auth/login`
2. **Token Receipt**: Server validates credentials and returns JWT access token
3. **Token Storage**: Client stores token securely (httpOnly cookie or localStorage)
4. **Authenticated Requests**: Client includes token in `Authorization` header
5. **Token Validation**: Server validates token on each protected endpoint request

### Login Endpoint

**POST** `/api/v1/auth/login`

Authenticate user and receive JWT access token.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "remember_me": false
}
```

**Response (200 OK):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 604800
}
```

**Fields:**
- `access_token`: JWT token to use in subsequent requests
- `token_type`: Always `"bearer"` (for Authorization header format)
- `expires_in`: Token expiration time in seconds (604800 = 7 days, or 2592000 = 30 days if `remember_me` is true)

**Error Responses:**

```json
// 401 Unauthorized - Invalid credentials
{
  "detail": "Incorrect email or password"
}

// 400 Bad Request - Inactive account
{
  "detail": "Inactive user account"
}
```

### Using the Authentication Token

Include the JWT token in the `Authorization` header for all authenticated requests:

```http
GET /api/v1/users/me HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**JavaScript Example (Axios):**

```typescript
import axios from 'axios';

// Configure axios instance with token
const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Make authenticated request
const response = await api.get('/users/me');
```

**cURL Example:**

```bash
curl -X GET "http://localhost:8000/api/v1/users/me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JWT Token Structure

The JWT payload contains:

```json
{
  "sub": "123",                      // User ID
  "role": "MLGOO_DILG",              // User role
  "must_change_password": false,     // Password change required
  "exp": 1700000000                  // Expiration timestamp (Unix epoch)
}
```

**Token Expiration:**
- **Standard login**: 7 days (604,800 seconds)
- **Remember me**: 30 days (2,592,000 seconds)
- Expiration is enforced server-side; expired tokens return `401 Unauthorized`

**Token Security:**
- Tokens are signed with `HS256` (HMAC-SHA256) algorithm
- Secret key is configured via `SECRET_KEY` environment variable
- Tokens cannot be forged without the secret key
- **No refresh tokens**: Current implementation requires re-login after expiration

### Change Password Endpoint

**POST** `/api/v1/auth/change-password`

Change the authenticated user's password.

**Request Body:**

```json
{
  "current_password": "old_password",
  "new_password": "new_secure_password"
}
```

**Response (200 OK):**

```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**

```json
// 400 Bad Request - Incorrect current password
{
  "detail": "Incorrect current password"
}

// 401 Unauthorized - No/invalid token
{
  "detail": "Could not validate credentials"
}
```

**Side Effects:**
- User's hashed password is updated in the database
- `must_change_password` flag is set to `false`
- User remains logged in (existing token is still valid)

### Logout Endpoint

**POST** `/api/v1/auth/logout`

Logout user session (client-side token cleanup).

**Response (200 OK):**

```json
{
  "message": "Successfully logged out"
}
```

**Note**: The current implementation does not blacklist tokens server-side. Logout is handled client-side by discarding the token. In production, consider implementing token blacklisting via Redis.

## Role-Based Access Control

The SINAG API implements six user roles with distinct permissions and access levels.

### User Roles

| Role | Description | Access Level | Required Fields |
|------|-------------|--------------|-----------------|
| **MLGOO_DILG** | System administrators | Full system access | None |
| **VALIDATOR** | DILG validators | Assessments in assigned governance area | `validator_area_id` |
| **ASSESSOR** | DILG assessors | Arbitrary barangay selection | None (optional `validator_area_id`) |
| **BLGU_USER** | Barangay users | Own barangay's assessments | `barangay_id` |

### Role Permissions

**MLGOO_DILG** (Admin):
- Create, read, update, and deactivate all users
- Access all barangays and assessments
- Manage system configuration (indicators, BBIs, deadlines)
- View system-wide analytics and audit logs
- Assign validators to governance areas

**VALIDATOR**:
- View and validate assessments within assigned governance area
- Submit validation reports and recommendations
- Access only barangays within their governance area
- Cannot access other governance areas

**ASSESSOR**:
- Select any barangay to validate (flexible assignment)
- Perform in-person table validation
- Submit compliance checklists
- View all assessment data (not restricted by governance area)

**BLGU_USER**:
- Submit self-assessments for assigned barangay
- Upload Means of Verification (MOVs)
- View own assessment status and history
- Cannot access other barangays' data

### Protected Endpoints by Role

```typescript
// Public endpoints (no authentication required)
POST /api/v1/auth/login

// Authenticated user endpoints (any role)
GET  /api/v1/users/me
PUT  /api/v1/users/me
POST /api/v1/auth/change-password
POST /api/v1/auth/logout

// Admin-only endpoints (MLGOO_DILG role required)
GET    /api/v1/users/
POST   /api/v1/users/
GET    /api/v1/users/{user_id}
PUT    /api/v1/users/{user_id}
DELETE /api/v1/users/{user_id}
POST   /api/v1/users/{user_id}/activate
POST   /api/v1/users/{user_id}/reset-password
GET    /api/v1/users/stats/dashboard

// Validator endpoints (VALIDATOR role required)
GET  /api/v1/assessor/assignments
POST /api/v1/assessor/assessments/{assessment_id}/validate

// Assessor endpoints (ASSESSOR or VALIDATOR role required)
GET  /api/v1/assessor/barangays
POST /api/v1/assessor/table-validation

// BLGU endpoints (BLGU_USER role required)
POST /api/v1/assessments/
GET  /api/v1/assessments/my-barangay
```

### Authorization Error Responses

```json
// 401 Unauthorized - Missing or invalid token
{
  "detail": "Could not validate credentials"
}

// 403 Forbidden - Insufficient permissions
{
  "detail": "Not enough permissions. Admin access required."
}

// 403 Forbidden - Validator without governance area
{
  "detail": "Validator must be assigned to a governance area."
}
```

## Common Request/Response Patterns

### Request Headers

All authenticated requests must include:

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Standard Response Formats

#### Success Response (Data)

Most endpoints return data directly:

```json
{
  "id": 123,
  "name": "Example",
  "created_at": "2025-11-19T10:30:00Z"
}
```

#### Success Response (Message)

Simple confirmation messages use `ApiResponse`:

```json
{
  "message": "Operation completed successfully"
}
```

#### Error Response

FastAPI standard error format (includes detail):

```json
{
  "detail": "User not found"
}
```

Validation errors include field-specific details:

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

### Pagination

Endpoints that return lists support pagination via query parameters.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `size` | integer | 10 | Items per page (max: 100) |
| `search` | string | null | Search query (varies by endpoint) |

**Example Request:**

```http
GET /api/v1/users/?page=2&size=20&search=john HTTP/1.1
```

**Paginated Response Format:**

```json
{
  "users": [
    { "id": 21, "name": "John Doe", "email": "john@example.com" },
    { "id": 22, "name": "Johnny Smith", "email": "johnny@example.com" }
  ],
  "total": 45,
  "page": 2,
  "size": 20,
  "total_pages": 3
}
```

**Response Fields:**
- `users`: Array of items for current page (key varies by endpoint: `users`, `assessments`, `barangays`)
- `total`: Total number of items across all pages
- `page`: Current page number
- `size`: Items per page (as requested)
- `total_pages`: Total number of pages (calculated: `ceil(total / size)`)

**JavaScript Example:**

```typescript
const response = await api.get('/users/', {
  params: {
    page: 2,
    size: 20,
    search: 'john',
    role: 'VALIDATOR',
    is_active: true
  }
});

console.log(`Showing ${response.data.users.length} of ${response.data.total} users`);
console.log(`Page ${response.data.page} of ${response.data.total_pages}`);
```

### Filtering and Search

Many list endpoints support filtering via query parameters.

**Common Filter Parameters:**

| Endpoint | Filter Parameters |
|----------|-------------------|
| `GET /users/` | `search`, `role`, `is_active` |
| `GET /assessments/` | `barangay_id`, `status`, `year` |
| `GET /barangays/` | `search`, `province`, `city_municipality` |

**Example: Filter users by role and active status**

```http
GET /api/v1/users/?role=VALIDATOR&is_active=true&page=1&size=50
```

### Date and Timestamp Format

All timestamps use ISO 8601 format with UTC timezone:

```
2025-11-19T10:30:00Z
```

**Parsing in JavaScript:**

```typescript
const createdAt = new Date("2025-11-19T10:30:00Z");
```

**Formatting for Display:**

```typescript
const formatted = new Date(createdAt).toLocaleDateString('en-PH', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});
// "November 19, 2025, 10:30 AM"
```

## Error Handling

The API uses standard HTTP status codes and returns detailed error messages.

### HTTP Status Codes

| Status Code | Meaning | When Used |
|-------------|---------|-----------|
| **200** | OK | Successful GET, PUT, POST request |
| **201** | Created | Resource successfully created (rarely used; most POST return 200) |
| **400** | Bad Request | Validation error, invalid request data |
| **401** | Unauthorized | Missing, invalid, or expired authentication token |
| **403** | Forbidden | Valid authentication but insufficient permissions |
| **404** | Not Found | Resource does not exist |
| **422** | Unprocessable Entity | Request syntax valid but semantically incorrect |
| **500** | Internal Server Error | Server-side error (logged for debugging) |

### Error Response Structure

**Simple Error (String Detail):**

```json
{
  "detail": "User not found"
}
```

**Validation Error (Array of Field Errors):**

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    },
    {
      "loc": ["body", "password"],
      "msg": "ensure this value has at least 8 characters",
      "type": "value_error.any_str.min_length"
    }
  ]
}
```

**Validation Error Fields:**
- `loc`: Location of error (e.g., `["body", "email"]` for request body field)
- `msg`: Human-readable error message
- `type`: Error type (useful for programmatic handling)

### Common Error Scenarios

#### 400 Bad Request Examples

**Missing Required Field:**

```json
// POST /api/v1/users/ with missing email
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**Invalid Role Assignment:**

```json
// POST /api/v1/users/ creating VALIDATOR without validator_area_id
{
  "detail": "VALIDATOR role requires validator_area_id (governance area assignment)"
}
```

**Business Rule Violation:**

```json
// DELETE /api/v1/users/{user_id} trying to deactivate own account
{
  "detail": "Cannot deactivate your own account"
}
```

#### 401 Unauthorized Examples

**Missing Token:**

```json
{
  "detail": "Not authenticated"
}
```

**Invalid/Expired Token:**

```json
{
  "detail": "Could not validate credentials"
}
```

#### 403 Forbidden Examples

**Insufficient Permissions:**

```json
// Non-admin trying to access admin endpoint
{
  "detail": "Not enough permissions. Admin access required."
}
```

**Missing Required Assignment:**

```json
// Validator without governance area trying to access validator endpoint
{
  "detail": "Validator must be assigned to a governance area."
}
```

#### 404 Not Found Examples

```json
// GET /api/v1/users/99999 (user doesn't exist)
{
  "detail": "User not found"
}
```

### Error Handling in Frontend

**TypeScript Example with Axios:**

```typescript
import axios, { AxiosError } from 'axios';

try {
  const response = await api.post('/users/', userData);
  console.log('User created:', response.data);
} catch (error) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail: string | any[] }>;

    if (axiosError.response?.status === 400) {
      // Validation error
      const detail = axiosError.response.data.detail;
      if (Array.isArray(detail)) {
        // Field-specific errors
        detail.forEach(err => {
          console.error(`${err.loc.join('.')}: ${err.msg}`);
        });
      } else {
        // Simple error message
        console.error(detail);
      }
    } else if (axiosError.response?.status === 401) {
      // Redirect to login
      router.push('/login');
    } else if (axiosError.response?.status === 403) {
      // Show permission denied message
      toast.error('You do not have permission to perform this action');
    }
  }
}
```

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured to allow frontend access from approved origins.

### Allowed Origins

**Development:**
- `http://localhost:3000`
- `http://localhost:3001`
- `https://localhost:3000`
- `https://localhost:3001`
- `http://vantage-web:3000` (Docker internal)
- `http://172.25.0.40:3000` (Docker network)

**Production:**
- Add your production domain to `BACKEND_CORS_ORIGINS` in `apps/api/.env`

### Configuration

CORS settings in `apps/api/app/core/config.py`:

```python
BACKEND_CORS_ORIGINS: List[str] = [
    "http://localhost:3000",
    "https://localhost:3000",
    # Add production domains here
]
```

### Allowed Methods and Headers

- **Methods**: All HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`)
- **Headers**: All headers (including `Authorization`, `Content-Type`)
- **Credentials**: Enabled (allows cookies and authentication headers)

### CORS Preflight Requests

The browser automatically sends `OPTIONS` preflight requests for cross-origin requests with custom headers:

```http
OPTIONS /api/v1/users/ HTTP/1.1
Origin: http://localhost:3000
Access-Control-Request-Method: POST
Access-Control-Request-Headers: authorization,content-type
```

The server responds with allowed origins, methods, and headers:

```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE
Access-Control-Allow-Headers: authorization,content-type
Access-Control-Allow-Credentials: true
```

## API Conventions

### Tag-Based Organization

Endpoints are organized by **tags**, which drive auto-generated code organization via Orval.

**FastAPI Tags → Generated Code Structure:**

```
@router.get("/users/", tags=["users"])
  ↓
packages/shared/src/generated/
  ├── endpoints/users/     ← React Query hooks
  └── schemas/users/       ← TypeScript types
```

**Current Tags:**

| Tag | Description | Generated Hooks Location |
|-----|-------------|-------------------------|
| `auth` | Authentication | `endpoints/auth/` |
| `users` | User management | `endpoints/users/` |
| `assessments` | Assessment CRUD | `endpoints/assessments/` |
| `assessor` | Assessor/validator workflows | `endpoints/assessor/` |
| `analytics` | Analytics and reporting | `endpoints/analytics/` |
| `lookups` | Lookup data (barangays, areas) | `endpoints/lookups/` |
| `system` | System health and config | `endpoints/system/` |

### Naming Conventions

**Endpoints:**
- Use plural nouns: `/users/`, `/assessments/`, `/barangays/`
- Use kebab-case for multi-word resources: `/governance-areas/`
- RESTful verbs via HTTP methods (not in URLs): `POST /users/` not `/users/create`
- Actions use verb suffixes: `/users/{id}/activate`, `/users/{id}/reset-password`

**Request/Response Schemas:**
- Pydantic models in `apps/api/app/schemas/`
- Naming pattern: `[Entity]Create`, `[Entity]Update`, `[Entity]Response`
- Example: `UserAdminCreate`, `UserAdminUpdate`, `User` (response)

**Database Models:**
- SQLAlchemy models in `apps/api/app/db/models/`
- Singular nouns: `User`, `Assessment`, `Barangay`
- Table names auto-generated as plural: `users`, `assessments`, `barangays`

### Type Generation Workflow

**Critical**: Always run type generation after modifying endpoints or schemas.

```bash
# After adding/modifying API endpoints
pnpm generate-types
```

This command:
1. Starts the FastAPI server (if not running)
2. Fetches OpenAPI spec from `http://localhost:8000/openapi.json`
3. Runs Orval to generate TypeScript types and React Query hooks
4. Outputs to `packages/shared/src/generated/`

**Frontend Import Example:**

```typescript
// Auto-generated hook from GET /api/v1/users/
import { useGetUsers } from '@vantage/shared';

function UserList() {
  const { data, isLoading, error } = useGetUsers({
    page: 1,
    size: 10,
    role: 'VALIDATOR'
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### Service Layer Pattern

The API follows **"Fat Services, Thin Routers"** architecture:

**Routers** (`apps/api/app/api/v1/`):
- Handle HTTP concerns (request parsing, response formatting)
- Validate authentication and authorization
- Call service methods
- Return responses

**Services** (`apps/api/app/services/`):
- Implement business logic
- Interact with database
- Handle complex operations
- Raise domain-specific exceptions

**Example:**

```python
# ✅ GOOD: Thin router delegates to service
@router.post("/users/", tags=["users"])
async def create_user(
    user_create: UserAdminCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    return user_service.create_user_admin(db, user_create)

# ❌ BAD: Business logic in router
@router.post("/users/", tags=["users"])
async def create_user(...):
    # Don't put business logic here!
    user = User(**user_create.dict())
    user.hashed_password = get_password_hash(user_create.password)
    db.add(user)
    db.commit()
    return user
```

## SGLGB Workflow Context

The SINAG API supports the Seal of Good Local Governance for Barangays (SGLGB) assessment workflow:

### Workflow Stages

1. **BLGU Submission** (Stage 1)
   - BLGU users submit self-assessments
   - Upload Means of Verification (MOVs)
   - Endpoints: `POST /api/v1/assessments/`, `GET /api/v1/assessments/my-barangay`

2. **Validator Review** (Stage 2)
   - Validators review assessments within their assigned governance area
   - Submit validation reports and recommendations
   - One rework cycle allowed
   - Endpoints: `GET /api/v1/assessor/assignments`, `POST /api/v1/assessor/validate`

3. **Table Validation** (Stage 3)
   - Assessors perform in-person validation
   - Live compliance checklist
   - Endpoints: `GET /api/v1/assessor/barangays`, `POST /api/v1/assessor/table-validation`

4. **Classification** (Stage 4)
   - Automated "3+1" SGLGB scoring logic
   - Background processing via Celery
   - Endpoints: `POST /api/v1/intelligence/classify` (admin)

5. **Intelligence Layer** (Stage 5)
   - Gemini API generates CapDev recommendations
   - Gap analysis between initial and final assessments
   - Endpoints: `GET /api/v1/analytics/capdev-recommendations`

### DILG Terminology

- **BLGU**: Barangay Local Government Unit (the barangay being assessed)
- **SGLGB**: Seal of Good Local Governance for Barangays
- **MOV**: Means of Verification (evidence documents)
- **CapDev**: Capacity Development (training recommendations)
- **Governance Areas**: Categories like "Community Empowerment", "Financial Sustainability"
- **Indicators**: Specific assessment criteria (e.g., 1.1, 1.2, 2.1)
- **BBI**: Basic Budget Item (mandatory indicators)
- **3+1 Scoring**: SGLGB classification algorithm (Passed, Conditional, Failed + Incomplete)

## API Endpoints by Domain

Detailed endpoint documentation organized by functional area:

- **[Authentication](./endpoints/auth.md)** - Login, logout, password management
- **[Users](./endpoints/users.md)** - User CRUD, role management, admin operations
- **[Assessments](./endpoints/assessments.md)** - Assessment submissions and retrieval
- **[Assessors](./endpoints/assessors.md)** - Validator/assessor workflows
- **[Analytics](./endpoints/analytics.md)** - Reports, dashboards, intelligence
- **[Lookups](./endpoints/lookups.md)** - Barangays, governance areas, indicators

## Health Check Endpoint

**GET** `/health`

Returns detailed health status for monitoring and load balancers.

**Response (200 OK):**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-19T10:30:00Z",
  "api": {
    "version": "1.0.0",
    "name": "SINAG API"
  },
  "connections": {
    "database": {
      "status": "connected",
      "type": "postgresql"
    },
    "redis": {
      "status": "connected"
    },
    "supabase": {
      "status": "connected"
    }
  },
  "checks": {
    "database_query": "passed",
    "redis_ping": "passed"
  }
}
```

**Use Cases:**
- Kubernetes liveness/readiness probes
- Load balancer health checks
- Monitoring dashboards
- Deployment verification

## Rate Limiting

The API includes rate limiting middleware to prevent abuse.

**Current Configuration** (development):
- **Rate**: 100 requests per minute per IP address
- **Headers**: Response includes rate limit headers
- **Behavior**: Returns `429 Too Many Requests` when exceeded

**Response Headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000000
```

**429 Response:**

```json
{
  "detail": "Rate limit exceeded. Please try again later."
}
```

**Note**: Rate limiting is configurable per environment and can be adjusted for production workloads.

## Security Headers

All API responses include security headers via `SecurityHeadersMiddleware`:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Background Jobs

Long-running operations (AI classification, bulk operations) are processed asynchronously via Celery.

**Architecture:**
- **Broker**: Redis
- **Workers**: Celery workers (`celery -A app.core.celery_app worker`)
- **Queues**: `default`, `notifications`, `classification`, `intelligence`

**Workflow:**
1. API endpoint creates background job
2. Returns immediately with job ID
3. Client polls job status endpoint
4. Job completes and result is stored

**Example:**

```python
# Endpoint creates async job
task = classify_assessment.delay(assessment_id)
return {"job_id": task.id, "status": "processing"}
```

```typescript
// Frontend polls for completion
const { data } = useGetJobStatus(jobId, {
  refetchInterval: 2000, // Poll every 2 seconds
});
```

## Further Reading

- **[CLAUDE.md](/home/kiedajhinn/Projects/vantage/CLAUDE.md)** - Development guidelines and patterns
- **[Architecture Documentation](/home/kiedajhinn/Projects/vantage/docs/architecture.md)** - System architecture overview
- **[PRD Phase 1: Authentication](/home/kiedajhinn/Projects/vantage/docs/prds/prd-phase1-core-user-authentication-and-management.md)** - Authentication requirements
- **[PRD Phase 3: Assessor Validation](/home/kiedajhinn/Projects/vantage/docs/prds/prd-phase3-assessor-validation-rework-cycle.md)** - Validator workflow details
- **[Indicator Builder Specification](/home/kiedajhinn/Projects/vantage/docs/indicator-builder-specification.md)** - SGLGB indicator structure

## Support and Contribution

For questions, issues, or contributions:

1. **Check Interactive Docs**: http://localhost:8000/docs for live API testing
2. **Review CLAUDE.md**: Development patterns and commands
3. **Search PRDs**: Business requirements and workflows
4. **Check Logs**: FastAPI logs detail all requests and errors

**Common Development Tasks:**

```bash
# Start API server
pnpm dev:api

# Run tests
cd apps/api && pytest

# Generate types after API changes
pnpm generate-types

# Create database migration
cd apps/api && alembic revision --autogenerate -m "description"

# Apply migrations
cd apps/api && alembic upgrade head
```
