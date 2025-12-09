import sys
import os
# Ensure apps/api is in python path
api_path = os.path.join(os.getcwd(), 'apps/api')
if api_path not in sys.path:
    sys.path.append(api_path)

try:
    from app.core.config import settings
    # Ensure DB URL is set for script execution if missing
    if not settings.DATABASE_URL:
        os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/mgb_db"
        from app.core.config import settings
        
    from app.db.base import SessionLocal
    from app.db.models import User, Assessment
    # IMPORT THE CORRECT SERVICE
    from app.services.submission_validation_service import submission_validation_service
    
    if not SessionLocal:
        raise RuntimeError("SessionLocal is None. DB connection failed.")
        
    db = SessionLocal()
    print("DB Connected")
    
    user = db.query(User).filter(User.name.ilike('%McKinley%')).first()
    if user:
        print(f"User: {user.name} (ID: {user.id})")
        assessment = db.query(Assessment).filter(Assessment.blgu_user_id == user.id).first()
        if assessment:
            print(f"Assessment ID: {assessment.id}, Status: {assessment.status}")
            print(f"Rework Requested At: {assessment.rework_requested_at}")
            
            # Use SubmissionValidationService
            result = submission_validation_service.validate_submission(
                assessment_id=assessment.id, db=db
            )
            
            print(f"Validation Valid? {result.is_valid}")
            
            if not result.is_valid:
                print("Validation Failed!")
                print(f"Error Message: {result.error_message}")
                print(f"Incomplete Indicators: {result.incomplete_indicators}")
                print(f"Missing MOVs: {result.missing_movs}")
            else:
                print("Validation Passed!")
                
        else:
            print("Assessment not found")
    else:
        print("User not found")

except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Error: {e}")
