"""
Test suite for SubmissionValidationService (Story 5.4.7-5.4.11)

Tests verify that the SubmissionValidationService:
- Validates completeness of all indicators using CompletenessValidationService
- Validates that all required MOV files are uploaded
- Returns comprehensive validation results
- Handles edge cases and errors gracefully
"""

import pytest
from sqlalchemy.orm import Session

from app.db.enums import AreaType, AssessmentStatus, UserRole
from app.db.models.assessment import Assessment, AssessmentResponse, MOVFile
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.services.submission_validation_service import (
    SubmissionValidationError,
    submission_validation_service,
)


class TestSubmissionValidationService:
    """Test suite for SubmissionValidationService."""

    def test_validate_submission_with_complete_assessment(self, db_session: Session):
        """Test validation passes when assessment is complete with all MOVs."""
        # Create test data
        user = User(
            email="test1@example.com",
            hashed_password="hashed",
            name="Test User 1",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        assessment = Assessment(blgu_user_id=user.id, status=AssessmentStatus.DRAFT)
        db_session.add(assessment)
        db_session.commit()

        # Create governance area and indicator with simple form schema
        gov_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
        db_session.add(gov_area)
        db_session.commit()

        indicator = Indicator(
            name="Test Indicator",
            form_schema={
                "fields": [
                    {
                        "field_id": "field1",
                        "label": "Field 1",
                        "field_type": "text_input",
                        "required": True,
                    }
                ]
            },
            governance_area_id=gov_area.id,
        )
        db_session.add(indicator)
        db_session.commit()

        # Create complete response
        response = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            response_data={"field1": "Complete answer"},
            is_completed=True,
        )
        db_session.add(response)
        db_session.commit()

        # Validate submission
        result = submission_validation_service.validate_submission(
            assessment_id=assessment.id, db=db_session
        )

        assert result.is_valid is True
        assert len(result.incomplete_indicators) == 0
        assert len(result.missing_movs) == 0
        assert result.error_message is None

        # Cleanup
        db_session.delete(response)
        db_session.delete(indicator)
        db_session.delete(gov_area)
        db_session.delete(assessment)
        db_session.delete(user)
        db_session.commit()

    def test_validate_submission_with_incomplete_indicators(self, db_session: Session):
        """Test validation fails when indicators are incomplete."""
        # Create test data
        user = User(
            email="test2@example.com",
            hashed_password="hashed",
            name="Test User 2",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        assessment = Assessment(blgu_user_id=user.id, status=AssessmentStatus.DRAFT)
        db_session.add(assessment)
        db_session.commit()

        gov_area = GovernanceArea(name="Test Area 2", code="TA", area_type=AreaType.CORE)
        db_session.add(gov_area)
        db_session.commit()

        indicator = Indicator(
            name="Incomplete Indicator",
            form_schema={
                "fields": [
                    {
                        "field_id": "required_field",
                        "label": "Required Field",
                        "field_type": "text_input",
                        "required": True,
                    }
                ]
            },
            governance_area_id=gov_area.id,
        )
        db_session.add(indicator)
        db_session.commit()

        # Create incomplete response (missing required field)
        response = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            response_data={},  # Empty - required field not filled
            is_completed=False,
        )
        db_session.add(response)
        db_session.commit()

        # Validate submission
        result = submission_validation_service.validate_submission(
            assessment_id=assessment.id, db=db_session
        )

        assert result.is_valid is False
        assert "Incomplete Indicator" in result.incomplete_indicators
        assert len(result.incomplete_indicators) == 1
        assert "incomplete" in result.error_message.lower()

        # Cleanup
        db_session.delete(response)
        db_session.delete(indicator)
        db_session.delete(gov_area)
        db_session.delete(assessment)
        db_session.delete(user)
        db_session.commit()

    def test_validate_submission_with_missing_movs(self, db_session: Session):
        """Test validation fails when required MOV files are missing."""
        # Create test data
        user = User(
            email="test3@example.com",
            hashed_password="hashed",
            name="Test User 3",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        assessment = Assessment(blgu_user_id=user.id, status=AssessmentStatus.DRAFT)
        db_session.add(assessment)
        db_session.commit()

        gov_area = GovernanceArea(name="Test Area 3", code="TA", area_type=AreaType.CORE)
        db_session.add(gov_area)
        db_session.commit()

        # Indicator with file upload field
        indicator = Indicator(
            name="File Upload Indicator",
            form_schema={
                "fields": [
                    {
                        "field_id": "file_field",
                        "label": "Upload File",
                        "field_type": "file_upload",
                        "required": True,
                    }
                ]
            },
            governance_area_id=gov_area.id,
        )
        db_session.add(indicator)
        db_session.commit()

        # Create response (complete data but no file uploaded)
        response = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            response_data={},  # File upload fields don't use response_data
            is_completed=False,
        )
        db_session.add(response)
        db_session.commit()

        # Don't create MOVFile - simulating missing file upload

        # Validate submission
        result = submission_validation_service.validate_submission(
            assessment_id=assessment.id, db=db_session
        )

        assert result.is_valid is False
        assert "File Upload Indicator" in result.missing_movs
        assert len(result.missing_movs) == 1
        assert "file upload" in result.error_message.lower()

        # Cleanup
        db_session.delete(response)
        db_session.delete(indicator)
        db_session.delete(gov_area)
        db_session.delete(assessment)
        db_session.delete(user)
        db_session.commit()

    def test_validate_submission_with_movs_uploaded(self, db_session: Session):
        """Test validation passes when MOV files are uploaded."""
        # Create test data
        user = User(
            email="test4@example.com",
            hashed_password="hashed",
            name="Test User 4",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        assessment = Assessment(blgu_user_id=user.id, status=AssessmentStatus.DRAFT)
        db_session.add(assessment)
        db_session.commit()

        gov_area = GovernanceArea(name="Test Area 4", code="TA", area_type=AreaType.CORE)
        db_session.add(gov_area)
        db_session.commit()

        indicator = Indicator(
            name="File Upload Indicator Complete",
            form_schema={
                "fields": [
                    {
                        "field_id": "file_field",
                        "label": "Upload File",
                        "field_type": "file_upload",
                        "required": True,
                    }
                ]
            },
            governance_area_id=gov_area.id,
        )
        db_session.add(indicator)
        db_session.commit()

        response = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            response_data={},
            is_completed=True,
        )
        db_session.add(response)
        db_session.commit()

        # Create MOVFile - file has been uploaded
        mov_file = MOVFile(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            uploaded_by=user.id,
            field_id="file_field",  # Must match field_id in form_schema
            file_name="test.pdf",
            file_url="https://example.com/test.pdf",
            file_type="application/pdf",
            file_size=1024,
        )
        db_session.add(mov_file)
        db_session.commit()

        # Validate submission
        result = submission_validation_service.validate_submission(
            assessment_id=assessment.id, db=db_session
        )

        assert result.is_valid is True
        assert len(result.missing_movs) == 0
        assert result.error_message is None

        # Cleanup
        db_session.delete(mov_file)
        db_session.delete(response)
        db_session.delete(indicator)
        db_session.delete(gov_area)
        db_session.delete(assessment)
        db_session.delete(user)
        db_session.commit()

    def test_validate_submission_combines_validation_errors(self, db_session: Session):
        """Test validation combines both incomplete and missing MOV errors."""
        # Create test data
        user = User(
            email="test5@example.com",
            hashed_password="hashed",
            name="Test User 5",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        assessment = Assessment(blgu_user_id=user.id, status=AssessmentStatus.DRAFT)
        db_session.add(assessment)
        db_session.commit()

        gov_area = GovernanceArea(name="Test Area 5", code="TA", area_type=AreaType.CORE)
        db_session.add(gov_area)
        db_session.commit()

        # Indicator 1: Incomplete
        indicator1 = Indicator(
            name="Incomplete Indicator",
            form_schema={
                "fields": [
                    {
                        "field_id": "required_text",
                        "label": "Required Text",
                        "field_type": "text_input",
                        "required": True,
                    }
                ]
            },
            governance_area_id=gov_area.id,
        )
        db_session.add(indicator1)

        # Indicator 2: Missing MOV
        indicator2 = Indicator(
            name="Missing MOV Indicator",
            form_schema={
                "fields": [
                    {
                        "field_id": "file_field",
                        "label": "File Field",
                        "field_type": "file_upload",
                        "required": True,
                    }
                ]
            },
            governance_area_id=gov_area.id,
        )
        db_session.add(indicator2)
        db_session.commit()

        # Create incomplete response
        response1 = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicator1.id,
            response_data={},  # Missing required field
            is_completed=False,
        )
        db_session.add(response1)

        # Create response without MOV
        response2 = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicator2.id,
            response_data={},
            is_completed=False,
        )
        db_session.add(response2)
        db_session.commit()

        # Validate submission
        result = submission_validation_service.validate_submission(
            assessment_id=assessment.id, db=db_session
        )

        assert result.is_valid is False
        # Both indicators are incomplete: one missing text input, one missing file upload
        # The file_upload indicator is also counted as incomplete since no MOV was uploaded
        assert len(result.incomplete_indicators) == 2
        assert "Incomplete Indicator" in result.incomplete_indicators
        assert "Missing MOV Indicator" in result.incomplete_indicators
        assert len(result.missing_movs) == 1
        assert "incomplete" in result.error_message.lower()
        assert "file upload" in result.error_message.lower()

        # Cleanup
        db_session.delete(response1)
        db_session.delete(response2)
        db_session.delete(indicator1)
        db_session.delete(indicator2)
        db_session.delete(gov_area)
        db_session.delete(assessment)
        db_session.delete(user)
        db_session.commit()

    def test_validate_submission_raises_error_for_nonexistent_assessment(self, db_session: Session):
        """Test validation raises error when assessment doesn't exist."""
        with pytest.raises(SubmissionValidationError) as exc_info:
            submission_validation_service.validate_submission(
                assessment_id=99999,  # Non-existent ID
                db=db_session,
            )

        assert "not found" in str(exc_info.value).lower()

    def test_validate_submission_ignores_deleted_movs(self, db_session: Session):
        """Test validation doesn't count soft-deleted MOV files."""
        # Create test data
        user = User(
            email="test6@example.com",
            hashed_password="hashed",
            name="Test User 6",
            role=UserRole.BLGU_USER,
        )
        db_session.add(user)
        db_session.commit()

        assessment = Assessment(blgu_user_id=user.id, status=AssessmentStatus.DRAFT)
        db_session.add(assessment)
        db_session.commit()

        gov_area = GovernanceArea(name="Test Area 6", code="TA", area_type=AreaType.CORE)
        db_session.add(gov_area)
        db_session.commit()

        indicator = Indicator(
            name="Deleted MOV Indicator",
            form_schema={
                "fields": [
                    {
                        "field_id": "file_field",
                        "label": "File Field",
                        "field_type": "file_upload",
                        "required": True,
                    }
                ]
            },
            governance_area_id=gov_area.id,
        )
        db_session.add(indicator)
        db_session.commit()

        response = AssessmentResponse(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            response_data={},
            is_completed=False,
        )
        db_session.add(response)
        db_session.commit()

        # Create soft-deleted MOVFile
        from datetime import datetime

        mov_file = MOVFile(
            assessment_id=assessment.id,
            indicator_id=indicator.id,
            uploaded_by=user.id,
            file_name="deleted.pdf",
            file_url="https://example.com/deleted.pdf",
            file_type="application/pdf",
            file_size=1024,
            deleted_at=datetime.utcnow(),  # Soft deleted
        )
        db_session.add(mov_file)
        db_session.commit()

        # Validate submission - should fail because deleted file doesn't count
        result = submission_validation_service.validate_submission(
            assessment_id=assessment.id, db=db_session
        )

        assert result.is_valid is False
        assert "Deleted MOV Indicator" in result.missing_movs

        # Cleanup
        db_session.delete(mov_file)
        db_session.delete(response)
        db_session.delete(indicator)
        db_session.delete(gov_area)
        db_session.delete(assessment)
        db_session.delete(user)
        db_session.commit()
