# Changelog

All notable changes to the SINAG project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Analytics Scrollable Table and Unified Adjustment Terminology (2025-12-28)

**Summary:** Improved analytics table usability with scrollable containers and unified terminology
for rework/calibration actions across the codebase.

- **Scrollable Table Improvements**
  - Added scrollable container with sticky headers to BarangayStatusTable
  - Implemented visual scroll indicator (gradient fade) for better UX
  - Added accessibility attributes (role, aria-label, tabIndex) for keyboard navigation
  - Optimized scroll handler to prevent unnecessary re-renders
  - Added disabled state styling for rows without assessment data
  - Responsive height: 300px mobile, 400px desktop

- **Unified Adjustment Terminology**
  - Consolidated "rework" and "calibration" terms to "adjustment" across API and UI
  - Simplified TopReworkReasonsCard by removing source-based color differentiation
  - Updated schemas and services to use consistent adjustment terminology

**Files Changed:**

- `apps/api/app/api/v1/analytics.py`
- `apps/api/app/schemas/analytics.py`
- `apps/api/app/services/analytics_service.py`
- `apps/web/src/components/features/dashboard/TopReworkReasonsCard.tsx`
- `apps/web/src/components/features/municipal-overview/BarangayStatusTable.tsx`

#### Technical Notes Repositioned in BLGU Assessment Form (2025-12-28)

**Summary:** Improved user experience by moving Technical Notes to a more prominent position.

- Moved TechNotesPDF component from bottom to top of indicator form
- Enhances visibility for BLGU users when filling out assessments

**Files Changed:**

- `apps/web/src/components/features/assessments/AssessmentContentPanel.tsx`

### Changed

### Fixed

#### Rework Handling for OR-Logic Indicators (2025-12-28)

**Summary:** Fixed critical validation bugs affecting BLGU rework submissions for indicators with
OR-logic validation rules.

- **OR-Logic Validation Fixes**
  - Fixed ANY_ITEM_REQUIRED, OR_LOGIC_AT_LEAST_1_REQUIRED, ANY_OPTION_GROUP_REQUIRED, and
    SHARED_PLUS_OR_LOGIC validation during rework mode
  - BLGU users now only need to satisfy ONE option group, not replace ALL rejected files
  - Aligns with SGLGB assessment workflow expectations

- **Field-Level Rework Bug Fix**
  - Only files WITH annotations are marked invalid during rework
  - Files in other fields without annotations remain valid
  - Updated CompletionFeedbackPanel to match DynamicFormRenderer validation logic

**Files Changed:**

- `apps/web/src/components/features/forms/CompletionFeedbackPanel.tsx`
- `apps/web/src/components/features/forms/DynamicFormRenderer.tsx`
- `apps/web/src/components/features/forms/fields/FileFieldComponent.tsx`

#### Onboarding Tour Loop and Tooltip Placement (2025-12-28)

**Summary:** Resolved recurring onboarding tour issues and improved tooltip responsiveness.

- Fixed recurring loop where BLGU tour restarted after tab close
- Improved tooltip responsiveness for mobile screens
- Added preventOverflow config to keep tooltips within viewport
- Enhanced preferences caching to persist tour completion state

**Files Changed:**

- `apps/web/src/components/tour/TourTooltip.tsx`
- `apps/web/src/hooks/useTourAutoStart.ts`
- `apps/web/src/providers/TourProvider.tsx`

### Security

#### React and Next.js Security Patch (2025-12-28)

**Summary:** Critical security update addressing CVE-2025-55182 (React2Shell vulnerability).

- Updated React to 19.2.3 (from vulnerable version)
- Updated Next.js to 16.0.10
- Addresses CVSS 10.0 RCE vulnerability in React Server Components

**Files Changed:**

- `apps/web/package.json`
- `pnpm-lock.yaml`

---

#### BBI 4-Tier Compliance Rating System (2025-12-08)

**Summary:** Implemented the official DILG MC 2024-417 BBI (Barangay-Based Institutions) compliance
rating system with 4-tier functionality ratings and improved visibility for validators.

- **4-Tier Rating System**
  - HIGHLY_FUNCTIONAL: 75-100% compliance
  - MODERATELY_FUNCTIONAL: 50-74% compliance
  - LOW_FUNCTIONAL: 1-49% compliance
  - NON_FUNCTIONAL: 0% compliance (new distinction from LOW_FUNCTIONAL)

