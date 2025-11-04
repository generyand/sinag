# Product Requirements Document: High-Level Analytics & Reporting

## 1. Introduction/Overview

The High-Level Analytics & Reporting feature transforms VANTAGE from a workflow management tool into a comprehensive strategic decision-support platform for DILG stakeholders. This feature provides the MLGOO-DILG and other authorized users with data visualizations, performance insights, and AI-generated recommendations that enable data-driven governance improvements across the municipality.

**Problem Statement:** Currently, DILG personnel must manually compile and analyze barangay assessment data to identify performance trends, common failure points, and capacity development needs. This manual process is time-consuming, error-prone, and limits the ability to make timely, evidence-based decisions for improving barangay governance.

**Solution:** A comprehensive analytics and reporting module that automatically aggregates, visualizes, and analyzes assessment data to provide actionable insights, including a dedicated MLGOO-DILG dashboard with municipal-wide KPIs, a flexible Reports page with interactive visualizations, a Gap Analysis tool to identify common correction areas, a rich UI for AI-generated recommendations, and a secure external API for partner institutions.

## 2. Goals

1. **Reduce report generation time** by 80% compared to manual methods through automated data aggregation and visualization
2. **Enable data-driven decision-making** by providing MLGOO-DILG with real-time visibility into municipal-wide SGLGB performance
3. **Identify capacity development priorities** through Gap Analysis and AI-generated insights highlighting common failure patterns
4. **Support strategic planning** with historical trend analysis across multiple assessment cycles
5. **Facilitate inter-agency collaboration** by providing secure, read-only data access to the UMDC Peace Center and Katuparan Center
6. **Improve transparency** by allowing appropriate stakeholders (Assessors, BLGUs) to access relevant performance data

## 3. User Stories

### MLGOO-DILG Staff

- **US-1:** As an MLGOO-DILG officer, I want to see a dashboard with municipal-wide SGLGB pass/fail rates so that I can quickly assess overall governance performance across all 25 barangays.
- **US-2:** As an MLGOO-DILG officer, I want to identify the top 5 most commonly failed indicators so that I can prioritize targeted capacity development programs.
- **US-3:** As an MLGOO-DILG officer, I want to view trend analysis across multiple assessment cycles so that I can track improvement over time and report to provincial leadership.
- **US-4:** As an MLGOO-DILG officer, I want to see a geographic map visualization of barangay performance so that I can identify geographic clusters of high/low performance.
- **US-5:** As an MLGOO-DILG officer, I want to download AI-generated recommendations as a PDF so that I can include them in official reports and share them with barangay officials.

### Area Assessors

- **US-6:** As an Area Assessor, I want to view aggregated performance metrics for my assigned governance area so that I can understand common challenges BLGUs face in my area of expertise.
- **US-7:** As an Area Assessor, I want to see the Gap Analysis for my governance area so that I can refine my validation approach and provide better guidance during the rework cycle.

### BLGU Users

- **US-8:** As a BLGU user, I want to view my own barangay's historical assessment results and AI recommendations so that I can track our improvement journey and plan corrective actions.
- **US-9:** As a BLGU user, I want to compare our initial submission against the final validated results so that I can understand where we need to improve our self-assessment accuracy.

### UMDC Peace Center / Katuparan Center

- **US-10:** As a researcher at UMDC Peace Center, I want to access anonymized, aggregated SGLGB data via a read-only API so that I can conduct research and propose evidence-based community extension programs.
- **US-11:** As a Katuparan Center staff member, I want to retrieve municipal-wide trend data so that I can align our CapDev initiatives with actual governance gaps identified in the data.

## 4. Functional Requirements

### 4.1 MLGOO-DILG Dashboard

**FR-1:** The system must provide a dedicated dashboard accessible only to users with the `MLGOO_DILG` role.

**FR-2:** The dashboard must display the following KPIs for the selected assessment cycle:
- Overall municipal SGLGB Compliance Status rate (percentage of barangays that passed/failed)
- Total number of barangays with `Validated` status vs. in-progress
- Breakdown of Compliance Status by each Governance Area (e.g., "Financial Administration: 70% Passed, 30% Failed")
- Top 5 most commonly failed indicators across all barangays (with count/percentage)
- Comparative barangay performance (ranked list or categorized tiers)

**FR-3:** The dashboard must support assessment cycle selection via a dropdown filter to view historical data.

**FR-4:** The dashboard must display trend charts showing pass/fail rates over the last 3 assessment cycles (if historical data exists).

**FR-5:** All KPIs must auto-refresh when the user changes the selected assessment cycle without requiring a page reload.

**FR-6:** The dashboard must display the date/time of the last data update.

### 4.2 Reports Page

