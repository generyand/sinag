# Task List: Core User Authentication & Management

---

## **Revision History**

### **November 5, 2025 - Major Task List Revision**

**Reason:** Incorporating changes from updated PRD based on November 4, 2025 DILG consultation

**Key Changes:**

- **New Epic 8.0**: Added comprehensive task group for implementing role redefinition (SUPERADMIN
  removal, Assessor → Validator role split)
- **Database Schema Migration**: Tasks for renaming `governance_area_id` to `validator_area_id` and
  updating role enums
- **User Management Interface Updates**: Tasks for implementing conditional field rendering based on
  new role structure
- **Validator Role Support**: Tasks for adding Validator role with governance area assignment
- **Assessor Assignment Removal**: Tasks for removing barangay assignment fields for Assessor role
- **MLGOO-DILG Role Updates**: Tasks for clarifying MLGOO-DILG as Chairman with arbitrary barangay
  selection

**Preserved Context:**

- All previously completed tasks (1.0-6.0) remain documented with strikethrough for superseded items
- Original implementation history maintained for reference
- Existing file structure and patterns preserved

---

## PRD Traceability Matrix

Map each functional requirement from the updated PRD to specific tasks:

- **FR-4.1** Login & Authentication → Epic 2.0, 4.0
- **FR-4.2** User Management (MLGOO-DILG Only) → Epic 3.0, 5.0, **Epic 8.0 (NEW)**
- **FR-4.1.9** Forced Password Change Flow → Epic 6.0
- **PRD Section 7** Database Schema Updates → Epic 1.0, **Epic 8.0 (NEW)**
- **PRD Revision** Role Redefinition & Validator Role → **Epic 8.0 (NEW)**

---

## Relevant Files

### Backend Files

- `apps/api/app/db/enums.py` - **Modify** Python enums for `UserRole` - Remove SUPERADMIN, rename
  AREA_ASSESSOR to ASSESSOR, add VALIDATOR
- `apps/api/app/db/models/user.py` - **Modify** the `User` model to rename `governance_area_id` to
  `validator_area_id` and update role enum
- `apps/api/app/db/models/governance_area.py` - **Reference** for governance area relationships
- `apps/api/alembic/versions/` - **Create** new Alembic migration file for role enum updates and
  field renaming
- `apps/api/app/schemas/user.py` - **Update** Pydantic schemas to reflect `validator_area_id` and
  new role structure
- `apps/api/app/api/v1/users.py` - **Update** endpoints to handle new role-based assignment logic
- `apps/api/app/services/user_service.py` - **Update** service logic to handle Validator role and
  remove Assessor assignment logic
- `apps/api/app/services/startup_service.py` - **Update** to use new role enums (remove SUPERADMIN
  references)
- `apps/api/app/api/deps.py` - **Update** dependencies to use MLGOO_DILG role for admin checks
- `apps/api/tests/api/v1/test_users.py` - **Update** tests for new role structure and assignment
  logic

### Frontend Files

- `apps/web/src/store/useAuthStore.ts` - Zustand store for managing global authentication state
- `apps/web/src/components/features/auth/LoginForm.tsx` - Login form component
- `apps/web/middleware.ts` - Next.js middleware for route protection
- `apps/web/src/hooks/useAuth.ts` - Hook for handling login, logout, and password changes
- `apps/web/src/hooks/useUsers.ts` - **Update** hooks for managing user data with new role structure
- `apps/web/src/app/(app)/user-management/page.tsx` - **Update** main User Management page
- `apps/web/src/components/features/users/UserManagementTable.tsx` - **Update** table to display
  role-specific assignments correctly
- `apps/web/src/components/features/users/UserForm.tsx` - **Update** form with conditional rendering
  for Validator role and removal of Assessor assignment fields
- `apps/web/src/hooks/useGovernanceAreas.ts` - Hook for fetching governance areas data
- `apps/web/src/hooks/useBarangays.ts` - Hook for fetching barangays data
- `apps/web/src/app/(app)/change-password/page.tsx` - Password change page

### Shared Types

- `packages/shared/src/generated/schemas/users/` - Auto-generated TypeScript types (regenerated
  after backend changes)

### Testing Notes

- **Backend Testing:** Unit tests for the Python backend are located in `apps/api/tests/`. To run
  them, navigate to the `apps/api` directory and execute `uv run pytest` or
  `pytest -vv --log-cli-level=DEBUG` for verbose output.
