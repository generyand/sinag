# Analytics API

The Analytics API provides endpoints for retrieving dashboard KPIs, reports data, and assessment
analytics for the SGLGB platform. This API supports role-based data filtering and comprehensive
visualization data.

## Overview

**Base Path**: `/api/v1/analytics`

**Authentication**: All endpoints require authentication. Dashboard endpoint requires MLGOO_DILG
role, while reports endpoint has role-based filtering.

**Role-Based Access Control**: Different roles see different data scopes (MLGOO_DILG sees all,
VALIDATOR sees assigned area, BLGU_USER sees own barangay).

**Type Generation**: After modifying any analytics endpoint or schema, run `pnpm generate-types` to
update frontend types.

---

## Endpoints

### GET /api/v1/analytics/dashboard

Get dashboard KPIs for MLGOO-DILG dashboard.

**Authentication**: MLGOO_DILG role required

**Workflow Stage**: Admin Dashboard (Stage 4 - Reporting)

**Description**: Retrieves comprehensive analytics including compliance rates, area breakdowns,
failed indicators, barangay rankings, and historical trends. Data can be filtered by assessment
cycle.

**Query Parameters**:

- `cycle_id` (integer, optional): Assessment cycle ID (defaults to latest cycle if not provided)

**Request Body**: None

**Response** (200 OK):

```json
{
  "overall_compliance_rate": {
    "total_barangays": 50,
    "passed": 35,
    "failed": 15,
    "pass_percentage": 70.0
  },
  "completion_status": {
    "total_barangays": 50,
    "passed": 40,
    "failed": 10,
    "pass_percentage": 80.0
  },
  "area_breakdown": [
    {
      "area_code": "GA-1",
      "area_name": "Financial Administration",
      "passed": 30,
      "failed": 20,
      "percentage": 60.0
    },
    {
      "area_code": "GA-2",
      "area_name": "Disaster Preparedness",
      "passed": 35,
      "failed": 15,
      "percentage": 70.0
    }
  ],
  "top_failed_indicators": [
    {
      "indicator_id": 5,
      "indicator_name": "Budget Transparency",
      "failure_count": 25,
      "percentage": 50.0
    },
    {
      "indicator_id": 12,
      "indicator_name": "Community Participation",
      "failure_count": 20,
      "percentage": 40.0
    }
  ],
  "barangay_rankings": [
    {
      "barangay_id": 1,
      "barangay_name": "Barangay San Isidro",
      "score": 95.5,
      "rank": 1
    },
    {
      "barangay_id": 2,
      "barangay_name": "Barangay Santa Cruz",
      "score": 92.3,
      "rank": 2
    }
  ],
  "trends": [
    {
      "cycle_id": 1,
      "cycle_name": "2024 Q1",
      "pass_rate": 65.0,
      "date": "2024-01-01T00:00:00Z"
    },
    {
      "cycle_id": 2,
      "cycle_name": "2024 Q2",
      "pass_rate": 70.0,
      "date": "2024-04-01T00:00:00Z"
    }
  ]
}
```

**Errors**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not enough permissions (MLGOO_DILG role required)
- `500 Internal Server Error`: Failed to retrieve dashboard KPIs

---

### GET /api/v1/analytics/reports

Get comprehensive reports data with filtering and RBAC.

**Authentication**: All authenticated users (with role-based data filtering)

**Workflow Stage**: Reporting (All Stages)

**Description**: Retrieves chart data (bar, pie, line), geographic map data, and paginated table
data based on the provided filters and user's role. Supports flexible filtering by cycle, date
range, governance area, barangay, and status.

**Role-Based Data Filtering**:

- **MLGOO_DILG/SUPERADMIN**: See all data
- **VALIDATOR**: See only assigned governance area
- **BLGU_USER**: See only own barangay

**Query Parameters**:

- `cycle_id` (integer, optional): Filter by assessment cycle ID
- `start_date` (date, optional): Filter by start date (inclusive, format: YYYY-MM-DD)
- `end_date` (date, optional): Filter by end date (inclusive, format: YYYY-MM-DD)
- `governance_area` (array[string], optional): Filter by governance area codes (e.g., ["GA-1",
  "GA-2"])
- `barangay_id` (array[integer], optional): Filter by barangay IDs
- `status` (string, optional): Filter by assessment status (Pass/Fail/In Progress)
- `page` (integer, optional): Page number for table pagination (default: 1, min: 1)
- `page_size` (integer, optional): Number of rows per page (default: 50, min: 1, max: 100)

**Request Body**: None

**Response** (200 OK):

```json
{
  "chart_data": {
    "bar_chart": [
      {
        "area_code": "GA-1",
        "area_name": "Financial Administration",
        "passed": 20,
        "failed": 5,
        "pass_percentage": 80.0
      }
    ],
    "pie_chart": [
      { "status": "Pass", "count": 30, "percentage": 60.0 },
      { "status": "Fail", "count": 15, "percentage": 30.0 },
      { "status": "In Progress", "count": 5, "percentage": 10.0 }
    ],
    "line_chart": [
      {
        "cycle_id": 1,
        "cycle_name": "January 2025",
        "pass_rate": 65.0,
        "date": "2025-01-01T00:00:00Z"
      }
    ]
  },
  "map_data": {
    "barangays": [
      {
        "barangay_id": 1,
        "name": "Barangay San Isidro",
        "lat": 8.0556,
        "lng": 123.8854,
        "status": "Pass",
        "score": 95.5
      }
    ]
  },
  "table_data": {
    "rows": [
      {
        "barangay_id": 1,
        "barangay_name": "Barangay San Isidro",
        "governance_area": "Financial Administration",
        "status": "Pass",
        "score": 95.5
      }
    ],
    "total_count": 50,
    "page": 1,
    "page_size": 50
  },
  "metadata": {
    "generated_at": "2025-01-15T10:30:00Z",
    "cycle_id": null,
    "start_date": null,
    "end_date": null,
    "governance_areas": null,
    "barangay_ids": null,
    "status": null
  }
}
```

**Errors**:

- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Failed to retrieve reports data

---

## Data Models

### Chart Data Types

- **Bar Chart**: Governance area pass/fail counts with percentages
- **Pie Chart**: Overall status distribution (Pass/Fail/In Progress)
- **Line Chart**: Historical trend data across assessment cycles

### Map Data Structure

Geographic visualization data with barangay coordinates, compliance status, and scores.

### Table Data Structure

Paginated assessment data with barangay information, governance areas, status, and scores.

---

## Business Rules

### Role-Based Filtering

- **MLGOO_DILG**: Full system access, no automatic filtering
- **VALIDATOR**: Automatically filtered to assigned `validator_area_id`
- **BLGU_USER**: Automatically filtered to assigned `barangay_id`
- **ASSESSOR**: Full system access (flexible assignment)

### Data Aggregation

- Compliance rates calculated using "3+1" SGLGB rule
- Barangay rankings based on overall assessment scores
- Trends show pass rates across assessment cycles
- Top failed indicators sorted by failure count descending

---

## Notes

- **Type Generation**: Always run `pnpm generate-types` after modifying analytics endpoints
- **Performance**: Analytics queries may be cached for improved performance
- **Cycle Filtering**: If no cycle_id provided, latest cycle is used by default
- **Geographic Data**: Map coordinates (lat/lng) must be valid for visualization