**FR-7:** The system must provide a "Reports" page with role-based access:
- MLGOO-DILG: Full access to all municipal data
- Assessors: Access to aggregated data for their assigned governance area only
- BLGUs: Access to their own barangay's historical data only

**FR-8:** The Reports page must include the following visualization types:
- Bar charts showing pass/fail rates by governance area
- Pie charts showing overall compliance status distribution
- Line charts displaying trends over multiple assessment cycles
- Geographic map of the municipality with barangays color-coded by performance
- Interactive filterable data tables with sorting and search capabilities

**FR-9:** The Reports page must provide filtering options:
- Assessment cycle (single or date range selection)
- Governance area (multi-select)
- Barangay (multi-select, based on user permissions)
- Compliance status (Pass/Fail/In Progress)

**FR-10:** All visualizations must be interactive, allowing users to click/hover for detailed tooltips and drill-down into underlying data.

**FR-11:** The Reports page must support data export functionality:
- Export filtered data tables to CSV
- Export visualizations as PNG images
- Generate comprehensive PDF reports containing selected visualizations and data tables

### 4.3 Gap Analysis Report

**FR-12:** The system must provide a Gap Analysis feature that compares initial BLGU submissions against final validated data.

**FR-13:** The Gap Analysis must display a medium-detail default view showing:
- Breakdown by governance area
- Count and percentage of indicators where the `is_completed` status changed from initial submission to final validation
- Aggregated view of "Before" vs. "After" compliance counts per governance area

**FR-14:** The Gap Analysis must support interactive drill-down:
- Clicking a governance area expands to show individual indicators within that area
- Clicking an indicator displays the specific initial vs. final response details (including changes to attachments, text responses, and `is_completed` status)

**FR-15:** The Gap Analysis must be filterable by assessment cycle, barangay (based on user role), and governance area.

**FR-16:** The Gap Analysis must highlight the most common correction patterns (e.g., "80% of changes in Financial Administration were related to missing MOVs for Budget Transparency indicators").

**FR-17:** The system must allow MLGOO-DILG users to export the Gap Analysis report as a PDF.

### 4.4 AI-Generated Recommendations Display

**FR-18:** The system must provide a dedicated UI component to display AI-generated recommendations from the Gemini API integration.

**FR-19:** The recommendations display must include:
- Collapsible sections organized by governance area
- Visual priority indicators (High/Medium/Low) for each recommendation
- Action items highlighted with clear formatting
- Timestamp showing when the recommendations were generated

**FR-20:** The system must allow users to download AI recommendations as a formatted PDF report suitable for official documentation.

**FR-21:** The system must provide a feature to track implementation status of recommendations:
- MLGOO-DILG users can mark recommendations as "Not Started", "In Progress", "Completed", or "Not Applicable"
- Status changes are timestamped and logged
- Dashboard displays summary of recommendation implementation progress

**FR-22:** The recommendations UI must be accessible to:
- MLGOO-DILG: All recommendations for all barangays
- BLGUs: Recommendations specific to their barangay only

### 4.5 External API Endpoint (Katuparan/UMDC Peace Center)

**FR-23:** The system must provide a secure, read-only REST API endpoint accessible only to pre-authorized external partner institutions (UMDC Peace Center, Katuparan Center).

**FR-24:** The API must require authentication via API keys with role-based permissions enforced at the endpoint level.

**FR-25:** The API must expose the following data (anonymized per barangay):
- Final validated Compliance Status per barangay (Pass/Fail) per assessment cycle
- Aggregated statistics: overall pass/fail rates, rates by governance area
- Trend data: historical performance over multiple assessment cycles
- Aggregated top failed indicators across the municipality (no individual barangay attribution)

**FR-26:** The API must NOT expose:
- Individual indicator scores attributable to specific barangays (unless explicitly anonymized)
- Personally identifiable information (PII) of BLGU users or assessors
- MOV attachments or detailed text responses
- Any data flagged as "in progress" or not yet validated

**FR-27:** The API must support query parameters for filtering:
- `cycle_id`: Specific assessment cycle
- `start_date` and `end_date`: Date range for multi-cycle queries
- `governance_area`: Specific area code

**FR-28:** The API must return data in JSON format with comprehensive OpenAPI documentation.

**FR-29:** The API must implement rate limiting (e.g., 100 requests per hour per API key) to prevent abuse.

**FR-30:** All API access must be logged (timestamp, endpoint, API key, query parameters) for audit purposes.

### 4.6 General Requirements

**FR-31:** All analytics features must respect role-based access control (RBAC) enforced at both the UI and API levels.

**FR-32:** The system must cache frequently accessed aggregated data (e.g., dashboard KPIs) with a configurable cache invalidation strategy (e.g., 15-minute TTL or on-demand invalidation when new validations occur).

