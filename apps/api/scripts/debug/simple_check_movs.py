"""Simple script to check MOV data in synthetic indicators"""

from sqlalchemy.orm import joinedload

from app.db.base import SessionLocal
from app.db.models import AssessmentResponse

db = SessionLocal()

# Get the specific response that should have MOVs
response = (
    db.query(AssessmentResponse)
    .options(joinedload(AssessmentResponse.movs), joinedload(AssessmentResponse.indicator))
    .filter(AssessmentResponse.id == 196)
    .first()
)

if response:
    print(f"Response ID: {response.id}")
    print(f"Indicator ID: {response.indicator_id}")
    print(f"Indicator Name: {response.indicator.name}")
    print(f"is_completed: {response.is_completed}")
    print(f"Number of MOVs: {len(response.movs)}")
    print("\nMOV Details:")
    for mov in response.movs:
        print(f"  - ID: {mov.id}")
        print(f"    filename: {mov.filename}")
        print(f"    storage_path: {mov.storage_path}")
        print(f"    status: {mov.status}")
        print()

    print("\nThe backend SHOULD return these MOVs in the API response.")
    print("If the frontend doesn't show them, the issue is in:")
    print("1. The serialization logic (_serialize_mov_list)")
    print("2. Or the frontend not displaying the data correctly")

db.close()
