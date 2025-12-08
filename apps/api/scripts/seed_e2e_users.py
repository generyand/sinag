#!/usr/bin/env python3
"""
E2E Test User Seeding Script

Creates test users for Playwright E2E tests with predefined credentials.
These users match the expected credentials in apps/web/tests/e2e/authentication.spec.ts

Run with: cd apps/api && uv run python scripts/seed_e2e_users.py
"""

import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.security import get_password_hash
from app.db.base import SessionLocal
from app.db.enums import AreaType, UserRole
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea
from app.db.models.user import User

# E2E Test users matching authentication.spec.ts
E2E_TEST_USERS = [
    {
        "email": "admin@sinag-test.local",
        "password": "TestAdmin123!",
        "name": "E2E Admin User",
        "role": UserRole.MLGOO_DILG,
        "is_superuser": True,
    },
    {
        "email": "assessor@sinag-test.local",
        "password": "TestAssessor123!",
        "name": "E2E Assessor User",
        "role": UserRole.ASSESSOR,
    },
    {
        "email": "validator@sinag-test.local",
        "password": "TestValidator123!",
        "name": "E2E Validator User",
        "role": UserRole.VALIDATOR,
        "needs_validator_area": True,
    },
    {
        "email": "blgu@sinag-test.local",
        "password": "TestBLGU123!",
        "name": "E2E BLGU User",
        "role": UserRole.BLGU_USER,
        "needs_barangay": True,
    },
    {
        "email": "katuparan@sinag-test.local",
        "password": "TestKatuparan123!",
        "name": "E2E Katuparan User",
        "role": UserRole.KATUPARAN_CENTER_USER,
    },
]


def ensure_test_barangay(db) -> int:
    """Ensure a test barangay exists and return its ID."""
    barangay = db.query(Barangay).filter(Barangay.name == "E2E Test Barangay").first()
    if not barangay:
        # Try to find any existing barangay
        barangay = db.query(Barangay).first()
        if not barangay:
            # Create a test barangay (model only has id and name fields)
            barangay = Barangay(name="E2E Test Barangay")
            db.add(barangay)
            db.commit()
            db.refresh(barangay)
            print(f"  Created test barangay with ID: {barangay.id}")
    return barangay.id


def ensure_test_governance_area(db) -> int:
    """Ensure a governance area exists and return its ID."""
    area = db.query(GovernanceArea).first()
    if not area:
        # Create a test governance area with required fields
        area = GovernanceArea(
            id=1,
            name="E2E Test Governance Area",
            code="TE",  # 2-letter code
            area_type=AreaType.CORE,
        )
        db.add(area)
        db.commit()
        db.refresh(area)
        print(f"  Created test governance area with ID: {area.id}")
    return area.id


def create_e2e_users(db):
    """Create E2E test users."""
    print("\nCreating E2E test users...")
    created = 0
    skipped = 0

    # Get IDs for foreign keys
    barangay_id = None
    validator_area_id = None

    for user_config in E2E_TEST_USERS:
        email = user_config["email"]

        # Check if user already exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"  [skip] {email} already exists")
            skipped += 1
            continue

        # Get barangay_id if needed
        if user_config.get("needs_barangay"):
            if barangay_id is None:
                barangay_id = ensure_test_barangay(db)

        # Get validator_area_id if needed
        if user_config.get("needs_validator_area"):
            if validator_area_id is None:
                validator_area_id = ensure_test_governance_area(db)

        # Create user
        user = User(
            email=email,
            name=user_config["name"],
            role=user_config["role"],
            hashed_password=get_password_hash(user_config["password"]),
            is_active=True,
            is_superuser=user_config.get("is_superuser", False),
            must_change_password=False,  # Don't force password change for test users
            barangay_id=barangay_id if user_config.get("needs_barangay") else None,
            validator_area_id=validator_area_id
            if user_config.get("needs_validator_area")
            else None,
        )
        db.add(user)
        created += 1
        print(f"  [created] {email} ({user_config['role'].value})")

    db.commit()
    return created, skipped


def main():
    print("=" * 60)
    print("E2E Test User Seeding Script")
    print("=" * 60)

    db = SessionLocal()

    try:
        created, skipped = create_e2e_users(db)

        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"  Created: {created}")
        print(f"  Skipped: {skipped}")
        print("=" * 60)

        if created > 0:
            print("\nE2E test users created successfully!")
        else:
            print("\nNo new users created (all users already exist).")

        return 0

    except Exception as e:
        print(f"\nError during seeding: {e}")
        db.rollback()
        import traceback

        traceback.print_exc()
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
