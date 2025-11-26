# Epic 5.0: Submission & Rework Workflow

**PRD Reference:** FR-5.1, FR-5.2, FR-5.3, FR-5.4 - Submission validation, locked state, one rework cycle, assessor-initiated rework, BLGU resubmission

**Objective:** Implement the complete submission and rework workflow, including completeness validation before submission, locked state after submission, assessor-initiated rework with comments, and BLGU resubmission capabilities. Ensure only one rework cycle is allowed.

## Implementation Progress

**Status as of 2025-11-09:**
- **Backend Stories Complete:** 9 of 9 backend stories (100%)
- **Type Generation Complete:** 1 of 1 story (100%)
- **Frontend Stories Complete:** 6 of 8 frontend stories (75%)
- **Overall Progress:** 16 of 21 stories (76%)
- **Stories 5.1-5.16:** ✅ Complete
- **Stories 5.17-5.21:** Pending (integration, notifications, testing)

**Key Deliverables Completed:**
- 4 new REST API endpoints (submit, request-rework, resubmit, submission-status)
- Database schema updates with rework tracking
- Comprehensive validation service for submission readiness
- Full Pydantic schema documentation
- 43 backend unit tests passing
- TypeScript types and React Query hooks generated for all Epic 5.0 endpoints
- SubmissionValidation component with 8 test cases (Story 5.11)
- SubmitAssessmentButton component with 10 test cases (Story 5.12)
- LockedStateBanner component with 13 test cases (Story 5.13)
- ReworkCommentsPanel component with 15 test cases (Story 5.14)
- RequestReworkForm component with 18 test cases (Story 5.15)
- ResubmitAssessmentButton component with 16 test cases (Story 5.16)

## Stories

### Three-Tier Structure: Epic → Story → Atomic

- [x] **5.1 Story: Assessment Status Enum Enhancement** ✅
  - Update assessment status enum to include: DRAFT, SUBMITTED, IN_REVIEW, REWORK, COMPLETED
  - Create Alembic migration to update status column
  - Update SQLAlchemy Assessment model with new status enum
  - Tech stack involved: SQLAlchemy, Alembic, PostgreSQL enums
  - Dependencies: None (foundational change)
  - **Completed:** 2025-11-09

  - [x] **5.1.1 Atomic: Update AssessmentStatus enum in db/enums.py**
    - **Files:** `apps/api/app/db/enums.py`
    - **Dependencies:** None
    - **Acceptance:** AssessmentStatus enum updated with values: DRAFT, SUBMITTED, IN_REVIEW, REWORK, COMPLETED. Enum extends str and Python's Enum class. Old status values preserved if they exist.
    - **Tech:** Python enum module, string enums
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.1.2 Atomic: Create Alembic migration for status enum update**
    - **Files:** `apps/api/alembic/versions/6v29gw2io7vj_update_assessment_status_enum.py` (NEW)
    - **Dependencies:** Task 5.1.1 must be complete
    - **Acceptance:** Migration file created with `alembic revision --autogenerate -m "update assessment status enum"`. File contains upgrade and downgrade functions.
    - **Tech:** Alembic, PostgreSQL enum alteration
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.1.3 Atomic: Implement upgrade function to add new enum values**
    - **Files:** `apps/api/alembic/versions/6v29gw2io7vj_update_assessment_status_enum.py`
    - **Dependencies:** Task 5.1.2 must be complete
    - **Acceptance:** Upgrade function alters PostgreSQL enum type to add SUBMITTED, IN_REVIEW, REWORK, COMPLETED values. Uses ALTER TYPE ADD VALUE. Handles case where values may already exist.
    - **Tech:** Alembic, PostgreSQL ALTER TYPE, SQL
    - **Time Estimate:** 4 hours
    - **Completed:** 2025-11-09

  - [x] **5.1.4 Atomic: Implement downgrade function for enum rollback**
    - **Files:** `apps/api/alembic/versions/6v29gw2io7vj_update_assessment_status_enum.py`
    - **Dependencies:** Task 5.1.3 must be complete
    - **Acceptance:** Downgrade function documented with warning that enum value removal is not safely reversible. Downgrade sets all non-DRAFT statuses to DRAFT. Documents manual cleanup required.
    - **Tech:** Alembic, SQL UPDATE statements
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.1.5 Atomic: Test migration upgrade and downgrade**
    - **Files:** `apps/api/tests/migrations/test_assessment_status_migration.py` (NEW)
    - **Dependencies:** Tasks 5.1.3-5.1.4 must be complete
    - **Acceptance:** Migration applies successfully. Enum type includes new values. Assessment.status column accepts new values. Rollback sets statuses to DRAFT.
    - **Tech:** Pytest, Alembic, PostgreSQL inspection
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

- [x] **5.2 Story: Rework Tracking Schema** ✅
  - Add `rework_count` integer column to assessments table (default 0, max 1)
  - Add `rework_requested_at` timestamp column
  - Add `rework_requested_by` foreign key to users table
  - Add `rework_comments` text column for assessor feedback
  - Create Alembic migration
  - Tech stack involved: SQLAlchemy, Alembic, PostgreSQL
  - Dependencies: Story 5.1 must be complete
  - **Completed:** 2025-11-09

  - [x] **5.2.1 Atomic: Create Alembic migration for rework tracking columns**
    - **Files:** `apps/api/alembic/versions/ucz4sottgz50_add_rework_tracking_columns.py` (NEW)
    - **Dependencies:** Story 5.1 must be complete
    - **Acceptance:** Migration file created with `alembic revision --autogenerate -m "add rework tracking columns"`. File contains upgrade and downgrade functions.
    - **Tech:** Alembic, SQLAlchemy
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.2.2 Atomic: Add rework_count column with check constraint**
    - **Files:** `apps/api/alembic/versions/ucz4sottgz50_add_rework_tracking_columns.py`
    - **Dependencies:** Task 5.2.1 must be complete
    - **Acceptance:** Upgrade function adds rework_count INTEGER column with default 0, NOT NULL. Add CHECK constraint: rework_count >= 0 AND rework_count <= 1. Constraint named chk_rework_count_limit.
    - **Tech:** Alembic op.add_column(), CheckConstraint, PostgreSQL
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.2.3 Atomic: Add rework_requested_at timestamp column**
    - **Files:** `apps/api/alembic/versions/ucz4sottgz50_add_rework_tracking_columns.py`
    - **Dependencies:** Task 5.2.1 must be complete
    - **Acceptance:** Upgrade function adds rework_requested_at TIMESTAMP column, nullable. Column stores when rework was requested by assessor.
    - **Tech:** Alembic op.add_column(), PostgreSQL TIMESTAMP
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.2.4 Atomic: Add rework_requested_by foreign key column**
    - **Files:** `apps/api/alembic/versions/ucz4sottgz50_add_rework_tracking_columns.py`
    - **Dependencies:** Task 5.2.1 must be complete
    - **Acceptance:** Upgrade function adds rework_requested_by INTEGER column, nullable. Foreign key to users.id. SET NULL on delete. Constraint named fk_assessment_rework_requested_by.
    - **Tech:** Alembic op.add_column(), ForeignKeyConstraint
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.2.5 Atomic: Add rework_comments text column**
    - **Files:** `apps/api/alembic/versions/ucz4sottgz50_add_rework_tracking_columns.py`
    - **Dependencies:** Task 5.2.1 must be complete
    - **Acceptance:** Upgrade function adds rework_comments TEXT column, nullable. Stores assessor's rework feedback to BLGU user.
    - **Tech:** Alembic op.add_column(), PostgreSQL TEXT
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.2.6 Atomic: Add index on rework_requested_by for query performance**
    - **Files:** `apps/api/alembic/versions/ucz4sottgz50_add_rework_tracking_columns.py`
    - **Dependencies:** Task 5.2.4 must be complete
    - **Acceptance:** Upgrade function creates index: idx_assessments_rework_requested_by. Improves query performance for assessor rework tracking.
    - **Tech:** Alembic op.create_index()
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.2.7 Atomic: Implement downgrade function**
    - **Files:** `apps/api/alembic/versions/ucz4sottgz50_add_rework_tracking_columns.py`
    - **Dependencies:** Tasks 5.2.2-5.2.6 must be complete
    - **Acceptance:** Downgrade function drops index, drops foreign key, drops all rework columns. Migration rollback succeeds.
    - **Tech:** Alembic op.drop_column(), op.drop_index()
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.2.8 Atomic: Test migration upgrade and downgrade**
    - **Files:** `apps/api/tests/migrations/test_rework_tracking_migration.py` (NEW)
    - **Dependencies:** Tasks 5.2.2-5.2.7 must be complete
    - **Acceptance:** Migration applies successfully. All columns exist with correct types and constraints. Check constraint enforces rework_count <= 1. Rollback removes all columns.
    - **Tech:** Pytest, Alembic, SQLAlchemy inspection
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

- [x] **5.3 Story: SQLAlchemy Model Updates for Rework** ✅
  - Update Assessment model with rework tracking fields
  - Add relationship to User model for rework_requested_by
  - Add validation: rework_count cannot exceed 1
  - Tech stack involved: SQLAlchemy, Python type hints, model constraints
  - Dependencies: Story 5.2 must be complete
  - **Completed:** 2025-11-09

  - [x] **5.3.1 Atomic: Update Assessment model with rework columns**
    - **Files:** `apps/api/app/db/models/assessment.py`
    - **Dependencies:** Story 5.2 must be complete (migration applied)
    - **Acceptance:** Assessment model includes new columns: rework_count (Integer, default=0), rework_requested_at (DateTime, nullable), rework_requested_by (Integer, nullable, FK), rework_comments (Text, nullable). Type hints use Optional where applicable.
    - **Tech:** SQLAlchemy Column, types, Python type hints
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.3.2 Atomic: Update Assessment model status field with new enum**
    - **Files:** `apps/api/app/db/models/assessment.py`
    - **Dependencies:** Story 5.1 must be complete
    - **Acceptance:** Assessment.status column uses updated AssessmentStatus enum. Type hint: status: AssessmentStatus. Default value: AssessmentStatus.DRAFT.
    - **Tech:** SQLAlchemy Enum, Python type hints
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.3.3 Atomic: Add relationship to User for rework_requested_by**
    - **Files:** `apps/api/app/db/models/assessment.py`, `apps/api/app/db/models/user.py`
    - **Dependencies:** Task 5.3.1 must be complete
    - **Acceptance:** Assessment model has relationship: rework_requester = relationship("User", foreign_keys=[rework_requested_by]). User model optionally has back_populates.
    - **Tech:** SQLAlchemy relationship(), foreign_keys parameter
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.3.4 Atomic: Add model-level validation method for rework_count**
    - **Files:** `apps/api/app/db/models/assessment.py`
    - **Dependencies:** Task 5.3.1 must be complete
    - **Acceptance:** Add @validates('rework_count') method to Assessment model. Method raises ValueError if rework_count > 1. Validation runs before database commit.
    - **Tech:** SQLAlchemy @validates decorator, validation logic
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.3.5 Atomic: Add helper property for can_request_rework**
    - **Files:** `apps/api/app/db/models/assessment.py`
    - **Dependencies:** Tasks 5.3.1, 5.3.2 must be complete
    - **Acceptance:** Add @property can_request_rework() to Assessment model. Returns True if rework_count < 1 and status is SUBMITTED. Helper used in service layer.
    - **Tech:** Python @property, business logic
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.3.6 Atomic: Add helper property for is_locked**
    - **Files:** `apps/api/app/db/models/assessment.py`
    - **Dependencies:** Task 5.3.2 must be complete
    - **Acceptance:** Add @property is_locked() to Assessment model. Returns True if status in [SUBMITTED, IN_REVIEW, COMPLETED]. Used to prevent BLGU edits.
    - **Tech:** Python @property, business logic
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.3.7 Atomic: Test Assessment model with rework fields**
    - **Files:** `apps/api/tests/db/models/test_assessment.py` (NEW)
    - **Dependencies:** Tasks 5.3.1-5.3.6 must be complete
    - **Acceptance:** Unit tests verify rework columns exist and accept correct values. Test rework_count validation (rejects values > 1). Test can_request_rework and is_locked properties. Test relationship to User loads correctly.
    - **Tech:** Pytest, SQLAlchemy fixtures, test database
    - **Time Estimate:** 5 hours
    - **Completed:** 2025-11-09

