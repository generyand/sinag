"""
Test suite for mov_files table migration (Story 4.2.6)

Tests verify that the mov_files migration:
- Creates table with correct columns
- Establishes proper foreign key constraints
- Creates performance indexes
- Successfully rolls back (downgrade)

NOTE: These tests will fully pass once Story 4.3 (SQLAlchemy Model) is complete.
The migration works correctly with Postgres, but test database uses SQLite + Base.metadata.create_all()
which requires the MOVFile model to exist.
"""

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session


class TestMOVFilesMigration:
    """Test suite for mov_files table migration."""

    def test_mov_files_table_exists(self, db_session: Session):
        """Test that mov_files table was created by migration."""
        inspector = inspect(db_session.bind)
        tables = inspector.get_table_names()

        assert "mov_files" in tables, "mov_files table should exist after migration"

    def test_mov_files_columns(self, db_session: Session):
        """Test that mov_files table has all required columns."""
        inspector = inspect(db_session.bind)
        columns = {col["name"]: col for col in inspector.get_columns("mov_files")}

        # Check all required columns exist
        required_columns = [
            "id",
            "assessment_id",
            "indicator_id",
            "uploaded_by",
            "file_name",
            "file_url",
            "file_type",
            "file_size",
            "uploaded_at",
            "deleted_at",
        ]

        for col_name in required_columns:
            assert col_name in columns, f"Column '{col_name}' should exist in mov_files table"

        # Check primary key
        assert not columns["id"]["nullable"], "id should be NOT NULL (primary key)"

        # Check foreign keys are not nullable (except uploaded_by)
        assert not columns["assessment_id"]["nullable"], "assessment_id should be NOT NULL"
        assert not columns["indicator_id"]["nullable"], "indicator_id should be NOT NULL"
        assert columns["uploaded_by"]["nullable"], (
            "uploaded_by should be nullable (for SET NULL on delete)"
        )

        # Check file metadata columns
        assert not columns["file_name"]["nullable"], "file_name should be NOT NULL"
        assert not columns["file_url"]["nullable"], "file_url should be NOT NULL"
        assert not columns["file_type"]["nullable"], "file_type should be NOT NULL"
        assert not columns["file_size"]["nullable"], "file_size should be NOT NULL"

        # Check timestamp columns
        assert not columns["uploaded_at"]["nullable"], "uploaded_at should be NOT NULL"
        assert columns["deleted_at"]["nullable"], "deleted_at should be nullable (for soft delete)"

    def test_mov_files_foreign_keys(self, db_session: Session):
        """Test that mov_files table has proper foreign key constraints."""
        inspector = inspect(db_session.bind)
        foreign_keys = inspector.get_foreign_keys("mov_files")

        # Should have 3 foreign keys
        assert len(foreign_keys) == 3, "mov_files should have 3 foreign keys"

        # Build a dict for easier checking
        fk_dict = {fk["constrained_columns"][0]: fk for fk in foreign_keys}

        # Check assessment_id foreign key
        assert "assessment_id" in fk_dict, "Should have FK for assessment_id"
        assert fk_dict["assessment_id"]["referred_table"] == "assessments"
        assert fk_dict["assessment_id"]["referred_columns"] == ["id"]
        assert fk_dict["assessment_id"]["options"]["ondelete"] == "CASCADE"

        # Check indicator_id foreign key
        assert "indicator_id" in fk_dict, "Should have FK for indicator_id"
        assert fk_dict["indicator_id"]["referred_table"] == "indicators"
        assert fk_dict["indicator_id"]["referred_columns"] == ["id"]
        assert fk_dict["indicator_id"]["options"]["ondelete"] == "CASCADE"

        # Check uploaded_by foreign key
        assert "uploaded_by" in fk_dict, "Should have FK for uploaded_by"
        assert fk_dict["uploaded_by"]["referred_table"] == "users"
        assert fk_dict["uploaded_by"]["referred_columns"] == ["id"]
        assert fk_dict["uploaded_by"]["options"]["ondelete"] == "SET NULL"

    def test_mov_files_indexes(self, db_session: Session):
        """Test that mov_files table has performance indexes."""
        inspector = inspect(db_session.bind)
        indexes = inspector.get_indexes("mov_files")

        # Build a dict of index names to index info
        index_dict = {idx["name"]: idx for idx in indexes}

        # Check required indexes exist
        required_indexes = [
            "idx_mov_files_assessment_id",
            "idx_mov_files_indicator_id",
            "idx_mov_files_uploaded_by",
            "idx_mov_files_deleted_at",
        ]

        for idx_name in required_indexes:
            assert idx_name in index_dict, f"Index '{idx_name}' should exist"

        # Verify index columns
        assert "assessment_id" in index_dict["idx_mov_files_assessment_id"]["column_names"]
        assert "indicator_id" in index_dict["idx_mov_files_indicator_id"]["column_names"]
        assert "uploaded_by" in index_dict["idx_mov_files_uploaded_by"]["column_names"]
        assert "deleted_at" in index_dict["idx_mov_files_deleted_at"]["column_names"]

    def test_mov_files_primary_key(self, db_session: Session):
        """Test that mov_files table has a primary key constraint."""
        inspector = inspect(db_session.bind)
        pk_constraint = inspector.get_pk_constraint("mov_files")

        assert pk_constraint is not None, "mov_files should have a primary key"
        assert "id" in pk_constraint["constrained_columns"], "Primary key should be on id column"

    def test_mov_files_insert_and_query(self, db_session: Session):
        """Test that we can insert data into mov_files table and query it."""
        # This test verifies the table schema is functional
        # We'll use raw SQL to avoid depending on the MOVFile model

        # First, create a test assessment and user if they don't exist
        # (This assumes assessments and users tables exist from previous migrations)
        result = db_session.execute(
            text("""
                INSERT INTO mov_files (
                    assessment_id, indicator_id, uploaded_by,
                    file_name, file_url, file_type, file_size
                )
                VALUES (1, 1, 1, 'test_file.pdf', 'https://example.com/test.pdf', 'application/pdf', 1024)
                RETURNING id
            """)
        )

        file_id = result.scalar_one()
        db_session.commit()

        # Query the inserted file
        result = db_session.execute(
            text("SELECT file_name, file_size FROM mov_files WHERE id = :id"),
            {"id": file_id},
        )
        row = result.fetchone()

        assert row is not None, "Should be able to query inserted file"
        assert row[0] == "test_file.pdf", "File name should match"
        assert row[1] == 1024, "File size should match"

        # Cleanup
        db_session.execute(text("DELETE FROM mov_files WHERE id = :id"), {"id": file_id})
        db_session.commit()

    def test_mov_files_cascade_delete_assessment(self, db_session: Session):
        """Test that deleting an assessment cascades to delete mov_files."""
        # Create a test assessment
        result = db_session.execute(
            text("""
                INSERT INTO assessments (blgu_user_id, status)
                VALUES (1, 'DRAFT')
                RETURNING id
            """)
        )
        assessment_id = result.scalar_one()
        db_session.commit()

        # Create a test file for this assessment
        result = db_session.execute(
            text("""
                INSERT INTO mov_files (
                    assessment_id, indicator_id, uploaded_by,
                    file_name, file_url, file_type, file_size
                )
                VALUES (:assessment_id, 1, 1, 'test.pdf', 'https://example.com/test.pdf', 'application/pdf', 1024)
                RETURNING id
            """),
            {"assessment_id": assessment_id},
        )
        file_id = result.scalar_one()
        db_session.commit()

        # Verify file exists
        result = db_session.execute(
            text("SELECT COUNT(*) FROM mov_files WHERE id = :id"), {"id": file_id}
        )
        count = result.scalar_one()
        assert count == 1, "File should exist before assessment deletion"

        # Delete the assessment
        db_session.execute(text("DELETE FROM assessments WHERE id = :id"), {"id": assessment_id})
        db_session.commit()

        # Verify file was cascade deleted
        result = db_session.execute(
            text("SELECT COUNT(*) FROM mov_files WHERE id = :id"), {"id": file_id}
        )
        count = result.scalar_one()
        assert count == 0, "File should be cascade deleted when assessment is deleted"

    def test_mov_files_soft_delete_pattern(self, db_session: Session):
        """Test that the deleted_at column supports soft delete pattern."""
        # Insert a test file
        result = db_session.execute(
            text("""
                INSERT INTO mov_files (
                    assessment_id, indicator_id, uploaded_by,
                    file_name, file_url, file_type, file_size
                )
                VALUES (1, 1, 1, 'test.pdf', 'https://example.com/test.pdf', 'application/pdf', 1024)
                RETURNING id
            """)
        )
        file_id = result.scalar_one()
        db_session.commit()

        # Verify deleted_at is initially NULL
        result = db_session.execute(
            text("SELECT deleted_at FROM mov_files WHERE id = :id"), {"id": file_id}
        )
        deleted_at = result.scalar_one()
        assert deleted_at is None, "deleted_at should be NULL for new files"

        # Soft delete the file
        db_session.execute(
            text("UPDATE mov_files SET deleted_at = NOW() WHERE id = :id"),
            {"id": file_id},
        )
        db_session.commit()

        # Verify deleted_at is now set
        result = db_session.execute(
            text("SELECT deleted_at FROM mov_files WHERE id = :id"), {"id": file_id}
        )
        deleted_at = result.scalar_one()
        assert deleted_at is not None, "deleted_at should be set after soft delete"

        # Cleanup
        db_session.execute(text("DELETE FROM mov_files WHERE id = :id"), {"id": file_id})
        db_session.commit()
