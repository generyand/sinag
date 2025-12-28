# Product Requirements Document: Administrative Features (MLGOO-DILG)

## 1. Introduction/Overview

The SINAG system currently requires developer intervention for critical system management tasks such
as updating SGLGB indicators, managing assessment cycles, and reviewing Barangay-Based Institution
(BBI) functionality audits. Phase 6 addresses this limitation by providing the MLGOO-DILG with a
comprehensive administrative interface to independently manage the system's core operational
parameters.

This feature set empowers the MLGOO-DILG to:

- Maintain SGLGB indicators in alignment with evolving national standards
- Manage the complete BBI functionality audit workflow
- Configure assessment cycles, deadlines, and system-wide settings

**Problem Statement:** The MLGOO-DILG currently cannot adapt the system to changes in DILG national
policy, manage assessment timelines, or process BBI submissions without developer support, creating
operational bottlenecks and reducing the system's responsiveness to policy updates.

**Goal:** Enable the MLGOO-DILG to independently administer all aspects of the SGLGB assessment
program within SINAG, eliminating developer dependencies for routine administrative tasks.

## 2. Goals

1. **Enable Independent Indicator Management:** Allow MLGOO-DILG users to add, edit, and deactivate
   SGLGB indicators without developer intervention, ensuring the system remains aligned with current
   DILG national standards.

2. **Implement Complete BBI Audit Workflow:** Provide a structured system for BLGUs to submit BBI
   functionality data and for the MLGOO-DILG to review and approve/reject submissions as part of the
   integrated SGLGB assessment.

3. **Provide Assessment Cycle Control:** Enable the MLGOO-DILG to create and manage assessment
   cycles with granular phase-specific deadlines (submission, validation, table assessment) and hard
   deadline enforcement.

4. **Reduce Administrative Workload:** Reduce manual administrative workload by 50% through
   self-service system configuration and automated deadline enforcement.

5. **Ensure Accountability:** Implement a detailed audit trail for all administrative actions,
   capturing before/after values for compliance and debugging purposes.

## 3. User Stories

### Indicator Management

**US-6.1:** As an MLGOO-DILG user, I want to add a new SGLGB indicator when DILG releases updated
technical notes, so that future assessments reflect the current national standards without waiting
for developer support.

**US-6.2:** As an MLGOO-DILG user, I want to edit an existing indicator's text or technical notes
when clarifications are issued, so that assessors and BLGUs have accurate guidance for upcoming
assessments.

**US-6.3:** As an MLGOO-DILG user, I want to deactivate an indicator that is no longer required by
national policy, so that it no longer appears in new assessments while preserving historical data
integrity.

**US-6.4:** As an MLGOO-DILG user, I want to view a clear indicator that shows whether an indicator
is active or inactive, so that I can quickly audit the current indicator set.

**US-6.5:** As a system administrator, I need assurance that changes to indicators do not affect
completed or ongoing assessments, so that historical compliance data remains accurate and auditable.

### BBI Module

**US-6.6:** As a BLGU user, I want to submit structured functionality data for each BBI (e.g.,
BDRRMC, BCPC) including the number of sub-indicators met, so that my barangay's BBI compliance is
properly documented as part of the SGLGB assessment.

**US-6.7:** As a BLGU user, I want to upload supporting MOVs (Means of Verification) for each BBI
functionality claim, so that the MLGOO-DILG has the evidence needed to validate my submission.

**US-6.8:** As an MLGOO-DILG user, I want to view all BBI submissions from a barangay in a
centralized interface, so that I can efficiently review their compliance with BBI functionality
requirements.

**US-6.9:** As an MLGOO-DILG user, I want to approve or reject each BBI submission with comments, so
that BLGUs receive clear feedback on their BBI compliance status.

**US-6.10:** As an MLGOO-DILG user, I want to download all MOVs associated with a BBI submission, so
that I can perform a thorough offline review if needed.

**US-6.11:** As a system stakeholder, I need BBI functionality ratings to be automatically
integrated into the overall SGLGB compliance calculation, so that the final pass/fail result
reflects all required components.

### Assessment Cycle & System Settings