- [x] **5.4 Story: Submission Validation Service** ✅
  - Create `SubmissionValidationService` in `apps/api/app/services/submission_validation_service.py`
  - Use CompletenessValidationService to check all indicators are complete
  - Check that all required MOVs are uploaded (from Epic 4)
  - Return validation result with list of incomplete items
  - Tech stack involved: Python, service layer pattern, business logic
  - Dependencies: Epic 1 Story 1.5 (CompletenessValidationService), Epic 4 Story 4.6 (MOVFile model)
  - **Completed:** 2025-11-09

  - [x] **5.4.1 Atomic: Create SubmissionValidationService class structure**
    - **Files:** `apps/api/app/services/submission_validation_service.py` (NEW)
    - **Dependencies:** None
    - **Acceptance:** Service class created with __init__ method. Method signatures defined: validate_completeness, validate_movs, validate_submission (main method). Docstrings added.
    - **Tech:** Python classes, Google-style docstrings, type hints
    - **Completed:** 2025-11-09
    - **Time Estimate:** 2 hours

  - [x] **5.4.2 Atomic: Implement validate_completeness method**
    - **Files:** `apps/api/app/services/submission_validation_service.py`
    - **Dependencies:** Task 5.4.1, Epic 1 Story 1.5 must be complete
    - **Acceptance:** Method accepts assessment_id, db session. Uses CompletenessValidationService to check all indicators. Returns list of incomplete indicator names/IDs. Returns empty list if all complete.
    - **Tech:** Python, service composition, SQLAlchemy queries
    - **Completed:** 2025-11-09
    - **Time Estimate:** 4 hours

  - [x] **5.4.3 Atomic: Implement validate_movs method**
    - **Files:** `apps/api/app/services/submission_validation_service.py`
    - **Dependencies:** Task 5.4.1, Epic 4 Story 4.3 must be complete
    - **Acceptance:** Method accepts assessment_id, db session. Queries MOVFile table for indicators that require file uploads. Returns list of indicators missing required MOVs. Assumes all file-type fields require at least one file.
    - **Tech:** Python, SQLAlchemy queries, MOVFile model
    - **Time Estimate:** 5 hours
    - **Completed:** 2025-11-09

  - [x] **5.4.4 Atomic: Create SubmissionValidationResult Pydantic schema**
    - **Files:** `apps/api/app/schemas/assessment.py`
    - **Dependencies:** None (can be done in parallel)
    - **Acceptance:** Pydantic schema created: SubmissionValidationResult with fields: is_valid (bool), incomplete_indicators (List[str]), missing_movs (List[str]), error_message (Optional[str]). Schema used by service.
    - **Tech:** Pydantic, Python type hints
    - **Time Estimate:** 2 hours

    - **Completed:** 2025-11-09
  - [x] **5.4.5 Atomic: Implement main validate_submission method**
    - **Files:** `apps/api/app/services/submission_validation_service.py`
    - **Dependencies:** Tasks 5.4.2, 5.4.3, 5.4.4 must be complete
    - **Acceptance:** Method accepts assessment_id, db session. Calls validate_completeness and validate_movs. Returns SubmissionValidationResult. is_valid = True only if both checks pass. Aggregates all validation errors.
    - **Tech:** Python, validation orchestration, Pydantic
    - **Time Estimate:** 3 hours

  - [x] **5.4.6 Atomic: Export SubmissionValidationService singleton instance**
    - **Completed:** 2025-11-09
    - **Files:** `apps/api/app/services/submission_validation_service.py`
    - **Dependencies:** Task 5.4.5 must be complete
    - **Acceptance:** Singleton instance created: submission_validation_service = SubmissionValidationService(). Instance exported for use in routers.
    - **Tech:** Python singleton pattern
    - **Time Estimate:** 1 hour

  - [x] **5.4.7 Atomic: Test validate_completeness with complete assessment**
    - **Files:** `apps/api/tests/services/test_submission_validation_service.py` (NEW)
    - **Completed:** 2025-11-09
    - **Dependencies:** Task 5.4.2 must be complete
    - **Acceptance:** Unit test creates assessment with all indicators complete. validate_completeness returns empty list. Validation passes.
    - **Tech:** Pytest, test database, test fixtures
    - **Time Estimate:** 3 hours

  - [x] **5.4.8 Atomic: Test validate_completeness with incomplete assessment**
    - **Files:** `apps/api/tests/services/test_submission_validation_service.py`
    - **Dependencies:** Task 5.4.2 must be complete
    - **Acceptance:** Unit test creates assessment with some incomplete indicators. validate_completeness returns list of incomplete indicator names. Validation fails.
    - **Tech:** Pytest, test data creation
    - **Time Estimate:** 3 hours

  - [x] **5.4.9 Atomic: Test validate_movs with all files uploaded**
    - **Files:** `apps/api/tests/services/test_submission_validation_service.py`
    - **Dependencies:** Task 5.4.3 must be complete
    - **Acceptance:** Unit test creates assessment with file-type fields and all MOVs uploaded. validate_movs returns empty list. Validation passes.
    - **Tech:** Pytest, MOVFile fixtures
    - **Time Estimate:** 4 hours

  - [x] **5.4.10 Atomic: Test validate_movs with missing files**
    - **Files:** `apps/api/tests/services/test_submission_validation_service.py`
    - **Dependencies:** Task 5.4.3 must be complete
    - **Acceptance:** Unit test creates assessment with file-type fields but some MOVs missing. validate_movs returns list of indicators missing files. Validation fails.
    - **Tech:** Pytest, incomplete test data
    - **Time Estimate:** 4 hours

  - [x] **5.4.11 Atomic: Test validate_submission integrates both checks**
    - **Files:** `apps/api/tests/services/test_submission_validation_service.py`
    - **Dependencies:** Tasks 5.4.5 must be complete
    - **Acceptance:** Unit test with both incomplete indicators and missing MOVs. validate_submission returns SubmissionValidationResult with is_valid=False. Both incomplete_indicators and missing_movs populated.
    - **Tech:** Pytest, comprehensive validation testing
    - **Time Estimate:** 4 hours

- [x] **5.5 Story: Backend API for Assessment Submission** ✅
  - Create `POST /api/v1/assessments/{assessment_id}/submit` endpoint
  - Use SubmissionValidationService to validate completeness
  - Return validation errors if incomplete
  - If valid, update assessment status to SUBMITTED
  - Lock assessment for editing by BLGU
  - Send notification to assigned assessor (if applicable)
  - Tech stack involved: FastAPI, Pydantic, SQLAlchemy, notification integration
  - Dependencies: Story 5.4 must be complete
  - **Completed:** 2025-11-09

  - [x] **5.5.1 Atomic: Create POST submit endpoint structure**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Story 5.4 must be complete
    - **Acceptance:** Endpoint defined: @router.post("/{assessment_id}/submit", tags=["assessments"]). Accepts path param: assessment_id. Dependencies: get_db, get_current_user. Returns 200 status code on success.
    - **Tech:** FastAPI, dependency injection, path parameters
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.5.2 Atomic: Add authorization check for BLGU_USER role**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.5.1 must be complete
    - **Acceptance:** Endpoint checks current_user.role is BLGU_USER. Checks user owns the assessment (assessment.barangay_id matches user.barangay_id). Returns 403 Forbidden if unauthorized.
    - **Tech:** FastAPI, role-based access control, authorization
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.5.3 Atomic: Integrate SubmissionValidationService in endpoint**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.5.1, Story 5.4 must be complete
    - **Acceptance:** Endpoint calls submission_validation_service.validate_submission(assessment_id, db). If validation fails, returns 400 Bad Request with SubmissionValidationResult showing errors.
    - **Tech:** FastAPI, service integration, error responses
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.5.4 Atomic: Update assessment status to SUBMITTED**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.5.3 must be complete
    - **Acceptance:** If validation passes, update assessment.status to AssessmentStatus.SUBMITTED. Commit to database. Assessment is now locked for BLGU editing.
    - **Tech:** SQLAlchemy update, database commit
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.5.5 Atomic: Create SubmitAssessmentResponse Pydantic schema**
    - **Files:** `apps/api/app/schemas/assessment.py`
    - **Dependencies:** None (can be done in parallel)
    - **Acceptance:** Pydantic schema created: SubmitAssessmentResponse with fields: success (bool), message (str), assessment_id (int), submitted_at (datetime). Schema used for API response.
    - **Tech:** Pydantic, Python type hints
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.5.6 Atomic: Return SubmitAssessmentResponse on success**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Tasks 5.5.4, 5.5.5 must be complete
    - **Acceptance:** Endpoint returns SubmitAssessmentResponse with success=True, message="Assessment submitted successfully", assessment_id, submitted_at timestamp. Response model configured.
    - **Tech:** FastAPI response models, Pydantic
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.5.7 Atomic: Add notification trigger for assessor (placeholder)**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.5.4 must be complete
    - **Acceptance:** After successful submission, add TODO comment or placeholder call for notification service. Notification sends email to assigned assessor. Implementation deferred to Story 5.19.
    - **Tech:** Python, code comments, notification planning
    - **Time Estimate:** 1 hour
    - **Completed:** 2025-11-09

  - [ ] **5.5.8 Atomic: Test submit endpoint with valid complete assessment**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.5.1-5.5.6 must be complete
    - **Acceptance:** Integration test creates complete assessment with all indicators and MOVs. BLGU user calls submit endpoint. Returns 200 status. Assessment status updated to SUBMITTED. Response contains success message.
    - **Tech:** Pytest, FastAPI TestClient, test database
    - **Time Estimate:** 5 hours

  - [ ] **5.5.9 Atomic: Test submit endpoint rejects incomplete assessment**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.5.1-5.5.6 must be complete
    - **Acceptance:** Integration test creates incomplete assessment. BLGU user calls submit endpoint. Returns 400 Bad Request. Response contains validation errors listing incomplete indicators. Assessment status remains DRAFT.
    - **Tech:** Pytest, validation testing
    - **Time Estimate:** 4 hours

  - [ ] **5.5.10 Atomic: Test submit endpoint rejects unauthorized user**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.5.1-5.5.6 must be complete
    - **Acceptance:** Integration test with BLGU user attempting to submit another barangay's assessment. Returns 403 Forbidden. Assessor attempting to submit returns 403.
    - **Tech:** Pytest, authorization testing
    - **Time Estimate:** 3 hours

