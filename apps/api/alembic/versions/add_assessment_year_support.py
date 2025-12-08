"""Add assessment year support

This migration adds support for year-based assessment cycles:
1. Creates unified assessment_years table (merging AssessmentYearConfig + AssessmentCycle)
2. Adds assessment_year column to assessments table with FK to assessment_years.year
3. Adds compound unique constraint (blgu_user_id, assessment_year)
4. Adds effective_from_year and effective_to_year to indicators table
5. Migrates data from existing assessment_year_configs and assessment_cycles tables

IMPORTANT NOTES:
- Existing assessments are assigned to the currently active year (or 2025 if none active)
- Indicators' effective_from_year and effective_to_year remain NULL (applies to all years)
- Old tables (assessment_year_configs, assessment_cycles) are kept for backward compatibility

Revision ID: add_assessment_year_support
Revises: 32b387c1d419
Create Date: 2024-12-07

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_assessment_year_support"
down_revision = "32b387c1d419"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create the new assessment_years table
    op.create_table(
        "assessment_years",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("year", sa.Integer(), nullable=False, unique=True, index=True),
        sa.Column("assessment_period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("assessment_period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("phase1_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rework_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("phase2_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("calibration_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=False, index=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, default=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("activated_by_id", sa.Integer(), nullable=True),
        sa.Column("deactivated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deactivated_by_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["activated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["deactivated_by_id"], ["users.id"], ondelete="SET NULL"),
    )

    # Create partial unique index to ensure only one active year
    op.create_index(
        "uq_assessment_years_single_active",
        "assessment_years",
        ["is_active"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
    )

    # 2. Migrate data from assessment_year_configs to assessment_years
    # This handles the case where the old table exists and has data
    op.execute(
        """
        INSERT INTO assessment_years (
            year,
            assessment_period_start,
            assessment_period_end,
            is_active,
            is_published,
            description,
            created_at,
            activated_at,
            activated_by_id,
            deactivated_at,
            deactivated_by_id
        )
        SELECT
            current_assessment_year,
            assessment_period_start,
            assessment_period_end,
            is_active,
            false,
            description,
            created_at,
            activated_at,
            activated_by_id,
            deactivated_at,
            deactivated_by_id
        FROM assessment_year_configs
        ON CONFLICT (year) DO NOTHING
        """
    )

    # 3. Merge deadlines from assessment_cycles into assessment_years
    op.execute(
        """
        UPDATE assessment_years ay
        SET
            phase1_deadline = ac.phase1_deadline,
            rework_deadline = ac.rework_deadline,
            phase2_deadline = ac.phase2_deadline,
            calibration_deadline = ac.calibration_deadline
        FROM assessment_cycles ac
        WHERE ay.year = ac.year
        """
    )

    # 4. Also insert any years from assessment_cycles that weren't in assessment_year_configs
    op.execute(
        """
        INSERT INTO assessment_years (
            year,
            assessment_period_start,
            assessment_period_end,
            phase1_deadline,
            rework_deadline,
            phase2_deadline,
            calibration_deadline,
            is_active,
            is_published,
            created_at
        )
        SELECT
            ac.year,
            COALESCE(ac.phase1_deadline, '2025-01-01'::timestamp with time zone),
            COALESCE(ac.calibration_deadline, '2025-10-31'::timestamp with time zone),
            ac.phase1_deadline,
            ac.rework_deadline,
            ac.phase2_deadline,
            ac.calibration_deadline,
            ac.is_active,
            false,
            ac.created_at
        FROM assessment_cycles ac
        WHERE NOT EXISTS (
            SELECT 1 FROM assessment_years ay WHERE ay.year = ac.year
        )
        ON CONFLICT (year) DO NOTHING
        """
    )

    # 5. Add assessment_year column to assessments table (initially nullable)
    op.add_column(
        "assessments",
        sa.Column("assessment_year", sa.Integer(), nullable=True, index=True),
    )

    # 6. Ensure we have at least one year record before backfilling
    # This creates a default 2025 year if no years exist yet
    op.execute(
        """
        INSERT INTO assessment_years (year, assessment_period_start, assessment_period_end, is_active, is_published)
        SELECT 2025, '2025-01-01'::timestamp with time zone, '2025-10-31'::timestamp with time zone, true, false
        WHERE NOT EXISTS (SELECT 1 FROM assessment_years)
        """
    )

    # 7. Backfill existing assessments with the current active year
    # If no active year exists, use 2025 as default
    op.execute(
        """
        UPDATE assessments
        SET assessment_year = COALESCE(
            (SELECT year FROM assessment_years WHERE is_active = true LIMIT 1),
            2025
        )
        WHERE assessment_year IS NULL
        """
    )

    # 8. Make assessment_year non-nullable
    op.alter_column("assessments", "assessment_year", nullable=False)

    # 9. Add foreign key constraint
    op.create_foreign_key(
        "fk_assessments_assessment_year",
        "assessments",
        "assessment_years",
        ["assessment_year"],
        ["year"],
    )

    # 10. Add compound unique constraint (blgu_user_id, assessment_year)
    # IMPORTANT: We do NOT delete duplicates here. Instead, we check for them first
    # and raise an error if found. This prevents accidental data loss.
    # In practice, this constraint should not fail because each BLGU should only
    # have one assessment, and they're all being assigned to the same year.
    #
    # If duplicates exist, the migration will fail and the DBA should:
    # 1. Review the duplicate assessments
    # 2. Decide which to keep (usually the most recent or most complete)
    # 3. Archive or delete the duplicates manually
    # 4. Re-run the migration
    op.create_unique_constraint(
        "uq_assessment_blgu_year",
        "assessments",
        ["blgu_user_id", "assessment_year"],
    )

    # 11. Add effective year fields to indicators table
    # These fields control which assessment years an indicator applies to
    # NULL values mean the indicator applies to all years
    op.add_column(
        "indicators",
        sa.Column("effective_from_year", sa.Integer(), nullable=True),
    )
    op.add_column(
        "indicators",
        sa.Column("effective_to_year", sa.Integer(), nullable=True),
    )

    # Create indexes for the effective year fields
    op.create_index(
        "ix_indicators_effective_from_year",
        "indicators",
        ["effective_from_year"],
    )
    op.create_index(
        "ix_indicators_effective_to_year",
        "indicators",
        ["effective_to_year"],
    )

    # NOTE: We intentionally do NOT set effective_from_year on existing indicators.
    # NULL means the indicator applies to all assessment years.
    # When indicators are retired (every 3 years), developers should:
    # 1. Set effective_to_year on old indicators
    # 2. Set effective_from_year on new indicators


def downgrade() -> None:
    # Remove effective year fields from indicators
    op.drop_index("ix_indicators_effective_to_year", table_name="indicators")
    op.drop_index("ix_indicators_effective_from_year", table_name="indicators")
    op.drop_column("indicators", "effective_to_year")
    op.drop_column("indicators", "effective_from_year")

    # Remove unique constraint and foreign key from assessments
    op.drop_constraint("uq_assessment_blgu_year", "assessments", type_="unique")
    op.drop_constraint("fk_assessments_assessment_year", "assessments", type_="foreignkey")
    op.drop_column("assessments", "assessment_year")

    # Drop the assessment_years table
    op.drop_index("uq_assessment_years_single_active", table_name="assessment_years")
    op.drop_table("assessment_years")

    # NOTE: Old tables (assessment_year_configs, assessment_cycles) are preserved
    # and should still have their original data, so downgrade is safe.
