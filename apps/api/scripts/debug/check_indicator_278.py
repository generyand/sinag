"""
Check indicator 278 to verify its form_schema
"""

import json

from app.db.base import SessionLocal
from app.db.models import Indicator


def check_indicator():
    db = SessionLocal()

    try:
        indicator = db.query(Indicator).filter(Indicator.id == 278).first()

        if not indicator:
            print("❌ Indicator 278 not found")
            return

        print("✅ Indicator found!")
        print(f"ID: {indicator.id}")
        print(f"Name: {indicator.name}")
        print(f"Description: {indicator.description}")
        print("\nForm Schema:")
        print(json.dumps(indicator.form_schema, indent=2))

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    check_indicator()
