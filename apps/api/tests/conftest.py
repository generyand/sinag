"""
🧪 Test Configuration
Essential testing setup with proper test isolation using nested transactions.

Key isolation strategy:
1. Each test runs within a SAVEPOINT transaction
2. After test completes, we ROLLBACK to the savepoint
3. This ensures complete isolation between tests without needing to delete data

Performance optimizations:
1. Fast password hashing (SHA256 instead of bcrypt for speed)
2. Transaction-based isolation instead of table deletion
3. Session-scoped database engine for reduced overhead
"""

import os
import sys
from pathlib import Path

# CRITICAL: Set TESTING mode BEFORE any app imports
# This ensures the Settings object is created with TESTING=true
# which skips all external connection checks (PostgreSQL, Redis, Gemini, Supabase)
os.environ["TESTING"] = "true"
os.environ["SKIP_STARTUP_SEEDING"] = "true"

# Add the parent directory to Python path so we can import main and app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

# ============================================================================
# PERFORMANCE OPTIMIZATION: Fast Password Hashing for Tests
# ============================================================================
# bcrypt is intentionally slow (~100ms per hash). In tests, we use a fast
# SHA256-based hash that's ~1000x faster, significantly speeding up test runs.
# This is safe because we're not testing password security in unit tests.

import hashlib


