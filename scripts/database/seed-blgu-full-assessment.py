"""
Seed BLGU Assessment with Complete Data
=======================================
This script fills in all indicators for a BLGU user's assessment with mock data
and uploads the test PDF to all file upload fields.

Usage: python scripts/database/seed-blgu-full-assessment.py

User credentials: tester@gmail.com / password
"""

import sys
import os
from pathlib import Path

# Add the apps/api directory to the Python path
api_dir = Path(__file__).resolve().parent.parent.parent / "apps" / "api"
sys.path.insert(0, str(api_dir))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from datetime import datetime
import json

# Load environment variables from apps/api/.env
dotenv_path = api_dir / ".env"
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise Exception(f"DATABASE_URL not found in environment. Tried loading from: {dotenv_path}")

# Import models and services after setting up the path
from app.db.models.user import User
from app.db.models.assessment import Assessment, AssessmentResponse, MOVFile
from app.db.models.governance_area import Indicator
from app.db.enums import AssessmentStatus
from app.services.storage_service import storage_service
from fastapi import UploadFile
import io

# Create database engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def generate_mock_response_data(form_schema: dict) -> dict:
    """
    Generate mock response data based on form_schema structure.

    Args:
        form_schema: The indicator's form schema defining fields

    Returns:
        dict: Mock response data with appropriate values for each field type
    """
    response_data = {}

    if not form_schema or not isinstance(form_schema, dict):
        return {"mock": "true"}

    # Get fields array from schema
    fields = form_schema.get("fields", [])

    for field in fields:
        field_id = field.get("id")
        field_type = field.get("type")

        if not field_id:
            continue

        # Generate appropriate mock data based on field type
        if field_type == "text":
            response_data[field_id] = "Sample text response for testing"
        elif field_type == "textarea":
            response_data[field_id] = "This is a longer sample response for textarea field. It contains multiple sentences to simulate actual user input."
        elif field_type == "number":
            response_data[field_id] = 100
        elif field_type == "select" or field_type == "dropdown":
            # Use first option if available
            options = field.get("options", [])
            if options:
                response_data[field_id] = options[0].get("value", "yes")
            else:
                response_data[field_id] = "yes"
        elif field_type == "radio":
            # Use first option if available
            options = field.get("options", [])
            if options:
                response_data[field_id] = options[0].get("value", "yes")
            else:
                response_data[field_id] = "yes"
        elif field_type == "checkbox":
            response_data[field_id] = True
        elif field_type == "date":
            response_data[field_id] = "2024-01-15"
        elif field_type == "year":
            response_data[field_id] = "2024"
        elif field_type == "email":
            response_data[field_id] = "sample@example.com"
        elif field_type == "tel" or field_type == "phone":
            response_data[field_id] = "+63 912 345 6789"
        elif field_type == "url":
            response_data[field_id] = "https://example.com"
        elif field_type == "file" or field_type == "upload":
            # File fields are handled separately via MOVFile uploads
            # Just mark as present in response_data
            response_data[field_id] = "uploaded"
        else:
            # Default fallback
            response_data[field_id] = "Sample response"

    return response_data


class MockUploadFile:
    """Mock UploadFile object for testing/seeding purposes."""
    def __init__(self, filename: str, file_content: bytes, content_type: str):
        self.filename = filename
        self.file = io.BytesIO(file_content)
        self.content_type = content_type
        self.size = len(file_content)


