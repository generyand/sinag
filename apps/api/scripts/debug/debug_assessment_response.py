"""
Debug script to check assessment response data and MOV relationships
"""
from app.db.base import SessionLocal
from app.db.models import AssessmentResponse, MOV, Indicator
from sqlalchemy.orm import joinedload

db = SessionLocal()

# Get all assessment responses with MOVs
responses = db.query(AssessmentResponse).options(
    joinedload(AssessmentResponse.movs),
    joinedload(AssessmentResponse.indicator)
).filter(AssessmentResponse.movs.any()).all()

print(f"Found {len(responses)} responses with MOVs:\n")

for response in responses:
    print(f"Response ID: {response.id}")
    print(f"  Indicator: {response.indicator.name if response.indicator else 'None'}")
    print(f"  is_completed: {response.is_completed}")
    print(f"  response_data: {response.response_data}")
    print(f"  MOVs ({len(response.movs)}):")
    for mov in response.movs:
        print(f"    - ID: {mov.id}, filename: {mov.filename}, storage_path: {mov.storage_path}")
    print()

db.close()



