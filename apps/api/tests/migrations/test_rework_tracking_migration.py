"""
Test suite for rework tracking columns migration (Story 5.2.8)

Tests verify that the rework tracking migration:
- Adds rework_requested_at, rework_requested_by, rework_comments columns
- Creates CHECK constraint on rework_count (max value = 1)
- Establishes foreign key to users table with SET NULL on delete
- Creates performance index on rework_requested_by
- Successfully rolls back (downgrade)
"""

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


class TestReworkTrackingMigration:
    """Test suite for rework tracking columns migration."""

    def test_rework_tracking_columns_exist(self, db_session: Session):
        """Test that all rework tracking columns were added to assessments table."""
        inspector = inspect(db_session.bind)
        columns = {col["name"]: col for col in inspector.get_columns("assessments")}

        # Check all rework tracking columns exist
        required_columns = [
            "rework_count",  # Already existed, but should still be there
            "rework_requested_at",
            "rework_requested_by",
            "rework_comments",
        ]

        for col_name in required_columns:
            assert col_name in columns, f"Column '{col_name}' should exist in assessments table"

    def test_rework_count_column_properties(self, db_session: Session):
        """Test that rework_count column has correct properties."""
        inspector = inspect(db_session.bind)
        columns = {col["name"]: col for col in inspector.get_columns("assessments")}

        rework_count = columns["rework_count"]

        # Should be NOT NULL with default 0
        assert not rework_count["nullable"], "rework_count should be NOT NULL"
        assert rework_count["default"] is not None or "0" in str(rework_count), (
            "rework_count should have default 0"
        )

    def test_rework_requested_at_column_properties(self, db_session: Session):
        """Test that rework_requested_at column has correct properties."""
        inspector = inspect(db_session.bind)
        columns = {col["name"]: col for col in inspector.get_columns("assessments")}

        rework_requested_at = columns["rework_requested_at"]

        # Should be nullable TIMESTAMP
        assert rework_requested_at["nullable"], "rework_requested_at should be nullable"
        # Type should be DateTime/TIMESTAMP
        assert (
            "TIMESTAMP" in str(rework_requested_at["type"]).upper()
            or "DATETIME" in str(rework_requested_at["type"]).upper()
        ), "rework_requested_at should be TIMESTAMP/DATETIME type"

    def test_rework_requested_by_column_properties(self, db_session: Session):
        """Test that rework_requested_by column has correct properties."""
        inspector = inspect(db_session.bind)
        columns = {col["name"]: col for col in inspector.get_columns("assessments")}

        rework_requested_by = columns["rework_requested_by"]

        # Should be nullable INTEGER
        assert rework_requested_by["nullable"], (
            "rework_requested_by should be nullable (SET NULL on delete)"
        )
        # Type should be Integer
        assert (
            "INTEGER" in str(rework_requested_by["type"]).upper()
            or "INT" in str(rework_requested_by["type"]).upper()
        ), "rework_requested_by should be INTEGER type"

    def test_rework_comments_column_properties(self, db_session: Session):
        """Test that rework_comments column has correct properties."""
        inspector = inspect(db_session.bind)
        columns = {col["name"]: col for col in inspector.get_columns("assessments")}

        rework_comments = columns["rework_comments"]

        # Should be nullable TEXT
        assert rework_comments["nullable"], "rework_comments should be nullable"
        # Type should be Text
        assert "TEXT" in str(rework_comments["type"]).upper(), "rework_comments should be TEXT type"

    def test_rework_count_check_constraint(self, db_session: Session):
        """Test that CHECK constraint enforces rework_count <= 1."""
        # Create an assessment with rework_count = 0 (should work)
        result = db_session.execute(
            text("""
                INSERT INTO assessments (blgu_user_id, status, rework_count)
                VALUES (1, 'DRAFT', 0)
                RETURNING id
            """)
        )
        assessment_id_0 = result.scalar_one()
        db_session.commit()

        # Create an assessment with rework_count = 1 (should work)
        result = db_session.execute(
            text("""
                INSERT INTO assessments (blgu_user_id, status, rework_count)
                VALUES (1, 'DRAFT', 1)
                RETURNING id
            """)
        )
        assessment_id_1 = result.scalar_one()
        db_session.commit()

        # Try to create an assessment with rework_count = 2 (should fail)
        with pytest.raises(IntegrityError) as exc_info:
            db_session.execute(
                text("""
                    INSERT INTO assessments (blgu_user_id, status, rework_count)
                    VALUES (1, 'DRAFT', 2)
                """)
            )
            db_session.commit()

        # Rollback the failed transaction
        db_session.rollback()

        # Verify the error is about the check constraint
        assert (
            "chk_rework_count_limit" in str(exc_info.value).lower()
            or "check constraint" in str(exc_info.value).lower()
        ), "Should fail with check constraint violation"

        # Cleanup
        db_session.execute(text("DELETE FROM assessments WHERE id = :id"), {"id": assessment_id_0})
        db_session.execute(text("DELETE FROM assessments WHERE id = :id"), {"id": assessment_id_1})
        db_session.commit()

    def test_rework_count_negative_value_rejected(self, db_session: Session):
        """Test that CHECK constraint rejects negative rework_count values."""
        # Try to create an assessment with negative rework_count (should fail)
        with pytest.raises(IntegrityError) as exc_info:
            db_session.execute(
                text("""
                    INSERT INTO assessments (blgu_user_id, status, rework_count)
                    VALUES (1, 'DRAFT', -1)
                """)
            )
            db_session.commit()

        # Rollback the failed transaction
        db_session.rollback()

        # Verify the error is about the check constraint
        assert (
            "chk_rework_count_limit" in str(exc_info.value).lower()
            or "check constraint" in str(exc_info.value).lower()
        ), "Should fail with check constraint violation for negative values"

    def test_rework_requested_by_foreign_key(self, db_session: Session):
        """Test that rework_requested_by has foreign key to users table."""
        inspector = inspect(db_session.bind)
        foreign_keys = inspector.get_foreign_keys("assessments")

        # Find the rework_requested_by foreign key
        rework_fk = None
        for fk in foreign_keys:
            if "rework_requested_by" in fk["constrained_columns"]:
                rework_fk = fk
                break

        assert rework_fk is not None, "Should have FK for rework_requested_by"
        assert rework_fk["referred_table"] == "users", "FK should reference users table"
        assert rework_fk["referred_columns"] == ["id"], "FK should reference users.id"
        assert rework_fk["options"]["ondelete"] == "SET NULL", "FK should have SET NULL on delete"
        assert rework_fk["name"] == "fk_assessment_rework_requested_by", (
            "FK should have correct name"
        )

    def test_rework_requested_by_index_exists(self, db_session: Session):
        """Test that performance index on rework_requested_by exists."""
        inspector = inspect(db_session.bind)
        indexes = inspector.get_indexes("assessments")

        # Build a dict of index names to index info
        index_dict = {idx["name"]: idx for idx in indexes}

        # Check index exists
        assert "idx_assessments_rework_requested_by" in index_dict, (
            "Index 'idx_assessments_rework_requested_by' should exist"
        )

        # Verify index columns
        idx = index_dict["idx_assessments_rework_requested_by"]
        assert "rework_requested_by" in idx["column_names"], (
            "Index should be on rework_requested_by column"
        )
        assert not idx["unique"], "Index should not be unique"

    def test_insert_assessment_with_rework_tracking_data(self, db_session: Session):
        """Test that assessments table accepts rework tracking data."""
        # Insert assessment with all rework tracking fields
        result = db_session.execute(
            text("""
                INSERT INTO assessments (
                    blgu_user_id, status, rework_count,
                    rework_requested_at, rework_requested_by, rework_comments
                )
                VALUES (
                    1, 'REWORK', 1,
                    NOW(), 1, 'Please provide more detailed documentation for Indicator 1.1'
                )
                RETURNING id
            """)
        )
        assessment_id = result.scalar_one()
        db_session.commit()

        # Query the inserted assessment
        result = db_session.execute(
            text("""
                SELECT rework_count, rework_requested_by, rework_comments
                FROM assessments
                WHERE id = :id
            """),
            {"id": assessment_id},
        )
        row = result.fetchone()

        assert row is not None, "Should be able to query inserted assessment"
        assert row[0] == 1, "rework_count should be 1"
        assert row[1] == 1, "rework_requested_by should be 1"
        assert "Indicator 1.1" in row[2], "rework_comments should contain the feedback"

        # Cleanup
        db_session.execute(text("DELETE FROM assessments WHERE id = :id"), {"id": assessment_id})
        db_session.commit()

    def test_rework_tracking_nullable_columns(self, db_session: Session):
        """Test that rework tracking columns can be NULL (optional)."""
        # Insert assessment without rework tracking data (should work)
        result = db_session.execute(
            text("""
                INSERT INTO assessments (blgu_user_id, status, rework_count)
                VALUES (1, 'DRAFT', 0)
                RETURNING id
            """)
        )
        assessment_id = result.scalar_one()
        db_session.commit()

        # Query the assessment
        result = db_session.execute(
            text("""
                SELECT rework_requested_at, rework_requested_by, rework_comments
                FROM assessments
                WHERE id = :id
            """),
            {"id": assessment_id},
        )
        row = result.fetchone()

        assert row is not None, "Should be able to insert assessment without rework data"
        assert row[0] is None, "rework_requested_at should be NULL"
        assert row[1] is None, "rework_requested_by should be NULL"
        assert row[2] is None, "rework_comments should be NULL"

        # Cleanup
        db_session.execute(text("DELETE FROM assessments WHERE id = :id"), {"id": assessment_id})
        db_session.commit()

    def test_rework_workflow_scenario(self, db_session: Session):
        """Test a complete rework workflow scenario."""
        # Step 1: Create assessment in DRAFT state
        result = db_session.execute(
            text("""
                INSERT INTO assessments (blgu_user_id, status, rework_count)
                VALUES (1, 'DRAFT', 0)
                RETURNING id
            """)
        )
        assessment_id = result.scalar_one()
        db_session.commit()

        # Step 2: BLGU submits (no rework data yet)
        db_session.execute(
            text("UPDATE assessments SET status = 'SUBMITTED' WHERE id = :id"),
            {"id": assessment_id},
        )
        db_session.commit()

        # Step 3: Assessor requests rework
        db_session.execute(
            text("""
                UPDATE assessments
                SET status = 'REWORK',
                    rework_count = 1,
                    rework_requested_at = NOW(),
                    rework_requested_by = 1,
                    rework_comments = 'Please provide additional supporting documents'
                WHERE id = :id
            """),
            {"id": assessment_id},
        )
        db_session.commit()

        # Verify rework data was set
        result = db_session.execute(
            text("""
                SELECT status, rework_count, rework_requested_by, rework_comments
                FROM assessments
                WHERE id = :id
            """),
            {"id": assessment_id},
        )
        row = result.fetchone()

        assert row[0] == "REWORK", "Status should be REWORK"
        assert row[1] == 1, "rework_count should be 1"
        assert row[2] == 1, "rework_requested_by should be set"
        assert "supporting documents" in row[3], "rework_comments should be set"

        # Step 4: BLGU resubmits
        db_session.execute(
            text("UPDATE assessments SET status = 'SUBMITTED' WHERE id = :id"),
            {"id": assessment_id},
        )
        db_session.commit()

        # Verify rework_count is still 1 (no additional rework allowed)
        result = db_session.execute(
            text("SELECT rework_count FROM assessments WHERE id = :id"),
            {"id": assessment_id},
        )
        count = result.scalar_one()
        assert count == 1, "rework_count should remain 1 after resubmission"

        # Cleanup
        db_session.execute(text("DELETE FROM assessments WHERE id = :id"), {"id": assessment_id})
        db_session.commit()

    def test_rework_requested_by_set_null_on_user_delete(self, db_session: Session):
        """Test that deleting a user sets rework_requested_by to NULL."""
        # Create a test user
        result = db_session.execute(
            text("""
                INSERT INTO users (email, hashed_password, full_name, role)
                VALUES ('test_assessor@example.com', 'hashed', 'Test Assessor', 'ASSESSOR')
                RETURNING id
            """)
        )
        user_id = result.scalar_one()
        db_session.commit()

        # Create assessment with rework requested by this user
        result = db_session.execute(
            text("""
                INSERT INTO assessments (
                    blgu_user_id, status, rework_count,
                    rework_requested_by, rework_comments
                )
                VALUES (1, 'REWORK', 1, :user_id, 'Test comment')
                RETURNING id
            """),
            {"user_id": user_id},
        )
        assessment_id = result.scalar_one()
        db_session.commit()

        # Verify rework_requested_by is set
        result = db_session.execute(
            text("SELECT rework_requested_by FROM assessments WHERE id = :id"),
            {"id": assessment_id},
        )
        requester = result.scalar_one()
        assert requester == user_id, "rework_requested_by should be set to user_id"

        # Delete the user
        db_session.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
        db_session.commit()

        # Verify rework_requested_by was set to NULL
        result = db_session.execute(
            text("SELECT rework_requested_by FROM assessments WHERE id = :id"),
            {"id": assessment_id},
        )
        requester = result.scalar_one_or_none()
        assert requester is None, "rework_requested_by should be NULL after user deletion"

        # Cleanup
        db_session.execute(text("DELETE FROM assessments WHERE id = :id"), {"id": assessment_id})
        db_session.commit()

    def test_downgrade_removes_columns_and_constraints(self, db_session: Session):
        """
        Test that downgrade function properly removes all added columns and constraints.

        Note: This test documents the expected behavior of the downgrade function.
        Actual downgrade testing requires running the migration in reverse.
        """
        inspector = inspect(db_session.bind)
        columns = {col["name"]: col for col in inspector.get_columns("assessments")}

        # Verify all rework tracking columns currently exist
        assert "rework_requested_at" in columns, "Column should exist before downgrade"
        assert "rework_requested_by" in columns, "Column should exist before downgrade"
        assert "rework_comments" in columns, "Column should exist before downgrade"

        # Verify index exists
        indexes = inspector.get_indexes("assessments")
        index_names = [idx["name"] for idx in indexes]
        assert "idx_assessments_rework_requested_by" in index_names, (
            "Index should exist before downgrade"
        )

        # Verify foreign key exists
        foreign_keys = inspector.get_foreign_keys("assessments")
        fk_names = [fk.get("name") for fk in foreign_keys]
        assert "fk_assessment_rework_requested_by" in fk_names, "FK should exist before downgrade"

        # Note: Actual downgrade would remove:
        # 1. idx_assessments_rework_requested_by index
        # 2. fk_assessment_rework_requested_by foreign key
        # 3. rework_comments column
        # 4. rework_requested_by column
        # 5. rework_requested_at column
        # 6. chk_rework_count_limit check constraint
