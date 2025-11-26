# Lookups API

The Lookups API provides endpoints for fetching reference data from lookup tables such as governance areas and barangays. These endpoints support form dropdowns, filters, and data validation throughout the SINAG platform.

## Overview

**Base Path**: `/api/v1/lookups`

**Authentication**: All endpoints require authentication (accessible by all authenticated users).

**Purpose**: Provides static/reference data for forms, filters, and validation.

**Type Generation**: After modifying any lookups endpoint or schema, run `pnpm generate-types` to update frontend types.

---

## Endpoints

### GET /api/v1/lookups/governance-areas

Retrieve all governance areas.

**Authentication**: All authenticated users

**Workflow Stage**: All stages (Reference Data)

**Description**: Returns a complete list of all governance areas used in the SGLGB assessment framework. Governance areas represent the six major categories under which indicators are organized.

**SGLGB Governance Areas**:
1. Financial Administration
2. Disaster Preparedness
3. Social Protection
4. Peace and Order
5. Environmental Management
6. Tourism, Culture, and Sports

**Request Body**: None

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "code": "GA-1",
    "name": "Financial Administration",
    "description": "Indicators related to budget management, transparency, and financial accountability",
    "is_active": true,
    "created_at": "2024-12-01T00:00:00Z"
  },
  {
    "id": 2,
    "code": "GA-2",
    "name": "Disaster Preparedness",
    "description": "Indicators related to disaster risk reduction and emergency response",
    "is_active": true,
    "created_at": "2024-12-01T00:00:00Z"
  },
  {
    "id": 3,
    "code": "GA-3",
    "name": "Social Protection",
    "description": "Indicators related to social welfare and community programs",
    "is_active": true,
    "created_at": "2024-12-01T00:00:00Z"
  },
  {
    "id": 4,
    "code": "GA-4",
    "name": "Peace and Order",
    "description": "Indicators related to public safety and conflict resolution",
    "is_active": true,
    "created_at": "2024-12-01T00:00:00Z"
  },
  {
    "id": 5,
    "code": "GA-5",
    "name": "Environmental Management",
    "description": "Indicators related to environmental sustainability and conservation",
    "is_active": true,
    "created_at": "2024-12-01T00:00:00Z"
  },
  {
    "id": 6,
    "code": "GA-6",
    "name": "Tourism, Culture, and Sports",
    "description": "Indicators related to cultural preservation and community development",
    "is_active": true,
    "created_at": "2024-12-01T00:00:00Z"
  }
]
```

**Errors**:
- `401 Unauthorized`: User not authenticated

**Usage**:
- Populating validator assignment dropdowns (VALIDATOR role assignment)
- Filtering assessment data by governance area
- Displaying governance area names in reports and dashboards
- Organizing indicators in assessment forms

---

### GET /api/v1/lookups/barangays

Retrieve all barangays.

**Authentication**: All authenticated users

**Workflow Stage**: All stages (Reference Data)

**Description**: Returns a complete list of all barangays in the system. Barangays are the smallest local government units that participate in SGLGB assessments.

**Request Body**: None

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "name": "Barangay San Isidro",
    "code": "BRG-001",
    "municipality": "Dumaguete City",
    "province": "Negros Oriental",
    "region": "Region VII (Central Visayas)",
    "population": 5420,
    "latitude": 8.0556,
    "longitude": 123.8854,
    "is_active": true,
    "created_at": "2024-12-01T00:00:00Z"
  },
  {
    "id": 2,
    "name": "Barangay Santa Cruz",
    "code": "BRG-002",
    "municipality": "Dumaguete City",
    "province": "Negros Oriental",
    "region": "Region VII (Central Visayas)",
    "population": 4230,
    "latitude": 8.0445,
    "longitude": 123.8723,
    "is_active": true,
    "created_at": "2024-12-01T00:00:00Z"
  }
]
```

**Errors**:
- `401 Unauthorized`: User not authenticated

**Usage**:
- Populating BLGU_USER assignment dropdowns (barangay assignment)
- Filtering reports and analytics by barangay
- Displaying barangay information in assessment details
- Geographic visualization (map data with lat/lng coordinates)
- Assessor barangay selection during workflow

---

## Data Models

### GovernanceArea

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| code | string | Short code (e.g., "GA-1") |
| name | string | Governance area name |
| description | string | Detailed description |
| is_active | boolean | Active status |
| created_at | datetime | Creation timestamp |

### Barangay

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| name | string | Barangay name |
| code | string | Unique barangay code |
| municipality | string | Municipality name |
| province | string | Province name |
| region | string | Region name |
| population | integer | Population count |
| latitude | float | Latitude for mapping |
| longitude | float | Longitude for mapping |
| is_active | boolean | Active status |
| created_at | datetime | Creation timestamp |

---

## Business Rules

### Governance Areas

- There are exactly **6 governance areas** in the SGLGB framework
- Each governance area contains multiple indicators
- VALIDATORs are assigned to one governance area
- Barangays must pass at least 3 out of 6 governance areas (3+1 rule)

### Barangays

- Each barangay is assigned to exactly one BLGU_USER
- Barangays can have assessments across multiple cycles
- Geographic coordinates (latitude/longitude) enable map visualization
- Inactive barangays are excluded from new assessments

---

## Notes

- **Type Generation**: Always run `pnpm generate-types` after modifying lookups endpoints
- **Caching**: Lookup data is relatively static and suitable for client-side caching
- **Reference Data**: These endpoints provide read-only reference data
- **Filtering**: Frontend should cache this data and filter client-side for performance
