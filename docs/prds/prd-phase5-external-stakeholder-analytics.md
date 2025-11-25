# Product Requirements Document: External Stakeholder Analytics & Reporting (Katuparan Center & UMDC Peace Center)

## Document Version History

| Version | Date         | Author                            | Changes                                                                                                                                                                                                                                                                                           |
| :------ | :----------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | Initial      | Technical Documentation Specialist | Original PRD for High-Level Analytics & Reporting (broad scope).                                                                                                                                                                                                                                    |
| 2.0     | November 2025 | Senior AI Dev                     | Focusing specifically on external stakeholders, incorporating new terminology, refined role access, and detailed data visibility requirements from November 4, 2025 DILG consultation.                                                                                                            |

---

## 1. Introduction & Overview

This document outlines the product requirements for the **External Stakeholder Analytics & Reporting** component of **Phase 5: High-Level Analytics & Reporting** for the **SGLGB Analytics System: Strategic Insights Nurturing Assessments and Governance (SINAG) To Assess And Assist Barangays utilizing a Large Language Model and Classification Algorithm**. This feature will provide secure, read-only access to aggregated and anonymized SGLGB assessment data for external research and capacity development initiatives.

The primary beneficiaries of this module are the **Katuparan Center** and the **UMDC Peace Center**, both distinct entities requiring specific, controlled access to strategic insights derived from the SGLGB assessment process. This ensures that the valuable data collected by SINAG can further contribute to academic research, governance trend analysis, and the development of impactful community extension programs (CapDev), reinforcing the system's mission to **Assess And Assist Barangays**.

## 2. Goals

*   **Secure Data Dissemination:** To provide external research and development partners with access to relevant, aggregated SGLGB data without compromising individual barangay performance confidentiality.
*   **Support Academic Research:** To facilitate trend analysis, program evaluation, and academic studies by offering anonymized, high-level data.
*   **Inform Capacity Development:** To empower centers with insights necessary for designing and proposing effective CapDev initiatives for barangays.
*   **Maintain Data Integrity & Privacy:** To ensure that all shared data is aggregated, anonymized, and strictly read-only, upholding data privacy and security standards.

## 3. User Stories

### Katuparan Center Users

*   **US-1:** As an authorized user from the Katuparan Center, I want to log in and see a dedicated dashboard with aggregated SGLGB assessment data for all barangays in Sulop.
*   **US-2:** As an authorized user from the Katuparan Center, I want to view municipal-wide SGLGB Compliance Status statistics (Pass/Fail percentages).
*   **US-3:** As an authorized user from the Katuparan Center, I want to see aggregated pass/fail rates for each Governance Area (Core and Essential).
*   **US-4:** As an authorized user from the Katuparan Center, I want to identify the top 5 most frequently `FAIL`ed indicators across all barangays.
*   **US-5:** As an authorized user from the Katuparan Center, I want to access anonymized summaries of AI-generated recommendations and capacity development needs (from the Large Language Model) for common areas of deficiency, without linking to specific barangays.
*   **US-6:** As an authorized user from the Katuparan Center, I want to download aggregated data reports (e.g., overall pass rates per area) in CSV/PDF formats for my research.

### UMDC Peace Center Users

*   **US-7:** As an authorized user from the UMDC Peace Center, I want to log in and see a dedicated dashboard, similar to the Katuparan Center, with aggregated SGLGB assessment data for all barangays in Sulop.
*   **US-8:** As an authorized user from the UMDC Peace Center, I want to view municipal-wide SGLGB Compliance Status statistics.
*   **US-9:** As an authorized user from the UMDC Peace Center, I want to see aggregated pass/fail rates for each Governance Area.
*   **US-10:** As an authorized user from the UMDC Peace Center, I want to identify the top 5 most frequently `FAIL`ed indicators across all barangays.
*   **US-11:** As an authorized user from the UMDC Peace Center, I want to access anonymized summaries of AI-generated recommendations and capacity development needs (from the Large Language Model) for common areas of deficiency, specifically focused on peace and order, social protection, and disaster preparedness-related governance areas, without linking to specific barangays.
*   **US-12:** As an authorized user from the UMDC Peace Center, I want to download aggregated data reports in CSV/PDF formats for developing community extension programs (CapDev).

### System Requirements

*   **US-13:** As the system, I want to ensure that all data presented to external users is strictly aggregated and anonymized, preventing identification of individual barangay performance.
*   **US-14:** As the system, I want to provide secure, read-only access, preventing any data modification.
*   **US-15:** As the system, I want to offer distinct, personalized dashboards if their data needs differ.

## 4. Functional Requirements

### 4.1. Authentication & Access Control

**FR-1:** Users with specific roles (e.g., `KATUPARAN_CENTER_USER`, `UMDC_PEACE_CENTER_USER`) must be able to log in securely.

**FR-2:** Access to this module must be strictly confined to these predefined external user roles.

**FR-3:** All data displayed and downloadable must be strictly read-only.

### 4.2. Aggregated Analytics Dashboard

**FR-4:** A dedicated dashboard page (e.g., `/external-analytics`) must display aggregated SGLGB performance metrics for all 25 barangays of Sulop.

**FR-5:** **Overall Compliance Status:** Display the municipal-wide SGLGB `Compliance Status` breakdown (e.g., "X% Passed," "Y% Failed") prominently.

**FR-6:** **Governance Area Performance:** For each of the six governance areas (3 Core, 3 Essential), display:
*   The overall pass/fail percentage.
*   A breakdown of indicators within that area, showing the percentage of barangays that passed each.