**FR-33:** All reports and visualizations must include metadata: date range, filters applied, and generation timestamp.

**FR-34:** The system must handle large datasets (25 barangays × 100+ indicators × multiple cycles) efficiently, with query optimization and pagination where necessary.

**FR-35:** All date/time displays must respect the user's timezone (default: Philippine Time, UTC+8).

## 5. Non-Goals (Out of Scope)

**NG-1:** User-created custom reports or dashboards are out of scope for Phase 5. Users will work with the predefined reports and visualizations provided by the system.

**NG-2:** Real-time data streaming or live updates are out of scope. Data will be updated in near-real-time via scheduled batch processes or triggered cache invalidation.

**NG-3:** Advanced statistical analysis features (e.g., regression analysis, predictive modeling) are out of scope. The focus is on descriptive analytics and AI-generated insights from Gemini.

**NG-4:** Mobile-native applications are out of scope. The Reports page and dashboards will be responsive web applications accessible on mobile browsers.

**NG-5:** Integration with external BI tools (e.g., Power BI, Tableau) is out of scope for Phase 5.

**NG-6:** Automated email/SMS alerts based on analytics thresholds (e.g., "Alert when pass rate drops below 50%") are deferred to Phase 7 (Notifications).

## 6. Design Considerations

### 6.1 User Interface

- Follow the existing VANTAGE design system using shadcn/ui components and Tailwind CSS
- Use consistent color coding across all visualizations:
  - Green for "Pass" or positive indicators
  - Red for "Fail" or negative indicators
  - Yellow/amber for "In Progress"
- Ensure all visualizations are accessible (WCAG 2.1 AA compliance)
- Provide loading states and skeleton screens for data-heavy pages
- Use progressive disclosure: show high-level summaries by default, with drill-down capabilities

### 6.2 Data Visualization Libraries

- Use **Recharts** or **Chart.js** for standard charts (bar, line, pie) due to React compatibility and ease of customization
- Use **Leaflet** or **Mapbox GL JS** for geographic map visualizations
- Use **TanStack Table** for interactive, filterable data tables (already in use if using shadcn/ui)

### 6.3 Responsive Design

- All dashboards and reports must be fully responsive (mobile, tablet, desktop)
- On mobile, stack visualizations vertically and provide horizontal scrolling for wide tables
- Prioritize critical KPIs for above-the-fold display on mobile

### 6.4 PDF Generation

- Use **Puppeteer** or **jsPDF + html2canvas** for client-side PDF generation of reports and AI recommendations
- PDFs must include DILG branding, page numbers, and generation metadata

## 7. Technical Considerations

### 7.1 Backend Architecture

**Service Layer:**
- Create a new `analytics_service.py` to handle all analytics-related business logic:
  - KPI calculations (pass/fail rates, top failed indicators, trends)
  - Gap analysis computation (diffing initial vs. final submissions)
  - Data aggregation and filtering
- Create a new `external_api_service.py` to handle external API endpoint logic, including anonymization and aggregation for partner institutions

**API Endpoints (FastAPI):**
- `GET /api/v1/analytics/dashboard` - MLGOO-DILG dashboard KPIs (tag: `analytics`)
- `GET /api/v1/analytics/reports` - Flexible endpoint supporting multiple filters (tag: `analytics`)
- `GET /api/v1/analytics/gap-analysis` - Gap analysis data (tag: `analytics`)
- `GET /api/v1/analytics/trends` - Historical trend data (tag: `analytics`)
- `GET /api/v1/external/sglgb-data` - External API for partner institutions (tag: `external-api`)
- `GET /api/v1/recommendations/{assessment_id}` - AI recommendations for a specific assessment (tag: `recommendations`)
- `PATCH /api/v1/recommendations/{recommendation_id}/status` - Update recommendation implementation status (tag: `recommendations`)

### 7.2 Database Considerations

**New Tables/Models:**
- `recommendation_tracking` table to store implementation status:
  - `id` (PK)
  - `assessment_id` (FK to assessments)
  - `governance_area_code` (FK)
  - `recommendation_text`
  - `priority` (High/Medium/Low)
  - `status` (Not Started/In Progress/Completed/Not Applicable)
  - `updated_by` (FK to users)
  - `updated_at`
  - `created_at`

- `external_api_keys` table for partner institution authentication:
  - `id` (PK)
  - `institution_name` (e.g., "UMDC Peace Center")
  - `api_key` (hashed)
  - `is_active`
  - `rate_limit`
  - `created_at`
  - `last_used_at`

- `api_access_logs` table for audit trail:
  - `id` (PK)
  - `api_key_id` (FK)
  - `endpoint`
  - `query_parameters`
  - `response_status`
  - `timestamp`

