"""Add parent_id to indicators table

Revision ID: 1a2b3c4d5e6f
Revises: 9feee8a18b32
Create Date: 2025-10-29 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "1a2b3c4d5e6f"
down_revision: Union[str, Sequence[str], None] = "9feee8a18b32"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add nullable parent_id column
    op.add_column(
        "indicators",
        sa.Column("parent_id", sa.Integer(), nullable=True),
    )

    # Create self-referencing foreign key constraint
    op.create_foreign_key(
        constraint_name="fk_indicators_parent_id_indicators",
        source_table="indicators",
        referent_table="indicators",
        local_cols=["parent_id"],
        remote_cols=["id"],
        ondelete=None,
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop foreign key then column
    op.drop_constraint(
        constraint_name="fk_indicators_parent_id_indicators",
        table_name="indicators",
        type_="foreignkey",
    )
    op.drop_column("indicators", "parent_id")
