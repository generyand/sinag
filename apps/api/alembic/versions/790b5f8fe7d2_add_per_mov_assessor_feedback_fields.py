"""add per-mov assessor feedback fields

Revision ID: 790b5f8fe7d2
Revises: swap_roles_2025_01
Create Date: 2026-01-25 19:36:46.988609

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "790b5f8fe7d2"
down_revision: Union[str, Sequence[str], None] = "swap_roles_2025_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add per-MOV assessor feedback fields to mov_files table.

    This enables assessors to add general notes and flag individual MOV files
    for rework, rather than flagging at the indicator level.
    """
    op.add_column("mov_files", sa.Column("assessor_notes", sa.Text(), nullable=True))
    op.add_column(
        "mov_files",
        sa.Column("flagged_for_rework", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column("mov_files", sa.Column("flagged_by_assessor_id", sa.Integer(), nullable=True))
    op.add_column("mov_files", sa.Column("flagged_at", sa.DateTime(), nullable=True))
    op.create_foreign_key(
        "fk_mov_files_flagged_by_assessor",
        "mov_files",
        "users",
        ["flagged_by_assessor_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Remove per-MOV assessor feedback fields from mov_files table."""
    op.drop_constraint("fk_mov_files_flagged_by_assessor", "mov_files", type_="foreignkey")
    op.drop_column("mov_files", "flagged_at")
    op.drop_column("mov_files", "flagged_by_assessor_id")
    op.drop_column("mov_files", "flagged_for_rework")
    op.drop_column("mov_files", "assessor_notes")
