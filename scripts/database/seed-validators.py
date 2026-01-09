"""
Create validator accounts (system-wide after workflow restructuring).

After workflow restructuring:
- VALIDATORs are system-wide (no area assignment)
- ASSESSORs are area-specific (with assessor_area_id)

This script is kept for backward compatibility.
For new deployments, use startup_service.py seeding instead.
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
        trans = conn.begin()

        try:
            print("Creating system-wide validator accounts...")

            # After workflow restructuring: Validators are system-wide (no area assignment)
            validators_to_create = [
                ("validator1@dilg.gov.ph", "Validator One"),
                ("validator2@dilg.gov.ph", "Validator Two"),
                ("validator3@dilg.gov.ph", "Validator Three"),
            ]

            hashed_pw = hash_password("validator123")

            for email, name in validators_to_create:
                # Check if user already exists
                existing = conn.execute(
                    text("SELECT id FROM users WHERE email = :email"),
                    {"email": email}
                ).fetchone()

                if existing:
                    print(f"✅ {email} already exists")
                else:
                    # Create validator without area assignment (system-wide)
                    conn.execute(
                        text("""
                            INSERT INTO users (
                                email, name, role,
                                hashed_password, must_change_password,
                                is_superuser, is_active
                            )
                            VALUES (
                                :email, :name, :role,
                                :hashed_password, :must_change_password,
                                :is_superuser, :is_active
                            )
                        """),
                        {
                            "email": email,
                            "name": name,
                            "role": "VALIDATOR",
                            "hashed_password": hashed_pw,
                            "must_change_password": False,
                            "is_superuser": False,
                            "is_active": True
                        }
                    )
                    print(f"✅ Created {email} (system-wide)")

            trans.commit()

            print("\n" + "="*60)
            print("VALIDATOR CREDENTIALS (SYSTEM-WIDE)")
            print("="*60)
            for email, name in validators_to_create:
                print(f"Email:    {email}")
                print(f"Password: validator123")
                print(f"Access:   System-wide (all governance areas)")
                print("-" * 60)

        except Exception as e:
            trans.rollback()
            print(f"\n❌ Error: {e}")
            raise

if __name__ == "__main__":
    main()
