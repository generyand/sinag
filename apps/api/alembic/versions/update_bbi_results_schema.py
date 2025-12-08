"""Update BBI results schema with barangay_id and assessment_year

This migration updates the bbi_results table schema to:
1. Add barangay_id field (FK to barangays) for direct barangay lookup
2. Add assessment_year field (Integer) for year-over-year tracking
3. Add indicator_id field (FK to indicators) for audit trail
4. Remove legacy 'status' column (using compliance_rating instead)
5. Rename 'calculation_date' to 'calculated_at'
6. Remove 'calculation_details' column (redundant with sub_indicator_results)
7. Add unique constraint (barangay_id, assessment_year, bbi_id)
8. Update compliance fields to NOT NULL

The bbi_status_enum is also updated to remove legacy FUNCTIONAL/NON_FUNCTIONAL values.

Revision ID: update_bbi_results_schema
Revises: add_assessment_year_support
Create Date: 2024-12-08

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "update_bbi_results_schema"
down_revision = "add_assessment_year_support"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add new columns to bbi_results (initially nullable for backfill)
    # Note: Don't use index=True here - we'll create indexes explicitly later
    op.add_column(
        "bbi_results",
        sa.Column("barangay_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "bbi_results",
        sa.Column("assessment_year", sa.Integer(), nullable=True),
    )
    op.add_column(
        "bbi_results",
        sa.Column("indicator_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "bbi_results",
        sa.Column("calculated_at", sa.DateTime(), nullable=True),
    )

    # 2. Backfill barangay_id and assessment_year from related assessment
    op.execute(
        """
        UPDATE bbi_results br
        SET
            barangay_id = u.barangay_id,
            assessment_year = a.assessment_year,
            calculated_at = br.calculation_date
        FROM assessments a
        JOIN users u ON a.blgu_user_id = u.id
        WHERE br.assessment_id = a.id
        """
    )

    # 3. For any remaining NULL barangay_id values, we need to handle them
    # This could happen if the assessment or user was deleted
    # We'll delete orphaned bbi_results that can't be linked to a barangay
    op.execute(
        """
        DELETE FROM bbi_results WHERE barangay_id IS NULL
        """
    )

    # 4. Set default values for any remaining NULL fields
    op.execute(
        """
        UPDATE bbi_results
        SET assessment_year = 2025
        WHERE assessment_year IS NULL
        """
    )
    op.execute(
        """
        UPDATE bbi_results
        SET calculated_at = COALESCE(calculation_date, NOW())
        WHERE calculated_at IS NULL
        """
    )

    # 5. Make the new columns non-nullable
    op.alter_column("bbi_results", "barangay_id", nullable=False)
    op.alter_column("bbi_results", "assessment_year", nullable=False)
    op.alter_column("bbi_results", "calculated_at", nullable=False)

    # 6. Add foreign key constraints
    op.create_foreign_key(
        "fk_bbi_results_barangay_id",
        "bbi_results",
        "barangays",
        ["barangay_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_bbi_results_indicator_id",
        "bbi_results",
        "indicators",
        ["indicator_id"],
        ["id"],
    )

    # 7. Create indexes for the new columns
    op.create_index(
        "ix_bbi_results_barangay_id",
        "bbi_results",
        ["barangay_id"],
    )
    op.create_index(
        "ix_bbi_results_assessment_year",
        "bbi_results",
        ["assessment_year"],
    )
    op.create_index(
        "ix_bbi_results_indicator_id",
        "bbi_results",
        ["indicator_id"],
    )

    # 8. Drop the old columns
    op.drop_column("bbi_results", "status")
    op.drop_column("bbi_results", "calculation_date")
    op.drop_column("bbi_results", "calculation_details")

    # 9. Make compliance fields non-nullable (after cleaning up any NULLs)
    op.execute(
        """
        UPDATE bbi_results
        SET
            compliance_percentage = 0.0,
            compliance_rating = 'NON_FUNCTIONAL',
            sub_indicators_passed = 0,
            sub_indicators_total = 0
        WHERE compliance_percentage IS NULL
           OR compliance_rating IS NULL
           OR sub_indicators_passed IS NULL
           OR sub_indicators_total IS NULL
        """
    )
    op.alter_column("bbi_results", "compliance_percentage", nullable=False)
    op.alter_column("bbi_results", "compliance_rating", nullable=False)
    op.alter_column("bbi_results", "sub_indicators_passed", nullable=False)
    op.alter_column("bbi_results", "sub_indicators_total", nullable=False)

    # 10. Add unique constraint (barangay_id, assessment_year, bbi_id)
    # First, delete any duplicates keeping the most recent one
    op.execute(
        """
        DELETE FROM bbi_results
        WHERE id NOT IN (
            SELECT MAX(id)
            FROM bbi_results
            GROUP BY barangay_id, assessment_year, bbi_id
        )
        """
    )
    op.create_unique_constraint(
        "uq_bbi_result_per_barangay_year_bbi",
        "bbi_results",
        ["barangay_id", "assessment_year", "bbi_id"],
    )

    # 11. Update bbi_status_enum to remove legacy values
    # Note: PostgreSQL requires us to drop and recreate the enum
    # Since we've already removed the 'status' column, we can drop the enum
    # First check if it's used elsewhere - it's not, so we can drop it
    op.execute("DROP TYPE IF EXISTS bbi_status_enum")


def downgrade() -> None:
    # Recreate the bbi_status_enum with legacy values
    op.execute(
        """
        CREATE TYPE bbi_status_enum AS ENUM (
            'HIGHLY_FUNCTIONAL',
            'MODERATELY_FUNCTIONAL',
            'LOW_FUNCTIONAL',
            'FUNCTIONAL',
            'NON_FUNCTIONAL'
        )
        """
    )

    # Drop unique constraint
    op.drop_constraint("uq_bbi_result_per_barangay_year_bbi", "bbi_results", type_="unique")

    # Make compliance fields nullable again
    op.alter_column("bbi_results", "compliance_percentage", nullable=True)
    op.alter_column("bbi_results", "compliance_rating", nullable=True)
    op.alter_column("bbi_results", "sub_indicators_passed", nullable=True)
    op.alter_column("bbi_results", "sub_indicators_total", nullable=True)

    # Add back the old columns
    op.add_column(
        "bbi_results",
        sa.Column("calculation_details", postgresql.JSON(), nullable=True),
    )
    op.add_column(
        "bbi_results",
        sa.Column("calculation_date", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "bbi_results",
        sa.Column(
            "status",
            postgresql.ENUM(
                "HIGHLY_FUNCTIONAL",
                "MODERATELY_FUNCTIONAL",
                "LOW_FUNCTIONAL",
                "FUNCTIONAL",
                "NON_FUNCTIONAL",
                name="bbi_status_enum",
                create_type=False,
            ),
            nullable=True,
        ),
    )

    # Backfill calculation_date from calculated_at
    op.execute(
        """
        UPDATE bbi_results
        SET calculation_date = calculated_at
        """
    )

    # Backfill status from compliance_rating
    op.execute(
        """
        UPDATE bbi_results
        SET status = compliance_rating::bbi_status_enum
        """
    )

    # Make status and calculation_date non-nullable
    op.alter_column("bbi_results", "status", nullable=False)
    op.alter_column("bbi_results", "calculation_date", nullable=False)

    # Drop foreign key constraints
    op.drop_constraint("fk_bbi_results_indicator_id", "bbi_results", type_="foreignkey")
    op.drop_constraint("fk_bbi_results_barangay_id", "bbi_results", type_="foreignkey")

    # Drop indexes
    op.drop_index("ix_bbi_results_indicator_id", table_name="bbi_results")
    op.drop_index("ix_bbi_results_assessment_year", table_name="bbi_results")
    op.drop_index("ix_bbi_results_barangay_id", table_name="bbi_results")

    # Drop new columns
    op.drop_column("bbi_results", "calculated_at")
    op.drop_column("bbi_results", "indicator_id")
    op.drop_column("bbi_results", "assessment_year")
    op.drop_column("bbi_results", "barangay_id")
