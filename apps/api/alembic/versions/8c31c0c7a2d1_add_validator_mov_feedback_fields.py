"""add_validator_mov_feedback_fields

Revision ID: 8c31c0c7a2d1
Revises: 790b5f8fe7d2
Create Date: 2026-02-16 18:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8c31c0c7a2d1"
down_revision: Union[str, Sequence[str], None] = "790b5f8fe7d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("mov_files", sa.Column("validator_notes", sa.Text(), nullable=True))
    op.add_column(
        "mov_files",
        sa.Column(
            "flagged_for_calibration",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column("mov_files", sa.Column("flagged_by_validator_id", sa.Integer(), nullable=True))
    op.add_column("mov_files", sa.Column("calibration_flagged_at", sa.DateTime(), nullable=True))

    op.create_foreign_key(
        "fk_mov_files_flagged_by_validator_id_users",
        "mov_files",
        "users",
        ["flagged_by_validator_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_mov_files_flagged_by_validator_id_users",
        "mov_files",
        type_="foreignkey",
    )
    op.drop_column("mov_files", "calibration_flagged_at")
    op.drop_column("mov_files", "flagged_by_validator_id")
    op.drop_column("mov_files", "flagged_for_calibration")
    op.drop_column("mov_files", "validator_notes")
