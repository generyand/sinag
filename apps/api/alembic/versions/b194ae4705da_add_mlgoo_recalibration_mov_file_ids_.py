"""add mlgoo_recalibration_mov_file_ids field

Revision ID: b194ae4705da
Revises: c2fc415cc6b4
Create Date: 2025-12-12 10:50:17.467825

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b194ae4705da"
down_revision: Union[str, Sequence[str], None] = "c2fc415cc6b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add mlgoo_recalibration_mov_file_ids column to assessments table."""
    op.add_column(
        "assessments", sa.Column("mlgoo_recalibration_mov_file_ids", sa.JSON(), nullable=True)
    )


def downgrade() -> None:
    """Remove mlgoo_recalibration_mov_file_ids column from assessments table."""
    op.drop_column("assessments", "mlgoo_recalibration_mov_file_ids")
