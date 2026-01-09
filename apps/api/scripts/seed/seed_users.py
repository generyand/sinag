"""
Seed script to create initial users for SINAG.

After workflow restructuring:
- 25 BLGU Users (one per barangay)
- 6 Assessors (one per governance area - area-specific)
- 3 Validators (system-wide - no area assignment)
- 1 MLGOO Admin

Run with: cd apps/api && python seed_users.py
"""

import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.security import get_password_hash
from app.db.base import SessionLocal
from app.db.enums import UserRole
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea
from app.db.models.user import User

# Default password for all seeded users
DEFAULT_PASSWORD = "sinag2025"

# 25 Barangays in Sulop
BARANGAYS = [
    "Balasinon",
    "Buguis",
    "Carre",
    "Clib",
    "Harada Butai",
    "Katipunan",
    "Kiblagon",
    "Labon",
    "Laperas",
    "Lapla",
    "Litos",
    "Luparan",
    "Mckinley",
    "New Cebu",
    "Osmeña",
    "Palili",
    "Parame",
    "Poblacion",
    "Roxas",
    "Solongvale",
    "Tagolilong",
    "Tala-o",
    "Talas",
    "Tanwalang",
    "Waterfall",
]

# 6 Governance Areas
GOVERNANCE_AREAS = [
    (1, "Financial Administration and Sustainability"),
    (2, "Disaster Preparedness"),
    (3, "Safety, Peace and Order"),
    (4, "Social Protection and Sensitivity"),
    (5, "Business-Friendliness and Competitiveness"),
    (6, "Environmental Management"),
]


def create_blgu_users(db):
    """Create 25 BLGU users, one for each barangay."""
    print("\n📋 Creating BLGU Users...")
    created = 0
    skipped = 0

    for barangay_name in BARANGAYS:
        # Get barangay ID
        barangay = db.query(Barangay).filter(Barangay.name == barangay_name).first()
        if not barangay:
            print(f"  ⚠️  Barangay '{barangay_name}' not found in database. Skipping.")
            skipped += 1
            continue

        # Generate email from barangay name (lowercase, no spaces)
        email_name = barangay_name.lower().replace(" ", "").replace("-", "")
        email = f"blgu.{email_name}@sulop.gov.ph"

        # Check if user already exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"  ⏭️  BLGU user for {barangay_name} already exists. Skipping.")
            skipped += 1
            continue

        # Create BLGU user
        user = User(
            email=email,
            name=f"BLGU {barangay_name}",
            role=UserRole.BLGU_USER,
            barangay_id=barangay.id,
            hashed_password=get_password_hash(DEFAULT_PASSWORD),
            is_active=True,
            must_change_password=True,
        )
        db.add(user)
        created += 1
        print(f"  ✅ Created: {email} (Barangay: {barangay_name})")

    db.commit()
    print(f"\n  📊 BLGU Users - Created: {created}, Skipped: {skipped}")
    return created


def create_assessors(db):
    """Create 6 Assessor users, one for each governance area.

    After workflow restructuring: ASSESSORs are area-specific.
    """
    print("\n📋 Creating Assessors (one per governance area)...")
    created = 0
    skipped = 0

    for area_id, area_name in GOVERNANCE_AREAS:
        # Get governance area
        area = db.query(GovernanceArea).filter(GovernanceArea.id == area_id).first()
        if not area:
            print(f"  ⚠️  Governance Area '{area_name}' (ID: {area_id}) not found. Skipping.")
            skipped += 1
            continue

        # Generate email
        email = f"assessor.area{area_id}@dilg.gov.ph"

        # Check if user already exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"  ⏭️  Assessor for Area {area_id} already exists. Skipping.")
            skipped += 1
            continue

        # Create Assessor user with area assignment
        user = User(
            email=email,
            name=f"Assessor Area {area_id}",
            role=UserRole.ASSESSOR,
            assessor_area_id=area_id,
            hashed_password=get_password_hash(DEFAULT_PASSWORD),
            is_active=True,
            must_change_password=True,
        )
        db.add(user)
        created += 1
        print(f"  ✅ Created: {email} (Area: {area_name})")

    db.commit()
    print(f"\n  📊 Assessors - Created: {created}, Skipped: {skipped}")
    return created


def create_validators(db):
    """Create 3 Validator users (system-wide).

    After workflow restructuring: VALIDATORs are system-wide, no area assignment.
    """
    print("\n📋 Creating Validators (system-wide)...")
    created = 0
    skipped = 0

    validators = [
        ("validator1@dilg.gov.ph", "Validator One"),
        ("validator2@dilg.gov.ph", "Validator Two"),
        ("validator3@dilg.gov.ph", "Validator Three"),
    ]

    for email, name in validators:
        # Check if user already exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"  ⏭️  Validator '{name}' already exists. Skipping.")
            skipped += 1
            continue

        # Create Validator user (no area assignment - system-wide)
        user = User(
            email=email,
            name=name,
            role=UserRole.VALIDATOR,
            hashed_password=get_password_hash(DEFAULT_PASSWORD),
            is_active=True,
            must_change_password=True,
        )
        db.add(user)
        created += 1
        print(f"  ✅ Created: {email} ({name})")

    db.commit()
    print(f"\n  📊 Validators - Created: {created}, Skipped: {skipped}")
    return created


def create_mlgoo(db):
    """Create 1 MLGOO Admin user."""
    print("\n📋 Creating MLGOO Admin...")

    email = "mlgoo@dilg.gov.ph"
    name = "MLGOO Administrator"

    # Check if user already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print("  ⏭️  MLGOO Admin already exists. Skipping.")
        return 0

    # Create MLGOO user
    user = User(
        email=email,
        name=name,
        role=UserRole.MLGOO_DILG,
        hashed_password=get_password_hash(DEFAULT_PASSWORD),
        is_active=True,
        is_superuser=True,
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    print(f"  ✅ Created: {email} ({name})")
    print("\n  📊 MLGOO - Created: 1")
    return 1


def main():
    print("=" * 60)
    print("🌱 SINAG User Seeding Script")
    print("=" * 60)
    print(f"\n🔑 Default password for all users: {DEFAULT_PASSWORD}")
    print("   (Users will be prompted to change on first login)\n")

    db = SessionLocal()

    try:
        # Create all users
        blgu_count = create_blgu_users(db)
        assessor_count = create_assessors(db)
        validator_count = create_validators(db)
        mlgoo_count = create_mlgoo(db)

        total = blgu_count + assessor_count + validator_count + mlgoo_count

        print("\n" + "=" * 60)
        print("📊 SUMMARY")
        print("=" * 60)
        print(f"  BLGU Users:  {blgu_count}")
        print(f"  Assessors:   {assessor_count}")
        print(f"  Validators:  {validator_count}")
        print(f"  MLGOO Admin: {mlgoo_count}")
        print("  ─────────────────────")
        print(f"  TOTAL:       {total}")
        print("=" * 60)

        if total > 0:
            print("\n✅ User seeding completed successfully!")
        else:
            print("\n⚠️  No new users were created (all users already exist).")

    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