def upload_pdf_to_indicator(
    db,
    assessment_id: int,
    indicator_id: int,
    user_id: int,
    pdf_path: Path,
    field_id: str = None
) -> bool:
    """
    Upload a PDF file to an indicator using the storage service.

    Args:
        db: Database session
        assessment_id: ID of the assessment
        indicator_id: ID of the indicator
        user_id: ID of the user uploading
        pdf_path: Path to the PDF file
        field_id: Optional field identifier

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Read the PDF file
        with open(pdf_path, 'rb') as f:
            file_content = f.read()

        # Create mock upload file object
        upload_file = MockUploadFile(
            filename="test.pdf",
            file_content=file_content,
            content_type="application/pdf"
        )

        # Upload using storage service
        mov_file = storage_service.upload_mov_file(
            db=db,
            file=upload_file,
            assessment_id=assessment_id,
            indicator_id=indicator_id,
            user_id=user_id,
            field_id=field_id
        )

        return mov_file is not None
    except Exception as e:
        print(f"      ⚠️  Failed to upload file: {e}")
        import traceback
        traceback.print_exc()
        return False


def get_file_upload_fields(form_schema: dict) -> list:
    """
    Extract all file upload field IDs from a form schema.

    Args:
        form_schema: The indicator's form schema

    Returns:
        list: List of field IDs that are file upload fields
    """
    file_fields = []

    if not form_schema or not isinstance(form_schema, dict):
        return file_fields

    fields = form_schema.get("fields", [])

    for field in fields:
        field_id = field.get("id")
        field_type = field.get("type")

        if field_type in ["file", "upload"] and field_id:
            file_fields.append(field_id)

    return file_fields


def main():
    print("=" * 80)
    print("BLGU FULL ASSESSMENT SEED SCRIPT")
    print("=" * 80)
    print()

    # Path to test PDF
    pdf_path = Path(__file__).resolve().parent.parent.parent / "apps" / "web" / "public" / "test.pdf"

    if not pdf_path.exists():
        print(f"❌ Test PDF not found at: {pdf_path}")
        return

    print(f"✅ Found test PDF at: {pdf_path}")
    print()

    # Create database session
    db = SessionLocal()

    try:
        # Step 1: Find the user
        print("Step 1: Finding user...")
        user = db.query(User).filter(User.email == "tester@gmail.com").first()

        if not user:
            print("❌ User 'tester@gmail.com' not found!")
            print("   Please create this user first.")
            return

        print(f"✅ Found user: {user.name} (ID: {user.id})")
        print(f"   Role: {user.role}")
        print(f"   Barangay ID: {user.barangay_id}")
        print()

        # Step 2: Get or create assessment
        print("Step 2: Getting or creating assessment...")
        assessment = db.query(Assessment).filter(
            Assessment.blgu_user_id == user.id,
            Assessment.status == AssessmentStatus.DRAFT
        ).first()

        if not assessment:
            assessment = Assessment(
                blgu_user_id=user.id,
                status=AssessmentStatus.DRAFT,
                rework_count=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(assessment)
            db.commit()
            db.refresh(assessment)
            print(f"✅ Created new assessment (ID: {assessment.id})")
        else:
            print(f"✅ Found existing assessment (ID: {assessment.id})")

        print()

        # Step 3: Get all indicators
        print("Step 3: Fetching all indicators...")
        indicators = db.query(Indicator).filter(
            Indicator.is_active == True,
            Indicator.parent_id.isnot(None)  # Only leaf indicators
        ).order_by(Indicator.governance_area_id, Indicator.indicator_code).all()

        print(f"✅ Found {len(indicators)} leaf indicators")
        print()

        # Count indicators per governance area
        from collections import defaultdict
        area_counts = defaultdict(int)
        for ind in indicators:
            area_counts[ind.governance_area_id] += 1

        print("Indicators per governance area:")
        for area_id in sorted(area_counts.keys()):
            print(f"  Area {area_id}: {area_counts[area_id]} indicators")
        print()

        # Step 4: Process each indicator
        print("Step 4: Creating responses and uploading files...")
        print("-" * 80)

        created_count = 0
        updated_count = 0
        file_upload_count = 0

        for idx, indicator in enumerate(indicators, 1):
            print(f"[{idx}/{len(indicators)}] Processing {indicator.indicator_code}: {indicator.name[:50]}...")

            # Check if response exists
            response = db.query(AssessmentResponse).filter(
                AssessmentResponse.assessment_id == assessment.id,
                AssessmentResponse.indicator_id == indicator.id
            ).first()

            # Generate mock response data
            mock_data = generate_mock_response_data(indicator.form_schema)

            if response:
                # Update existing response
                response.response_data = mock_data
                response.is_completed = True
                response.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(response)
                print(f"  ✏️  Updated existing response")
                updated_count += 1
            else:
                # Create new response
                response = AssessmentResponse(
                    assessment_id=assessment.id,
                    indicator_id=indicator.id,
                    response_data=mock_data,
                    is_completed=False,  # Will be updated by storage service
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(response)
                db.commit()
                db.refresh(response)
                print(f"  ✅ Created new response")
                created_count += 1

            # Upload files for file upload fields in form schema
            file_fields = get_file_upload_fields(indicator.form_schema)

            if file_fields:
                print(f"  📎 Found {len(file_fields)} file upload field(s) in form")
                for field_id in file_fields:
                    # Check if file already uploaded for this field
                    existing_file = db.query(MOVFile).filter(
                        MOVFile.assessment_id == assessment.id,
                        MOVFile.indicator_id == indicator.id,
                        MOVFile.field_id == field_id,
                        MOVFile.deleted_at.is_(None)
                    ).first()

                    if existing_file:
                        print(f"      ⏭️  File already uploaded for field '{field_id}'")
                    else:
                        success = upload_pdf_to_indicator(
                            db=db,
                            assessment_id=assessment.id,
                            indicator_id=indicator.id,
                            user_id=user.id,
                            pdf_path=pdf_path,
                            field_id=field_id
                        )
                        if success:
                            print(f"      ✅ Uploaded test.pdf for field '{field_id}'")
                            file_upload_count += 1
                        else:
                            print(f"      ❌ Failed to upload for field '{field_id}'")

            # Also upload a general MOV file for this indicator (independent of form fields)
            # This simulates the typical BLGU workflow where users upload evidence files
            existing_general_mov = db.query(MOVFile).filter(
                MOVFile.assessment_id == assessment.id,
                MOVFile.indicator_id == indicator.id,
                MOVFile.field_id.is_(None),  # General MOV (not tied to specific field)
                MOVFile.deleted_at.is_(None)
            ).first()

            if not existing_general_mov:
                success = upload_pdf_to_indicator(
                    db=db,
                    assessment_id=assessment.id,
                    indicator_id=indicator.id,
                    user_id=user.id,
                    pdf_path=pdf_path,
                    field_id=None  # General MOV upload
                )
                if success:
                    print(f"  📄 Uploaded general MOV file")
                    file_upload_count += 1
            else:
                print(f"  ⏭️  General MOV file already exists")

            print()

        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Assessment ID: {assessment.id}")
        print(f"User: {user.email}")
        print(f"Total Indicators: {len(indicators)}")
        print(f"Responses Created: {created_count}")
        print(f"Responses Updated: {updated_count}")
        print(f"Files Uploaded: {file_upload_count}")
        print("=" * 80)
        print()
        print("✅ Seed script completed successfully!")
        print()
        print("You can now login with:")
        print("  Email: tester@gmail.com")
        print("  Password: password")
        print()

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