**US-6.12:** As an MLGOO-DILG user, I want to create a new assessment cycle with a name (e.g.,
"SGLGB 2025") and specific start/end dates, so that the system can accommodate annual assessment
programs.

**US-6.13:** As an MLGOO-DILG user, I want to set distinct deadlines for each phase of the
assessment (BLGU submission, assessor validation, table assessment), so that I can manage the
workflow timeline with precision.

**US-6.14:** As an MLGOO-DILG user, I want the system to enforce hard deadlines by preventing
submissions after the deadline has passed, so that the program maintains fairness and
accountability.

**US-6.15:** As an MLGOO-DILG user, I want to configure system-wide settings such as user session
timeouts, file upload size limits, and system announcements, so that I can maintain system security
and communicate with users effectively.

**US-6.16:** As an MLGOO-DILG user, I want to post system-wide announcements that appear on all user
dashboards, so that I can communicate important information (e.g., upcoming deadlines, policy
changes, maintenance schedules) to all stakeholders.

### Audit & Accountability

**US-6.17:** As an MLGOO-DILG user, I want to view a detailed audit log of all administrative
changes showing who made the change, when, and what the before/after values were, so that I can
track system modifications for compliance and debugging purposes.

**US-6.18:** As a system administrator, I need to search and filter the audit trail by date, user,
or action type, so that I can quickly investigate specific changes or issues.

## 4. Functional Requirements

### 4.1 Indicator Management

**FR-6.1:** The system MUST provide a dedicated "Indicator Management" interface accessible only to
users with the MLGOO-DILG role.

**FR-6.2:** The system MUST allow MLGOO-DILG users to create a new indicator with the following
required fields:

- Indicator text/name
- Associated governance area (dropdown selection)
- Technical notes/guidance (rich text field supporting markdown)
- Active status (default: active)

**FR-6.3:** The system MUST allow MLGOO-DILG users to edit all fields of an existing indicator
(text, governance area, technical notes, active status).

**FR-6.4:** The system MUST visually distinguish active indicators from inactive indicators in the
indicator list (e.g., with a badge, icon, or grayed-out appearance).

**FR-6.5:** The system MUST display a confirmation dialog when deactivating an indicator, warning
the user that this will prevent the indicator from appearing in new assessments.

**FR-6.6:** The system MUST ensure that changes to indicators (edits or deactivations) only affect
assessments created after the change timestamp. Existing assessments (including those in Draft or In
Progress status) MUST retain the indicator definitions that were active at the time of assessment
creation.

**FR-6.7:** The system MUST prevent deletion of indicators that have been used in any assessment
(active or historical). Indicators can only be deactivated, not deleted.

**FR-6.8:** The system MUST display the indicator list with sortable and filterable columns
(governance area, active status, last modified date).

### 4.2 BBI Module

**FR-6.9:** The system MUST provide a BBI submission interface for BLGU users, accessible from their
dashboard or assessment workflow.

**FR-6.10:** The system MUST support structured data entry for each BBI type as defined in the 2024
DILG Technical Notes, including but not limited to:

- Barangay Disaster Risk Reduction and Management Committee (BDRRMC)
- Barangay Council for the Protection of Children (BCPC)
- Barangay Peace and Order Committee (BPOC)
- Lupong Tagapamayapa (Lupon)
- Barangay Health Workers (BHWs)
- Barangay Nutrition Committee (BNC)
- Barangay Anti-Drug Abuse Council (BADAC)

**FR-6.11:** For each BBI, the system MUST allow BLGUs to:

- Select the number of sub-indicators met from the defined set for that BBI type
- Upload supporting MOVs (multiple files)
- Add optional notes or descriptions

