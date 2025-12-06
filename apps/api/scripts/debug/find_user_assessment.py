"""Find assessments for the logged-in user"""

from app.db.base import SessionLocal
from app.db.models.assessment import Assessment

# Create database session
db = SessionLocal()

# User ID for test1@example.com
user_id = 20

print(f"🔍 Looking for assessments for user ID: {user_id}")
print("=" * 60)

# Query assessments
assessments = db.query(Assessment).filter(Assessment.blgu_user_id == user_id).all()

if not assessments:
    print(f"❌ No assessments found for user ID {user_id}")
    print("\nCreating a new assessment...")

    # Create a new assessment
    new_assessment = Assessment(blgu_user_id=user_id, status="DRAFT")
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)

    print(f"✅ Created new assessment with ID: {new_assessment.id}")
    print(f"\n👉 Use this assessment ID: {new_assessment.id}")
else:
    print(f"✅ Found {len(assessments)} assessment(s):\n")
    for assessment in assessments:
        print(f"  Assessment ID: {assessment.id}")
        print(f"  Status: {assessment.status}")
        print(f"  Created: {assessment.created_at}")
        print(f"  Submitted: {assessment.submitted_at if assessment.submitted_at else 'Not yet'}")
        print(f"  Rework Count: {assessment.rework_count}")
        print()

    print(f"👉 Use this assessment ID: {assessments[0].id}")

db.close()
