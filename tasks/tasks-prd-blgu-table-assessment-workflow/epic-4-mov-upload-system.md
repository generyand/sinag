# Epic 4.0: MOV Upload System

**PRD Reference:** FR-4.1, FR-4.2, FR-4.3 - File upload to Supabase Storage, file type/size validation, drag-and-drop interface, permission-based upload/delete

**Objective:** Implement a robust Means of Verification (MOV) upload system integrated with Supabase Storage, supporting multiple file types, drag-and-drop functionality, file validation, and permission-based access control for upload and deletion.

## Stories

### Three-Tier Structure: Epic → Story → Atomic

- [x] **4.1 Story: Supabase Storage Bucket Configuration** ✅
  - Create dedicated Supabase Storage bucket for MOV files
  - Configure bucket policies for BLGU and assessor access
  - Set up row-level security (RLS) policies for file access
  - Define storage path structure: `{assessment_id}/{indicator_id}/{file_name}`
  - Tech stack involved: Supabase Storage, PostgreSQL RLS policies
  - Dependencies: None (can be done independently)

  - [x] **4.1.1 Atomic: Create Supabase Storage bucket via Supabase dashboard**
    - **Files:** Supabase dashboard configuration (no code files)
    - **Dependencies:** None
    - **Acceptance:** Storage bucket named "mov-files" created in Supabase. Bucket is set to private (not public). Bucket visible in Supabase Storage dashboard.
    - **Tech:** Supabase Storage, dashboard configuration
    - **Time Estimate:** 1 hour

  - [x] **4.1.2 Atomic: Configure bucket privacy and CORS settings**
    - **Files:** Supabase dashboard configuration
    - **Dependencies:** Task 4.1.1 must be complete
    - **Acceptance:** Bucket set to private access. CORS configured to allow uploads from frontend domain (localhost:3000 for development, production domain for production). CORS headers allow multipart uploads.
    - **Tech:** Supabase Storage, CORS configuration
    - **Time Estimate:** 2 hours

  - [x] **4.1.3 Atomic: Define RLS policies for file access**
    - **Files:** Supabase SQL editor or migration script
    - **Dependencies:** Task 4.1.2 must be complete
    - **Acceptance:** RLS policies created: BLGU users can upload/delete files for their own assessments. Assessors can read all files. Validators can read files for their assigned governance areas. Policies tested with different user roles.
    - **Tech:** PostgreSQL RLS, Supabase policies, SQL
    - **Time Estimate:** 4 hours

  - [x] **4.1.4 Atomic: Test file upload and access with different user roles**
    - **Files:** Manual testing or test script
    - **Dependencies:** Task 4.1.3 must be complete
    - **Acceptance:** BLGU user can upload file to their assessment folder. Assessor can download BLGU's file. BLGU user cannot access other BLGU's files. Validator can access files for assigned areas only.
    - **Tech:** Supabase Storage API, manual testing, role-based testing
    - **Time Estimate:** 3 hours

- [x] **4.2 Story: Database Schema for MOV Files** ✅
  - Create `mov_files` table with columns: id, assessment_id, indicator_id, file_name, file_url, file_type, file_size, uploaded_by, uploaded_at
  - Create Alembic migration for new table
  - Add foreign key relationships to assessments and indicators
  - Tech stack involved: SQLAlchemy, Alembic, PostgreSQL
  - Dependencies: None (can be done independently)

  - [x] **4.2.1 Atomic: Create Alembic migration file for mov_files table**
    - **Files:** `apps/api/alembic/versions/xxxx_create_mov_files_table.py` (NEW)
    - **Dependencies:** None
    - **Acceptance:** Migration file created with `alembic revision --autogenerate -m "create mov_files table"`. File contains upgrade and downgrade functions.
    - **Tech:** Alembic, SQLAlchemy
    - **Time Estimate:** 2 hours

  - [x] **4.2.2 Atomic: Define upgrade function to create mov_files table**
    - **Files:** `apps/api/alembic/versions/xxxx_create_mov_files_table.py`
    - **Dependencies:** Task 4.2.1 must be complete
    - **Acceptance:** Upgrade function creates mov_files table with columns: id (UUID, primary key), assessment_id (Integer, FK), indicator_id (Integer, FK), file_name (String), file_url (String), file_type (String), file_size (Integer), uploaded_by (Integer, FK to users), uploaded_at (DateTime), deleted_at (DateTime, nullable for soft delete).
    - **Tech:** Alembic op.create_table(), PostgreSQL, SQLAlchemy Column types
    - **Time Estimate:** 4 hours

  - [x] **4.2.3 Atomic: Add foreign key constraints for assessment_id, indicator_id, uploaded_by**
    - **Files:** `apps/api/alembic/versions/xxxx_create_mov_files_table.py`
    - **Dependencies:** Task 4.2.2 must be complete
    - **Acceptance:** Foreign keys created: assessment_id → assessments.id (CASCADE delete), indicator_id → indicators.id (CASCADE delete), uploaded_by → users.id (SET NULL on delete). Constraints named explicitly.
    - **Tech:** Alembic ForeignKeyConstraint, PostgreSQL foreign keys
    - **Time Estimate:** 3 hours

  - [x] **4.2.4 Atomic: Add indexes for query performance**
    - **Files:** `apps/api/alembic/versions/xxxx_create_mov_files_table.py`
    - **Dependencies:** Task 4.2.3 must be complete
    - **Acceptance:** Indexes created: idx_mov_files_assessment_id, idx_mov_files_indicator_id, idx_mov_files_uploaded_by, idx_mov_files_deleted_at. Indexes improve query performance for file listing.
    - **Tech:** Alembic op.create_index(), PostgreSQL indexes
    - **Time Estimate:** 2 hours

  - [x] **4.2.5 Atomic: Define downgrade function to drop mov_files table**
    - **Files:** `apps/api/alembic/versions/xxxx_create_mov_files_table.py`
    - **Dependencies:** Task 4.2.4 must be complete
    - **Acceptance:** Downgrade function drops indexes, drops foreign keys, drops table. Migration rollback succeeds with `alembic downgrade -1`.
    - **Tech:** Alembic op.drop_table(), op.drop_index()
    - **Time Estimate:** 2 hours

  - [x] **4.2.6 Atomic: Test migration upgrade and downgrade**
    - **Files:** `apps/api/tests/migrations/test_mov_files_migration.py` (NEW)
    - **Dependencies:** Tasks 4.2.2-4.2.5 must be complete
    - **Acceptance:** Migration applies successfully with `alembic upgrade head`. Table exists with correct columns and constraints. Rollback succeeds. Table is removed after downgrade.
    - **Tech:** Pytest, Alembic, SQLAlchemy inspection
    - **Time Estimate:** 3 hours

- [x] **4.3 Story: SQLAlchemy Model for MOV Files** ✅
  - Create `MOVFile` model in `apps/api/app/db/models/assessment.py`
  - Add relationships to Assessment and Indicator models
  - Include proper type hints and constraints
  - Tech stack involved: SQLAlchemy, Python type hints
  - Dependencies: Story 4.2 must be complete

  - [x] **4.3.1 Atomic: Create MOVFile SQLAlchemy model class**
    - **Files:** `apps/api/app/db/models/assessment.py`
    - **Dependencies:** Story 4.2 must be complete (migration applied)
    - **Acceptance:** MOVFile model class created with __tablename__ = "mov_files". All columns defined: id, assessment_id, indicator_id, file_name, file_url, file_type, file_size, uploaded_by, uploaded_at, deleted_at. Type hints use Optional where applicable.
    - **Tech:** SQLAlchemy declarative base, Column, types, Python type hints
    - **Time Estimate:** 3 hours

  - [x] **4.3.2 Atomic: Add relationship to Assessment model**
    - **Files:** `apps/api/app/db/models/assessment.py`
    - **Dependencies:** Task 4.3.1 must be complete
    - **Acceptance:** MOVFile model has relationship to Assessment: assessment = relationship("Assessment", back_populates="mov_files"). Assessment model has back_populates: mov_files = relationship("MOVFile", back_populates="assessment", cascade="all, delete-orphan").
    - **Tech:** SQLAlchemy relationship(), back_populates, lazy loading
    - **Time Estimate:** 2 hours

  - [x] **4.3.3 Atomic: Add relationship to Indicator model**
    - **Files:** `apps/api/app/db/models/assessment.py`, `apps/api/app/db/models/governance_area.py`
    - **Dependencies:** Task 4.3.1 must be complete
    - **Acceptance:** MOVFile model has relationship to Indicator: indicator = relationship("Indicator"). Indicator model has back_populates: mov_files = relationship("MOVFile", back_populates="indicator").
    - **Tech:** SQLAlchemy relationship()
    - **Time Estimate:** 2 hours

  - [x] **4.3.4 Atomic: Add relationship to User model for uploaded_by**
    - **Files:** `apps/api/app/db/models/assessment.py`
    - **Dependencies:** Task 4.3.1 must be complete
    - **Acceptance:** MOVFile model has relationship to User: uploader = relationship("User", foreign_keys=[uploaded_by]).
    - **Tech:** SQLAlchemy relationship()
    - **Time Estimate:** 2 hours

  - [x] **4.3.5 Atomic: Test MOVFile model and relationships**
    - **Files:** `apps/api/tests/db/models/test_mov_file.py` (NEW)
    - **Dependencies:** Tasks 4.3.1-4.3.4 must be complete
    - **Acceptance:** Unit tests verify MOVFile can be created, saved to database. Relationships load correctly. Foreign keys work. Cascade deletes work (deleting assessment deletes mov_files). All 10 tests pass.
    - **Tech:** Pytest, SQLAlchemy fixtures, test database
    - **Time Estimate:** 4 hours

