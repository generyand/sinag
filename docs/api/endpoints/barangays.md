# Barangays API

**Note**: There is no dedicated `/api/v1/barangays` router in the VANTAGE API.

Barangay management functionality is handled through the **Lookups API** instead.

## Barangay Data Access

For barangay-related operations, please refer to:

### GET /api/v1/lookups/barangays

Retrieve all barangays with complete details including:
- Barangay name and code
- Municipality, province, and region
- Population data
- Geographic coordinates (latitude/longitude)
- Active status

**See**: [Lookups API Documentation](./lookups.md) for complete endpoint details.

---

## Barangay-Related Endpoints in Other APIs

Barangay functionality is distributed across other domain-specific endpoints:

### User Assignment

**Endpoint**: `POST /api/v1/users` and `PUT /api/v1/users/{user_id}`

Assign BLGU_USER role users to specific barangays using the `barangay_id` field.

**See**: [Users API Documentation](./users.md) for complete details.

### Assessment Data

**Endpoint**: `GET /api/v1/assessments/my-assessment`

Retrieve assessment data for the current user's barangay (BLGU_USER role).

**See**: [Assessments API Documentation](./assessments.md) for complete details.

### Analytics & Reports

**Endpoint**: `GET /api/v1/analytics/reports`

Filter reports and analytics data by barangay using the `barangay_id` query parameter.

**See**: [Analytics API Documentation](./analytics.md) for complete details.

---

## Why No Dedicated Barangays Router?

VANTAGE follows a domain-driven design where:

1. **Reference Data**: Barangays are static reference data served by the Lookups API
2. **User Assignment**: Barangay-user relationships are managed through the Users API
3. **Assessment Data**: Barangay-specific assessment data is accessed through the Assessments API
4. **Analytics**: Barangay analytics are provided by the Analytics API

This design avoids duplication and maintains clear separation of concerns.

---

## Quick Reference

| Operation | Endpoint | API |
|-----------|----------|-----|
| List all barangays | `GET /api/v1/lookups/barangays` | Lookups |
| Assign user to barangay | `POST /api/v1/users` | Users |
| Get barangay assessment | `GET /api/v1/assessments/my-assessment` | Assessments |
| Filter reports by barangay | `GET /api/v1/analytics/reports?barangay_id={id}` | Analytics |

---

## Future Considerations

If dedicated barangay management features are needed (e.g., CRUD operations for barangays), a dedicated `/api/v1/barangays` router should be created with admin-only endpoints for:
- Creating new barangays
- Updating barangay information
- Deactivating barangays
- Managing barangay metadata

For now, the current architecture provides all necessary barangay functionality through existing APIs.
