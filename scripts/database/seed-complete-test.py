"""
Create complete test data for validator testing:
- BLGU user with complete assessment
- Assessment in AWAITING_FINAL_VALIDATION status
- Responses for indicators across all 6 governance areas
"""

from sqlalchemy import create_engine, text
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), 'apps', 'api', '.env')
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise Exception(f"DATABASE_URL not found in environment. Tried loading from: {dotenv_path}")
engine = create_engine(DATABASE_URL)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def main():
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()

        try:
            # Step 1: Verify validators exist (system-wide after workflow restructuring)
            print("Verifying validator accounts...")
            validators = conn.execute(text("""
                SELECT id, email
                FROM users
                WHERE role = 'VALIDATOR'
                ORDER BY email
            """)).fetchall()

            print(f"✅ Found {len(validators)} validator accounts (system-wide):")
            for v in validators:
                print(f"  - {v[1]}")

            # Step 2: Create BLGU user
            print("\nCreating BLGU test user...")

            # Get a barangay ID
            barangay = conn.execute(text("SELECT id FROM barangays LIMIT 1")).fetchone()
            if not barangay:
                raise Exception("No barangays found in database")

            barangay_id = barangay[0]

            # Check if user already exists
            existing_user = conn.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": "test.complete@blgu.local"}
            ).fetchone()

            if existing_user:
                blgu_user_id = existing_user[0]
                print(f"✅ BLGU user already exists (ID: {blgu_user_id})")
            else:
                result = conn.execute(
                    text("""
                        INSERT INTO users (
                            email, name, role, barangay_id,
                            hashed_password, must_change_password,
                            is_superuser, is_active
                        )
                        VALUES (
                            :email, :name, :role, :barangay_id,
                            :hashed_password, :must_change_password,
                            :is_superuser, :is_active
                        )
                        RETURNING id
                    """),
                    {
                        "email": "test.complete@blgu.local",
                        "name": "Test Complete BLGU",
                        "role": "BLGU_USER",
                        "barangay_id": barangay_id,
                        "hashed_password": hash_password("blgu123"),
                        "must_change_password": False,
                        "is_superuser": False,
                        "is_active": True
                    }
                )
                blgu_user_id = result.fetchone()[0]
                print(f"✅ Created BLGU user (ID: {blgu_user_id})")

            # Step 3: Create assessment
            print("\nCreating assessment...")

            # Check if assessment already exists for this user
            existing_assessment = conn.execute(
                text("""
                    SELECT id FROM assessments
                    WHERE blgu_user_id = :user_id
                    AND status = 'AWAITING_FINAL_VALIDATION'
                """),
                {"user_id": blgu_user_id}
            ).fetchone()

            if existing_assessment:
                assessment_id = existing_assessment[0]
                print(f"✅ Assessment already exists (ID: {assessment_id})")
            else:
                result = conn.execute(
                    text("""
                        INSERT INTO assessments (
                            blgu_user_id, status,
                            submitted_at, validated_at,
                            rework_count,
                            created_at, updated_at
                        )
                        VALUES (
                            :blgu_user_id, :status,
                            NOW(), NOW(),
                            :rework_count,
                            NOW(), NOW()
                        )
                        RETURNING id
                    """),
                    {
                        "blgu_user_id": blgu_user_id,
                        "status": "AWAITING_FINAL_VALIDATION",
                        "rework_count": 0
                    }
                )
                assessment_id = result.fetchone()[0]
                print(f"✅ Created assessment (ID: {assessment_id})")

            # Step 4: Get leaf indicators from all governance areas
            print("\nFetching leaf indicators from all governance areas...")

            indicators = conn.execute(text("""
                SELECT i.id, i.indicator_code, i.name, ga.id as area_id, ga.name as area_name
                FROM indicators i
                JOIN governance_areas ga ON i.governance_area_id = ga.id
                WHERE i.parent_id IS NOT NULL
                ORDER BY ga.id, i.indicator_code
                LIMIT 30
            """)).fetchall()

            print(f"✅ Found {len(indicators)} leaf indicators across governance areas:")
            area_counts = {}
            for ind in indicators:
                area_id = ind[3]
                area_counts[area_id] = area_counts.get(area_id, 0) + 1

            for area_id, count in sorted(area_counts.items()):
                print(f"  - Area {area_id}: {count} indicators")

            # Step 5: Create assessment responses
            print("\nCreating assessment responses...")

            # Check how many responses already exist
            existing_count = conn.execute(
                text("""
                    SELECT COUNT(*) FROM assessment_responses
                    WHERE assessment_id = :assessment_id
                """),
                {"assessment_id": assessment_id}
            ).fetchone()[0]

            if existing_count > 0:
                print(f"✅ Assessment already has {existing_count} responses")
            else:
                for ind in indicators:
                    conn.execute(
                        text("""
                            INSERT INTO assessment_responses (
                                assessment_id, indicator_id,
                                validation_status, assessor_remarks,
                                response_data,
                                is_completed, requires_rework,
                                created_at, updated_at
                            )
                            VALUES (
                                :assessment_id, :indicator_id,
                                :validation_status, :assessor_remarks,
                                :response_data,
                                :is_completed, :requires_rework,
                                NOW(), NOW()
                            )
                        """),
                        {
                            "assessment_id": assessment_id,
                            "indicator_id": ind[0],
                            "validation_status": "PASS",
                            "assessor_remarks": f"Assessor has validated {ind[1]} - {ind[2]}. All requirements met.",
                            "response_data": '{"test": true}',
                            "is_completed": True,
                            "requires_rework": False
                        }
                    )

                print(f"✅ Created {len(indicators)} assessment responses")

            # Commit transaction
            trans.commit()
            print("\n✅ All test data created successfully!")

            # Print credentials
            print("\n" + "="*60)
            print("TEST CREDENTIALS")
            print("="*60)

            print("\n📋 VALIDATOR ACCOUNTS:")
            print("-" * 60)
            for v in validators:
                print(f"Email:    {v[1]}")
                print(f"Password: validator123")
                print(f"Area:     Governance Area {v[2]}")
                print("-" * 60)

            print("\n📋 BLGU ACCOUNT (Complete Assessment):")
            print("-" * 60)
            print("Email:    test.complete@blgu.local")
            print("Password: blgu123")
            print(f"Assessment ID: {assessment_id}")
            print(f"Status: AWAITING_FINAL_VALIDATION")
            print(f"Indicators: {len(indicators)} across all governance areas")
            print("-" * 60)

            print("\n✅ Setup complete! You can now test the validator workflow.")

        except Exception as e:
            trans.rollback()
            print(f"\n❌ Error: {e}")
            raise

if __name__ == "__main__":
    main()