- [x] **4.4 Story: Backend File Validation Service** ✅
  - Create `FileValidationService` in `apps/api/app/services/file_validation_service.py`
  - Validate file types: PDF, DOCX, XLSX, JPG, PNG, MP4 (video)
  - Validate file size: max 50MB per file
  - Check for malicious file content (basic security checks)
  - Return validation errors with specific messages
  - Tech stack involved: Python, file type detection libraries (python-magic), validation logic
  - Dependencies: None (can be done independently)

  - [x] **4.4.1 Atomic: Create FileValidationService class structure**
    - **Files:** `apps/api/app/services/file_validation_service.py` (NEW)
    - **Dependencies:** None
    - **Acceptance:** Service class created with __init__ method. Method signatures defined: validate_file_type, validate_file_size, validate_file_content, validate_file (main method). Docstrings added.
    - **Tech:** Python classes, Google-style docstrings, type hints
    - **Time Estimate:** 2 hours

  - [x] **4.4.2 Atomic: Implement validate_file_type method**
    - **Files:** `apps/api/app/services/file_validation_service.py`
    - **Dependencies:** Task 4.4.1 must be complete
    - **Acceptance:** Method accepts file and validates MIME type using python-magic or similar. Allowed types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, image/jpeg, image/png, video/mp4. Returns ValidationResult with success/error.
    - **Tech:** Python, python-magic or mimetypes, file type detection
    - **Time Estimate:** 4 hours

  - [x] **4.4.3 Atomic: Implement validate_file_size method**
    - **Files:** `apps/api/app/services/file_validation_service.py`
    - **Dependencies:** Task 4.4.1 must be complete
    - **Acceptance:** Method accepts file and checks size. Max size: 50MB (52,428,800 bytes). Returns ValidationResult with success or error message "File size exceeds 50MB limit".
    - **Tech:** Python, file size checking
    - **Time Estimate:** 2 hours

  - [x] **4.4.4 Atomic: Implement validate_file_content method for basic security**
    - **Files:** `apps/api/app/services/file_validation_service.py`
    - **Dependencies:** Task 4.4.1 must be complete
    - **Acceptance:** Method performs basic security checks: verify file extension matches MIME type, check for executable content in file headers, reject files with suspicious patterns. Returns ValidationResult.
    - **Tech:** Python, file header inspection, basic malware detection
    - **Time Estimate:** 5 hours

  - [x] **4.4.5 Atomic: Implement main validate_file method**
    - **Files:** `apps/api/app/services/file_validation_service.py`
    - **Dependencies:** Tasks 4.4.2-4.4.4 must be complete
    - **Acceptance:** Method accepts file and runs all validation checks: type, size, content. Returns combined ValidationResult. If any validation fails, return first error. If all pass, return success.
    - **Tech:** Python, validation orchestration
    - **Time Estimate:** 3 hours

  - [x] **4.4.6 Atomic: Create Pydantic ValidationResult schema**
    - **Files:** `apps/api/app/schemas/system.py`
    - **Dependencies:** None (can be done in parallel)
    - **Acceptance:** Pydantic schema created: ValidationResult with fields: success (bool), error_message (Optional[str]), error_code (Optional[str]). Schema used by FileValidationService.
    - **Tech:** Pydantic, Python type hints
    - **Time Estimate:** 2 hours

  - [x] **4.4.7 Atomic: Test FileValidationService with valid files**
    - **Files:** `apps/api/tests/services/test_file_validation_service.py` (NEW)
    - **Dependencies:** Tasks 4.4.1-4.4.6 must be complete
    - **Acceptance:** Unit tests with valid PDF, DOCX, XLSX, JPG, PNG, MP4 files. All pass validation. ValidationResult.success is True.
    - **Tech:** Pytest, mock file uploads, test fixtures
    - **Time Estimate:** 4 hours

  - [x] **4.4.8 Atomic: Test FileValidationService with invalid file types**
    - **Files:** `apps/api/tests/services/test_file_validation_service.py`
    - **Dependencies:** Tasks 4.4.1-4.4.6 must be complete
    - **Acceptance:** Unit tests with invalid file types: .exe, .zip, .sh. All fail validation. Error message indicates unsupported file type.
    - **Tech:** Pytest, mock file uploads
    - **Time Estimate:** 3 hours

  - [x] **4.4.9 Atomic: Test FileValidationService with oversized files**
    - **Files:** `apps/api/tests/services/test_file_validation_service.py`
    - **Dependencies:** Tasks 4.4.1-4.4.6 must be complete
    - **Acceptance:** Unit test with file > 50MB. Validation fails with error message "File size exceeds 50MB limit".
    - **Tech:** Pytest, mock large file
    - **Time Estimate:** 2 hours

  - [x] **4.4.10 Atomic: Export FileValidationService singleton instance**
    - **Files:** `apps/api/app/services/file_validation_service.py`
    - **Dependencies:** Task 4.4.5 must be complete
    - **Acceptance:** Singleton instance created at bottom of file: file_validation_service = FileValidationService(). Instance exported for use in routers.
    - **Tech:** Python singleton pattern
    - **Time Estimate:** 1 hour

- [x] **4.5 Story: Backend File Upload Service** ✅
  - Create `StorageService` methods for file upload in `apps/api/app/services/storage_service.py`
  - Implement `upload_mov_file(file, assessment_id, indicator_id, user_id)` method
  - Generate unique file names to prevent collisions
  - Upload files to Supabase Storage with proper metadata
  - Return file URL and metadata (size, type, upload timestamp)
  - Tech stack involved: Python, Supabase Storage SDK, file handling
  - Dependencies: Story 4.1 must be complete

  - [x] **4.5.1 Atomic: Update StorageService class with file upload dependencies**
    - **Files:** `apps/api/app/services/storage_service.py`
    - **Dependencies:** Story 4.1 must be complete (bucket exists)
    - **Acceptance:** StorageService class updated with Supabase Storage client initialization. Import supabase storage client. Add bucket_name constant: "mov-files".
    - **Tech:** Python, Supabase Storage SDK, class initialization
    - **Time Estimate:** 2 hours

  - [x] **4.5.2 Atomic: Implement generate_unique_filename helper method**
    - **Files:** `apps/api/app/services/storage_service.py`
    - **Dependencies:** Task 4.5.1 must be complete
    - **Acceptance:** Helper method accepts original filename, returns unique filename using UUID prefix: f"{uuid4()}_{sanitized_filename}". Sanitizes filename to remove unsafe characters. Preserves file extension.
    - **Tech:** Python, uuid, string sanitization
    - **Time Estimate:** 3 hours

  - [x] **4.5.3 Atomic: Implement get_storage_path helper method**
    - **Files:** `apps/api/app/services/storage_service.py`
    - **Dependencies:** Task 4.5.1 must be complete
    - **Acceptance:** Helper method accepts assessment_id, indicator_id, filename. Returns storage path: f"{assessment_id}/{indicator_id}/{filename}". Path structure matches Supabase bucket organization.
    - **Tech:** Python, string formatting
    - **Time Estimate:** 2 hours

  - [x] **4.5.4 Atomic: Implement upload_mov_file method**
    - **Files:** `apps/api/app/services/storage_service.py`
    - **Dependencies:** Tasks 4.5.2, 4.5.3 must be complete
    - **Acceptance:** Method accepts file (UploadFile), assessment_id, indicator_id, user_id. Generates unique filename. Gets storage path. Uploads file to Supabase Storage using storage client. Returns file URL, file metadata (size, type, name). Handles upload errors with exceptions.
    - **Tech:** Python, Supabase Storage SDK, FastAPI UploadFile, async/await
    - **Time Estimate:** 5 hours

  - [x] **4.5.5 Atomic: Implement save_mov_file_record method**
    - **Files:** `apps/api/app/services/storage_service.py`
    - **Dependencies:** Task 4.5.4, Story 4.3 must be complete (MOVFile model exists)
    - **Acceptance:** Method accepts db session, file_url, file_metadata, assessment_id, indicator_id, user_id. Creates MOVFile database record. Saves to database. Returns MOVFile instance. Handles database errors.
    - **Tech:** Python, SQLAlchemy, MOVFile model
    - **Time Estimate:** 4 hours

  - [x] **4.5.6 Atomic: Integrate upload_mov_file with save_mov_file_record**
    - **Files:** `apps/api/app/services/storage_service.py`
    - **Dependencies:** Tasks 4.5.4, 4.5.5 must be complete
    - **Acceptance:** upload_mov_file method now accepts db session. After uploading to Supabase, calls save_mov_file_record. Returns MOVFile instance with complete data. Transaction rolled back if Supabase upload succeeds but DB save fails.
    - **Tech:** Python, transaction management, error handling
    - **Time Estimate:** 4 hours

  - [x] **4.5.7 Atomic: Test upload_mov_file with valid file**
    - **Files:** `apps/api/tests/services/test_storage_service.py`
    - **Dependencies:** Task 4.5.6 must be complete
    - **Acceptance:** Unit test uploads valid PDF file. File appears in Supabase Storage. MOVFile record created in database. Returned file URL is accessible. Metadata is correct.
    - **Tech:** Pytest, mock Supabase client, test database, mock file
    - **Time Estimate:** 5 hours

  - [x] **4.5.8 Atomic: Test upload_mov_file handles Supabase upload failure**
    - **Files:** `apps/api/tests/services/test_storage_service.py`
    - **Dependencies:** Task 4.5.6 must be complete
    - **Acceptance:** Unit test with mocked Supabase failure. Method raises appropriate exception. Database record is not created. No orphaned records.
    - **Tech:** Pytest, mock exceptions, error testing
    - **Time Estimate:** 3 hours

- [x] **4.6 Story: Backend File Deletion Service** ✅
  - Add `delete_mov_file(file_id, user_id)` method to StorageService
  - Check user permissions before deletion (BLGU can delete only if assessment not submitted)
  - Delete file from Supabase Storage
  - Delete file record from database
  - Tech stack involved: Python, Supabase Storage SDK, permission checks
  - Dependencies: Story 4.2 must be complete

  - [x] **4.6.1 Atomic: Implement delete_file_from_storage helper method**
    - **Files:** `apps/api/app/services/storage_service.py`
    - **Dependencies:** Task 4.5.1 must be complete (storage client exists)
    - **Acceptance:** Helper method accepts storage path. Deletes file from Supabase Storage using storage client. Returns success/failure. Handles errors gracefully (file not found, permission denied).
    - **Tech:** Python, Supabase Storage SDK, error handling
    - **Time Estimate:** 3 hours

  - [x] **4.6.2 Atomic: Implement check_delete_permission helper method**
    - **Files:** `apps/api/app/services/storage_service.py`
    - **Dependencies:** Story 4.3 must be complete (MOVFile model exists)
    - **Acceptance:** Helper method accepts db session, file_id, user_id. Loads MOVFile from database. Checks: user is uploader AND assessment status is DRAFT or REWORK. Returns True if allowed, False otherwise. Assessors cannot delete (read-only).
    - **Tech:** Python, SQLAlchemy query, permission logic
    - **Time Estimate:** 4 hours

  - [x] **4.6.3 Atomic: Implement delete_mov_file method**
    - **Files:** `apps/api/app/services/storage_service.py`
    - **Dependencies:** Tasks 4.6.1, 4.6.2 must be complete
    - **Acceptance:** Method accepts db session, file_id, user_id. Checks permissions using check_delete_permission. If allowed, deletes from Supabase using delete_file_from_storage. Soft deletes database record (sets deleted_at timestamp). Returns success/error. Raises PermissionError if not allowed.
    - **Tech:** Python, soft delete pattern, permissions
    - **Time Estimate:** 4 hours

  - [x] **4.6.4 Atomic: Test delete_mov_file with authorized BLGU user**
    - **Files:** `apps/api/tests/services/test_storage_service.py`
    - **Dependencies:** Task 4.6.3 must be complete
    - **Acceptance:** Unit test with BLGU user deleting their own file from DRAFT assessment. File deleted from Supabase. Database record soft deleted (deleted_at set). Test passes.
    - **Tech:** Pytest, mock Supabase client, test database
    - **Time Estimate:** 4 hours

  - [x] **4.6.5 Atomic: Test delete_mov_file rejects BLGU user for submitted assessment**
    - **Files:** `apps/api/tests/services/test_storage_service.py`
    - **Dependencies:** Task 4.6.3 must be complete
    - **Acceptance:** Unit test with BLGU user attempting to delete file from SUBMITTED assessment. Method raises PermissionError. File not deleted. Database record unchanged.
    - **Tech:** Pytest, permission testing, exception testing
    - **Time Estimate:** 3 hours

  - [x] **4.6.6 Atomic: Test delete_mov_file rejects assessor deletion**
    - **Files:** `apps/api/tests/services/test_storage_service.py`
    - **Dependencies:** Task 4.6.3 must be complete
    - **Acceptance:** Unit test with ASSESSOR user attempting to delete file. Method raises PermissionError. Assessors have read-only access. File not deleted.
    - **Tech:** Pytest, role-based testing
    - **Time Estimate:** 3 hours

