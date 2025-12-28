# **PRD: Core User Authentication & Management**

---

## **Revision History**

### **November 5, 2025 - Major Revision**

**Reason:** Incorporating changes from November 4, 2025 DILG consultation (Phase 1 roadmap updates)

**Key Changes:**

- **User Roles Redefined**: Removed SUPERADMIN role. "Area Assessor" renamed to "Assessor" (no
  longer area-specific). New "Validator" role introduced for Phase 2 (Table Validation).
- **Assessor Assignment Logic Changed**: Assessors no longer have pre-assigned barangays in their
  user profile. They dynamically select barangays to assess within their workflow (arbitrary
  assignment).
- **MLGOO-DILG Role Clarified**: Acts as Assessor during Phase 1 with arbitrary barangay selection
  (no fixed assignments in profile). Gains Chairman role with special powers in Phase 2.
- **Database Schema Updates**: `assessor_area` field renamed to `validator_area_id` and made
  specific to Validator role only. Role enumeration re-indexed without SUPERADMIN.
- **User Management Interface**: Added support for creating Validator users with governance area
  assignment. Removed barangay assignment fields for Assessor role (now arbitrary). BLGU User still
  requires single barangay assignment.

---

## **1. Introduction & Overview**

**Project Title:** SGLGB Analytics System: Strategic Insights Nurturing Assessments and Governance
(SINAG) To Assess And Assist Barangays utilizing a Large Language Model and Classification Algorithm

This document outlines the requirements for the **Core User Authentication & Management** feature
for the SINAG platform. This is the foundational security and access control layer, enabling secure
user login and providing administrators with the tools to manage user accounts, roles, and
permissions. As the primary gateway to the application, its successful implementation is a
prerequisite for all other features.

The goal is to create a secure, closed authentication system where users are managed internally by a
designated administrator, the **Municipal Local Government Operations Officer - Department of the
Interior and Local Government (MLGOO-DILG)**.

This PRD reflects the updated role structure and workflow terminology from the November 4, 2025 DILG
consultation, establishing the foundation for the two-phase assessment workflow: **Table Assessment
(Phase 1)** with Assessors, and **Table Validation (Phase 2)** with Validators.

---

## **2. Goals**

- **Secure Access:** To ensure that only registered and authenticated users can access the
  application's internal pages.
- **Role-Based Dashboards:** To redirect users to a specific, role-based dashboard immediately after
  a successful login.
- **Administrative Control:** To provide the MLGOO-DILG with a comprehensive interface to manage the
  lifecycle of user accounts for all role types (BLGU Users, Assessors, Validators, and MLGOO-DILG
  users).
- **System Integrity:** To establish a robust security posture by implementing JWT-based
  authentication and protecting all API endpoints.
- **Flexible Role Structure:** To support the redefined role structure where Assessors have
  arbitrary barangay selection, Validators specialize by governance area, and MLGOO-DILG users have
  dual-phase responsibilities.

---

## **3. User Stories**

### **As a user (BLGU User, Assessor, Validator, MLGOO-DILG), I want to:**

- See a clean and professional login page.
- Securely log in using my email address and password.
- Be redirected to my specific role-based dashboard upon successful login:
  - **BLGU User:** Sees a dashboard focused on their single assigned barangay, highlighting Table
    Assessment status and action items.
  - **Assessor:** Sees a dashboard with a queue of submissions for barangays they can assess
    (covering all governance areas for each barangay, with arbitrary barangay selection).
  - **Validator:** Sees a dashboard with submissions across all barangays filtered to their assigned
    governance area (Phase 2).
  - **MLGOO-DILG:** Sees an administrative dashboard with system-wide oversight, user management
    access, and the ability to act as an Assessor during Phase 1.
- Be shown a clear, generic error message if my login credentials are incorrect.
- Be prevented from accessing any internal pages if I am not logged in.
- Securely log out of the system, terminating my session.

### **As the MLGOO-DILG, I want to:**

- Access a "User Management" page from my dashboard.
- View a table of all registered users in the system.
- Create new user accounts by providing their full name, email, and phone number.
- When creating a user, I must be able to assign them a specific, predefined role from the updated
  role list:
  - **MLGOO-DILG**
  - **Assessor**
  - **Validator**
  - **BLGU User**