- **Schema Changes**
  - Added `barangay_id`, `assessment_year`, `indicator_id` to BBIResult model
  - Added unique constraint per barangay/year/BBI combination
  - Removed legacy FUNCTIONAL/NON_FUNCTIONAL enum values
  - Source of truth: `validation_status` (validator decisions)

- **BBI Visibility Improvements**
  - VALIDATOR role now has access to Analytics page (previously MLGOO only)
  - Added Analytics & Reports navigation link to validator sidebar
  - BBI indicator badges (2.1, 3.1, 3.2, 4.1, 4.3, 4.5, 6.1) shown in tree navigator
  - BBIPreviewPanel moved to sticky footer with expanded default state

- **Trigger Integration**
  - BBI compliance calculated automatically when assessment reaches COMPLETED status
  - Added `calculate_all_bbi_compliance()` for batch calculation

- **API Endpoints**
  - GET `/api/v1/bbis/compliance/barangay/{barangay_id}` - Get BBI results by barangay
  - Updated existing BBI endpoints with year filter support

- **Documentation**
  - New feature documentation: `docs/features/bbi-compliance.md`

### Changed

#### CI/CD Quality Gates Enhancement (2025-12-08)

**Summary:** Improved deployment workflow to ensure all quality checks pass before deployment.

- **Deploy Workflow Updates**
  - Added `actions: read` permission for querying workflow status
  - Deploy now waits for CI workflow to complete (up to 10 minutes)
  - Deploy waits for Security workflow to complete (up to 5 minutes)
  - Quality gates: Build + CI + Security must all pass before deployment
  - Manual deployments still bypass quality gates (use with caution)

#### Developer Experience Improvements (2025-12-08)

**Summary:** Pre-commit hooks now auto-format Python files instead of just checking.

- **Pre-commit Hook Changes**
  - Python files are now automatically formatted with `ruff format`
  - Formatted files are automatically re-staged before commit
  - Prevents CI failures from unformatted code
  - Still runs `ruff check --fix` for linting auto-fixes

### Fixed

- Minor typo fix in CI permissions ("permssions" -> "permissions" in deploy workflow)

---

#### User Management Validation and Error Handling (2025-11-30)

**Summary:** Comprehensive validation and error handling improvements for user management, including
role-based routing fixes and form validation enhancements.

- **Role-Based Routing Fix**
  - Fixed password change page redirect logic to correctly route all 5 user roles to their
    appropriate dashboards
  - KATUPARAN_CENTER_USER now correctly redirects to `/external-analytics` instead of
    `/blgu/dashboard`
  - ASSESSOR redirects to `/assessor/submissions`
  - VALIDATOR redirects to `/validator/submissions`
  - Prevents "access denied" errors for non-BLGU users after password change

- **User Form Validation**
  - Enhanced UserForm component with comprehensive validation
  - Improved error message extraction from API responses
  - Added role-based field visibility (validator_area_id, barangay_id)
  - Better handling of validation errors returned as arrays

- **Lookups API Enhancement**
  - Added `/api/v1/lookups/roles` endpoint with human-readable role descriptions
  - UserRoleOption schema with value, label, and description for better UX
  - Supports dynamic role dropdown population in admin forms

- **Backend Tests**
  - Added comprehensive password change routing tests (`test_auth_password_change_routing.py`)
  - Tests cover all 5 user roles with parameterized test cases
  - Validates token validity, role-based access, and error handling

#### Production Deployment Infrastructure (2025-11-28)

**Summary:** Production-ready Docker configuration, Nginx reverse proxy, and EC2 deployment
automation.

- **Nginx Reverse Proxy**
  - Complete Nginx configuration with request routing (`/api/*` -> FastAPI, `/` -> Next.js)
  - Rate limiting (30 req/s per IP), security headers, and gzip compression
  - SSL-ready template for future HTTPS deployment
  - Health checks and zero-downtime configuration reloads
  - Documentation: `docs/guides/nginx-reverse-proxy-setup.md`, `docs/guides/nginx-quick-start.md`