- [x] **4.7 Story: Backend API for File Upload** ✅
  - Create `POST /api/v1/assessments/{assessment_id}/indicators/{indicator_id}/upload` endpoint
  - Accept multipart/form-data file upload
  - Use FileValidationService to validate file
  - Use StorageService to upload file to Supabase
  - Save file metadata to mov_files table
  - Return file URL and metadata
  - Tech stack involved: FastAPI, Pydantic, file upload handling
  - Dependencies: Stories 4.2, 4.3, 4.4, 4.5 must be complete

  - [x] **4.7.1 Atomic: Create movs.py router file**
    - **Files:** `apps/api/app/api/v1/movs.py` (NEW)
    - **Dependencies:** None
    - **Acceptance:** Router file created with APIRouter instance. Router tagged with "movs" for Orval organization. Basic structure in place.
    - **Tech:** FastAPI APIRouter
    - **Time Estimate:** 1 hour

  - [x] **4.7.2 Atomic: Implement POST upload endpoint structure**
    - **Files:** `apps/api/app/api/v1/movs.py`
    - **Dependencies:** Task 4.7.1 must be complete
    - **Acceptance:** Endpoint defined: @router.post("/assessments/{assessment_id}/indicators/{indicator_id}/upload", tags=["movs"]). Accepts path params: assessment_id, indicator_id. Accepts file: UploadFile. Dependencies: get_db, get_current_user. Returns 201 status code.
    - **Tech:** FastAPI, dependency injection, path parameters
    - **Time Estimate:** 3 hours

  - [x] **4.7.3 Atomic: Integrate FileValidationService in upload endpoint**
    - **Files:** `apps/api/app/api/v1/movs.py`
    - **Dependencies:** Task 4.7.2, Story 4.4 must be complete
    - **Acceptance:** Endpoint calls file_validation_service.validate_file(file). If validation fails, returns 400 Bad Request with error message from ValidationResult. If validation passes, continues to upload.
    - **Tech:** FastAPI, service integration, error responses
    - **Time Estimate:** 3 hours

  - [x] **4.7.4 Atomic: Integrate StorageService upload in endpoint**
    - **Files:** `apps/api/app/api/v1/movs.py`
    - **Dependencies:** Task 4.7.3, Story 4.5 must be complete
    - **Acceptance:** After validation, endpoint calls storage_service.upload_mov_file(db, file, assessment_id, indicator_id, user.id). Returns MOVFile data. Handles exceptions with 500 Internal Server Error.
    - **Tech:** FastAPI, service integration, exception handling
    - **Time Estimate:** 4 hours

  - [x] **4.7.5 Atomic: Create MOVFileResponse Pydantic schema**
    - **Files:** `apps/api/app/schemas/assessment.py`
    - **Dependencies:** None (can be done in parallel)
    - **Acceptance:** Pydantic schema created: MOVFileResponse with fields: id, assessment_id, indicator_id, file_name, file_url, file_type, file_size, uploaded_by, uploaded_at. Config: orm_mode = True. Schema used for API response.
    - **Tech:** Pydantic, Python type hints, ORM mode
    - **Time Estimate:** 2 hours

  - [x] **4.7.6 Atomic: Use MOVFileResponse in upload endpoint return type**
    - **Files:** `apps/api/app/api/v1/movs.py`
    - **Dependencies:** Tasks 4.7.4, 4.7.5 must be complete
    - **Acceptance:** Endpoint return type is MOVFileResponse. Response model configured in decorator: response_model=MOVFileResponse. Orval generates correct TypeScript type.
    - **Tech:** FastAPI response models, Pydantic
    - **Time Estimate:** 2 hours

  - [x] **4.7.7 Atomic: Test upload endpoint with valid file**
    - **Files:** `apps/api/tests/api/v1/test_movs.py` (NEW)
    - **Dependencies:** Tasks 4.7.1-4.7.6 must be complete
    - **Acceptance:** Integration test uploads valid PDF file. Returns 201 status. Response contains file URL and metadata. File exists in Supabase. Database record created.
    - **Tech:** Pytest, FastAPI TestClient, multipart upload, test database
    - **Time Estimate:** 5 hours

  - [x] **4.7.8 Atomic: Test upload endpoint rejects invalid file type**
    - **Files:** `apps/api/tests/api/v1/test_movs.py`
    - **Dependencies:** Tasks 4.7.1-4.7.6 must be complete
    - **Acceptance:** Integration test uploads .exe file. Returns 400 Bad Request. Error message indicates unsupported file type. No file uploaded to Supabase.
    - **Tech:** Pytest, FastAPI TestClient, validation testing
    - **Time Estimate:** 3 hours

  - [x] **4.7.9 Atomic: Test upload endpoint rejects oversized file**
    - **Files:** `apps/api/tests/api/v1/test_movs.py`
    - **Dependencies:** Tasks 4.7.1-4.7.6 must be complete
    - **Acceptance:** Integration test uploads 60MB file. Returns 400 Bad Request. Error message indicates file size limit exceeded. No file uploaded.
    - **Tech:** Pytest, large file testing
    - **Time Estimate:** 3 hours

  - [x] **4.7.10 Atomic: Register movs router in main API router**
    - **Files:** `apps/api/app/api/v1/__init__.py`
    - **Dependencies:** Task 4.7.1 must be complete
    - **Acceptance:** Import movs router. Add to api_router with include_router. Prefix: "" (no additional prefix). Router accessible at /api/v1/assessments/{id}/indicators/{id}/upload.
    - **Tech:** FastAPI router registration
    - **Time Estimate:** 1 hour

- [x] **4.8 Story: Backend API for File List Retrieval** ✅
  - Create `GET /api/v1/assessments/{assessment_id}/indicators/{indicator_id}/files` endpoint
  - Return list of uploaded files for a specific indicator
  - Include file metadata: name, type, size, upload timestamp, uploader
  - Filter based on user permissions (BLGU sees only own files)
  - Tech stack involved: FastAPI, Pydantic schemas, SQLAlchemy
  - Dependencies: Story 4.6 must be complete

  - [x] **4.8.1 Atomic: Implement GET files list endpoint structure**
    - **Files:** `apps/api/app/api/v1/movs.py`
    - **Dependencies:** Task 4.7.1 must be complete
    - **Acceptance:** Endpoint defined: @router.get("/assessments/{assessment_id}/indicators/{indicator_id}/files", tags=["movs"]). Accepts path params: assessment_id, indicator_id. Dependencies: get_db, get_current_user. Returns 200 status code.
    - **Tech:** FastAPI, path parameters
    - **Time Estimate:** 2 hours

  - [x] **4.8.2 Atomic: Implement query logic to fetch MOV files**
    - **Files:** `apps/api/app/api/v1/movs.py`
    - **Dependencies:** Task 4.8.1, Story 4.3 must be complete
    - **Acceptance:** Endpoint queries database for MOVFile records matching assessment_id and indicator_id. Filters out soft-deleted files (deleted_at IS NULL). Orders by uploaded_at descending. Eager loads uploader relationship.
    - **Tech:** SQLAlchemy query, filtering, ordering, eager loading
    - **Time Estimate:** 4 hours

  - [x] **4.8.3 Atomic: Add permission filtering for BLGU users**
    - **Files:** `apps/api/app/api/v1/movs.py`
    - **Dependencies:** Task 4.8.2 must be complete
    - **Acceptance:** If user role is BLGU_USER, filter query to only show files uploaded by current user. Assessors and validators see all files. Use current_user.role to determine filtering.
    - **Tech:** SQLAlchemy query filtering, role-based logic
    - **Time Estimate:** 3 hours

  - [x] **4.8.4 Atomic: Create MOVFileListResponse Pydantic schema**
    - **Files:** `apps/api/app/schemas/assessment.py`
    - **Dependencies:** Task 4.7.5 must be complete (MOVFileResponse exists)
    - **Acceptance:** Pydantic schema created: MOVFileListResponse with field: files (list of MOVFileResponse). Schema used for API response.
    - **Tech:** Pydantic, list types
    - **Time Estimate:** 2 hours

  - [x] **4.8.5 Atomic: Use MOVFileListResponse in endpoint return type**
    - **Files:** `apps/api/app/api/v1/movs.py`
    - **Dependencies:** Tasks 4.8.3, 4.8.4 must be complete
    - **Acceptance:** Endpoint return type is MOVFileListResponse. Response model configured. Returns {"files": [...]}.
    - **Tech:** FastAPI response models
    - **Time Estimate:** 2 hours

  - [x] **4.8.6 Atomic: Test files list endpoint for BLGU user**
    - **Files:** `apps/api/tests/api/v1/test_movs.py`
    - **Dependencies:** Tasks 4.8.1-4.8.5 must be complete
    - **Acceptance:** Integration test creates multiple MOV files for different users. BLGU user calls endpoint. Returns only files uploaded by that BLGU user. Other users' files not included.
    - **Tech:** Pytest, FastAPI TestClient, role-based testing
    - **Time Estimate:** 4 hours

  - [x] **4.8.7 Atomic: Test files list endpoint for assessor user**
    - **Files:** `apps/api/tests/api/v1/test_movs.py`
    - **Dependencies:** Tasks 4.8.1-4.8.5 must be complete
    - **Acceptance:** Integration test creates MOV files for different BLGUs. Assessor user calls endpoint. Returns all files for the indicator, regardless of uploader. Assessor sees all files.
    - **Tech:** Pytest, role-based testing
    - **Time Estimate:** 4 hours

  - [x] **4.8.8 Atomic: Test files list endpoint excludes soft-deleted files**
    - **Files:** `apps/api/tests/api/v1/test_movs.py`
    - **Dependencies:** Tasks 4.8.1-4.8.5 must be complete
    - **Acceptance:** Integration test creates MOV file and soft-deletes it (deleted_at set). Endpoint call does not include deleted file. Only active files returned.
    - **Tech:** Pytest, soft delete testing
    - **Time Estimate:** 3 hours

