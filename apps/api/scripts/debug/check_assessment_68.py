"""
Check and update assessment 68 status to DRAFT for testing
"""

from app.db.base import SessionLocal
from app.db.models import Assessment
from app.db.enums import AssessmentStatus

def check_and_update_assessment():
    db = SessionLocal()

    try:
        assessment = db.query(Assessment).filter(Assessment.id == 68).first()

        if not assessment:
            print("❌ Assessment 68 not found")
            return

        print(f"✅ Assessment found!")
        print(f"ID: {assessment.id}")
        print(f"Current Status: {assessment.status}")

        if assessment.status != AssessmentStatus.DRAFT:
            print(f"\n⚠️  Assessment is in {assessment.status} status")
            print(f"📝 Changing status to DRAFT for testing...")

            assessment.status = AssessmentStatus.DRAFT
            db.commit()

            print(f"✅ Status updated to DRAFT")
            print(f"\n🔄 Please refresh the page to see the file upload component")
        else:
            print(f"\n✅ Assessment is already in DRAFT status")
            print(f"The file upload component should be visible")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_and_update_assessment()
