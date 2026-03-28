"""add validator review cycle history

Revision ID: b8c2d4e6f8a1
Revises: a7b1c3d4e5f6
Create Date: 2026-03-23 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8c2d4e6f8a1"
down_revision: Union[str, Sequence[str], None] = "a7b1c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "assessment_responses",
        sa.Column("validator_review_cycle", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "assessment_responses",
        sa.Column("validator_review_history", sa.JSON(), nullable=True),
    )
    op.add_column(
        "feedback_comments",
        sa.Column("review_cycle", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "mov_annotations",
        sa.Column("review_cycle", sa.Integer(), nullable=False, server_default="1"),
    )

    op.alter_column("assessment_responses", "validator_review_cycle", server_default=None)
    op.alter_column("feedback_comments", "review_cycle", server_default=None)
    op.alter_column("mov_annotations", "review_cycle", server_default=None)


def downgrade() -> None:
    op.drop_column("mov_annotations", "review_cycle")
    op.drop_column("feedback_comments", "review_cycle")
    op.drop_column("assessment_responses", "validator_review_history")
    op.drop_column("assessment_responses", "validator_review_cycle")