class FastTestPasswordContext:
    """
    Ultra-fast password hashing for tests only.
    Mimics passlib.CryptContext interface but uses SHA256 for speed.
    """

    def __init__(self, schemes=None, deprecated=None):
        self.schemes = schemes or ["sha256"]
        self.deprecated = deprecated

    def hash(self, password: str) -> str:
        """Fast hash using SHA256 with a test-specific prefix"""
        return "test$" + hashlib.sha256(password.encode()).hexdigest()

    def verify(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        # Handle both fast test hashes and actual bcrypt hashes
        if hashed_password.startswith("test$"):
            expected = "test$" + hashlib.sha256(plain_password.encode()).hexdigest()
            return expected == hashed_password
        # Fallback for any bcrypt hashes that might exist
        from passlib.context import CryptContext

        real_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return real_context.verify(plain_password, hashed_password)


# Create fast password context for tests
_fast_pwd_context = FastTestPasswordContext()

# IMPORTANT: Patch JSONB BEFORE importing any models
# SQLite doesn't support JSONB, so we need to replace it with a compatible JSON type
from sqlalchemy import JSON
from sqlalchemy.dialects import postgresql


class JSONBCompatible(JSON):
    """
    A JSON type that's compatible with both PostgreSQL JSONB and SQLite JSON.
    Ignores JSONB-specific arguments like astext_type.
    """

    def __init__(self, astext_type=None, **kwargs):
        # Ignore astext_type (JSONB-specific) for SQLite compatibility
        super().__init__(**kwargs)


# Replace JSONB with our compatible version
postgresql.JSONB = JSONBCompatible

# Patch password context BEFORE importing app modules
import app.core.security

app.core.security.pwd_context = _fast_pwd_context

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

# Ensure all ORM models are registered on Base.metadata before creating tables
from app.db import models  # noqa: F401
from app.db.base import Base, get_db
from main import app

# Test database URL (use SQLite for simplicity in tests)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})


# Enable foreign key support in SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable foreign key support in SQLite"""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Global variable to hold the current test's session for dependency override
_test_session: Session | None = None


def override_get_db():
    """
    Override database dependency for testing.
    Uses the same session as the test to ensure consistency.
    """
    global _test_session
    if _test_session is not None:
        yield _test_session
    else:
        # Fallback for tests that don't use db_session fixture
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()


@pytest.fixture(autouse=True)
def clear_rate_limits():
    """Clear rate limiting state before each test to prevent 429 errors."""
    from app.middleware.security import RateLimitMiddleware

    # Clear rate limits before test
    RateLimitMiddleware.clear_rate_limits()
    yield
    # Clear again after test for good measure
    RateLimitMiddleware.clear_rate_limits()


@pytest.fixture(scope="session", autouse=True)
def enable_testing_mode():
    """
    Placeholder fixture for test mode.

    Note: TESTING=true and SKIP_STARTUP_SEEDING=true are set at the TOP of this file
    (before any imports) to ensure they're active before the Settings object is created.
    This fixture exists for documentation and potential future cleanup needs.
    """
    yield


@pytest.fixture(scope="session")
def db_engine():
    """Provide the database engine for the session."""
    # Start from a clean slate to avoid stale/partial schemas across runs
    try:
        from os import remove
        from os.path import exists

        if exists("./test.db"):
            remove("./test.db")
    except Exception:
        # If deletion fails (e.g., file locked), proceed with create_all
        pass

    # Ensure all tables are created once for the test session
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session")
def db_setup(db_engine):
    """Alias for db_engine for backward compatibility."""
    yield db_engine


@pytest.fixture(scope="function")
def db_session(db_engine):
    """
    Database session with proper transaction isolation.

    Each test gets a fresh session with a clean database state.
    Uses table deletion for isolation (SQLite doesn't support nested transactions well).
    """
    global _test_session

    # Create a new connection and session for this test
    connection = db_engine.connect()
    session = Session(bind=connection)

    # Clean all tables before each test to ensure isolation
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(table.delete())
    session.commit()

    # Set global session for get_db override
    _test_session = session

    try:
        yield session
    finally:
        # Cleanup
        _test_session = None
        session.rollback()
        session.close()
        connection.close()


@pytest.fixture(scope="function")
def client(db_engine):
    """
    FastAPI test client with test database.

    Function-scoped to ensure each test gets a fresh client state.
    """
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    # Don't clear overrides here - they're needed for the whole session


# Sample test data
@pytest.fixture
def sample_user_data():
    """Sample user data for testing"""
    return {
        "email": "test@example.com",
        "name": "Test User",
        "password": "testpassword123",
    }


@pytest.fixture
def mock_barangay(db_session):
    """Create a mock barangay for testing"""
    import uuid

    from app.db.models.barangay import Barangay

    # Use unique name to avoid conflicts
    unique_name = f"Test Barangay {uuid.uuid4().hex[:8]}"

    # Check if it already exists
    existing = db_session.query(Barangay).filter(Barangay.name == unique_name).first()
    if existing:
        return existing

    barangay = Barangay(name=unique_name)
    db_session.add(barangay)
    db_session.commit()
    db_session.refresh(barangay)
    return barangay


@pytest.fixture
def mock_blgu_user(db_session, mock_barangay):
    """Create a mock BLGU user for testing"""
    import uuid

    from app.core.security import pwd_context
    from app.db.enums import UserRole
    from app.db.models.user import User

    # Use unique email to avoid conflicts
    unique_email = f"blgu{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="BLGU Test User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=mock_barangay.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Eager load relationships
    db_session.refresh(user)
    if hasattr(user, "barangay"):
        db_session.refresh(user.barangay)

    return user


@pytest.fixture
def mock_assessment(db_session, mock_blgu_user):
    """Create a mock assessment for testing"""
    from datetime import datetime

    from app.db.enums import AssessmentStatus, ComplianceStatus
    from app.db.models.assessment import Assessment

    assessment = Assessment(
        blgu_user_id=mock_blgu_user.id,
        status=AssessmentStatus.VALIDATED,
        final_compliance_status=ComplianceStatus.FAILED,
        area_results={
            "Financial Administration and Sustainability": "Failed",
            "Disaster Preparedness": "Passed",
            "Safety, Peace and Order": "Failed",
        },
        validated_at=datetime(2024, 1, 1),
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    # Eager load relationships
    db_session.refresh(assessment)
    if hasattr(assessment, "blgu_user"):
        db_session.refresh(assessment.blgu_user)
        if hasattr(assessment.blgu_user, "barangay"):
            db_session.refresh(assessment.blgu_user.barangay)

    return assessment


@pytest.fixture
def mock_assessment_without_barangay(db_session):
    """Create a mock assessment without barangay for testing"""
    import uuid
    from datetime import datetime

    from app.core.security import pwd_context
    from app.db.enums import AssessmentStatus, UserRole
    from app.db.models.assessment import Assessment
    from app.db.models.user import User

    # Use unique email to avoid conflicts
    unique_email = f"nobarangay{uuid.uuid4().hex[:8]}@example.com"

    user_no_barangay = User(
        email=unique_email,
        name="User Without Barangay",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=None,
    )
    db_session.add(user_no_barangay)
    db_session.commit()
    db_session.refresh(user_no_barangay)

    assessment = Assessment(
        blgu_user_id=user_no_barangay.id,
        status=AssessmentStatus.VALIDATED,
        validated_at=datetime(2024, 1, 1),
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    # Eager load relationships
    db_session.refresh(assessment)
    if hasattr(assessment, "blgu_user"):
        db_session.refresh(assessment.blgu_user)

    return assessment


# ============================================================================
# User Role Fixtures for Access Control Testing
# ============================================================================


@pytest.fixture
def mlgoo_user(db_session):
    """Create a MLGOO_DILG admin user for testing"""
    import uuid

    from app.core.security import pwd_context
    from app.db.enums import UserRole
    from app.db.models.user import User

    unique_email = f"mlgoo{uuid.uuid4().hex[:8]}@dilg.gov.ph"

    user = User(
        email=unique_email,
        name="MLGOO Admin User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def mock_governance_area(db_session):
    """Create a mock governance area for testing"""
    import uuid

    from app.db.enums import AreaType
    from app.db.models.governance_area import GovernanceArea

    unique_id = uuid.uuid4().hex[:8]
    unique_name = f"Test Governance Area {unique_id}"
    unique_code = unique_id[:2].upper()  # 2-letter code from UUID hex

    area = GovernanceArea(name=unique_name, code=unique_code, area_type=AreaType.CORE)
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


@pytest.fixture
def validator_user(db_session, mock_governance_area):
    """Create a VALIDATOR user for testing"""
    import uuid

    from app.core.security import pwd_context
    from app.db.enums import UserRole
    from app.db.models.user import User

    unique_email = f"validator{uuid.uuid4().hex[:8]}@dilg.gov.ph"

    user = User(
        email=unique_email,
        name="Validator User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.VALIDATOR,
        assessor_area_id=mock_governance_area.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def assessor_user(db_session):
    """Create an ASSESSOR user for testing"""
    import uuid

    from app.core.security import pwd_context
    from app.db.enums import UserRole
    from app.db.models.user import User

    unique_email = f"assessor{uuid.uuid4().hex[:8]}@dilg.gov.ph"

    user = User(
        email=unique_email,
        name="Assessor User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.ASSESSOR,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def blgu_user(db_session, mock_barangay):
    """Alias for mock_blgu_user for consistency in naming"""
    import uuid

    from app.core.security import pwd_context
    from app.db.enums import UserRole
    from app.db.models.user import User

    unique_email = f"blgu{uuid.uuid4().hex[:8]}@example.com"

    user = User(
        email=unique_email,
        name="BLGU User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=mock_barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def mock_indicator(db_session, mock_governance_area):
    """Create a mock indicator for testing"""
    import uuid

    from app.db.models.governance_area import Indicator

    unique_id = uuid.uuid4().hex[:8]

    indicator = Indicator(
        name=f"Test Indicator {unique_id}",
        indicator_code=f"TI{unique_id[:3].upper()}",
        governance_area_id=mock_governance_area.id,
        sort_order=1,
        description="Test indicator for MOV file tests",
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)
    return indicator