- [x] **5.6 Story: Backend API for Rework Initiation (Assessor-Only)** ✅
  - Create `POST /api/v1/assessments/{assessment_id}/request-rework` endpoint
  - Require ASSESSOR or VALIDATOR role
  - Accept rework comments (required field)
  - Check rework_count < 1 before allowing rework
  - Update assessment status to REWORK
  - Increment rework_count
  - Record rework_requested_by and rework_requested_at
  - Unlock assessment for BLGU editing
  - Send notification to BLGU user
  - Tech stack involved: FastAPI, role-based access control, notification integration
  - Dependencies: Story 5.3 must be complete
  - **Completed:** 2025-11-09

  - [x] **5.6.1 Atomic: Create POST request-rework endpoint structure**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Story 5.3 must be complete
    - **Acceptance:** Endpoint defined: @router.post("/{assessment_id}/request-rework", tags=["assessments"]). Accepts path param: assessment_id. Dependencies: get_db, get_current_user. Returns 200 status code on success.
    - **Tech:** FastAPI, dependency injection
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.6.2 Atomic: Add authorization check for ASSESSOR/VALIDATOR roles**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.6.1 must be complete
    - **Acceptance:** Endpoint checks current_user.role in [ASSESSOR, VALIDATOR, MLGOO_DILG]. Returns 403 Forbidden if BLGU_USER or unauthorized role.
    - **Tech:** FastAPI, role-based access control
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.6.3 Atomic: Create RequestReworkRequest Pydantic schema**
    - **Files:** `apps/api/app/schemas/assessment.py`
    - **Dependencies:** None (can be done in parallel)
    - **Acceptance:** Pydantic schema created: RequestReworkRequest with field: comments (str, required, min_length=10). Validates rework comments are provided.
    - **Tech:** Pydantic, validation, Python type hints
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.6.4 Atomic: Accept and validate rework comments from request body**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Tasks 5.6.1, 5.6.3 must be complete
    - **Acceptance:** Endpoint accepts request body: RequestReworkRequest. Extracts comments field. Validates comments not empty. Returns 400 if validation fails.
    - **Tech:** FastAPI request body, Pydantic validation
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.6.5 Atomic: Check rework_count < 1 before allowing rework**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.6.1, Story 5.3 must be complete
    - **Acceptance:** Endpoint loads assessment from database. Checks assessment.rework_count < 1. If rework_count >= 1, returns 400 Bad Request with error: "Rework limit reached. Only one rework cycle allowed."
    - **Tech:** SQLAlchemy query, business logic validation
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.6.6 Atomic: Check assessment status is SUBMITTED**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.6.1 must be complete
    - **Acceptance:** Endpoint checks assessment.status == SUBMITTED. If status is DRAFT, REWORK, or COMPLETED, returns 400 Bad Request with error: "Assessment must be in SUBMITTED status to request rework."
    - **Tech:** Status validation, business rules
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.6.7 Atomic: Update assessment to REWORK status and increment count**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Tasks 5.6.5, 5.6.6 must be complete
    - **Acceptance:** Update assessment.status to AssessmentStatus.REWORK. Increment assessment.rework_count by 1. Set assessment.rework_comments to comments from request. Set assessment.rework_requested_by to current_user.id. Set assessment.rework_requested_at to current timestamp. Commit to database.
    - **Tech:** SQLAlchemy update, timestamp handling
    - **Time Estimate:** 4 hours
    - **Completed:** 2025-11-09

  - [x] **5.6.8 Atomic: Create RequestReworkResponse Pydantic schema**
    - **Files:** `apps/api/app/schemas/assessment.py`
    - **Dependencies:** None (can be done in parallel)
    - **Acceptance:** Pydantic schema created: RequestReworkResponse with fields: success (bool), message (str), assessment_id (int), rework_count (int), rework_requested_at (datetime). Schema used for API response.
    - **Tech:** Pydantic, Python type hints
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.6.9 Atomic: Return RequestReworkResponse on success**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Tasks 5.6.7, 5.6.8 must be complete
    - **Acceptance:** Endpoint returns RequestReworkResponse with success=True, message="Rework requested successfully", assessment_id, rework_count, rework_requested_at. Response model configured.
    - **Tech:** FastAPI response models
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.6.10 Atomic: Add notification trigger for BLGU (placeholder)**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.6.7 must be complete
    - **Acceptance:** After successful rework request, add placeholder for notification service. Notification sends email to BLGU user with rework comments. Implementation deferred to Story 5.19.
    - **Completed:** 2025-11-09
    - **Tech:** Python, notification planning
    - **Time Estimate:** 1 hour

  - [ ] **5.6.11 Atomic: Test request-rework endpoint with valid request**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.6.1-5.6.9 must be complete
    - **Acceptance:** Integration test creates SUBMITTED assessment with rework_count=0. ASSESSOR user calls request-rework with valid comments. Returns 200 status. Assessment status updated to REWORK. rework_count incremented to 1. Comments saved.
    - **Tech:** Pytest, FastAPI TestClient, test database
    - **Time Estimate:** 5 hours

  - [ ] **5.6.12 Atomic: Test request-rework rejects when rework limit reached**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.6.1-5.6.9 must be complete
    - **Acceptance:** Integration test creates assessment with rework_count=1. ASSESSOR attempts to request rework again. Returns 400 Bad Request with error: "Rework limit reached".
    - **Tech:** Pytest, business rule testing
    - **Time Estimate:** 3 hours

  - [ ] **5.6.13 Atomic: Test request-rework rejects BLGU_USER**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.6.1-5.6.9 must be complete
    - **Acceptance:** Integration test with BLGU_USER attempting to request rework. Returns 403 Forbidden. Only assessors/validators can request rework.
    - **Tech:** Pytest, role-based testing
    - **Time Estimate:** 3 hours

  - [ ] **5.6.14 Atomic: Test request-rework requires comments**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.6.1-5.6.9 must be complete
    - **Acceptance:** Integration test with ASSESSOR attempting rework with empty comments. Returns 400 Bad Request. Pydantic validation error indicates comments required.
    - **Tech:** Pytest, validation testing
    - **Time Estimate:** 2 hours

- [x] **5.7 Story: Backend API for Resubmission (BLGU-Only)** ✅
  - Create `POST /api/v1/assessments/{assessment_id}/resubmit` endpoint
  - Require BLGU_USER role
  - Only allow if assessment status is REWORK
  - Use SubmissionValidationService to validate completeness
  - Return validation errors if incomplete
  - If valid, update assessment status to SUBMITTED
  - Lock assessment for editing by BLGU
  - Send notification to assigned assessor
  - Tech stack involved: FastAPI, Pydantic, role-based access control
  - Dependencies: Stories 5.4, 5.6 must be complete
  - **Completed:** 2025-11-09

  - [x] **5.7.1 Atomic: Create POST resubmit endpoint structure**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Stories 5.4, 5.6 must be complete
    - **Acceptance:** Endpoint defined: @router.post("/{assessment_id}/resubmit", tags=["assessments"]). Accepts path param: assessment_id. Dependencies: get_db, get_current_user. Returns 200 status code on success.
    - **Tech:** FastAPI, dependency injection
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.7.2 Atomic: Add authorization check for BLGU_USER role**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.7.1 must be complete
    - **Acceptance:** Endpoint checks current_user.role is BLGU_USER. Checks user owns the assessment. Returns 403 Forbidden if unauthorized.
    - **Tech:** FastAPI, role-based access control
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.7.3 Atomic: Check assessment status is REWORK**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.7.1 must be complete
    - **Acceptance:** Endpoint checks assessment.status == REWORK. If status is DRAFT, SUBMITTED, or COMPLETED, returns 400 Bad Request with error: "Assessment must be in REWORK status to resubmit."
    - **Tech:** Status validation
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.7.4 Atomic: Integrate SubmissionValidationService for resubmission**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.7.1, Story 5.4 must be complete
    - **Acceptance:** Endpoint calls submission_validation_service.validate_submission(assessment_id, db). If validation fails, returns 400 Bad Request with validation errors. BLGU must address rework feedback before resubmitting.
    - **Tech:** Service integration, validation
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.7.5 Atomic: Update assessment status to SUBMITTED on resubmission**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.7.4 must be complete
    - **Acceptance:** If validation passes, update assessment.status to AssessmentStatus.SUBMITTED. Do NOT increment rework_count (already at 1). Commit to database. Assessment locked again.
    - **Tech:** SQLAlchemy update
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.7.6 Atomic: Create ResubmitAssessmentResponse Pydantic schema**
    - **Files:** `apps/api/app/schemas/assessment.py`
    - **Dependencies:** None (can be done in parallel)
    - **Acceptance:** Pydantic schema created: ResubmitAssessmentResponse with fields: success (bool), message (str), assessment_id (int), resubmitted_at (datetime). Schema used for API response.
    - **Tech:** Pydantic, Python type hints
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.7.7 Atomic: Return ResubmitAssessmentResponse on success**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Tasks 5.7.5, 5.7.6 must be complete
    - **Acceptance:** Endpoint returns ResubmitAssessmentResponse with success=True, message="Assessment resubmitted successfully", assessment_id, resubmitted_at timestamp. Response model configured.
    - **Tech:** FastAPI response models
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.7.8 Atomic: Add notification trigger for assessor (placeholder)**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.7.5 must be complete
    - **Acceptance:** After successful resubmission, add placeholder for notification service. Notification sends email to assessor. Implementation deferred to Story 5.19.
    - **Tech:** Notification planning
    - **Time Estimate:** 1 hour
    - **Completed:** 2025-11-09

  - [ ] **5.7.9 Atomic: Test resubmit endpoint with valid REWORK assessment**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.7.1-5.7.7 must be complete
    - **Acceptance:** Integration test creates REWORK assessment (rework_count=1, all indicators complete). BLGU user calls resubmit. Returns 200 status. Assessment status updated to SUBMITTED. rework_count remains 1.
    - **Tech:** Pytest, FastAPI TestClient
    - **Time Estimate:** 5 hours

  - [ ] **5.7.10 Atomic: Test resubmit rejects incomplete assessment**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.7.1-5.7.7 must be complete
    - **Acceptance:** Integration test with REWORK assessment that is incomplete. BLGU user calls resubmit. Returns 400 Bad Request with validation errors. Status remains REWORK.
    - **Tech:** Pytest, validation testing
    - **Time Estimate:** 4 hours

  - [ ] **5.7.11 Atomic: Test resubmit rejects non-REWORK status**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.7.1-5.7.7 must be complete
    - **Acceptance:** Integration test with DRAFT or SUBMITTED assessment. BLGU user attempts resubmit. Returns 400 Bad Request with error about status requirement.
    - **Tech:** Pytest, status testing
    - **Time Estimate:** 3 hours

  - [ ] **5.7.12 Atomic: Test resubmit rejects unauthorized assessor**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.7.1-5.7.7 must be complete
    - **Acceptance:** Integration test with ASSESSOR attempting to resubmit. Returns 403 Forbidden. Only BLGU users can resubmit.
    - **Tech:** Pytest, role-based testing
    - **Time Estimate:** 3 hours