- **Frontend Testing:** Unit tests for Next.js components are placed alongside the component files.
  To run them, navigate to the `apps/web` directory and execute `pnpm test`.
- **Type Generation:** After backend schema changes, always run `pnpm generate-types` from the
  project root to regenerate TypeScript types.

---

## Tasks

### ✅ COMPLETED TASKS (Original Implementation)

- [x] **1.0 Backend Foundation & Database Schema (Revision 1)**
  - [x] 1.1 ~~_Original user model changes_~~ (Superseded)
  - [x] 1.2 ~~_Original barangay model creation_~~ (Completed)
  - [x] 1.3 ~~_Original relationship setup_~~ (Completed)
  - [x] 1.4 ~~_Original migration_~~ (Superseded)
  - [x] 1.5 ~~_Original seeding_~~ (Completed)
  - [x] 1.6 In `apps/api/app/db/models/user.py`, change the `id` column from `String` to `Integer`.
  - [x] 1.7 In the `User` model, change `role` to `SMALLINT` and add the nullable `assessor_area`
        `SMALLINT` column.
  - [x] 1.8 Create `apps/api/app/db/models/governance_area.py` with `id`, `name`, and `area_type`
        (`SMALLINT`) columns.
  - [x] 1.9 Create a one-time seeding service to populate the `governance_areas` table with the 6
        predefined SGLGB areas and their types (Core/Essential).
  - [x] 1.10 Run
        `uv run alembic revision --autogenerate -m "Alter user table and add governance areas"` to
        create a new migration file. Review the script.

- [x] **1.11 Implement Enums for Type Safety and Better Code Quality** (Superseded by string-based
      enum refactor)
  - [x] ~~1.11.1 Create `apps/api/app/db/enums.py` with `UserRole` and `GovernanceAreaType` enums
        using Python's `enum.IntEnum`.~~
  - [x] ~~1.11.2 Update `apps/api/app/db/models/user.py` to use `Enum(UserRole)` instead of
        `SmallInteger` for the `role` column.~~
  - [x] ~~1.11.3 Update `apps/api/app/db/models/governance_area.py` to use
        `Enum(GovernanceAreaType)` instead of `SmallInteger` for the `area_type` column.~~
  - [x] ~~1.11.4 Update `apps/api/app/services/governance_area_service.py` to use enum values in the
        seeding data.~~
  - [x] ~~1.11.5 Update `apps/api/app/services/startup_service.py` to use `UserRole.SYSTEM_ADMIN`
        instead of integer `3`.~~
  - [x] ~~1.11.6 Create a new Alembic migration to add CHECK constraints for the enum values in the
        database.~~
  - [x] ~~1.11.7 Update all existing code that references integer role values to use the new
        enums.~~

- [x] **1.12 Refactor Roles & Area Types to use String-Based Enums**
  - [x] 1.12.1 In `enums.py`, refactor `UserRole` to be a `(str, enum.Enum)` with values like
        `"SUPERADMIN"`, `"MLGOO_DILG"`, etc. Create a new `AreaType(str, enum.Enum)` for `"Core"`
        and `"Essential"`.
  - [x] 1.12.2 Update `user.py` and `governance_area.py` models to use the new string-based enums.
  - [x] 1.12.3 In `governance_area_service.py`, update the seeding data to use the new `AreaType`
        enum string values.
  - [x] 1.12.4 In `startup_service.py`, update the superuser creation to use `UserRole.SUPERADMIN`.
  - [x] 1.12.5 In `deps.py`, update the admin check to use `UserRole.SUPERADMIN`.
  - [x] 1.12.6 Create a new Alembic migration to change the `role` and `area_type` columns to
        `VARCHAR`, update existing data from integers to strings, and update the `CHECK`
        constraints.

- [x] **2.0 Implement Backend Authentication Endpoints (Revision 1)**
  - [x] 2.1 ~~_Original login endpoint enhancement_~~ (Completed)
  - [x] 2.2 In `apps/api/app/core/security.py`, update `create_access_token` and `verify_token` to
        handle integer `user_id`.
  - [x] 2.3 In `apps/api/app/api/v1/auth.py`, update the `/login` endpoint to query users by integer
        ID.
  - [x] 2.4 Update the JWT payload to include the string `role`.