- [x] **4.9 Story: Backend API for File Deletion** ✅
  - Create `DELETE /api/v1/assessments/{assessment_id}/files/{file_id}` endpoint
  - Check permissions: BLGU can delete only if assessment not submitted
  - Use StorageService to delete file from Supabase and database
  - Return success/error response
  - Tech stack involved: FastAPI, permission checks, error handling
  - Dependencies: Story 4.4 must be complete

  - [x] **4.9.1 Atomic: Implement DELETE file endpoint structure**
    - **Files:** `apps/api/app/api/v1/movs.py`
    - **Dependencies:** Task 4.7.1 must be complete
    - **Acceptance:** Endpoint defined: @router.delete("/assessments/{assessment_id}/files/{file_id}", tags=["movs"]). Accepts path params: assessment_id, file_id. Dependencies: get_db, get_current_user. Returns 204 No Content on success.
    - **Tech:** FastAPI, path parameters, HTTP status codes
    - **Time Estimate:** 2 hours

  - [x] **4.9.2 Atomic: Integrate StorageService delete in endpoint**
    - **Files:** `apps/api/app/api/v1/movs.py`
    - **Dependencies:** Task 4.9.1, Story 4.6 must be complete
    - **Acceptance:** Endpoint calls storage_service.delete_mov_file(db, file_id, user.id). If successful, returns 204 No Content. Handles PermissionError with 403 Forbidden response.
    - **Tech:** FastAPI, service integration, error handling, HTTP status codes
    - **Time Estimate:** 4 hours

  - [x] **4.9.3 Atomic: Test delete endpoint with authorized BLGU user**
    - **Files:** `apps/api/tests/api/v1/test_movs.py`
    - **Dependencies:** Tasks 4.9.1-4.9.2 must be complete
    - **Acceptance:** Integration test creates MOV file for BLGU user in DRAFT assessment. BLGU user deletes file. Returns 204 status. File soft-deleted in database. File deleted from Supabase.
    - **Tech:** Pytest, FastAPI TestClient, test database
    - **Time Estimate:** 4 hours

  - [x] **4.9.4 Atomic: Test delete endpoint rejects BLGU user for submitted assessment**
    - **Files:** `apps/api/tests/api/v1/test_movs.py`
    - **Dependencies:** Tasks 4.9.1-4.9.2 must be complete
    - **Acceptance:** Integration test creates MOV file in SUBMITTED assessment. BLGU user attempts delete. Returns 403 Forbidden. File not deleted.
    - **Tech:** Pytest, permission testing
    - **Time Estimate:** 3 hours

  - [x] **4.9.5 Atomic: Test delete endpoint rejects assessor deletion**
    - **Files:** `apps/api/tests/api/v1/test_movs.py`
    - **Dependencies:** Tasks 4.9.1-4.9.2 must be complete
    - **Acceptance:** Integration test with ASSESSOR user attempting to delete file. Returns 403 Forbidden. Assessors cannot delete files (read-only).
    - **Tech:** Pytest, role-based testing
    - **Time Estimate:** 3 hours

  - [x] **4.9.6 Atomic: Test delete endpoint returns 404 for non-existent file**
    - **Files:** `apps/api/tests/api/v1/test_movs.py`
    - **Dependencies:** Tasks 4.9.1-4.9.2 must be complete
    - **Acceptance:** Integration test attempts to delete non-existent file_id. Returns 404 Not Found. Error message indicates file not found.
    - **Tech:** Pytest, error testing
    - **Time Estimate:** 2 hours

- [x] **4.10 Story: Pydantic Schemas for File Operations** ✅
  - Create `MOVFileResponse` schema for file metadata
  - Create `FileUploadResponse` schema for upload result
  - Create `FileListResponse` schema for file list
  - Ensure proper Orval tags for type generation
  - Tech stack involved: Pydantic, Python type hints
  - Dependencies: Stories 4.7, 4.8, 4.9 must be complete

  - [x] **4.10.1 Atomic: Verify MOVFileResponse schema completeness**
    - **Files:** `apps/api/app/schemas/assessment.py`
    - **Dependencies:** Task 4.7.5 must be complete
    - **Acceptance:** MOVFileResponse includes all fields: id (UUID), assessment_id, indicator_id, file_name, file_url, file_type, file_size, uploaded_by, uploaded_at. All fields properly typed. orm_mode enabled.
    - **Tech:** Pydantic, schema review
    - **Time Estimate:** 2 hours

  - [x] **4.10.2 Atomic: Add UploaderInfo nested schema to MOVFileResponse**
    - **Files:** `apps/api/app/schemas/assessment.py`
    - **Dependencies:** Task 4.10.1 must be complete
    - **Acceptance:** Create UploaderInfo schema with fields: id, full_name, email. Update MOVFileResponse: change uploaded_by from int to UploaderInfo. Schema loads uploader relationship.
    - **Tech:** Pydantic nested schemas, relationships
    - **Time Estimate:** 3 hours

  - [x] **4.10.3 Atomic: Verify MOVFileListResponse schema**
    - **Files:** `apps/api/app/schemas/assessment.py`
    - **Dependencies:** Task 4.8.4 must be complete
    - **Acceptance:** MOVFileListResponse schema has field: files (List[MOVFileResponse]). Schema used in list endpoint response.
    - **Tech:** Pydantic, list types
    - **Time Estimate:** 1 hour

  - [x] **4.10.4 Atomic: Ensure all MOV schemas have proper Orval tags**
    - **Files:** `apps/api/app/api/v1/movs.py`
    - **Dependencies:** Tasks 4.7.6, 4.8.5 must be complete
    - **Acceptance:** All MOV endpoints use tags=["movs"]. Orval generates types in packages/shared/src/generated/schemas/movs/ and endpoints/movs/.
    - **Tech:** FastAPI tags, Orval configuration
    - **Time Estimate:** 2 hours

- [x] **4.11 Story: Type Generation for File APIs** ✅
  - Run `pnpm generate-types` to generate TypeScript types and React Query hooks
  - Verify generated hooks: `useUploadMOVFile`, `useGetMOVFiles`, `useDeleteMOVFile`
  - Ensure file metadata types are correctly inferred
  - Tech stack involved: Orval, TypeScript, React Query
  - Dependencies: Story 4.10 must be complete

  - [x] **4.11.1 Atomic: Run pnpm generate-types after MOV endpoints complete**
    - **Files:** Generated files in `packages/shared/src/generated/`
    - **Dependencies:** Stories 4.7-4.10 must be complete
    - **Acceptance:** Run `pnpm generate-types`. Command succeeds. No errors. Generated files updated in packages/shared/src/generated/.
    - **Tech:** Orval, pnpm, type generation
    - **Time Estimate:** 1 hour

  - [x] **4.11.2 Atomic: Verify MOVFileResponse TypeScript type generated**
    - **Files:** `packages/shared/src/generated/schemas/movs/mOVFileResponse.ts`
    - **Dependencies:** Task 4.11.1 must be complete
    - **Acceptance:** TypeScript type MOVFileResponse exists. All fields present with correct types: id (string), assessment_id (number), file_name (string), file_url (string), file_type (string), file_size (number), uploaded_by (UploaderInfo), uploaded_at (string).
    - **Tech:** TypeScript, Orval generated types
    - **Time Estimate:** 2 hours

  - [x] **4.11.3 Atomic: Verify useUploadMOVFile hook generated**
    - **Files:** `packages/shared/src/generated/endpoints/movs/movs.ts`
    - **Dependencies:** Task 4.11.1 must be complete
    - **Acceptance:** React Query mutation hook useUploadMOVFile exists. Hook accepts parameters: assessmentId, indicatorId, file (File object). Hook returns MOVFileResponse on success.
    - **Tech:** React Query, Orval generated hooks
    - **Time Estimate:** 2 hours

  - [x] **4.11.4 Atomic: Verify useGetMOVFiles hook generated**
    - **Files:** `packages/shared/src/generated/endpoints/movs/movs.ts`
    - **Dependencies:** Task 4.11.1 must be complete
    - **Acceptance:** React Query query hook useGetMOVFiles exists. Hook accepts parameters: assessmentId, indicatorId. Hook returns MOVFileListResponse with files array.
    - **Tech:** React Query, Orval generated hooks
    - **Time Estimate:** 2 hours

  - [x] **4.11.5 Atomic: Verify useDeleteMOVFile hook generated**
    - **Files:** `packages/shared/src/generated/endpoints/movs/movs.ts`
    - **Dependencies:** Task 4.11.1 must be complete
    - **Acceptance:** React Query mutation hook useDeleteMOVFile exists. Hook accepts parameters: assessmentId, fileId. Hook returns void on success (204 No Content).
    - **Tech:** React Query, Orval generated hooks
    - **Time Estimate:** 2 hours

  - [x] **4.11.6 Atomic: Test generated hooks in TypeScript environment**
    - **Files:** `apps/web/src/test-generated-hooks.ts` (temporary test file)
    - **Dependencies:** Tasks 4.11.3-4.11.5 must be complete
    - **Acceptance:** Create temporary TypeScript file that imports and uses generated hooks. TypeScript compilation succeeds. No type errors. Hooks have correct signatures.
    - **Tech:** TypeScript, type checking
    - **Time Estimate:** 2 hours

