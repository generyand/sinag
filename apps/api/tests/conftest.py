"""
🧪 Test Configuration
Essential testing setup for 2-person team
"""

import sys
from pathlib import Path

# Add the parent directory to Python path so we can import main and app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

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

import pytest
from app.db.base import Base, get_db
# Ensure all ORM models are registered on Base.metadata before creating tables
from app.db import models  # noqa: F401
from fastapi.testclient import TestClient
from main import app
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Test database URL (use SQLite for simplicity in tests)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Enable foreign key support in SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable foreign key support in SQLite"""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
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
def disable_startup_seeding():
    """Disable data seeding during test runs to speed up tests"""
    import os
    # Set environment variable to skip startup seeding
    old_value = os.environ.get("SKIP_STARTUP_SEEDING")
    os.environ["SKIP_STARTUP_SEEDING"] = "true"
    yield
    # Restore old value after session
    if old_value is None:
        os.environ.pop("SKIP_STARTUP_SEEDING", None)
    else:
        os.environ["SKIP_STARTUP_SEEDING"] = old_value


@pytest.fixture(scope="session")
def db_setup():
    """Create test database tables"""
    # Start from a clean slate to avoid stale/partial schemas across runs
    try:
        from os import remove
        from os.path import exists

        if exists("./test.db"):
            remove("./test.db")
    except Exception:
        # If deletion fails (e.g., file locked), proceed with create_all which will ensure tables exist
        pass

    # Ensure all tables are created once for the test session
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session")
def client(db_setup):
    """FastAPI test client with test database (session-scoped to avoid repeated startup)"""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def db_session(db_setup):
    """Database session with table data cleaned per test to avoid conflicts"""
    # Safety: make sure all tables exist before each test in case previous tests modified schema
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Clean all tables in reverse dependency order to satisfy FKs
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()

    try:
        yield db
    finally:
        db.close()


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

    from app.db.enums import UserRole
    from app.db.models.user import User
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

    from app.db.enums import AssessmentStatus, UserRole
    from app.db.models.assessment import Assessment
    from app.db.models.user import User
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

    from app.db.enums import UserRole
    from app.db.models.user import User
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

    from app.db.models.governance_area import GovernanceArea
    from app.db.enums import AreaType

    unique_id = uuid.uuid4().hex[:8]
    unique_name = f"Test Governance Area {unique_id}"
    unique_code = f"T{unique_id[:1].upper()}"  # 2-letter code like "TA", "TB", etc.

    area = GovernanceArea(name=unique_name, code=unique_code, area_type=AreaType.CORE)
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


@pytest.fixture
def validator_user(db_session, mock_governance_area):
    """Create a VALIDATOR user for testing"""
    import uuid

    from app.db.enums import UserRole
    from app.db.models.user import User
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    unique_email = f"validator{uuid.uuid4().hex[:8]}@dilg.gov.ph"

    user = User(
        email=unique_email,
        name="Validator User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.VALIDATOR,
        validator_area_id=mock_governance_area.id,
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

    from app.db.enums import UserRole
    from app.db.models.user import User
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

    from app.db.enums import UserRole
    from app.db.models.user import User
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