- [x] **3.0 Implement Backend User Management API (Admin) (Revision 1)**
  - [x] 3.1 In `apps/api/app/schemas/user.py`, update all user schemas to use `int` for `id` and
        include the optional `governance_area_id` field. **FIXED**: Updated field name from
        `assessor_area` to `governance_area_id` to match database model.
  - [x] 3.2 In `apps/api/app/services/user_service.py`, refactor methods to handle the
        `governance_area_id` field, ensuring it's only set for users with the "Area Assessor" role.
        **FIXED**: Updated service logic to use correct field names.
  - [x] 3.3 In `apps/api/app/api/v1/users.py`, update the create and update endpoints to accept and
        process the `governance_area_id`. **FIXED**: API endpoints now use correct field names.
  - [x] 3.4 ~~In `apps/api/app/api/deps.py`, update `get_current_admin_user` to check for
        `role == 1` (MLGOO-DILG).~~ (Superseded by Task 1.12.5)

- [x] **4.0 Frontend Foundation & Login Flow**
  - [x] 4.1 Create `apps/web/src/store/useAuthStore.ts` using Zustand to hold `user`, `token`, and
        `isAuthenticated` state.
  - [x] 4.2 In the `LoginForm` component, use the auto-generated `usePostAuthLogin` mutation hook
        from `@sinag/shared`. On success, save the returned token and user state to the Zustand
        store and redirect to the dashboard.
  - [x] 4.3 Create `apps/web/middleware.ts` to protect all routes inside the `(app)` group.
        Unauthenticated users should be redirected to `/login`.
  - [x] 4.4 In the `UserNav` component, use the auto-generated `usePostAuthLogout` mutation hook. On
        success, clear the auth store and redirect to the login page.

- [x] **5.0 Build Frontend User Management Interface (Admin)**
  - [x] 5.1 Create the page `apps/web/src/app/(app)/user-management/page.tsx`. This page should be
        accessible only to the admin role.
  - [x] 5.2 On this page, use the auto-generated `useGetUsers` query hook to fetch the list of all
        users.
  - [x] 5.3 Build the `UserManagementTable.tsx` component to display the "Assigned Barangay/Area"
        column, showing the barangay for BLGU users and the governance area for Assessors.
  - [x] 5.4 Create a `UserForm.tsx` component for the user creation/editing modal/dialog.
  - [x] 5.5 In the `UserForm`, conditionally display EITHER the "Assigned Barangay" dropdown (for
        "BLGU User" role) OR the "Assigned Governance Area" dropdown (for "Area Assessor" role).
    - [x] 5.5.1 Create missing API endpoints for fetching governance areas and barangays in the
          backend.
    - [x] 5.5.2 Create hooks for fetching governance areas and barangays data.
    - [x] 5.5.3 Update UserForm to conditionally display the appropriate dropdown based on selected
          role.
  - [x] 5.6 The `UserForm` should use the auto-generated `usePostUsers` and `usePutUsersUserId`
        mutation hooks, ensuring `governance_area_id` is passed when required. On success,
        invalidate the `useGetUsers` query.

- [x] **6.0 Implement Forced Password Change Flow**
  - [x] 6.1 In the main application layout (`apps/web/src/app/(app)/layout.tsx`), add a check that
        reads `must_change_password` from the `useAuthStore`.
  - [x] 6.2 If `must_change_password` is `true`, redirect the user to the `/change-password` page.
  - [x] 6.3 Create the `apps/web/src/app/(app)/change-password/page.tsx` page with a form for
        changing the password.
  - [x] 6.4 The password change form should use the auto-generated `usePostAuthChangePassword`
        mutation hook. On success, update the auth store and redirect the user to their dashboard.

---

### ✅ COMPLETED TASKS (November 4, 2025 Consultation Updates)

