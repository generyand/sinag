"""
Create validator accounts for governance areas 2-6
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
            print("Creating validator accounts for governance areas 2-6...")

            validators_to_create = [
                ("validator.area2@dilg.gov.ph", "Validator Area 2", 2),
                ("validator.area3@dilg.gov.ph", "Validator Area 3", 3),
                ("validator.area4@dilg.gov.ph", "Validator Area 4", 4),
                ("validator.area5@dilg.gov.ph", "Validator Area 5", 5),
                ("validator.area6@dilg.gov.ph", "Validator Area 6", 6),
            ]

            hashed_pw = hash_password("validator123")

            for email, name, area_id in validators_to_create:
                # Check if user already exists
                existing = conn.execute(
                    text("SELECT id FROM users WHERE email = :email"),
                    {"email": email}
                ).fetchone()

                if existing:
                    print(f"✅ {email} already exists (Area {area_id})")
                else:
                    conn.execute(
                        text("""
                            INSERT INTO users (
                                email, name, role, validator_area_id,
                                hashed_password, must_change_password,
                                is_superuser, is_active
                            )
                            VALUES (
                                :email, :name, :role, :validator_area_id,
                                :hashed_password, :must_change_password,
                                :is_superuser, :is_active
                            )
                        """),
                        {
                            "email": email,
                            "name": name,
                            "role": "VALIDATOR",
                            "validator_area_id": area_id,
                            "hashed_password": hashed_pw,
                            "must_change_password": False,
                            "is_superuser": False,
                            "is_active": True
                        }
                    )
                    print(f"✅ Created {email} (Area {area_id})")

            trans.commit()

            print("\n" + "="*60)
            print("VALIDATOR CREDENTIALS FOR AREAS 2-6")
            print("="*60)
            for email, _, area_id in validators_to_create:
                print(f"Email:    {email}")
                print(f"Password: validator123")
                print(f"Area:     Governance Area {area_id}")
                print("-" * 60)

        except Exception as e:
            trans.rollback()
            print(f"\n❌ Error: {e}")
            raise

if __name__ == "__main__":
    main()
