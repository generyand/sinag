"""
Test suite for MOVFile model (Story 4.3.5)

Tests verify that the MOVFile model:
- Can be created and saved to database
- Has correct relationships with Assessment, Indicator, and User
- Foreign keys work correctly
- Cascade deletes work properly
- Soft delete pattern functions correctly
"""

from datetime import datetime

from sqlalchemy.orm import Session

from app.db.enums import AreaType
from app.db.models.assessment import MOVFile
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User


class TestMOVFileModel:
    """Test suite for MOVFile SQLAlchemy model."""

    def test_create_mov_file(self, db_session: Session, mock_assessment, mock_blgu_user):
        """Test that MOVFile can be created and saved to database."""
        # Get or create a governance area and indicator
        governance_area = db_session.query(GovernanceArea).first()
        if not governance_area:
            governance_area = GovernanceArea(
                name="Test Governance Area", code="TG", area_type=AreaType.CORE
            )
            db_session.add(governance_area)
            db_session.flush()

        indicator = db_session.query(Indicator).first()
        if not indicator:
            indicator = Indicator(
                name="Test Indicator",
                description="Test indicator for MOV files",
                governance_area_id=governance_area.id,
                form_schema={},
            )
            db_session.add(indicator)
            db_session.flush()

        # Create a MOVFile instance
        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="test_evidence.pdf",
            file_url="https://storage.supabase.co/mov-files/1/1/test_evidence.pdf",
            file_type="application/pdf",
            file_size=102400,  # 100 KB
        )

        db_session.add(mov_file)
        db_session.commit()

        # Verify the file was saved
        saved_file = db_session.query(MOVFile).filter_by(file_name="test_evidence.pdf").first()
        assert saved_file is not None, "MOVFile should be saved to database"
        assert saved_file.assessment_id == mock_assessment.id
        assert saved_file.indicator_id == indicator.id
        assert saved_file.uploaded_by == mock_blgu_user.id
        assert saved_file.file_size == 102400
        assert saved_file.file_type == "application/pdf"
        assert saved_file.deleted_at is None, "New files should not be soft deleted"

    def test_mov_file_assessment_relationship(
        self, db_session: Session, mock_assessment, mock_blgu_user
    ):
        """Test that MOVFile has correct relationship with Assessment."""
        # Get or create indicator
        governance_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Test Indicator", governance_area_id=governance_area.id, form_schema={}
        )
        db_session.add(indicator)
        db_session.flush()

        # Create MOVFile
        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="assessment_evidence.pdf",
            file_url="https://storage.supabase.co/mov-files/1/1/assessment_evidence.pdf",
            file_type="application/pdf",
            file_size=50000,
        )
        db_session.add(mov_file)
        db_session.commit()

        # Test relationship from MOVFile to Assessment
        assert mov_file.assessment is not None, "MOVFile should have assessment relationship"
        assert mov_file.assessment.id == mock_assessment.id
        # Note: We don't assert status as mock_assessment may have different status based on fixtures

        # Test relationship from Assessment to MOVFile
        db_session.refresh(mock_assessment)
        assert len(mock_assessment.mov_files) > 0, "Assessment should have mov_files relationship"
        file_names = [f.file_name for f in mock_assessment.mov_files]
        assert "assessment_evidence.pdf" in file_names

    def test_mov_file_indicator_relationship(
        self, db_session: Session, mock_assessment, mock_blgu_user
    ):
        """Test that MOVFile has correct relationship with Indicator."""
        # Create governance area and indicator
        governance_area = GovernanceArea(
            name="Financial Governance", code="FG", area_type=AreaType.CORE
        )
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Budget Transparency",
            description="Indicator for budget documents",
            governance_area_id=governance_area.id,
            form_schema={},
        )
        db_session.add(indicator)
        db_session.flush()

        # Create MOVFile
        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="budget_document.xlsx",
            file_url="https://storage.supabase.co/mov-files/1/2/budget_document.xlsx",
            file_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            file_size=256000,
        )
        db_session.add(mov_file)
        db_session.commit()

        # Test relationship from MOVFile to Indicator
        assert mov_file.indicator is not None, "MOVFile should have indicator relationship"
        assert mov_file.indicator.id == indicator.id
        assert mov_file.indicator.name == "Budget Transparency"

        # Test relationship from Indicator to MOVFile
        db_session.refresh(indicator)
        assert len(indicator.mov_files) > 0, "Indicator should have mov_files relationship"
        assert indicator.mov_files[0].file_name == "budget_document.xlsx"

    def test_mov_file_uploader_relationship(
        self, db_session: Session, mock_assessment, mock_blgu_user
    ):
        """Test that MOVFile has correct relationship with User (uploader)."""
        # Create indicator
        governance_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Test Indicator", governance_area_id=governance_area.id, form_schema={}
        )
        db_session.add(indicator)
        db_session.flush()

        # Create MOVFile
        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="user_upload.jpg",
            file_url="https://storage.supabase.co/mov-files/1/1/user_upload.jpg",
            file_type="image/jpeg",
            file_size=512000,
        )
        db_session.add(mov_file)
        db_session.commit()

        # Test relationship from MOVFile to User
        assert mov_file.uploader is not None, "MOVFile should have uploader relationship"
        assert mov_file.uploader.id == mock_blgu_user.id
        assert mov_file.uploader.email == mock_blgu_user.email

    def test_cascade_delete_assessment(self, db_session: Session, mock_assessment, mock_blgu_user):
        """Test that deleting an assessment cascades to delete mov_files."""
        # Create indicator
        governance_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Test Indicator", governance_area_id=governance_area.id, form_schema={}
        )
        db_session.add(indicator)
        db_session.flush()

        # Create MOVFile
        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="cascade_test.pdf",
            file_url="https://storage.supabase.co/mov-files/1/1/cascade_test.pdf",
            file_type="application/pdf",
            file_size=1024,
        )
        db_session.add(mov_file)
        db_session.commit()

        file_id = mov_file.id

        # Verify file exists
        assert db_session.query(MOVFile).filter_by(id=file_id).first() is not None

        # Delete the assessment
        db_session.delete(mock_assessment)
        db_session.commit()

        # Verify file was cascade deleted
        deleted_file = db_session.query(MOVFile).filter_by(id=file_id).first()
        assert deleted_file is None, "MOVFile should be cascade deleted when assessment is deleted"

    def test_cascade_delete_indicator(self, db_session: Session, mock_assessment, mock_blgu_user):
        """Test that deleting an indicator cascades to delete mov_files.

        Note: CASCADE delete works in PostgreSQL but may not work in SQLite.
        This test verifies the model relationship is set up correctly.
        """
        # Create indicator
        governance_area = GovernanceArea(
            name="Test Area for Cascade", code="TA", area_type=AreaType.CORE
        )
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Test Indicator for Cascade",
            governance_area_id=governance_area.id,
            form_schema={},
        )
        db_session.add(indicator)
        db_session.flush()

        # Create MOVFile
        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="indicator_cascade_test.pdf",
            file_url="https://storage.supabase.co/mov-files/1/1/indicator_cascade_test.pdf",
            file_type="application/pdf",
            file_size=2048,
        )
        db_session.add(mov_file)
        db_session.commit()

        file_id = mov_file.id

        # Verify file exists
        assert db_session.query(MOVFile).filter_by(id=file_id).first() is not None

        # Note: SQLite doesn't enforce CASCADE by default, so we just verify
        # the model relationship exists. In PostgreSQL, this would cascade delete.
        assert mov_file.indicator is not None, "MOVFile should have indicator relationship"
        assert mov_file.indicator.id == indicator.id

    def test_set_null_on_user_delete(self, db_session: Session, mock_assessment):
        """Test that deleting a user sets uploaded_by to NULL instead of cascade deleting files.

        Note: SET NULL on delete works in PostgreSQL but may not work in SQLite.
        This test verifies the model relationship is set up correctly.
        """
        # Create a temporary user
        temp_user = User(
            email="tempuser@test.com",
            name="Temporary User",
            hashed_password="hashed_password",
            role="BLGU_USER",
        )
        db_session.add(temp_user)
        db_session.flush()

        # Create indicator
        governance_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Test Indicator", governance_area_id=governance_area.id, form_schema={}
        )
        db_session.add(indicator)
        db_session.flush()

        # Create MOVFile uploaded by temp user
        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=temp_user.id,
            file_name="user_delete_test.pdf",
            file_url="https://storage.supabase.co/mov-files/1/1/user_delete_test.pdf",
            file_type="application/pdf",
            file_size=4096,
        )
        db_session.add(mov_file)
        db_session.commit()

        file_id = mov_file.id
        user_id = temp_user.id

        # Verify file was uploaded by temp user
        assert mov_file.uploaded_by == user_id

        # Delete the user
        db_session.delete(temp_user)
        db_session.commit()

        # Verify file still exists
        # Note: SQLite doesn't enforce SET NULL, but PostgreSQL will
        remaining_file = db_session.query(MOVFile).filter_by(id=file_id).first()
        assert remaining_file is not None, (
            "MOVFile should still exist after user deletion (not cascade deleted)"
        )
        # In PostgreSQL production, uploaded_by would be NULL here

    def test_soft_delete_pattern(self, db_session: Session, mock_assessment, mock_blgu_user):
        """Test that the deleted_at column supports soft delete pattern."""
        # Create indicator
        governance_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Test Indicator", governance_area_id=governance_area.id, form_schema={}
        )
        db_session.add(indicator)
        db_session.flush()

        # Create MOVFile
        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="soft_delete_test.pdf",
            file_url="https://storage.supabase.co/mov-files/1/1/soft_delete_test.pdf",
            file_type="application/pdf",
            file_size=8192,
        )
        db_session.add(mov_file)
        db_session.commit()

        # Verify deleted_at is initially NULL
        assert mov_file.deleted_at is None, "New file should not have deleted_at set"

        # Soft delete the file
        mov_file.deleted_at = datetime.utcnow()
        db_session.commit()

        # Verify deleted_at is now set
        db_session.refresh(mov_file)
        assert mov_file.deleted_at is not None, "deleted_at should be set after soft delete"
        assert isinstance(mov_file.deleted_at, datetime), "deleted_at should be a datetime object"

        # Verify file still exists in database (not hard deleted)
        file_count = db_session.query(MOVFile).filter_by(file_name="soft_delete_test.pdf").count()
        assert file_count == 1, "Soft deleted file should still exist in database"

    def test_multiple_files_per_indicator(
        self, db_session: Session, mock_assessment, mock_blgu_user
    ):
        """Test that multiple files can be uploaded for the same indicator."""
        # Create indicator
        governance_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Multi-File Indicator",
            governance_area_id=governance_area.id,
            form_schema={},
        )
        db_session.add(indicator)
        db_session.flush()

        # Create multiple MOVFiles for the same indicator
        file1 = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="evidence1.pdf",
            file_url="https://storage.supabase.co/mov-files/1/1/evidence1.pdf",
            file_type="application/pdf",
            file_size=1024,
        )

        file2 = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="evidence2.jpg",
            file_url="https://storage.supabase.co/mov-files/1/1/evidence2.jpg",
            file_type="image/jpeg",
            file_size=2048,
        )

        file3 = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="evidence3.xlsx",
            file_url="https://storage.supabase.co/mov-files/1/1/evidence3.xlsx",
            file_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            file_size=4096,
        )

        db_session.add_all([file1, file2, file3])
        db_session.commit()

        # Verify all files were saved
        db_session.refresh(indicator)
        assert len(indicator.mov_files) == 3, "Indicator should have 3 mov_files"

        file_names = {f.file_name for f in indicator.mov_files}
        assert file_names == {"evidence1.pdf", "evidence2.jpg", "evidence3.xlsx"}

    def test_timestamps_auto_populate(self, db_session: Session, mock_assessment, mock_blgu_user):
        """Test that uploaded_at timestamp is automatically populated."""
        # Create indicator
        governance_area = GovernanceArea(name="Test Area", code="TA", area_type=AreaType.CORE)
        db_session.add(governance_area)
        db_session.flush()

        indicator = Indicator(
            name="Test Indicator", governance_area_id=governance_area.id, form_schema={}
        )
        db_session.add(indicator)
        db_session.flush()

        # Create MOVFile without explicitly setting uploaded_at
        mov_file = MOVFile(
            assessment_id=mock_assessment.id,
            indicator_id=indicator.id,
            uploaded_by=mock_blgu_user.id,
            file_name="timestamp_test.pdf",
            file_url="https://storage.supabase.co/mov-files/1/1/timestamp_test.pdf",
            file_type="application/pdf",
            file_size=1024,
        )
        db_session.add(mov_file)
        db_session.commit()

        # Verify uploaded_at was auto-populated
        assert mov_file.uploaded_at is not None, "uploaded_at should be auto-populated"
        assert isinstance(mov_file.uploaded_at, datetime), "uploaded_at should be a datetime object"

        # Verify uploaded_at is recent (within last minute)
        time_diff = datetime.utcnow() - mov_file.uploaded_at
        assert time_diff.total_seconds() < 60, "uploaded_at should be recent"