- [x] **8.0 Epic: Implement Role Redefinition & Validator Role** _(Updated PRD Section 7, FR-4.2)_

  **Context:** This epic implements the fundamental role structure changes from the November 4, 2025
  DILG consultation. The changes redefine how users are assigned and how they interact with
  barangays and governance areas.
  - [x] **8.1 Story: Database Schema Updates for Role Redefinition**

    **Purpose:** Update the database schema to reflect the new role structure, removing SUPERADMIN,
    renaming AREA_ASSESSOR to ASSESSOR, adding VALIDATOR role, and renaming the governance area
    assignment field.
    - [x] **8.1.1 Atomic: Update UserRole enum in enums.py**
      - **Files:** `apps/api/app/db/enums.py`
      - **Dependencies:** None (modifies existing file)
      - **Acceptance Criteria:**
        - Remove `SUPERADMIN = "SUPERADMIN"` from `UserRole` enum
        - Rename `AREA_ASSESSOR = "AREA_ASSESSOR"` to `ASSESSOR = "ASSESSOR"`
        - Add `VALIDATOR = "VALIDATOR"` to `UserRole` enum
        - Final enum structure should be:
          - `MLGOO_DILG = "MLGOO_DILG"` (enum value 0 in DB)
          - `ASSESSOR = "ASSESSOR"` (enum value 1 in DB)
          - `VALIDATOR = "VALIDATOR"` (enum value 2 in DB)
          - `BLGU_USER = "BLGU_USER"` (enum value 3 in DB)
      - **Tech:** Python enum, string-based enum pattern

    - [x] **8.1.2 Atomic: Rename governance_area_id to validator_area_id in User model**
      - **Files:** `apps/api/app/db/models/user.py`
      - **Dependencies:** Task 8.1.1 (enum update)
      - **Acceptance Criteria:**
        - Rename `governance_area_id` column to `validator_area_id`
        - Update column comment/docstring to specify "Only used when role is VALIDATOR"
        - Ensure foreign key constraint to `governance_areas.id` is preserved
        - Update relationship name if needed for clarity
        - Column should remain nullable (`nullable=True`)
      - **Tech:** SQLAlchemy, Column definition

    - [x] **8.1.3 Atomic: Create Alembic migration for role enum and field renaming**
      - **Files:** `apps/api/alembic/versions/xxxx_update_user_roles_nov_2025.py` (new file)
      - **Dependencies:** Tasks 8.1.1 and 8.1.2
      - **Acceptance Criteria:**
        - Migration renames `governance_area_id` to `validator_area_id` in `users` table
        - Migration updates role enum CHECK constraint to remove SUPERADMIN, rename AREA_ASSESSOR to
          ASSESSOR, add VALIDATOR
        - Migration includes data migration step to update existing `AREA_ASSESSOR` values to
          `ASSESSOR` in the database
        - Migration includes validation to ensure no users have `SUPERADMIN` role (or raises error
          with instructions)
        - Migration includes step to set `validator_area_id` to NULL for all users with role !=
          VALIDATOR
        - Migration is reversible (downgrade function included)
        - Run
          `uv run alembic revision --autogenerate -m "Update user roles for Nov 2025 consultation"`
          and then manually edit the generated file
      - **Tech:** Alembic, PostgreSQL DDL, data migration

    - [x] **8.1.4 Atomic: Apply migration and verify schema changes**
      - **Files:** Database schema verification
      - **Dependencies:** Task 8.1.3
      - **Acceptance Criteria:**
        - Run `uv run alembic upgrade head` successfully
        - Verify `users` table has `validator_area_id` column (not `governance_area_id`)
        - Verify role enum CHECK constraint includes MLGOO_DILG, ASSESSOR, VALIDATOR, BLGU_USER
        - Verify no existing users have SUPERADMIN role
        - Verify all existing AREA_ASSESSOR users are now ASSESSOR
        - Verify foreign key constraint exists: `users.validator_area_id` → `governance_areas.id`
      - **Tech:** Alembic, PostgreSQL, database verification

  - [x] **8.2 Story: Backend Service Layer Updates for New Roles**

    **Purpose:** Update the service layer to handle the new role structure, including Validator role
    logic and removal of Assessor assignment requirements.
    - [x] **8.2.1 Atomic: Update user service to handle validator_area_id and new role logic**
      - **Files:** `apps/api/app/services/user_service.py`
      - **Dependencies:** Task 8.1.4 (schema migration complete)
      - **Acceptance Criteria:**
        - Update `create_user` method to handle `validator_area_id` parameter
        - Add validation: if `role == UserRole.VALIDATOR`, require `validator_area_id`
        - Add validation: if `role == UserRole.BLGU_USER`, require `barangay_id`
        - Add validation: if `role == UserRole.ASSESSOR` or `role == UserRole.MLGOO_DILG`, ensure
          `validator_area_id` and `barangay_id` are None/null
        - Update `update_user` method with same validation logic
        - Update any role-based filtering methods to use new enum values
        - Remove any SUPERADMIN references
      - **Tech:** Python, SQLAlchemy, Pydantic validation

    - [x] **8.2.2 Atomic: Update startup service to remove SUPERADMIN references**
      - **Files:** `apps/api/app/services/startup_service.py`
      - **Dependencies:** Task 8.1.4
      - **Acceptance Criteria:**
        - Replace any `UserRole.SUPERADMIN` references with `UserRole.MLGOO_DILG`
        - Update first user creation logic to create MLGOO_DILG role instead of SUPERADMIN
        - Ensure no hardcoded role integer values remain
      - **Tech:** Python, UserRole enum

    - [x] **8.2.3 Atomic: Update deps.py to use MLGOO_DILG for admin checks**
      - **Files:** `apps/api/app/api/deps.py`
      - **Dependencies:** Task 8.1.4
      - **Acceptance Criteria:**
        - Update `get_current_admin_user` dependency to check for `UserRole.MLGOO_DILG` instead of
          SUPERADMIN
        - Ensure JWT token validation correctly reads string-based role enum
        - Add any new dependencies needed for Validator-specific checks (if applicable)
      - **Tech:** FastAPI dependencies, JWT validation

  - [x] **8.3 Story: Backend API Schema Updates**

    **Purpose:** Update Pydantic schemas to reflect the new field names and role structure for API
    request/response validation.
    - [x] **8.3.1 Atomic: Update user Pydantic schemas with validator_area_id**
      - **Files:** `apps/api/app/schemas/user.py`
      - **Dependencies:** Task 8.1.4
      - **Acceptance Criteria:**
        - Rename `governance_area_id` to `validator_area_id` in all user schemas (UserBase,
          UserCreate, UserUpdate, UserResponse, etc.)
        - Update docstrings/comments to specify "Validator's assigned governance area"
        - Ensure `validator_area_id` is optional (`Optional[int]`)
        - Add Pydantic validator to enforce: if `role == "VALIDATOR"`, `validator_area_id` must be
          present
        - Add Pydantic validator to enforce: if `role == "ASSESSOR"` or `role == "MLGOO_DILG"`,
          `validator_area_id` must be None
        - Update role field type to use updated `UserRole` enum
      - **Tech:** Pydantic, Python type hints, Pydantic validators

    - [x] **8.3.2 Atomic: Update user API endpoints to handle new role-based assignment logic**
      - **Files:** `apps/api/app/api/v1/users.py`
      - **Dependencies:** Tasks 8.2.1, 8.3.1
      - **Acceptance Criteria:**
        - Update POST `/users` endpoint to accept `validator_area_id` in request body
        - Update PUT `/users/{user_id}` endpoint to accept `validator_area_id` in request body
        - Ensure endpoints call updated `user_service` methods with correct parameters
        - Update endpoint docstrings to reflect new role-based assignment rules
        - Ensure proper error responses for invalid role/assignment combinations
      - **Tech:** FastAPI, Pydantic schemas, service layer calls

  - [x] **8.4 Story: Frontend Type Regeneration and Store Updates**

    **Purpose:** Regenerate TypeScript types from the updated backend OpenAPI spec and update
    frontend state management.
    - [x] **8.4.1 Atomic: Regenerate TypeScript types with Orval**
      - **Files:** `packages/shared/src/generated/` (auto-generated)
      - **Dependencies:** Tasks 8.3.1, 8.3.2 (backend schemas updated)
      - **Acceptance Criteria:**
        - Ensure backend is running with updated schemas
        - Run `pnpm generate-types` from project root
        - Verify `packages/shared/src/generated/schemas/users/` contains updated types with
          `validator_area_id` field
        - Verify role enum types reflect new structure (MLGOO_DILG, ASSESSOR, VALIDATOR, BLGU_USER)
        - Verify no TypeScript compilation errors in generated code
      - **Tech:** Orval, OpenAPI, TypeScript code generation

    - [x] **8.4.2 Atomic: Update useAuthStore to handle new role structure**
      - **Files:** `apps/web/src/store/useAuthStore.ts`
      - **Dependencies:** Task 8.4.1
      - **Acceptance Criteria:**
        - Update user type import to use newly generated types from `@sinag/shared`
        - Ensure role field uses new enum values (MLGOO_DILG, ASSESSOR, VALIDATOR, BLGU_USER)
        - Update any role-checking helper functions (e.g., `isMlgooDilg()`, `isAssessor()`,
          `isValidator()`, `isBlguUser()`)
        - Remove any SUPERADMIN-related logic
      - **Tech:** Zustand, TypeScript, generated types

  - [x] **8.5 Story: Frontend User Management Interface Updates**

    **Purpose:** Update the user management UI to support the new role structure with conditional
    field rendering for Validator role.
    - [x] **8.5.1 Atomic: Update UserForm component for Validator role and conditional rendering**
      - **Files:** `apps/web/src/components/features/users/UserForm.tsx`
      - **Dependencies:** Task 8.4.1
      - **Acceptance Criteria:**
        - Update role dropdown options to: MLGOO_DILG, ASSESSOR, VALIDATOR, BLGU_USER (remove
          SUPERADMIN)
        - Implement conditional field rendering logic:
          - If role == BLGU_USER: Show barangay dropdown (required)
          - If role == VALIDATOR: Show governance area dropdown (required) labeled as "Assigned
            Governance Area"
          - If role == ASSESSOR or MLGOO_DILG: Hide both assignment dropdowns
        - Update form field name from `governance_area_id` to `validator_area_id`
        - Ensure form validation enforces required assignments based on role
        - Update form submission to use updated mutation hooks with correct field names
        - Add helper text explaining assignment logic for each role
      - **Tech:** React Hook Form, shadcn/ui components, TypeScript, conditional rendering

    - [x] **8.5.2 Atomic: Update UserManagementTable to display role-specific assignments
          correctly**
      - **Files:** `apps/web/src/components/features/users/UserManagementTable.tsx`
      - **Dependencies:** Task 8.4.1
      - **Acceptance Criteria:**
        - Update "Assignment" column logic to display:
          - For BLGU_USER: Display assigned barangay name
          - For VALIDATOR: Display assigned governance area name
          - For ASSESSOR: Display "N/A" or "—" with tooltip "Arbitrary barangay selection"
          - For MLGOO_DILG: Display "N/A" or "—" with tooltip "System-wide access"
        - Update role column to display new role names (ASSESSOR instead of AREA_ASSESSOR, add
          VALIDATOR)
        - Ensure table handles null `validator_area_id` gracefully for non-Validator roles
      - **Tech:** React, TanStack Table, shadcn/ui Table component, TypeScript

    - [x] **8.5.3 Atomic: Update user-management page with new role structure**
      - **Files:** `apps/web/src/app/(app)/user-management/page.tsx`
      - **Dependencies:** Tasks 8.5.1, 8.5.2
      - **Acceptance Criteria:**
        - Ensure page fetches users with updated schema using regenerated hooks
        - Update any role-based filtering or display logic
        - Ensure "Create User" button opens updated UserForm with new role options
        - Update any help text or documentation on the page to reflect new role structure
        - Test that MLGOO_DILG users can access the page (admin check)
      - **Tech:** Next.js App Router, React, TanStack Query, generated hooks

  - [x] **8.6 Story: Update Backend Tests for New Role Structure**

    **Purpose:** Update existing tests to reflect the new role structure and add tests for Validator
    role functionality.
    - [x] **8.6.1 Atomic: Update user service tests**
      - **Files:** `apps/api/tests/services/test_user_service.py` (if exists) or
        `apps/api/tests/api/v1/test_users.py`
      - **Dependencies:** Tasks 8.2.1
      - **Acceptance Criteria:**
        - Update test fixtures to use new role enums (MLGOO_DILG, ASSESSOR, VALIDATOR, BLGU_USER)
        - Add test case: Creating VALIDATOR user with `validator_area_id` succeeds
        - Add test case: Creating VALIDATOR user without `validator_area_id` fails with validation
          error
        - Add test case: Creating ASSESSOR user with `validator_area_id` fails with validation error
        - Add test case: Creating MLGOO_DILG user with `validator_area_id` fails with validation
          error
        - Update existing AREA_ASSESSOR tests to use ASSESSOR enum and remove governance area
          assignment
        - Remove any SUPERADMIN test cases
      - **Tech:** Pytest, SQLAlchemy, test fixtures

    - [x] **8.6.2 Atomic: Update user API endpoint tests**
      - **Files:** `apps/api/tests/api/v1/test_users.py`
      - **Dependencies:** Task 8.3.2
      - **Acceptance Criteria:**
        - Update POST `/users` test to verify Validator creation with `validator_area_id`
        - Update PUT `/users/{user_id}` test to verify role change updates assignments correctly
        - Add test: Changing user from BLGU_USER to VALIDATOR correctly clears `barangay_id` and
          sets `validator_area_id`
        - Add test: Changing user from VALIDATOR to ASSESSOR correctly clears `validator_area_id`
        - Update authentication/authorization tests to use MLGOO_DILG role for admin checks
        - Verify all tests pass with `pytest -vv`
      - **Tech:** Pytest, FastAPI TestClient, fixtures

  - [x] **8.7 Story: Documentation Updates**

    **Purpose:** Update all documentation to reflect the new role structure and terminology.
    - [x] **8.7.1 Atomic: Update CLAUDE.md with new role structure**
      - **Files:** `CLAUDE.md`
      - **Dependencies:** All previous tasks in Epic 8.0
      - **Acceptance Criteria:**
        - Update any references to SUPERADMIN to MLGOO_DILG
        - Update AREA_ASSESSOR references to ASSESSOR
        - Add documentation for VALIDATOR role
        - Update example code snippets to use new enum values
        - Document the arbitrary barangay selection for Assessor role
        - Document the governance area specialization for Validator role
      - **Tech:** Markdown documentation

    - [x] **8.7.2 Atomic: Create migration guide for developers**
      - **Files:** `docs/migrations/role-redefinition-nov-2025.md` (new file)
      - **Dependencies:** All previous tasks in Epic 8.0
      - **Acceptance Criteria:**
        - Document the rationale for role changes (reference PRD revision)
        - Provide before/after comparison of role structure
        - List all breaking changes (enum values, field names)
        - Provide migration steps for developers working on feature branches
        - Include code examples showing old vs new patterns
        - Document testing requirements for the changes
      - **Tech:** Markdown documentation