- [x] **5.8 Story: Backend API for Submission Status Check** ✅
  - Create `GET /api/v1/assessments/{assessment_id}/submission-status` endpoint
  - Return current status, rework_count, rework_comments, locked state
  - Include submission validation result (completeness check)
  - Tech stack involved: FastAPI, Pydantic schemas
  - Dependencies: Story 5.3 must be complete
  - **Completed:** 2025-11-09

  - [x] **5.8.1 Atomic: Create GET submission-status endpoint structure**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Story 5.3 must be complete
    - **Acceptance:** Endpoint defined: @router.get("/{assessment_id}/submission-status", tags=["assessments"]). Accepts path param: assessment_id. Dependencies: get_db, get_current_user. Returns 200 status code.
    - **Tech:** FastAPI, dependency injection
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.8.2 Atomic: Load assessment and check permissions**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.8.1 must be complete
    - **Acceptance:** Endpoint loads assessment from database. If BLGU_USER, checks ownership. Returns 403 if unauthorized. Assessors can check any assessment.
    - **Tech:** SQLAlchemy query, authorization
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.8.3 Atomic: Create SubmissionStatusResponse Pydantic schema**
    - **Files:** `apps/api/app/schemas/assessment.py`
    - **Dependencies:** Story 5.4 must be complete (SubmissionValidationResult exists)
    - **Acceptance:** Pydantic schema created: SubmissionStatusResponse with fields: assessment_id, status (AssessmentStatus), is_locked (bool), rework_count (int), rework_comments (Optional[str]), rework_requested_at (Optional[datetime]), validation_result (SubmissionValidationResult). Schema used for API response.
    - **Tech:** Pydantic, nested schemas, Python type hints
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.8.4 Atomic: Run validation check for current completeness**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Task 5.8.1, Story 5.4 must be complete
    - **Acceptance:** Endpoint calls submission_validation_service.validate_submission(assessment_id, db). Returns current validation status. Allows BLGU to see what needs completion before submit/resubmit.
    - **Tech:** Service integration
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.8.5 Atomic: Return SubmissionStatusResponse with all data**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Tasks 5.8.3, 5.8.4 must be complete
    - **Acceptance:** Endpoint returns SubmissionStatusResponse with: current status, is_locked (from assessment.is_locked property), rework_count, rework_comments, rework_requested_at, validation_result. Response model configured.
    - **Tech:** FastAPI response models, Pydantic
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [ ] **5.8.6 Atomic: Test submission-status endpoint for DRAFT assessment**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.8.1-5.8.5 must be complete
    - **Acceptance:** Integration test creates DRAFT assessment. BLGU user calls submission-status. Returns status=DRAFT, is_locked=False, rework_count=0, validation_result shows incomplete items.
    - **Tech:** Pytest, FastAPI TestClient
    - **Time Estimate:** 4 hours

  - [ ] **5.8.7 Atomic: Test submission-status endpoint for REWORK assessment**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.8.1-5.8.5 must be complete
    - **Acceptance:** Integration test creates REWORK assessment with rework_comments. BLGU user calls submission-status. Returns status=REWORK, is_locked=False, rework_count=1, rework_comments included.
    - **Tech:** Pytest, rework scenario testing
    - **Time Estimate:** 4 hours

  - [ ] **5.8.8 Atomic: Test submission-status endpoint for SUBMITTED assessment**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Tasks 5.8.1-5.8.5 must be complete
    - **Acceptance:** Integration test creates SUBMITTED assessment. BLGU user calls submission-status. Returns status=SUBMITTED, is_locked=True, validation_result shows all complete.
    - **Tech:** Pytest, locked state testing
    - **Time Estimate:** 4 hours

- [x] **5.9 Story: Pydantic Schemas for Submission Workflow** ✅
  - Create `SubmissionValidationResponse` schema with validation errors
  - Create `SubmitAssessmentRequest` schema (empty body, confirmation only)
  - Create `RequestReworkRequest` schema with comments field
  - Create `ResubmitAssessmentRequest` schema
  - Create `SubmissionStatusResponse` schema with status, rework info
  - Ensure proper Orval tags
  - Tech stack involved: Pydantic, Python type hints
  - Dependencies: Stories 5.5, 5.6, 5.7, 5.8 must be complete
  - **Completed:** 2025-11-09

  - [x] **5.9.1 Atomic: Verify all submission schemas already created**
    - **Files:** `apps/api/app/schemas/assessment.py`
    - **Dependencies:** Stories 5.5-5.8 must be complete
    - **Acceptance:** Review schemas created in Tasks 5.4.4, 5.5.5, 5.6.3, 5.6.8, 5.7.6, 5.8.3. Verify all schemas exist: SubmissionValidationResult, SubmitAssessmentResponse, RequestReworkRequest, RequestReworkResponse, ResubmitAssessmentResponse, SubmissionStatusResponse.
    - **Tech:** Schema review, code audit
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.9.2 Atomic: Add comprehensive docstrings to all submission schemas**
    - **Files:** `apps/api/app/schemas/assessment.py`
    - **Dependencies:** Task 5.9.1 must be complete
    - **Acceptance:** All submission-related schemas have comprehensive docstrings. Field descriptions added. Usage examples added where helpful.
    - **Tech:** Python docstrings, documentation
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.9.3 Atomic: Ensure all submission endpoints use proper tags**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Stories 5.5-5.8 must be complete
    - **Acceptance:** All submission endpoints use tags=["assessments"]. Orval will generate types in assessments folder.
    - **Tech:** FastAPI tags
    - **Time Estimate:** 1 hour
    - **Completed:** 2025-11-09

- [x] **5.10 Story: Type Generation for Submission APIs** ✅
  - Run `pnpm generate-types` to generate TypeScript types and React Query hooks
  - Verify generated hooks: `usePostAssessmentsAssessmentIdSubmit`, `usePostAssessmentsAssessmentIdRequestRework`, `usePostAssessmentsAssessmentIdResubmit`, `useGetAssessmentsAssessmentIdSubmissionStatus`
  - Ensure all schemas are correctly typed
  - Tech stack involved: Orval, TypeScript, React Query
  - Dependencies: Story 5.9 must be complete
  - **Completed:** 2025-11-09
  - **Note:** Generated 6 new/updated schema files, 4 React Query hooks for Epic 5.0 submission workflow

  - [x] **5.10.1 Atomic: Run pnpm generate-types after submission endpoints complete**
    - **Files:** Generated files in `packages/shared/src/generated/`
    - **Dependencies:** Stories 5.5-5.9 must be complete
    - **Acceptance:** Run `pnpm generate-types`. Command succeeds. No errors. Generated files updated in packages/shared/src/generated/.
    - **Tech:** Orval, pnpm, type generation
    - **Time Estimate:** 1 hour
    - **Completed:** 2025-11-09

  - [x] **5.10.2 Atomic: Verify SubmissionStatusResponse TypeScript type generated**
    - **Files:** `packages/shared/src/generated/schemas/system/index.ts` (in system schemas)
    - **Dependencies:** Task 5.10.1 must be complete
    - **Acceptance:** TypeScript type SubmissionStatusResponse exists. All fields present with correct types: assessment_id, status, is_locked, rework_count, rework_comments, validation_result.
    - **Tech:** TypeScript, Orval generated types
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.10.3 Atomic: Verify useSubmitAssessment mutation hook generated**
    - **Files:** `packages/shared/src/generated/endpoints/assessments/index.ts`
    - **Dependencies:** Task 5.10.1 must be complete
    - **Acceptance:** React Query mutation hook usePostAssessmentsAssessmentIdSubmit exists. Hook accepts parameter: assessmentId. Hook returns SubmitAssessmentResponse on success.
    - **Tech:** React Query, Orval generated hooks
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.10.4 Atomic: Verify useRequestRework mutation hook generated**
    - **Files:** `packages/shared/src/generated/endpoints/assessments/index.ts`
    - **Dependencies:** Task 5.10.1 must be complete
    - **Acceptance:** React Query mutation hook usePostAssessmentsAssessmentIdRequestRework exists. Hook accepts parameters: assessmentId, RequestReworkRequest (with comments). Hook returns RequestReworkResponse on success.
    - **Tech:** React Query, Orval generated hooks
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.10.5 Atomic: Verify useResubmitAssessment mutation hook generated**
    - **Files:** `packages/shared/src/generated/endpoints/assessments/index.ts`
    - **Dependencies:** Task 5.10.1 must be complete
    - **Acceptance:** React Query mutation hook usePostAssessmentsAssessmentIdResubmit exists. Hook accepts parameter: assessmentId. Hook returns ResubmitAssessmentResponse on success.
    - **Tech:** React Query, Orval generated hooks
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.10.6 Atomic: Verify useGetSubmissionStatus query hook generated**
    - **Files:** `packages/shared/src/generated/endpoints/assessments/index.ts`
    - **Dependencies:** Task 5.10.1 must be complete
    - **Acceptance:** React Query query hook useGetAssessmentsAssessmentIdSubmissionStatus exists. Hook accepts parameter: assessmentId. Hook returns SubmissionStatusResponse with status, validation, rework info.
    - **Tech:** React Query, Orval generated hooks
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.10.7 Atomic: Test generated hooks in TypeScript environment**
    - **Files:** Generated types verified during compilation
    - **Dependencies:** Tasks 5.10.3-5.10.6 must be complete
    - **Acceptance:** Generated hooks compile without TypeScript errors. All type signatures correct.
    - **Tech:** TypeScript, type checking
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09 (verified via successful type generation)

