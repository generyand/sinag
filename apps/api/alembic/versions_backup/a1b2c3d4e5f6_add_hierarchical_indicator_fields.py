"""Add hierarchical indicator fields

Revision ID: a1b2c3d4e5f6
Revises: 8f53ce50c4b0
Create Date: 2025-11-13 10:15:57.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "8f53ce50c4b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add hierarchical tree fields to indicators table."""

    # Add indicator_code column (e.g., "1.1", "1.1.1")
    op.add_column(
        "indicators",
        sa.Column("indicator_code", sa.String(length=50), nullable=True),
    )

    # Create index on indicator_code for faster lookups
    op.create_index(
        op.f("ix_indicators_indicator_code"),
        "indicators",
        ["indicator_code"],
        unique=False,
    )

    # Add sort_order column for maintaining tree order within siblings
    op.add_column(
        "indicators",
        sa.Column("sort_order", sa.Integer(), nullable=True, server_default="0"),
    )

    # Add selection_mode column ('single', 'multiple', 'none')
    op.add_column(
        "indicators",
        sa.Column(
            "selection_mode",
            sa.String(length=20),
            nullable=True,
            server_default="none",
        ),
    )

    # Add mov_checklist_items column (JSONB array of MOV item configurations)
    op.add_column(
        "indicators",
        sa.Column(
            "mov_checklist_items",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )

    # Add same fields to indicators_history table (for archived snapshots)
    op.add_column(
        "indicators_history",
        sa.Column("indicator_code", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "indicators_history",
        sa.Column("sort_order", sa.Integer(), nullable=True),
    )
    op.add_column(
        "indicators_history",
        sa.Column("selection_mode", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "indicators_history",
        sa.Column(
            "mov_checklist_items",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema - Remove hierarchical tree fields."""

    # Drop columns from indicators_history first
    op.drop_column("indicators_history", "mov_checklist_items")
    op.drop_column("indicators_history", "selection_mode")
    op.drop_column("indicators_history", "sort_order")
    op.drop_column("indicators_history", "indicator_code")

    # Drop columns from indicators table in reverse order
    op.drop_column("indicators", "mov_checklist_items")
    op.drop_column("indicators", "selection_mode")
    op.drop_column("indicators", "sort_order")

    # Drop index before dropping column
    op.drop_index(op.f("ix_indicators_indicator_code"), table_name="indicators")
    op.drop_column("indicators", "indicator_code")