- **Docker Production Configuration**
  - New `docker-compose.prod.yml` with resource limits and health checks
  - Multi-stage Dockerfiles optimized for production (50-83% image size reduction)
  - Docker secrets for sensitive configuration management
  - Network isolation between frontend and backend services
  - Security scanning scripts (`docker-security-scan.sh`)

- **EC2 Deployment Automation**
  - Automated deployment script (`scripts/deploy.sh`) with migration error handling
  - EC2 setup script (`scripts/setup-ec2.sh`) with OS detection (Amazon Linux, Ubuntu)
  - GitHub Actions workflows for CI/CD (`build-and-push.yml`, `deploy.yml`)
  - Comprehensive EC2 deployment guide: `docs/guides/ec2-deployment-guide.md`
  - DevOps checklist: `docs/guides/devops-checklist.md`

- **DevOps Fixes Applied**
  - Next.js standalone output configuration for production builds
  - Web container health check endpoint (`/api/health`)
  - Environment variable passthrough for NEXT_PUBLIC_API_URL
  - Nginx non-root user fix for port 80 binding
  - Migration failure handling in deploy script

#### Gemini API Integration Enhancement (2025-11-29)

**Summary:** Enhanced AI-powered insights with improved Gemini API integration and streamlined
production deployment.

- Improved intelligence service with better error handling
- Optimized API request batching for classification tasks
- Enhanced CapDev recommendation generation

#### Dashboard Analytics Improvements (2025-11-29)

**Summary:** Fixed dashboard analytics types and added barangay rankings.

- Added barangay rankings endpoint and UI component
- Fixed dashboard analytics TypeScript types
- Improved analytics service with new metrics
- Refactored dashboard to use real API data instead of mock data

### Changed

#### Documentation Cleanup (2025-11-30)

**Summary:** Cleaned up temporary documentation files generated during Claude Code sessions to
improve project organization.

**Deleted Files (9 temporary documentation files):**

- `NGINX_SETUP_SUMMARY.md` - Implementation summary (Nov 2025)
- `NGINX_IMPLEMENTATION_CHECKLIST.md` - Implementation checklist (Nov 2025)
- `DOCKER_SECURITY_AUDIT.md` - Audit report (Nov 2025)
- `DOCKER_QUICK_REFERENCE.md` - Quick reference guide (Nov 2025)
- `DEVOPS_REVIEW.md` - DevOps review document (Nov 2025)
- `docs/testing/TESTING_IMPLEMENTATION_SUMMARY.md` - Test implementation summary
- `docs/testing/TEST_DELIVERABLES_INDEX.md` - Test deliverables index
- `docs/testing/password-change-routing-test-gap-analysis.md` - Gap analysis document
- `apps/api/tests/api/v1/README_PASSWORD_CHANGE_TESTS.md` - Redundant test readme

**Rationale:** These temporary documentation files were generated during coding sessions and
documented completed work. Essential content is already consolidated in CLAUDE.md, the organized
`docs/` folder structure, and code comments.

#### Documentation Cleanup (2025-11-25)

**Summary:** Cleaned up temporary documentation files from root directory to improve project
organization. Temporary implementation summaries are now consolidated into CLAUDE.md and the docs/
folder structure.

**Deleted Files (9 temporary documentation files):**

- `CELERY-SETUP.md` - Content consolidated into CLAUDE.md and `apps/api/CELERY.md`
- `DEV-WORKFLOW.md` - Content consolidated into CLAUDE.md Development Commands section
- `DOCKER-OPTIMIZATION-SUMMARY.md` - Implementation summary (Nov 2024), content in
  `docs/docker-best-practices.md`
- `IMPLEMENTATION-SUMMARY-FAIL-FAST.md` - Implementation summary, content in
  `docs/guides/fail-fast-startup-checks.md`
- `QUICK-START.md` - Redundant with CLAUDE.md quick start section
- `REDIS-FAIL-FAST-FIX.md` - Issue resolution document (Nov 2024)
- `REDIS-SETUP.md` - Content consolidated into CLAUDE.md Redis section
- `SINGLE-COMMAND-DEV.md` - Feature documentation now in CLAUDE.md
- `TESTING-REWORK-SUMMARY.md` - Testing guide for specific feature

**Reorganized Files:**

- `generate_indicator_specs.py` - Moved from root to `scripts/` folder

**Removed Artifacts:**