**Query Optimization:**
- Create database indexes on frequently queried columns:
  - `assessments.cycle_id`
  - `assessments.final_compliance_status`
  - `governance_area_results.area_code`
  - `assessment_responses.is_completed`
- Consider materialized views or cached aggregation tables for expensive queries (e.g., `analytics_summary` table updated via triggers or scheduled jobs)

### 7.3 Caching Strategy

- Use Redis for caching aggregated analytics data:
  - Cache key pattern: `analytics:{cycle_id}:{filter_hash}`
  - TTL: 15 minutes
  - Cache invalidation: On-demand when a new assessment is validated
- Cache Gemini API responses to avoid re-generating identical recommendations

### 7.4 Integration Points

**Intelligence Service:**
- Retrieve `final_compliance_status`, `area_results`, and `ai_recommendations` from completed assessments
- Fetch Gemini-generated insights for the recommendations UI

**Assessment Service:**
- Retrieve initial BLGU submission data (`assessment_responses` with `response_version = 1`)
- Retrieve final validated data (`assessment_responses` with `response_version = LATEST`)
- Compare versions for Gap Analysis

**User Service:**
- Enforce RBAC for all analytics endpoints
- Retrieve user role and assigned governance areas for filtering

**Barangay/LGU Service:**
- Retrieve barangay metadata (name, geographic coordinates) for map visualizations

### 7.5 Security

- All analytics endpoints must require authentication (JWT tokens)
- External API endpoints must use API key authentication with separate rate limiting and permissions
- Implement data anonymization logic for external API (remove barangay names, replace with anonymous IDs)
- Add CORS restrictions for external API endpoints
- Log all external API access for security audits

### 7.6 Performance

- Implement pagination for large data tables (limit 50-100 rows per page)
- Use database query optimization (EXPLAIN ANALYZE) to ensure sub-second response times for dashboard KPIs
- Consider background job processing (Celery) for expensive operations like full municipal PDF report generation
- Lazy-load visualizations on the Reports page to improve initial page load time

## 8. Success Metrics

### 8.1 Adoption Rate
- **Target:** 80% of MLGOO-DILG staff actively using dashboards or reports at least once per week within 2 months of launch
- **Measurement:** Track unique logins and page views via application analytics

### 8.2 Efficiency Gain
- **Target:** Reduce time required to generate municipal performance overview reports by 80% (from estimated 4 hours manual to <30 minutes automated)
- **Measurement:** User surveys pre- and post-implementation; time-tracking comparison

### 8.3 Information Utilization
- **Target:** 60% of AI-generated recommendations are marked as "In Progress" or "Completed" within 6 months
- **Measurement:** Track recommendation status updates in the `recommendation_tracking` table

### 8.4 External API Adoption
- **Target:** Both partner institutions (UMDC Peace Center, Katuparan Center) successfully integrate and retrieve data via the external API within 1 month of launch
- **Measurement:** API access logs showing regular successful requests

### 8.5 Data-Driven Decisions
- **Target:** Document at least 5 specific DILG policy or CapDev decisions informed by analytics insights within the first assessment cycle after launch
- **Measurement:** Qualitative tracking via stakeholder interviews or meeting notes

## 9. Open Questions

**OQ-1:** What is the preferred geographic coordinate system for barangay locations in the map visualization? Do we already have lat/long data for all 25 barangays in Tubod?

**OQ-2:** Should the Gap Analysis identify specific users (e.g., "Assessor X made Y corrections") or remain user-agnostic for privacy/sensitivity reasons?

**OQ-3:** What is the desired format for anonymized barangay identifiers in the external API? (e.g., "BRG-001", hash-based IDs, or simple numeric IDs?)

**OQ-4:** Are there specific DILG branding guidelines (logos, color schemes, headers/footers) that must be included in generated PDF reports?

**OQ-5:** What is the acceptable data latency for the external API? Can it serve cached/stale data (e.g., updated daily), or must it always reflect the latest validated results?

**OQ-6:** Should the system support multiple API keys per institution (e.g., one for UMDC Peace Center's research team, another for their admin) or one key per institution?

**OQ-7:** For the trend analysis, should the system automatically detect and display assessment cycles, or should MLGOO-DILG manually configure cycle periods and names?

**OQ-8:** Should BLGUs have the ability to export their own data (e.g., download their historical assessment results as CSV/PDF), or should this be restricted to MLGOO-DILG only?

**OQ-9:** What is the expected refresh frequency for the materialized views or cached analytics data? Should this be configurable by the MLGOO-DILG?

**OQ-10:** Are there any data retention policies for analytics logs (e.g., API access logs, recommendation tracking history) that should be implemented?
