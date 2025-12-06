"""add field_id to mov_files

Revision ID: d783d77dcb2c
Revises: e1f2g3h4i5j6
Create Date: 2025-11-18

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d783d77dcb2c"
down_revision: Union[str, Sequence[str], None] = "e1f2g3h4i5j6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add field_id column to mov_files table
    op.add_column("mov_files", sa.Column("field_id", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove field_id column from mov_files table
    op.drop_column("mov_files", "field_id")
