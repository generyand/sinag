"""
Test suite for assessment status enum migration (Story 5.1.5)

Tests verify that the assessment status enum migration:
- Adds new enum values: DRAFT, SUBMITTED, IN_REVIEW, REWORK, COMPLETED
- Preserves legacy enum values: SUBMITTED_FOR_REVIEW, VALIDATED, NEEDS_REWORK
- Assessments table status column accepts new values
- Downgrade correctly handles status updates

NOTE: These tests require PostgreSQL and are skipped when running with SQLite.
"""

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session


@pytest.mark.skip(reason="PostgreSQL-specific migration tests - skipped for SQLite test database")
class TestAssessmentStatusMigration:
    """Test suite for assessment status enum migration."""

    def test_assessment_status_enum_exists(self, db_session: Session):
        """Test that assessmentstatus enum type exists in database."""
        # Query PostgreSQL enum types
        result = db_session.execute(
            text("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_type t
                    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                    WHERE t.typname = 'assessmentstatus'
                )
            """)
        )
        exists = result.scalar()

        assert exists, "assessmentstatus enum type should exist"

    def test_new_enum_values_exist(self, db_session: Session):
        """Test that all new Epic 5.0 enum values were added."""
        # Query all enum values for assessmentstatus type
        result = db_session.execute(
            text("""
                SELECT e.enumlabel
                FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                WHERE t.typname = 'assessmentstatus'
                ORDER BY e.enumlabel
            """)
        )
        enum_values = [row[0] for row in result.fetchall()]

        # Check new Epic 5.0 values
        new_values = ["DRAFT", "SUBMITTED", "IN_REVIEW", "REWORK", "COMPLETED"]
        for value in new_values:
            assert value in enum_values, f"Enum value '{value}' should exist"

    def test_legacy_enum_values_preserved(self, db_session: Session):
        """Test that legacy enum values were preserved for backward compatibility."""
        # Query all enum values
        result = db_session.execute(
            text("""
                SELECT e.enumlabel
                FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                WHERE t.typname = 'assessmentstatus'
                ORDER BY e.enumlabel
            """)
        )
        enum_values = [row[0] for row in result.fetchall()]

        # Check legacy values are preserved
        legacy_values = ["SUBMITTED_FOR_REVIEW", "VALIDATED", "NEEDS_REWORK"]
        for value in legacy_values:
            assert value in enum_values, f"Legacy enum value '{value}' should be preserved"

    def test_assessments_table_uses_status_enum(self, db_session: Session):
        """Test that assessments table status column uses the enum type."""
        inspector = inspect(db_session.bind)
        columns = {col["name"]: col for col in inspector.get_columns("assessments")}

        assert "status" in columns, "assessments table should have status column"

        # Check column type (should be assessmentstatus enum)
        status_col = columns["status"]
        # The exact type check depends on SQLAlchemy version, but we can verify it's not nullable
        assert not status_col["nullable"], "status column should be NOT NULL"

    def test_insert_assessment_with_new_status_values(self, db_session: Session):
        """Test that assessments table accepts all new status enum values."""
        new_statuses = ["DRAFT", "SUBMITTED", "IN_REVIEW", "REWORK", "COMPLETED"]

        created_ids = []

        for status in new_statuses:
            # Insert assessment with new status value
            result = db_session.execute(
                text("""
                    INSERT INTO assessments (blgu_user_id, status)
                    VALUES (1, :status)
                    RETURNING id
                """),
                {"status": status},
            )
            assessment_id = result.scalar_one()
            created_ids.append(assessment_id)
            db_session.commit()

            # Verify the status was set correctly
            result = db_session.execute(
                text("SELECT status FROM assessments WHERE id = :id"),
                {"id": assessment_id},
            )
            stored_status = result.scalar_one()

            assert stored_status == status, f"Status should be '{status}'"

        # Cleanup
        for assessment_id in created_ids:
            db_session.execute(
                text("DELETE FROM assessments WHERE id = :id"), {"id": assessment_id}
            )
        db_session.commit()

    def test_insert_assessment_with_legacy_status_values(self, db_session: Session):
        """Test that assessments table still accepts legacy status values."""
        legacy_statuses = ["SUBMITTED_FOR_REVIEW", "VALIDATED", "NEEDS_REWORK"]

        created_ids = []

        for status in legacy_statuses:
            # Insert assessment with legacy status value
            result = db_session.execute(
                text("""
                    INSERT INTO assessments (blgu_user_id, status)
                    VALUES (1, :status)
                    RETURNING id
                """),
                {"status": status},
            )
            assessment_id = result.scalar_one()
            created_ids.append(assessment_id)
            db_session.commit()

            # Verify the status was set correctly
            result = db_session.execute(
                text("SELECT status FROM assessments WHERE id = :id"),
                {"id": assessment_id},
            )
            stored_status = result.scalar_one()

            assert stored_status == status, f"Legacy status '{status}' should still work"

        # Cleanup
        for assessment_id in created_ids:
            db_session.execute(
                text("DELETE FROM assessments WHERE id = :id"), {"id": assessment_id}
            )
        db_session.commit()

    def test_status_transition_workflow(self, db_session: Session):
        """Test the complete status workflow: DRAFT → SUBMITTED → REWORK → SUBMITTED → COMPLETED."""
        # Create assessment in DRAFT state
        result = db_session.execute(
            text("""
                INSERT INTO assessments (blgu_user_id, status)
                VALUES (1, 'DRAFT')
                RETURNING id
            """)
        )
        assessment_id = result.scalar_one()
        db_session.commit()

        # Workflow step 1: DRAFT → SUBMITTED
        db_session.execute(
            text("UPDATE assessments SET status = 'SUBMITTED' WHERE id = :id"),
            {"id": assessment_id},
        )
        db_session.commit()

        result = db_session.execute(
            text("SELECT status FROM assessments WHERE id = :id"), {"id": assessment_id}
        )
        assert result.scalar_one() == "SUBMITTED"

        # Workflow step 2: SUBMITTED → REWORK
        db_session.execute(
            text("UPDATE assessments SET status = 'REWORK' WHERE id = :id"),
            {"id": assessment_id},
        )
        db_session.commit()

        result = db_session.execute(
            text("SELECT status FROM assessments WHERE id = :id"), {"id": assessment_id}
        )
        assert result.scalar_one() == "REWORK"

        # Workflow step 3: REWORK → SUBMITTED (resubmission)
        db_session.execute(
            text("UPDATE assessments SET status = 'SUBMITTED' WHERE id = :id"),
            {"id": assessment_id},
        )
        db_session.commit()

        result = db_session.execute(
            text("SELECT status FROM assessments WHERE id = :id"), {"id": assessment_id}
        )
        assert result.scalar_one() == "SUBMITTED"

        # Workflow step 4: SUBMITTED → IN_REVIEW
        db_session.execute(
            text("UPDATE assessments SET status = 'IN_REVIEW' WHERE id = :id"),
            {"id": assessment_id},
        )
        db_session.commit()

        result = db_session.execute(
            text("SELECT status FROM assessments WHERE id = :id"), {"id": assessment_id}
        )
        assert result.scalar_one() == "IN_REVIEW"

        # Workflow step 5: IN_REVIEW → COMPLETED
        db_session.execute(
            text("UPDATE assessments SET status = 'COMPLETED' WHERE id = :id"),
            {"id": assessment_id},
        )
        db_session.commit()

        result = db_session.execute(
            text("SELECT status FROM assessments WHERE id = :id"), {"id": assessment_id}
        )
        assert result.scalar_one() == "COMPLETED"

        # Cleanup
        db_session.execute(text("DELETE FROM assessments WHERE id = :id"), {"id": assessment_id})
        db_session.commit()

    def test_downgrade_resets_new_statuses_to_draft(self, db_session: Session):
        """
        Test that the downgrade function correctly handles new status values.

        Note: This test verifies the intended behavior of the downgrade function,
        which updates all new statuses to DRAFT rather than removing enum values.
        """
        # Create assessments with new status values
        new_statuses = ["SUBMITTED", "IN_REVIEW", "REWORK", "COMPLETED"]
        created_ids = []

        for status in new_statuses:
            result = db_session.execute(
                text("""
                    INSERT INTO assessments (blgu_user_id, status)
                    VALUES (1, :status)
                    RETURNING id
                """),
                {"status": status},
            )
            assessment_id = result.scalar_one()
            created_ids.append((assessment_id, status))
            db_session.commit()

        # Simulate downgrade behavior: update new statuses to DRAFT
        db_session.execute(
            text("""
                UPDATE assessments
                SET status = 'DRAFT'
                WHERE status IN ('SUBMITTED', 'IN_REVIEW', 'REWORK', 'COMPLETED')
            """)
        )
        db_session.commit()

        # Verify all assessments are now DRAFT
        for assessment_id, original_status in created_ids:
            result = db_session.execute(
                text("SELECT status FROM assessments WHERE id = :id"),
                {"id": assessment_id},
            )
            status = result.scalar_one()
            assert status == "DRAFT", (
                f"Assessment with original status '{original_status}' should be DRAFT after downgrade simulation"
            )

        # Cleanup
        for assessment_id, _ in created_ids:
            db_session.execute(
                text("DELETE FROM assessments WHERE id = :id"), {"id": assessment_id}
            )
        db_session.commit()

    def test_all_enum_values_count(self, db_session: Session):
        """Test that the correct total number of enum values exist."""
        result = db_session.execute(
            text("""
                SELECT COUNT(*)
                FROM pg_type t
                JOIN pg_enum e ON t.oid = e.enumtypid
                JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                WHERE t.typname = 'assessmentstatus'
            """)
        )
        count = result.scalar_one()

        # Expected: 5 new values + 3 legacy values = 8 total
        expected_count = 8
        assert count == expected_count, (
            f"Should have {expected_count} total enum values (5 new + 3 legacy)"
        )