- [x] **5.11 Story: Submission Validation Component** ✅
  - Create `SubmissionValidation` component in `src/components/features/assessments/submission/`
  - Display validation results: complete indicators, incomplete indicators, missing MOVs
  - Show checklist of requirements before submission
  - Highlight incomplete items in red
  - Tech stack involved: React, TypeScript, shadcn/ui Alert, Badge, Skeleton
  - Dependencies: Story 5.10 must be complete
  - **Completed:** 2025-11-09
  - **Note:** Implemented with 8 comprehensive test cases covering all states

  - [x] **5.11.1 Atomic: Create SubmissionValidation component file structure**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmissionValidation.tsx` (NEW), `apps/web/src/components/features/assessments/submission/index.ts` (NEW)
    - **Dependencies:** None
    - **Acceptance:** Component file created with basic functional component structure. Props interface defined: assessmentId. Component exported from index.ts.
    - **Tech:** React, TypeScript, component structure
    - **Time Estimate:** 2 hours

  - [x] **5.11.2 Atomic: Integrate useGetSubmissionStatus query hook**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmissionValidation.tsx`
    - **Dependencies:** Task 5.11.1, Story 5.10 must be complete
    - **Acceptance:** Import useGetSubmissionStatus from @sinag/shared. Call hook with assessmentId. Extract validation_result from response. Handle loading and error states.
    - **Tech:** React, TanStack Query, generated hooks
    - **Time Estimate:** 3 hours

  - [x] **5.11.3 Atomic: Render checklist for indicator completeness**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmissionValidation.tsx`
    - **Dependencies:** Task 5.11.2 must be complete
    - **Acceptance:** Display checklist of all indicators. Complete indicators show green checkmark. Incomplete indicators show red X. Use shadcn/ui Checkbox or custom icons. List incomplete indicator names.
    - **Tech:** React, shadcn/ui, lucide-react icons, conditional rendering
    - **Time Estimate:** 4 hours

  - [x] **5.11.4 Atomic: Render checklist for MOV completeness**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmissionValidation.tsx`
    - **Dependencies:** Task 5.11.2 must be complete
    - **Acceptance:** Display checklist for required MOV uploads. Complete indicators show green checkmark. Missing MOVs show red X. List indicators missing files.
    - **Tech:** React, conditional rendering
    - **Time Estimate:** 4 hours

  - [x] **5.11.5 Atomic: Show overall validation summary**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmissionValidation.tsx`
    - **Dependencies:** Tasks 5.11.3, 5.11.4 must be complete
    - **Acceptance:** Display summary at top: "X of Y indicators complete", "X of Y MOVs uploaded". Show validation status badge: "Ready to Submit" (green) or "Incomplete" (red). Use shadcn/ui Badge, Alert.
    - **Tech:** React, shadcn/ui Badge, Alert, data aggregation
    - **Time Estimate:** 3 hours

  - [x] **5.11.6 Atomic: Add loading skeleton for validation check**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmissionValidation.tsx`
    - **Dependencies:** Task 5.11.2 must be complete
    - **Acceptance:** When isLoading is true, show skeleton loader for checklist. Use shadcn/ui Skeleton component. Show loading message.
    - **Tech:** React, shadcn/ui Skeleton, loading states
    - **Time Estimate:** 2 hours

  - [x] **5.11.7 Atomic: Add error state for validation check**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmissionValidation.tsx`
    - **Dependencies:** Task 5.11.2 must be complete
    - **Acceptance:** When error exists, show error message using shadcn/ui Alert. Include Retry button to refetch validation.
    - **Tech:** React, shadcn/ui Alert, error handling
    - **Time Estimate:** 2 hours

- [x] **5.12 Story: Submit Assessment Button and Confirmation** ✅
  - Create `SubmitAssessmentButton` component in `src/components/features/assessments/submission/`
  - Integrate `usePostAssessmentsAssessmentIdSubmit` mutation hook
  - Show validation errors if submission fails
  - Show confirmation dialog before submission
  - Disable button if assessment is incomplete
  - Tech stack involved: React, TypeScript, shadcn/ui AlertDialog, Button, Tooltip, TanStack Query mutations
  - Dependencies: Stories 5.10, 5.11 must be complete
  - **Completed:** 2025-11-09
  - **Note:** Implemented with 10 comprehensive test cases and toast notifications

  - [x] **5.12.1 Atomic: Create SubmitAssessmentButton component file structure**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmitAssessmentButton.tsx` (NEW)
    - **Dependencies:** None
    - **Acceptance:** Component file created with basic functional component structure. Props interface defined: assessmentId, validationResult, onSuccess. Component exported from index.ts.
    - **Tech:** React, TypeScript
    - **Time Estimate:** 2 hours

  - [x] **5.12.2 Atomic: Integrate useSubmitAssessment mutation hook**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmitAssessmentButton.tsx`
    - **Dependencies:** Task 5.12.1, Story 5.10 must be complete
    - **Acceptance:** Import useSubmitAssessment from @sinag/shared. Call hook in component. Store mutation function. Configure onSuccess callback to call props.onSuccess.
    - **Tech:** React, TanStack Query, generated hooks
    - **Time Estimate:** 3 hours

  - [x] **5.12.3 Atomic: Create confirmation dialog**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmitAssessmentButton.tsx`
    - **Dependencies:** Task 5.12.1 must be complete
    - **Acceptance:** Implement confirmation dialog using shadcn/ui AlertDialog. Dialog asks "Are you sure you want to submit this assessment?". Show warning: "You will not be able to edit after submission unless rework is requested." Confirm and Cancel buttons.
    - **Tech:** React, shadcn/ui AlertDialog, state management
    - **Time Estimate:** 4 hours

  - [x] **5.12.4 Atomic: Wire Submit button to confirmation dialog**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmitAssessmentButton.tsx`
    - **Dependencies:** Tasks 5.12.2, 5.12.3 must be complete
    - **Acceptance:** Clicking Submit button opens confirmation dialog. Clicking Confirm in dialog calls submitAssessment mutation. Clicking Cancel closes dialog without action.
    - **Tech:** React, event handlers, state management
    - **Time Estimate:** 3 hours

  - [x] **5.12.5 Atomic: Disable button if assessment incomplete**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmitAssessmentButton.tsx`
    - **Dependencies:** Task 5.12.1 must be complete
    - **Acceptance:** Button disabled if validationResult.is_valid === false. Show tooltip: "Complete all indicators and upload required MOVs before submitting". Use shadcn/ui Tooltip.
    - **Tech:** React, conditional logic, shadcn/ui Tooltip
    - **Time Estimate:** 3 hours

  - [x] **5.12.6 Atomic: Show loading state during submission**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmitAssessmentButton.tsx`
    - **Dependencies:** Task 5.12.2 must be complete
    - **Acceptance:** While mutation is pending, disable button and show loading spinner. Use mutation.isPending from TanStack Query. Button text changes to "Submitting...".
    - **Tech:** React, TanStack Query loading states, UI feedback
    - **Time Estimate:** 2 hours

  - [x] **5.12.7 Atomic: Handle submission success with toast**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmitAssessmentButton.tsx`
    - **Dependencies:** Task 5.12.2 must be complete
    - **Acceptance:** On submission success, show success toast: "Assessment submitted successfully!". Close confirmation dialog. Call onSuccess callback to refresh parent component. Use shadcn/ui Toast.
    - **Tech:** React, shadcn/ui Toast, callbacks
    - **Time Estimate:** 3 hours

  - [ ] **5.12.8 Atomic: Handle submission error**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmitAssessmentButton.tsx`
    - **Dependencies:** Task 5.12.2 must be complete
    - **Acceptance:** On submission error, show error toast with server error message. If validation errors, display list of incomplete items. Keep dialog open. Use shadcn/ui Toast, Alert.
    - **Tech:** React, error handling, shadcn/ui
    - **Time Estimate:** 4 hours

- [x] **5.13 Story: Locked State UI Components** ✅
  - Create `LockedStateBanner` component in `src/components/features/assessments/`
  - Display status-based messages for locked states
  - Show rework warning when rework cycle used
  - Use sticky positioning for persistent visibility
  - Color-coded alerts for different statuses
  - Tech stack involved: React, TypeScript, shadcn/ui Alert, Badge, conditional rendering
  - Dependencies: Story 5.10 must be complete
  - **Completed:** 2025-11-09
  - **Note:** Implemented with 13 comprehensive test cases, renamed from LockedAssessmentBanner to LockedStateBanner

  - [x] **5.13.1 Atomic: Create LockedStateBanner component file structure**
    - **Files:** `apps/web/src/components/features/assessments/LockedStateBanner.tsx` (NEW), `apps/web/src/components/features/assessments/index.ts`
    - **Dependencies:** None
    - **Acceptance:** Component file created with basic functional component structure. Props interface defined: status, reworkCount. Component exported from index.ts.
    - **Tech:** React, TypeScript
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.13.2 Atomic: Render banner for SUBMITTED status**
    - **Files:** `apps/web/src/components/features/assessments/LockedStateBanner.tsx`
    - **Dependencies:** Task 5.13.1 must be complete
    - **Acceptance:** If status === "SUBMITTED", show shadcn/ui Alert with blue variant. Message: "Assessment Submitted - Your assessment is under review. You cannot make edits at this time." Icon shows lock symbol from lucide-react. Status badge displayed.
    - **Tech:** React, shadcn/ui Alert, Badge, conditional rendering, lucide-react icons
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.13.3 Atomic: Render banner for IN_REVIEW status**
    - **Files:** `apps/web/src/components/features/assessments/LockedStateBanner.tsx`
    - **Dependencies:** Task 5.13.1 must be complete
    - **Acceptance:** If status === "IN_REVIEW", show shadcn/ui Alert with blue variant. Message: "Assessment In Review - An assessor is currently reviewing your submission." Icon shows eye symbol. Status badge displayed.
    - **Tech:** React, shadcn/ui Alert, Badge
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.13.4 Atomic: Render banner for COMPLETED status**
    - **Files:** `apps/web/src/components/features/assessments/LockedStateBanner.tsx`
    - **Dependencies:** Task 5.13.1 must be complete
    - **Acceptance:** If status === "COMPLETED", show shadcn/ui Alert with green variant. Message: "Assessment Completed - This assessment has been finalized. No further edits allowed." Icon shows check circle. Status badge displayed.
    - **Tech:** React, shadcn/ui Alert, Badge
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.13.5 Atomic: Render rework limit banner**
    - **Files:** `apps/web/src/components/features/assessments/LockedStateBanner.tsx`
    - **Dependencies:** Task 5.13.1 must be complete
    - **Acceptance:** If status === "SUBMITTED" and reworkCount >= 1, show additional orange Alert with warning: "Note: You have used your one rework cycle. This is your final submission. The assessor cannot request further changes."
    - **Tech:** React, shadcn/ui Alert, conditional rendering
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.13.6 Atomic: Add sticky positioning for banner**
    - **Files:** `apps/web/src/components/features/assessments/LockedStateBanner.tsx`
    - **Dependencies:** Task 5.13.1 must be complete
    - **Acceptance:** Banner uses sticky positioning at top of page with z-10. Remains visible when scrolling. Uses Tailwind CSS: "sticky top-0 z-10".
    - **Tech:** React, Tailwind CSS, sticky positioning
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

- [x] **5.14 Story: Rework Comments Display Component** ✅
  - Create `ReworkCommentsPanel` component in `src/components/features/assessments/rework/`
  - Display assessor comments for rework
  - Only visible when assessment status is REWORK
  - Orange-themed alert and card components
  - Relative timestamp with assessor info
  - Tech stack involved: React, TypeScript, shadcn/ui, date-fns
  - Dependencies: Story 5.10 must be complete
  - **Completed:** 2025-11-09
  - **Note:** Implemented with 15 comprehensive test cases, full rework workflow display

  - [x] **5.14.1 Atomic: Create ReworkCommentsPanel component file structure**
    - **Files:** `apps/web/src/components/features/assessments/rework/ReworkCommentsPanel.tsx` (NEW), `apps/web/src/components/features/assessments/rework/index.ts` (NEW)
    - **Dependencies:** None
    - **Acceptance:** Component file created with basic functional component structure. Props interface defined: assessmentId. Component exported from index.ts.
    - **Tech:** React, TypeScript
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.14.2 Atomic: Integrate useGetSubmissionStatus query hook**
    - **Files:** `apps/web/src/components/features/assessments/rework/ReworkCommentsPanel.tsx`
    - **Dependencies:** Task 5.14.1, Story 5.10 must be complete
    - **Acceptance:** Import useGetAssessmentsAssessmentIdSubmissionStatus from @sinag/shared. Call hook with assessmentId. Extract rework_comments, rework_requested_at, rework_requested_by, status. Only render component if status === "REWORK".
    - **Tech:** React, TanStack Query, conditional rendering
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.14.3 Atomic: Render rework comments in Card**
    - **Files:** `apps/web/src/components/features/assessments/rework/ReworkCommentsPanel.tsx`
    - **Dependencies:** Task 5.14.2 must be complete
    - **Acceptance:** Render rework_comments in shadcn/ui Card with "Assessor Feedback" header, MessageSquare icon, and REWORK badge. Card content displays comments with whitespace-pre-wrap to preserve line breaks.
    - **Tech:** React, shadcn/ui Card, Badge, text formatting
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.14.4 Atomic: Display rework requested timestamp**
    - **Files:** `apps/web/src/components/features/assessments/rework/ReworkCommentsPanel.tsx`
    - **Dependencies:** Task 5.14.2 must be complete
    - **Acceptance:** Show rework_requested_at timestamp in card footer using date-fns formatDistanceToNow. Display assessor email if rework_requested_by contains email property.
    - **Tech:** React, date-fns, date formatting
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.14.5 Atomic: Add alert banner for rework status**
    - **Files:** `apps/web/src/components/features/assessments/rework/ReworkCommentsPanel.tsx`
    - **Dependencies:** Task 5.14.1 must be complete
    - **Acceptance:** Above card, show shadcn/ui Alert with orange theme. Title: "Rework Requested". Message: "Please address the assessor's feedback below and resubmit your assessment." AlertTriangle icon.
    - **Tech:** React, shadcn/ui Alert
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.14.6 Atomic: Style comments panel with emphasis**
    - **Files:** `apps/web/src/components/features/assessments/rework/ReworkCommentsPanel.tsx`
    - **Dependencies:** Task 5.14.3 must be complete
    - **Acceptance:** Comments panel uses orange accent theme. Alert: border-orange-600, bg-orange-50. Card: border-orange-200, shadow-md. Card header: bg-orange-50.
    - **Tech:** React, Tailwind CSS, visual design
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

- [x] **5.15 Story: Rework Request Form (Assessor-Only)** ✅
  - Create `RequestReworkForm` component in `src/components/features/assessor/`
  - Textarea for rework comments with 10-character minimum validation
  - Character count indicator with helpful feedback
  - Confirmation dialog with comment preview and warnings
  - Disabled state when rework limit reached (reworkCount >= 1)
  - Success/error toast notifications
  - Tech stack involved: React, TypeScript, shadcn/ui Textarea, AlertDialog, Alert, Button, Label
  - Dependencies: Story 5.10 must be complete
  - **Completed:** 2025-11-09
  - **Note:** Implemented with 18 comprehensive test cases, assessor-only form

  - [x] **5.15.1 Atomic: Create RequestReworkForm component file structure**
    - **Files:** `apps/web/src/components/features/assessor/RequestReworkForm.tsx` (NEW), `apps/web/src/components/features/assessor/index.ts`
    - **Dependencies:** None
    - **Acceptance:** Component file created with basic functional component structure. Props interface defined: assessmentId, reworkCount, onSuccess. Component exported from index.ts.
    - **Tech:** React, TypeScript
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.15.2 Atomic: Integrate useRequestRework mutation hook**
    - **Files:** `apps/web/src/components/features/assessor/RequestReworkForm.tsx`
    - **Dependencies:** Task 5.15.1, Story 5.10 must be complete
    - **Acceptance:** Import usePostAssessmentsAssessmentIdRequestRework from @sinag/shared. Call hook in component. Store mutation function. Configure onSuccess and onError callbacks.
    - **Tech:** React, TanStack Query, generated hooks
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.15.3 Atomic: Render textarea for rework comments**
    - **Files:** `apps/web/src/components/features/assessor/RequestReworkForm.tsx`
    - **Dependencies:** Task 5.15.1 must be complete
    - **Acceptance:** Render shadcn/ui Textarea with Label "Rework Comments". Placeholder: "Explain what needs to be revised... (minimum 10 characters)". Required field indicator (*). Uses useState for form state.
    - **Tech:** React, shadcn/ui Textarea, Label, form state
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.15.4 Atomic: Add character count indicator**
    - **Files:** `apps/web/src/components/features/assessor/RequestReworkForm.tsx`
    - **Dependencies:** Task 5.15.3 must be complete
    - **Acceptance:** Below textarea, shows real-time count: "X character(s) (minimum 10)". When below minimum, displays "Need X more" in red. Validates before enabling submit button.
    - **Tech:** React, state management, validation
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.15.5 Atomic: Create confirmation dialog**
    - **Files:** `apps/web/src/components/features/assessor/RequestReworkForm.tsx`
    - **Dependencies:** Task 5.15.1 must be complete
    - **Acceptance:** AlertDialog with "Request Rework?" title. Shows preview of comments in muted box. Warning section with orange background listing consequences: "Send back to BLGU", "Change status to REWORK", "Use one rework cycle". Confirm and Cancel buttons.
    - **Tech:** React, shadcn/ui AlertDialog
    - **Time Estimate:** 4 hours
    - **Completed:** 2025-11-09

  - [x] **5.15.6 Atomic: Wire Request Rework button to confirmation**
    - **Files:** `apps/web/src/components/features/assessor/RequestReworkForm.tsx`
    - **Dependencies:** Tasks 5.15.2, 5.15.3, 5.15.5 must be complete
    - **Acceptance:** Button opens confirmation dialog only if comments >= 10 chars. Button disabled otherwise. Confirm button calls requestRework mutation with trimmed comments. Cancel closes dialog.
    - **Tech:** React, event handlers, validation
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.15.7 Atomic: Disable form if rework limit reached**
    - **Files:** `apps/web/src/components/features/assessor/RequestReworkForm.tsx`
    - **Dependencies:** Task 5.15.1 must be complete
    - **Acceptance:** If reworkCount >= 1, replaces entire form with red Alert: "Rework Limit Reached". Message: "This BLGU has already used their one rework cycle. No further rework requests are allowed."
    - **Tech:** React, conditional rendering, shadcn/ui Alert
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.15.8 Atomic: Handle request rework success**
    - **Files:** `apps/web/src/components/features/assessor/RequestReworkForm.tsx`
    - **Dependencies:** Task 5.15.2 must be complete
    - **Acceptance:** On success, shows toast: "Rework Requested - The BLGU has been notified and can now make revisions". Clears comments textarea. Closes dialog. Calls onSuccess callback.
    - **Tech:** React, shadcn/ui Toast, state reset
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.15.9 Atomic: Handle request rework error**
    - **Files:** `apps/web/src/components/features/assessor/RequestReworkForm.tsx`
    - **Dependencies:** Task 5.15.2 must be complete
    - **Acceptance:** On error, shows error toast with server message. Detects rework limit errors and shows specific message. Closes dialog but keeps form data. Form remains filled for retry.
    - **Tech:** React, error handling, shadcn/ui Toast
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

- [x] **5.16 Story: Resubmit Assessment Button (BLGU-Only)** ✅
  - Create `ResubmitAssessmentButton` component in `src/components/features/assessments/submission/`
  - For REWORK status assessments
  - Same validation logic as initial submission
  - Confirmation dialog with final submission warning
  - Disabled state when validation fails with tooltip
  - Success/error toast notifications
  - Tech stack involved: React, TypeScript, shadcn/ui AlertDialog, Button, Tooltip
  - Dependencies: Stories 5.10, 5.11 must be complete
  - **Completed:** 2025-11-09
  - **Note:** Implemented with 16 comprehensive test cases, BLGU-only resubmission

  - [x] **5.16.1 Atomic: Create ResubmitAssessmentButton component file structure**
    - **Files:** `apps/web/src/components/features/assessments/submission/ResubmitAssessmentButton.tsx` (NEW)
    - **Dependencies:** None
    - **Acceptance:** Component file created with basic functional component structure. Props interface defined: assessmentId, validationResult, onSuccess. Component exported from index.ts.
    - **Tech:** React, TypeScript
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.16.2 Atomic: Integrate useResubmitAssessment mutation hook**
    - **Files:** `apps/web/src/components/features/assessments/submission/ResubmitAssessmentButton.tsx`
    - **Dependencies:** Task 5.16.1, Story 5.10 must be complete
    - **Acceptance:** Import usePostAssessmentsAssessmentIdResubmit from @sinag/shared. Call hook in component. Store mutation function. Configure onSuccess and onError callbacks.
    - **Tech:** React, TanStack Query, generated hooks
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.16.3 Atomic: Reuse confirmation dialog pattern from SubmitAssessmentButton**
    - **Files:** `apps/web/src/components/features/assessments/submission/ResubmitAssessmentButton.tsx`
    - **Dependencies:** Task 5.16.1, Story 5.12 must be complete (reference)
    - **Acceptance:** AlertDialog with "Resubmit Assessment?" title. Orange warning box with "Final Submission Warning". Lists consequences: locked for editing, assessor review, no additional rework. Confirm and Cancel buttons.
    - **Tech:** React, shadcn/ui AlertDialog
    - **Time Estimate:** 4 hours
    - **Completed:** 2025-11-09

  - [x] **5.16.4 Atomic: Wire Resubmit button to confirmation dialog**
    - **Files:** `apps/web/src/components/features/assessments/submission/ResubmitAssessmentButton.tsx`
    - **Dependencies:** Tasks 5.16.2, 5.16.3 must be complete
    - **Acceptance:** Clicking Resubmit button opens confirmation dialog only if validation passes. Clicking Confirm calls resubmitAssessment mutation. Clicking Cancel closes dialog.
    - **Tech:** React, event handlers
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.16.5 Atomic: Disable button if assessment incomplete**
    - **Files:** `apps/web/src/components/features/assessments/submission/ResubmitAssessmentButton.tsx`
    - **Dependencies:** Task 5.16.1 must be complete
    - **Acceptance:** Button disabled if validationResult.is_valid === false or isPending. Wrapped in Tooltip showing: "Complete all rework requirements before resubmitting".
    - **Tech:** React, conditional logic, shadcn/ui Tooltip, TooltipProvider
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.16.6 Atomic: Handle resubmission success**
    - **Files:** `apps/web/src/components/features/assessments/submission/ResubmitAssessmentButton.tsx`
    - **Dependencies:** Task 5.16.2 must be complete
    - **Acceptance:** On success, shows toast: "Assessment Resubmitted" with timestamp and "This is your final submission" note. Closes dialog. Calls onSuccess callback.
    - **Tech:** React, shadcn/ui Toast
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.16.7 Atomic: Handle resubmission error**
    - **Files:** `apps/web/src/components/features/assessments/submission/ResubmitAssessmentButton.tsx`
    - **Dependencies:** Task 5.16.2 must be complete
    - **Acceptance:** On error, shows error toast with server error message. Closes dialog on error. Extracts error message from response.data.detail or error.message.
    - **Tech:** React, error handling, shadcn/ui Toast
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

- [x] **5.17 Story: Dashboard Integration for Submission Workflow** ✅
  - Update BLGU dashboard to show submission status
  - Display "Submit Assessment" button if status is DRAFT and all complete
  - Display "Submitted - Awaiting Review" badge if status is SUBMITTED
  - Display rework comments if status is REWORK
  - Display "Resubmit Assessment" button if status is REWORK
  - Tech stack involved: React, TypeScript, component integration
  - Dependencies: Epic 2 Story 2.6, Stories 5.12, 5.13, 5.14, 5.16 must be complete
  - **Completed:** 2025-11-09
  - **Implementation Notes:**
    - Updated backend schema to include Epic 5.0 fields (status, rework_count, rework_requested_at, rework_requested_by)
    - Integrated LockedStateBanner, AssessorCommentsPanel (for rework comments), SubmitAssessmentButton, and ResubmitAssessmentButton
    - Supports both new REWORK and legacy NEEDS_REWORK status values
    - Dashboard now shows Epic 5.0 workflow components based on assessment status

  - [x] **5.17.1 Atomic: Locate BLGU dashboard page component**
    - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx` (exists from Epic 2)
    - **Dependencies:** Epic 2 Story 2.6 must be complete
    - **Acceptance:** File located. Component structure reviewed. Currently shows completion tracking. Needs submission workflow integration.
    - **Tech:** Code review, file location
    - **Time Estimate:** 1 hour
    - **Completed:** 2025-11-09

  - [x] **5.17.2 Atomic: Update backend schema to include Epic 5.0 fields**
    - **Files:** `apps/api/app/schemas/blgu_dashboard.py`, `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 5.17.1 must be complete
    - **Acceptance:** BLGUDashboardResponse schema includes status, rework_count, rework_requested_at, rework_requested_by fields. Endpoint returns these values. Types regenerated.
    - **Tech:** Pydantic, FastAPI, Orval type generation
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.17.3 Atomic: Add LockedStateBanner to dashboard**
    - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
    - **Dependencies:** Task 5.17.2, Story 5.13 must be complete
    - **Acceptance:** Import LockedStateBanner component. Render at top of dashboard unconditionally. Pass status and reworkCount props from dashboardData.
    - **Tech:** React, component integration
    - **Time Estimate:** 2 hours
    - **Completed:** 2025-11-09

  - [x] **5.17.4 Atomic: Add ReworkCommentsPanel to dashboard**
    - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
    - **Dependencies:** Task 5.17.2, Story 5.14 must be complete
    - **Acceptance:** Import AssessorCommentsPanel component. Render prominently if status === REWORK or NEEDS_REWORK. Panel shows above completion tracking.
    - **Tech:** React, component integration, layout
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.17.5 Atomic: Add SubmitAssessmentButton to dashboard**
    - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
    - **Dependencies:** Task 5.17.2, Story 5.12 must be complete
    - **Acceptance:** Import SubmitAssessmentButton component. Render if status === DRAFT. Pass assessmentId and isComplete props. Configure onSuccess to refetch dashboard data.
    - **Tech:** React, component integration, callbacks
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.17.6 Atomic: Add ResubmitAssessmentButton to dashboard**
    - **Files:** `apps/web/src/app/(app)/blgu/dashboard/page.tsx`
    - **Dependencies:** Task 5.17.2, Story 5.16 must be complete
    - **Acceptance:** Import ResubmitAssessmentButton component. Render if status === REWORK or NEEDS_REWORK. Pass assessmentId and isComplete props. Configure onSuccess to refetch.
    - **Tech:** React, component integration
    - **Time Estimate:** 3 hours
    - **Completed:** 2025-11-09

  - [x] **5.17.7 Atomic: Update backend to support both REWORK and NEEDS_REWORK**
    - **Files:** `apps/api/app/api/v1/blgu_dashboard.py`
    - **Dependencies:** Task 5.17.2 must be complete
    - **Acceptance:** Backend endpoint checks for both REWORK and NEEDS_REWORK status when returning rework_comments. Ensures backward compatibility.
    - **Tech:** Python, FastAPI, enum handling
    - **Time Estimate:** 1 hour
    - **Completed:** 2025-11-09

- [x] **5.18 Story: Form Page Integration for Locked State** ✅
  - Update form page to check submission status
  - Disable all form inputs if status is SUBMITTED or IN_REVIEW or COMPLETED
  - Show LockedAssessmentBanner at top of page
  - Hide save buttons when locked
  - Allow editing only when status is DRAFT or REWORK
  - Tech stack involved: React, TypeScript, conditional rendering
  - Dependencies: Epic 3 Story 3.15, Story 5.13 must be complete
  - **Completed:** 2025-11-09
  - **Implementation Notes:**
    - Form page fetches assessment status from dashboard endpoint
    - LockedStateBanner displays at top when status requires locking
    - isLocked prop passed through DynamicFormRenderer → SectionRenderer → FieldRenderer
    - All form field components (text, number, textarea, radio, checkbox, date, file) receive disabled prop when locked
    - Save button hidden when assessment is locked

  - [ ] **5.18.1 Atomic: Locate form page component**
    - **Files:** `apps/web/src/app/(app)/blgu/assessment/[id]/page.tsx` (or similar from Epic 3)
    - **Dependencies:** Epic 3 Story 3.15 must be complete
    - **Acceptance:** File located. Component structure reviewed. Currently renders DynamicFormRenderer. Needs lock state integration.
    - **Tech:** Code review, file location
    - **Time Estimate:** 1 hour

  - [ ] **5.18.2 Atomic: Integrate useGetSubmissionStatus in form page**
    - **Files:** `apps/web/src/app/(app)/blgu/assessment/[id]/page.tsx`
    - **Dependencies:** Task 5.18.1, Story 5.10 must be complete
    - **Acceptance:** Import and call useGetSubmissionStatus hook. Extract is_locked, status from response. Pass to child components.
    - **Tech:** React, TanStack Query
    - **Time Estimate:** 3 hours

  - [ ] **5.18.3 Atomic: Add LockedAssessmentBanner to form page**
    - **Files:** `apps/web/src/app/(app)/blgu/assessment/[id]/page.tsx`
    - **Dependencies:** Task 5.18.2, Story 5.13 must be complete
    - **Acceptance:** Import LockedAssessmentBanner. Render at top of page if is_locked === true. Banner sticky positioned above form.
    - **Tech:** React, component integration
    - **Time Estimate:** 2 hours

  - [ ] **5.18.4 Atomic: Pass is_locked prop to DynamicFormRenderer**
    - **Files:** `apps/web/src/app/(app)/blgu/assessment/[id]/page.tsx`, `apps/web/src/components/features/assessments/form/DynamicFormRenderer.tsx`
    - **Dependencies:** Task 5.18.2, Epic 3 must be complete
    - **Acceptance:** Add is_locked prop to DynamicFormRenderer props interface. Pass is_locked from submission status to DynamicFormRenderer. Component accepts and stores prop.
    - **Tech:** React, props passing
    - **Time Estimate:** 2 hours

  - [ ] **5.18.5 Atomic: Disable all form inputs when locked**
    - **Files:** `apps/web/src/components/features/assessments/form/DynamicFormRenderer.tsx`
    - **Dependencies:** Task 5.18.4 must be complete
    - **Acceptance:** In DynamicFormRenderer, if is_locked === true, add disabled prop to all form fields. Text inputs, selects, radios, checkboxes all disabled. Form becomes read-only.
    - **Tech:** React, conditional props, form state
    - **Time Estimate:** 4 hours

  - [ ] **5.18.6 Atomic: Hide save buttons when locked**
    - **Files:** `apps/web/src/components/features/assessments/form/DynamicFormRenderer.tsx`
    - **Dependencies:** Task 5.18.4 must be complete
    - **Acceptance:** If is_locked === true, hide Save, Save & Next, Submit buttons. Only show navigation (if applicable). No way for BLGU to save changes to locked assessment.
    - **Tech:** React, conditional rendering
    - **Time Estimate:** 2 hours

  - [ ] **5.18.7 Atomic: Disable file upload when locked**
    - **Files:** `apps/web/src/components/features/assessments/form/FileFieldComponent.tsx` (from Epic 4)
    - **Dependencies:** Task 5.18.4, Epic 4 Story 4.15 must be complete
    - **Acceptance:** FileFieldComponent receives is_locked or assessmentStatus prop. If locked, disable file uploads and deletes (already implemented in Epic 4 Story 4.17). Verify integration works.
    - **Tech:** React, props passing, Epic 4 integration
    - **Time Estimate:** 2 hours

  - [ ] **5.18.8 Atomic: Test form page with DRAFT assessment**
    - **Files:** Manual testing in browser
    - **Dependencies:** Tasks 5.18.1-5.18.7 must be complete
    - **Acceptance:** Manual test: navigate to form page with DRAFT assessment. All inputs enabled. Save buttons visible. File uploads work. Form is fully editable.
    - **Tech:** Manual testing
    - **Time Estimate:** 2 hours

  - [ ] **5.18.9 Atomic: Test form page with SUBMITTED assessment**
    - **Files:** Manual testing in browser
    - **Dependencies:** Tasks 5.18.1-5.18.7 must be complete
    - **Acceptance:** Manual test: form page with SUBMITTED assessment. Locked banner shows. All inputs disabled. Save buttons hidden. File uploads disabled. Form is read-only.
    - **Tech:** Manual testing
    - **Time Estimate:** 3 hours

  - [ ] **5.18.10 Atomic: Test form page with REWORK assessment**
    - **Files:** Manual testing in browser
    - **Dependencies:** Tasks 5.18.1-5.18.7 must be complete
    - **Acceptance:** Manual test: form page with REWORK assessment. No locked banner. All inputs enabled. Save buttons visible. Form is editable. BLGU can address rework feedback.
    - **Tech:** Manual testing
    - **Time Estimate:** 3 hours

- [ ] **5.19 Story: Notification Integration for Workflow Events** ⚠️ **DEFERRED - PLACEHOLDER**
  - Send email notification to assessor when assessment is submitted
  - Send email notification to BLGU when rework is requested
  - Send email notification to assessor when assessment is resubmitted
  - Use Celery background task for email sending
  - Tech stack involved: Celery, email templates, notification service
  - Dependencies: Stories 5.5, 5.6, 5.7 must be complete

  - [ ] **5.19.1 Atomic: Document notification requirements**
    - **Files:** `docs/workflows/submission-notifications.md` (NEW)
    - **Dependencies:** None
    - **Acceptance:** Create documentation file outlining notification requirements: when to send, recipient, email template content, trigger points. Placeholder for future implementation.
    - **Tech:** Documentation, Markdown
    - **Time Estimate:** 2 hours

  - [ ] **5.19.2 Atomic: Create placeholder notification service calls**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Stories 5.5, 5.6, 5.7 must be complete (placeholders already added)
    - **Acceptance:** Review placeholder notification calls in submit, request-rework, resubmit endpoints. Add TODO comments with specific requirements. Defer actual implementation.
    - **Tech:** Code review, TODO comments
    - **Time Estimate:** 1 hour

  - [ ] **5.19.3 Atomic: Mark Epic 5 complete without notification implementation**
    - **Files:** This task file
    - **Dependencies:** Tasks 5.19.1-5.19.2 must be complete
    - **Acceptance:** Notification integration documented and deferred. Placeholders in place. Epic 5 can be marked complete. Notifications to be implemented in future sprint.
    - **Tech:** Project planning
    - **Time Estimate:** 1 hour

- [x] **5.20 Story: Rework Count Enforcement** ✅
  - Enforce rework_count <= 1 in backend API endpoints
  - Show error message if rework limit exceeded
  - Display "Rework limit reached" message in assessor UI
  - Prevent RequestReworkForm from being used if limit reached
  - Tech stack involved: Backend validation, frontend conditional UI
  - Dependencies: Stories 5.6, 5.15 must be complete
  - **Completed:** 2025-11-09
  - **Implementation Notes:**
    - Backend enforcement already implemented in Story 5.6 (request-rework endpoint validates rework_count < 1)
    - Frontend UI already implemented in Story 5.15 Task 5.15.7 (RequestReworkForm disables when reworkCount >= 1)
    - Database constraint enforced via CHECK constraint and SQLAlchemy validation
    - All requirements met through earlier story implementations

  - [x] **5.20.1 Atomic: Verify rework_count enforcement in backend**
    - **Files:** `apps/api/app/api/v1/assessments.py`
    - **Dependencies:** Story 5.6 must be complete (Task 5.6.5)
    - **Acceptance:** Review Task 5.6.5 implementation. Verify request-rework endpoint checks rework_count < 1 before allowing. Returns 400 error if limit exceeded. If implemented, mark complete.
    - **Tech:** Code review
    - **Time Estimate:** 1 hour
    - **Completed:** 2025-11-09 (verified - already implemented in Story 5.6)

  - [x] **5.20.2 Atomic: Verify rework limit UI in RequestReworkForm**
    - **Files:** `apps/web/src/components/features/assessor/RequestReworkForm.tsx`
    - **Dependencies:** Story 5.15 must be complete (Task 5.15.7)
    - **Acceptance:** Review Task 5.15.7 implementation. Verify form disabled when reworkCount >= 1. Alert shows "Rework limit reached". If implemented, mark complete.
    - **Tech:** Code review
    - **Time Estimate:** 1 hour
    - **Completed:** 2025-11-09 (verified - already implemented in Story 5.15)

- [ ] **5.21 Story: Testing & Validation** ⚠️ **REQUIRED BEFORE NEXT EPIC**
  - Unit test SubmissionValidationService with complete/incomplete assessments
  - Test backend submission endpoint with validation errors
  - Test rework request endpoint with role-based access control
  - Test rework_count enforcement (cannot exceed 1)
  - Test resubmission endpoint after rework
  - Component test for SubmissionValidation with various validation states
  - Component test for SubmitAssessmentButton with confirmation dialog
  - Component test for RequestReworkForm with required comments field
  - Integration test: BLGU submits, assessor requests rework, BLGU resubmits
  - Integration test: locked state disables form editing
  - E2E test: full submission and rework cycle
  - Test notification sending for submission events
  - Tech stack involved: Pytest, Vitest, React Testing Library, Playwright, email testing
  - Dependencies: All implementation stories 5.1-5.20 must be complete

  - [ ] **5.21.1 Atomic: Review SubmissionValidationService tests**
    - **Files:** `apps/api/tests/services/test_submission_validation_service.py`
    - **Dependencies:** Story 5.4 must be complete (Tasks 5.4.7-5.4.11)
    - **Acceptance:** Review existing tests from Tasks 5.4.7-5.4.11. Verify tests cover: complete assessment, incomplete indicators, missing MOVs, combined validation. If complete, mark done.
    - **Tech:** Pytest, code review
    - **Time Estimate:** 2 hours

  - [ ] **5.21.2 Atomic: Review backend submission endpoint tests**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Story 5.5 must be complete (Tasks 5.5.8-5.5.10)
    - **Acceptance:** Review tests from Tasks 5.5.8-5.5.10. Verify tests cover: valid submission, validation errors, authorization. If complete, mark done.
    - **Tech:** Pytest, code review
    - **Time Estimate:** 2 hours

  - [ ] **5.21.3 Atomic: Review rework request endpoint tests**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Story 5.6 must be complete (Tasks 5.6.11-5.6.14)
    - **Acceptance:** Review tests from Tasks 5.6.11-5.6.14. Verify tests cover: valid rework request, rework limit, role-based access, required comments. If complete, mark done.
    - **Tech:** Pytest, code review
    - **Time Estimate:** 2 hours

  - [ ] **5.21.4 Atomic: Review resubmission endpoint tests**
    - **Files:** `apps/api/tests/api/v1/test_assessments.py`
    - **Dependencies:** Story 5.7 must be complete (Tasks 5.7.9-5.7.12)
    - **Acceptance:** Review tests from Tasks 5.7.9-5.7.12. Verify tests cover: valid resubmission, incomplete resubmission, status validation, role validation. If complete, mark done.
    - **Tech:** Pytest, code review
    - **Time Estimate:** 2 hours

  - [ ] **5.21.5 Atomic: Add integration test for complete submission-rework-resubmit cycle**
    - **Files:** `apps/api/tests/api/v1/test_submission_workflow_integration.py` (NEW)
    - **Dependencies:** Stories 5.5, 5.6, 5.7 must be complete
    - **Acceptance:** Integration test: create complete assessment → BLGU submits → status SUBMITTED → assessor requests rework → status REWORK → BLGU resubmits → status SUBMITTED again. Full cycle tested.
    - **Tech:** Pytest, FastAPI TestClient, workflow testing
    - **Time Estimate:** 6 hours

  - [ ] **5.21.6 Atomic: Create SubmissionValidation component test file**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmissionValidation.test.tsx` (NEW)
    - **Dependencies:** Story 5.11 must be complete
    - **Acceptance:** Test file created with Vitest and React Testing Library. Mock useGetSubmissionStatus hook. Render component with test props.
    - **Tech:** Vitest, React Testing Library, mock setup
    - **Time Estimate:** 3 hours

  - [ ] **5.21.7 Atomic: Test SubmissionValidation renders complete state**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmissionValidation.test.tsx`
    - **Dependencies:** Task 5.21.6 must be complete
    - **Acceptance:** Test renders component with all indicators complete and all MOVs uploaded. Verify all checkmarks green. Verify "Ready to Submit" badge shows.
    - **Tech:** Vitest, React Testing Library, render testing
    - **Time Estimate:** 3 hours

  - [ ] **5.21.8 Atomic: Test SubmissionValidation renders incomplete state**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmissionValidation.test.tsx`
    - **Dependencies:** Task 5.21.6 must be complete
    - **Acceptance:** Test renders component with some incomplete indicators. Verify red X icons show. Verify incomplete indicator names listed. Verify "Incomplete" badge shows.
    - **Tech:** Vitest, React Testing Library
    - **Time Estimate:** 3 hours

  - [ ] **5.21.9 Atomic: Create SubmitAssessmentButton component test file**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmitAssessmentButton.test.tsx` (NEW)
    - **Dependencies:** Story 5.12 must be complete
    - **Acceptance:** Test file created. Mock useSubmitAssessment hook. Render component with test props.
    - **Tech:** Vitest, React Testing Library, mock setup
    - **Time Estimate:** 3 hours

  - [ ] **5.21.10 Atomic: Test SubmitAssessmentButton shows confirmation dialog**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmitAssessmentButton.test.tsx`
    - **Dependencies:** Task 5.21.9 must be complete
    - **Acceptance:** Test clicks Submit button. Verify confirmation dialog opens. Verify dialog shows warning about no edits after submission. Click Cancel, verify dialog closes without calling mutation.
    - **Tech:** Vitest, React Testing Library, user events, modal testing
    - **Time Estimate:** 4 hours

  - [ ] **5.21.11 Atomic: Test SubmitAssessmentButton calls mutation on confirm**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmitAssessmentButton.test.tsx`
    - **Dependencies:** Task 5.21.9 must be complete
    - **Acceptance:** Test clicks Submit, opens dialog, clicks Confirm. Verify useSubmitAssessment mutation called with correct assessmentId. Verify success toast appears.
    - **Tech:** Vitest, React Testing Library, mock assertions
    - **Time Estimate:** 4 hours

  - [ ] **5.21.12 Atomic: Test SubmitAssessmentButton disabled when incomplete**
    - **Files:** `apps/web/src/components/features/assessments/submission/SubmitAssessmentButton.test.tsx`
    - **Dependencies:** Task 5.21.9 must be complete
    - **Acceptance:** Test renders button with validationResult.is_valid = false. Verify button is disabled. Verify tooltip shows "Complete all indicators...".
    - **Tech:** Vitest, React Testing Library, tooltip testing
    - **Time Estimate:** 3 hours

  - [ ] **5.21.13 Atomic: Create RequestReworkForm component test file**
    - **Files:** `apps/web/src/components/features/assessor/RequestReworkForm.test.tsx` (NEW)
    - **Dependencies:** Story 5.15 must be complete
    - **Acceptance:** Test file created. Mock useRequestRework hook. Render component with test props.
    - **Tech:** Vitest, React Testing Library, mock setup
    - **Time Estimate:** 3 hours

  - [ ] **5.21.14 Atomic: Test RequestReworkForm requires comments**
    - **Files:** `apps/web/src/components/features/assessor/RequestReworkForm.test.tsx`
    - **Dependencies:** Task 5.21.13 must be complete
    - **Acceptance:** Test renders form. Submit button disabled initially. Type short comment (< 10 chars), button still disabled. Type valid comment (>= 10 chars), button enabled.
    - **Tech:** Vitest, React Testing Library, user events, validation
    - **Time Estimate:** 4 hours

  - [ ] **5.21.15 Atomic: Test RequestReworkForm disabled when rework limit reached**
    - **Files:** `apps/web/src/components/features/assessor/RequestReworkForm.test.tsx`
    - **Dependencies:** Task 5.21.13 must be complete
    - **Acceptance:** Test renders form with reworkCount = 1. Verify entire form disabled. Verify alert shows "Rework limit reached".
    - **Tech:** Vitest, React Testing Library, conditional rendering
    - **Time Estimate:** 3 hours

  - [ ] **5.21.16 Atomic: Create E2E test for submission workflow**
    - **Files:** `apps/web/tests/e2e/submission-workflow.spec.ts` (NEW)
    - **Dependencies:** Stories 5.5-5.18 must be complete
    - **Acceptance:** E2E test file created using Playwright. Test setup: login as BLGU user, create complete assessment.
    - **Tech:** Playwright, E2E test setup
    - **Time Estimate:** 3 hours

  - [ ] **5.21.17 Atomic: E2E test: BLGU submits assessment**
    - **Files:** `apps/web/tests/e2e/submission-workflow.spec.ts`
    - **Dependencies:** Task 5.21.16 must be complete
    - **Acceptance:** E2E test: BLGU navigates to dashboard, sees validation complete, clicks Submit, confirms dialog, submission succeeds. Verify locked banner appears. Verify status badge shows SUBMITTED.
    - **Tech:** Playwright, user interactions, assertions
    - **Time Estimate:** 5 hours

  - [ ] **5.21.18 Atomic: E2E test: Assessor requests rework**
    - **Files:** `apps/web/tests/e2e/submission-workflow.spec.ts`
    - **Dependencies:** Task 5.21.17 must be complete
    - **Acceptance:** E2E test: login as ASSESSOR, navigate to submitted assessment, fill rework comments, request rework. Verify status changes to REWORK. Verify notification sent (check placeholder).
    - **Tech:** Playwright, role switching, workflow testing
    - **Time Estimate:** 6 hours

  - [ ] **5.21.19 Atomic: E2E test: BLGU sees rework and resubmits**
    - **Files:** `apps/web/tests/e2e/submission-workflow.spec.ts`
    - **Dependencies:** Task 5.21.18 must be complete
    - **Acceptance:** E2E test: login as BLGU, see rework comments panel, verify form unlocked, make edits, click Resubmit, confirm. Verify status changes to SUBMITTED. Verify rework_count = 1.
    - **Tech:** Playwright, full cycle testing
    - **Time Estimate:** 6 hours

  - [ ] **5.21.20 Atomic: E2E test: Assessor cannot request second rework**
    - **Files:** `apps/web/tests/e2e/submission-workflow.spec.ts`
    - **Dependencies:** Task 5.21.19 must be complete
    - **Acceptance:** E2E test: login as ASSESSOR, try to request rework again on resubmitted assessment. Verify form disabled. Verify "Rework limit reached" message. Backend rejects with 400 error.
    - **Tech:** Playwright, limit enforcement testing
    - **Time Estimate:** 4 hours

  - [ ] **5.21.21 Atomic: E2E test: Locked state prevents editing**
    - **Files:** `apps/web/tests/e2e/submission-workflow.spec.ts`
    - **Dependencies:** Task 5.21.17 must be complete
    - **Acceptance:** E2E test: with SUBMITTED assessment, navigate to form page. Verify locked banner shows. Verify all inputs disabled. Attempt to type in field, verify no change. Verify save buttons hidden.
    - **Tech:** Playwright, locked state testing
    - **Time Estimate:** 4 hours

  - [ ] **5.21.22 Atomic: Verify all Epic 5 tests pass in CI**
    - **Files:** CI pipeline configuration
    - **Dependencies:** All tasks 5.21.1-5.21.21 must be complete
    - **Acceptance:** Run full test suite: `pnpm test`. All backend tests pass (pytest). All frontend tests pass (vitest). All E2E tests pass (playwright). No test failures. Coverage meets thresholds.
    - **Tech:** CI/CD, test orchestration
    - **Time Estimate:** 3 hours

## Key Workflow States

### Assessment Status Flow
```
DRAFT (initial state)
  ↓ (BLGU submits)
