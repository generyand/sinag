# Changelog

All notable changes to the SINAG project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

#### Documentation Cleanup (2025-11-25)

**Summary:** Cleaned up temporary documentation files from root directory to improve project organization. Temporary implementation summaries are now consolidated into CLAUDE.md and the docs/ folder structure.

**Deleted Files (9 temporary documentation files):**
- `CELERY-SETUP.md` - Content consolidated into CLAUDE.md and `apps/api/CELERY.md`
- `DEV-WORKFLOW.md` - Content consolidated into CLAUDE.md Development Commands section
- `DOCKER-OPTIMIZATION-SUMMARY.md` - Implementation summary (Nov 2024), content in `docs/docker-best-practices.md`
- `IMPLEMENTATION-SUMMARY-FAIL-FAST.md` - Implementation summary, content in `docs/guides/fail-fast-startup-checks.md`
- `QUICK-START.md` - Redundant with CLAUDE.md quick start section
- `REDIS-FAIL-FAST-FIX.md` - Issue resolution document (Nov 2024)
- `REDIS-SETUP.md` - Content consolidated into CLAUDE.md Redis section
- `SINGLE-COMMAND-DEV.md` - Feature documentation now in CLAUDE.md
- `TESTING-REWORK-SUMMARY.md` - Testing guide for specific feature

**Reorganized Files:**
- `generate_indicator_specs.py` - Moved from root to `scripts/` folder

**Removed Artifacts:**
- `turbo` - Empty file (build artifact)
- `vantage@1.0.0` - Empty file (build artifact)

**Root Directory Now Contains Only Essential Files:**
- `CHANGELOG.md` - Project changelog
- `CLAUDE.md` - Development instructions (source of truth)
- `README.md` - Project overview

**Rationale:** Temporary documentation files documenting completed work were cluttering the root directory. All essential content has been consolidated into CLAUDE.md (the canonical source for development instructions) or the organized `docs/` folder structure.

### Added

#### Phase 6: Administrative Features - Hierarchical Indicator Builder (COMPLETE) ✅

**Summary:** Complete implementation of hierarchical indicator creation system with 6 epics, 59 stories, and comprehensive testing coverage.

- **Epic 1.0: Draft System & Auto-Save Infrastructure**
  - Draft management with optimistic locking and version conflict resolution
  - Delta-based auto-save (95% payload reduction: 600 KB → 15 KB)
  - localStorage backup with cross-device synchronization
  - Real-time dirty tracking with debounced server saves (3s)

- **Epic 2.0: Hierarchical Tree Editor & Split-Pane UI**
  - Split-pane layout (30% tree + 70% editor) with react-arborist integration
  - Drag-and-drop tree navigation with parent-child relationship management
  - Indicator form view with 5 tabs: Basic Info, MOV Checklist, Form Schema, Calculation Schema, Remark Schema
  - Real-time validation badges (✓/⚠/❌) on tree nodes and tabs

- **Epic 3.0: MOV Checklist Builder (9 Item Types)**
  - Visual builder for Means of Verification checklists with 9 specialized item types
  - Checkbox, Group (OR logic), Currency Input, Number Input, Text Input, Date Input, Assessment, Radio Group, Dropdown
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
- Updated BLGU branding to VANTAGE throughout application
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

See [Maintaining the Changelog](./docs/guides/maintaining-changelog.md) for guidelines on updating this file.

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

The `[Unreleased]` section tracks changes that are committed but not yet released. When creating a new release:

1. Rename `[Unreleased]` to the new version number with date: `[X.Y.Z] - YYYY-MM-DD`
2. Create a new `[Unreleased]` section at the top
3. Tag the commit: `git tag -a vX.Y.Z -m "Version X.Y.Z"`
4. Push tags: `git push origin vX.Y.Z`

---

## Links

- [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
- [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- [Conventional Commits](https://www.conventionalcommits.org/)