- `turbo` - Empty file (build artifact)
- `sinag@1.0.0` - Empty file (build artifact)

**Root Directory Now Contains Only Essential Files:**

- `CHANGELOG.md` - Project changelog
- `CLAUDE.md` - Development instructions (source of truth)
- `README.md` - Project overview

**Rationale:** Temporary documentation files documenting completed work were cluttering the root
directory. All essential content has been consolidated into CLAUDE.md (the canonical source for
development instructions) or the organized `docs/` folder structure.

### Added

#### Phase 6: Administrative Features - Hierarchical Indicator Builder (COMPLETE) ✅

**Summary:** Complete implementation of hierarchical indicator creation system with 6 epics, 59
stories, and comprehensive testing coverage.

- **Epic 1.0: Draft System & Auto-Save Infrastructure**
  - Draft management with optimistic locking and version conflict resolution
  - Delta-based auto-save (95% payload reduction: 600 KB → 15 KB)
  - localStorage backup with cross-device synchronization
  - Real-time dirty tracking with debounced server saves (3s)

- **Epic 2.0: Hierarchical Tree Editor & Split-Pane UI**
  - Split-pane layout (30% tree + 70% editor) with react-arborist integration
  - Drag-and-drop tree navigation with parent-child relationship management
  - Indicator form view with 5 tabs: Basic Info, MOV Checklist, Form Schema, Calculation Schema,
    Remark Schema
  - Real-time validation badges (✓/⚠/❌) on tree nodes and tabs

- **Epic 3.0: MOV Checklist Builder (9 Item Types)**
  - Visual builder for Means of Verification checklists with 9 specialized item types
  - Checkbox, Group (OR logic), Currency Input, Number Input, Text Input, Date Input, Assessment,
    Radio Group, Dropdown
  - Advanced validation: grace periods, thresholds, conditional display, OR logic with min_required
  - Validation statuses: Passed, Considered, Failed, Not Applicable, Pending
  - Tested against all 29 validated indicators from Spec v1.4 (1.1-6.3)

- **Epic 4.0: Form & Calculation Schema Builders**
  - Form Schema Builder: Define BLGU submission input fields (8 field types)
  - Calculation Schema Builder: Automatic validation rules with thresholds and conditional logic
  - Remark Schema Builder: Dynamic template system with Jinja2 variable substitution
  - Real-time schema validation with error reporting and tab badges
  - 20/20 form schema tests + 16/16 calculation rule tests passing

- **Epic 5.0: BBI System Implementation**
  - 9 mandatory Barangay-Based Institutions pre-configured with governance area mappings
  - One-to-one indicator mapping with conflict prevention
  - Automatic BBI functionality status calculation (Indicator validation → BBI status)
  - Barangay-level BBI status tracking per assessment cycle
  - BBI management UI accessible only to MLGOO_DILG role
  - 50+ BBI tests covering API, service layer, and status determination logic

- **Epic 6.0: Validation, Bulk Publishing & Testing**
  - Indicator validation service: tree structure, schema, weight, circular reference checks
  - Bulk publishing with topological sorting for parent-child dependency resolution
  - Comprehensive test coverage: 53 tests (31 unit + 13 integration + 9 Spec v1.4)
  - indicator_validation_service.py: 97% code coverage (exceeded 90% target)
  - Spec v1.4 validation: All 29 SGLGB indicator patterns validated

**Technical Highlights:**

- Backend: SQLAlchemy models with JSONB schemas, Pydantic validation, service layer pattern
- Frontend: Next.js 15, React 19, Zustand state management, react-arborist tree editor
- Type Safety: Full end-to-end type generation via Orval (FastAPI → TypeScript)
- Testing: 120+ tests across backend and frontend with comprehensive coverage

**Production Status:** All 59 stories complete, system ready for production deployment

---

#### Epic 6.0: Audit & Security Infrastructure

- **Backend Audit Logging**
  - `AuditLog` database model with optimized composite indexes
  - Comprehensive `AuditService` with event logging, JSON diff, and filtering
  - Admin API endpoints for audit log viewing, filtering, and CSV export
  - IP address tracking for all administrative actions
  - Migration with descending `created_at` and `(entity_type, entity_id)` indexes