- [x] **4.12 Story: File Upload Component with Drag-and-Drop** ✅
  - Create `MOVFileUpload` component in `src/components/features/assessments/mov/`
  - Implement drag-and-drop interface using react-dropzone
  - Support multiple file upload with progress indicators
  - Display file type and size validation errors
  - Use shadcn/ui Button, Progress components
  - Tech stack involved: React, TypeScript, react-dropzone, shadcn/ui
  - Dependencies: Story 4.11 must be complete

  - [x] **4.12.1 Atomic: Create MOVFileUpload component file structure**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx` (NEW), `apps/web/src/components/features/assessments/mov/index.ts` (NEW)
    - **Dependencies:** None
    - **Acceptance:** Component file created with basic functional component structure. Props interface defined: assessmentId, indicatorId, onUploadSuccess. Component exported from index.ts.
    - **Tech:** React, TypeScript, component structure
    - **Time Estimate:** 2 hours

  - [x] **4.12.2 Atomic: Install and configure react-dropzone**
    - **Files:** `apps/web/package.json`, `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.1 must be complete
    - **Acceptance:** Install react-dropzone: `pnpm add react-dropzone`. Import useDropzone hook in component. Configure dropzone: accept specific MIME types (PDF, DOCX, XLSX, JPG, PNG, MP4), maxSize: 50MB, multiple: true.
    - **Tech:** React, react-dropzone, package management
    - **Time Estimate:** 3 hours

  - [x] **4.12.3 Atomic: Implement dropzone UI with drag-and-drop area**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.2 must be complete
    - **Acceptance:** Render dropzone area with getRootProps and getInputProps. Show "Drag files here or click to browse" text. Style active/inactive states. Show visual feedback on drag over (border color change). Use shadcn/ui styling.
    - **Tech:** React, react-dropzone, Tailwind CSS, shadcn/ui
    - **Time Estimate:** 4 hours

  - [x] **4.12.4 Atomic: Integrate useUploadMOVFile mutation hook**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.1, Story 4.11 must be complete
    - **Acceptance:** Import useUploadMOVFile from @sinag/shared. Call hook in component. Store mutation function. Hook configured with assessmentId, indicatorId from props.
    - **Tech:** React, TanStack Query, generated hooks
    - **Time Estimate:** 3 hours

  - [x] **4.12.5 Atomic: Implement file upload on drop**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Tasks 4.12.3, 4.12.4 must be complete
    - **Acceptance:** When files dropped, call uploadMOVFile mutation for each file. Track upload state for each file: pending, uploading, success, error. Store in component state.
    - **Tech:** React, async/await, state management
    - **Time Estimate:** 4 hours

  - [x] **4.12.6 Atomic: Display file upload progress for each file**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.5 must be complete
    - **Acceptance:** For each uploading file, show progress bar using shadcn/ui Progress component. Show file name and upload status. Update progress as upload proceeds. Show checkmark on success, error icon on failure.
    - **Tech:** React, shadcn/ui Progress, upload tracking
    - **Time Estimate:** 5 hours

  - [x] **4.12.7 Atomic: Display validation errors for rejected files**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.2 must be complete
    - **Acceptance:** When react-dropzone rejects files (wrong type, too large), display error messages. Show rejected file names and reasons. Use shadcn/ui Alert component for errors.
    - **Tech:** React, react-dropzone, shadcn/ui Alert
    - **Time Estimate:** 4 hours

  - [x] **4.12.8 Atomic: Add retry functionality for failed uploads**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.6 must be complete
    - **Acceptance:** For files with upload errors, show "Retry" button. Clicking retry re-attempts upload using mutation hook. Update state on retry success/failure.
    - **Tech:** React, event handlers, state management
    - **Time Estimate:** 3 hours

  - [x] **4.12.9 Atomic: Call onUploadSuccess callback after successful upload**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.5 must be complete
    - **Acceptance:** After successful upload, call onUploadSuccess prop callback. Pass uploaded file data to callback. Parent component can refresh file list.
    - **Tech:** React, callbacks, component communication
    - **Time Estimate:** 2 hours

  - [x] **4.12.10 Atomic: Add accessibility attributes to dropzone**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.3 must be complete
    - **Acceptance:** Add ARIA labels to dropzone. Ensure keyboard navigation works (tab to dropzone, enter to open file picker). Screen reader announces drag-and-drop area and file input.
    - **Tech:** React, ARIA attributes, accessibility
    - **Time Estimate:** 3 hours

- [x] **4.13 Story: File List Display Component** ✅
  - Create `MOVFileList` component in `src/components/features/assessments/mov/`
  - Display uploaded files with name, type, size, upload date
  - Show file icons based on file type (PDF, DOCX, image, etc.)
  - Include download/preview links
  - Use shadcn/ui Table, Badge components
  - Tech stack involved: React, TypeScript, shadcn/ui, file icons library
  - Dependencies: Story 4.11 must be complete

  - [x] **4.13.1 Atomic: Create MOVFileList component file structure**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx` (NEW)
    - **Dependencies:** None
    - **Acceptance:** Component file created with basic functional component structure. Props interface defined: assessmentId, indicatorId. Component exported from index.ts.
    - **Tech:** React, TypeScript
    - **Time Estimate:** 2 hours

  - [x] **4.13.2 Atomic: Integrate useGetMOVFiles query hook**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.13.1, Story 4.11 must be complete
    - **Acceptance:** Import useGetMOVFiles from @sinag/shared. Call hook with assessmentId, indicatorId. Extract data, isLoading, error. Handle loading and error states.
    - **Tech:** React, TanStack Query, generated hooks
    - **Time Estimate:** 3 hours

  - [x] **4.13.3 Atomic: Render file list using shadcn/ui Table**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.13.2 must be complete
    - **Acceptance:** Render files using shadcn/ui Table component. Columns: File Name, Type, Size, Uploaded By, Uploaded At, Actions. Map over files array from query data. Show empty state if no files.
    - **Tech:** React, shadcn/ui Table, data rendering
    - **Time Estimate:** 4 hours

  - [x] **4.13.4 Atomic: Add file type icons to file list**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.13.3 must be complete
    - **Acceptance:** Install file icon library: lucide-react (already in project). Import file icons: FileText (PDF/DOCX), FileSpreadsheet (XLSX), Image (JPG/PNG), Video (MP4). Show appropriate icon based on file_type in each row.
    - **Tech:** React, lucide-react icons, conditional rendering
    - **Time Estimate:** 3 hours

  - [x] **4.13.5 Atomic: Format file size for display**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`, `apps/web/src/lib/utils.ts`
    - **Dependencies:** Task 4.13.3 must be complete
    - **Acceptance:** Create formatFileSize utility function in lib/utils.ts. Accepts bytes, returns formatted string (e.g., "2.5 MB", "150 KB"). Use in file list to display file_size.
    - **Tech:** TypeScript, utility functions, number formatting
    - **Time Estimate:** 2 hours

  - [x] **4.13.6 Atomic: Format upload date for display**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.13.3 must be complete
    - **Acceptance:** Use date-fns or similar to format uploaded_at timestamp. Display as relative time (e.g., "2 hours ago") or formatted date (e.g., "Jan 15, 2025 3:30 PM"). Ensure timezone handling.
    - **Tech:** React, date-fns, date formatting
    - **Time Estimate:** 3 hours

  - [x] **4.13.7 Atomic: Add download link for each file**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.13.3 must be complete
    - **Acceptance:** In Actions column, add Download button. Button is link to file_url with download attribute. Clicking downloads file from Supabase Storage. Use shadcn/ui Button variant.
    - **Tech:** React, HTML anchor download, shadcn/ui Button
    - **Time Estimate:** 2 hours

  - [x] **4.13.8 Atomic: Display uploader information**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.13.3 must be complete
    - **Acceptance:** In Uploaded By column, display uploader name from uploaded_by.full_name. If current user is uploader, show "You". Use shadcn/ui Badge for styling.
    - **Tech:** React, conditional rendering, shadcn/ui Badge
    - **Time Estimate:** 2 hours

  - [x] **4.13.9 Atomic: Add loading skeleton for file list**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.13.2 must be complete
    - **Acceptance:** When isLoading is true, show skeleton loader for table rows. Use shadcn/ui Skeleton component. Show 3-5 skeleton rows to indicate loading.
    - **Tech:** React, shadcn/ui Skeleton, loading states
    - **Time Estimate:** 3 hours

  - [x] **4.13.10 Atomic: Add error state for file list**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.13.2 must be complete
    - **Acceptance:** When error exists, show error message using shadcn/ui Alert. Display error details. Include "Retry" button to refetch data.
    - **Tech:** React, shadcn/ui Alert, error handling
    - **Time Estimate:** 3 hours

- [x] **4.14 Story: File Delete Functionality** ✅
  - Add delete button to each file in MOVFileList component
  - Show confirmation dialog before deletion
  - Disable delete button if assessment is submitted (permission check)
  - Integrate `useDeleteMOVFile` mutation hook
  - Tech stack involved: React, TypeScript, shadcn/ui Dialog, TanStack Query mutations
  - Dependencies: Stories 4.11, 4.13 must be complete

  - [x] **4.14.1 Atomic: Add delete button to file list actions column**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.13.3 must be complete
    - **Acceptance:** In Actions column, add Delete button next to Download button. Button uses shadcn/ui Button with variant="destructive". Button shows trash icon from lucide-react.
    - **Tech:** React, shadcn/ui Button, lucide-react icons
    - **Time Estimate:** 2 hours

  - [x] **4.14.2 Atomic: Integrate useDeleteMOVFile mutation hook**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.14.1, Story 4.11 must be complete
    - **Acceptance:** Import useDeleteMOVFile from @sinag/shared. Call hook in component. Store mutation function. Hook configured with onSuccess callback to refetch file list.
    - **Tech:** React, TanStack Query, generated hooks
    - **Time Estimate:** 3 hours

  - [x] **4.14.3 Atomic: Create confirmation dialog component**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.14.1 must be complete
    - **Acceptance:** Implement confirmation dialog using shadcn/ui AlertDialog. Dialog asks "Are you sure you want to delete this file?". Show file name in dialog. Cancel and Delete buttons.
    - **Tech:** React, shadcn/ui AlertDialog, state management
    - **Time Estimate:** 4 hours

  - [x] **4.14.4 Atomic: Wire delete button to confirmation dialog**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Tasks 4.14.2, 4.14.3 must be complete
    - **Acceptance:** Clicking Delete button opens confirmation dialog. Dialog stores file_id to delete. Clicking Delete in dialog calls deleteMOVFile mutation. Clicking Cancel closes dialog without action.
    - **Tech:** React, event handlers, state management
    - **Time Estimate:** 3 hours

  - [x] **4.14.5 Atomic: Disable delete button based on assessment status**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.14.1 must be complete
    - **Acceptance:** Add assessmentStatus prop to component. If status is SUBMITTED, IN_REVIEW, or COMPLETED, disable delete button. Show tooltip: "Cannot delete files from submitted assessment". Use shadcn/ui Tooltip.
    - **Tech:** React, conditional logic, shadcn/ui Tooltip
    - **Time Estimate:** 3 hours

  - [x] **4.14.6 Atomic: Disable delete button for non-owner files**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.14.1 must be complete
    - **Acceptance:** Add currentUserId prop to component. If file.uploaded_by.id !== currentUserId, disable delete button. Show tooltip: "You can only delete your own files".
    - **Tech:** React, permission logic, conditional rendering
    - **Time Estimate:** 3 hours

  - [x] **4.14.7 Atomic: Show loading state during deletion**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.14.2 must be complete
    - **Acceptance:** While delete mutation is pending, disable delete button and show loading spinner. Use mutation.isPending from TanStack Query. Prevent multiple simultaneous deletions.
    - **Tech:** React, TanStack Query loading states, UI feedback
    - **Time Estimate:** 3 hours

  - [x] **4.14.8 Atomic: Handle delete success with optimistic update**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.14.2 must be complete
    - **Acceptance:** On delete success, optimistically remove file from list. Use TanStack Query cache update or refetch. Show success toast: "File deleted successfully" using shadcn/ui Toast.
    - **Tech:** React, TanStack Query cache, shadcn/ui Toast
    - **Time Estimate:** 4 hours

  - [x] **4.14.9 Atomic: Handle delete error**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.14.2 must be complete
    - **Acceptance:** On delete error, show error message in toast. If 403 Forbidden, show "You don't have permission to delete this file". If 404, show "File not found". Use shadcn/ui Toast.
    - **Tech:** React, error handling, shadcn/ui Toast
    - **Time Estimate:** 3 hours

