"""add_bbi_compliance_fields

Revision ID: d1e2f3a4b5c6
Revises: c9f8e1a2d3b4
Create Date: 2025-11-30

Add compliance rate fields to bbi_results table per DILG MC 2024-417.
Also adds new enum values to bbi_status_enum for 3-tier rating system.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c9f8e1a2d3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add BBI compliance fields to bbi_results table."""

    # Add new enum values to bbi_status_enum
    # PostgreSQL requires ALTER TYPE to add new values
    op.execute("ALTER TYPE bbi_status_enum ADD VALUE IF NOT EXISTS 'HIGHLY_FUNCTIONAL'")
    op.execute("ALTER TYPE bbi_status_enum ADD VALUE IF NOT EXISTS 'MODERATELY_FUNCTIONAL'")
    op.execute("ALTER TYPE bbi_status_enum ADD VALUE IF NOT EXISTS 'LOW_FUNCTIONAL'")

    # Add new columns to bbi_results table
    op.add_column(
        "bbi_results",
        sa.Column(
            "compliance_percentage",
            sa.Float(),
            nullable=True,
            comment="Compliance rate 0-100%",
        ),
    )
    op.add_column(
        "bbi_results",
        sa.Column(
            "compliance_rating",
            sa.String(30),
            nullable=True,
            comment="3-tier rating: HIGHLY_FUNCTIONAL, MODERATELY_FUNCTIONAL, LOW_FUNCTIONAL",
        ),
    )
    op.add_column(
        "bbi_results",
        sa.Column(
            "sub_indicators_passed",
            sa.Integer(),
            nullable=True,
            comment="Number of sub-indicators that passed",
        ),
    )
    op.add_column(
        "bbi_results",
        sa.Column(
            "sub_indicators_total",
            sa.Integer(),
            nullable=True,
            comment="Total number of sub-indicators evaluated",
        ),
    )
    op.add_column(
        "bbi_results",
        sa.Column(
            "sub_indicator_results",
            sa.JSON(),
            nullable=True,
            comment="Detailed pass/fail results for each sub-indicator",
        ),
    )


def downgrade() -> None:
    """Remove BBI compliance fields from bbi_results table."""

    # Remove columns from bbi_results table
    op.drop_column("bbi_results", "sub_indicator_results")
    op.drop_column("bbi_results", "sub_indicators_total")
    op.drop_column("bbi_results", "sub_indicators_passed")
    op.drop_column("bbi_results", "compliance_rating")
    op.drop_column("bbi_results", "compliance_percentage")

    # Note: PostgreSQL does not support removing enum values easily
    # The new enum values will remain in the database but won't be used
