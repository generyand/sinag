"""Check all MOVs in the database"""

from sqlalchemy import desc

from app.db.base import SessionLocal
from app.db.models import MOV

db = SessionLocal()

# Get the most recent MOVs
movs = db.query(MOV).order_by(desc(MOV.id)).limit(10).all()

print("Most recent 10 MOVs in database:\n")
for mov in movs:
    print(f"ID: {mov.id}")
    print(f"  filename: {mov.filename}")
    print(f"  storage_path: {mov.storage_path}")
    print(f"  response_id: {mov.response_id}")
    print(f"  status: {mov.status}")
    print(f"  created: {mov.created_at if hasattr(mov, 'created_at') else 'N/A'}")
    print()

if not movs:
    print("NO MOVs found in the database at all!")
    print("\nThis means:")
    print("1. The upload endpoint might not be saving to the database")
    print("2. Or there's a database transaction rollback happening")
    print("3. Or we're looking at the wrong database")

db.close()