- [x] **4.15 Story: File Upload Integration with Dynamic Form** ✅
  - Enhance `FileFieldComponent` from Epic 3 Story 3.8
  - Integrate MOVFileUpload component
  - Integrate MOVFileList component
  - Show file upload section for file-type fields in form_schema
  - Tech stack involved: React, TypeScript, component integration
  - Dependencies: Epic 3 Story 3.8, Stories 4.12, 4.13 must be complete

  - [x] **4.15.1 Atomic: Locate FileFieldComponent from Epic 3**
    - **Files:** `apps/web/src/components/features/assessments/form/FileFieldComponent.tsx` (should exist from Epic 3)
    - **Dependencies:** Epic 3 Story 3.8 must be complete
    - **Acceptance:** File located. Component structure reviewed. Props include: field (from form_schema), assessmentId, indicatorId, value, onChange. Component currently renders basic file input or placeholder.
    - **Tech:** Code review, file location
    - **Time Estimate:** 1 hour

  - [x] **4.15.2 Atomic: Import MOVFileUpload and MOVFileList components**
    - **Files:** `apps/web/src/components/features/assessments/form/FileFieldComponent.tsx`
    - **Dependencies:** Task 4.15.1, Stories 4.12, 4.13 must be complete
    - **Acceptance:** Import MOVFileUpload and MOVFileList from assessments/mov/. Components available for use in FileFieldComponent.
    - **Tech:** React, ES6 imports
    - **Time Estimate:** 1 hour

  - [x] **4.15.3 Atomic: Replace basic file input with MOVFileUpload component**
    - **Files:** `apps/web/src/components/features/assessments/form/FileFieldComponent.tsx`
    - **Dependencies:** Task 4.15.2 must be complete
    - **Acceptance:** Render MOVFileUpload component in FileFieldComponent. Pass assessmentId, indicatorId props. Pass onUploadSuccess callback to trigger file list refresh.
    - **Tech:** React, component composition, props
    - **Time Estimate:** 3 hours

  - [x] **4.15.4 Atomic: Add MOVFileList component below file upload**
    - **Files:** `apps/web/src/components/features/assessments/form/FileFieldComponent.tsx`
    - **Dependencies:** Task 4.15.2 must be complete
    - **Acceptance:** Render MOVFileList component below MOVFileUpload. Pass assessmentId, indicatorId, assessmentStatus, currentUserId props. File list shows uploaded files for the indicator.
    - **Tech:** React, component composition
    - **Time Estimate:** 3 hours

  - [x] **4.15.5 Atomic: Add section divider and labels**
    - **Files:** `apps/web/src/components/features/assessments/form/FileFieldComponent.tsx`
    - **Dependencies:** Tasks 4.15.3, 4.15.4 must be complete
    - **Acceptance:** Add section labels: "Upload Files" above MOVFileUpload, "Uploaded Files" above MOVFileList. Use Tailwind typography classes. Add divider line between sections using shadcn/ui Separator.
    - **Tech:** React, Tailwind CSS, shadcn/ui Separator
    - **Time Estimate:** 2 hours

  - [x] **4.15.6 Atomic: Pass assessmentStatus from form context to FileFieldComponent**
    - **Files:** `apps/web/src/components/features/assessments/form/DynamicFormRenderer.tsx` (parent component from Epic 3)
    - **Dependencies:** Task 4.15.1 must be complete
    - **Acceptance:** DynamicFormRenderer loads assessment status (from assessment data). Passes assessmentStatus prop to FileFieldComponent. FileFieldComponent receives and uses status to control permissions.
    - **Tech:** React, props drilling or context
    - **Time Estimate:** 3 hours

  - [x] **4.15.7 Atomic: Pass currentUserId from auth context to FileFieldComponent**
    - **Files:** `apps/web/src/components/features/assessments/form/DynamicFormRenderer.tsx`
    - **Dependencies:** Task 4.15.1 must be complete
    - **Acceptance:** DynamicFormRenderer gets current user ID from auth context or user store. Passes currentUserId prop to FileFieldComponent. FileFieldComponent receives and passes to MOVFileList for permission checks.
    - **Tech:** React, context API, Zustand store
    - **Time Estimate:** 3 hours

  - [x] **4.15.8 Atomic: Test FileFieldComponent integration in form page**
    - **Files:** Manual testing in browser
    - **Dependencies:** Tasks 4.15.3-4.15.7 must be complete
    - **Acceptance:** Navigate to form page with file-type field. MOVFileUpload component renders. Upload file using drag-and-drop. File appears in MOVFileList. Delete file. File removed from list. Verify all interactions work.
    - **Tech:** Manual testing, browser testing
    - **Time Estimate:** 3 hours