- **Access Control & Security**
  - `require_mlgoo_dilg()` dependency for admin-only endpoints
  - `get_client_ip()` utility for IP extraction from proxied requests
  - Access attempt logging for unauthorized admin access
  - Role-based access control enforcement across all admin endpoints

- **Security Middleware Stack**
  - `SecurityHeadersMiddleware` with HSTS, CSP, X-Frame-Options, XSS-Protection
  - `RateLimitMiddleware` with per-endpoint configuration (100 req/min general, 20 req/min auth)
  - `RequestLoggingMiddleware` with request ID tracking and processing time metrics
  - CORS configuration for development and production origins

- **Frontend Error Handling**
  - `ErrorBoundary` component with development/production fallback UI
  - Toast notification system using sonner with 5 notification types
  - User-friendly error message mapping for 20+ common API scenarios
  - Enhanced Axios interceptor with global error handling (401, 403, 429, 500, network)
  - Comprehensive loading states (spinner, overlay, skeleton, inline)

- **Testing Infrastructure**
  - 20+ tests for access control (role-based permissions, authentication)
  - 11/12 tests for security middleware (headers, rate limiting, CORS, logging)
  - User role fixtures for testing (MLGOO_DILG, Validator, Assessor, BLGU)
  - Request ID and processing time validation tests

### Changed

- Consolidated Docker troubleshooting from 8 separate files into organized guides
- Reorganized documentation into clear, maintainable structure
- Enhanced Axios interceptor with comprehensive error handling and toast notifications
- Updated CORS configuration with placeholder for production domains

## [0.4.0] - 2025-10-28

### Added

- **Epic 4.0**: Gemini API integration for AI-powered insights and recommendations
- Core intelligence layer with SGLGB classification algorithm ("3+1" logic)
- Celery background processing for insights generation
- Gap analysis comparing initial vs final assessments

### Fixed

- ReportsPage safe rendering for assessments with improved type handling
- Docker authentication issues with bcrypt
- TypeScript and ESLint errors for successful build

### Changed

- Enhanced local Docker support

## [0.3.0] - 2025-10-19

### Added

- **Epic 3**: Assessor validation workflow
- Assessment rework and finalization endpoints
- Validation workflow for assessors
- PRD and task list for Assessor workflow

### Changed

- Enhanced assessment models for assessor workflow
- Renamed and reorganized MOV and UserUpdatedAt interfaces

## [0.2.0] - 2025-10-12

### Added

- **Epic 2**: BLGU Dashboard & Assessment UI (with mock data)
- **Epic 3**: Dynamic forms & MOV upload functionality
- Assessment dashboard endpoint with comprehensive data aggregation
- Assessment progress metrics and governance area summaries
- Sample indicators creation in assessment service

### Changed

- Updated BLGU branding to SINAG throughout application
- Assessment hooks now utilize API data instead of mock implementations
- Enhanced assessment service with improved error handling

### Fixed

- MOVStatus import path in generated types
- Build configuration for Vercel deployment

## [0.1.0] - 2025-08-18

### Added

- **Epic 1**: Core user authentication and management
- Initial BLGU pre-assessment workflow foundation
- FastAPI backend with SQLAlchemy ORM
- Next.js 15 frontend with App Router
- Turborepo monorepo structure
- Type generation workflow with Orval
- PostgreSQL database via Supabase
- Redis and Celery for background tasks
- Docker development environment

### Changed

- Initial project architecture and structure

---

## Changelog Maintenance

See [Maintaining the Changelog](./docs/guides/maintaining-changelog.md) for guidelines on updating
this file.

To add an entry, use: `/changelog add`

---

## Version History Guidelines

### Version Numbers

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version (X.0.0): Incompatible API changes
- **MINOR** version (0.X.0): New features (backward compatible)
- **PATCH** version (0.0.X): Bug fixes (backward compatible)

### Change Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes

### Unreleased Section

The `[Unreleased]` section tracks changes that are committed but not yet released. When creating a
new release:

1. Rename `[Unreleased]` to the new version number with date: `[X.Y.Z] - YYYY-MM-DD`
2. Create a new `[Unreleased]` section at the top
3. Tag the commit: `git tag -a vX.Y.Z -m "Version X.Y.Z"`
4. Push tags: `git push origin vX.Y.Z`

---

## Links

- [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
- [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- [Conventional Commits](https://www.conventionalcommits.org/)