- **If I assign the "BLGU User" role**, a dropdown menu populated with a predefined list of
  barangays must be presented, and I must select one barangay to assign to that user.
- **If I assign the "Validator" role**, a dropdown menu populated with a predefined list of
  governance areas must be presented, and I must select one governance area to assign to that user.
- **If I assign the "Assessor" role**, no barangay or area assignment field should be shown, as
  Assessors dynamically select barangays within their workflow (arbitrary assignment).
- **If I assign the "MLGOO-DILG" role**, no assignment fields should be shown, as MLGOO-DILG users
  have system-wide access and can act as Assessors with arbitrary barangay selection.
- Edit the details (name, role, phone number, and role-specific assignments) of an existing user.
- When editing a user's role, the appropriate assignment fields should dynamically appear or
  disappear based on the selected role.
- Activate or deactivate a user account to grant or revoke their access. Inactive users must not be
  able to log in.

---

## **4. Functional Requirements**

### **4.1. Login & Authentication**

4.1.1. The system must present a login page at a public route (e.g., `/login`).

4.1.2. Users must be able to input their email and password.

4.1.3. Upon submission, the system will validate credentials against the `users` table.

4.1.4. On successful validation, the system will generate a signed JWT and return it to the client.
The JWT payload must include the user's ID and role.