**FR-6.12:** The system MUST automatically calculate the BBI functionality rating (e.g., "Highly
Functional," "Functional," "Moderately Functional," "Slightly Functional," "Non-Functional") based
on the cumulative total of sub-indicators met, as per DILG policy.

**FR-6.13:** The system MUST associate each BBI submission with the BLGU's active assessment for the
current cycle.

**FR-6.14:** The system MUST provide an MLGOO-DILG interface to view all BBI submissions, filterable
by barangay, BBI type, submission status, and assessment cycle.

**FR-6.15:** The system MUST allow MLGOO-DILG users to view the detailed structured data and
download all MOVs for each BBI submission.

**FR-6.16:** The system MUST allow MLGOO-DILG users to approve or reject each BBI submission with
the following workflow:

- View submission details and MOVs
- Select "Approve" or "Reject"
- If rejecting, provide mandatory comments explaining the reason
- Submit the decision

**FR-6.17:** The system MUST notify BLGUs when their BBI submission has been approved or rejected
(notification mechanism to be determined in Phase 7, but the status change must be recorded).

**FR-6.18:** The system MUST integrate approved BBI functionality ratings into the overall SGLGB
compliance calculation as part of the classification algorithm (Phase 4 integration point).

**FR-6.19:** The system MUST prevent BLGUs from editing a BBI submission after it has been approved
by the MLGOO-DILG.

### 4.3 Assessment Cycle Management

**FR-6.20:** The system MUST provide an "Assessment Cycle Management" interface accessible only to
MLGOO-DILG users.

**FR-6.21:** The system MUST allow MLGOO-DILG users to create a new assessment cycle with the
following fields:

- Cycle name (e.g., "SGLGB 2025")
- Overall start date
- Overall end date
- Phase-specific deadlines:
  - BLGU submission deadline
  - Assessor validation deadline
  - Table assessment deadline

**FR-6.22:** The system MUST validate that phase deadlines are chronologically logical (submission <
validation < table assessment < overall end date).

**FR-6.23:** The system MUST allow only one assessment cycle to be marked as "active" at any given
time.

**FR-6.24:** The system MUST allow MLGOO-DILG users to edit the dates and deadlines of a future or
active cycle.

**FR-6.25:** The system MUST prevent MLGOO-DILG users from deleting an assessment cycle that has
associated assessments. Cycles can only be archived or marked inactive.

**FR-6.26:** The system MUST enforce hard deadlines by preventing the following actions after the
respective deadline has passed:

- BLGU cannot submit or resubmit an assessment after the BLGU submission deadline
- Assessor cannot validate or send rework requests after the Assessor validation deadline
- Assessor cannot perform table validation after the Table assessment deadline

**FR-6.27:** The system MUST display clear error messages to users when they attempt to perform an
action that is blocked due to a deadline.

**FR-6.28:** The system MUST allow MLGOO-DILG users to extend a deadline by editing the cycle
settings (providing flexibility for exceptional circumstances).

### 4.4 System-Wide Settings

**FR-6.29:** The system MUST provide a "System Settings" interface accessible only to MLGOO-DILG
users.

**FR-6.30:** The system MUST allow MLGOO-DILG users to configure the following settings:

- User session timeout duration (in minutes)
- Maximum file upload size (in MB)
- Allowed file types for MOV uploads (multi-select list)

**FR-6.31:** The system MUST allow MLGOO-DILG users to create, edit, and delete system-wide
announcements with the following fields:

- Announcement title
- Announcement content (rich text supporting markdown)
- Display start date/time
- Display end date/time
- Severity level (Info, Warning, Critical) - affects visual styling

**FR-6.32:** The system MUST display active announcements prominently on all user dashboards based
on the current date/time falling within the display start/end window.

**FR-6.33:** The system MUST apply the configured session timeout setting to all user sessions,
automatically logging out inactive users.

**FR-6.34:** The system MUST enforce the configured maximum file upload size across all file upload
interfaces in the application.

### 4.5 User Interface & Navigation

**FR-6.35:** The system MUST create a separate "System Administration" section in the main
navigation, accessible only to MLGOO-DILG users.

**FR-6.36:** The "System Administration" section MUST contain the following sub-pages:

- Indicator Management
- BBI Review
- Assessment Cycles
- System Settings
- Audit Log

**FR-6.37:** All administrative interfaces MUST follow the existing SINAG design system (Tailwind
CSS, shadcn/ui components).

**FR-6.38:** All administrative forms MUST include client-side validation with clear error messages
for required fields and format validation.

**FR-6.39:** All administrative actions (create, edit, delete, approve, reject) MUST display a
confirmation dialog before committing the change.

### 4.6 Audit Trail

**FR-6.40:** The system MUST log all administrative actions to an audit trail table with the
following information:

- User ID and username of the person who made the change
- Timestamp of the change (ISO 8601 format with timezone)
- Action type (e.g., "indicator_created," "indicator_edited," "bbi_approved," "cycle_created")
- Target entity type and ID (e.g., "indicator:123," "bbi_submission:456")
- Before values (JSON object of all fields before the change)
- After values (JSON object of all fields after the change)

**FR-6.41:** The system MUST provide an "Audit Log" interface accessible to MLGOO-DILG users.

**FR-6.42:** The Audit Log interface MUST allow filtering by:

- Date range
- User
- Action type
- Entity type

**FR-6.43:** The Audit Log interface MUST display results in a paginated table with sortable
columns.

**FR-6.44:** The Audit Log interface MUST allow MLGOO-DILG users to view the detailed before/after
values for any audit entry by clicking on the row or an "expand" button.

**FR-6.45:** The system MUST retain audit log entries indefinitely (no automatic deletion).

## 5. Non-Goals (Out of Scope)

**NG-6.1:** **Historical Indicator Versioning:** This phase will NOT implement a full versioning
system for indicators with effective dates and the ability to view/restore previous versions.
Indicator changes apply to future assessments only. Full versioning may be considered in a future
phase (e.g., Phase 6.1).

**NG-6.2:** **Email Notification Templates:** This phase will NOT include a UI for MLGOO-DILG to
customize email notification templates. Email notification system design is part of Phase 7. This
phase will only record status changes that will trigger notifications in Phase 7.

**NG-6.3:** **API Rate Limits Configuration:** This phase will NOT expose API rate limiting as a
user-configurable setting. This remains a developer/infrastructure-level configuration.

**NG-6.4:** **Data Retention Policies UI:** This phase will NOT provide a UI for configuring
automated data retention/deletion policies. Data retention will be managed at the infrastructure
level.

**NG-6.5:** **Advanced BBI Analytics:** This phase will NOT include analytics dashboards or reports
specific to BBI performance trends. BBI data will feed into the overall SGLGB analytics in Phase 5,
but dedicated BBI-specific analytics are out of scope.

**NG-6.6:** **Granular Role-Based Permissions within MLGOO-DILG:** This phase assumes all MLGOO-DILG
users have the same administrative privileges. Creating sub-roles within MLGOO-DILG (e.g.,
"Indicator Manager," "BBI Reviewer") is out of scope.

**NG-6.7:** **Bulk Import/Export for Indicators:** This phase will NOT include functionality to bulk
import or export indicators via CSV/Excel. Indicators are managed individually through the UI.

**NG-6.8:** **Workflow Approvals for Indicator Changes:** This phase will NOT implement a multi-step
approval process for indicator changes (e.g., one MLGOO-DILG user proposes a change, another
approves it). Changes made by any MLGOO-DILG user take effect immediately (subject to FR-6.6).

## 6. Design Considerations

### 6.1 Information Architecture

- **Separate Admin Section:** Create a distinct top-level navigation item labeled "System
  Administration" or "Admin" in the sidebar, visible only to MLGOO-DILG users. This section should
  have a different visual treatment (e.g., icon, color) to clearly distinguish it from operational
  dashboards.

### 6.2 Indicator Management UI

- **List View:** Display indicators in a data table with columns: Indicator Name, Governance Area,
  Status (Active/Inactive badge), Last Modified Date, Actions (Edit, View Details).
- **Create/Edit Form:** Use a modal or dedicated page with clearly labeled fields. The technical
  notes field should support a rich text editor (e.g., TipTap, Lexical) with markdown rendering.
- **Status Toggle:** Provide a clear toggle switch or checkbox for Active/Inactive status with
  immediate visual feedback.

### 6.3 BBI Module UI

**BLGU Side:**

- **BBI Submission Form:** For each BBI type, display a form with:
  - BBI type name and description (pulled from metadata)
  - Checkbox list or counter for sub-indicators (e.g., "Select all that apply: Sub-indicator 1,
    Sub-indicator 2...")
  - Automatic calculation and display of the resulting functionality rating
  - Multi-file uploader for MOVs with progress indicators
  - Submit button

**MLGOO-DILG Side:**

- **BBI Review Dashboard:** Display a filterable table of BBI submissions showing: Barangay Name,
  BBI Type, Functionality Rating, Submission Date, Status (Pending Review, Approved, Rejected).
- **BBI Detail View:** Modal or dedicated page showing:
  - All submitted structured data
  - List of uploaded MOVs with download links
  - Current status
  - Approve/Reject buttons
  - Comment textarea (required if rejecting)

### 6.4 Assessment Cycle Management UI

- **Cycle List View:** Display all cycles in a table: Cycle Name, Start Date, End Date, Status
  (Active, Upcoming, Completed), Actions (Edit, View).
- **Create/Edit Cycle Form:** Use a form with:
  - Text input for cycle name
  - Date pickers for overall start/end dates
  - Grouped date pickers for phase-specific deadlines (clearly labeled)
  - Validation that prevents illogical date sequences
  - Prominent "Active Cycle" toggle or radio button (only one can be active)

### 6.5 System Settings UI

- **Tabbed Interface or Accordion:** Organize settings into logical groups:
  - Security Settings (session timeout)
  - Upload Settings (file size limits, allowed types)
  - Announcements
- **Announcement Manager:** Provide a CRUD interface for announcements with a live preview of how
  the announcement will appear on dashboards.

### 6.6 Audit Log UI

- **Filter Panel:** Sticky filter panel at the top with dropdowns/date pickers for user, action
  type, entity type, and date range.
- **Results Table:** Paginated table showing: Timestamp, User, Action, Entity, Summary (brief
  description).
- **Expandable Rows:** Clicking a row expands it to show a formatted diff view of before/after
  values, ideally with visual highlighting of what changed.

### 6.7 Responsive Design

- All administrative interfaces MUST be responsive and usable on tablet devices (minimum width:
  768px). Full mobile optimization for admin features is not required in this phase but should be
  considered for Phase 7.

## 7. Technical Considerations

### 7.1 Backend Architecture

**Models:**

- Extend or create the following SQLAlchemy models in `apps/api/app/db/models/`:
  - `indicators` table: Add `is_active` (Boolean), `technical_notes` (Text), `last_modified_at`
    (DateTime), `last_modified_by` (FK to users)
  - `bbi_submissions` table: Create new model with fields for barangay_id, assessment_id, bbi_type,
    sub_indicators_met (JSONB), functionality_rating, status (pending/approved/rejected),
    review_comments, reviewed_by (FK to users), reviewed_at, MOVs (relationship to a new `bbi_movs`
    table)
  - `bbi_movs` table: id, bbi_submission_id (FK), file_name, file_path, uploaded_at
  - `assessment_cycles` table: Create new model with name, start_date, end_date,
    submission_deadline, validation_deadline, table_assessment_deadline, is_active
  - `system_settings` table: Key-value store or dedicated columns for settings (session_timeout,
    max_upload_size, etc.)
  - `announcements` table: id, title, content, severity, display_start, display_end, created_by,
    created_at
  - `audit_log` table: id, user_id, timestamp, action_type, entity_type, entity_id, before_values
    (JSONB), after_values (JSONB)

**Schemas:**

- Create Pydantic schemas in `apps/api/app/schemas/`:
  - `indicator.py`: IndicatorBase, IndicatorCreate, IndicatorUpdate, IndicatorResponse
  - `bbi.py`: BBISubmissionCreate, BBISubmissionUpdate, BBISubmissionResponse, BBIReviewRequest
  - `assessment_cycle.py`: CycleCreate, CycleUpdate, CycleResponse
  - `system_settings.py`: SystemSettingsUpdate, SystemSettingsResponse, AnnouncementCreate, etc.
  - `audit_log.py`: AuditLogResponse, AuditLogFilter

**Services:**

- Create service classes in `apps/api/app/services/`:
  - `indicator_service.py`: CRUD operations for indicators with audit logging
  - `bbi_service.py`: Handle BBI submissions, reviews, functionality rating calculation
  - `assessment_cycle_service.py`: CRUD for cycles, deadline validation logic
  - `system_settings_service.py`: Get/update settings, manage announcements
  - `audit_service.py`: Log and query audit trail

**Routers:**

- Create API endpoints in `apps/api/app/api/v1/`:
  - `admin/indicators.py`: GET /admin/indicators, POST /admin/indicators, PUT
    /admin/indicators/{id}, DELETE /admin/indicators/{id} (soft delete/deactivate)
  - `admin/bbi.py`: GET /admin/bbi-submissions, PUT /admin/bbi-submissions/{id}/review
  - `bbi.py`: POST /bbi-submissions, GET /bbi-submissions/{id} (for BLGUs)
  - `admin/cycles.py`: CRUD endpoints for assessment cycles
  - `admin/settings.py`: GET/PUT for system settings, CRUD for announcements
  - `admin/audit.py`: GET /admin/audit-log with query filters

**Tags:**

- Use the following FastAPI tags for organization:
  - `admin-indicators`
  - `admin-bbi`
  - `admin-cycles`
  - `admin-settings`
  - `admin-audit`
  - `bbi` (for BLGU-facing BBI endpoints)

### 7.2 Frontend Architecture

**Pages:**

- Create new pages in `apps/web/src/app/(app)/admin/`:
  - `indicators/page.tsx`: Indicator management
  - `bbi/page.tsx`: BBI review dashboard
  - `cycles/page.tsx`: Assessment cycle management
  - `settings/page.tsx`: System settings
  - `audit/page.tsx`: Audit log viewer

**Components:**

- Create admin-specific components in `apps/web/src/components/features/admin/`:
  - `IndicatorForm.tsx`, `IndicatorList.tsx`
  - `BBIReviewCard.tsx`, `BBISubmissionForm.tsx`
  - `CycleForm.tsx`, `CycleList.tsx`
  - `SystemSettingsForm.tsx`, `AnnouncementManager.tsx`
  - `AuditLogTable.tsx`, `AuditLogDetailView.tsx`

**Generated Types:**

- After implementing backend endpoints, run `pnpm generate-types` to create TypeScript types and
  React Query hooks in `packages/shared/src/generated/`.
- Frontend components will import from:
  - `@sinag/shared` for generated hooks (e.g., `useGetAdminIndicators`, `useUpdateIndicator`)

**Authorization:**

- Update `apps/web/src/middleware.ts` or create a layout-level auth check to ensure only MLGOO-DILG
  users can access `/admin/*` routes.

### 7.3 Database Migrations

- Create Alembic migrations for all new tables and columns:
  ```bash
  cd apps/api
  alembic revision --autogenerate -m "Add Phase 6 administrative features"
  alembic upgrade head
  ```

### 7.4 Integration Points

**Phase 4 (Classification Algorithm):**

- The `intelligence_service.py` classification algorithm MUST incorporate approved BBI functionality
  ratings into the SGLGB pass/fail calculation as per DILG policy.

**Phase 3 (Assessor Workflow):**

- During Table Validation, assessors may need to view or update BBI submission status. Consider
  integration points.

**Phase 5 (Analytics):**

- BBI data should feed into gap analysis and reporting dashboards. Ensure data models are queryable
  for analytics.

**Phase 7 (Notifications):**

- All status changes (BBI approval/rejection, cycle deadline approaching, indicator changes) should
  emit events or be logged in a way that Phase 7's notification system can consume.

### 7.5 Security Considerations

- **Authorization:** All admin endpoints MUST verify the user has the MLGOO-DILG role using the
  existing `deps.get_current_user` dependency.
- **Audit Logging:** Implement audit logging as a decorator or service method that can be applied to
  all administrative actions. Capture the user context from the JWT.
- **Input Validation:** Use Pydantic schemas to validate all input data. Sanitize rich text inputs
  to prevent XSS.
- **File Upload Security:** Validate file types and sizes server-side. Store files in a secure
  location (e.g., Supabase Storage) with access controls.

### 7.6 Performance Considerations

- **Audit Log Query Optimization:** The audit log table will grow large over time. Ensure indexes
  are created on `timestamp`, `user_id`, `action_type`, and `entity_type` columns for efficient
  filtering.
- **BBI MOV Storage:** Use chunked uploads for large files. Consider implementing a progress bar
  using tus or similar protocol.

## 8. Success Metrics

### 8.1 Adoption & Usage Metrics

- **Indicator Updates:** Track the number of indicator changes (creates, edits, deactivations) made
  by MLGOO-DILG users per month. Success: At least 5 indicator updates made independently within the
  first 3 months.

- **BBI Submission Rate:** Measure the percentage of BLGUs that submit BBI data within an assessment
  cycle. Success: 80%+ of active BLGUs submit BBI data.

- **BBI Review Turnaround Time:** Measure the average time from BBI submission to MLGOO-DILG
  approval/rejection. Success: Average turnaround time under 5 business days.

### 8.2 Operational Efficiency Metrics

- **Developer Support Requests:** Track the number of support tickets or requests to developers for
  administrative tasks (indicator changes, cycle setup, etc.). Success: Reduce developer support
  requests for administrative tasks by 50% compared to pre-Phase 6 baseline.

- **Cycle Setup Time:** Measure the time it takes for MLGOO-DILG to set up a new assessment cycle.
  Success: MLGOO-DILG can configure a new cycle in under 15 minutes.

### 8.3 System Health Metrics

- **Deadline Enforcement:** Track the number of attempted submissions after deadlines that are
  successfully blocked. Success: 100% of post-deadline submissions are blocked with clear error
  messages.

- **Audit Trail Completeness:** Verify that 100% of administrative actions are captured in the audit
  log with complete before/after values.

### 8.4 User Satisfaction Metrics

- **MLGOO-DILG Satisfaction:** Conduct a user satisfaction survey with MLGOO-DILG users after Phase
  6 deployment. Success: 80%+ report satisfaction with administrative capabilities.

- **System Uptime:** Maintain 99.5% uptime for the admin module. Success: No critical outages
  affecting administrative functions.

## 9. Open Questions

**OQ-6.1:** What is the exact structure and sub-indicator set for each BBI type as defined in the
2024 DILG Technical Notes? (Developer will need access to the complete annex tables from pages 47-48
to implement the BBI form metadata.)

**OQ-6.2:** Should BLGUs be able to save a BBI submission as "Draft" and return to complete it
later, or must it be submitted in one session?

**OQ-6.3:** If a BLGU's BBI submission is rejected, can they resubmit, or does it follow the same
"one rework cycle" rule as the main SGLGB assessment?

**OQ-6.4:** Should there be a "soft deadline warning" notification sent to users before hard
deadlines (e.g., 3 days before deadline)? This might be better suited for Phase 7, but we should
plan for it.

**OQ-6.5:** For the audit log, do we need the ability to export audit entries to CSV or PDF for
external reporting?

**OQ-6.6:** Should inactive indicators still be visible in the indicator list (with a clear
"Inactive" badge), or should there be a toggle to show/hide inactive indicators?

**OQ-6.7:** When an MLGOO-DILG user creates a new assessment cycle and marks it as "active," should
the system automatically deactivate the previously active cycle, or should it require manual
deactivation?

**OQ-6.8:** For system-wide announcements, should users be able to "dismiss" an announcement (hide
it from their dashboard even if it's still within the display window), or should it always be shown
if active?

**OQ-6.9:** Should the assessment cycle settings include a "late submission grace period" option
(e.g., allow submissions up to 24 hours after the deadline with a warning), or are hard deadlines
absolute?

**OQ-6.10:** What should happen if an MLGOO-DILG user attempts to deactivate a governance area that
has active indicators? Should the system prevent this, or automatically deactivate all associated
indicators?

---

**Document Version:** 1.0 **Date Created:** 2025-11-04 **Created By:** AI Assistant (based on
stakeholder input) **Status:** Ready for Review
