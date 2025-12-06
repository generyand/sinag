# External Stakeholder Analytics

The platform provides read-only analytics access for external stakeholders from Katuparan Center for research purposes. All data is aggregated and anonymized to protect individual barangay privacy.

## Endpoints

Available at `/api/v1/external/analytics/`:

| Endpoint | Description |
|----------|-------------|
| `GET /overall` | Municipal-wide SGLGB compliance statistics |
| `GET /governance-areas` | Aggregated pass/fail rates for all 6 governance areas |
| `GET /top-failing-indicators` | Top 5 most frequently failed indicators |
| `GET /ai-insights/summary` | Anonymized AI-generated recommendations |
| `GET /dashboard` | Complete dashboard data in single request |
| `GET /export/csv` | Download aggregated analytics as CSV |
| `GET /export/pdf` | Download aggregated analytics as PDF |

## Privacy Protections

1. **Minimum Threshold**: Data only shown if ≥5 barangays assessed (prevents identification)
2. **Aggregation**: All metrics are aggregated across all barangays
3. **No Individual Data**: Individual barangay performance cannot be identified

## Access Control

Only users with `KATUPARAN_CENTER_USER` role can access external analytics.

Uses the `get_current_external_user` dependency for authentication.

## Implementation

- **Router**: `apps/api/app/api/v1/external_analytics.py`
- **Service**: `apps/api/app/services/external_analytics_service.py`
- **Schema**: `apps/api/app/schemas/external_analytics.py`