SUBMITTED (locked for BLGU, assessor can review)
  ↓ (assessor requests rework - max 1 time)
REWORK (unlocked for BLGU, rework_count = 1)
  ↓ (BLGU resubmits)
SUBMITTED (locked again, assessor can finalize)
  ↓ (assessor completes validation)
IN_REVIEW / COMPLETED
```

### Rework Rules
- Only **one rework cycle** allowed (rework_count max = 1)
- Rework can only be requested by ASSESSOR or VALIDATOR roles
- Rework comments are **required** when requesting rework
- BLGU can only resubmit if status is REWORK
- After resubmission, no further rework is allowed

### Locked State Rules
- Assessment is **locked** when status is SUBMITTED, IN_REVIEW, or COMPLETED
- Assessment is **unlocked** when status is DRAFT or REWORK
- Locked assessments cannot be edited by BLGU users
- File uploads/deletes are disabled when locked

## Dependencies for Next Epic

Epic 6.0 (Testing & Integration) depends on:
- Story 5.3: Assessment model updates must be complete
- Story 5.10: Type generation must be complete
- Story 5.17: Dashboard integration must be complete
- Story 5.18: Form page integration must be complete
- Story 5.21: All testing must pass

## Total Atomic Tasks: 155

**Epic 5 Summary:**
- 21 Stories
- 155 Atomic Tasks
- Estimated Time: ~420 hours (10-11 weeks for 1 developer)
