from passlib.context import CryptContext
from sqlalchemy.orm import Session
from starlette.testclient import TestClient

from app.db.enums import UserRole
from app.db.models.user import User
from main import app

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def test_auth_debug(db_session: Session):
    """Debug auth endpoint"""
    client = TestClient(app)

    # Create test user
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password=pwd_context.hash("testpassword123"),
        role=UserRole.BLGU_USER,
        barangay_id=1,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    # Test login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpassword123",
        },
    )
    print(f"\n\nStatus: {response.status_code}")
    print(f"Response: {response.text}\n\n")

    assert response.status_code == 200