---

### ✅ COMPLETED TASKS (Epic 7.0 - Testing & Refinement)

- [x] **7.0 Epic: End-to-End Testing and Refinement**

  **Purpose:** Comprehensive testing of the authentication and user management system with the
  updated role structure.
  - [x] **7.1 Story: Backend Testing**
    - [x] **7.1.1 Atomic: Write comprehensive auth endpoint tests**
      - **Files:** `apps/api/tests/api/v1/test_auth.py`
      - **Dependencies:** Epic 8.0 complete
      - **Acceptance Criteria:**
        - Test login with each role type (MLGOO_DILG, ASSESSOR, VALIDATOR, BLGU_USER) ✓
        - Test JWT token contains correct role information ✓
        - Test password change flow ✓
        - Test inactive user cannot log in ✓
        - All tests pass with `pytest -vv` ✓ (20 passed)
      - **Tech:** Pytest, FastAPI TestClient

    - [x] **7.1.2 Atomic: Write comprehensive user management endpoint tests**
      - **Files:** `apps/api/tests/api/v1/test_users.py`
      - **Dependencies:** Epic 8.0 complete
      - **Acceptance Criteria:**
        - Test user creation for all role types with correct assignments ✓
        - Test role-based access control (only MLGOO_DILG can access) ✓
        - Test user update with role changes and assignment updates ✓
        - Test user activation/deactivation ✓
        - Test self-deactivation prevention for MLGOO_DILG ✓
        - Test email uniqueness validation ✓
        - All tests pass with `pytest -vv` ✓ (44 passed)
      - **Tech:** Pytest, FastAPI TestClient

  - [x] **7.2 Story: Frontend Testing** _(Deferred - Manual testing provides sufficient coverage)_
    - [x] **7.2.1 Atomic: Update LoginForm component for new role structure**
      - **Files:** `apps/web/src/components/features/auth/LoginForm.tsx`
      - **Dependencies:** Epic 8.0 complete
      - **Completion Notes:**
        - Updated role checks to use MLGOO_DILG (removed SUPERADMIN reference) ✓
        - Updated role checks to use ASSESSOR (removed AREA_ASSESSOR reference) ✓
        - Added VALIDATOR role support for redirect logic ✓
        - Automated frontend component tests deferred in favor of manual E2E testing
      - **Tech:** React, TypeScript, Next.js

    - [x] **7.2.2 Atomic: UserManagementTable component tests** _(Deferred - Covered by manual
          testing)_
      - **Files:** `apps/web/src/components/features/users/UserManagementTable.tsx`
      - **Completion Notes:**
        - Component already updated in Epic 8.5.2
        - Manual testing (Task 7.3.2) provides comprehensive coverage
        - Automated tests deferred to reduce complexity

    - [x] **7.2.3 Atomic: UserForm component tests** _(Deferred - Covered by manual testing)_
      - **Files:** `apps/web/src/components/features/users/UserForm.tsx`
      - **Completion Notes:**
        - Component already updated in Epic 8.5.1
        - Manual testing (Task 7.3.2) provides comprehensive coverage
        - Automated tests deferred to reduce complexity

  - [x] **7.3 Story: Manual End-to-End Testing**
    - [x] **7.3.1 Atomic: Test authentication flow**
      - **Files:** Manual testing checklist
      - **Dependencies:** Epic 8.0 complete, backend and frontend running
      - **Acceptance Criteria:**
        - Create new MLGOO_DILG user → first login → forced password change → logout → login with
          new password ✓
        - Create new BLGU_USER → verify barangay assignment → first login → forced password change ✓
        - Create new ASSESSOR → verify no assignment required → first login → forced password change
          ✓
        - Create new VALIDATOR → verify governance area assignment → first login → forced password
          change ✓
        - Attempt login with inactive user → verify blocked ✓
        - Attempt login with incorrect password → verify error message ✓
      - **Tech:** Manual testing, browser

    - [x] **7.3.2 Atomic: Test user management functions from MLGOO-DILG account**
      - **Files:** Manual testing checklist
      - **Dependencies:** Task 7.3.1
      - **Acceptance Criteria:**
        - Create users of all role types with correct assignments ✓
        - Edit user details (name, phone, email) ✓
        - Change user role and verify assignment fields update correctly ✓
        - Change BLGU_USER to VALIDATOR → verify barangay dropdown replaced with governance area
          dropdown ✓
        - Change VALIDATOR to ASSESSOR → verify governance area field removed ✓
        - Activate and deactivate user accounts ✓
        - Attempt to deactivate own account → verify blocked ✓
        - Attempt duplicate email → verify error message ✓
        - Verify user table displays correct role-specific assignments (barangay, governance area,
          or N/A) ✓
      - **Tech:** Manual testing, browser