4.1.5. On failed validation, the system must display a generic error message (e.g., "Invalid
credentials, please try again").

4.1.6. The client application must store the JWT and use it for all subsequent API requests.

4.1.7. All application routes, except for the login page, must be protected. Unauthenticated users
attempting to access them must be redirected to the login page.

4.1.8. A "Logout" function must be available, which will clear the user's session data from the
client and redirect them to the login page.

4.1.9. When the MLGOO-DILG creates a new user account, they must set a temporary password. The user
must be prompted to change this temporary password upon their first successful login.

### **4.2. User Management (MLGOO-DILG Only)**

4.2.1. A "User Management" interface must be accessible to users with the "MLGOO-DILG" role.

4.2.2. This interface must display a table of all users with the following columns:

- **Full Name**
- **Email Address**
- **Phone Number**
- **Role** (displayed as: MLGOO-DILG, Assessor, Validator, BLGU User)
- **Assignment** (displays either: assigned barangay for BLGU Users, assigned governance area for
  Validators, or "N/A" for Assessors and MLGOO-DILG)
- **Account Status** (Active/Inactive)

  4.2.3. The MLGOO-DILG must be able to create a new user by clicking a "Create User" button, which
  opens a form with the following fields:

- Full Name (required)
- Email Address (required, must be unique)
- Phone Number (required)
- Role (required, dropdown selection)
- Temporary Password (required, must meet minimum security requirements)
- Role-specific assignment field (conditionally displayed based on role selection)

  4.2.4. **Role-Specific Assignment Logic During User Creation:**

- **If "BLGU User" is selected:** Display a required dropdown menu populated with all barangays from
  the `barangays` table. The MLGOO-DILG must select one barangay.
- **If "Validator" is selected:** Display a required dropdown menu populated with all governance
  areas from the `governance_areas` table. The MLGOO-DILG must select one governance area.
- **If "Assessor" is selected:** No assignment field is displayed. Assessors will have arbitrary
  barangay selection within their workflow.
- **If "MLGOO-DILG" is selected:** No assignment field is displayed. MLGOO-DILG users have
  system-wide access.

  4.2.5. The MLGOO-DILG must be able to edit an existing user by clicking an "Edit" button on a user
  row, which opens a form pre-populated with the user's current data, allowing changes to:

- Full Name
- Phone Number
- Role (with dynamic assignment field updates)
- Role-specific assignment (following the same logic as creation)
- Account Status (Active/Inactive toggle)

  4.2.6. When a user's role is changed during editing, the form must dynamically update to show or
  hide the appropriate assignment field:

- Changing to "BLGU User" shows barangay dropdown
- Changing to "Validator" shows governance area dropdown
- Changing to "Assessor" or "MLGOO-DILG" hides assignment fields

  4.2.7. The MLGOO-DILG must be able to toggle a user's account status between "Active" and
  "Inactive". Inactive users must not be able to log in.

  4.2.8. The system must prevent the MLGOO-DILG from deactivating their own account to avoid lockout
  scenarios.

  4.2.9. The system must validate that email addresses are unique during user creation and editing,
  displaying an error message if a duplicate is detected.

---

## **5. Non-Goals (Out of Scope for this Epic)**

- A public-facing user registration/signup page.
- A "Forgot Password" self-service flow.
- A "Remember Me" feature for persistent sessions.
- A user-facing profile page for users to edit their own details (covered in Phase 7).
- A dynamic permission system beyond the fixed, predefined roles.
- Implementation of phase-specific role behaviors (Assessor workflow in Phase 3A, Validator workflow
  in Phase 3B).
- Multiple barangay assignments for Assessors (arbitrary selection happens in workflow, not user
  profile).
- Tracking of MLGOO-DILG barangay assignments for their Assessor function (arbitrary selection).
- Multiple governance area assignments for Validators (one area per Validator).

---

## **6. Design & UX Considerations**

- All UI elements will be built using `shadcn/ui` components for a consistent and professional look.
- The login page should be minimal, clean, and clearly branded for SINAG.
- The User Management table should be clear and easy to read, with intuitive controls for creating
  and editing users.
- The flow for forcing a new user to change their temporary password must be clear and
  non-skippable.
- The user creation/editing form must provide clear visual feedback when role-specific fields appear
  or disappear based on role selection.
- The "Assignment" column in the user table should clearly indicate when a role does not require an
  assignment (e.g., display "N/A" or "—" for Assessors and MLGOO-DILG users).
- Form validation errors should be displayed inline and be specific (e.g., "This email address is
  already in use").

---

## **7. Technical Considerations**

### **Architecture**

This feature will be built within the established **monorepo structure**. All generated API types
and client-side fetching hooks will be located in the **`packages/shared`** directory, consumed by
the frontend as a local package.

### **Backend (FastAPI)**

- Use `passlib` for hashing and verifying passwords.
- Use `python-jose` for creating and validating JWTs.
- The `/api/v1/auth/login` endpoint will handle credential validation and token issuance.
- All data-related API endpoints will be protected by a dependency that verifies the JWT from the
  `Authorization` header.
- Implement role-based access control (RBAC) at the endpoint level to ensure only MLGOO-DILG users
  can access user management endpoints.

### **Frontend (Next.js)**

- An Axios instance in `lib/api.ts` will manage API communication. An interceptor will be used to
  automatically attach the JWT to request headers.
- A Zustand store (`useAuthStore`) will manage the global authentication state (user info, token).
- Next.js middleware (`middleware.ts`) will handle route protection and redirection logic based on
  authentication status and user role.
- The user management form will use controlled components with conditional rendering for
  role-specific assignment fields.

### **Database Schema**

The `users` table will be structured for performance and clarity with integer-based keys and roles:

- `id`: `Integer` (Primary Key)
- `full_name`: `VARCHAR` (required)
- `email`: `VARCHAR` (required, unique)
- `phone_number`: `VARCHAR` (required)
- `hashed_password`: `VARCHAR` (required)
- `role`: `SMALLINT` representing user permissions:
  - `0`: MLGOO-DILG
  - `1`: Assessor
  - `2`: Validator
  - `3`: BLGU User
- `barangay_id`: `Integer` (nullable, Foreign Key to `barangays.id`). Only used when `role` is `3`
  (BLGU User).
- `validator_area_id`: `Integer` (nullable, Foreign Key to `governance_areas.id`). Only used when
  `role` is `2` (Validator). This field specifies the Validator's assigned governance area.
- `is_active`: `Boolean` (default: `true`)
- `must_change_password`: `Boolean` (default: `true`)
- `created_at`: `TIMESTAMP`
- `updated_at`: `TIMESTAMP`

**Supporting Tables:**

- `barangays` table: Seeded with the predefined list of the 25 barangays of Sulop.
  - `id`: `Integer` (Primary Key)
  - `name`: `VARCHAR` (required, unique)
  - Other barangay-specific fields as needed

- `governance_areas` table: Seeded with the predefined list of SGLGB governance areas.
  - `id`: `Integer` (Primary Key)
  - `name`: `VARCHAR` (required, unique)
  - Other area-specific fields as needed

**Database Migration Notes:**

- A migration must be created to:
  - Remove the `SUPERADMIN` role (if it exists in the current schema)
  - Rename `assessor_area` to `validator_area_id`
  - Update the `role` enum values to the new structure (0: MLGOO-DILG, 1: Assessor, 2: Validator, 3:
    BLGU User)
  - Add foreign key constraint from `users.validator_area_id` to `governance_areas.id`
  - Ensure `barangay_id` foreign key constraint to `barangays.id` exists

---

## **8. Success Metrics**

- 100% of internal application routes are inaccessible to unauthenticated users.
- The MLGOO-DILG can successfully perform all specified user management functions:
  - Create a BLGU User with a barangay assignment
  - Create an Assessor without any assignment fields
  - Create a Validator with a governance area assignment
  - Create another MLGOO-DILG user without any assignment fields
  - Edit user details and change roles with correct dynamic field behavior
  - Activate and deactivate user accounts
- Users are correctly redirected to their role-specific dashboard after logging in.
- The forced password change flow for new users works as required.
- The user management table correctly displays role-specific assignments (barangay for BLGU Users,
  governance area for Validators, N/A for Assessors and MLGOO-DILG).
- Email uniqueness validation prevents duplicate user creation.
- The MLGOO-DILG cannot deactivate their own account.

---

## **9. Open Questions**

- None at this time. The scope is well-defined based on the November 4, 2025 DILG consultation and
  clarifications provided.

---

## **10. Implementation Notes**

### **For Backend Developers:**

1. Update the `User` SQLAlchemy model in `apps/api/app/db/models/user.py` to reflect the new schema
   (rename field, update role enum).
2. Create an Alembic migration for the database schema changes.
3. Update Pydantic schemas in `apps/api/app/schemas/user.py` to include the new role structure and
   conditional validation logic for assignments.
4. Implement user CRUD operations in `apps/api/app/services/user_service.py` with proper role-based
   assignment handling.
5. Create/update user management endpoints in `apps/api/app/api/v1/users.py` with MLGOO-DILG role
   guard.
6. Ensure JWT token generation includes the user's role for frontend route protection.

### **For Frontend Developers:**

1. Build the login page at `apps/web/src/app/(auth)/login/page.tsx`.
2. Implement the User Management interface at `apps/web/src/app/(app)/user-management/page.tsx`.
3. Create reusable form components in `apps/web/src/components/features/users/` for user creation
   and editing with conditional field rendering.
4. Implement role-based routing logic in `apps/web/middleware.ts` to redirect users to appropriate
   dashboards.
5. Configure the `useAuthStore` Zustand store to manage authentication state globally.
6. Use generated React Query hooks from `@sinag/shared` for all API interactions.

### **Testing Checklist:**

- [ ] Login with valid credentials redirects to correct role-based dashboard
- [ ] Login with invalid credentials shows generic error message
- [ ] Unauthenticated users cannot access protected routes
- [ ] MLGOO-DILG can view all users in the user management table
- [ ] MLGOO-DILG can create BLGU User with barangay assignment
- [ ] MLGOO-DILG can create Assessor without assignment fields
- [ ] MLGOO-DILG can create Validator with governance area assignment
- [ ] MLGOO-DILG can create another MLGOO-DILG user without assignment fields
- [ ] User creation form shows/hides assignment fields correctly based on role selection
- [ ] Email uniqueness validation works during user creation
- [ ] MLGOO-DILG can edit user details and change roles
- [ ] Role change during editing updates assignment fields dynamically
- [ ] MLGOO-DILG can activate/deactivate user accounts
- [ ] MLGOO-DILG cannot deactivate their own account
- [ ] Inactive users cannot log in
- [ ] New users are forced to change their temporary password on first login
- [ ] Logout clears session and redirects to login page

---

**End of PRD**
