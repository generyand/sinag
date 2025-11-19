# System API

The System API provides endpoints for system health checks, connectivity status, and basic API information. These endpoints are used for monitoring, debugging, and infrastructure health verification.

## Overview

**Base Path**: `/api/v1`

**Authentication**: Most endpoints are public (no authentication required) for health check purposes.

**Purpose**: System monitoring, health checks, and connectivity verification.

**Type Generation**: After modifying any system endpoint or schema, run `pnpm generate-types` to update frontend types.

---

## Endpoints

### GET /api/v1/

Root endpoint - welcome message for the API.

**Authentication**: Public (no authentication required)

**Description**: Returns a simple welcome message confirming the API is running.

**Request Body**: None

**Response** (200 OK):
```json
{
  "message": "Welcome to Vantage API"
}
```

---

### GET /api/v1/health

Comprehensive health check endpoint.

**Authentication**: Public (no authentication required)

**Description**: Performs comprehensive health checks including API service status, database connectivity (SQLAlchemy + Supabase), and overall system health. Used by infrastructure monitoring tools and load balancers.

**Health Check Components**:
- API service status
- PostgreSQL connection via SQLAlchemy
- Supabase connection and configuration
- Overall system health determination

**Request Body**: None

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "api": {
    "status": "healthy",
    "service": "FastAPI",
    "version": "1.0.0"
  },
  "connections": {
    "overall_status": "healthy",
    "timestamp": "2025-01-15T10:30:00Z",
    "postgresql": {
      "status": "connected",
      "connection_time_ms": 45
    },
    "supabase": {
      "status": "connected",
      "project_url": "https://[project].supabase.co",
      "connection_time_ms": 32
    }
  },
  "checks": {
    "api": true,
    "database": true,
    "overall": true
  }
}
```

**Response** (503 Service Unavailable - if unhealthy):
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "api": {
    "status": "healthy",
    "service": "FastAPI",
    "version": "1.0.0"
  },
  "connections": {
    "overall_status": "unhealthy",
    "timestamp": "2025-01-15T10:30:00Z",
    "postgresql": {
      "status": "error",
      "error": "Connection timeout",
      "connection_time_ms": null
    },
    "supabase": {
      "status": "connected",
      "project_url": "https://[project].supabase.co",
      "connection_time_ms": 28
    }
  },
  "checks": {
    "api": true,
    "database": false,
    "overall": false
  }
}
```

**Usage**:
- Kubernetes/Docker health probes
- Load balancer health checks
- Infrastructure monitoring (Datadog, New Relic, etc.)
- CI/CD pipeline verification
- Pre-deployment smoke tests

---

### GET /api/v1/db-status

Detailed database connectivity status for debugging.

**Authentication**: Public (no authentication required)

**Description**: Returns detailed information about database connections including PostgreSQL connection via SQLAlchemy, Supabase connection and configuration, and connection errors with troubleshooting info. Used for debugging database connectivity issues.

**Request Body**: None

**Response** (200 OK):
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "connections": {
    "overall_status": "healthy",
    "timestamp": "2025-01-15T10:30:00Z",
    "postgresql": {
      "status": "connected",
      "connection_time_ms": 42,
      "database_name": "postgres",
      "host": "[region].pooler.supabase.com",
      "port": 6543
    },
    "supabase": {
      "status": "connected",
      "project_url": "https://[project].supabase.co",
      "connection_time_ms": 35,
      "project_ref": "[project-ref]"
    }
  },
  "individual_checks": {
    "postgresql": {
      "status": "connected",
      "connection_string": "postgresql://postgres.[project-ref]:****@[region].pooler.supabase.com:6543/postgres",
      "driver": "psycopg2",
      "pool_size": 5,
      "max_overflow": 10
    },
    "supabase": {
      "status": "connected",
      "auth_configured": true,
      "storage_configured": true,
      "anon_key_present": true,
      "service_role_key_present": true
    }
  }
}
```

**Usage**:
- Debugging database connection issues
- Verifying Supabase configuration
- Troubleshooting environment variable issues
- Development/staging environment verification

---

### GET /api/v1/hello

Simple hello endpoint for testing connectivity.

**Authentication**: Public (no authentication required)

**Description**: Returns a simple hello message confirming the API is reachable. Useful for quick connectivity tests.

**Request Body**: None

**Response** (200 OK):
```json
{
  "message": "Hello from FastAPI backend!"
}
```

**Usage**:
- Quick connectivity test
- Network troubleshooting
- Firewall/proxy verification
- Basic smoke test

---

## Data Models

### HealthCheck

| Field | Type | Description |
|-------|------|-------------|
| status | string | Overall health status (healthy/unhealthy) |
| timestamp | datetime | Check timestamp |
| api | object | API service status |
| connections | object | Database connection statuses |
| checks | object | Boolean flags for each check |

### ConnectionStatus

| Field | Type | Description |
|-------|------|-------------|
| status | string | Connection status (connected/error) |
| connection_time_ms | integer | Connection time in milliseconds |
| error | string | Error message if failed |

---

## Business Rules

### Health Status Determination

- **Healthy**: API running AND all database connections successful
- **Unhealthy**: API running BUT one or more database connections failed
- Health endpoint should return 200 OK even when unhealthy (for monitoring tools)

### Response Times

- Health check should complete within 5 seconds
- Connection timeouts should be reasonable (e.g., 3 seconds per check)
- Parallel connection checks for improved performance

---

## Notes

- **Monitoring Integration**: These endpoints are designed for automated monitoring systems
- **Security**: No sensitive information (passwords, keys) should be exposed in responses
- **Caching**: Health checks should NOT be cached - always return live status
- **Load Balancers**: Use `/api/v1/health` for load balancer health probes
- **CI/CD**: Use `/api/v1/hello` for quick smoke tests in deployment pipelines