**FR-7:** **Top 5 Failing Indicators:** Display a list of the top 5 indicators with the highest `FAIL` rates across all barangays, regardless of governance area. This will highlight systemic weaknesses.

**FR-8:** **Anonymized AI Insights:** Display aggregated summaries of AI-generated recommendations and capacity development needs (from the Large Language Model).
*   These summaries must be generic and not linked to any specific barangay.
*   For the UMDC Peace Center, this section must prioritize recommendations related to Security, Social Protection, and Disaster Preparedness governance areas.

### 4.3. Reporting & Export

**FR-9:** A dedicated section on the dashboard must allow users to generate and download reports.

**FR-10:** **Report Content:** Reports must contain the aggregated data displayed on the dashboard (overall compliance, area performance, top failing indicators).

**FR-11:** **Formats:** Reports should be downloadable in common formats (e.g., PDF, CSV).

**FR-12:** **Data Aggregation Rules:** All exported data must adhere to the same aggregation and anonymization rules as the displayed dashboard data.

## 5. Non-Goals (Out of Scope for this Epic)

*   Drill-down to individual barangay data or performance.
*   Any editing or modification capabilities within this module.
*   Real-time notifications.
*   User-defined custom reports or complex query builders.
*   Direct interaction with the Large Language Model (e.g., custom prompt generation).
*   Integration with external academic research platforms.

## 6. Design & UX Considerations

*   **Clean & Uncluttered:** The dashboards should prioritize clarity, using data visualizations (charts, graphs) where appropriate, but focusing on high-level numbers first.
*   **Data Anonymity Visual Language:** Use design elements (e.g., "Aggregated Data," "Anonymized Insights") to reinforce that individual barangay data is not being shown.
*   **Role-Specific Dashboards:** While data is largely similar, a small section on the UMDC Peace Center dashboard should subtly highlight or filter content relevant to their focus areas.
*   **Accessibility:** All dashboards and reports must be designed for accessibility, ensuring readability and navigability.
*   **Branding:** Incorporate SINAG branding consistently.

## 7. Technical Considerations

### 7.1. Backend API Endpoints

The following endpoints must be implemented:

*   `GET /api/v1/external/analytics/overall` - For overall municipal compliance stats.
*   `GET /api/v1/external/analytics/governance-areas` - For per-governance area performance.
*   `GET /api/v1/external/analytics/top-failing-indicators` - For top 5 failing indicators.
*   `GET /api/v1/external/analytics/ai-insights/summary` - For aggregated AI recommendations.
*   `GET /api/v1/external/analytics/reports/export` - For downloadable reports.

### 7.2. Data Aggregation Logic

The backend service must implement robust data aggregation and anonymization logic, ensuring that no individual barangay's data can be identified. This will involve SQL `GROUP BY` clauses and aggregation functions (e.g., `COUNT`, `AVG`).

### 7.3. Permissions

FastAPI dependencies must enforce strict role-based access control (`KATUPARAN_CENTER_USER`, `UMDC_PEACE_CENTER_USER`) for all external API endpoints.

### 7.4. Reporting Library

Use a backend library (e.g., `reportlab` for PDF, `csv` module for CSV) to generate reports.

### 7.5. Caching

Consider caching aggregated results, as they won't change as frequently as individual assessments, to improve performance.

### 7.6. Database Considerations

**External User Roles:**

Add new user roles to the system:
*   `KATUPARAN_CENTER_USER` - Read-only access to aggregated analytics
*   `UMDC_PEACE_CENTER_USER` - Read-only access to aggregated analytics with peace and order focus

**No New Tables Required:**

This feature primarily reads from existing tables:
*   `assessments` - Final compliance status
*   `governance_area_results` - Area-level performance
*   `assessment_responses` - Indicator-level validation status
*   `indicators` - Indicator metadata

## 8. Success Metrics

*   External users can successfully log in and view their respective dashboards.
*   All displayed data is correctly aggregated and anonymized.
*   Users can successfully download reports in specified formats.
*   Zero instances of unauthorized access or exposure of individual barangay data to external users.
*   External stakeholders report that the data provided is valuable for their research and CapDev planning (measured via feedback).

## 9. Open Questions

**OQ-1:** Should the UMDC Peace Center dashboard have a completely different visual layout, or just filtered/highlighted content within the same dashboard template?

**OQ-2:** What is the minimum aggregation threshold to maintain anonymity? (e.g., "Only show data if at least 5 barangays contributed to the statistic")

**OQ-3:** Should external users have access to historical data (multiple assessment cycles), or only the most recent validated cycle?

**OQ-4:** What is the approval process for granting access to new external partner institutions in the future?

**OQ-5:** Should there be an audit trail showing which external users accessed which data and when?

**OQ-6:** Are there specific DILG branding guidelines that must be included in the external dashboard and exported reports?

## 10. Related Documents

*   **[PRD Phase 5: Analytics & Reporting](/docs/prds/prd-phase5-analytics-reporting.md)** - Main analytics PRD covering MLGOO-DILG dashboards, reports page, and gap analysis
*   **[PRD Phase 4: Intelligence Layer](/docs/prds/prd-phase4-core-intelligence-layer.md)** - AI-generated recommendations and classification algorithm
*   **[Indicator Builder Specification v1.4](/docs/indicator-builder-specification.md)** - Complete validation status types and compliance criteria