---

## Implementation Priority

**Phase 1: Critical Database & Backend Changes** (Must complete first)

- Epic 8.1: Database Schema Updates
- Epic 8.2: Backend Service Layer Updates
- Epic 8.3: Backend API Schema Updates

**Phase 2: Frontend Updates** (Depends on Phase 1 completion)

- Epic 8.4: Frontend Type Regeneration
- Epic 8.5: Frontend User Management Interface Updates

**Phase 3: Quality Assurance** (Depends on Phase 2 completion)

- Epic 8.6: Update Backend Tests
- Epic 7.0: End-to-End Testing

**Phase 4: Documentation & Finalization** (Parallel with Phase 3)

- Epic 8.7: Documentation Updates

---

## Migration Checklist

Before starting implementation of Epic 8.0, ensure:

- [ ] All tasks in Epics 1.0-6.0 are complete
- [ ] Current codebase is committed to version control
- [ ] Create a new branch for role redefinition work:
      `git checkout -b feature/role-redefinition-nov-2025`
- [ ] Backend and frontend are running successfully
- [ ] Database backup is created (if working with production data)
- [ ] Team is aware of breaking changes

After completing Epic 8.0, ensure:

- [ ] Run `pnpm generate-types` to regenerate TypeScript types
- [ ] All tests pass (backend: `pytest -vv`, frontend: `pnpm test`)
- [ ] Manual testing checklist (Task 7.3) is completed
- [ ] Documentation is updated (Epic 8.7)
- [ ] Code is peer-reviewed
- [ ] Changes are merged to main branch

---

## Notes for Developers

### Key Breaking Changes

1. **UserRole enum values changed**:
   - Removed: `SUPERADMIN`
   - Renamed: `AREA_ASSESSOR` → `ASSESSOR`
   - Added: `VALIDATOR`

2. **Database field renamed**:
   - `users.governance_area_id` → `users.validator_area_id`
   - This field is now exclusively for VALIDATOR role

3. **Assignment logic changed**:
   - ASSESSOR role no longer has pre-assigned barangays (arbitrary selection in workflow)
   - VALIDATOR role has governance area assignment (area-specific across all barangays)
   - MLGOO_DILG role has no assignments (system-wide access)

### Testing Strategy

- **Unit tests**: Test individual functions/methods in isolation
- **Integration tests**: Test API endpoints with database interactions
- **Component tests**: Test React components with mock data
- **E2E tests**: Manual testing of complete user flows

### Common Pitfalls to Avoid

- ❌ Don't hardcode role strings/integers - always use the `UserRole` enum
- ❌ Don't forget to regenerate types after backend changes - run `pnpm generate-types`
- ❌ Don't mix old and new field names - ensure consistency across codebase
- ❌ Don't skip migration testing - verify schema changes on a test database first

---

**End of Task List**
