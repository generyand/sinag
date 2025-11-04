# Epic 6.0: Analytics Infrastructure & Optimization

> **PRD Reference:** FR-31 to FR-35
> **User Stories:** All (cross-cutting)
> **Duration:** 1-2 weeks
> **Status:** ✅ Completed - 8 stories → 24 atomic tasks

**[← Back to Overview](./README.md)**

---

## Epic Overview

**Description:** Implement cross-cutting infrastructure requirements including database schema migrations, caching strategy with Redis, query optimization, RBAC enforcement, and timezone handling to support high-performance analytics features.

**Success Criteria:**
- New database tables created: recommendation_tracking, external_api_keys, api_access_logs
- Database indexes created on high-query columns (cycle_id, compliance_status, area_code, is_completed)
- Redis caching implemented with 15-minute TTL and on-demand invalidation
- Dashboard KPI queries execute in <1 second
- All reports include metadata (date range, filters, generation timestamp)
- Timezone handling defaults to Philippine Time (UTC+8)

---

  - [ ] **6.1 Story: Database Migrations for All Analytics Tables**

    - **Scope:** Consolidate all analytics-related database migrations
    - **Duration:** 1 day
    - **Dependencies:** None (foundation for other epics)
    - **Files:** `apps/api/alembic/versions/xxxx_add_analytics_infrastructure.py`
    - **Tech:** Alembic, SQLAlchemy
    - **Success Criteria:**
      - Single migration creates: recommendation_tracking, external_api_keys, api_access_logs
      - Migration is reversible (`alembic downgrade` works)
      - `alembic upgrade head` runs without errors
      - All tables created with proper constraints and relationships

    - [ ] **6.1.1 Atomic:** Verify all analytics models are defined

      - **Files:** Check `apps/api/app/db/models/` directory
      - **Dependencies:** Epic 4.1, 5.1 (models created in those epics)
      - **Acceptance:**
        - Verify `recommendation_tracking.py` model exists
        - Verify `external_api_key.py` model exists
        - Verify `api_access_log.py` model exists
        - All models imported in `__init__.py`
        - Run `python -c "from app.db.models import RecommendationTracking, ExternalAPIKey, APIAccessLog"` successfully
      - **Tech:** Python imports, SQLAlchemy

    - [ ] **6.1.2 Atomic:** Create consolidated analytics infrastructure migration
      - **Files:** `apps/api/alembic/versions/xxxx_add_analytics_infrastructure.py`
      - **Dependencies:** 6.1.1 (all models verified)
      - **Acceptance:**
        - Run: `cd apps/api && alembic revision --autogenerate -m "add analytics infrastructure tables"`
        - Review generated migration includes all three tables
        - Verify foreign key constraints are correct
        - Verify NOT NULL constraints on required fields
        - Test upgrade: `alembic upgrade head` succeeds
        - Verify all tables exist in database: `\dt` in psql shows new tables
        - Test downgrade: `alembic downgrade -1` removes tables
        - Re-upgrade: `alembic upgrade head` works again
      - **Tech:** Alembic, PostgreSQL, SQL DDL

  - [ ] **6.2 Story: Database Indexes & Query Optimization**

    - **Scope:** Create indexes on high-query columns for performance
    - **Duration:** 1-2 days
    - **Dependencies:** 6.1 (tables exist)
    - **Files:** `apps/api/alembic/versions/xxxx_add_analytics_indexes.py`
    - **Tech:** Alembic, PostgreSQL indexes
    - **Success Criteria:**
      - Indexes created on: `assessments.cycle_id`, `assessments.final_compliance_status`, `governance_area_results.area_code`, `assessment_responses.is_completed`
      - Composite indexes for common query patterns (e.g., `cycle_id + barangay_id`)
      - Use EXPLAIN ANALYZE to verify query performance improvements
      - Dashboard KPI queries execute in <1 second

    - [ ] **6.2.1 Atomic:** Identify high-frequency query patterns

      - **Files:** `apps/api/app/services/analytics_service.py`, `apps/api/app/services/external_api_service.py` (analyze)
      - **Dependencies:** Epic 1.1, 5.2 (services implemented)
      - **Acceptance:**
        - Review analytics_service queries to identify frequently filtered columns
        - Document query patterns: cycle_id filtering, compliance_status grouping, area_code joins
        - Identify composite query patterns (e.g., WHERE cycle_id = ? AND barangay_id = ?)
        - List columns that appear in WHERE, JOIN ON, GROUP BY, ORDER BY clauses
        - Create index strategy document listing proposed indexes
      - **Tech:** SQL query analysis, PostgreSQL EXPLAIN

    - [ ] **6.2.2 Atomic:** Create indexes migration for existing tables

      - **Files:** `apps/api/alembic/versions/xxxx_add_analytics_indexes.py`
      - **Dependencies:** 6.2.1 (index strategy defined)
      - **Acceptance:**
        - Create new migration: `alembic revision -m "add analytics indexes"`
        - Add single-column indexes:
          - `CREATE INDEX ix_assessments_cycle_id ON assessments(cycle_id)`
          - `CREATE INDEX ix_assessments_final_compliance_status ON assessments(final_compliance_status)`
          - `CREATE INDEX ix_governance_area_results_area_code ON governance_area_results(area_code)`
          - `CREATE INDEX ix_assessment_responses_is_completed ON assessment_responses(is_completed)`
        - Add composite indexes:
          - `CREATE INDEX ix_assessments_cycle_barangay ON assessments(cycle_id, barangay_id)`
        - Include downgrade logic to drop indexes
        - Run migration: `alembic upgrade head`
      - **Tech:** Alembic, PostgreSQL CREATE INDEX

    - [ ] **6.2.3 Atomic:** Benchmark query performance and verify improvements

      - **Files:** `apps/api/tests/performance/test_query_performance.py` (new)
      - **Dependencies:** 6.2.2 (indexes created)
      - **Acceptance:**
        - Create performance test that:
          - Seeds database with realistic data volume (1000+ assessments)
          - Runs dashboard KPI queries with EXPLAIN ANALYZE
          - Measures execution time for key queries
          - Verifies all queries < 1 second
        - Compare performance before/after indexes (document results)
        - Test queries: overall compliance, area breakdown, trend analysis
        - Verify indexes are being used (EXPLAIN output shows "Index Scan")
        - Run with: `cd apps/api && pytest tests/performance/test_query_performance.py -vv`
      - **Tech:** Pytest, PostgreSQL EXPLAIN ANALYZE, performance testing

  - [ ] **6.3 Story: Redis Caching Implementation**

    - **Scope:** Set up Redis caching for aggregated analytics data
    - **Duration:** 2 days
    - **Dependencies:** None
    - **Files:** `apps/api/app/core/cache.py`, `apps/api/app/core/config.py` (extend)
    - **Tech:** Redis, redis-py, FastAPI
    - **Success Criteria:**
      - Cache utility functions: `get_cached_data()`, `set_cached_data()`, `invalidate_cache()`
      - Cache key pattern: `analytics:{cycle_id}:{filter_hash}`
      - TTL: 15 minutes (configurable)
      - Cache invalidation function called when assessment is validated
      - Redis connection pooling configured
      - Error handling: Cache failures don't break API (fallback to DB)

    - [ ] **6.3.1 Atomic:** Configure Redis connection and settings

      - **Files:** `apps/api/app/core/config.py` (extend)
      - **Dependencies:** None
      - **Acceptance:**
        - Add Redis configuration to `Settings` class:
          - `REDIS_HOST` (default: "localhost")
          - `REDIS_PORT` (default: 6379)
          - `REDIS_DB` (default: 0)
          - `REDIS_PASSWORD` (optional)
          - `CACHE_TTL_MINUTES` (default: 15)
        - Add to `.env.example` for documentation
        - Verify Redis connection string construction
      - **Tech:** Pydantic settings, environment variables

    - [ ] **6.3.2 Atomic:** Create cache utility module

      - **Files:** `apps/api/app/core/cache.py`
      - **Dependencies:** 6.3.1 (Redis config exists)
      - **Acceptance:**
        - Create `CacheManager` class that:
          - Initializes Redis connection pool using config
          - Method `get(key: str) -> Optional[dict]` to retrieve cached data
          - Method `set(key: str, value: dict, ttl: int)` to store data with expiration
          - Method `delete(key: str)` to remove specific cache entry
          - Method `delete_pattern(pattern: str)` to invalidate multiple keys
          - All methods handle Redis connection errors gracefully (log and return None)
        - Export singleton: `cache_manager = CacheManager()`
        - Include JSON serialization for complex objects
      - **Tech:** Redis, redis-py, Python JSON, error handling

    - [ ] **6.3.3 Atomic:** Create cache key generation and invalidation utilities
      - **Files:** `apps/api/app/core/cache.py` (extend)
      - **Dependencies:** 6.3.2 (CacheManager exists)
      - **Acceptance:**
        - Add function `generate_cache_key(prefix: str, **kwargs)` that:
          - Creates consistent cache keys from parameters
          - Uses hashlib to hash filter dictionaries for deterministic keys
          - Pattern: `{prefix}:{param1_value}:{param2_value}:{hash}`
        - Add function `invalidate_analytics_cache(cycle_id: Optional[int] = None)` that:
          - Deletes all cache keys matching pattern `analytics:*` if no cycle_id
          - Deletes keys matching `analytics:{cycle_id}:*` if cycle_id provided
          - Called when assessment validation status changes
        - Test cache key consistency (same params = same key)
      - **Tech:** Python hashlib, Redis pattern matching

  - [ ] **6.4 Story: Apply Caching to Analytics Endpoints**

    - **Scope:** Integrate Redis caching into analytics service methods
    - **Duration:** 1-2 days
    - **Dependencies:** 6.3 (cache utilities exist)
    - **Files:** `apps/api/app/services/analytics_service.py` (extend), `apps/api/app/api/v1/analytics.py` (extend)
    - **Tech:** Redis, Python
    - **Success Criteria:**
      - Dashboard KPIs cached (check cache before querying DB)
      - Reports data cached per filter combination
      - Gap analysis cached per assessment/cycle
      - Cache hit/miss logged for monitoring
      - Cached responses include `X-Cache: HIT` or `X-Cache: MISS` header

    - [ ] **6.4.1 Atomic:** Integrate caching into analytics service methods

      - **Files:** `apps/api/app/services/analytics_service.py` (extend)
      - **Dependencies:** 6.3.3 (cache utilities exist)
      - **Acceptance:**
        - Modify `get_dashboard_kpis(db, cycle_id)` to:
          - Generate cache key using `generate_cache_key("dashboard", cycle_id=cycle_id)`
          - Check cache with `cache_manager.get(key)`
          - If cache hit, return cached data and log hit
          - If cache miss, query database, cache result with TTL, return data
        - Apply same pattern to other service methods (gap analysis, trends)
        - Cache failures (Redis down) fall back to database query
        - Log cache operations for monitoring
      - **Tech:** Redis, Python, logging

    - [ ] **6.4.2 Atomic:** Add cache headers to API responses

      - **Files:** `apps/api/app/api/v1/analytics.py` (extend)
      - **Dependencies:** 6.4.1 (service caching integrated)
      - **Acceptance:**
        - Modify endpoints to return cache status:
          - Service methods return tuple: `(data, cache_hit: bool)`
          - Endpoint adds `X-Cache: HIT` or `X-Cache: MISS` header to response
          - Use FastAPI Response object to set custom headers
        - Test headers are present in responses
      - **Tech:** FastAPI Response, HTTP headers

    - [ ] **6.4.3 Atomic:** Integrate cache invalidation into assessment workflow
      - **Files:** `apps/api/app/services/assessment_service.py` (extend)
      - **Dependencies:** 6.4.2 (caching applied)
      - **Acceptance:**
        - Find assessment validation/update methods
        - After successful validation status change, call `invalidate_analytics_cache(cycle_id)`
        - After assessment deletion, call cache invalidation
        - Ensure cache invalidation doesn't fail the main operation (try/except)
        - Log cache invalidation operations
        - Test: update assessment → cache cleared → next query misses cache
      - **Tech:** Python, Redis, integration with existing code

  - [ ] **6.5 Story: RBAC Enforcement Utilities**

    - **Scope:** Create reusable RBAC dependencies and filters for analytics endpoints
    - **Duration:** 1-2 days
    - **Dependencies:** None (uses existing user service)
    - **Files:** `apps/api/app/api/deps.py` (extend)
    - **Tech:** FastAPI dependencies, SQLAlchemy
    - **Success Criteria:**
      - Dependency `get_current_mlgoo_dilg_user()` enforces MLGOO_DILG role (returns 403 otherwise)
      - Dependency `get_rbac_filtered_query()` applies role-based filters:
        - MLGOO_DILG: No filter (sees all)
        - Assessor: Filters by assigned governance_area
        - BLGU: Filters by barangay_id
      - Dependencies reused across all analytics endpoints
      - Unit tested for each role

    - [ ] **6.5.1 Atomic:** Create role-specific authentication dependencies

      - **Files:** `apps/api/app/api/deps.py` (extend)
      - **Dependencies:** None (uses existing user auth)
      - **Acceptance:**
        - Create `get_current_mlgoo_dilg_user()` dependency that:
          - Calls existing `get_current_user()`
          - Checks `user.role == "MLGOO_DILG"`
          - Raises `HTTPException(403, "MLGOO-DILG access required")` if not authorized
          - Returns user if authorized
        - Create similar dependencies for other role checks if needed
        - Export dependencies for use in endpoints
      - **Tech:** FastAPI dependencies, HTTP 403 status

    - [ ] **6.5.2 Atomic:** Create RBAC query filter utilities

      - **Files:** `apps/api/app/core/rbac.py` (new)
      - **Dependencies:** 6.5.1 (role dependencies exist)
      - **Acceptance:**
        - Create `apply_rbac_filter(query, user, model)` function that:
          - Takes SQLAlchemy query, user object, and model class
          - Applies filter based on user role:
            - MLGOO_DILG: No filter (returns query unchanged)
            - Assessor: Adds `WHERE governance_area IN user.assigned_areas`
            - BLGU: Adds `WHERE barangay_id = user.barangay_id`
          - Returns modified query
        - Function is reusable across different models/endpoints
        - Handles missing role gracefully (default to most restrictive)
      - **Tech:** SQLAlchemy query filters, Python

    - [ ] **6.5.3 Atomic:** Integrate RBAC filters into analytics services
      - **Files:** `apps/api/app/services/analytics_service.py` (extend), `apps/api/app/services/external_api_service.py` (extend)
      - **Dependencies:** 6.5.2 (RBAC utilities exist)
      - **Acceptance:**
        - Update service methods to accept `user` parameter
        - Apply RBAC filters to queries before execution
        - Methods filter data appropriately for each role
        - Test each role sees only their authorized data
        - MLGOO_DILG sees all, BLGU sees only their barangay
      - **Tech:** SQLAlchemy, service layer patterns

  - [ ] **6.6 Story: Timezone Handling**

    - **Scope:** Implement consistent timezone handling (default Philippine Time UTC+8)
    - **Duration:** 1 day
    - **Dependencies:** None
    - **Files:** `apps/api/app/core/config.py` (extend), `apps/api/app/services/analytics_service.py` (extend)
    - **Tech:** Python pytz, datetime
    - **Success Criteria:**
      - All datetime fields stored in DB as UTC
      - API responses convert to Philippine Time (UTC+8) before serialization
      - Frontend displays times in user's configured timezone (default PT)
      - Timestamps include timezone info in ISO 8601 format

    - [ ] **6.6.1 Atomic:** Create timezone utility module

      - **Files:** `apps/api/app/core/timezone.py` (new)
      - **Dependencies:** None
      - **Acceptance:**
        - Create utility functions:
          - `get_philippine_timezone()` returns pytz timezone object for Asia/Manila (UTC+8)
          - `utc_now()` returns current UTC datetime
          - `to_philippine_time(dt: datetime)` converts UTC datetime to Philippine Time
          - `to_utc(dt: datetime)` converts Philippine Time to UTC
          - `format_iso8601(dt: datetime)` formats datetime as ISO 8601 with timezone
        - All functions handle naive/aware datetimes correctly
        - Export utilities for use across application
      - **Tech:** Python datetime, pytz

    - [ ] **6.6.2 Atomic:** Integrate timezone handling into schemas

      - **Files:** `apps/api/app/schemas/analytics.py` (extend), other schema files
      - **Dependencies:** 6.6.1 (timezone utilities exist)
      - **Acceptance:**
        - Update Pydantic schemas with datetime fields:
          - Use `datetime` type with timezone validation
          - Add `@validator` to convert UTC to Philippine Time before serialization
          - Ensure serialized JSON includes timezone offset (e.g., "2025-11-04T14:30:00+08:00")
        - Apply to all analytics schemas with timestamp fields
        - Test serialization produces correct timezone info
      - **Tech:** Pydantic validators, datetime serialization

    - [ ] **6.6.3 Atomic:** Verify database datetime storage
      - **Files:** `apps/api/app/db/models/` (review), database
      - **Dependencies:** 6.6.2 (schema timezone handling)
      - **Acceptance:**
        - Verify all DateTime columns use timezone-aware types
        - PostgreSQL columns should use `TIMESTAMP WITH TIME ZONE` (or equivalent via SQLAlchemy)
        - Test storing datetime: saves as UTC in database
        - Test retrieving datetime: returns timezone-aware object
        - Update any non-UTC columns to use UTC storage
        - Document timezone policy in code comments
      - **Tech:** PostgreSQL, SQLAlchemy, psycopg2

  - [ ] **6.7 Story: Report Metadata Generation**

    - **Scope:** Add metadata to all analytics responses (date range, filters, timestamp)
    - **Duration:** 1 day
    - **Dependencies:** 6.6 (timezone handling exists)
    - **Files:** `apps/api/app/schemas/analytics.py` (extend), `apps/api/app/services/analytics_service.py` (extend)
    - **Tech:** Pydantic
    - **Success Criteria:**
      - All analytics response schemas include `metadata` field
      - Metadata contains: `date_range`, `applied_filters`, `generated_at` (timestamp), `cache_status`
      - Frontend displays metadata in report headers/footers
      - PDF exports include metadata on cover page

    - [ ] **6.7.1 Atomic:** Create metadata Pydantic schema

      - **Files:** `apps/api/app/schemas/analytics.py` (extend)
      - **Dependencies:** 6.6.2 (timezone handling in schemas)
      - **Acceptance:**
        - Create `ReportMetadata` schema with fields:
          - `date_range` (Optional): dict with `start_date`, `end_date`
          - `applied_filters` (dict): all query parameters used
          - `generated_at` (datetime): timestamp when report was generated (Philippine Time)
          - `cache_status` (str): "HIT" or "MISS"
          - `user_role` (str): role of requesting user
        - Use proper types and validation
        - All datetime fields use timezone-aware format
      - **Tech:** Pydantic, Python typing

    - [ ] **6.7.2 Atomic:** Integrate metadata into service methods

      - **Files:** `apps/api/app/services/analytics_service.py` (extend), other service files
      - **Dependencies:** 6.7.1 (metadata schema exists)
      - **Acceptance:**
        - Update service methods to generate metadata:
          - Capture all input filters/parameters
          - Record generation timestamp using `utc_now()` converted to Philippine Time
          - Include cache hit/miss status
          - Return metadata along with data
        - Update response schemas to include `metadata: ReportMetadata` field
        - Test all analytics endpoints return metadata
      - **Tech:** Pydantic, Python datetime

    - [ ] **6.7.3 Atomic:** Display metadata in frontend and PDF exports
      - **Files:** `apps/web/src/components/features/analytics/MetadataDisplay.tsx` (new), `apps/web/src/lib/pdf-export.ts` (extend)
      - **Dependencies:** 6.7.2 (backend returns metadata)
      - **Acceptance:**
        - Create `MetadataDisplay` component that:
          - Shows "Report generated on {timestamp}"
          - Shows "Filters applied: {filter summary}"
          - Shows "Data as of: {date range}"
          - Displays in footer or header of analytics pages
        - Update PDF export functions to include metadata on first page:
          - Generation timestamp
          - Applied filters
          - User/institution information (if appropriate)
        - Test metadata displays correctly in UI and PDF
      - **Tech:** React, TypeScript, jsPDF

  - [ ] **6.8 Story: Infrastructure Testing**
    - **Scope:** Test caching, RBAC, timezone handling, and query optimization
    - **Duration:** 2 days
    - **Dependencies:** 6.7 (all infrastructure complete)
    - **Files:**
      - `apps/api/tests/core/test_cache.py`
      - `apps/api/tests/api/test_deps.py`
      - `apps/api/tests/services/test_analytics_service.py` (extend)
    - **Tech:** Pytest, pytest-redis, pytest-mock
    - **Success Criteria:**
      - Test cache hit/miss scenarios
      - Test cache invalidation logic
      - Test RBAC dependencies for all 3 roles
      - Test timezone conversions (UTC → PT)
      - Test query performance with indexes (EXPLAIN ANALYZE)
      - Test metadata generation
      - All tests pass

    - [ ] **6.8.1 Atomic:** Write cache utility tests

      - **Files:** `apps/api/tests/core/test_cache.py`
      - **Dependencies:** 6.3.3 (cache utilities complete)
      - **Acceptance:**
        - Test `CacheManager.get()` returns None for non-existent key
        - Test `CacheManager.set()` stores data with TTL
        - Test `CacheManager.get()` returns stored data (cache hit)
        - Test data expires after TTL (wait or mock time)
        - Test `CacheManager.delete()` removes key
        - Test `CacheManager.delete_pattern()` removes multiple keys matching pattern
        - Test cache operations handle Redis connection errors gracefully
        - Test `generate_cache_key()` creates consistent keys for same params
        - Use fakeredis or pytest-redis for testing
        - Run with: `cd apps/api && pytest tests/core/test_cache.py -vv`
      - **Tech:** Pytest, fakeredis/pytest-redis, Python

    - [ ] **6.8.2 Atomic:** Write RBAC and timezone tests

      - **Files:** `apps/api/tests/api/test_deps.py` (extend), `apps/api/tests/core/test_timezone.py` (new)
      - **Dependencies:** 6.5.3 (RBAC integrated), 6.6.3 (timezone handling complete)
      - **Acceptance:**
        - Test `get_current_mlgoo_dilg_user()` allows MLGOO_DILG role
        - Test dependency raises 403 for non-MLGOO_DILG users (BLGU, Assessor)
        - Test `apply_rbac_filter()` applies correct filters for each role
        - Test MLGOO_DILG query returns all data
        - Test BLGU query returns only their barangay's data
        - Test timezone utilities:
          - `to_philippine_time()` converts UTC to UTC+8
          - `to_utc()` converts Philippine Time to UTC
          - `format_iso8601()` includes timezone offset
        - Run with: `cd apps/api && pytest tests/api/test_deps.py tests/core/test_timezone.py -vv`
      - **Tech:** Pytest, pytest fixtures, datetime assertions

    - [ ] **6.8.3 Atomic:** Write integration tests for caching in analytics

      - **Files:** `apps/api/tests/services/test_analytics_service.py` (extend), `apps/api/tests/api/v1/test_analytics.py` (extend)
      - **Dependencies:** 6.4.3 (caching integrated into services)
      - **Acceptance:**
        - Test analytics service method on first call: cache miss, queries DB, stores in cache
        - Test second call with same params: cache hit, doesn't query DB
        - Test `invalidate_analytics_cache()` clears cache
        - Test next call after invalidation: cache miss again
        - Test cache failures fall back to database
        - Test `X-Cache` header in API responses (HIT/MISS)
        - Mock Redis for controlled testing
        - Run with: `cd apps/api && pytest tests/services/test_analytics_service.py tests/api/v1/test_analytics.py -vv -k cache`
      - **Tech:** Pytest, pytest-mock, fakeredis

    - [ ] **6.8.4 Atomic:** Write metadata generation tests
      - **Files:** `apps/api/tests/schemas/test_analytics_schemas.py` (new or extend)
      - **Dependencies:** 6.7.2 (metadata integrated)
      - **Acceptance:**
        - Test analytics responses include `metadata` field
        - Test metadata contains correct `generated_at` timestamp (Philippine Time)
        - Test metadata includes `applied_filters` with all query params
        - Test metadata includes `cache_status` (HIT or MISS)
        - Test datetime serialization includes timezone offset
        - Test all analytics endpoints return valid metadata
        - Run with: `cd apps/api && pytest tests/schemas/test_analytics_schemas.py -vv`
      - **Tech:** Pytest, Pydantic validation, datetime testing

---