- [x] **4.16 Story: File Upload Progress and Status Feedback** ✅
  - Implement upload progress bar for each file
  - Show upload status: uploading, success, error
  - Display error messages for failed uploads
  - Allow retry for failed uploads
  - Tech stack involved: React, TanStack Query, shadcn/ui Progress, Alert
  - Dependencies: Story 4.12 must be complete

  - [x] **4.16.1 Atomic: Verify upload progress already implemented in MOVFileUpload**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.6 must be complete
    - **Acceptance:** Review Task 4.12.6 implementation. Verify progress bar shows for each uploading file. If implemented, mark as complete. If not fully implemented, proceed with remaining tasks.
    - **Tech:** Code review
    - **Time Estimate:** 1 hour

  - [x] **4.16.2 Atomic: Add upload status icons (success, error)**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.6 must be complete
    - **Acceptance:** For each file in upload queue, show status icon: CheckCircle (green) for success, XCircle (red) for error, Loader (spinning) for uploading. Import icons from lucide-react.
    - **Tech:** React, lucide-react icons, conditional rendering
    - **Time Estimate:** 3 hours

  - [x] **4.16.3 Atomic: Display specific error messages for upload failures**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.5 must be complete
    - **Acceptance:** When upload fails, extract error message from mutation error. Display below file name in upload queue. Common errors: "File type not supported", "File size exceeds limit", "Network error". Use shadcn/ui Text with error color.
    - **Tech:** React, error message extraction, shadcn/ui
    - **Time Estimate:** 3 hours

  - [x] **4.16.4 Atomic: Verify retry functionality already implemented**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.8 must be complete
    - **Acceptance:** Review Task 4.12.8 implementation. Verify retry button shows for failed uploads. If implemented, mark as complete. If not, implement retry button that re-calls mutation for failed file.
    - **Tech:** Code review, React
    - **Time Estimate:** 1 hour

  - [x] **4.16.5 Atomic: Add clear/dismiss button for completed uploads**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.6 must be complete
    - **Acceptance:** For successfully uploaded files in queue, show "X" button to dismiss from queue. Clicking removes file from upload queue state. File remains in MOVFileList.
    - **Tech:** React, state management, event handlers
    - **Time Estimate:** 2 hours

  - [x] **4.16.6 Atomic: Auto-clear successful uploads after 5 seconds**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.6 must be complete
    - **Acceptance:** After successful upload, automatically remove file from upload queue after 5 seconds. Use setTimeout. Cancel timeout if component unmounts. Keep failed uploads in queue (don't auto-clear).
    - **Tech:** React, useEffect, setTimeout, cleanup
    - **Time Estimate:** 3 hours

- [x] **4.17 Story: Permission-Based UI Controls** ✅
  - Hide upload button if assessment is submitted
  - Hide delete button if assessment is submitted
  - Show read-only file list for submitted assessments
  - Display permission-related messages to users
  - Tech stack involved: React, TypeScript, conditional rendering
  - Dependencies: Stories 4.12, 4.14 must be complete

  - [x] **4.17.1 Atomic: Add assessmentStatus prop to MOVFileUpload component**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.12.1 must be complete
    - **Acceptance:** Update MOVFileUpload props interface to include assessmentStatus (AssessmentStatus enum or string). Component accepts status prop from parent.
    - **Tech:** TypeScript, React props
    - **Time Estimate:** 2 hours

  - [x] **4.17.2 Atomic: Disable dropzone when assessment is submitted**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.17.1 must be complete
    - **Acceptance:** If assessmentStatus is SUBMITTED, IN_REVIEW, or COMPLETED, disable dropzone. Set disabled: true in useDropzone config. Dropzone area shows "Assessment submitted - file uploads disabled".
    - **Tech:** React, react-dropzone, conditional logic
    - **Time Estimate:** 3 hours

  - [x] **4.17.3 Atomic: Show info banner when uploads disabled**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.tsx`
    - **Dependencies:** Task 4.17.2 must be complete
    - **Acceptance:** When dropzone disabled, show shadcn/ui Alert with info variant. Message: "This assessment has been submitted. You cannot upload or delete files." Alert shows above dropzone area.
    - **Tech:** React, shadcn/ui Alert, conditional rendering
    - **Time Estimate:** 2 hours

  - [x] **4.17.4 Atomic: Verify delete button permissions already implemented in MOVFileList**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Tasks 4.14.5, 4.14.6 must be complete
    - **Acceptance:** Review Tasks 4.14.5 and 4.14.6. Verify delete button is disabled based on assessmentStatus and file ownership. If implemented, mark as complete.
    - **Tech:** Code review
    - **Time Estimate:** 1 hour

  - [x] **4.17.5 Atomic: Add read-only mode indicator to MOVFileList**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.13.1 must be complete
    - **Acceptance:** If assessmentStatus is SUBMITTED/IN_REVIEW/COMPLETED, hide Actions column entirely. Show badge at top of table: "Read-only (Assessment Submitted)". Use shadcn/ui Badge.
    - **Tech:** React, conditional rendering, shadcn/ui Badge
    - **Time Estimate:** 3 hours

  - [x] **4.17.6 Atomic: Pass assessmentStatus from parent to both upload and list components**
    - **Files:** `apps/web/src/components/features/assessments/form/FileFieldComponent.tsx`
    - **Dependencies:** Task 4.15.6 must be complete
    - **Acceptance:** FileFieldComponent receives assessmentStatus prop. Passes assessmentStatus to both MOVFileUpload and MOVFileList components. Both components react to status changes.
    - **Tech:** React, props passing
    - **Time Estimate:** 2 hours

  - [x] **4.17.7 Atomic: Test permission controls with different assessment statuses**
    - **Files:** Manual testing in browser
    - **Dependencies:** Tasks 4.17.2, 4.17.3, 4.17.5, 4.17.6 must be complete
    - **Acceptance:** Manual test with assessment in DRAFT status: uploads enabled, delete enabled. Change status to SUBMITTED: uploads disabled, delete disabled, read-only banner shown. All UI updates correctly.
    - **Tech:** Manual testing, browser testing
    - **Time Estimate:** 3 hours

- [x] **4.18 Story: File Preview Functionality** ✅
  - Add preview button for image files (JPG, PNG)
  - Add preview modal for PDFs (using PDF viewer library)
  - Add download button for all file types
  - Use shadcn/ui Dialog for preview modal
  - Tech stack involved: React, TypeScript, react-pdf or similar, shadcn/ui
  - Dependencies: Story 4.13 must be complete

  - [x] **4.18.1 Atomic: Add preview button to file list for previewable files**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Task 4.13.3 must be complete
    - **Acceptance:** In Actions column, add Preview button for files with type image/jpeg, image/png, application/pdf. Use Eye icon from lucide-react. Button disabled for non-previewable types (DOCX, XLSX, MP4).
    - **Tech:** React, conditional rendering, lucide-react icons
    - **Time Estimate:** 3 hours

  - [x] **4.18.2 Atomic: Create FilePreviewModal component**
    - **Files:** `apps/web/src/components/features/assessments/mov/FilePreviewModal.tsx` (NEW)
    - **Dependencies:** None
    - **Acceptance:** Component created with props: isOpen, onClose, fileUrl, fileName, fileType. Uses shadcn/ui Dialog. Dialog contains header with file name and close button. Body contains preview content area.
    - **Tech:** React, TypeScript, shadcn/ui Dialog
    - **Time Estimate:** 4 hours

  - [x] **4.18.3 Atomic: Implement image preview in modal**
    - **Files:** `apps/web/src/components/features/assessments/mov/FilePreviewModal.tsx`
    - **Dependencies:** Task 4.18.2 must be complete
    - **Acceptance:** If fileType is image/jpeg or image/png, render <img> tag with fileUrl as src. Image is responsive (max-width, max-height to fit modal). Add zoom controls if needed.
    - **Tech:** React, responsive images, CSS
    - **Time Estimate:** 3 hours

  - [x] **4.18.4 Atomic: Install and configure react-pdf library**
    - **Files:** `apps/web/package.json`, `apps/web/src/components/features/assessments/mov/FilePreviewModal.tsx`
    - **Dependencies:** Task 4.18.2 must be complete
    - **Acceptance:** Install react-pdf: `pnpm add react-pdf`. Import Document, Page components. Configure PDF.js worker. Add basic PDF rendering setup.
    - **Tech:** React, react-pdf, package management
    - **Time Estimate:** 4 hours

  - [x] **4.18.5 Atomic: Implement PDF preview in modal**
    - **Files:** `apps/web/src/components/features/assessments/mov/FilePreviewModal.tsx`
    - **Dependencies:** Task 4.18.4 must be complete
    - **Acceptance:** If fileType is application/pdf, render PDF using react-pdf Document and Page components. Show first page by default. Add page navigation controls (previous/next page). Show page number: "Page X of Y".
    - **Tech:** React, react-pdf, PDF rendering
    - **Time Estimate:** 6 hours

  - [x] **4.18.6 Atomic: Add download button to preview modal**
    - **Files:** `apps/web/src/components/features/assessments/mov/FilePreviewModal.tsx`
    - **Dependencies:** Task 4.18.2 must be complete
    - **Acceptance:** Add Download button in modal header. Button is link to fileUrl with download attribute. Clicking downloads file. Use shadcn/ui Button with Download icon from lucide-react.
    - **Tech:** React, HTML anchor download, shadcn/ui Button
    - **Time Estimate:** 2 hours

  - [x] **4.18.7 Atomic: Wire preview button to open modal**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.tsx`
    - **Dependencies:** Tasks 4.18.1, 4.18.2 must be complete
    - **Acceptance:** Clicking Preview button opens FilePreviewModal. Pass selected file's url, name, type to modal. Modal state managed with useState. Modal closes on X button or backdrop click.
    - **Tech:** React, state management, event handlers
    - **Time Estimate:** 3 hours

  - [x] **4.18.8 Atomic: Add loading state for PDF preview**
    - **Files:** `apps/web/src/components/features/assessments/mov/FilePreviewModal.tsx`
    - **Dependencies:** Task 4.18.5 must be complete
    - **Acceptance:** While PDF loads, show loading spinner in modal body. Use react-pdf onLoadSuccess and onLoadError callbacks. Show error message if PDF fails to load. Use shadcn/ui Skeleton or Loader.
    - **Tech:** React, react-pdf callbacks, loading states
    - **Time Estimate:** 3 hours

  - [x] **4.18.9 Atomic: Add keyboard shortcuts to preview modal**
    - **Files:** `apps/web/src/components/features/assessments/mov/FilePreviewModal.tsx`
    - **Dependencies:** Task 4.18.2 must be complete
    - **Acceptance:** Add keyboard support: Escape to close modal, Arrow Left/Right for PDF page navigation. Use useEffect with keydown listener. Remove listener on unmount.
    - **Tech:** React, useEffect, keyboard events
    - **Time Estimate:** 3 hours

  - [x] **4.18.10 Atomic: Test file preview functionality**
    - **Files:** Manual testing in browser
    - **Dependencies:** Tasks 4.18.3, 4.18.5, 4.18.7 must be complete
    - **Acceptance:** Manual test: preview JPG file (shows image), preview PNG file (shows image), preview PDF file (shows PDF with pagination). Download works from modal. Keyboard shortcuts work. All file types render correctly.
    - **Tech:** Manual testing, browser testing
    - **Time Estimate:** 4 hours

- [x] **4.19 Story: Testing & Validation** ✅ ⚠️ **REQUIRED BEFORE NEXT EPIC**
  - Unit test FileValidationService with valid/invalid files
  - Unit test StorageService upload and delete methods
  - Test backend API endpoints: upload, list, delete files
  - Test permission checks for file deletion
  - Component test for MOVFileUpload with drag-and-drop
  - Component test for MOVFileList with file display and delete
  - Integration test: upload file, verify it appears in list, delete file
  - E2E test: BLGU user uploads MOV, sees it in list, deletes it
  - Test file size validation (reject files > 50MB)
  - Test file type validation (reject unsupported types)
  - Tech stack involved: Pytest, Vitest, React Testing Library, Playwright, mock file uploads
  - Dependencies: All implementation stories 4.1-4.18 must be complete

  - [x] **4.19.1 Atomic: Review and verify FileValidationService tests already exist**
    - **Files:** `apps/api/tests/services/test_file_validation_service.py`
    - **Dependencies:** Tasks 4.4.7-4.4.9 must be complete
    - **Acceptance:** Review existing tests from Tasks 4.4.7-4.4.9. Verify tests cover: valid file types, invalid file types, oversized files, file content validation. If complete, mark as done. If gaps exist, add missing tests.
    - **Tech:** Pytest, code review
    - **Time Estimate:** 2 hours

  - [x] **4.19.2 Atomic: Review and verify StorageService tests already exist**
    - **Files:** `apps/api/tests/services/test_storage_service.py`
    - **Dependencies:** Tasks 4.5.7-4.5.8, 4.6.4-4.6.6 must be complete
    - **Acceptance:** Review existing tests from upload and delete stories. Verify tests cover: successful upload, upload failure, authorized delete, unauthorized delete (submitted assessment), assessor delete rejection. If complete, mark as done.
    - **Tech:** Pytest, code review
    - **Time Estimate:** 2 hours

  - [x] **4.19.3 Atomic: Review and verify MOV API endpoint tests already exist**
    - **Files:** `apps/api/tests/api/v1/test_movs.py`
    - **Dependencies:** Tasks 4.7.7-4.7.9, 4.8.6-4.8.8, 4.9.3-4.9.6 must be complete
    - **Acceptance:** Review existing tests from API endpoint stories. Verify tests cover: upload endpoint (valid, invalid type, oversized), list endpoint (BLGU filter, assessor all access, soft delete), delete endpoint (authorized, unauthorized, non-existent). If complete, mark as done.
    - **Tech:** Pytest, FastAPI TestClient, code review
    - **Time Estimate:** 2 hours

  - [x] **4.19.4 Atomic: Add integration test for complete upload-list-delete flow**
    - **Files:** `apps/api/tests/api/v1/test_movs_integration.py` (NEW)
    - **Dependencies:** Stories 4.7, 4.8, 4.9 must be complete
    - **Acceptance:** Integration test: BLGU user uploads file → file appears in list endpoint → BLGU user deletes file → file no longer in list. Test runs end-to-end with real database and mock Supabase client.
    - **Tech:** Pytest, FastAPI TestClient, integration testing
    - **Time Estimate:** 5 hours

  - [x] **4.19.5 Atomic: Add test for concurrent file uploads**
    - **Files:** `apps/api/tests/api/v1/test_movs.py`
    - **Dependencies:** Story 4.7 must be complete
    - **Acceptance:** Test uploads multiple files simultaneously (async). Verify all files saved with unique filenames. No filename collisions. Database records created for all files.
    - **Tech:** Pytest, async testing, concurrency
    - **Time Estimate:** 4 hours

  - [x] **4.19.6 Atomic: Create MOVFileUpload component test file**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.test.tsx` (NEW)
    - **Dependencies:** Story 4.12 must be complete
    - **Acceptance:** Test file created with Vitest and React Testing Library setup. Mock useUploadMOVFile hook. Render component with test props.
    - **Tech:** Vitest, React Testing Library, mock setup
    - **Time Estimate:** 3 hours

  - [x] **4.19.7 Atomic: Test MOVFileUpload renders dropzone**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.test.tsx`
    - **Dependencies:** Task 4.19.6 must be complete
    - **Acceptance:** Test renders MOVFileUpload component. Verify dropzone area is visible. Verify "Drag files here" text appears. Snapshot test for UI.
    - **Tech:** Vitest, React Testing Library, render testing
    - **Time Estimate:** 2 hours

  - [x] **4.19.8 Atomic: Test MOVFileUpload handles file drop**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.test.tsx`
    - **Dependencies:** Task 4.19.6 must be complete
    - **Acceptance:** Test simulates file drop event. Verify useUploadMOVFile mutation called with correct parameters. Verify file appears in upload queue with "uploading" status.
    - **Tech:** Vitest, React Testing Library, user events, mock assertions
    - **Time Estimate:** 4 hours

  - [x] **4.19.9 Atomic: Test MOVFileUpload shows validation errors**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.test.tsx`
    - **Dependencies:** Task 4.19.6 must be complete
    - **Acceptance:** Test drops invalid file (wrong type). Verify react-dropzone rejects file. Verify error message appears: "File type not supported".
    - **Tech:** Vitest, React Testing Library, error testing
    - **Time Estimate:** 3 hours

  - [x] **4.19.10 Atomic: Test MOVFileUpload disables when assessment submitted**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileUpload.test.tsx`
    - **Dependencies:** Task 4.19.6, Story 4.17 must be complete
    - **Acceptance:** Test renders component with assessmentStatus="SUBMITTED". Verify dropzone is disabled. Verify info banner shows "Assessment submitted - file uploads disabled".
    - **Tech:** Vitest, React Testing Library, conditional rendering
    - **Time Estimate:** 3 hours

  - [x] **4.19.11 Atomic: Create MOVFileList component test file**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.test.tsx` (NEW)
    - **Dependencies:** Story 4.13 must be complete
    - **Acceptance:** Test file created with Vitest and React Testing Library setup. Mock useGetMOVFiles and useDeleteMOVFile hooks. Render component with test props.
    - **Tech:** Vitest, React Testing Library, mock setup
    - **Time Estimate:** 3 hours

  - [x] **4.19.12 Atomic: Test MOVFileList renders file list**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.test.tsx`
    - **Dependencies:** Task 4.19.11 must be complete
    - **Acceptance:** Test renders MOVFileList with mocked file data. Verify table appears with files. Verify file names, types, sizes displayed correctly. Verify file icons appear.
    - **Tech:** Vitest, React Testing Library, data rendering
    - **Time Estimate:** 3 hours

  - [x] **4.19.13 Atomic: Test MOVFileList delete button triggers confirmation**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.test.tsx`
    - **Dependencies:** Task 4.19.11, Story 4.14 must be complete
    - **Acceptance:** Test clicks delete button. Verify confirmation dialog appears. Verify dialog contains file name. Click Cancel, verify dialog closes without calling delete mutation.
    - **Tech:** Vitest, React Testing Library, user events, modal testing
    - **Time Estimate:** 4 hours

  - [x] **4.19.14 Atomic: Test MOVFileList delete confirmation calls mutation**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.test.tsx`
    - **Dependencies:** Task 4.19.11, Story 4.14 must be complete
    - **Acceptance:** Test clicks delete button, opens dialog, clicks Delete in dialog. Verify useDeleteMOVFile mutation called with correct file_id. Verify success toast appears.
    - **Tech:** Vitest, React Testing Library, mock assertions
    - **Time Estimate:** 4 hours

  - [x] **4.19.15 Atomic: Test MOVFileList shows loading state**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.test.tsx`
    - **Dependencies:** Task 4.19.11 must be complete
    - **Acceptance:** Test renders component with isLoading=true (mocked). Verify skeleton loaders appear. Verify table data not rendered during loading.
    - **Tech:** Vitest, React Testing Library, loading states
    - **Time Estimate:** 2 hours

  - [x] **4.19.16 Atomic: Test MOVFileList shows error state**
    - **Files:** `apps/web/src/components/features/assessments/mov/MOVFileList.test.tsx`
    - **Dependencies:** Task 4.19.11 must be complete
    - **Acceptance:** Test renders component with error (mocked). Verify error alert appears. Verify error message displayed. Verify Retry button appears.
    - **Tech:** Vitest, React Testing Library, error states
    - **Time Estimate:** 3 hours

  - [x] **4.19.17 Atomic: Create E2E test for MOV upload workflow**
    - **Files:** `apps/web/tests/e2e/mov-upload.spec.ts` (NEW)
    - **Dependencies:** Stories 4.7-4.18 must be complete
    - **Acceptance:** E2E test file created using Playwright. Test setup includes: login as BLGU user, navigate to assessment form page, locate file upload section.
    - **Tech:** Playwright, E2E test setup
    - **Time Estimate:** 3 hours

  - [x] **4.19.18 Atomic: E2E test: BLGU uploads file**
    - **Files:** `apps/web/tests/e2e/mov-upload.spec.ts`
    - **Dependencies:** Task 4.19.17 must be complete
    - **Acceptance:** E2E test uploads file using dropzone. Test waits for upload to complete. Verify file appears in file list. Verify file name, type, size displayed.
    - **Tech:** Playwright, file upload, wait strategies
    - **Time Estimate:** 5 hours

  - [x] **4.19.19 Atomic: E2E test: BLGU previews file**
    - **Files:** `apps/web/tests/e2e/mov-upload.spec.ts`
    - **Dependencies:** Task 4.19.18, Story 4.18 must be complete
    - **Acceptance:** E2E test clicks Preview button. Verify preview modal opens. Verify file preview renders (image or PDF). Close modal. Verify modal closes.
    - **Tech:** Playwright, modal testing, file preview
    - **Time Estimate:** 4 hours

  - [x] **4.19.20 Atomic: E2E test: BLGU deletes file**
    - **Files:** `apps/web/tests/e2e/mov-upload.spec.ts`
    - **Dependencies:** Task 4.19.18 must be complete
    - **Acceptance:** E2E test clicks Delete button. Verify confirmation dialog appears. Click Delete in dialog. Verify file removed from list. Verify success toast appears.
    - **Tech:** Playwright, user interactions, assertions
    - **Time Estimate:** 4 hours

  - [x] **4.19.21 Atomic: E2E test: BLGU cannot delete file from submitted assessment**
    - **Files:** `apps/web/tests/e2e/mov-upload.spec.ts`
    - **Dependencies:** Task 4.19.18, Story 4.17 must be complete
    - **Acceptance:** E2E test: upload file in DRAFT assessment. Submit assessment (change status to SUBMITTED). Return to form page. Verify delete button is disabled. Verify tooltip shows "Cannot delete files from submitted assessment".
    - **Tech:** Playwright, permission testing, tooltip testing
    - **Time Estimate:** 5 hours

  - [x] **4.19.22 Atomic: E2E test: Upload invalid file type**
    - **Files:** `apps/web/tests/e2e/mov-upload.spec.ts`
    - **Dependencies:** Task 4.19.17 must be complete
    - **Acceptance:** E2E test attempts to upload .exe file. Verify error message appears: "File type not supported". Verify file not uploaded.
    - **Tech:** Playwright, error testing, validation
    - **Time Estimate:** 3 hours

  - [x] **4.19.23 Atomic: Performance test: Upload large file (near 50MB limit)**
    - **Files:** `apps/api/tests/api/v1/test_movs_performance.py` (NEW)
    - **Dependencies:** Story 4.7 must be complete
    - **Acceptance:** Performance test uploads 45MB PDF file. Measure upload time. Verify upload completes within acceptable time (< 30 seconds). Verify file saved correctly.
    - **Tech:** Pytest, performance testing, large file handling
    - **Time Estimate:** 4 hours

  - [x] **4.19.24 Atomic: Security test: Reject malicious file upload**
    - **Files:** `apps/api/tests/services/test_file_validation_service_security.py` (NEW)
    - **Dependencies:** Story 4.4 must be complete
    - **Acceptance:** Security test attempts to upload file with executable content in header. FileValidationService rejects file. Test attempts path traversal in filename (../../etc/passwd). Service sanitizes filename.
    - **Tech:** Pytest, security testing, malicious file mocking
    - **Time Estimate:** 5 hours

  - [x] **4.19.25 Atomic: Verify all Epic 4 tests pass in CI**
    - **Files:** CI pipeline configuration (GitHub Actions or similar)
    - **Dependencies:** All tasks 4.19.1-4.19.24 must be complete
    - **Acceptance:** Run full test suite: `pnpm test`. All backend tests pass (pytest). All frontend tests pass (vitest). All E2E tests pass (playwright). No test failures. Coverage meets minimum thresholds.
    - **Tech:** CI/CD, test orchestration
    - **Time Estimate:** 3 hours

## Key Technical Decisions

### Supported File Types
- Documents: PDF, DOCX, XLSX
- Images: JPG, PNG
- Videos: MP4 (for video evidence)
- Max file size: 50MB per file

### File Storage Structure
Files are stored in Supabase Storage with the following path structure:
```
mov-files/
  {assessment_id}/
    {indicator_id}/
      {unique_file_name}
```

### Permission Rules
- **BLGU Users**:
  - Can upload files only for their own assessments
  - Can delete files only if assessment is NOT submitted
  - Can view/download files for their own assessments

- **Assessors**:
  - Can view/download files for all assessments
  - Cannot delete files (read-only access)

### File Validation
- Client-side: Check file type and size before upload
- Server-side: Validate file type and size, perform security checks
- Reject files that fail validation with specific error messages

## Dependencies for Next Epic

Epic 5.0 (Submission & Rework Workflow) depends on:
- Story 4.3: MOVFile model must exist for submission validation
- Story 4.8: File list API must be available to check MOV completeness
- Story 4.17: Permission-based UI controls must be in place
- Story 4.19: All testing must pass

## Total Atomic Tasks: 166

**Epic 4 Summary:**
- 19 Stories
- 166 Atomic Tasks
- Estimated Time: ~450 hours (11-12 weeks for 1 developer)
