import sys
import os
from sqlalchemy import text

# Ensure apps/api is in python path
api_path = os.path.join(os.getcwd(), 'apps/api')
if api_path not in sys.path:
    sys.path.append(api_path)

try:
    from app.core.config import settings
    if not settings.DATABASE_URL:
        os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/mgb_db"
        
    from app.db.base import SessionLocal
    from app.db.models import User, Assessment, MOVFile
    
    db = SessionLocal()
    print("DB Connected")
    
    # Get Assessment 63 (Mckinley)
    assessment = db.query(Assessment).get(63)
    if not assessment:
        print("Assessment 63 not found")
        sys.exit(1)
        
    print(f"Assessment Status: {assessment.status}")
    print(f"Rework Requested At: {assessment.rework_requested_at}")
    
    # Indicator 13 (1.6.1)
    indicator_id = 13
    
    print(f"\nScanning files for Indicator {indicator_id}...")
    
    files = db.query(MOVFile).filter(
        MOVFile.assessment_id == assessment.id,
        MOVFile.indicator_id == indicator_id,
        MOVFile.deleted_at.is_(None)
    ).all()
    
    if not files:
        print("No files found!")
    else:
        for f in files:
            is_valid = False
            if assessment.rework_requested_at:
                if f.uploaded_at >= assessment.rework_requested_at:
                    is_valid = True
            
            print(f"File ID: {f.id}")
            # print(f"  Filename: {f.filename}") # Error
            print(f"  Uploaded At: {f.uploaded_at}")
            print(f"  Is Valid (Newer than rework)? {is_valid}")
            
except Exception as e:
    print(f"Error: {e}")
